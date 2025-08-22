'use client';

import React, { useState } from 'react';

interface StatusBadgeProps {
  status: 'open' | 'closed' | '';
  onChange: (value: 'open' | 'closed' | '') => void;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const getStatusStyle = () => {
    switch(status) {
      case 'open':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'closed':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-300';
    }
  };
  
  const getStatusDisplay = () => {
    switch(status) {
      case 'open':
        return 'Open';
      case 'closed':
        return 'Closed';
      default:
        return '-';
    }
  };
  
  if (isEditing) {
    return (
      <select
        className="text-xs px-2 py-0.5 rounded-full border focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={status || ''}
        onChange={(e) => {
          onChange(e.target.value as 'open' | 'closed' | '');
          setIsEditing(false);
        }}
        onBlur={() => setIsEditing(false)}
        autoFocus
      >
        <option value="">-</option>
        <option value="open">Open</option>
        <option value="closed">Closed</option>
      </select>
    );
  }
  
  return (
    <span 
      className={`
        inline-block px-2 py-0.5 text-xs font-medium rounded-full 
        border cursor-pointer transition-all duration-150
        hover:shadow-md
        ${getStatusStyle()}
      `}
      onClick={() => setIsEditing(true)}
      title="Click to change status"
    >
      {getStatusDisplay()}
    </span>
  );
};

// Compact file indicator
export const FileIndicator: React.FC<{ 
  files?: any[]; 
  urls?: string[];
  onClick?: () => void;
}> = ({ files, urls, onClick }) => {
  const fileCount = files?.length || 0;
  const urlCount = urls?.length || 0;
  const total = fileCount + urlCount;
  
  if (total === 0) {
    return <span className="text-gray-300 text-xs">-</span>;
  }
  
  return (
    <button
      className="flex items-center justify-center gap-1 hover:bg-gray-100 rounded px-1 py-0.5"
      onClick={onClick}
      title="Click to view attachments"
    >
      {fileCount > 0 && (
        <span className="text-xs" title={`${fileCount} file(s)`}>
          📎{fileCount}
        </span>
      )}
      {urlCount > 0 && (
        <span className="text-xs" title={`${urlCount} URL(s)`}>
          🔗{urlCount}
        </span>
      )}
    </button>
  );
};