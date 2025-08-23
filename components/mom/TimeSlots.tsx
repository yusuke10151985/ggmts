'use client';

import React, { useState, useEffect } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { timezoneOffsets, calculateTimezoneTime, formatTimeWithDayOffset } from '@/utils/mom/timezone';
import { TimeSlot } from '@/types/mom';
import { getCurrentHourTime } from '@/utils/mom/date-helpers';

export default function TimeSlots() {
  const { state, dispatch } = useMOM();
  const { currentMOM } = state;
  // DEFAULT JAPAN DISPLAY: Only Japan is shown by default in Time in Other Countries
  const [subSlots, setSubSlots] = useState<TimeSlot[]>([
    { country: 'Japan', timezone: 'Asia/Tokyo', startTime: '', endTime: '' },
  ]);
  
  // Debug logging - disabled to prevent Windows issues
  // React.useEffect(() => {
  //   console.log('[TimeSlots] Current MOM time data:', {
  //     hasMainTimeSlot: !!currentMOM?.mainTimeSlot,
  //     mainTimeSlot: currentMOM?.mainTimeSlot,
  //     otherTimeSlots: currentMOM?.otherTimeSlots
  //   });
  // }, [currentMOM]);

  const handleMainSlotChange = (field: keyof TimeSlot, value: string) => {
    const updatedSlot = {
      ...currentMOM?.mainTimeSlot,
      [field]: value,
    } as TimeSlot;
    
    dispatch({ 
      type: 'UPDATE_MOM_FIELD', 
      field: 'mainTimeSlot', 
      value: updatedSlot 
    });
    
    // Update all sub slots
    updateAllSubSlots(updatedSlot);
  };

  const updateAllSubSlots = (mainSlot: TimeSlot) => {
    if (!mainSlot.startTime || !mainSlot.endTime || !mainSlot.timezone) return;
    
    const updatedSubSlots = subSlots.map(slot => {
      if (!slot.timezone) return slot;
      
      const startConverted = calculateTimezoneTime(
        mainSlot.timezone,
        mainSlot.startTime,
        slot.timezone
      );
      
      const endConverted = calculateTimezoneTime(
        mainSlot.timezone,
        mainSlot.endTime,
        slot.timezone
      );
      
      return {
        ...slot,
        startTime: formatTimeWithDayOffset(startConverted.time, startConverted.dayOffset),
        endTime: formatTimeWithDayOffset(endConverted.time, endConverted.dayOffset),
      };
    });
    
    setSubSlots(updatedSubSlots);
    dispatch({ 
      type: 'UPDATE_MOM_FIELD', 
      field: 'otherTimeSlots', 
      value: updatedSubSlots 
    });
  };

  const addSubSlot = () => {
    setSubSlots([...subSlots, { 
      country: '', 
      timezone: '', 
      startTime: '', 
      endTime: '' 
    }]);
  };

  const removeSubSlot = (index: number) => {
    const updated = subSlots.filter((_, i) => i !== index);
    setSubSlots(updated);
    dispatch({ 
      type: 'UPDATE_MOM_FIELD', 
      field: 'otherTimeSlots', 
      value: updated 
    });
  };

  const updateSubSlot = (index: number, timezone: string) => {
    const mainSlot = currentMOM?.mainTimeSlot;
    if (!mainSlot?.startTime || !mainSlot?.endTime || !mainSlot?.timezone) {
      return;
    }
    
    const startConverted = calculateTimezoneTime(
      mainSlot.timezone,
      mainSlot.startTime,
      timezone
    );
    
    const endConverted = calculateTimezoneTime(
      mainSlot.timezone,
      mainSlot.endTime,
      timezone
    );
    
    const updated = [...subSlots];
    updated[index] = {
      ...updated[index],
      timezone,
      country: timezoneOffsets[timezone]?.name || timezone,
      startTime: formatTimeWithDayOffset(startConverted.time, startConverted.dayOffset),
      endTime: formatTimeWithDayOffset(endConverted.time, endConverted.dayOffset),
    };
    
    setSubSlots(updated);
    dispatch({ 
      type: 'UPDATE_MOM_FIELD', 
      field: 'otherTimeSlots', 
      value: updated 
    });
  };

  useEffect(() => {
    // Initialize main time slot if not set
    if (currentMOM && !currentMOM.mainTimeSlot) {
      const currentHour = getCurrentHourTime();
      const nextHour = `${(parseInt(currentHour.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;
      dispatch({
        type: 'UPDATE_MOM_FIELD',
        field: 'mainTimeSlot',
        value: {
          country: 'Thailand',
          timezone: 'Asia/Bangkok',
          startTime: currentHour,
          endTime: nextHour,
        },
      });
    }
    
    // Initialize or load existing time slots
    if (currentMOM?.otherTimeSlots && currentMOM.otherTimeSlots.length > 0) {
      // Load existing time slots from saved MOM
      setSubSlots(currentMOM.otherTimeSlots);
    } else if (currentMOM?.mainTimeSlot) {
      // For new MOMs, ensure Japan is shown by default and update times
      updateAllSubSlots(currentMOM.mainTimeSlot);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMOM?.momId, currentMOM?.revision]); // Re-run when MOM changes

  if (!currentMOM) return null;

  return (
    <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      {/* **HORIZONTAL LAYOUT FIX**: Display Time, Add Country button, and sub-countries all in one line */}
      <div className="flex items-start gap-4 mb-4">
        <h2 className="flex-shrink-0">
          Time
          <span className="text-red-500 ml-1">*</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* **ADD COUNTRY BUTTON**: Positioned immediately after Time heading */}
          <button
            className="btn btn-sm btn-primary flex-shrink-0"
            onClick={addSubSlot}
          >
            Add Country
          </button>
          {/* **SUB-COUNTRY DISPLAYS**: Shown inline with the button */}
          {subSlots.map((slot, index) => (
            <div key={index} className="bg-white p-2 rounded border border-gray-200 flex items-center gap-2">
              <select
                className="form-control text-xs py-1 px-2 h-8"
                style={{ fontSize: '0.75rem', minWidth: '120px' }}
                value={slot.timezone}
                onChange={(e) => updateSubSlot(index, e.target.value)}
              >
                <option value="">Select Country</option>
                {Object.entries(timezoneOffsets).map(([tz, info]) => (
                  <option key={tz} value={tz}>{info.name}</option>
                ))}
              </select>
              {slot.timezone && (
                <div className="text-xs text-gray-600">
                  {slot.startTime?.replace(/Asia\/\w+:\s*/, '').replace(/\s*\(.*?\)/, '') || '--:--'} - {slot.endTime?.replace(/Asia\/\w+:\s*/, '').replace(/\s*\(.*?\)/, '') || '--:--'}
                </div>
              )}
              <button
                className="text-red-500 hover:text-red-700 text-sm"
                onClick={() => removeSubSlot(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Time Slot - TITLE REMOVED: Only the visible title text is removed */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
        {/* **MAIN COUNTRY TIME DISPLAY**: Show current values in same format as sub-countries */}
        {currentMOM.mainTimeSlot?.timezone && (
          <div className="text-base text-gray-700 mb-3">
            <span className="font-semibold">{timezoneOffsets[currentMOM.mainTimeSlot.timezone]?.name || 'Thailand'}</span> | {currentMOM.mainTimeSlot?.startTime || '09:00'} | {currentMOM.mainTimeSlot?.endTime || '10:00'}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 font-semibold text-gray-700">Country</label>
            <select
              className="form-control"
              value={currentMOM.mainTimeSlot?.timezone || 'Asia/Bangkok'}
              onChange={(e) => handleMainSlotChange('timezone', e.target.value)}
            >
              {Object.entries(timezoneOffsets).map(([tz, info]) => (
                <option key={tz} value={tz}>{info.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block mb-2 font-semibold text-gray-700">Start Time</label>
            <input
              type="time"
              className="form-control"
              value={currentMOM.mainTimeSlot?.startTime || '09:00'}
              onChange={(e) => handleMainSlotChange('startTime', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block mb-2 font-semibold text-gray-700">End Time</label>
            <input
              type="time"
              className="form-control"
              value={currentMOM.mainTimeSlot?.endTime || '10:00'}
              onChange={(e) => handleMainSlotChange('endTime', e.target.value)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}