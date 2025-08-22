'use client';

import React from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { StructureItem as IStructureItem, Translation } from '@/types/mom';
import ActionContent from '@/components/mom/ActionContent';
import AttachmentButtons from '@/components/mom/AttachmentButtons';
import HierarchicalNumber from '@/components/mom/HierarchicalNumber';
import MultilingualInput from '@/components/mom/MultilingualInput';
import { getRevisionColor, isModifiedInRevision } from '@/lib/mom/revision-utils';

interface Props {
  item: IStructureItem;
  parentNumber: string;
  index: number;
  currentRevision?: number;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function StructureItem({ item, parentNumber, index, currentRevision, isFirst, isLast, onMoveUp, onMoveDown }: Props) {
  const { dispatch } = useMOM();
  
  // Use hierarchicalNumber if available, otherwise fall back to calculated number
  const itemNumber = item.hierarchicalNumber || (parentNumber ? `${parentNumber}.${index + 1}` : String(index + 1));

  const levelNames = {
    1: 'Main Title',
    2: 'Sub Title',
    3: 'Sub Sub Title',
    4: 'Action',
  };

  const handleTranslationsChange = (translations: Translation) => {
    dispatch({
      type: 'UPDATE_STRUCTURE_ITEM',
      id: item.id,
      updates: { 
        title: translations.en || '', // Use English as the main title for backward compatibility
        translations,
        lastModifiedRevision: currentRevision 
      },
    });
  };

  const addItem = (level: 1 | 2 | 3 | 4) => {
    const newItem: IStructureItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      level,
      number: '', // Will be set by renumbering
      hierarchicalNumber: '', // Will be set by renumbering
      title: '',
      children: [],
      originalRevision: currentRevision || 0,
      lastModifiedRevision: currentRevision || 0,
      ...(level === 4 ? { 
        actionId: `ACT-${Date.now()}`,
        status: 'open' as const, 
        responsibleParties: [], 
        urls: [], 
        attachments: [] 
      } : {}),
    };

    dispatch({ type: 'ADD_STRUCTURE_ITEM', parentId: item.id, item: newItem });
  };

  const removeItem = () => {
    if (confirm('Are you sure you want to remove this item and all its children?')) {
      dispatch({ type: 'REMOVE_STRUCTURE_ITEM', id: item.id });
    }
  };

  // Check if item was modified in the current revision
  const isModified = isModifiedInRevision(item, currentRevision || 0);
  const revisionColorClass = isModified ? getRevisionColor(currentRevision || 0) : '';

  return (
    <div className={`structure-item level-${item.level} ${isModified ? `border-l-4 ${revisionColorClass}` : ''}`}>
      <div className="flex items-start gap-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1">
            {!isFirst && (
              <button
                onClick={onMoveUp}
                className="p-1 hover:bg-gray-200 rounded"
                title="Move up"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}
            {!isLast && (
              <button
                onClick={onMoveDown}
                className="p-1 hover:bg-gray-200 rounded"
                title="Move down"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <HierarchicalNumber number={itemNumber} className="text-gray-600" />
            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">
              {levelNames[item.level as keyof typeof levelNames]}
            </span>
          </div>
        </div>
        
        <div className="flex-1">
          <MultilingualInput
            label=""
            value={item.translations}
            onChange={handleTranslationsChange}
            multiline={true}
            rows={2}
            placeholder={{
              en: `Enter ${levelNames[item.level as keyof typeof levelNames]} in English`,
              ja: `${levelNames[item.level as keyof typeof levelNames]}を日本語で入力`,
              th: `ป้อน${levelNames[item.level as keyof typeof levelNames]}เป็นภาษาไทย`
            }}
          />

          {isModified && (
            <div className={`text-xs ${revisionColorClass.split(' ')[0]} mt-1`}>
              Modified in Rev.{currentRevision}
            </div>
          )}

          {item.level === 4 && (
            <ActionContent 
              item={item} 
              currentRevision={currentRevision} 
            />
          )}

          {item.level === 4 && (
            <div className="mt-4">
              <AttachmentButtons
                urls={item.urls || []}
                attachments={item.attachments || []}
                onUpdate={(updates) => {
                  dispatch({
                    type: 'UPDATE_STRUCTURE_ITEM',
                    id: item.id,
                    updates: {
                      ...updates,
                      lastModifiedRevision: currentRevision,
                    },
                  });
                }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {item.level < 4 && (
            <div className="flex flex-col gap-1">
              {item.level < 3 && (
                <button
                  onClick={() => addItem((item.level + 1) as 2 | 3)}
                  className="btn btn-sm btn-secondary"
                  title={`Add ${levelNames[(item.level + 1) as keyof typeof levelNames]}`}
                >
                  + {levelNames[(item.level + 1) as keyof typeof levelNames]}
                </button>
              )}
              <button
                onClick={() => addItem(4)}
                className="btn btn-sm btn-primary"
                title="Add Action"
              >
                + Action
              </button>
            </div>
          )}
          <button
            onClick={removeItem}
            className="btn btn-sm btn-danger"
            title="Remove this item"
          >
            ✕
          </button>
        </div>
      </div>

      {item.children && item.children.length > 0 && (
        <div className="ml-8 space-y-4">
          {item.children.map((child, childIndex) => {
            const moveChildUp = () => {
              if (childIndex > 0) {
                const newChildren = [...item.children];
                [newChildren[childIndex - 1], newChildren[childIndex]] = [newChildren[childIndex], newChildren[childIndex - 1]];
                dispatch({
                  type: 'UPDATE_STRUCTURE_ITEM',
                  id: item.id,
                  updates: { 
                    children: newChildren,
                    lastModifiedRevision: currentRevision
                  },
                });
              }
            };

            const moveChildDown = () => {
              if (childIndex < item.children.length - 1) {
                const newChildren = [...item.children];
                [newChildren[childIndex], newChildren[childIndex + 1]] = [newChildren[childIndex + 1], newChildren[childIndex]];
                dispatch({
                  type: 'UPDATE_STRUCTURE_ITEM',
                  id: item.id,
                  updates: { 
                    children: newChildren,
                    lastModifiedRevision: currentRevision
                  },
                });
              }
            };

            return (
              <StructureItem
                key={child.id}
                item={child}
                parentNumber={itemNumber}
                index={childIndex}
                currentRevision={currentRevision}
                isFirst={childIndex === 0}
                isLast={childIndex === item.children.length - 1}
                onMoveUp={moveChildUp}
                onMoveDown={moveChildDown}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}