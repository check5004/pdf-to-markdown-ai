import React from 'react';
import { UserCircleIcon, ArrowRightOnRectangleIcon, ExclamationTriangleIcon } from './Icons';
import { AUTHORIZED_DOMAIN } from '../authConfig';


interface GeminiAuthProps {
  account: any | null;
  isAuthorized: boolean;
  isLoading: boolean;
  authError: string | null;
  onLogin: () => void;
  onLogout: () => void;
  disabled?: boolean;
}

const GeminiAuth: React.FC<GeminiAuthProps> = ({ account, isAuthorized, isLoading, authError, onLogin, onLogout, disabled }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">認証情報を確認中...</span>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-700 text-sm text-red-800 dark:text-red-200" role="alert">
        <p className="font-bold">認証エラー</p>
        <p>{authError}</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className={`text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg ${disabled ? 'opacity-50' : ''}`}>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Geminiを利用するには、指定されたMicrosoftアカウントでの認証が必要です。
        </p>
        <button
          onClick={onLogin}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 dark:border-gray-500 text-sm font-semibold rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <img src="https://img.icons8.com/color/48/microsoft.png" alt="Microsoft logo" className="h-6 w-6" />
          Microsoftアカウントでログイン
        </button>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
       <div className={`p-4 bg-red-50 dark:bg-red-900/30 rounded-md border border-red-300 dark:border-red-600 ${disabled ? 'opacity-50' : ''}`}>
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <h3 className="text-md font-semibold text-red-800 dark:text-red-200">アクセスが拒否されました</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              アカウント「{account.username}」ではこのアプリケーションを利用できません。
              <span className="font-semibold">@{AUTHORIZED_DOMAIN}</span> ドメインのアカウントでログインしてください。
            </p>
            <button
              onClick={onLogout}
              disabled={disabled}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              ログアウト
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-md border border-green-200 dark:border-green-700 ${disabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-3">
            <UserCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div>
                <span className="text-sm font-medium text-green-800 dark:text-green-200">認証済み</span>
                <p className="text-xs text-green-700 dark:text-green-300 truncate" title={account.name}>{account.name}</p>
            </div>
        </div>
        <button
            onClick={onLogout}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            aria-label="ログアウト"
        >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            <span className="hidden sm:inline">ログアウト</span>
        </button>
    </div>
  );
};

export default GeminiAuth;