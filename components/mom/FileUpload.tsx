'use client';

import React, { useState, useRef, useCallback } from 'react';
import { FaCloudUploadAlt, FaFile, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaImage, FaTrash, FaDownload, FaTimes } from 'react-icons/fa';
import { FileMetadata, formatFileSize, MAX_FILE_SIZE, ALLOWED_FILE_TYPES, getFileIcon, getFileTypeLabel } from '@/types/mom/file';

interface FileUploadProps {
  files: FileMetadata[];
  onFilesChange: (files: FileMetadata[]) => void;
  maxFiles?: number;
}

export default function FileUpload({ files, onFilesChange, maxFiles = 10 }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIconComponent = (fileName: string, fileType: string) => {
    // Use emoji icon from utility
    const emoji = getFileIcon(fileName);
    
    // For some emojis, return React Icons instead for better styling
    if (fileType.startsWith('image/')) return <FaImage className="text-blue-500" />;
    if (fileType === 'application/pdf') return <FaFilePdf className="text-red-500" />;
    if (fileType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) return <FaFileWord className="text-blue-600" />;
    if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return <FaFileExcel className="text-green-600" />;
    if (fileType.includes('powerpoint') || fileType.includes('presentation') || fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return <FaFilePowerpoint className="text-orange-600" />;
    
    // For other files, show emoji or default icon
    if (emoji !== '📎') {
      return <span className="text-2xl">{emoji}</span>;
    }
    return <FaFile className="text-gray-500" />;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFiles = async (fileList: FileList) => {
    const newFiles = Array.from(fileList);
    
    // Check max files limit
    if (files.length + newFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setError(null);
    setUploading(true);

    for (const file of newFiles) {
      // Validate file type - check both MIME type and extension
      const allowedTypes = Object.keys(ALLOWED_FILE_TYPES);
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isAllowedByType = allowedTypes.includes(file.type);
      const isAllowedByExtension = Object.values(ALLOWED_FILE_TYPES).some(exts => 
        (exts as readonly string[]).includes(fileExtension)
      );
      
      // Allow if either MIME type or extension is recognized
      // This handles cases where MIME type might be application/octet-stream
      if (!isAllowedByType && !isAllowedByExtension) {
        // For now, we'll allow all files with a warning
        console.warn(`Unknown file type: ${file.name} (${file.type})`);
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large: ${file.name} (max ${MAX_FILE_SIZE / (1024 * 1024)}MB)`);
        continue;
      }

      try {
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);

        // Upload file
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.success && result.data) {
          onFilesChange([...files, result.data]);
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        } else {
          setError(result.error || 'Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        setError(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    // Clear progress after a delay
    setTimeout(() => setUploadProgress({}), 1000);
  };

  const handleDelete = async (file: FileMetadata) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: file.url }),
      });

      const result = await response.json();

      if (result.success) {
        onFilesChange(files.filter(f => f.url !== file.url));
      } else {
        setError(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete file');
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        
        <FaCloudUploadAlt className="mx-auto text-4xl text-gray-400 mb-3" />
        
        <p className="text-gray-600 mb-2">
          Drag and drop files here, or{' '}
          <button
            type="button"
            className="text-blue-600 hover:text-blue-700 font-medium"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            browse
          </button>
        </p>
        
        <p className="text-xs text-gray-500">
          Supports all file types (Max {MAX_FILE_SIZE / (1024 * 1024)}MB per file)
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <span>{error}</span>
          <button
            className="absolute top-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <FaTimes />
          </button>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-700">Uploaded Files ({files.length})</h4>
          {files.map((file, index) => (
            <div key={file.url} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {/* File Icon */}
              <div className="text-2xl flex items-center justify-center w-10 h-10">
                {getFileIconComponent(file.name, file.type)}
              </div>
              
              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {getFileTypeLabel(file.name)} • {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={file.url}
                  download={file.name}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  title="Download"
                >
                  <FaDownload />
                </a>
                <button
                  onClick={() => handleDelete(file)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </div>

              {/* Upload Progress */}
              {uploadProgress[file.name] !== undefined && uploadProgress[file.name] < 100 && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200 rounded-b-lg overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress[file.name]}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {uploading && (
        <div className="text-center text-gray-600">
          <div className="inline-flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
            Uploading files...
          </div>
        </div>
      )}
    </div>
  );
}