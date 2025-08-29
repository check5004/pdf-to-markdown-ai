
import React from 'react';

interface GeminiTierSelectorProps {
  isFreeTier: boolean;
  setIsFreeTier: (isFree: boolean) => void;
}

const GeminiTierSelector: React.FC<GeminiTierSelectorProps> = ({ isFreeTier, setIsFreeTier }) => {
  const toggle = () => setIsFreeTier(!isFreeTier);

  return (
    <div>
      <label htmlFor="gemini-free-tier-checkbox" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Geminiプラン
      </label>
      <div className="mt-2 flex items-center">
        <input
          id="gemini-free-tier-checkbox"
          name="gemini-free-tier"
          type="checkbox"
          checked={isFreeTier}
          onChange={toggle}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-primary-500"
        />
        <label htmlFor="gemini-free-tier-checkbox" className="ml-3 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          Freeプラン（旧: Gemini 1.5 Flash）を利用
        </label>
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Freeプランを使用している場合は、チェックを入れてください。データ使用に関する警告が表示されます。
      </p>
    </div>
  );
};

export default GeminiTierSelector;
