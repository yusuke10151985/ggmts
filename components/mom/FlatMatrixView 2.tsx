'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { FlatMatrixRow, structureToFlatMatrix, flatMatrixToStructure } from '@/lib/mom/matrix-flat-conversion';
import { ResponsibleParty } from '@/types/mom';
import AttachmentButtons from './AttachmentButtons';
import RevisionLegend from './RevisionLegend';
import ViewModeToggle from './ViewModeToggle';
import MatrixResponsibleSelector from './MatrixResponsibleSelector';
import { translateText } from '@/services/mom/api';

export default function FlatMatrixView() {
  const { state, dispatch } = useMOM();
  const { currentMOM } = state;
  const [rows, setRows] = useState<FlatMatrixRow[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAttachments, setShowAttachments] = useState<string | null>(null);
  const [showResponsibleSelector, setShowResponsibleSelector] = useState<{ rowId: string; x: number; y: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Convert structure to flat matrix only on initial mount or when MOM changes
  useEffect(() => {
    if (currentMOM?.structure && !isInitialized) {
      const flatRows = structureToFlatMatrix(currentMOM.structure);
      setRows(flatRows);
      setIsInitialized(true);
    }
  }, [currentMOM?.structure, isInitialized]);
  
  // Reset initialization when MOM changes
  useEffect(() => {
    setIsInitialized(false);
  }, [currentMOM?.momId]);

  const handleCellEdit = async (rowId: string, field: string, value: any) => {
    // Update the row locally first
    const updatedRows = rows.map(row => {
      if (row.id === rowId) {
        return { ...row, [field]: value };
      }
      return row;
    });
    
    // Handle translations for text fields
    if (['mainTitle', 'subTitle', 'subSubTitle', 'action'].includes(field) && typeof value === 'string' && value.trim()) {
      const response = await translateText(value, 'auto');
      if (response.success && response.data) {
        // Update translations in the row
        const translationField = field.replace('Title', 'Translations').replace('action', 'actionTranslations');
        const finalRows = updatedRows.map(row => {
          if (row.id === rowId) {
            return { ...row, [translationField]: response.data };
          }
          return row;
        });
        
        // Update local state
        setRows(finalRows);
        
        // Update structure with translations
        const structureWithTranslations = flatMatrixToStructure(finalRows);
        dispatch({
          type: 'UPDATE_MOM_FIELD',
          field: 'structure',
          value: structureWithTranslations
        });
      } else {
        // No translation, just update
        setRows(updatedRows);
        
        // Convert back to hierarchical structure and update
        const newStructure = flatMatrixToStructure(updatedRows);
        dispatch({
          type: 'UPDATE_MOM_FIELD',
          field: 'structure',
          value: newStructure
        });
      }
    } else {
      // Non-text field update
      setRows(updatedRows);
      
      // Convert back to hierarchical structure and update
      const newStructure = flatMatrixToStructure(updatedRows);
      dispatch({
        type: 'UPDATE_MOM_FIELD',
        field: 'structure',
        value: newStructure
      });
    }
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

  const addNewRow = () => {
    const newRow: FlatMatrixRow = {
      id: `row-${Date.now()}-${Math.random()}`,
      hierarchicalNumber: '', // Will be assigned when saved
      mainTitle: '',
      subTitle: '',
      subSubTitle: '',
      action: '',
      responsible: [],
      dueDate: '',
      status: '',
      urls: [],
      attachments: [],
      structureItemIds: {}
    };
    
    const newRows = [...rows, newRow];
    setRows(newRows);
    
    // Update structure
    const newStructure = flatMatrixToStructure(newRows);
    dispatch({
      type: 'UPDATE_MOM_FIELD',
      field: 'structure',
      value: newStructure
    });
  };

  const duplicateRow = (rowId: string) => {
    const rowToDuplicate = rows.find(r => r.id === rowId);
    if (!rowToDuplicate) return;

    const newRow: FlatMatrixRow = {
      ...rowToDuplicate,
      id: `row-${Date.now()}-${Math.random()}`,
      structureItemIds: {} // New items will be created
    };
    
    const rowIndex = rows.findIndex(r => r.id === rowId);
    const newRows = [...rows];
    newRows.splice(rowIndex + 1, 0, newRow);
    setRows(newRows);
    
    // Update structure
    const newStructure = flatMatrixToStructure(newRows);
    dispatch({
      type: 'UPDATE_MOM_FIELD',
      field: 'structure',
      value: newStructure
    });
  };

  const removeRow = (rowId: string) => {
    if (!confirm('Are you sure you want to remove this row?')) return;
    
    const updatedRows = rows.filter(row => row.id !== rowId);
    setRows(updatedRows);
    
    // Update structure
    const newStructure = flatMatrixToStructure(updatedRows);
    dispatch({
      type: 'UPDATE_MOM_FIELD',
      field: 'structure',
      value: newStructure
    });
  };

  const handleKeyboardNavigation = (e: React.KeyboardEvent, rowId: string, field: string) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const fields = ['mainTitle', 'subTitle', 'subSubTitle', 'action', 'responsible', 'dueDate', 'status'];
      const currentFieldIndex = fields.indexOf(field);
      const currentRowIndex = rows.findIndex(r => r.id === rowId);
      
      if (e.shiftKey) {
        // Previous field
        if (currentFieldIndex > 0) {
          const prevField = fields[currentFieldIndex - 1];
          const cellId = `cell-${rowId}-${prevField}`;
          document.getElementById(cellId)?.click();
        } else if (currentRowIndex > 0) {
          // Go to last field of previous row
          const prevRow = rows[currentRowIndex - 1];
          const cellId = `cell-${prevRow.id}-status`;
          document.getElementById(cellId)?.click();
        }
      } else {
        // Next field
        if (currentFieldIndex < fields.length - 1) {
          const nextField = fields[currentFieldIndex + 1];
          const cellId = `cell-${rowId}-${nextField}`;
          document.getElementById(cellId)?.click();
        } else if (currentRowIndex < rows.length - 1) {
          // Go to first field of next row
          const nextRow = rows[currentRowIndex + 1];
          const cellId = `cell-${nextRow.id}-mainTitle`;
          document.getElementById(cellId)?.click();
        }
      }
    }
  };

  const renderEditableCell = (row: FlatMatrixRow, field: string, value: string, placeholder: string = '') => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;
    const cellId = `cell-${row.id}-${field}`;
    
    if (isEditing) {
      if (field === 'status') {
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
              if (e.key === 'Tab') handleKeyboardNavigation(e, row.id, field);
            }}
            className="w-full px-2 py-1 border rounded focus:border-blue-500 focus:outline-none"
            autoFocus
          >
            <option value="">-</option>
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
            if (e.key === 'Tab') handleKeyboardNavigation(e, row.id, field);
          }}
          className="w-full px-2 py-1 border rounded focus:border-blue-500 focus:outline-none"
          placeholder={placeholder}
          autoFocus
        />
      );
    }

    // Special handling for action field styling
    const isAction = field === 'action' && value;
    const className = isAction ? 'text-blue-700 font-bold' : '';
    
    // Special handling for status
    const isStatus = field === 'status';
    const statusClass = value === 'open' ? 'text-red-600 font-bold' : 
                       value === 'closed' ? 'text-green-600' : '';

    return (
      <div
        id={cellId}
        className={`px-2 py-1 min-h-[2rem] cursor-text hover:bg-gray-50 rounded ${className} ${statusClass}`}
        onClick={() => {
          if (field === 'responsible') {
            const rect = (document.getElementById(cellId) as HTMLElement)?.getBoundingClientRect();
            if (rect) {
              setShowResponsibleSelector({ 
                rowId: row.id, 
                x: rect.left, 
                y: rect.bottom 
              });
            }
          } else {
            startEdit(row.id, field, value);
          }
        }}
        tabIndex={0}
        onKeyDown={(e) => handleKeyboardNavigation(e, row.id, field)}
      >
        {value || <span className="text-gray-400">{placeholder}</span>}
      </div>
    );
  };

  if (!currentMOM) return null;

  return (
    <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="mb-0">Agenda Structure - Matrix View (Flat)</h2>
        <ViewModeToggle />
      </div>

      {currentMOM.revision > 0 && (
        <RevisionLegend
          currentRevision={currentMOM.revision}
          baseRevision={currentMOM.baseRevision}
        />
      )}

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        {rows.length === 0 ? (
          <div className="text-center text-gray-500 italic py-12">
            No agenda items yet. Click &quot;Add New Row&quot; to start.
          </div>
        ) : (
          <table ref={tableRef} className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-48">Main Title</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-48">Sub Title</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-48">Sub Sub Title</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-48">Action</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-40">Responsible</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">Due Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-20">Files</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <React.Fragment key={row.id}>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">
                      {renderEditableCell(row, 'mainTitle', row.mainTitle, 'Enter main title')}
                      {row.mainTranslations && (
                        <div className="text-xs text-gray-500 mt-1 px-2">
                          <div>EN: {row.mainTranslations.en}</div>
                          <div>JA: {row.mainTranslations.ja}</div>
                          <div>TH: {row.mainTranslations.th}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {renderEditableCell(row, 'subTitle', row.subTitle, 'Enter sub title')}
                      {row.subTranslations && (
                        <div className="text-xs text-gray-500 mt-1 px-2">
                          <div>EN: {row.subTranslations.en}</div>
                          <div>JA: {row.subTranslations.ja}</div>
                          <div>TH: {row.subTranslations.th}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {renderEditableCell(row, 'subSubTitle', row.subSubTitle, 'Enter sub sub title')}
                      {row.subSubTranslations && (
                        <div className="text-xs text-gray-500 mt-1 px-2">
                          <div>EN: {row.subSubTranslations.en}</div>
                          <div>JA: {row.subSubTranslations.ja}</div>
                          <div>TH: {row.subSubTranslations.th}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {renderEditableCell(row, 'action', row.action, 'Enter action')}
                      {row.actionTranslations && (
                        <div className="text-xs text-gray-500 mt-1 px-2">
                          <div>EN: {row.actionTranslations.en}</div>
                          <div>JA: {row.actionTranslations.ja}</div>
                          <div>TH: {row.actionTranslations.th}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {renderEditableCell(
                        row, 
                        'responsible', 
                        row.responsible.map(r => r.name).join(', '), 
                        'Assignee'
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {renderEditableCell(row, 'dueDate', row.dueDate, 'Select date')}
                    </td>
                    <td className="px-4 py-2">
                      {renderEditableCell(row, 'status', row.status, 'Status')}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => setShowAttachments(showAttachments === row.id ? null : row.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {(row.urls.length + row.attachments.length) || 0} files
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => duplicateRow(row.id)}
                          className="text-blue-500 hover:text-blue-700 p-1"
                          title="Duplicate row"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                            <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeRow(row.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete row"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {showAttachments === row.id && (
                    <tr>
                      <td colSpan={9} className="px-4 py-3 bg-gray-50">
                        <AttachmentButtons
                          urls={row.urls}
                          attachments={row.attachments}
                          onUpdate={(updates) => {
                            // Update the row with new attachments
                            const updatedRows = rows.map(r => {
                              if (r.id === row.id) {
                                return { 
                                  ...r, 
                                  urls: updates.urls || r.urls,
                                  attachments: updates.attachments || r.attachments
                                };
                              }
                              return r;
                            });
                            setRows(updatedRows);
                            
                            // Update structure
                            const newStructure = flatMatrixToStructure(updatedRows);
                            dispatch({
                              type: 'UPDATE_MOM_FIELD',
                              field: 'structure',
                              value: newStructure
                            });
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
        
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={addNewRow}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
          >
            + Add New Row
          </button>
        </div>
      </div>
      
      {/* Responsible Party Selector */}
      {showResponsibleSelector && (
        <div 
          style={{ 
            position: 'fixed', 
            left: showResponsibleSelector.x, 
            top: showResponsibleSelector.y,
            zIndex: 1000
          }}
        >
          <MatrixResponsibleSelector
            value={rows.find(r => r.id === showResponsibleSelector.rowId)?.responsible || []}
            onChange={(responsible: ResponsibleParty[]) => {
              handleCellEdit(showResponsibleSelector.rowId, 'responsible', responsible);
              setShowResponsibleSelector(null);
            }}
            onClose={() => setShowResponsibleSelector(null)}
          />
        </div>
      )}
    </section>
  );
}