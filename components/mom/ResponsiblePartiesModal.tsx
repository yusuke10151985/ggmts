'use client';

import React, { useState } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { ResponsibleParty } from '@/types/mom';

interface Props {
  currentParties: ResponsibleParty[];
  onSave: (parties: ResponsibleParty[]) => void;
  onClose: () => void;
}

export default function ResponsiblePartiesModal({ currentParties, onSave, onClose }: Props) {
  const { state } = useMOM();
  const { companies, attendees, currentMOM } = state;
  // **ATTENDEES FIX**: Use attendees from global state, not just from currentMOM
  // The 'attendees' array is loaded globally in app/page.tsx via loadAllAttendees()
  const momAttendees = currentMOM?.attendees || [];
  
  // **ATTENDEES FIX**: Show all attendees from the system, not just selected ones
  // This ensures users can assign any attendee from any company as responsible party
  const allAttendees = attendees.length > 0 ? attendees : momAttendees;
  
  const [selectedParties, setSelectedParties] = useState<ResponsibleParty[]>(currentParties);

  const toggleParty = (party: ResponsibleParty) => {
    const exists = selectedParties.find(
      p => p.type === party.type && p.id === party.id
    );
    
    if (exists) {
      setSelectedParties(selectedParties.filter(
        p => !(p.type === party.type && p.id === party.id)
      ));
    } else {
      setSelectedParties([...selectedParties, party]);
    }
  };

  const isSelected = (type: 'company' | 'attendee', id: string) => {
    return selectedParties.some(p => p.type === type && p.id === id);
  };

  const handleSave = () => {
    onSave(selectedParties);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-semibold">Select Responsible Parties</h3>
          <button
            className="text-3xl text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh] space-y-6">
          {/* Companies Section */}
          <div>
            <h4 className="font-semibold mb-3">Companies</h4>
            <div className="space-y-2">
              {companies.map(company => (
                <label
                  key={company.id}
                  className="flex items-center p-3 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mr-3 w-5 h-5"
                    checked={isSelected('company', company.id)}
                    onChange={() => toggleParty({
                      type: 'company',
                      id: company.id,
                      name: company.name,
                    })}
                  />
                  <span className="text-lg">{company.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* **ATTENDEES POPULATED**: This section displays all attendees loaded from the system */}
          <div>
            <h4 className="font-semibold mb-3">Attendees</h4>
            <div className="space-y-2">
              {/* **ATTENDEES LIST**: Show all attendees or message if none exist */}
              {allAttendees.length === 0 ? (
                <p className="text-gray-500 italic p-3">No attendees available. Please add attendees first.</p>
              ) : (
                allAttendees.map(attendee => (
                <label
                  key={attendee.id}
                  className="flex items-center p-3 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mr-3 w-5 h-5"
                    checked={isSelected('attendee', attendee.id)}
                    onChange={() => toggleParty({
                      type: 'attendee',
                      id: attendee.id,
                      name: attendee.name,
                    })}
                  />
                  <div>
                    <div className="text-lg">{attendee.name}</div>
                    <div className="text-sm text-gray-500">{attendee.email}</div>
                  </div>
                </label>
              ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}