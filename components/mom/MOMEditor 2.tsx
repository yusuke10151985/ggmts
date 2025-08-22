'use client';

import React, { useEffect, useState } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import MeetingDetails from '@/components/mom/MeetingDetails';
import TimeSlots from '@/components/mom/TimeSlots';
import CompaniesAttendees from '@/components/mom/CompaniesAttendees';
import HierarchicalStructure from '@/components/mom/HierarchicalStructure';
import ExportButtons from '@/components/mom/ExportButtons';
import RevisionDifferences from '@/components/mom/RevisionDifferences';

export default function MOMEditor() {
  const { state } = useMOM();
  const { currentMOM } = state;

  if (!currentMOM) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* MOM Info Display - Always show */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-6 flex-wrap">
          {/* LABEL REMOVAL: Removed "MOM ID:" label, keeping only the value */}
          <span className={`px-3 py-1 rounded font-semibold font-mono ${
            currentMOM.momId === 'New MOM' 
              ? 'bg-gray-400 text-white' 
              : 'bg-blue-500 text-white'
          }`}>
            {currentMOM.momId}
          </span>
          
          {/* LABEL REMOVAL: Removed "Revision:" label, keeping only the value */}
          <span className={`px-3 py-1 rounded font-semibold ${
            currentMOM.momId === 'New MOM' 
              ? 'bg-gray-400 text-white' 
              : currentMOM.revision === 0
              ? 'bg-yellow-500 text-white'
              : 'bg-green-500 text-white'
          }`}>
            {currentMOM.momId === 'New MOM' ? '-' : `Rev.${currentMOM.revision}`}
          </span>
          
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Status:</span>
            <span className={`px-3 py-1 rounded font-semibold ${
              currentMOM.status === 'Draft' 
                ? 'bg-yellow-500 text-white' 
                : 'bg-cyan-500 text-white'
            }`}>
              {currentMOM.momId === 'New MOM' ? 'New' : currentMOM.status}
            </span>
          </div>
        </div>
      </div>

      {/* **CRITICAL REQUIREMENT 2**: Show differences when revision > 0 */}
      <RevisionDifferences />

      {/* Meeting Details */}
      <MeetingDetails />

      {/* Time Slots */}
      <TimeSlots />

      {/* Companies and Attendees */}
      <CompaniesAttendees />

      {/* Hierarchical Structure */}
      <HierarchicalStructure />

      {/* Export Buttons */}
      <ExportButtons />
      
      {/* Required Fields Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-yellow-800 mb-1">Required Fields</p>
            <p className="text-yellow-700">
              Fields marked with <span className="text-red-500 font-bold">*</span> are required and must be filled before saving or issuing the MOM.
            </p>
            <ul className="mt-2 space-y-1 text-yellow-700">
              <li>• Meeting Title</li>
              <li>• Meeting Date</li>
              <li>• Meeting Goal</li>
              <li>• Time (Main Time Slot)</li>
              <li>• Companies and Attendees</li>
            </ul>
            <p className="mt-2 text-yellow-700 text-xs italic">
              Note: Agenda Structure is optional and not required for saving.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}