
import React, { useState, useCallback } from 'react';
import { DownloadIcon, UploadIcon, XMarkIcon, InformationCircleIcon, CheckCircleIcon, XCircleIcon } from './Icons';

interface SettingsImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
}

const SettingsImportExportModal: React.FC<SettingsImportExportModalProps> = ({ isOpen, onClose, onExport, onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleFileDrop = useCallback(async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFileImport(file);
    }
  }, [onImport]);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileImport(file);
    }
  };

  const handleFileImport = async (file: File) => {
    setImportStatus(null);
    if (!file.name.endsWith('.json')) {
      setImportStatus({ type: 'error', message: '無効なファイル形式です。JSONファイルを選択してください。' });
      return;
    }

    try {
      await onImport(file);
      setImportStatus({ type: 'success', message: '設定が正常にインポートされました。' });
    } catch (error: any) {
      console.error("Import failed:", error);
      setImportStatus({ type: 'error', message: `インポートに失敗しました: ${error.message}` });
    }
  };


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-export-dialog-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-2xl transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-4 border-b dark:border-gray-600">
            <h2 id="import-export-dialog-title" className="text-xl font-bold">設定のエクスポート / インポート</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="閉じる">
                <XMarkIcon className="h-6 w-6"/>
            </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Section */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DownloadIcon className="h-5 w-5"/>
              設定をエクスポート
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              現在のAI設定（プロンプト、Temperature、カスタムプリセット）をJSONファイルとして保存します。
            </p>
            <button
              onClick={onExport}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              エクスポート (.json)
            </button>
          </div>

          {/* Import Section */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UploadIcon className="h-5 w-5"/>
              設定をインポート
            </h3>
             <div className="flex items-start gap-2 p-2 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700">
                <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>注意:</strong> インポートすると、現在のAI設定とカスタムプリセットは上書きされます。
                </span>
            </div>
            <label
              htmlFor="import-file-input"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
              className={`relative flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <div className="flex flex-col items-center justify-center">
                <UploadIcon className="w-6 h-6 mb-1 text-gray-500 dark:text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">ファイルを選択</span> or D&D
                </p>
              </div>
              <input id="import-file-input" type="file" className="hidden" accept=".json" onChange={handleFileChange} />
            </label>
            {importStatus && (
              <div className={`flex items-center gap-2 text-sm p-2 rounded-md ${importStatus.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'}`}>
                {importStatus.type === 'success' ? <CheckCircleIcon className="h-5 w-5" /> : <XCircleIcon className="h-5 w-5" />}
                <span>{importStatus.message}</span>
              </div>
            )}
          </div>
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

export default SettingsImportExportModal;
