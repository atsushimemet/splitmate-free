import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';

export const AuthCallback = () => {
  const { setToken, checkAuthStatus, user, updateUserStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(true);
  const [statusMessage, setStatusMessage] = useState('認証処理中...');

  useEffect(() => {
    console.log('🎯 AuthCallback: コンポーネントがマウントされました');
    console.log('🎯 AuthCallback: 現在のURL:', location.pathname + location.search);
    console.log('🎯 AuthCallback: URLSearchParams:', new URLSearchParams(location.search));
    console.log('🎯 AuthCallback: LocalStorage role data:', localStorage.getItem('splitmate_role_data'));
    console.log('🎯 AuthCallback: LocalStorage全体:', localStorage);
    console.log('🎯 AuthCallback: 現在のドメイン:', window.location.origin);
    console.log('🎯 AuthCallback: LocalStorageキー一覧:', Object.keys(localStorage));
    
    const handleCallback = async () => {
      console.log('AuthCallback: 認証処理を開始します');
      setStatusMessage('認証処理中...');
      
      // URLパラメータからJWTトークンを取得
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get('token');
      
      if (token) {
        console.log('AuthCallback: JWTトークンを取得しました');
        try {
          // JWTトークンを設定
          console.log('AuthCallback: JWTトークンを設定します');
          setToken(token);
          console.log('AuthCallback: JWTトークンを設定しました（認証状態は自動で確認されます）');
          
          // LocalStorageから役割情報を取得
          const roleDataStr = localStorage.getItem('splitmate_role_data');
          console.log('AuthCallback: LocalStorageから役割データを取得:', roleDataStr);
          
          if (roleDataStr) {
            setStatusMessage('ユーザー登録中...');
            console.log('AuthCallback: 役割データを発見しました');
            
            let roleData;
            try {
              roleData = JSON.parse(roleDataStr);
              console.log('AuthCallback: 役割データを解析しました:', roleData);
                          } catch (parseError) {
                console.error('AuthCallback: JSON解析エラー:', parseError);
                localStorage.removeItem('splitmate_role_data');
                throw new Error('役割データの解析に失敗しました');
              }
            
            // 役割データの有効性チェック（24時間以内）
            const now = Date.now();
            const elapsed = now - roleData.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24時間
            
                          if (elapsed > maxAge) {
                console.error('AuthCallback: 役割データが古すぎます');
                localStorage.removeItem('splitmate_role_data');
                throw new Error('役割データが期限切れです');
              }
            
            // ユーザー作成（Google認証から取得したdisplayNameを使用）
            console.log('AuthCallback: ユーザーを作成します', roleData);
            try {
              const userResponse = await userApi.createUserFromAuth(
                roleData.role,
                roleData.coupleId
              );
              console.log('AuthCallback: ユーザー作成APIレスポンス:', userResponse);
              
              if (userResponse.success) {
                console.log('AuthCallback: ユーザー作成成功', userResponse.data);
                // AuthContextの状態を手動で更新
                updateUserStatus(roleData.coupleId, userResponse.data?.id || '');
                // 役割データを削除
                localStorage.removeItem('splitmate_role_data');
                setStatusMessage('登録完了！');
              } else {
                console.error('AuthCallback: ユーザー作成失敗:', userResponse.error);
                throw new Error(userResponse.error || 'ユーザー作成に失敗しました');
              }
            } catch (apiError) {
              console.error('AuthCallback: ユーザー作成API呼び出しエラー:', apiError);
              throw apiError;
            }
          }
          
          // トップページにリダイレクト（役割データがあった場合は少し待つ）
          console.log('AuthCallback: トップページにリダイレクトします');
          const redirectDelay = roleDataStr ? 2000 : 1000;
          setTimeout(() => {
            navigate('/', { replace: true });
          }, redirectDelay);
          
        } catch (error) {
          console.error('AuthCallback: 認証エラー詳細:', error);
          console.error('AuthCallback: エラー種別:', typeof error);
          console.error('AuthCallback: エラーメッセージ:', error instanceof Error ? error.message : String(error));
          console.error('AuthCallback: エラースタック:', error instanceof Error ? error.stack : 'スタックなし');
          
          setStatusMessage(`認証エラー: ${error instanceof Error ? error.message : String(error)}`);
          
          // エラー時もトップページにリダイレクト（3秒後）
          setTimeout(() => {
            console.log('AuthCallback: エラー発生のためトップページにリダイレクトします');
            navigate('/', { replace: true });
          }, 3000);
        } finally {
          setIsProcessing(false);
        }
      } else {
        console.error('AuthCallback: JWTトークンが見つかりません');
        setStatusMessage('認証トークンが見つかりません');
        setIsProcessing(false);
        
        // トークンがない場合もトップページにリダイレクト
        setTimeout(() => {
          console.log('AuthCallback: トークンなしのためトップページにリダイレクトします');
          navigate('/', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [setToken, checkAuthStatus, navigate, location]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SplitMate</h1>
          <p className="text-gray-600">認証処理中</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="mb-6">
              {isProcessing ? (
                <div className="inline-flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-blue-600">処理中...</span>
                </div>
              ) : (
                <div className="text-green-600">
                  <svg className="h-8 w-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>完了</span>
                </div>
              )}
            </div>
            
            <p className="text-gray-600 mb-4">{statusMessage}</p>
            
            {!isProcessing && (
              <p className="text-sm text-gray-500">
                まもなくリダイレクトします...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 
