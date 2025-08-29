
import React from 'react';

interface ThinkingModeSwitcherProps {
  isEnabled: boolean;
  setIsEnabled: (isEnabled: boolean) => void;
}

const ThinkingModeSwitcher: React.FC<ThinkingModeSwitcherProps> = ({ isEnabled, setIsEnabled }) => {
  const baseClasses = "relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800";
  const knobClasses = "inline-block w-4 h-4 transform bg-white rounded-full transition-transform";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Thinkingモード
      </label>
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => setIsEnabled(!isEnabled)}
          className={`${baseClasses} ${isEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          role="switch"
          aria-checked={isEnabled}
        >
          <span className={`${knobClasses} ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {isEnabled ? '有効' : '無効'}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        有効にすると、モデルはより高品質な応答を生成するために「思考」時間を使いますが、少し遅くなる場合があります。
      </p>
    </div>
  );
};

export default ThinkingModeSwitcher;
