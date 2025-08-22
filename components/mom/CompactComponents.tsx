'use client';

import React from 'react';

// Ultra-compact status badge
export const CompactStatusBadge: React.FC<{
  status: 'open' | 'closed' | '';
  onChange: (value: 'open' | 'closed' | '') => void;
}> = ({ status, onChange }) => {
  const getStatusColor = () => {
    return status === 'open' ? 'text-red-600 font-bold' : 
           status === 'closed' ? 'text-green-600' : 
           'text-gray-400';
  };
  
  const getStatusDisplay = () => {
    return status === 'open' ? 'O' : 
           status === 'closed' ? 'C' : 
           '-';
  };
  
  return (
    <select
      className={`text-xs bg-transparent border-0 cursor-pointer focus:outline-none ${getStatusColor()}`}
      value={status || ''}
      onChange={(e) => onChange(e.target.value as 'open' | 'closed' | '')}
      title={status === 'open' ? 'Open' : status === 'closed' ? 'Closed' : 'No status'}
    >
      <option value="">-</option>
      <option value="open">O</option>
      <option value="closed">C</option>
    </select>
  );
};

// Compact file/action indicator
export const CompactActions: React.FC<{
  files?: any[];
  urls?: string[];
  onFiles?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}> = ({ files = [], urls = [], onFiles, onDuplicate, onDelete }) => {
  const fileCount = files.length;
  const urlCount = urls.length;
  const total = fileCount + urlCount;
  
  return (
    <div className="flex items-center justify-center gap-0.5">
      {total > 0 && onFiles && (
        <button
          className="text-xs hover:bg-gray-100 rounded px-0.5"
          onClick={onFiles}
          title={`${fileCount} files, ${urlCount} URLs`}
        >
          {total}
        </button>
      )}
      {onDuplicate && (
        <button
          className="text-xs hover:bg-gray-100 rounded px-0.5"
          onClick={onDuplicate}
          title="Duplicate"
        >
          ⊕
        </button>
      )}
      {onDelete && (
        <button
          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded px-0.5"
          onClick={onDelete}
          title="Delete"
        >
          ×
        </button>
      )}
    </div>
  );
};

// Compact responsible display
export const CompactResponsible: React.FC<{
  responsible: any[];
  onClick?: () => void;
}> = ({ responsible, onClick }) => {
  if (!responsible || responsible.length === 0) {
    return (
      <button
        className="text-xs text-gray-400 hover:bg-gray-100 rounded px-1"
        onClick={onClick}
        title="Click to add"
      >
        -
      </button>
    );
  }
  
  // Show initials or count
  const display = responsible.length === 1 
    ? responsible[0].name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : `${responsible.length}`;
    
  return (
    <button
      className="text-xs font-medium hover:bg-gray-100 rounded px-1"
      onClick={onClick}
      title={responsible.map(r => r.name).join(', ')}
    >
      {display}
    </button>
  );
};

// Compact date display
export const CompactDate: React.FC<{
  date: string;
  onChange: (value: string) => void;
}> = ({ date, onChange }) => {
  // Format date to MM/DD
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  };
  
  return (
    <input
      type="date"
      className="w-full text-center text-xs border-0 bg-transparent 
               hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-400 
               rounded cursor-pointer"
      value={date || ''}
      onChange={(e) => onChange(e.target.value)}
      title={date || 'No date'}
      style={{ colorScheme: 'dark' }} // Hide calendar icon
    />
  );
};