import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// ユーザー情報の型定義
interface User {
  id: string;
  displayName: string;
  emails?: { value: string }[];
  photos?: { value: string }[];
}

// コンテキストの型定義
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>;
}

// コンテキストの作成
const AuthContext = createContext<AuthContextType | null>(null);

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

  // 認証状態チェック
  const checkAuthStatus = async () => {
    console.log('AuthContext: 認証状態チェックを開始します');
    try {
      const response = await fetch('http://localhost:3001/auth/status', {
        credentials: 'include'
      });
      console.log('AuthContext: APIレスポンス status:', response.status);
      const data = await response.json();
      console.log('AuthContext: APIレスポンス data:', data);
      
      setIsAuthenticated(data.authenticated);
      setUser(data.authenticated ? data.user : null);
      console.log('AuthContext: 認証状態を更新しました - authenticated:', data.authenticated);
    } catch (error) {
      console.error('AuthContext: Auth status check failed:', error);
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
      await fetch('http://localhost:3001/auth/logout', {
        credentials: 'include'
      });
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
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
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 
