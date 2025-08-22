'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { FlatMatrixRow, structureToFlatMatrix, flatMatrixToStructure } from '@/lib/mom/matrix-flat-conversion';
import { ResponsibleParty } from '@/types/mom';
import AttachmentButtons from './AttachmentButtons';
import RevisionLegend from './RevisionLegend';
import ViewModeToggle from './ViewModeToggle';
import MatrixResponsibleSelector from './MatrixResponsibleSelector';
import { translateText } from '@/services/mom/api';
import { TooltipCell, CompactResponsibleCell, CompactFilesCell, CompactStatusCell, CompactDateCell } from './TooltipCell';
import StatusCountBadge from './StatusCountBadge';
import { countActionsInHierarchy } from '@/lib/mom/count-actions';
import { CompactCell } from './CompactCell';
import { StatusBadge, FileIndicator } from './EnhancedStatusBadge';
import { TranslationCell } from './TranslationCell';
import { CompactStatusBadge, CompactActions, CompactResponsible, CompactDate } from './CompactComponents';

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
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Calculate action counts from the hierarchical structure
  const statusCount = useMemo(() => {
    return countActionsInHierarchy(currentMOM?.structure || []);
  }, [currentMOM?.structure]);
  
  // Helper function to check if row has any content
  const hasRowContent = (row?: FlatMatrixRow): boolean => {
    if (!row) return false;
    return !!(row.mainTitle || row.subTitle || row.subSubTitle || row.action);
  };

  // Convert structure to flat matrix only on initial mount or when MOM changes
  useEffect(() => {
    if (currentMOM?.momId && !isInitialized) {
      const flatRows = currentMOM.structure ? structureToFlatMatrix(currentMOM.structure) : [];
      setRows(flatRows);
      setIsInitialized(true);
    }
  }, [currentMOM?.momId, currentMOM?.structure, isInitialized]);
  
  // Reset initialization when MOM changes
  useEffect(() => {
    setIsInitialized(false);
  }, [currentMOM?.momId]);

  const handleCellEdit = async (rowId: string, field: string, value: any, sourceLang?: 'en' | 'ja' | 'th') => {
    // Clear any existing validation error
    setValidationError(null);
    
    // Update the row locally first
    const updatedRows = rows.map(row => {
      if (row.id === rowId) {
        return { ...row, [field]: value };
      }
      return row;
    });
    
    // Validation: Check if Action is filled without Main Title
    const updatedRow = updatedRows.find(r => r.id === rowId);
    if (updatedRow) {
      if (field === 'action' && value && !updatedRow.mainTitle) {
        setValidationError('Action を入力する場合は、少なくとも Main Title も入力する必要があります。');
        // Still update the UI but show warning
      } else if (field === 'mainTitle' && value && updatedRow.action && !updatedRow.mainTitle && field !== 'mainTitle') {
        // Clear error if main title is being added
        setValidationError(null);
      }
      
      // Also check all rows for this validation
      const hasInvalidRows = updatedRows.some(row => row.action && !row.mainTitle);
      if (hasInvalidRows) {
        setValidationError('Action を入力する場合は、少なくとも Main Title も入力する必要があります。');
      }
    }
    
    // Handle translations for text fields
    if (['mainTitle', 'subTitle', 'subSubTitle', 'action'].includes(field) && typeof value === 'string' && value.trim()) {
      const response = await translateText(value, sourceLang || 'auto');
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
        
        // Only update structure if row has meaningful content
        if (hasRowContent(finalRows.find(r => r.id === rowId))) {
          const structureWithTranslations = flatMatrixToStructure(finalRows);
          dispatch({
            type: 'UPDATE_MOM_FIELD',
            field: 'structure',
            value: structureWithTranslations
          });
        }
      } else {
        // No translation, just update
        setRows(updatedRows);
        
        // Only update structure if row has meaningful content
        if (hasRowContent(updatedRows.find(r => r.id === rowId))) {
          const newStructure = flatMatrixToStructure(updatedRows);
          dispatch({
            type: 'UPDATE_MOM_FIELD',
            field: 'structure',
            value: newStructure
          });
        }
      }
    } else {
      // Non-text field update
      setRows(updatedRows);
      
      // Only update structure if row has meaningful content
      if (hasRowContent(updatedRows.find(r => r.id === rowId))) {
        const newStructure = flatMatrixToStructure(updatedRows);
        dispatch({
          type: 'UPDATE_MOM_FIELD',
          field: 'structure',
          value: newStructure
        });
      }
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
    
    // Clear validation error when adding new row
    setValidationError(null);
    
    // Important: Don't update structure immediately for empty rows
    // Just update local state to show the new row in UI
    setRows(prevRows => [...prevRows, newRow]);
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

  const renderEditableCell = (row: FlatMatrixRow, field: string, value: string, placeholder: string = '', maxLength: number = 40) => {
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
    let className = isAction ? 'text-blue-700 font-bold' : '';
    
    // Add warning style if action has no main title
    if (field === 'action' && value && !row.mainTitle) {
      className += ' ring-2 ring-yellow-500 bg-yellow-50';
    }
    
    // Special handling for status
    const isStatus = field === 'status';
    const statusClass = value === 'open' ? 'text-red-600 font-bold' : 
                       value === 'closed' ? 'text-green-600' : '';

    // Get translations based on field
    let translations = null;
    if (field === 'mainTitle' && row.mainTranslations) {
      translations = row.mainTranslations;
    } else if (field === 'subTitle' && row.subTranslations) {
      translations = row.subTranslations;
    } else if (field === 'subSubTitle' && row.subSubTranslations) {
      translations = row.subSubTranslations;
    } else if (field === 'action' && row.actionTranslations) {
      translations = row.actionTranslations;
    }

    return (
      <div
        id={cellId}
        className="cursor-text"
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
        <TooltipCell 
          content={value || placeholder}
          maxLength={maxLength}
          className={className}
          translations={translations}
        />
      </div>
    );
  };

  if (!currentMOM) return null;

  return (
    <section className="w-full">
      <div className="bg-white">
        {/* Header Area - Full Width */}
        <div className="px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center flex-wrap agenda-header-wrapper">
              <h2 className="mb-0 text-xl font-semibold">
                Agenda Structure
              </h2>
              <StatusCountBadge 
                count={statusCount} 
                items={currentMOM.structure}
                showTooltip={true}
              />
            </div>
            <ViewModeToggle />
          </div>
        </div>

      {currentMOM.revision > 0 && (
        <RevisionLegend
          currentRevision={currentMOM.revision}
          baseRevision={currentMOM.baseRevision}
        />
      )}

        {/* Table Area - Full Width, No Borders */}
        <div className="w-full overflow-x-auto max-h-[600px] overflow-y-auto">
          {rows.length === 0 ? (
            <div className="text-center text-gray-500 italic py-12">
              No agenda items yet. Click &quot;Add New Row&quot; to start.
            </div>
          ) : (
            <table ref={tableRef} className="w-full borderless-matrix-table">
              <colgroup>
                {/* Maximize content columns */}
                <col style={{width: '24%'}} />  {/* Main Title */}
                <col style={{width: '23%'}} />  {/* Sub Title */}
                <col style={{width: '23%'}} />  {/* Sub Sub Title */}
                <col style={{width: '20%'}} />  {/* Action */}
                <col style={{width: '4%'}} />   {/* Responsible */}
                <col style={{width: '3%'}} />   {/* Due Date */}
                <col style={{width: '2%'}} />   {/* Status */}
                <col style={{width: '1%'}} />   {/* Files/Actions */}
              </colgroup>
              
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-900 text-white">
                  <th className="text-left py-2 px-2 text-sm font-medium">Main Title</th>
                  <th className="text-left py-2 px-2 text-sm font-medium">Sub Title</th>
                  <th className="text-left py-2 px-2 text-sm font-medium">Sub Sub Title</th>
                  <th className="text-left py-2 px-2 text-sm font-medium">Action</th>
                  <th className="text-center py-2 px-1 text-sm font-medium">Resp.</th>
                  <th className="text-center py-2 px-1 text-sm font-medium">Due</th>
                  <th className="text-center py-2 px-1 text-sm font-medium">St.</th>
                  <th className="text-center py-2 px-1 text-sm font-medium">📎</th>
                </tr>
              </thead>
            <tbody>
              {rows.map((row, index) => {
                const hasValidationError = row.action && !row.mainTitle;
                const isEven = index % 2 === 0;
                const rowClasses = `
                  ${isEven ? 'bg-gray-50' : 'bg-white'}
                  ${hasValidationError ? 'bg-yellow-50' : ''}
                  hover:bg-blue-50 transition-colors duration-150
                `;
                
                return (
                <React.Fragment key={row.id}>
                  <tr className={rowClasses}>
                    <td className="py-1 px-2">
                      <TranslationCell 
                        originalText={row.mainTitle}
                        translations={row.mainTranslations}
                        onUpdate={async (text, lang) => {
                          await handleCellEdit(row.id, 'mainTitle', text, lang);
                        }}
                        cellType="main"
                        placeholder="Click to add main title"
                      />
                    </td>
                    <td className="py-1 px-2">
                      <TranslationCell 
                        originalText={row.subTitle}
                        translations={row.subTranslations}
                        onUpdate={async (text, lang) => {
                          await handleCellEdit(row.id, 'subTitle', text, lang);
                        }}
                        cellType="sub"
                        placeholder="Click to add sub title"
                      />
                    </td>
                    <td className="py-1 px-2">
                      <TranslationCell 
                        originalText={row.subSubTitle}
                        translations={row.subSubTranslations}
                        onUpdate={async (text, lang) => {
                          await handleCellEdit(row.id, 'subSubTitle', text, lang);
                        }}
                        cellType="subsub"
                        placeholder="Click to add sub sub title"
                      />
                    </td>
                    <td className="py-1 px-2">
                      <TranslationCell 
                        originalText={row.action}
                        translations={row.actionTranslations}
                        onUpdate={async (text, lang) => {
                          await handleCellEdit(row.id, 'action', text, lang);
                        }}
                        cellType="action"
                        isAction={true}
                        placeholder="Click to add action"
                      />
                    </td>
                    <td className="py-1 px-1 text-center" id={`responsible-${row.id}`}>
                      <CompactResponsible
                        responsible={row.responsible}
                        onClick={() => {
                          const rect = (document.querySelector(`#responsible-${row.id}`) as HTMLElement)?.getBoundingClientRect();
                          if (rect) {
                            setShowResponsibleSelector({ 
                              rowId: row.id, 
                              x: rect.left, 
                              y: rect.bottom 
                            });
                          }
                        }}
                      />
                    </td>
                    <td className="py-1 px-1 text-center">
                      <CompactDate
                        date={row.dueDate}
                        onChange={(value) => handleCellEdit(row.id, 'dueDate', value)}
                      />
                    </td>
                    <td className="py-1 px-1 text-center">
                      <CompactStatusBadge 
                        status={row.status}
                        onChange={(value) => handleCellEdit(row.id, 'status', value)}
                      />
                    </td>
                    <td className="py-1 px-1 text-center">
                      <CompactActions 
                        files={row.attachments} 
                        urls={row.urls}
                        onFiles={() => setShowAttachments(showAttachments === row.id ? null : row.id)}
                        onDuplicate={() => duplicateRow(row.id)}
                        onDelete={() => removeRow(row.id)}
                      />
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
              )})}
            </tbody>
            </table>
          )}
        </div>
        
        {/* Footer Area */}
        <div className="px-6 py-3 border-t bg-gray-50">
          <button
            onClick={addNewRow}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium transition-colors duration-150"
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