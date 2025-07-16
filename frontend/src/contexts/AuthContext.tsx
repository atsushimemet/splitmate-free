import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth } from '../services/api';

// ユーザー情報の型定義
interface User {
  id: string;
  displayName: string;
  email: string;
  picture?: string;
}

// コンテキストの型定義
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>;
  setToken: (token: string) => void;
}

// コンテキストの作成
const AuthContext = createContext<AuthContextType | null>(null);

// JWTトークンの保存・取得・削除用のヘルパー関数
const JWT_STORAGE_KEY = 'splitmate_jwt_token';

const getStoredToken = (): string | null => {
  return localStorage.getItem(JWT_STORAGE_KEY);
};

const setStoredToken = (token: string): void => {
  localStorage.setItem(JWT_STORAGE_KEY, token);
};

const removeStoredToken = (): void => {
  localStorage.removeItem(JWT_STORAGE_KEY);
};

// カスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// プロバイダーコンポーネント
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // JWTトークンを設定
  const setToken = (token: string) => {
    setStoredToken(token);
    // トークンが設定されたら認証状態をチェック
    checkAuthStatus();
  };

  // 認証状態チェック
  const checkAuthStatus = async () => {
    console.log('AuthContext: 認証状態チェックを開始します');
    
    const token = getStoredToken();
    if (!token) {
      console.log('AuthContext: JWTトークンがありません');
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await auth.checkAuthStatus();
      console.log('AuthContext: APIレスポンス data:', data);
      
      setIsAuthenticated(data.authenticated);
      setUser(data.authenticated ? data.user : null);
      console.log('AuthContext: 認証状態を更新しました - authenticated:', data.authenticated);
    } catch (error) {
      console.error('AuthContext: Auth status check failed:', error);
      // 認証エラーの場合はトークンを削除
      removeStoredToken();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
      console.log('AuthContext: 認証状態チェックが完了しました');
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      const result = await auth.logout();
      if (result.success) {
        // JWTトークンを削除
        removeStoredToken();
        setIsAuthenticated(false);
        setUser(null);
      } else {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // エラーが発生してもトークンを削除
      removeStoredToken();
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // 初回マウント時に認証状態をチェック
  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      loading,
      checkAuthStatus,
      logout,
      setToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 
