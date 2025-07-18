import { useState } from 'react';

interface UserRegistrationFormProps {
  onSubmit: (name: string, role: 'husband' | 'wife') => Promise<void>;
  isLoading?: boolean;
}

export const UserRegistrationForm = ({ onSubmit, isLoading = false }: UserRegistrationFormProps) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'husband' | 'wife' | ''>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('お名前を入力してください');
      return;
    }
    
    if (!role) {
      setError('夫または妻を選択してください');
      return;
    }

    setError(null);
    
    try {
      await onSubmit(name.trim(), role);
    } catch (err) {
      setError('ユーザー登録に失敗しました');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SplitMate</h1>
          <p className="text-gray-600">ユーザー情報の登録</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              あなたの情報を登録
            </h2>
            <p className="text-sm text-gray-600">
              お名前とあなたの立場を教えてください
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                お名前
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 太郎、花子"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={isLoading}
              />
            </div>

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
                  disabled={isLoading}
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
                  disabled={isLoading}
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

            <button
              type="submit"
              disabled={isLoading || !name.trim() || !role}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  登録中...
                </div>
              ) : (
                '登録完了'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              後でパートナーを招待することができます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 
