import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth, coupleApi, userApi } from '../services/api';

// ユーザー情報の型定義
interface User {
  id: string;
  displayName: string;
  email: string;
  picture?: string;
  coupleId?: string;
  registeredUserId?: string; // 登録済みユーザーID
}

// コンテキストの型定義
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  hasCouple: boolean;
  hasUser: boolean;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>;
  setToken: (token: string) => void;
  createCouple: (name: string) => Promise<boolean>;
  createUser: (name: string, role: 'husband' | 'wife') => Promise<boolean>;
  updateUserStatus: (coupleId: string, registeredUserId: string) => void;
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
  const [hasCouple, setHasCouple] = useState(false);
  const [hasUser, setHasUser] = useState(false);

  // JWTトークンを設定
  const setToken = (token: string) => {
    setStoredToken(token);
    // トークンが設定されたら認証状態をチェック（非同期で実行）
    setTimeout(() => {
      checkAuthStatus();
    }, 0);
  };

  // カップル作成
  const createCouple = async (name: string): Promise<boolean> => {
    try {
      const response = await coupleApi.createCouple(name);
      if (response.success && response.data) {
        // ユーザー情報を更新してカップルIDを設定
        if (user) {
          setUser({
            ...user,
            coupleId: response.data.id
          });
          setHasCouple(true);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to create couple:', error);
      return false;
    }
  };

  // ユーザー作成
  const createUser = async (name: string, role: 'husband' | 'wife'): Promise<boolean> => {
    try {
      if (!user?.coupleId) {
        console.error('No couple ID available');
        return false;
      }

      const response = await userApi.createUser(name, role, user.coupleId);
      if (response.success && response.data) {
        // ユーザー情報を更新して登録済みユーザーIDを設定
        setUser({
          ...user,
          registeredUserId: response.data.id
        });
        setHasUser(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to create user:', error);
      return false;
    }
  };

  // 認証状態チェック
  const checkAuthStatus = async () => {
    console.log('AuthContext: 認証状態チェックを開始します');
    
    const token = getStoredToken();
    if (!token) {
      console.log('AuthContext: JWTトークンがありません');
      setIsAuthenticated(false);
      setUser(null);
      setHasCouple(false);
      setHasUser(false);
      setLoading(false);
      return;
    }

    try {
      const data = await auth.checkAuthStatus();
      console.log('AuthContext: APIレスポンス data:', data);
      
      setIsAuthenticated(data.authenticated);
      if (data.authenticated && data.user) {
        const userWithCouple = {
          ...data.user,
          coupleId: data.user.coupleId,
          registeredUserId: data.user.registeredUserId
        };
        setUser(userWithCouple);
        setHasCouple(!!data.user.coupleId);
        setHasUser(!!data.user.registeredUserId);
      } else {
        setUser(null);
        setHasCouple(false);
        setHasUser(false);
      }
      console.log('AuthContext: 認証状態を更新しました - authenticated:', data.authenticated, 'hasCouple:', !!data.user?.coupleId, 'hasUser:', !!data.user?.registeredUserId);
    } catch (error) {
      console.error('AuthContext: Auth status check failed:', error);
      // 認証エラーの場合はトークンを削除
      removeStoredToken();
      setIsAuthenticated(false);
      setUser(null);
      setHasCouple(false);
      setHasUser(false);
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
        setHasCouple(false);
        setHasUser(false);
      } else {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // エラーが発生してもトークンを削除
      removeStoredToken();
      setIsAuthenticated(false);
      setUser(null);
      setHasCouple(false);
      setHasUser(false);
    }
  };

  // ユーザー状態を手動で更新
  const updateUserStatus = (coupleId: string, registeredUserId: string) => {
    console.log('🔄 AuthContext: updateUserStatus 呼び出し:', { coupleId, registeredUserId });
    console.log('🔄 AuthContext: 現在のuser状態:', user);
    
    if (user) {
      const updatedUser = {
        ...user,
        coupleId,
        registeredUserId
      };
      console.log('🔄 AuthContext: 更新後のuser状態:', updatedUser);
      
      setUser(updatedUser);
      setHasCouple(true);
      setHasUser(true);
      
      console.log('🔄 AuthContext: 状態更新完了 - hasCouple: true, hasUser: true');
    } else {
      console.error('🔄 AuthContext: user が null のため状態更新をスキップ');
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
      hasCouple,
      hasUser,
      checkAuthStatus,
      logout,
      setToken,
      createCouple,
      createUser,
      updateUserStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 
