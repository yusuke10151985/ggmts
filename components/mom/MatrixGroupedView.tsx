'use client';

import React, { useState, useEffect } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { GroupedMatrixRow, structureToGroupedMatrix } from '@/lib/mom/matrix-grouped-conversion';
import { Translation } from '@/types/mom';
import MatrixMultilingualDisplay from './MatrixMultilingualDisplay';
import MatrixMultilingualEdit from './MatrixMultilingualEdit';
import AttachmentButtons from './AttachmentButtons';
import RevisionLegend from './RevisionLegend';
import ViewModeToggle from './ViewModeToggle';
import MatrixResponsibleSelector from './MatrixResponsibleSelector';
import '@/styles/matrix-view.css';

export default function MatrixGroupedView() {
  const { state, dispatch } = useMOM();
  const { currentMOM } = state;
  const [groupedData, setGroupedData] = useState<GroupedMatrixRow[]>([]);
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: string } | null>(null);
  const [showAttachments, setShowAttachments] = useState<string | null>(null);
  const [showResponsibleSelector, setShowResponsibleSelector] = useState<{ itemId: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (currentMOM?.structure) {
      const grouped = structureToGroupedMatrix(currentMOM.structure);
      setGroupedData(grouped);
    }
  }, [currentMOM?.structure]);

  const handleMultilingualEdit = (itemId: string, translations: Translation) => {
    const updates = {
      title: translations.en || '',
      translations,
      lastModifiedRevision: currentMOM?.revision
    };

    dispatch({
      type: 'UPDATE_STRUCTURE_ITEM',
      id: itemId,
      updates
    });
    
    setEditingCell(null);
  };

  const handleFieldEdit = (itemId: string, field: string, value: any) => {
    const updates: any = {
      lastModifiedRevision: currentMOM?.revision
    };

    switch (field) {
      case 'dueDate':
        updates.dueDate = value;
        break;
      case 'status':
        updates.status = value;
        break;
      case 'responsible':
        updates.responsibleParties = value;
        break;
    }

    dispatch({
      type: 'UPDATE_STRUCTURE_ITEM',
      id: itemId,
      updates
    });
  };

  const renderMultilingualCell = (
    itemId: string, 
    field: string, 
    translations?: Translation,
    isEmpty?: boolean
  ) => {
    const isEditing = editingCell?.itemId === itemId && editingCell?.field === field;

    if (isEditing) {
      return (
        <MatrixMultilingualEdit
          initialValue={translations || { en: '', ja: '', th: '' }}
          onSave={(newTranslations) => handleMultilingualEdit(itemId, newTranslations)}
          onCancel={() => setEditingCell(null)}
          autoFocus
        />
      );
    }

    return (
      <MatrixMultilingualDisplay
        translations={translations || { en: '', ja: '', th: '' }}
        onEdit={() => setEditingCell({ itemId, field })}
        isEmpty={isEmpty}
      />
    );
  };

  const handleAddItem = (parentId: string | null, level: 1 | 2 | 3 | 4) => {
    if (!currentMOM) return;
    
    const newItem: any = {
      id: `item-${Date.now()}-${Math.random()}`,
      level,
      number: '',
      hierarchicalNumber: '',
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
    
    dispatch({ type: 'ADD_STRUCTURE_ITEM', parentId, item: newItem });
  };

  const handleRemoveItem = (itemId: string) => {
    if (confirm('Are you sure you want to remove this item and all its children?')) {
      dispatch({ type: 'REMOVE_STRUCTURE_ITEM', id: itemId });
    }
  };

  if (!currentMOM) return null;

  return (
    <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="mb-0">Agenda Structure - Grouped Matrix View</h2>
        <ViewModeToggle />
      </div>

      {currentMOM.revision > 0 && (
        <RevisionLegend
          currentRevision={currentMOM.revision}
          baseRevision={currentMOM.baseRevision}
        />
      )}

      <div className="mb-4">
        <button
          className="btn btn-primary"
          onClick={() => handleAddItem(null, 1)}
        >
          + Add Main Title
        </button>
      </div>

      <div className="matrix-table-container">
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          {groupedData.length === 0 ? (
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
                {groupedData.map((group, groupIndex) => (
                  <React.Fragment key={group.id}>
                    {/* Main title row with potential rowspan */}
                    <tr className="matrix-row-level-1 border-b">
                      <td className="matrix-cell" rowSpan={group.rowSpan}>
                        <div className="font-medium">{groupIndex + 1}</div>
                      </td>
                      <td className="matrix-cell" rowSpan={group.rowSpan}>
                        {renderMultilingualCell(group.mainTitleId, 'mainTitle', group.mainTranslations)}
                      </td>
                      
                      {/* First sub-item or empty cells */}
                      {group.subItems.length > 0 ? (
                        <>
                          <td className="matrix-cell">
                            {group.subItems[0].level === 2 
                              ? renderMultilingualCell(group.subItems[0].id, 'subTitle', group.subItems[0].translations)
                              : <span className="matrix-cell-empty">-</span>}
                          </td>
                          <td className="matrix-cell">
                            {group.subItems[0].level === 3 
                              ? renderMultilingualCell(group.subItems[0].id, 'subSubTitle', group.subItems[0].translations)
                              : <span className="matrix-cell-empty">-</span>}
                          </td>
                          <td className="matrix-cell">
                            {group.subItems[0].level === 4 
                              ? renderMultilingualCell(group.subItems[0].id, 'action', group.subItems[0].translations)
                              : <span className="matrix-cell-empty">-</span>}
                          </td>
                          <td className="matrix-cell">
                            {group.subItems[0].level === 4 && group.subItems[0].responsible
                              ? group.subItems[0].responsible.map(r => r.name).join(', ')
                              : <span className="matrix-cell-empty">-</span>}
                          </td>
                          <td className="matrix-cell">
                            {group.subItems[0].level === 4 && group.subItems[0].dueDate
                              ? group.subItems[0].dueDate
                              : <span className="matrix-cell-empty">-</span>}
                          </td>
                          <td className="matrix-cell">
                            {group.subItems[0].level === 4 && group.subItems[0].status ? (
                              <span className={group.subItems[0].status === 'open' ? 'matrix-status-open' : 'matrix-status-closed'}>
                                {group.subItems[0].status === 'open' ? '● Open' : '✓ Closed'}
                              </span>
                            ) : (
                              <span className="matrix-cell-empty">-</span>
                            )}
                          </td>
                          <td className="matrix-cell text-center">
                            <button
                              onClick={() => setShowAttachments(showAttachments === group.subItems[0].id ? null : group.subItems[0].id)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {(group.subItems[0].urls?.length || 0) + (group.subItems[0].attachments?.length || 0)} files
                            </button>
                          </td>
                          <td className="matrix-cell">
                            <div className="matrix-action-buttons">
                              <button
                                onClick={() => handleRemoveItem(group.subItems[0].id)}
                                className="text-red-600 hover:text-red-800 p-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="matrix-cell"><span className="matrix-cell-empty">-</span></td>
                          <td className="matrix-cell"><span className="matrix-cell-empty">-</span></td>
                          <td className="matrix-cell"><span className="matrix-cell-empty">-</span></td>
                          <td className="matrix-cell"><span className="matrix-cell-empty">-</span></td>
                          <td className="matrix-cell"><span className="matrix-cell-empty">-</span></td>
                          <td className="matrix-cell"><span className="matrix-cell-empty">-</span></td>
                          <td className="matrix-cell text-center">0 files</td>
                          <td className="matrix-cell">
                            <div className="matrix-action-buttons">
                              <button
                                onClick={() => handleAddItem(group.mainTitleId, 2)}
                                className="text-green-600 hover:text-green-800 px-2 py-1 border border-green-300 rounded text-xs"
                              >
                                + Sub
                              </button>
                              <button
                                onClick={() => handleAddItem(group.mainTitleId, 4)}
                                className="text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-300 rounded text-xs"
                              >
                                + Action
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                    
                    {/* Additional sub-items rows */}
                    {group.subItems.slice(1).map((subItem, subIndex) => (
                      <tr key={subItem.id} className={`matrix-row-level-${subItem.level} border-b`}>
                        <td className="matrix-cell">
                          {subItem.level === 2 
                            ? renderMultilingualCell(subItem.id, 'subTitle', subItem.translations)
                            : <span className="matrix-cell-empty">-</span>}
                        </td>
                        <td className="matrix-cell">
                          {subItem.level === 3 
                            ? renderMultilingualCell(subItem.id, 'subSubTitle', subItem.translations)
                            : <span className="matrix-cell-empty">-</span>}
                        </td>
                        <td className="matrix-cell">
                          {subItem.level === 4 
                            ? renderMultilingualCell(subItem.id, 'action', subItem.translations)
                            : <span className="matrix-cell-empty">-</span>}
                        </td>
                        <td className="matrix-cell">
                          {subItem.level === 4 && subItem.responsible
                            ? subItem.responsible.map(r => r.name).join(', ')
                            : <span className="matrix-cell-empty">-</span>}
                        </td>
                        <td className="matrix-cell">
                          {subItem.level === 4 && subItem.dueDate
                            ? subItem.dueDate
                            : <span className="matrix-cell-empty">-</span>}
                        </td>
                        <td className="matrix-cell">
                          {subItem.level === 4 && subItem.status ? (
                            <span className={subItem.status === 'open' ? 'matrix-status-open' : 'matrix-status-closed'}>
                              {subItem.status === 'open' ? '● Open' : '✓ Closed'}
                            </span>
                          ) : (
                            <span className="matrix-cell-empty">-</span>
                          )}
                        </td>
                        <td className="matrix-cell text-center">
                          <button
                            onClick={() => setShowAttachments(showAttachments === subItem.id ? null : subItem.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {(subItem.urls?.length || 0) + (subItem.attachments?.length || 0)} files
                          </button>
                        </td>
                        <td className="matrix-cell">
                          <div className="matrix-action-buttons">
                            <button
                              onClick={() => handleRemoveItem(subItem.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Attachment details row if needed */}
                    {group.subItems.some(item => showAttachments === item.id) && (
                      <tr>
                        <td colSpan={10} className="px-4 py-3 bg-gray-50">
                          {group.subItems.map(item => 
                            showAttachments === item.id && (
                              <AttachmentButtons
                                key={item.id}
                                urls={item.urls || []}
                                attachments={item.attachments || []}
                                onUpdate={(updates) => {
                                  dispatch({
                                    type: 'UPDATE_STRUCTURE_ITEM',
                                    id: item.structureItemId,
                                    updates
                                  });
                                }}
                              />
                            )
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
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
            value={
              groupedData.flatMap(g => g.subItems)
                .find(item => item.id === showResponsibleSelector.itemId)?.responsible || []
            }
            onChange={(responsible) => {
              handleFieldEdit(showResponsibleSelector.itemId, 'responsible', responsible);
              setShowResponsibleSelector(null);
            }}
            onClose={() => setShowResponsibleSelector(null)}
          />
        </div>
      )}
    </section>
  );
}