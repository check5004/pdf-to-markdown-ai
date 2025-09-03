import React, { useState } from 'react';
import { DownloadIcon, CheckIcon, ClipboardIcon, ChevronDownIcon } from './Icons';
import MarkdownPreview from './MarkdownPreview';

interface DiffPanelProps {
  diffMarkdown: string;
  onDownload: () => void;
  onCopy: () => void;
}

const DiffPanel: React.FC<DiffPanelProps> = ({ diffMarkdown, onDownload, onCopy }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="my-8 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 rounded-r-lg animate-fade-in shadow-md">
       <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
      `}</style>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500"
        aria-expanded={isOpen}
      >
        <h3 className="text-xl font-bold text-purple-800 dark:text-purple-200">
          前バージョンとの差分
        </h3>
        <ChevronDownIcon
          className={`h-6 w-6 transform transition-transform text-purple-600 dark:text-purple-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="p-6 pt-2">
            <div className="flex justify-end items-center mb-4 space-x-2">
                <button
                    onClick={handleCopy}
                    disabled={isCopied}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                        isCopied ? 'bg-green-600 focus:ring-green-500 cursor-default' : 'bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 focus:ring-gray-500'
                    }`}
                    title={isCopied ? "コピーしました！" : "差分をコピー"}
                    >
                    {isCopied ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{isCopied ? 'コピー完了' : 'コピー'}</span>
                </button>
                <button
                    onClick={onDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 transition-all"
                    title="差分をMarkdownとしてダウンロード"
                >
                    <DownloadIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">ダウンロード</span>
                </button>
            </div>
          <MarkdownPreview markdown={diffMarkdown} isLoading={false} progressMessage="" />
        </div>
      )}
    </div>
  );
};

export default DiffPanel;
