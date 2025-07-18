import { useState } from 'react';
import { auth } from '../services/api';

interface RoleSelectionFormProps {
  coupleName: string;
  coupleId: string;
  onRoleSelected?: (role: 'husband' | 'wife') => void;
}

export const RoleSelectionForm = ({ coupleName, coupleId, onRoleSelected }: RoleSelectionFormProps) => {
  const [role, setRole] = useState<'husband' | 'wife' | ''>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!role) {
      setError('夫または妻を選択してください');
      return;
    }

    setError(null);
    
    try {
      // 役割情報をLocalStorageに一時保存（名前はGoogle認証から取得）
      const roleData = {
        role,
        coupleId,
        coupleName,
        timestamp: Date.now()
      };
      localStorage.setItem('splitmate_role_data', JSON.stringify(roleData));
      
      // 保存確認のデバッグログ
      console.log('🔍 RoleSelection: LocalStorageに保存しました:', roleData);
      console.log('🔍 RoleSelection: 保存確認:', localStorage.getItem('splitmate_role_data'));
      
      // 親コンポーネントに役割選択を通知
      if (onRoleSelected) {
        onRoleSelected(role);
      }
      
      // デバッグ：Google認証前の確認
      const saved = localStorage.getItem('splitmate_role_data');
      if (!confirm(`LocalStorageに保存されました: ${saved ? 'あり' : 'なし'}\n\nGoogle認証に進みますか？\n\n[ブラウザの開発者ツールでログを確認してからOKを押してください]`)) {
        return;
      }
      
      // Google認証ページにリダイレクト
      auth.loginWithGoogle();
    } catch (err) {
      setError('処理に失敗しました');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SplitMate</h1>
          <p className="text-gray-600">あなたの役割を選択</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {coupleName}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              あなたの役割を選択してください
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                お名前はGoogleアカウントから自動で取得されます
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                あなたは？
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('husband')}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    role === 'husband'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">👨</div>
                    <div className="font-medium">夫</div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setRole('wife')}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    role === 'wife'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">👩</div>
                    <div className="font-medium">妻</div>
                  </div>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* デバッグ用：LocalStorage確認ボタン */}
            <button
              type="button"
              onClick={() => {
                console.log('🔍 DEBUG: 現在のLocalStorage:', localStorage.getItem('splitmate_role_data'));
                console.log('🔍 DEBUG: 選択された役割:', role);
                console.log('🔍 DEBUG: カップルID:', coupleId);
                alert(`役割: ${role}, カップルID: ${coupleId}, LocalStorage: ${localStorage.getItem('splitmate_role_data')}`);
              }}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-3"
            >
              [DEBUG] LocalStorage確認
            </button>

            <button
              type="submit"
              disabled={!role}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Googleアカウントで認証
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Googleアカウントでログインして登録を完了します
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 
