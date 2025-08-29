
import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, KeyIcon, CheckCircleIcon, XCircleIcon } from './Icons.tsx';
import { fetchModels } from '../services/openRouterService.ts';

interface ApiKeyInputProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  isInvalid: boolean;
}

// Dialog component defined within the same file for encapsulation
const SettingsDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [newApiKey, setNewApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmedKey = newApiKey.trim();
    if (!trimmedKey) return;

    setIsChecking(true);
    setValidationError(null);

    try {
      await fetchModels(trimmedKey); // Validate the key by trying to fetch models
      onSave(trimmedKey);
      setNewApiKey(''); // Clear after save for security
      onClose();
    } catch (error) {
      console.error("API Key validation failed:", error);
      setValidationError("無効なAPIキー、またはネットワークエラーです。キーを確認して再試行してください。");
    } finally {
      setIsChecking(false);
    }
  };

  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 transition-opacity duration-300"
      onClick={handleWrapperClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
        <h2 id="dialog-title" className="text-xl font-bold mb-4">OpenRouter APIキー設定</h2>
        <div>
          <label htmlFor="api-key-dialog" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            APIキー
          </label>
          <div className="mt-1 relative">
            <input
              id="api-key-dialog"
              type={showKey ? 'text' : 'password'}
              value={newApiKey}
              onChange={(e) => {
                setNewApiKey(e.target.value);
                if (validationError) {
                  setValidationError(null);
                }
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
              placeholder="sk-or-..."
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label={showKey ? "APIキーを隠す" : "APIキーを表示"}
            >
              {showKey ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">APIキーはブラウザのローカルストレージに安全に保存されます。</p>
          {validationError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {validationError}
            </p>
          )}
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            type="button"
            disabled={!newApiKey.trim() || isChecking}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
          >
            {isChecking ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>確認中...</span>
              </>
            ) : (
              '保存'
            )}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
          animation: fadeInScale 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ apiKey, setApiKey, isInvalid }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const hasApiKey = !!apiKey;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        OpenRouter APIキー
      </label>
      <div className="mt-1">
        {hasApiKey && !isInvalid ? (
          <div className="flex items-center justify-between p-2.5 bg-green-50 dark:bg-green-900/30 rounded-md border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">APIキーは設定済みです</span>
            </div>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="px-3 py-1 text-xs font-semibold text-primary-700 bg-primary-100 hover:bg-primary-200 dark:text-primary-100 dark:bg-primary-700 dark:hover:bg-primary-600 rounded-md transition-colors"
              aria-label="APIキーを更新"
            >
              更新
            </button>
          </div>
        ) : hasApiKey && isInvalid ? (
          <div className="flex items-center justify-between p-2.5 bg-red-50 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-700">
            <div className="flex items-center gap-2">
              <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-800 dark:text-red-200">APIキーが無効、または期限切れです</span>
            </div>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-100 dark:bg-red-700 dark:hover:bg-red-600 rounded-md transition-colors"
              aria-label="APIキーを更新"
            >
              更新
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsDialogOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-yellow-400 text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            <KeyIcon className="h-5 w-5" />
            <span className="font-semibold">APIキーを設定</span>
          </button>
        )}
      </div>
      {isDialogOpen && (
        <SettingsDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={(newKey) => {
            setApiKey(newKey);
            setIsDialogOpen(false); // Ensure dialog closes on save
          }}
        />
      )}
    </div>
  );
};

export default ApiKeyInput;