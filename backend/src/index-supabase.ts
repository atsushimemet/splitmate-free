import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { initializeDatabase, pool } from './database/connection-supabase';
import allocationRatioRoutes from './routes/allocationRatioRoutes-postgres';
import expenseRoutes from './routes/expenseRoutes-postgres';
import settlementRoutes from './routes/settlementRoutes-postgres';

declare global {
  namespace Express {
    interface User {
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

// 環境に基づくURL設定
const NODE_ENV = process.env.NODE_ENV || 'development';
const frontendUrl = NODE_ENV === 'production' 
  ? process.env.FRONTEND_URL || 'https://your-netlify-app.netlify.app'
  : process.env.FRONTEND_URL || 'http://localhost:5173';

const backendUrl = NODE_ENV === 'production'
  ? process.env.BACKEND_URL || 'https://your-render-app.onrender.com'
  : process.env.BACKEND_URL || 'http://localhost:3001';

console.log('🌍 Environment:', NODE_ENV);
console.log('🎨 Frontend URL:', frontendUrl);
console.log('🔗 Backend URL:', backendUrl);

// セッション設定
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  name: process.env.SESSION_NAME || 'splitmate-session',
  cookie: {
    secure: NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
  },
}));

// ミドルウェア設定
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: NODE_ENV === 'production' 
    ? [frontendUrl]
    : ['http://localhost:3000', 'http://localhost:5173', frontendUrl],
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport初期化
app.use(passport.initialize());
app.use(passport.session());

// Google認証関連のルート
passport.serializeUser((user: any, done) => {
  console.log('🔐 SERIALIZE USER - Saving user to session:', user?.displayName);
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  console.log('🔓 DESERIALIZE USER - Loading user from session:', user?.displayName);
  done(null, user);
});

// Google OAuth設定の確認とログ出力
console.log('🔑 Google OAuth Configuration:');
console.log('   Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set');
console.log('   Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set');
console.log('   Callback URL:', `${backendUrl}/auth/google/callback`);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: `${backendUrl}/auth/google/callback`,
  },
  (accessToken, refreshToken, profile, done) => {
    console.log('OAuth callback received for user:', profile.displayName);
    console.log('Access token available:', !!accessToken);
    
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
      console.log('🎯 AUTH CALLBACK - User:', req.user?.displayName);
      console.log('🎯 AUTH CALLBACK - Redirect URL:', `${frontendUrl}/auth/callback`);
      
      res.redirect(`${frontendUrl}/auth/callback`);
    }
  );
} else {
  console.warn('⚠️ Google OAuth credentials not configured. Authentication will not work.');
}

// 認証状態確認
app.get('/auth/status', (req, res) => {
  console.log('🔍 AUTH STATUS CHECK - Session ID:', (req as any).sessionID);
  console.log('🔍 AUTH STATUS CHECK - Is authenticated:', req.isAuthenticated?.());
  console.log('🔍 AUTH STATUS CHECK - User:', req.user?.displayName);
  
  res.json({
    authenticated: req.isAuthenticated?.() || false,
    user: req.user || null
  });
});

// ログアウト
app.get('/auth/logout', (req, res) => {
  req.logout?.(() => {
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'SplitMate Backend API (Supabase)',
    environment: NODE_ENV
  });
});

// API ルート
app.use('/api/expenses', expenseRoutes);
app.use('/api/allocation-ratio', allocationRatioRoutes);
app.use('/api/settlements', settlementRoutes);

// 404 ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// エラーハンドラー
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// データベース接続とサーバー起動
async function startServer() {
  try {
    // データベース接続テスト
    await initializeDatabase();
    
    // サーバー起動
    app.listen(PORT, () => {
      console.log(`🚀 SplitMate Backend API (Supabase) is running on port ${PORT}`);
      console.log(`📊 Health check: ${backendUrl}/health`);
      console.log(`💰 Expense API: ${backendUrl}/api/expenses`);
      console.log(`⚖️ Allocation Ratio API: ${backendUrl}/api/allocation-ratio`);
      console.log(`💳 Settlement API: ${backendUrl}/api/settlements`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// サーバー開始
startServer(); 
