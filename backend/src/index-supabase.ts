import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { pool } from './database/connection-postgres';
import { initializeDatabase } from './database/connection-supabase';
import { authenticateJWT, generateJWT, JWTUser } from './middleware/jwtAuth';
import allocationRatioRoutes from './routes/allocationRatioRoutes-postgres';
import { createCoupleRoutes } from './routes/coupleRoutes-postgres';
import expenseRoutes from './routes/expenseRoutes-postgres';
import settlementRoutes from './routes/settlementRoutes-postgres';
import { createUserRoutes } from './routes/userRoutes-postgres';
import { CoupleService } from './services/coupleService-postgres';
import { UserService } from './services/userService-postgres';

// 環境変数の読み込み
dotenv.config();

const app = express();
app.set('trust proxy', 1);
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

// JWT設定のログ
console.log('🔐 JWT Configuration:');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
console.log('   JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN || '24h');

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

// Passport初期化（JWT認証ではセッションは不要）
app.use(passport.initialize());

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
    console.log('🔍 OAuth callback received for user:', profile.displayName);
    console.log('🔍 Full profile data:', JSON.stringify(profile, null, 2));
    console.log('🔍 Profile displayName:', profile.displayName);
    console.log('🔍 Profile name:', profile.name);
    console.log('🔍 Profile emails:', profile.emails);
    console.log('🔍 Access token available:', !!accessToken);
    
    // displayNameの複数ソースからの取得を試行
    const displayName = profile.displayName || 
                       profile.name?.givenName + ' ' + profile.name?.familyName ||
                       profile.name?.givenName ||
                       profile.emails?.[0]?.value?.split('@')[0] ||
                       'User';
    
    console.log('🔍 Final displayName to use:', displayName);
    
    // JWTペイロードを作成
    const jwtPayload: JWTUser = {
      id: profile.id,
      displayName: displayName,
      email: profile.emails?.[0]?.value || '',
      picture: profile.photos?.[0]?.value
    };
    
    console.log('🔍 JWT payload created:', jwtPayload);
    return done(null, jwtPayload);
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
      session: false // JWT認証ではセッションを使用しない
    }),
    (req, res) => {
      console.log('🎯 AUTH CALLBACK - Authentication successful');
      console.log('🎯 AUTH CALLBACK - User:', req.user);
      
      if (req.user) {
        // JWTトークンを生成
        const token = generateJWT(req.user as JWTUser);
        console.log('🎯 AUTH CALLBACK - JWT token generated');
        
        // フロントエンドにJWTトークンを送信
        const redirectUrl = `${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`;
        console.log('🎯 AUTH CALLBACK - Redirect URL:', redirectUrl);
        res.redirect(redirectUrl);
      } else {
        console.error('🚨 AUTH CALLBACK - No user data received');
        res.redirect(`${frontendUrl}/?error=authentication_failed`);
      }
    }
  );
} else {
  console.warn('⚠️ Google OAuth credentials not configured. Authentication will not work.');
}

// 認証状態確認（JWT版 + データベース情報取得）
app.get('/auth/status', authenticateJWT, async (req, res) => {
  console.log('🔍 AUTH STATUS CHECK - JWT User:', req.jwtUser);
  
  if (req.jwtUser) {
    try {
      // データベースからユーザー情報を取得してJWT情報を補完
      const { pool } = await import('./database/connection-postgres');
      
      // ユーザーIDでユーザー情報を検索
      const userQuery = 'SELECT * FROM users WHERE name = $1 AND role IS NOT NULL LIMIT 1';
      const userResult = await pool.query(userQuery, [req.jwtUser.displayName]);
      
      let enhancedUser = { ...req.jwtUser };
      
      if (userResult.rows.length > 0) {
        const userData = userResult.rows[0];
        console.log('🔍 AUTH STATUS CHECK - Found user in database:', userData);
        
        enhancedUser.coupleId = userData.couple_id;
        enhancedUser.registeredUserId = userData.id;
        
        console.log('🔍 AUTH STATUS CHECK - Enhanced user data:', enhancedUser);
      } else {
        console.log('🔍 AUTH STATUS CHECK - No user found in database for displayName:', req.jwtUser.displayName);
      }
      
      res.json({ 
        authenticated: true, 
        user: enhancedUser 
      });
    } catch (error) {
      console.error('🔍 AUTH STATUS CHECK - Database error:', error);
      // データベースエラーの場合はJWT情報のみを返す
      res.json({ 
        authenticated: true, 
        user: req.jwtUser 
      });
    }
  } else {
    res.status(401).json({ 
      authenticated: false,
      error: 'No valid JWT token provided'
    });
  }
});

// ログアウト（JWT版ではクライアント側でトークンを削除）
app.get('/auth/logout', (req, res) => {
  res.json({ 
    success: true,
    message: 'JWT token should be removed on client side'
  });
});

// リクエストログ
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'SplitMate Backend API (Supabase + JWT)'
  });
});

// API ルート（JWT認証を適用）
app.use('/api/expenses', authenticateJWT, expenseRoutes);
app.use('/api/allocation-ratio', authenticateJWT, allocationRatioRoutes);
app.use('/api/settlements', authenticateJWT, settlementRoutes);

// カップルルート
const coupleService = new CoupleService(pool);
app.use('/api/couples', createCoupleRoutes(coupleService));

// ユーザールート
const userService = new UserService(pool);
app.use('/api/users', createUserRoutes(userService));

// 404 ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// エラーハンドラー
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 ERROR:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// サーバー起動
async function startServer() {
  try {
    console.log('🚀 Starting SplitMate Backend Server (Supabase + JWT)...');
    
    // データベース接続テスト
    await initializeDatabase();
    console.log('✅ Database connection established');
    
    // サーバー起動
    app.listen(PORT, () => {
      console.log(`🎉 Server is running on port ${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🎨 Frontend URL: ${frontendUrl}`);
      console.log(`🔗 Backend URL: ${backendUrl}`);
      console.log(`🔐 JWT Authentication: Enabled`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 
