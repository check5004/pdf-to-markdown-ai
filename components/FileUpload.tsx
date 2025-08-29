import React, { useState, useCallback } from 'react';
import { UploadIcon } from './Icons.tsx';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelect(file);
    } else {
      setFileName(null);
      onFileSelect(null);
    }
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      setFileName(file.name);
      onFileSelect(file);
    }
  }, [onFileSelect]);

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
            <span className="font-semibold">クリックしてアップロード</span>またはドラッグ&ドロップ
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">PDFファイルのみ</p>
        </div>
        <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
      </label>
      {fileName && (
        <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-300">
          選択中のファイル: <span className="font-medium">{fileName}</span>
        </p>
      )}
    </div>
  );
};

export default FileUpload;