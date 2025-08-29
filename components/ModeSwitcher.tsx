
import React from 'react';
import { Mode } from '../types';

interface ModeSwitcherProps {
  mode: Mode;
  setMode: (mode: Mode) => void;
  isGeminiAvailable: boolean;
}

const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ mode, setMode, isGeminiAvailable }) => {
  const baseClasses = "flex-1 text-center px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800";
  const activeClasses = "bg-primary-600 text-white shadow";
  const inactiveClasses = "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600";
  const disabledClasses = "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AIプロバイダー</label>
      <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setMode(Mode.GEMINI)}
          disabled={!isGeminiAvailable}
          className={`${baseClasses} ${mode === Mode.GEMINI ? activeClasses : !isGeminiAvailable ? disabledClasses : inactiveClasses}`}
          title={!isGeminiAvailable ? "Gemini APIキーが設定されていません。" : undefined}
        >
          Gemini
        </button>
        <button
          onClick={() => setMode(Mode.OPENROUTER)}
          className={`${baseClasses} ${mode === Mode.OPENROUTER ? activeClasses : inactiveClasses}`}
        >
          OpenRouter
        </button>
      </div>
    </div>
  );
};

export default ModeSwitcher;
