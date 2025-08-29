import React from 'react';
import { AnalysisMode } from '../types.ts';

interface AnalysisModeSwitcherProps {
  mode: AnalysisMode;
  setMode: (mode: AnalysisMode) => void;
}

const AnalysisModeSwitcher: React.FC<AnalysisModeSwitcherProps> = ({ mode, setMode }) => {
  const baseClasses = "flex-1 text-center px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800";
  const activeClasses = "bg-primary-600 text-white shadow";
  const inactiveClasses = "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600";

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
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">「画像 + テキスト」モードは精度が向上する可能性がありますが、トークン消費量が増加します。</p>
    </div>
  );
};

export default AnalysisModeSwitcher;