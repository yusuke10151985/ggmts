'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { getCompanies, getAttendees, createCompany, createAttendee } from '@/services/mom/api';
import { Company, Attendee } from '@/types/mom';

interface CompanyCard {
  id: string;
  companyId: string;
  attendees: string[]; // Selected attendee IDs
  order: number; // For maintaining sort order
}

// Arrow buttons for reordering
const ArrowButtons = ({ onMoveUp, onMoveDown, isFirst, isLast }: { 
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) => (
  <div className="flex flex-col gap-1">
    <button
      className={`p-1 rounded ${isFirst ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
      onClick={onMoveUp}
      disabled={isFirst}
      title="Move up"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
    <button
      className={`p-1 rounded ${isLast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
      onClick={onMoveDown}
      disabled={isLast}
      title="Move down"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  </div>
);

export default function CompaniesAttendees() {
  const { state, dispatch } = useMOM();
  const { currentMOM, companies, attendees } = state;
  const [companyCards, setCompanyCards] = useState<CompanyCard[]>([]);
  const [attendeesByCompany, setAttendeesByCompany] = useState<Record<string, Attendee[]>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  
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

  useEffect(() => {
    loadCompanies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // **COMPANY DROPDOWN FIX**: Only initialize cards when MOM changes
    // Reset initialization flag when MOM changes
    if (currentMOM?.momId && currentMOM.momId !== 'New MOM') {
      setIsInitialized(false);
    }
  }, [currentMOM?.momId, currentMOM?.revision]);
  
  useEffect(() => {
    // Initialize cards only once per MOM
    if (currentMOM?.momId && !isInitialized) {
      // Disabled debug logging to prevent Windows issues
      // console.log('[CompaniesAttendees] Initializing with MOM:', {
      //   momId: currentMOM.momId,
      //   companiesCount: currentMOM.companies?.length || 0,
      //   attendeesCount: currentMOM.attendees?.length || 0,
      //   companies: currentMOM.companies
      // });
      
      if (currentMOM.companies && currentMOM.companies.length > 0) {
        const cards = currentMOM.companies.map((company, index) => ({
          id: `card-${index}`,
          companyId: company.id,
          attendees: currentMOM.attendees
            ?.filter(att => att.companyId === company.id)
            ?.map(att => att.id) || [],
          order: index,
        }));
        setCompanyCards(cards);
        // console.log('[CompaniesAttendees] Created company cards:', cards);
        
        // Load attendees for each selected company
        cards.forEach(card => {
          if (card.companyId) {
            loadAttendeesForCompany(card.companyId);
          }
        });
      } else {
        // Add one empty card for new MOMs or MOMs without companies
        // console.log('[CompaniesAttendees] No companies found, creating empty card');
        setCompanyCards([{ id: 'card-0', companyId: '', attendees: [], order: 0 }]);
      }
      
      setIsInitialized(true);
    }
  }, [currentMOM, isInitialized]); // Re-run when initialization flag changes

  const loadCompanies = async () => {
    const response = await getCompanies();
    if (response.success && response.data) {
      dispatch({ type: 'SET_COMPANIES', payload: response.data });
    }
  };

  const loadAttendeesForCompany = async (companyId: string) => {
    const response = await getAttendees(companyId);
    if (response.success && response.data) {
      setAttendeesByCompany(prev => ({
        ...prev,
        [companyId]: response.data!,
      }));
    }
  };

  const addCompanyCard = () => {
    const newCard: CompanyCard = {
      id: `card-${Date.now()}`,
      companyId: '',
      attendees: [],
      order: companyCards.length,
    };
    setCompanyCards([...companyCards, newCard]);
  };

  const removeCompanyCard = useCallback((cardId: string) => {
    setCompanyCards(prev => prev.filter(card => card.id !== cardId));
  }, []);

  const updateCompanyCard = async (cardId: string, companyId: string) => {
    // **COMPANY SELECTION FIX**: Update state and preserve selected company
    const updated = companyCards.map(card =>
      card.id === cardId ? { ...card, companyId, attendees: [] } : card
    );
    setCompanyCards(updated);
    
    // Load attendees for this company
    if (companyId) {
      await loadAttendeesForCompany(companyId);
    }
  };

  const toggleAttendee = (cardId: string, attendeeId: string) => {
    const updated = companyCards.map(card => {
      if (card.id === cardId) {
        const hasAttendee = card.attendees.includes(attendeeId);
        return {
          ...card,
          attendees: hasAttendee
            ? card.attendees.filter(id => id !== attendeeId)
            : [...card.attendees, attendeeId],
        };
      }
      return card;
    });
    setCompanyCards(updated);
  };

  const selectAllAttendees = (cardId: string, selectAll: boolean) => {
    const card = companyCards.find(c => c.id === cardId);
    if (!card || !card.companyId) return;
    
    const companyAttendees = attendeesByCompany[card.companyId] || [];
    const updated = companyCards.map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          attendees: selectAll ? companyAttendees.map(a => a.id) : [],
        };
      }
      return c;
    });
    setCompanyCards(updated);
  };

  // **COMPANY SELECTION FIX**: Update MOM data automatically when companyCards change
  useEffect(() => {
    if (!companies.length) return; // Don't update if companies haven't loaded yet
    
    // Sort cards by order before updating MOM
    const sortedCards = [...companyCards].sort((a, b) => a.order - b.order);
    
    // Update companies in MOM
    const selectedCompanies = sortedCards
      .filter(card => card.companyId)
      .map(card => companies.find(c => c.id === card.companyId))
      .filter(Boolean) as Company[];
    
    dispatch({ type: 'UPDATE_MOM_FIELD', field: 'companies', value: selectedCompanies });
    
    // Update attendees in MOM
    const selectedAttendees: Attendee[] = [];
    sortedCards.forEach(card => {
      if (card.companyId && card.attendees.length > 0) {
        const companyAttendees = attendeesByCompany[card.companyId] || [];
        card.attendees.forEach(attId => {
          const attendee = companyAttendees.find(a => a.id === attId);
          if (attendee) {
            selectedAttendees.push(attendee);
          }
        });
      }
    });
    
    dispatch({ type: 'UPDATE_MOM_FIELD', field: 'attendees', value: selectedAttendees });
  }, [companyCards, companies, attendeesByCompany, dispatch]);

  // Move company card up
  const moveCardUp = useCallback((cardId: string) => {
    setCompanyCards(prev => {
      const currentIndex = prev.findIndex(card => card.id === cardId);
      if (currentIndex <= 0) return prev;
      
      const newCards = [...prev];
      [newCards[currentIndex - 1], newCards[currentIndex]] = [newCards[currentIndex], newCards[currentIndex - 1]];
      
      // Update order property
      return newCards.map((card, index) => ({
        ...card,
        order: index,
      }));
    });
  }, []);

  // Move company card down
  const moveCardDown = useCallback((cardId: string) => {
    setCompanyCards(prev => {
      const currentIndex = prev.findIndex(card => card.id === cardId);
      if (currentIndex === -1 || currentIndex >= prev.length - 1) return prev;
      
      const newCards = [...prev];
      [newCards[currentIndex], newCards[currentIndex + 1]] = [newCards[currentIndex + 1], newCards[currentIndex]];
      
      // Update order property
      return newCards.map((card, index) => ({
        ...card,
        order: index,
      }));
    });
  }, []);

  const updateMOMData = () => {
    // This function is now deprecated - updates happen automatically via useEffect
  };

  // **ADD NEW COMPANY**: Function to handle company creation
  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      alert('Please enter a company name');
      return;
    }

    setCompanyLoading(true);
    const response = await createCompany(newCompanyName);
    
    if (response.success && response.data) {
      // **DYNAMIC UPDATE**: Add new company to the list
      dispatch({ 
        type: 'SET_COMPANIES', 
        payload: [...companies, response.data] 
      });
      
      setNewCompanyName('');
      setShowAddCompany(false);
      alert('Company created successfully');
    } else {
      alert(response.error || 'Failed to create company');
    }
    
    setCompanyLoading(false);
  };

  // **ADD NEW ATTENDEE**: Function to handle attendee creation
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
    const response = await createAttendee(newAttendee);
    
    if (response.success && response.data) {
      // **DYNAMIC UPDATE**: Add new attendee to the company's attendee list
      setAttendeesByCompany(prev => ({
        ...prev,
        [newAttendee.companyId]: [
          ...(prev[newAttendee.companyId] || []),
          response.data!
        ]
      }));
      
      setNewAttendee({ name: '', email: '', companyId: '' });
      setShowAddAttendee(false);
      alert('Attendee created successfully');
      
      // Refresh attendees for all loaded companies
      companyCards.forEach(card => {
        if (card.companyId) {
          loadAttendeesForCompany(card.companyId);
        }
      });
    } else {
      alert(response.error || 'Failed to create attendee');
    }
    
    setAttendeeLoading(false);
  };

  // Company card component
  const CompanyCardComponent = ({ card, index }: { card: CompanyCard; index: number }) => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 p-3 border-b flex items-center gap-2">
          <ArrowButtons
            onMoveUp={() => moveCardUp(card.id)}
            onMoveDown={() => moveCardDown(card.id)}
            isFirst={index === 0}
            isLast={index === companyCards.length - 1}
          />
          <select
            className="form-control text-xs flex-1"
            value={card.companyId}
            onChange={(e) => updateCompanyCard(card.id, e.target.value)}
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
          <button
            className="text-red-500 hover:text-red-700 text-xl"
            onClick={() => removeCompanyCard(card.id)}
          >
            ×
          </button>
        </div>
        
        <div className="p-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-700">Attendees</h4>
            <div className="flex gap-2">
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => selectAllAttendees(card.id, true)}
              >
                All
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => selectAllAttendees(card.id, false)}
              >
                None
              </button>
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {card.companyId && attendeesByCompany[card.companyId] ? (
              <div className="space-y-2">
                {attendeesByCompany[card.companyId]
                  .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
                  .map(attendee => (
                  <label
                    key={attendee.id}
                    className="flex items-start p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 mr-3 w-5 h-5"
                      checked={card.attendees.includes(attendee.id)}
                      onChange={() => toggleAttendee(card.id, attendee.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {attendee.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {attendee.email}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 italic py-8">
                {card.companyId ? 'Loading attendees...' : 'Select a company to view attendees'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // No longer using drag and drop - using arrow buttons instead

  return (
    <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h2 className="mb-4">
        Companies and Attendees
        <span className="text-red-500 ml-1">*</span>
        <span className="text-sm font-normal text-gray-600 ml-2">(At least one company and attendee required)</span>
      </h2>
      
      <div className="mb-4 flex gap-2 flex-wrap">
        <button className="btn btn-primary" onClick={addCompanyCard}>
          Add Company
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowAddCompany(true)}
        >
          Add New Company
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowAddAttendee(true)}
        >
          Add New Attendee
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companyCards.map((card, index) => (
          <CompanyCardComponent
            key={card.id}
            card={card}
            index={index}
          />
        ))}
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
    </section>
  );
}