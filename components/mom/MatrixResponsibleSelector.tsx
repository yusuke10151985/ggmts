'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { ResponsibleParty } from '@/types/mom';

interface MatrixResponsibleSelectorProps {
  value: ResponsibleParty[];
  onChange: (value: ResponsibleParty[]) => void;
  onClose: () => void;
}

export default function MatrixResponsibleSelector({ value, onChange, onClose }: MatrixResponsibleSelectorProps) {
  const { state } = useMOM();
  const { currentMOM, companies, attendees } = state;
  const [selected, setSelected] = useState<ResponsibleParty[]>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleToggle = (party: ResponsibleParty) => {
    const index = selected.findIndex(p => p.type === party.type && p.id === party.id);
    let newSelected: ResponsibleParty[];
    
    if (index >= 0) {
      newSelected = selected.filter((_, i) => i !== index);
    } else {
      newSelected = [...selected, party];
    }
    
    setSelected(newSelected);
    onChange(newSelected);
  };

  const isSelected = (type: 'company' | 'attendee', id: string) => {
    return selected.some(p => p.type === type && p.id === id);
  };

  if (!currentMOM) return null;

  // Get companies and attendees from the current MOM
  const momCompanies = currentMOM.companies || [];
  const momAttendees = currentMOM.attendees || [];

  return (
    <div ref={containerRef} className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[300px] max-h-[400px] overflow-y-auto">
      <div className="mb-3">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">Companies</h3>
        {momCompanies.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No companies added yet</p>
        ) : (
          <div className="space-y-1">
            {momCompanies.map(company => (
              <label key={company.id} className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected('company', company.id)}
                  onChange={() => handleToggle({
                    type: 'company',
                    id: company.id,
                    name: company.name
                  })}
                  className="rounded"
                />
                <span className="text-sm">{company.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      
      <div className="mb-3">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">Attendees</h3>
        {momAttendees.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No attendees added yet</p>
        ) : (
          <div className="space-y-1">
            {momAttendees.map(attendee => {
              const company = companies.find(c => c.id === attendee.companyId);
              return (
                <label key={attendee.id} className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected('attendee', attendee.id)}
                    onChange={() => handleToggle({
                      type: 'attendee',
                      id: attendee.id,
                      name: attendee.name
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {attendee.name}
                    {company && <span className="text-gray-500"> ({company.name})</span>}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 pt-2 border-t">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}