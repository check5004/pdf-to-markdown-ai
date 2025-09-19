import React, { useCallback } from 'react';
import { UploadIcon, XMarkIcon } from './Icons';

interface FileUploadProps {
  files: File[];
  onFilesAdd: (newFiles: File[]) => void;
  onFileRemove: (fileToRemove: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ files, onFilesAdd, onFileRemove }) => {
  
  const handleSelectedFiles = (selectedFiles: FileList | null) => {
    const fileArray = selectedFiles ? Array.from(selectedFiles) : [];
    const pdfFiles = fileArray.filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length > 0) {
      onFilesAdd(pdfFiles);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleSelectedFiles(event.target.files);
    // Reset the input value to allow selecting the same file again after removing it
    event.target.value = '';
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    handleSelectedFiles(event.dataTransfer.files);
  }, [onFilesAdd]);

  return (
    <div className="w-full">
      <label
        htmlFor="file-upload"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-600 transition-colors"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon className="w-8 h-8 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold">クリックしてファイルを追加</span>またはドラッグ&ドロップ
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">PDFファイル (複数選択可)</p>
        </div>
        <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileChange} multiple />
      </label>
      {files.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          <p className="font-semibold">選択中のファイル ({files.length}件):</p>
          <ul className="mt-2 max-h-40 overflow-y-auto space-y-2 pr-2">
            {files.map((file) => (
              <li key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md animate-fade-in-fast">
                <span className="truncate text-xs font-medium flex-1 mr-2" title={file.name}>{file.name}</span>
                <button
                  type="button"
                  onClick={() => onFileRemove(file)}
                  className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                  aria-label={`Remove ${file.name}`}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
           <style>{`
            @keyframes fadeInFast {
              from { opacity: 0; transform: translateY(-5px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-fast {
              animation: fadeInFast 0.2s ease-out forwards;
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default FileUpload;