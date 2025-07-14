import cors from 'cors';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

export const createTestApp = () => {
  const app = express();
  
  // CORS設定
  app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    optionsSuccessStatus: 200
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // セッション設定
  app.use(session({
    secret: process.env.SESSION_SECRET || 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // テスト環境ではHTTPS不要
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24時間
    }
  }));

  // Passport初期化
  app.use(passport.initialize());
  app.use(passport.session());

  return app;
};

export const setupGoogleStrategy = () => {
  // テスト用Google Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
  }, (accessToken, refreshToken, profile, done) => {
    const testUser = {
      id: profile.id,
      displayName: profile.displayName,
      emails: profile.emails,
      photos: profile.photos,
      accessToken,
      refreshToken
    };
    return done(null, testUser);
  }));

  // シリアライゼーション
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id: string, done) => {
    const testUser = {
      id,
      displayName: 'Test User',
      emails: [{ value: 'test@example.com' }]
    };
    done(null, testUser);
  });
};

export const addAuthRoutes = (app: express.Application) => {
  // Google OAuth開始
  app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));

  // OAuth コールバック
  app.get('/auth/google/callback',
    passport.authenticate('google', {
      failureRedirect: `${process.env.FRONTEND_URL}/`,
      session: true
    }),
    (req, res) => {
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
    }
  );

  // 認証状態確認
  app.get('/auth/status', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      res.json({
        authenticated: true,
        user: req.user
      });
    } else {
      res.json({
        authenticated: false
      });
    }
  });

  // ログアウト
  app.get('/auth/logout', (req, res): void => {
    if (req.logout) {
      req.logout((err) => {
        if (err) {
          res.status(500).json({ success: false, error: 'Logout failed' });
          return;
        }
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  });

  // テスト用エンドポイント（テスト環境のみ）
  if (process.env.NODE_ENV === 'test') {
    app.post('/test/set-session', (req, res) => {
      (req.session as any).user = req.body.user;
      res.json({ success: true });
    });
  }
};

export const validateEnvironment = () => {
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SESSION_SECRET',
    'FRONTEND_URL',
    'BACKEND_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  return true;
}; 
