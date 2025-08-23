'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { MOM, MOMListItem, Company, Attendee, StructureItem, MOMAction, ViewMode } from '@/types/mom';
import { renumberStructure, addAndRenumber, removeAndRenumber, updateAndRenumber, ensureHierarchicalNumbers } from '@/lib/mom/renumber-structure';
import { getTodayDate, getDefaultTimeSlot } from '@/utils/mom/date-helpers';

interface MOMUser {
  id: string;
  email: string | null;
  role: string;
}

interface MOMState {
  momList: MOMListItem[];
  currentMOM: MOM | null;
  companies: Company[];
  attendees: Attendee[];
  loading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean; // **UNSAVED CHANGES TRACKING**: Track if MOM has been modified
  saving: boolean; // **SAVING STATE**: Track when saving to prevent other operations
  uploading: boolean; // **UPLOADING STATE**: Track when uploading files
  viewMode: ViewMode; // **VIEW MODE**: Track current view mode (normal/matrix)
  user: MOMUser | null; // **USER INFO**: Current user information
}

const initialState: MOMState = {
  momList: [],
  currentMOM: null,
  companies: [],
  attendees: [],
  loading: false,
  error: null,
  hasUnsavedChanges: false,
  saving: false,
  uploading: false,
  viewMode: 'normal', // **VIEW MODE**: Default to normal view
  user: null, // **USER INFO**: Initialize as null
};

const MOMContext = createContext<{
  state: MOMState;
  dispatch: React.Dispatch<MOMAction>;
} | undefined>(undefined);

// Helper function to update nested structure items
const updateStructureItem = (
  items: StructureItem[],
  id: string,
  updates: Partial<StructureItem>
): StructureItem[] => {
  return updateAndRenumber(items, id, updates);
};

// Helper function to remove structure item
const removeStructureItem = (items: StructureItem[], id: string): StructureItem[] => {
  return removeAndRenumber(items, id);
};

// Helper function to add structure item
const addStructureItem = (
  items: StructureItem[],
  parentId: string | null,
  newItem: StructureItem
): StructureItem[] => {
  // Initialize hierarchical number for new items
  const itemWithNumber = {
    ...newItem,
    hierarchicalNumber: newItem.hierarchicalNumber || '',
  };
  return addAndRenumber(items, parentId, itemWithNumber);
};

function momReducer(state: MOMState, action: MOMAction): MOMState {
  switch (action.type) {
    case 'SET_MOM_LIST':
      // **FIX FLICKERING**: Update MOM list without clearing existing data first
      return { ...state, momList: action.payload, loading: false };
      
    case 'SET_CURRENT_MOM':
      // **UNSAVED CHANGES**: Reset when loading a new MOM
      // Ensure hierarchical numbers exist when loading a MOM
      if (action.payload) {
        console.log('[MOMContext] Setting current MOM:', {
          momId: action.payload.momId,
          revision: action.payload.revision,
          title: action.payload.title,
          goal: action.payload.goal,
          date: action.payload.date,
          companiesCount: action.payload.companies?.length || 0,
          attendeesCount: action.payload.attendees?.length || 0,
          hasMainTimeSlot: !!action.payload.mainTimeSlot
        });
      }
      
      const momWithNumbers = action.payload ? {
        ...action.payload,
        structure: ensureHierarchicalNumbers(action.payload.structure || [])
      } : null;
      return { ...state, currentMOM: momWithNumbers, hasUnsavedChanges: false };
      
    case 'UPDATE_MOM_FIELD':
      if (!state.currentMOM) return state;
      // If updating structure field, ensure hierarchical numbers are maintained
      const updatedValue = action.field === 'structure' 
        ? renumberStructure(action.value)
        : action.value;
      return {
        ...state,
        currentMOM: {
          ...state.currentMOM,
          [action.field]: updatedValue,
        },
        hasUnsavedChanges: true, // **UNSAVED CHANGES**: Mark as modified
      };
      
    case 'ADD_STRUCTURE_ITEM':
      if (!state.currentMOM) return state;
      return {
        ...state,
        currentMOM: {
          ...state.currentMOM,
          structure: addStructureItem(
            state.currentMOM.structure,
            action.parentId,
            action.item
          ),
        },
        hasUnsavedChanges: true, // **UNSAVED CHANGES**: Mark as modified
      };
      
    case 'UPDATE_STRUCTURE_ITEM':
      if (!state.currentMOM) return state;
      return {
        ...state,
        currentMOM: {
          ...state.currentMOM,
          structure: updateStructureItem(
            state.currentMOM.structure,
            action.id,
            action.updates
          ),
        },
        hasUnsavedChanges: true, // **UNSAVED CHANGES**: Mark as modified
      };
      
    case 'REMOVE_STRUCTURE_ITEM':
      if (!state.currentMOM) return state;
      return {
        ...state,
        currentMOM: {
          ...state.currentMOM,
          structure: removeStructureItem(state.currentMOM.structure, action.id),
        },
      };
      
    case 'SET_COMPANIES':
      return { ...state, companies: action.payload };
      
    case 'SET_ATTENDEES':
      return { ...state, attendees: action.payload };
      
    case 'SET_LOADING':
      // **FIX FLICKERING**: Don't reset loading state if we already have data
      // This prevents UI from jumping when refreshing
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_UNSAVED_CHANGES':
      // **UNSAVED CHANGES**: Set flag directly
      return { ...state, hasUnsavedChanges: action.payload };
      
    case 'SET_SAVING':
      // **SAVING STATE**: Set saving flag
      return { ...state, saving: action.payload };
      
    case 'SET_UPLOADING':
      // **UPLOADING STATE**: Set uploading flag
      return { ...state, uploading: action.payload };
      
    case 'SET_VIEW_MODE':
      // **VIEW MODE**: Set view mode
      return { ...state, viewMode: action.payload };
      
    case 'RESET_CURRENT_MOM':
      return {
        ...state,
        currentMOM: {
          momId: 'New MOM',
          revision: 0, // Always start with Rev.0 for new MOMs
          title: '',
          goal: '', // Initialize empty goal
          date: getTodayDate(), // Default to today's date
          mainTimeSlot: getDefaultTimeSlot(), // Default time slot with current hour
          companies: [],
          attendees: [],
          structure: [],
          status: 'Draft',
          meetingAttachments: [], // **MEETING ATTACHMENTS**: Initialize empty array
        },
      };
      
    default:
      return state;
  }
}

export function MOMProvider({ children, user }: { children: ReactNode; user?: MOMUser | null }) {
  const [state, dispatch] = useReducer(momReducer, { ...initialState, user: user || null });

  return (
    <MOMContext.Provider value={{ state, dispatch }}>
      {children}
    </MOMContext.Provider>
  );
}

export function useMOM() {
  const context = useContext(MOMContext);
  if (context === undefined) {
    throw new Error('useMOM must be used within a MOMProvider');
  }
  return context;
}