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
      accessToken?: string;
      refreshToken?: string;
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

// 詳細なセッション設定ログ
console.log('🍪 Session Configuration:');
console.log('   NODE_ENV:', NODE_ENV);
console.log('   SESSION_SECRET:', process.env.SESSION_SECRET ? 'Set' : 'Not set');
console.log('   SESSION_SECRET length:', process.env.SESSION_SECRET?.length || 0);
console.log('   SESSION_SECRET first 10 chars:', process.env.SESSION_SECRET?.substring(0, 10) || 'N/A');
console.log('   Cookie secure:', NODE_ENV === 'production');
console.log('   Cookie sameSite:', NODE_ENV === 'production' ? 'none' : 'lax');
console.log('   Cookie httpOnly: true');
console.log('   Cookie maxAge: 24 hours');

// セッション設定
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    errorLog: (error) => {
      console.error('🚨 SESSION STORE ERROR:', error);
    },
  }),
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: true, // 認証時にセッションを強制保存
  saveUninitialized: false,
  name: 'splitmate-session', // 固定値に変更
  cookie: {
    secure: NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
    // domainを設定しない（自動的に現在のドメインが使用される）
  },
  rolling: true, // リクエストごとにクッキーの有効期限を更新
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
  console.log('🔓 DESERIALIZE USER - User data:', JSON.stringify(user, null, 2));
  
  if (!user) {
    console.error('🚨 DESERIALIZE USER - No user data found in session');
    return done(null, false);
  }
  
  console.log('✅ DESERIALIZE USER - Successfully loaded user');
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
      console.log('🎯 AUTH CALLBACK - Session ID:', (req as any).sessionID);
      console.log('🎯 AUTH CALLBACK - User:', req.user?.displayName);
      console.log('🎯 AUTH CALLBACK - Is authenticated:', req.isAuthenticated?.());
      console.log('🎯 AUTH CALLBACK - Session data:', JSON.stringify((req as any).session, null, 2));
      console.log('🎯 AUTH CALLBACK - Cookie will be set with:', {
        secure: NODE_ENV === 'production',
        httpOnly: true,
        sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
        domain: NODE_ENV === 'production' ? 'auto' : 'localhost'
      });
      console.log('🎯 AUTH CALLBACK - Redirect URL:', `${frontendUrl}/auth/callback`);
      
      // セッションを明示的に保存してからリダイレクト
      (req as any).session.save((err: any) => {
        if (err) {
          console.error('🚨 SESSION SAVE ERROR:', err);
        } else {
          console.log('✅ SESSION SAVED SUCCESSFULLY');
        }
        res.redirect(`${frontendUrl}/auth/callback`);
      });
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
  console.log('🔍 AUTH STATUS CHECK - Cookie header:', req.headers.cookie);
  console.log('🔍 AUTH STATUS CHECK - Origin:', req.headers.origin);
  console.log('🔍 AUTH STATUS CHECK - Referer:', req.headers.referer);
  console.log('🔍 AUTH STATUS CHECK - User-Agent:', req.headers['user-agent']?.substring(0, 100));
  console.log('🔍 AUTH STATUS CHECK - Session data:', JSON.stringify((req as any).session, null, 2));
  
  // クッキー解析の詳細ログ
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').map(cookie => cookie.trim());
    console.log('🔍 AUTH STATUS CHECK - All cookies:', cookies);
    
    const sessionCookie = cookies.find(cookie => cookie.startsWith('splitmate-session='));
    if (sessionCookie) {
      console.log('🔍 AUTH STATUS CHECK - Session cookie found:', sessionCookie);
      const cookieValue = sessionCookie.split('=')[1];
      console.log('🔍 AUTH STATUS CHECK - Session cookie value:', cookieValue);
      console.log('🔍 AUTH STATUS CHECK - Session cookie decoded:', decodeURIComponent(cookieValue));
    } else {
      console.log('🔍 AUTH STATUS CHECK - No session cookie found');
    }
  }
  
  res.json({
    authenticated: req.isAuthenticated?.() || false,
    user: req.user || null
  });
});

