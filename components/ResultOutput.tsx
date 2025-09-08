
import React, { useState } from 'react';
import { AnalysisResult, ExchangeRateInfo } from '../types';
import { DocumentIcon, DownloadIcon, ClipboardIcon, CheckIcon } from './Icons';
import MarkdownPreview from './MarkdownPreview';
import UsageInfoDisplay from './UsageInfoDisplay';
import DebugInfo from './DebugInfo';

interface ResultOutputProps {
  result: AnalysisResult;
  index: number;
  onCopy: (markdown: string) => void;
  onDownload: (markdown: string) => void;
  exchangeRateInfo: ExchangeRateInfo | null;
}

const ResultOutput: React.FC<ResultOutputProps> = ({ result, index, onCopy, onDownload, exchangeRateInfo }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    onCopy(result.markdown);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
      <div className="flex justify-between items-center border-b pb-2 mb-4 border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <DocumentIcon className="h-6 w-6" />
          {index === 0 ? '解析結果' : `改良版 #${index}`}
        </h2>
        {result.markdown && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              disabled={isCopied}
              className={`flex items-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                isCopied ? 'bg-green-600 focus:ring-green-500 cursor-default' : 'bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 focus:ring-gray-500'
              }`}
              title={isCopied ? "コピーしました！" : "Markdownをコピー"}
            >
              {isCopied ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
              <span className="hidden sm:inline">{isCopied ? 'コピー完了' : 'コピー'}</span>
            </button>
            <button
              onClick={() => onDownload(result.markdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 transition-all"
              title="Markdownをダウンロード"
            >
              <DownloadIcon className="h-4 w-4" />
              <span className="hidden sm:inline">ダウンロード</span>
            </button>
          </div>
        )}
      </div>
      
      <MarkdownPreview markdown={result.markdown} isLoading={false} progressMessage="" />

      {result.usageInfo && (
        <div className="mt-6">
          <UsageInfoDisplay usage={result.usageInfo} exchangeRateInfo={exchangeRateInfo} />
        </div>
      )}

      {result.debugInfo && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <DebugInfo debugInfo={result.debugInfo} />
        </div>
      )}
    </div>
  );
};

export default ResultOutput;
