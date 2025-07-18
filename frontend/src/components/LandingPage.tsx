import React from 'react';
import { GoogleLoginButton } from './GoogleLoginButton';

interface LandingPageProps {
  onSignupClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignupClick }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SplitMate</h1>
          <p className="text-lg text-gray-600 mb-8">夫婦・カップルの精算アプリ</p>
          <p className="text-sm text-gray-500">
            家計の費用を簡単に管理・精算できます
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          {/* ログインセクション */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 text-center">
              既存ユーザーの方
            </h2>
            <p className="text-sm text-gray-600 text-center">
              すでにアカウントをお持ちの方は、Googleアカウントでログインしてください
            </p>
            <div className="flex justify-center">
              <GoogleLoginButton />
            </div>
          </div>

          {/* 区切り線 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">または</span>
            </div>
          </div>

          {/* 新規登録セクション */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 text-center">
              新規ユーザーの方
            </h2>
            <p className="text-sm text-gray-600 text-center">
              初めてご利用の方は、カップル情報を作成してください
            </p>
            <button
              onClick={onSignupClick}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              新規カップル登録
            </button>
          </div>
        </div>

        {/* フッター */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            © 2024 SplitMate. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}; 
