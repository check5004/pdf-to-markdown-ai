
import React from 'react';
import { AnalysisMode, Mode } from '../types';

interface AnalysisModeSwitcherProps {
  mode: AnalysisMode;
  setMode: (mode: AnalysisMode) => void;
  aiProvider: Mode;
}

const AnalysisModeSwitcher: React.FC<AnalysisModeSwitcherProps> = ({ mode, setMode, aiProvider }) => {
  const baseClasses = "flex-1 text-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800";
  const activeClasses = "bg-primary-600 text-white shadow";
  const inactiveClasses = "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600";
  const disabledClasses = "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">解析モード</label>
      <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setMode('image-only')}
          className={`${baseClasses} ${mode === 'image-only' ? activeClasses : inactiveClasses}`}
        >
          画像のみ
        </button>
        <button
          onClick={() => setMode('image-with-text')}
          className={`${baseClasses} ${mode === 'image-with-text' ? activeClasses : inactiveClasses}`}
        >
          画像 + テキスト
        </button>
         <button
          onClick={() => setMode('pdf-direct')}
          disabled={aiProvider !== Mode.OPENROUTER}
          className={`${baseClasses} ${mode === 'pdf-direct' ? activeClasses : aiProvider !== Mode.OPENROUTER ? disabledClasses : inactiveClasses}`}
          title={aiProvider !== Mode.OPENROUTER ? 'PDF DirectモードはOpenRouterでのみ利用可能です。' : 'PDFファイルを直接AIに送信します（対応モデルのみ）。'}
        >
          PDF Direct (ｵｽｽﾒ)
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">「画像 + テキスト」は精度向上、「PDF Direct」は対応モデルで高速化が期待できます。</p>
    </div>
  );
};

export default AnalysisModeSwitcher;