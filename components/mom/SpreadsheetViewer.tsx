'use client';

import React, { useState, useEffect } from 'react';
import { createCompany, createAttendee, getCompanies, getAttendees } from '@/services/mom/api';
import { useMOM } from '@/contexts/mom/MOMContext';
import { Company, Attendee } from '@/types/mom';
import SpreadsheetLink from './SpreadsheetLink';

interface SpreadsheetData {
  sheetName: string;
  headers: string[];
  rows: any[][];
}

export default function SpreadsheetViewer() {
  const { state, dispatch } = useMOM();
  const { companies } = state;
  const [sheets, setSheets] = useState<SpreadsheetData[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('MOMs');
  
  // **SHEET NAME MAPPING**: Map display names to actual sheet names
  const sheetNameMap: Record<string, string> = {
    'MOMs': 'Sheet1',
    'Tasks': 'Tasks',
    'Companies': 'Companies',
    'Attendees': 'Attendees'
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColumn, setFilterColumn] = useState<number>(-1);
  const [filterValue, setFilterValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // **ADD NEW COMPANY**: State for company creation modal
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [companyLoading, setCompanyLoading] = useState(false);
  
  // **ADD NEW ATTENDEE**: State for attendee creation modal
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [newAttendee, setNewAttendee] = useState({
    name: '',
    email: '',
    companyId: '',
  });
  const [attendeeLoading, setAttendeeLoading] = useState(false);

  // **SPREADSHEET DATA FETCH**: Load all sheets data
  const loadSpreadsheetData = async () => {
    setLoading(true);
    try {
      // **TASK SHEET**: Include Tasks sheet in the spreadsheet viewer
      // Note: Using actual sheet names from Google Sheets (Sheet1, Sheet2, etc.)
      const sheetNames = [
        { display: 'MOMs', actual: 'Sheet1' },
        { display: 'Tasks', actual: 'Tasks' },
        { display: 'Companies', actual: 'Companies' },
        { display: 'Attendees', actual: 'Attendees' }
      ];
      const loadedSheets: SpreadsheetData[] = [];

      for (const sheet of sheetNames) {
        const response = await fetch(`/api/spreadsheet?range=${encodeURIComponent(`${sheet.actual}!A:Z`)}`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          loadedSheets.push({
            sheetName: sheet.display,
            headers: result.data[0] || [],
            rows: result.data.slice(1) || []
          });
        }
      }

      setSheets(loadedSheets);
    } catch (error) {
      console.error('Error loading spreadsheet:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpreadsheetData();
  }, []);

  // **FILTERING AND SEARCH**: Filter data based on search and column filters
  const getFilteredData = () => {
    const currentSheet = sheets.find(s => s.sheetName === selectedSheet);
    if (!currentSheet) return [];

    let filteredRows = currentSheet.rows;

    // Apply column filter
    if (filterColumn >= 0 && filterValue) {
      filteredRows = filteredRows.filter(row => 
        String(row[filterColumn] || '').toLowerCase().includes(filterValue.toLowerCase())
      );
    }

    // Apply global search
    if (searchTerm) {
      filteredRows = filteredRows.filter(row =>
        row.some(cell => 
          String(cell || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return filteredRows;
  };

  // **INLINE EDITING**: Handle cell editing
  const handleCellEdit = (rowIndex: number, colIndex: number) => {
    const currentSheet = sheets.find(s => s.sheetName === selectedSheet);
    if (!currentSheet) return;

    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(currentSheet.rows[rowIndex][colIndex] || '');
  };

  // **INLINE EDITING**: Save edited cell value
  const saveEditedCell = async () => {
    if (!editingCell) return;

    const currentSheet = sheets.find(s => s.sheetName === selectedSheet);
    if (!currentSheet) return;

    try {
      // Calculate actual row number (add 2 for header and 0-based index)
      const actualRow = editingCell.row + 2;
      const columnLetter = String.fromCharCode(65 + editingCell.col); // A, B, C, etc.
      const actualSheetName = sheetNameMap[selectedSheet] || selectedSheet;
      const range = `${actualSheetName}!${columnLetter}${actualRow}`;

      // Update in Google Sheets
      const response = await fetch('/api/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range, value: editValue }),
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update cell');
      }

      // Update local state
      const updatedSheets = sheets.map(sheet => {
        if (sheet.sheetName === selectedSheet) {
          const newRows = [...sheet.rows];
          newRows[editingCell.row][editingCell.col] = editValue;
          return { ...sheet, rows: newRows };
        }
        return sheet;
      });

      setSheets(updatedSheets);
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating cell:', error);
      alert('Failed to update cell');
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      alert('Please enter a company name');
      return;
    }

    setCompanyLoading(true);
    const response = await createCompany(newCompanyName);
    
    if (response.success && response.data) {
      // Update companies list in context
      const companiesResponse = await getCompanies();
      if (companiesResponse.success && companiesResponse.data) {
        dispatch({ type: 'SET_COMPANIES', payload: companiesResponse.data });
      }
      
      setNewCompanyName('');
      setShowAddCompany(false);
      alert('Company created successfully');
      
      // Reload spreadsheet data to show new company
      loadSpreadsheetData();
    } else {
      alert(response.error || 'Failed to create company');
    }
    
    setCompanyLoading(false);
  };

  const handleCreateAttendee = async () => {
    if (!newAttendee.name.trim()) {
      alert('Please enter attendee name');
      return;
    }
    
    if (!newAttendee.email.trim()) {
      alert('Please enter email address');
      return;
    }
    
    if (!newAttendee.companyId) {
      alert('Please select a company');
      return;
    }

    setAttendeeLoading(true);
    const response = await createAttendee({
      name: newAttendee.name,
      email: newAttendee.email,
      companyId: newAttendee.companyId
    });
    
    if (response.success && response.data) {
      // Update attendees list
      const attendeesResponse = await getAttendees();
      if (attendeesResponse.success && attendeesResponse.data) {
        dispatch({ type: 'SET_ATTENDEES', payload: attendeesResponse.data });
      }
      
      setNewAttendee({ name: '', email: '', companyId: '' });
      setShowAddAttendee(false);
      alert('Attendee created successfully');
      
      // Reload spreadsheet data to show new attendee
      loadSpreadsheetData();
    } else {
      alert(response.error || 'Failed to create attendee');
    }
    
    setAttendeeLoading(false);
  };

  const currentSheet = sheets.find(s => s.sheetName === selectedSheet);
  const filteredData = getFilteredData();

  if (loading) {
    return <div className="text-center py-8">Loading spreadsheet data...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Spreadsheet Viewer</h2>
      
      <SpreadsheetLink />

      {/* Sheet Selector */}
      <div className="mb-4 flex items-center gap-4">
        <label className="font-semibold">Sheet:</label>
        <select
          className="form-control w-48"
          value={selectedSheet}
          onChange={(e) => {
            setSelectedSheet(e.target.value);
            setFilterColumn(-1);
            setFilterValue('');
            setSearchTerm('');
          }}
        >
          {sheets.map(sheet => (
            <option key={sheet.sheetName} value={sheet.sheetName}>
              {sheet.sheetName}
            </option>
          ))}
        </select>

        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setShowAddCompany(true)}
        >
          Add New Company
        </button>
        
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setShowAddAttendee(true)}
        >
          Add New Attendee
        </button>

        <button
          className="btn btn-sm btn-secondary ml-auto"
          onClick={loadSpreadsheetData}
        >
          Refresh Data
        </button>
      </div>

      {/* **DYNAMIC FILTERING**: Search and filter controls */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 font-semibold">Global Search:</label>
          <input
            type="text"
            className="form-control"
            placeholder="Search all columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-2 font-semibold">Column Filter:</label>
          <div className="flex gap-2">
            <select
              className="form-control flex-1"
              value={filterColumn}
              onChange={(e) => setFilterColumn(Number(e.target.value))}
            >
              <option value={-1}>Select column...</option>
              {currentSheet?.headers.map((header, index) => (
                <option key={index} value={index}>
                  {header || `Column ${index + 1}`}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="form-control flex-1"
              placeholder="Filter value..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              disabled={filterColumn < 0}
            />
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-2 text-sm text-gray-600">
        Showing {filteredData.length} of {currentSheet?.rows.length || 0} rows
      </div>

      {/* **STRUCTURED TABLE**: Display spreadsheet data */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {currentSheet?.headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header || `Column ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((row, rowIndex) => {
              const actualRowIndex = currentSheet?.rows.indexOf(row) || 0;
              return (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {row.map((cell, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-4 py-2 text-sm text-gray-900 cursor-pointer hover:bg-blue-50"
                      onClick={() => handleCellEdit(actualRowIndex, colIndex)}
                    >
                      {editingCell?.row === actualRowIndex && editingCell?.col === colIndex ? (
                        <input
                          type="text"
                          className="form-control text-sm"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEditedCell}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              saveEditedCell();
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="block min-h-[20px]">
                          {cell || '-'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No data found matching your filters
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>• Click any cell to edit its value</p>
        <p>• Press Enter or click outside to save changes</p>
        <p>• Changes are immediately saved to the Google Spreadsheet</p>
      </div>

      {/* **ADD NEW COMPANY**: Modal for company creation */}
      {showAddCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-semibold mb-4">Add New Company</h3>
            
            <div className="mb-4">
              <label className="block mb-2 font-semibold text-gray-700">
                Company Name
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter company name"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                disabled={companyLoading}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setNewCompanyName('');
                  setShowAddCompany(false);
                }}
                disabled={companyLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateCompany}
                disabled={companyLoading}
              >
                {companyLoading ? 'Creating...' : 'Create Company'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* **ADD NEW ATTENDEE**: Modal for attendee creation */}
      {showAddAttendee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-semibold mb-4">Add New Attendee</h3>
            
            <div className="mb-4">
              <label className="block mb-2 font-semibold text-gray-700">
                Name
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter attendee name"
                value={newAttendee.name}
                onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                disabled={attendeeLoading}
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 font-semibold text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter email address"
                value={newAttendee.email}
                onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                disabled={attendeeLoading}
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 font-semibold text-gray-700">
                Company
              </label>
              <select
                className="form-control"
                value={newAttendee.companyId}
                onChange={(e) => setNewAttendee({ ...newAttendee, companyId: e.target.value })}
                disabled={attendeeLoading}
              >
                <option value="">Select Company</option>
                {companies
                  .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
                  .map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
              </select>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setNewAttendee({ name: '', email: '', companyId: '' });
                  setShowAddAttendee(false);
                }}
                disabled={attendeeLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateAttendee}
                disabled={attendeeLoading}
              >
                {attendeeLoading ? 'Creating...' : 'Create Attendee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}