// セッションテスト用エンドポイント
app.get('/auth/test-session', (req, res) => {
  console.log('🧪 SESSION TEST - Session ID:', (req as any).sessionID);
  console.log('🧪 SESSION TEST - Session data:', JSON.stringify((req as any).session, null, 2));
  
  // セッションに値を設定
  (req as any).session.testValue = 'test-' + Date.now();
  
  (req as any).session.save((err: any) => {
    if (err) {
      console.error('🚨 TEST SESSION SAVE ERROR:', err);
      res.json({ error: 'Session save failed', details: err.message });
    } else {
      console.log('✅ TEST SESSION SAVED');
      res.json({ 
        sessionId: (req as any).sessionID, 
        testValue: (req as any).session.testValue,
        message: 'Session saved successfully'
      });
    }
  });
});

// セッション確認用エンドポイント
app.get('/auth/check-session', (req, res) => {
  console.log('🔍 SESSION CHECK - Session ID:', (req as any).sessionID);
  console.log('🔍 SESSION CHECK - Test value:', (req as any).session.testValue);
  console.log('🔍 SESSION CHECK - Session data:', JSON.stringify((req as any).session, null, 2));
  
  res.json({
    sessionId: (req as any).sessionID,
    testValue: (req as any).session.testValue,
    sessionData: (req as any).session
  });
});

// PostgreSQL セッションストアの直接確認
app.get('/auth/debug-session-store', async (req, res) => {
  try {
    const sessionId = (req as any).sessionID;
    console.log('🔍 DEBUG SESSION STORE - Current Session ID:', sessionId);
    console.log('🔍 DEBUG SESSION STORE - Cookie header:', req.headers.cookie);
    
    // PostgreSQLから直接セッションを確認
    const query = 'SELECT sid, sess, expire FROM session ORDER BY expire DESC LIMIT 10';
    const result = await pool.query(query);
    
    console.log('🔍 DEBUG SESSION STORE - Sessions in database:');
    result.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. SID: ${row.sid}`);
      console.log(`     Expire: ${row.expire}`);
      console.log(`     Session: ${JSON.stringify(row.sess, null, 2)}`);
    });
    
    // 現在のセッションIDでの検索
    const currentSessionQuery = 'SELECT sid, sess, expire FROM session WHERE sid = $1';
    const currentSessionResult = await pool.query(currentSessionQuery, [sessionId]);
    
    console.log('🔍 DEBUG SESSION STORE - Current session in database:');
    if (currentSessionResult.rows.length > 0) {
      console.log('  Found session:', JSON.stringify(currentSessionResult.rows[0], null, 2));
    } else {
      console.log('  No session found for current ID');
    }
    
    res.json({
      currentSessionId: sessionId,
      cookieHeader: req.headers.cookie,
      allSessions: result.rows,
      currentSessionInDb: currentSessionResult.rows[0] || null
    });
  } catch (error) {
    console.error('🚨 DEBUG SESSION STORE ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Database query failed', details: errorMessage });
  }
});

// 手動セッション検証エンドポイント
app.get('/auth/verify-cookie', (req, res) => {
  console.log('🧪 MANUAL COOKIE VERIFICATION');
  console.log('   Cookie header:', req.headers.cookie);
  console.log('   Current session ID:', (req as any).sessionID);
  
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').map(cookie => cookie.trim());
    const sessionCookie = cookies.find(cookie => cookie.startsWith('splitmate-session='));
    
    if (sessionCookie) {
      const cookieValue = sessionCookie.split('=')[1];
      const decodedCookie = decodeURIComponent(cookieValue);
      
      console.log('   Session cookie found:', sessionCookie);
      console.log('   Cookie value:', cookieValue);
      console.log('   Decoded cookie:', decodedCookie);
      
      // セッションシークレットを使った手動検証
      const sessionSecret = process.env.SESSION_SECRET || 'your-session-secret';
      console.log('   Session secret length:', sessionSecret.length);
      console.log('   Session secret prefix:', sessionSecret.substring(0, 10));
      
      res.json({
        success: true,
        currentSessionId: (req as any).sessionID,
        cookieValue,
        decodedCookie,
        sessionSecretLength: sessionSecret.length,
        sessionSecretPrefix: sessionSecret.substring(0, 10)
      });
    } else {
      res.json({
        success: false,
        error: 'No session cookie found',
        allCookies: cookies
      });
    }
  } else {
    res.json({
      success: false,
      error: 'No cookies in request'
    });
  }
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
