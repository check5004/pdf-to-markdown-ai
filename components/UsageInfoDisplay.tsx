import React from 'react';
import { UsageInfo } from '../types.ts';
import { CurrencyDollarIcon } from './Icons.tsx';

interface ExchangeRateInfo {
  rate: number;
  lastUpdated: number;
}

interface UsageInfoDisplayProps {
  usage: UsageInfo;
  exchangeRateInfo: ExchangeRateInfo | null;
}

const InfoCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
  <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg shadow-inner">
    <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
    <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{value}</p>
  </div>
);

const UsageInfoDisplay: React.FC<UsageInfoDisplayProps> = ({ usage, exchangeRateInfo }) => {
  const formattedCost = usage.cost > 0 ? usage.cost.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 6,
    maximumFractionDigits: 8,
  }) : '-';

  const jpyCost = exchangeRateInfo && usage.cost > 0 ? (usage.cost * exchangeRateInfo.rate) : 0;
  const showJpyTooltip = jpyCost > 0;

  return (
    <div>
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <CurrencyDollarIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          <span>OpenRouter 利用状況</span>
      </h3>
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard title="プロンプトトークン" value={usage.prompt_tokens.toLocaleString()} />
          <InfoCard title="完了トークン" value={usage.completion_tokens.toLocaleString()} />
          <InfoCard title="合計トークン" value={usage.total_tokens.toLocaleString()} />
          <div className="relative group">
            <InfoCard title="コスト" value={formattedCost} />
            {showJpyTooltip && exchangeRateInfo && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-3 bg-gray-800 dark:bg-black text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10" role="tooltip">
                <p className="font-bold text-sm mb-1">~ {jpyCost.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY', minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
                <div className="text-gray-300 space-y-0.5">
                  <p>レート: 1 USD = {exchangeRateInfo.rate.toFixed(2)} JPY</p>
                  <p>取得日時: {new Date(exchangeRateInfo.lastUpdated).toLocaleString('ja-JP')}</p>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-800 dark:border-t-black"></div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default UsageInfoDisplay;