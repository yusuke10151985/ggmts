// Type definitions for MOM Manager

import { FileMetadata } from './file';

export interface Company {
  id: string;
  name: string;
  usageCount?: number;
}

export interface Attendee {
  id: string;
  name: string;
  email: string;
  companyId: string;
  usageCount?: number;
}

export interface Translation {
  en: string;
  ja: string;
  th: string;
}

// Alias for Translation to match the service files
export type TranslationSet = Translation;

export type ViewMode = 'normal' | 'matrix';

// Matrix Mode data structure
export interface MatrixRow {
  id: string;
  rowNumber: string; // "1", "1.1", "1.1.1", "1.1.1.1"
  level: 1 | 2 | 3 | 4;
  
  // Content columns
  mainTitle: string;
  subTitle: string;
  subSubTitle: string;
  action: string;
  
  // Metadata columns
  responsible: ResponsibleParty[];
  dueDate: string;
  status: 'open' | 'closed' | '';
  
  // Attachments
  urls: string[];
  attachments: Attachment[];
  
  // Translations
  translations?: Translation;
  
  // Hierarchy helpers
  parentId: string | null;
  hasChildren: boolean;
  depth: number;
  
  // Original structure reference
  structureItemId: string;
}

export interface ResponsibleParty {
  type: 'company' | 'attendee';
  id: string;
  name: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'file' | 'pdf';
  data: string; // Base64 or URL
  annotations?: string; // Base64 of annotated image or PDF
  driveFileId?: string; // **GOOGLE DRIVE**: File ID in Google Drive
  driveUrl?: string; // **GOOGLE DRIVE**: Direct URL to file in Google Drive
  blobUrl?: string; // **VERCEL BLOB**: URL from Vercel Blob storage
  fileName?: string; // **FILE ATTACHMENTS**: Original file name
  fileSize?: number; // **FILE ATTACHMENTS**: File size in bytes
  mimeType?: string; // **FILE ATTACHMENTS**: MIME type
}

export interface StructureItem {
  id: string;
  level: 1 | 2 | 3 | 4;
  number: string; // Deprecated - kept for backward compatibility
  hierarchicalNumber: string; // e.g., "1", "1.1", "1.1.1", "1.1.1.1"
  title: string;
  translations?: Translation;
  children: StructureItem[];
  // **ATTACHMENT SUPPORT**: URLs and attachments for all hierarchy levels
  urls?: string[];
  attachments?: Attachment[];
  // Action-specific fields (only for level 4)
  actionId?: string; // **ACTION ID**: Unique identifier for each action
  responsibleParties?: ResponsibleParty[];
  dueDate?: string;
  status?: 'open' | 'closed';
  // Revision tracking
  lastModifiedRevision?: number;
  originalRevision?: number;
}

export interface TimeSlot {
  country: string;
  timezone: string;
  startTime: string;
  endTime: string;
}

export interface MOM {
  id?: string;
  momId: string;
  revision: number;
  title: string;
  titleTranslations?: Translation; // **TRANSLATION PERSISTENCE**: Store title translations
  goal?: string; // **MEETING GOAL**: Meeting goal/objective
  goalTranslations?: Translation; // **MEETING GOAL TRANSLATION**: Translations for meeting goal
  urls?: string[]; // **MEETING URLS**: URLs associated with the meeting
  date: string;
  companies: Company[];
  attendees: Attendee[];
  structure: StructureItem[];
  status: 'Draft' | 'Officially Issued';
  markedForIssue?: boolean;
  mainTimeSlot?: TimeSlot;
  otherTimeSlots?: TimeSlot[];
  changesSummary?: string;
  timestamp?: string;
  previousRevisionData?: MOM; // Store previous revision for comparison
  baseRevision?: number; // Track the base revision for this MOM
  meetingAttachments?: Attachment[]; // **MEETING ATTACHMENTS**: Files attached to the meeting
  uploadedFiles?: FileMetadata[]; // **VERCEL BLOB**: Files uploaded via Vercel Blob
  createdBy?: string; // **USER TRACKING**: Email of the user who created this MOM
}

export interface MOMListItem {
  momId: string;
  revision: number;
  title: string;
  titleTranslations?: Translation;
  date: string;
  status: string;
  createdBy?: string; // **USER TRACKING**: Email of the user who created this MOM
}

// **TASK MANAGEMENT**: Interface for Actions as Tasks
export interface Task {
  actionId: string;
  momId: string;
  revision: number;
  title: string;
  status: 'open' | 'closed';
  responsibleParties?: string[];
  dueDate?: string;
  createdDate: string;
  lastModified: string;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Context Action types
export type MOMAction =
  | { type: 'SET_MOM_LIST'; payload: MOMListItem[] }
  | { type: 'SET_CURRENT_MOM'; payload: MOM | null }
  | { type: 'UPDATE_MOM_FIELD'; field: keyof MOM; value: any }
  | { type: 'ADD_STRUCTURE_ITEM'; parentId: string | null; item: StructureItem }
  | { type: 'UPDATE_STRUCTURE_ITEM'; id: string; updates: Partial<StructureItem> }
  | { type: 'REMOVE_STRUCTURE_ITEM'; id: string }
  | { type: 'SET_COMPANIES'; payload: Company[] }
  | { type: 'SET_ATTENDEES'; payload: Attendee[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_CURRENT_MOM' }
  | { type: 'SET_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }