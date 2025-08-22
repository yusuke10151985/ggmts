'use client';

import React, { useState } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { StructureItem, ResponsibleParty, Translation } from '@/types/mom';
import ResponsiblePartiesModal from '@/components/mom/ResponsiblePartiesModal';
import MultilingualInput from './MultilingualInput';

interface Props {
  item: StructureItem;
  currentRevision?: number;
}

export default function ActionContent({ item, currentRevision }: Props) {
  const { dispatch, state } = useMOM();
  const [showResponsibleModal, setShowResponsibleModal] = useState(false);

  const handleResponsibleUpdate = (parties: ResponsibleParty[]) => {
    dispatch({
      type: 'UPDATE_STRUCTURE_ITEM',
      id: item.id,
      updates: { 
        responsibleParties: parties,
        lastModifiedRevision: currentRevision
      },
    });
  };


  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'UPDATE_STRUCTURE_ITEM',
      id: item.id,
      updates: { 
        dueDate: e.target.value,
        lastModifiedRevision: currentRevision
      },
    });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({
      type: 'UPDATE_STRUCTURE_ITEM',
      id: item.id,
      updates: { 
        status: e.target.value as 'open' | 'closed',
        lastModifiedRevision: currentRevision
      },
    });
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700">Responsible Party</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-2 bg-gray-100 rounded">
              {item.responsibleParties && item.responsibleParties.length > 0 
                ? item.responsibleParties.map(p => p.name).join(', ')
                : 'Not assigned'
              }
            </div>
            <button
              onClick={() => setShowResponsibleModal(true)}
              className="btn btn-sm btn-secondary"
            >
              Select
            </button>
          </div>
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700">Due Date</label>
          <input
            type="date"
            className="form-control"
            value={item.dueDate || ''}
            onChange={handleDateChange}
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700">Status</label>
          <select
            className="form-control"
            value={item.status || 'open'}
            onChange={handleStatusChange}
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {showResponsibleModal && (
        <ResponsiblePartiesModal
          currentParties={item.responsibleParties || []}
          onSave={handleResponsibleUpdate}
          onClose={() => setShowResponsibleModal(false)}
        />
      )}
    </div>
  );
}