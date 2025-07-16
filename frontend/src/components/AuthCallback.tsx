import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AuthCallback = () => {
  const { setToken, checkAuthStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('AuthCallback: コンポーネントがマウントされました');
    console.log('AuthCallback: 現在のURL:', location.pathname + location.search);
    
    const handleCallback = async () => {
      console.log('AuthCallback: 認証処理を開始します');
      
      // URLパラメータからJWTトークンを取得
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get('token');
      
      if (token) {
        console.log('AuthCallback: JWTトークンを取得しました');
        try {
          // JWTトークンを設定
          setToken(token);
          console.log('AuthCallback: JWTトークンを設定しました');
          
          // 認証状態を確認
          await checkAuthStatus();
          console.log('AuthCallback: 認証状態の確認が完了しました');
          
          // トップページにリダイレクト
          console.log('AuthCallback: トップページにリダイレクトします');
          navigate('/', { replace: true });
        } catch (error) {
          console.error('AuthCallback: 認証エラー:', error);
          // エラー時もトップページにリダイレクト
          console.log('AuthCallback: エラー発生のためトップページにリダイレクトします');
          navigate('/', { replace: true });
        }
      } else {
        console.error('AuthCallback: JWTトークンが見つかりません');
        // トークンがない場合はトップページにリダイレクト
        navigate('/', { replace: true });
      }
    };

    handleCallback();
  }, [setToken, checkAuthStatus, navigate, location.search]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">認証処理中...</p>
      </div>
    </div>
  );
}; 
