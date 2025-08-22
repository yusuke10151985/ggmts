'use client';

import React, { useState } from 'react';
import { FaLink, FaPlus, FaTimes } from 'react-icons/fa';
import { Attachment } from '@/types/mom';
import ImageEditor from './ImageEditor';
import PDFAnnotation from './PDFAnnotation';
import { useMOM } from '@/contexts/mom/MOMContext';

interface AttachmentButtonsProps {
  urls?: string[];
  attachments?: Attachment[];
  onUpdate: (updates: { urls?: string[]; attachments?: Attachment[] }) => void;
  showUrlButton?: boolean;
  showFileButton?: boolean;
}

export default function AttachmentButtons({ 
  urls = [], 
  attachments = [], 
  onUpdate, 
  showUrlButton = true, 
  showFileButton = true 
}: AttachmentButtonsProps) {
  const [showAnnotation, setShowAnnotation] = useState<string | null>(null);
  const { state, dispatch } = useMOM();
  const { uploading } = state;

  const addURL = () => {
    onUpdate({ urls: [...urls, ''] });
  };

  const updateURL = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    onUpdate({ urls: newUrls });
  };

  const removeURL = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    onUpdate({ urls: newUrls });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    dispatch({ type: 'SET_UPLOADING', payload: true });

    try {
      // Create FormData for Vercel Blob upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload to Vercel Blob
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        let fileType: 'image' | 'video' | 'pdf' | 'file' = 'file';
        if (file.type.startsWith('image/')) {
          fileType = 'image';
        } else if (file.type.startsWith('video/')) {
          fileType = 'video';
        } else if (file.type === 'application/pdf') {
          fileType = 'pdf';
        }
        
        const attachment: Attachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: fileType,
          data: result.data.url,
          blobUrl: result.data.url,
          fileName: result.data.name,
          fileSize: result.data.size,
          mimeType: file.type,
        };
        
        // Check for duplicates before adding
        const isDuplicate = attachments.some(att => 
          att.blobUrl === attachment.blobUrl || 
          (att.fileName === attachment.fileName && att.fileSize === attachment.fileSize)
        );
        
        if (!isDuplicate) {
          onUpdate({ attachments: [...attachments, attachment] });
        } else {
          alert('This file has already been added.');
        }
      } else {
        alert(result.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false });
    }
    
    // Reset the input
    e.target.value = '';
  };

  const removeAttachment = (attachmentId: string) => {
    const newAttachments = attachments.filter(att => att.id !== attachmentId);
    onUpdate({ attachments: newAttachments });
  };

  const saveAnnotation = (attachmentId: string, annotatedData: string) => {
    const newAttachments = attachments.map(att =>
      att.id === attachmentId 
        ? { 
            ...att, 
            annotations: annotatedData,
            // Update blobUrl to use the annotated version
            blobUrl: annotatedData,
            // Keep original data as backup
            originalData: att.data || att.blobUrl
          } 
        : att
    );
    onUpdate({ attachments: newAttachments });
    setShowAnnotation(null);
  };

  return (
    <div className="space-y-4">
      {/* URL Management */}
      {(showUrlButton || showFileButton) && (
        <div className="flex items-center gap-2 mb-2">
          {showUrlButton && (
            <button
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={addURL}
              disabled={uploading}
            >
              <FaLink className="w-3 h-3" />
              Add URL
            </button>
          )}
          
          {/* File Upload */}
          {showFileButton && (
            <label className={`flex items-center gap-2 px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              <FaPlus className="w-3 h-3" />
              {uploading ? 'Uploading...' : 'Add File'}
              <input
                type="file"
                className="hidden"
                accept="image/*,video/*,application/pdf"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      )}

      {/* URLs Display */}
      {urls.length > 0 && (
        <div className="space-y-2">
          <strong className="block text-sm">URLs:</strong>
          {urls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md"
                placeholder="Enter URL"
                value={url}
                onChange={(e) => updateURL(index, e.target.value)}
              />
              <button
                className="text-red-500 hover:text-red-700"
                onClick={() => removeURL(index)}
              >
                <FaTimes />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Attachments Display */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <strong className="block text-sm">Attachments ({attachments.length}):</strong>
          <div className="flex flex-wrap gap-3">
            {attachments.map(attachment => (
              <div key={attachment.id} className="relative w-32 h-24 border rounded overflow-hidden group">
                {attachment.type === 'image' ? (
                  <img
                    src={attachment.annotations || attachment.blobUrl || attachment.driveUrl || attachment.data}
                    alt="Attachment"
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setShowAnnotation(attachment.id)}
                  />
                ) : attachment.type === 'pdf' ? (
                  <div 
                    className="w-full h-full flex items-center justify-center bg-gray-100 cursor-pointer"
                    onClick={() => setShowAnnotation(attachment.id)}
                  >
                    <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 2H4z" />
                    </svg>
                    <span className="absolute bottom-1 left-1 text-xs bg-black bg-opacity-50 text-white px-1 rounded">
                      PDF
                    </span>
                  </div>
                ) : attachment.type === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <svg className="w-12 h-12 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    <span className="absolute bottom-1 left-1 text-xs bg-black bg-opacity-50 text-white px-1 rounded">
                      Video
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <svg className="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H4v10h12V5h-2a1 1 0 100-2 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
                    </svg>
                    <span className="absolute bottom-1 left-1 text-xs bg-black bg-opacity-50 text-white px-1 rounded">
                      File
                    </span>
                  </div>
                )}
                
                {/* Remove button */}
                <button
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeAttachment(attachment.id)}
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annotation Modals */}
      {showAnnotation && attachments.find(att => att.id === showAnnotation) && (() => {
        const attachment = attachments.find(att => att.id === showAnnotation)!;
        if (attachment.type === 'image') {
          return (
            <ImageEditor
              imageUrl={attachment.blobUrl || attachment.driveUrl || attachment.data}
              onSave={(annotated) => saveAnnotation(attachment.id, annotated)}
              onCancel={() => setShowAnnotation(null)}
            />
          );
        } else if (attachment.type === 'pdf') {
          return (
            <PDFAnnotation
              pdfData={attachment.blobUrl || attachment.driveUrl || attachment.data}
              onSave={(annotated) => saveAnnotation(attachment.id, annotated)}
              onClose={() => setShowAnnotation(null)}
            />
          );
        }
        return null;
      })()}
    </div>
  );
}