import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { initializeDatabase, pool, testConnection } from './database/connection-postgres';
import allocationRatioRoutes from './routes/allocationRatioRoutes-postgres';
import expenseRoutes from './routes/expenseRoutes-postgres';
import settlementRoutes from './routes/settlementRoutes-postgres';

declare global {
  namespace Express {
    interface User {
      // 必要に応じて型を拡張
      id?: string;
      displayName?: string;
      emails?: { value: string }[];
      photos?: { value: string }[];
      [key: string]: any;
    }
    interface Request {
      user?: User;
      isAuthenticated?: () => boolean;
      logout?: (callback: (err?: any) => void) => void;
    }
  }
}

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(helmet());
// 開発環境かどうかを判定
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const frontendUrl = process.env.FRONTEND_URL || (isDevelopment ? 'http://localhost:5173' : 'https://your-frontend-domain.netlify.app');
const backendUrl = process.env.BACKEND_URL || (isDevelopment ? 'http://localhost:3001' : 'https://splitmate-backend.onrender.com');

const corsOrigins = isDevelopment 
  ? ['http://localhost:3000', 'http://localhost:5173']
  : [frontendUrl];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200 // レガシーブラウザ対応
}));

// PostgreSQL Session Store
const PostgreSQLStore = connectPgSimple(session);

app.use(session({
  store: new PostgreSQLStore({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'your-session-secret-postgres',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: !isDevelopment, // 本番環境では secure: true
    httpOnly: true, // XSS攻撃を防ぐためにhttpOnlyを明示的に設定
    sameSite: isDevelopment ? 'lax' : 'none', // 本番環境では 'none' に設定
    maxAge: 24 * 60 * 60 * 1000 // 24時間
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// パスポートの設定
passport.serializeUser((user: any, done) => {
  console.log('🔐 SERIALIZE USER - Saving user to session:', user?.displayName);
  console.log('🔐 SERIALIZE USER - User ID:', user?.id);
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  console.log('🔓 DESERIALIZE USER - Loading user from session:', user?.displayName);
  console.log('🔓 DESERIALIZE USER - User ID:', user?.id);
  done(null, user);
});

// 環境変数の確認
console.log('Environment Variables:', {
  NODE_ENV: process.env.NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL,
  BACKEND_URL: process.env.BACKEND_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
  SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
});

console.log('Computed Values:', {
  isDevelopment,
  frontendUrl,
  backendUrl,
  callbackURL: `${backendUrl}/auth/google/callback`
});

console.log('=== GOOGLE STRATEGY CONFIGURATION ===');
console.log('ClientID:', process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}...` : 'NOT SET');
console.log('ClientSecret:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('CallbackURL:', `${backendUrl}/auth/google/callback`);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: `${backendUrl}/auth/google/callback`,
  },
  (accessToken, refreshToken, profile, done) => {
    console.log('OAuth callback received for user:', profile.displayName);
    console.log('OAuth scopes granted:', profile);
    console.log('Access token available:', !!accessToken);
    
    // アクセストークンとリフレッシュトークンをプロフィールに追加
    const userWithTokens = {
      ...profile,
      accessToken,
      refreshToken
    };
    
    return done(null, userWithTokens);
  }
  ));

  // Google認証開始
  app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
  }));

  // Google認証コールバック
  app.get('/auth/google/callback',
    passport.authenticate('google', {
      failureRedirect: `${frontendUrl}/`,
      session: true
    }),
    (req, res) => {
      console.log('🎯 AUTH CALLBACK - Authentication successful');
      console.log('🎯 AUTH CALLBACK - Session ID:', (req as any).sessionID);
      console.log('🎯 AUTH CALLBACK - Is authenticated:', req.isAuthenticated ? req.isAuthenticated() : 'N/A');
      console.log('🎯 AUTH CALLBACK - User in session:', req.user?.displayName);
      console.log('🎯 AUTH CALLBACK - FRONTEND_URL env var:', process.env.FRONTEND_URL);
      console.log('🎯 AUTH CALLBACK - Computed frontendUrl:', frontendUrl);
      console.log('🎯 AUTH CALLBACK - Redirect URL will be:', `${frontendUrl}/auth/callback`);
      
      // 認証成功時のリダイレクト先
      res.redirect(`${frontendUrl}/auth/callback`);
    }
  );
} else {
  console.warn('⚠️ Google OAuth credentials not configured. Authentication will not work.');
}

// 認証状態確認
app.get('/auth/status', (req, res) => {
  console.log('AUTH STATUS CHECK:');
  console.log('- Session ID:', (req as any).sessionID);
  console.log('- Session data:', (req as any).session);
  console.log('- isAuthenticated function exists:', typeof req.isAuthenticated);
  console.log('- isAuthenticated result:', req.isAuthenticated ? req.isAuthenticated() : 'function not available');
  console.log('- User data:', req.user);
  console.log('- Cookie header:', req.headers.cookie);
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

// ログアウト
app.get('/auth/logout', (req, res) => {
  if (req.logout) {
    req.logout(() => {
      res.json({ success: true });
    });
  } else {
    res.json({ success: false, error: 'Logout not supported' });
  }
});

// API routes
app.use('/api/expenses', expenseRoutes);
app.use('/api/allocation-ratio', allocationRatioRoutes);
app.use('/api/settlements', settlementRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'postgresql',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'SplitMate Backend API (PostgreSQL)', 
    version: '1.0.0',
    database: 'postgresql',
    timestamp: new Date().toISOString()
  });
});

// サーバー起動
async function startServer() {
  try {
    // データベース接続テスト
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    // データベース初期化
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 SplitMate Backend API (PostgreSQL) is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`💰 Expense API: http://localhost:${PORT}/api/expenses`);
      console.log(`⚖️  Allocation Ratio API: http://localhost:${PORT}/api/allocation-ratio`);
      console.log(`💳 Settlement API: http://localhost:${PORT}/api/settlements`);
      console.log(`🔐 Google OAuth: http://localhost:${PORT}/auth/google`);
      console.log(`🔍 pgAdmin: http://localhost:5050`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 
