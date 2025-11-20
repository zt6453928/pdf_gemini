import React, { useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isProcessing }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type === 'application/pdf') {
      onFileSelect(files[0]);
    } else {
      alert('Please upload a valid PDF file.');
    }
  }, [onFileSelect, isProcessing]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isProcessing) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect, isProcessing]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`
        border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
        ${isProcessing ? 'opacity-50 cursor-not-allowed border-gray-300 bg-gray-50' : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50/50 bg-white'}
      `}
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileInput}
        className="hidden"
        id="pdf-upload"
        disabled={isProcessing}
      />
      <label htmlFor="pdf-upload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
          {isProcessing ? (
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          ) : (
            <Upload size={32} />
          )}
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          {isProcessing ? 'Processing PDF...' : 'Upload your PDF Document'}
        </h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Drag and drop your file here, or click to browse. We'll preserve the layout while translating to Chinese.
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
          <FileText size={12} />
          <span>Supports PDF files up to 10MB</span>
        </div>
      </label>
    </div>
  );
};