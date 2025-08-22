// File and upload related type definitions

export interface FileMetadata {
  url: string;
  pathname: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface FileUploadResponse {
  success: boolean;
  data?: FileMetadata;
  error?: string;
}

export interface FileDeleteResponse {
  success: boolean;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

// Allowed file types and their extensions
export const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tiff', '.tif'],
  
  // Videos
  'video/mp4': ['.mp4'],
  'video/mpeg': ['.mpeg', '.mpg'],
  'video/quicktime': ['.mov'],
  'video/x-ms-wmv': ['.wmv'],
  'video/x-msvideo': ['.avi'],
  'video/webm': ['.webm'],
  
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/rtf': ['.rtf'],
  
  // OpenDocument formats
  'application/vnd.oasis.opendocument.text': ['.odt'],
  'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
  'application/vnd.oasis.opendocument.presentation': ['.odp'],
  
  // Archives
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
  'application/x-tar': ['.tar'],
  'application/gzip': ['.gz'],
  
  // Other common formats
  'application/json': ['.json'],
  'application/xml': ['.xml'],
  'text/html': ['.html', '.htm'],
  'text/css': ['.css'],
  'text/javascript': ['.js'],
  'application/x-sh': ['.sh'],
  'application/octet-stream': ['.bin', '.dat'],
} as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export const isAllowedFileType = (type: string): boolean => {
  return Object.keys(ALLOWED_FILE_TYPES).includes(type);
};

export const getFileExtension = (filename: string): string => {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file icon based on file type or extension
export const getFileIcon = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const iconMap: Record<string, string> = {
    // Excel
    'xls': '📊',
    'xlsx': '📊',
    'csv': '📊',
    'ods': '📊',
    
    // Word
    'doc': '📄',
    'docx': '📄',
    'txt': '📝',
    'rtf': '📄',
    'odt': '📄',
    
    // PowerPoint
    'ppt': '🎯',
    'pptx': '🎯',
    'odp': '🎯',
    
    // PDF
    'pdf': '📑',
    
    // Images
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'png': '🖼️',
    'gif': '🖼️',
    'svg': '🖼️',
    'bmp': '🖼️',
    'webp': '🖼️',
    'tiff': '🖼️',
    'tif': '🖼️',
    
    // Videos
    'mp4': '🎬',
    'avi': '🎬',
    'mov': '🎬',
    'wmv': '🎬',
    'mpeg': '🎬',
    'mpg': '🎬',
    'webm': '🎬',
    
    // Archives
    'zip': '📦',
    'rar': '📦',
    '7z': '📦',
    'tar': '📦',
    'gz': '📦',
    
    // Code
    'json': '{ }',
    'xml': '< >',
    'html': '🌐',
    'htm': '🌐',
    'css': '🎨',
    'js': '⚡',
    'sh': '💻',
    
    // Default
    'default': '📎'
  };
  
  return iconMap[extension] || iconMap['default'];
};

// Get file type label for display
export const getFileTypeLabel = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const typeMap: Record<string, string> = {
    'xls': 'Excel',
    'xlsx': 'Excel',
    'csv': 'CSV',
    'ods': 'OpenDocument Spreadsheet',
    'doc': 'Word',
    'docx': 'Word',
    'odt': 'OpenDocument Text',
    'ppt': 'PowerPoint',
    'pptx': 'PowerPoint',
    'odp': 'OpenDocument Presentation',
    'pdf': 'PDF',
    'txt': 'Text',
    'rtf': 'Rich Text',
    'zip': 'ZIP Archive',
    'rar': 'RAR Archive',
    '7z': '7-Zip Archive',
    'tar': 'TAR Archive',
    'gz': 'GZIP Archive',
    'jpg': 'JPEG Image',
    'jpeg': 'JPEG Image',
    'png': 'PNG Image',
    'gif': 'GIF Image',
    'svg': 'SVG Image',
    'mp4': 'MP4 Video',
    'avi': 'AVI Video',
    'mov': 'QuickTime Video',
    'json': 'JSON',
    'xml': 'XML',
    'html': 'HTML',
    'css': 'CSS',
    'js': 'JavaScript',
  };
  
  return typeMap[extension] || extension.toUpperCase();
};

// Check if file can be previewed in browser
export const canPreviewFile = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const previewableExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp',
    'pdf',
    'txt', 'json', 'xml', 'html', 'css', 'js',
    'mp4', 'webm'
  ];
  return previewableExtensions.includes(extension);
};