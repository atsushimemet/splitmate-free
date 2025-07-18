import { useState } from 'react';

interface CoupleFormProps {
  onSubmit: (coupleName: string) => Promise<void>;
  isLoading?: boolean;
}

export const CoupleForm = ({ onSubmit, isLoading = false }: CoupleFormProps) => {
  const [coupleName, setCoupleName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!coupleName.trim()) {
      setError('カップル名を入力してください');
      return;
    }

    setError(null);
    
    try {
      await onSubmit(coupleName.trim());
    } catch (err) {
      setError('カップルの作成に失敗しました');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SplitMate</h1>
          <p className="text-gray-600">カップル・世帯の設定</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              カップルを新規作成
            </h2>
            <p className="text-sm text-gray-600">
              費用を共有するカップル・世帯の名前を設定してください
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="coupleName" className="block text-sm font-medium text-gray-700 mb-2">
                カップル・世帯名
              </label>
              <input
                id="coupleName"
                type="text"
                value={coupleName}
                onChange={(e) => setCoupleName(e.target.value)}
                placeholder="例: 田中家、山田カップル"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={isLoading}
              />
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
              disabled={isLoading || !coupleName.trim()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  作成中...
                </div>
              ) : (
                'カップルを作成'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              カップルを作成すると、パートナーを招待できるようになります
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 
