'use client';

import React, { useState, useEffect } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { MatrixRow, Attachment, ResponsibleParty } from '@/types/mom';
import { structureToMatrix } from '@/lib/mom/matrix-conversion-fixed';
import AttachmentButtons from './AttachmentButtons';
import RevisionLegend from './RevisionLegend';
import ViewModeToggle from './ViewModeToggle';
import MatrixResponsibleSelector from './MatrixResponsibleSelector';
import HierarchicalNumber from './HierarchicalNumber';
import MultilingualCell from './MultilingualCell';

export default function MatrixView() {
  const { state, dispatch } = useMOM();
  const { currentMOM } = state;
  const [matrixData, setMatrixData] = useState<MatrixRow[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAttachments, setShowAttachments] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; field: string } | null>(null);
  const [showResponsibleSelector, setShowResponsibleSelector] = useState<{ rowId: string; x: number; y: number } | null>(null);

  // Convert structure to matrix on mount and when structure changes
  useEffect(() => {
    if (currentMOM?.structure) {
      const matrix = structureToMatrix(currentMOM.structure);
      setMatrixData(matrix);
    }
  }, [currentMOM?.structure]);

  // No longer need syncToStructure - all updates go through dispatch

  const handleCellEdit = (rowId: string, field: string, value: string) => {
    const row = matrixData.find(r => r.id === rowId);
    if (!row) return;

    let updates: any = {};

    // Update the appropriate field based on the column
    switch (field) {
      case 'content':
      case 'mainTitle':
      case 'subTitle':
      case 'subSubTitle':
      case 'action':
        // Update title and translations (use English as primary)
        updates.title = value;
        updates.translations = {
          en: value,
          ja: row.translations?.ja || '',
          th: row.translations?.th || ''
        };
        break;
      case 'responsible':
        // Handle responsible parties through the selector
        break;
      case 'dueDate':
        updates.dueDate = value;
        break;
      case 'status':
        updates.status = value as 'open' | 'closed';
        break;
    }

    // Use the same dispatch as normal mode
    dispatch({
      type: 'UPDATE_STRUCTURE_ITEM',
      id: row.structureItemId,
      updates: {
        ...updates,
        lastModifiedRevision: currentMOM?.revision
      },
    });
  };

  const startEdit = (rowId: string, field: string, currentValue: string) => {
    setEditingCell({ rowId, field });
    setEditValue(currentValue);
  };

  const commitEdit = () => {
    if (editingCell) {
      handleCellEdit(editingCell.rowId, editingCell.field, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleAddRow = (afterRowId: string | null, level: 1 | 2 | 3 | 4) => {
    // Instead of using matrix-specific logic, use the same logic as normal mode
    if (!currentMOM) return;
    
    const newItem: any = {
      id: `item-${Date.now()}-${Math.random()}`,
      level,
      number: '', // Will be calculated by renumberStructure
      hierarchicalNumber: '', // Will be calculated by renumberStructure
      title: '',
      translations: { en: '', ja: '', th: '' },
      children: [],
      originalRevision: currentMOM.revision,
      lastModifiedRevision: currentMOM.revision,
      ...(level === 4 ? { 
        actionId: `ACT-${Date.now()}`,
        status: 'open' as const, 
        responsibleParties: [], 
        urls: [], 
        attachments: [] 
      } : {}),
    };
    
    // Find parent ID based on afterRowId and level
    let parentId: string | null = null;
    if (afterRowId) {
      const afterRow = matrixData.find(r => r.id === afterRowId);
      if (afterRow) {
        // If adding a direct child (level = afterRow.level + 1), use afterRow as parent
        if (level > afterRow.level) {
          parentId = afterRow.structureItemId;
        } else {
          // If adding at same level, find the parent
          const parentRow = matrixData.find(r => r.structureItemId === afterRow.parentId);
          parentId = parentRow?.structureItemId || null;
        }
      }
    }
    
    // Use the same dispatch as normal mode
    dispatch({ type: 'ADD_STRUCTURE_ITEM', parentId, item: newItem });
  };

  const handleRemoveRow = (rowId: string) => {
    if (confirm('Are you sure you want to remove this item and all its children?')) {
      const row = matrixData.find(r => r.id === rowId);
      if (row) {
        // Use the same dispatch as normal mode
        dispatch({ type: 'REMOVE_STRUCTURE_ITEM', id: row.structureItemId });
      }
    }
  };

  const getContentValue = (row: MatrixRow): string => {
    if (row.level === 1) return row.mainTitle;
    if (row.level === 2) return row.subTitle;
    if (row.level === 3) return row.subSubTitle;
    if (row.level === 4) return row.action;
    return '';
  };

  const handleKeyboardNavigation = (e: React.KeyboardEvent, rowId: string, field: string) => {
    const currentRowIndex = matrixData.findIndex(r => r.id === rowId);
    const fields = ['content', 'responsible', 'dueDate', 'status'];
    const currentFieldIndex = fields.indexOf(field);
    let newRowIndex = currentRowIndex;
    let newFieldIndex = currentFieldIndex;

    switch (e.key) {
      case 'ArrowUp':
        newRowIndex = Math.max(0, currentRowIndex - 1);
        break;
      case 'ArrowDown':
        newRowIndex = Math.min(matrixData.length - 1, currentRowIndex + 1);
        break;
      case 'ArrowLeft':
        newFieldIndex = Math.max(0, currentFieldIndex - 1);
        break;
      case 'ArrowRight':
        newFieldIndex = Math.min(fields.length - 1, currentFieldIndex + 1);
        break;
      case 'Enter':
        e.preventDefault();
        const newRow = matrixData[newRowIndex];
        const newField = fields[newFieldIndex];
        const value = getFieldValue(newRow, newField);
        startEdit(newRow.id, newField, value);
        return;
      case 'Escape':
        setSelectedCell(null);
        return;
      default:
        return;
    }

    e.preventDefault();
    const newRow = matrixData[newRowIndex];
    const newField = fields[newFieldIndex];
    setSelectedCell({ rowId: newRow.id, field: newField });
  };

  const getFieldValue = (row: MatrixRow, field: string): string => {
    switch (field) {
      case 'content':
        return getContentValue(row);
      case 'responsible':
        return row.responsible.map(r => r.name).join(', ');
      case 'dueDate':
        return row.dueDate;
      case 'status':
        return row.status;
      default:
        return '';
    }
  };

  const renderCell = (row: MatrixRow, field: string) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;
    const isSelected = selectedCell?.rowId === row.id && selectedCell?.field === field;
    
    // For content fields (titles and actions), show inline
    if (field === 'mainTitle' || field === 'subTitle' || field === 'subSubTitle' || field === 'action') {
      // Check if this cell should be editable based on row level
      const isEditableCell = 
        (field === 'mainTitle' && row.level === 1) ||
        (field === 'subTitle' && row.level === 2) ||
        (field === 'subSubTitle' && row.level === 3) ||
        (field === 'action' && row.level === 4);
      
      // Get the content to display
      const content = isEditableCell ? getContentValue(row) : '';
      const translations = row.translations || { en: '', ja: '', th: '' };
      
      if (isEditing) {
        return (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            className="w-full px-2 py-1 border rounded"
            autoFocus
          />
        );
      }
      
      return (
        <div
          className={`px-2 py-1 cursor-pointer hover:bg-gray-50 ${
            isSelected ? 'ring-2 ring-blue-500' : ''
          } ${!isEditableCell ? 'text-gray-400' : ''}`}
          onClick={() => {
            if (isEditableCell) {
              setSelectedCell({ rowId: row.id, field });
              startEdit(row.id, field, content);
            }
          }}
          onKeyDown={(e) => handleKeyboardNavigation(e, row.id, field)}
          tabIndex={isEditableCell ? 0 : -1}
        >
          {isEditableCell ? (
            <div className="text-xs">
              {translations.en || translations.ja || translations.th ? (
                <>
                  <span className="font-semibold">EN:</span> {translations.en || '-'} 
                  <span className="mx-1">|</span>
                  <span className="font-semibold">JA:</span> {translations.ja || '-'}
                  <span className="mx-1">|</span>
                  <span className="font-semibold">TH:</span> {translations.th || '-'}
                </>
              ) : (
                <span className="text-gray-400 italic">Click to edit</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      );
    }
    
    if (isEditing) {
      if (field === 'status' && row.level === 4) {
        return (
          <select
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              handleCellEdit(row.id, field, e.target.value);
              setEditingCell(null);
            }}
            onBlur={cancelEdit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancelEdit();
            }}
            className="w-full px-2 py-1 border rounded"
            autoFocus
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        );
      }
      
      return (
        <input
          type={field === 'dueDate' ? 'date' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') cancelEdit();
          }}
          className="w-full px-2 py-1 border rounded"
          autoFocus
        />
      );
    }

    let content = '';
    let className = '';

    switch (field) {
      case 'rowNumber':
        // Use HierarchicalNumber component for proper gap styling
        return (
          <div
            className={`px-2 py-1 ${
              isSelected ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <HierarchicalNumber number={row.rowNumber} className="text-gray-600" />
          </div>
        );
      case 'responsible':
        content = row.responsible.map(r => r.name).join(', ');
        break;
      case 'dueDate':
        content = row.dueDate;
        break;
      case 'status':
        content = row.status;
        className = row.status === 'open' ? 'font-bold text-red-600' : 'text-green-600';
        break;
    }

    return (
      <div
        className={`px-2 py-1 cursor-pointer hover:bg-gray-50 ${className} ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={(e) => {
          if (field !== 'rowNumber') {
            setSelectedCell({ rowId: row.id, field });
            if (field === 'responsible' && row.level === 4) {
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              setShowResponsibleSelector({ 
                rowId: row.id, 
                x: rect.left, 
                y: rect.bottom 
              });
            } else if (field !== 'status' || row.level === 4) {
              startEdit(row.id, field, content);
            }
          }
        }}
        onKeyDown={(e) => handleKeyboardNavigation(e, row.id, field)}
        tabIndex={field !== 'rowNumber' ? 0 : -1}
      >
        {content || <span className="text-gray-400">-</span>}
      </div>
    );
  };

  if (!currentMOM) return null;

  return (
    <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="mb-0">Agenda Structure - Matrix View</h2>
        <ViewModeToggle />
      </div>

      {currentMOM.revision > 0 && (
        <RevisionLegend
          currentRevision={currentMOM.revision}
          baseRevision={currentMOM.baseRevision}
        />
      )}

      <div className="mb-4 flex gap-2">
        <button
          className="btn btn-primary flex items-center gap-1"
          onClick={() => {
            // Add Main Title at the end
            const lastMainTitle = [...matrixData].reverse().find(r => r.level === 1);
            handleAddRow(lastMainTitle?.id || null, 1);
          }}
        >
          <span className="font-mono">+</span> Add Main
        </button>
      </div>

      <div className="matrix-table-container">
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          {matrixData.length === 0 ? (
            <div className="text-center text-gray-500 italic py-12">
              No agenda items yet. Click &quot;Add Main Title&quot; to start.
            </div>
          ) : (
          <table className="matrix-table">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No.</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Main Title</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sub Title</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sub Sub Title</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Responsible</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Due Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Files</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {matrixData.map((row, index) => (
              <React.Fragment key={row.id}>
                <tr className={`border-b hover:bg-gray-50 ${row.level === 1 ? 'bg-blue-50' : row.level === 2 ? 'bg-green-50' : row.level === 3 ? 'bg-yellow-50' : row.level === 4 ? 'bg-purple-50' : ''}`}>
                  <td className="px-4 py-2">{renderCell(row, 'rowNumber')}</td>
                  {/* Main Title Column */}
                  <td className="px-4 py-2">
                    {renderCell(row, 'mainTitle')}
                  </td>
                  {/* Sub Title Column */}
                  <td className="px-4 py-2">
                    {renderCell(row, 'subTitle')}
                  </td>
                  {/* Sub Sub Title Column */}
                  <td className="px-4 py-2">
                    {renderCell(row, 'subSubTitle')}
                  </td>
                  {/* Action Column */}
                  <td className="px-4 py-2">
                    {renderCell(row, 'action')}
                  </td>
                  <td className="px-4 py-2">
                    {row.level === 4 ? renderCell(row, 'responsible') : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-2">
                    {row.level === 4 ? renderCell(row, 'dueDate') : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-2">
                    {row.level === 4 ? renderCell(row, 'status') : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => setShowAttachments(showAttachments === row.id ? null : row.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {(row.urls.length + row.attachments.length) || 0} files
                    </button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center gap-1 items-center">
                      {/* Main Title row - can add Sub Title */}
                      {row.level === 1 && (
                        <>
                          <button
                            onClick={() => handleAddRow(row.id, 2)}
                            className="text-green-600 hover:text-green-800 px-2 py-1 border border-green-300 rounded text-xs font-medium flex items-center gap-1"
                            title="Add Sub Title"
                          >
                            <span className="font-mono">++</span> Add Sub
                          </button>
                          <button
                            onClick={() => handleAddRow(row.id, 4)}
                            className="text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-300 rounded text-xs font-medium flex items-center gap-1"
                            title="Add Action"
                          >
                            <span className="font-mono">++++</span> Add Action
                          </button>
                        </>
                      )}
                      {/* Sub Title row - can add Sub Sub Title */}
                      {row.level === 2 && (
                        <>
                          <button
                            onClick={() => handleAddRow(row.id, 3)}
                            className="text-green-600 hover:text-green-800 px-2 py-1 border border-green-300 rounded text-xs font-medium flex items-center gap-1"
                            title="Add Sub Sub Title"
                          >
                            <span className="font-mono">+++</span> Add Sub Sub
                          </button>
                          <button
                            onClick={() => handleAddRow(row.id, 4)}
                            className="text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-300 rounded text-xs font-medium flex items-center gap-1"
                            title="Add Action"
                          >
                            <span className="font-mono">++++</span> Add Action
                          </button>
                        </>
                      )}
                      {/* Sub Sub Title row - can only add Action */}
                      {row.level === 3 && (
                        <button
                          onClick={() => handleAddRow(row.id, 4)}
                          className="text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-300 rounded text-xs font-medium flex items-center gap-1"
                          title="Add Action"
                        >
                          <span className="font-mono">++++</span> Add Action
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveRow(row.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                {showAttachments === row.id && (
                  <tr>
                    <td colSpan={10} className="px-4 py-3 bg-gray-50">
                      <AttachmentButtons
                        urls={row.urls}
                        attachments={row.attachments}
                        onUpdate={(updates) => {
                          dispatch({
                            type: 'UPDATE_STRUCTURE_ITEM',
                            id: row.structureItemId,
                            updates
                          });
                        }}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {/* Add Main Title button at bottom */}
            {matrixData.length > 0 && (
              <tr className="border-t-2 border-gray-300">
                <td colSpan={10} className="px-4 py-4 bg-gray-50">
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const lastMainTitle = [...matrixData].reverse().find(r => r.level === 1);
                      handleAddRow(lastMainTitle?.id || null, 1);
                    }}
                  >
                    <span className="font-mono">+</span> Add Main
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )}
        </div>
      </div>
      
      {/* Responsible Party Selector */}
      {showResponsibleSelector && (
        <div 
          style={{ 
            position: 'fixed', 
            left: showResponsibleSelector.x, 
            top: showResponsibleSelector.y 
          }}
        >
          <MatrixResponsibleSelector
            value={matrixData.find(r => r.id === showResponsibleSelector.rowId)?.responsible || []}
            onChange={(responsible) => {
              const row = matrixData.find(r => r.id === showResponsibleSelector.rowId);
              if (row) {
                dispatch({
                  type: 'UPDATE_STRUCTURE_ITEM',
                  id: row.structureItemId,
                  updates: { responsibleParties: responsible }
                });
              }
            }}
            onClose={() => setShowResponsibleSelector(null)}
          />
        </div>
      )}
    </section>
  );
}