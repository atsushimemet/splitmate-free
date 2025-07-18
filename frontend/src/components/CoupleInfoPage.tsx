import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { coupleApi, userApi } from '../services/api';
import { Couple, User } from '../types';

export const CoupleInfoPage: React.FC = () => {
  const { coupleId } = useParams<{ coupleId: string }>();
  const { isAuthenticated, user, loading } = useAuth();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [coupleUsers, setCoupleUsers] = useState<User[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && coupleId) {
      checkAccessAndLoadData();
    }
  }, [loading, coupleId, isAuthenticated, user]);

  const checkAccessAndLoadData = async () => {
    if (!coupleId) {
      setError('カップルIDが指定されていません');
      setPageLoading(false);
      return;
    }

    if (!isAuthenticated || !user) {
      setError('このページにアクセスするには認証が必要です');
      setPageLoading(false);
      return;
    }

    try {
      // カップル情報を取得
      const coupleResponse = await coupleApi.getCouple(coupleId);
      if (!coupleResponse.success || !coupleResponse.data) {
        setError('カップル情報が見つかりません');
        setPageLoading(false);
        return;
      }

      setCouple(coupleResponse.data);

      // カップルのユーザー一覧を取得
      const usersResponse = await userApi.getUsersByCouple(coupleId);
      if (usersResponse.success && usersResponse.data) {
        setCoupleUsers(usersResponse.data);
      }

      // アクセス権限をチェック
      const userHasAccess = checkUserAccess(user, coupleId, usersResponse.data || []);
      setHasAccess(userHasAccess);

      if (!userHasAccess) {
        setError('このカップル情報にアクセスする権限がありません');
      }
    } catch (err) {
      setError('データの取得に失敗しました');
    } finally {
      setPageLoading(false);
    }
  };

  const checkUserAccess = (currentUser: any, targetCoupleId: string, users: User[]): boolean => {
    // ユーザーが対象カップルのメンバーかチェック
    if (currentUser.coupleId === targetCoupleId) {
      return true;
    }

    // 現在のユーザーがカップルのメンバーかどうかをチェック
    // AuthContextのユーザー情報とカップルのユーザー情報を照合
    if (currentUser.registeredUserId) {
      const isRegisteredUser = users.some(u => u.id === currentUser.registeredUserId);
      return isRegisteredUser;
    }

    return false;
  };

  const generateInvitationLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/couple/${coupleId}`;
  };

  const copyInvitationLink = async () => {
    const link = generateInvitationLink();
    try {
      await navigator.clipboard.writeText(link);
      alert('招待リンクをコピーしました');
    } catch (err) {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('招待リンクをコピーしました');
    }
  };

  // ローディング中
  if (loading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラーまたはアクセス権限なし
  if (error || !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SplitMate</h1>
            <p className="text-gray-600 mb-8">カップル情報</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center text-red-600">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
                アクセスエラー
              </div>
              <p className="text-sm text-gray-600">{error}</p>
              <div className="mt-6">
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  ホームに戻る
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 正常なアクセス - カップル情報を表示
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SplitMate</h1>
              <p className="text-gray-600">カップル情報</p>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              メイン画面に戻る
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* カップル情報カード */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">カップル情報</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">カップル名</label>
                <p className="mt-1 text-lg text-gray-900">{couple?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">カップルID</label>
                <p className="mt-1 font-mono text-gray-800 bg-gray-50 px-3 py-2 rounded-md">
                  {coupleId}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">作成日</label>
                <p className="mt-1 text-gray-600">
                  {couple?.createdAt ? new Date(couple.createdAt).toLocaleDateString('ja-JP') : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* メンバー情報カード */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">メンバー</h3>
            <div className="space-y-3">
              {coupleUsers.length > 0 ? (
                coupleUsers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-600">{member.role === 'husband' ? '夫' : '妻'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        登録日: {new Date(member.createdAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">まだメンバーが登録されていません</p>
              )}
            </div>
          </div>

          {/* 招待リンクカード */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">配偶者招待</h3>
            <p className="text-gray-600 mb-4">
              配偶者にこのリンクを共有して、カップルのアカウントにアクセスしてもらいましょう。
            </p>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={generateInvitationLink()}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm"
              />
              <button
                onClick={copyInvitationLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                コピー
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              このリンクは認証されたユーザーのみがアクセスできます。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}; 
