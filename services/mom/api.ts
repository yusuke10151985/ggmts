// API service for communicating with backend

import { APIResponse, MOM, MOMListItem, Company, Attendee, Translation } from '@/types/mom';

/**
 * Makes a GET request to the API
 */
async function apiGet<T = any>(endpoint: string, params?: Record<string, any>): Promise<APIResponse<T>> {
  try {
    const url = new URL(endpoint, window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store', // **REAL-TIME FIX**: Disable caching
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
    });
    
    const data = await response.json();
    
    // **エラーレスポンス処理**: サーバーからのエラーメッセージを適切に処理
    if (!response.ok) {
      // サーバーがエラーレスポンスを返した場合、その内容を使用
      if (data.error) {
        console.error('Server error:', data);
        return {
          success: false,
          error: data.error,
          ...data // エラーの詳細情報も含める
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API GET error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Makes a POST request to the API
 */
async function apiPost<T = any>(endpoint: string, data?: any): Promise<APIResponse<T>> {
  try {
    const url = new URL(endpoint, window.location.origin);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    // **エラーレスポンス処理**: サーバーからのエラーメッセージを適切に処理
    if (!response.ok) {
      // サーバーがエラーレスポンスを返した場合、その内容を使用
      if (result.error) {
        console.error('Server error:', result);
        return {
          success: false,
          error: result.error,
          ...result // エラーの詳細情報も含める
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error('API POST error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// API Methods

/**
 * Fetches the list of all MOMs
 * **REAL-TIME FIX**: Add cache-busting to ensure fresh data
 */
export async function getMOMList(): Promise<APIResponse<MOMListItem[]>> {
  // Add timestamp to prevent caching
  const timestamp = new Date().getTime();
  return apiGet<MOMListItem[]>(`/api/mom/list?t=${timestamp}`);
}

/**
 * Loads a specific MOM for editing
 */
export async function loadMOM(momId: string, revision: number): Promise<APIResponse<MOM>> {
  const response = await apiGet<MOM>(`/api/mom/${momId}-${revision}`);
  
  if (response.success && response.data) {
    console.log('[API Service] Loaded MOM - DETAILED CLIENT SIDE:', {
      momId: response.data.momId,
      revision: response.data.revision,
      title: `"${response.data.title || ''}"`,
      titleLength: response.data.title?.length || 0,
      titleTranslations: response.data.titleTranslations,
      goal: `"${response.data.goal || ''}"`,
      goalLength: response.data.goal?.length || 0,
      goalTranslations: response.data.goalTranslations,
      date: `"${response.data.date || ''}"`,
      mainTimeSlot: response.data.mainTimeSlot,
      companies: response.data.companies?.slice(0, 2),
      attendees: response.data.attendees?.slice(0, 2),
      structure: response.data.structure?.slice(0, 2)
    });
  } else {
    console.error('[API Service] Failed to load MOM:', response.error);
  }
  
  return response;
}

/**
 * Saves or updates a MOM
 * @param mom - The MOM data to save
 * @param isDraft - true for Save Draft (no revision increment), false for Officially Issue
 */
export async function saveMOM(mom: MOM, isDraft: boolean): Promise<APIResponse<{
  momId: string;
  revision: number;
  status: string;
  message: string;
}>> {
  return apiPost('/api/mom/save', {
    mom,
    isDraft,
  });
}

/**
 * **DELETE MOM**: Deletes a specific MOM record
 */
export async function deleteMOM(momId: string, revision: number): Promise<APIResponse<void>> {
  return apiPost(`/api/mom/delete`, { momId, revision });
}

/**
 * Gets the list of companies
 */
export async function getCompanies(): Promise<APIResponse<Company[]>> {
  return apiGet<Company[]>('/api/companies');
}

/**
 * **ADD NEW COMPANY**: Creates a new company
 * @param name - The company name
 */
export async function createCompany(name: string): Promise<APIResponse<Company>> {
  return apiPost<Company>('/api/companies', { name });
}

/**
 * Gets the list of attendees, optionally filtered by company
 */
export async function getAttendees(companyId?: string): Promise<APIResponse<Attendee[]>> {
  return apiGet<Attendee[]>('/api/attendees', companyId ? { companyId } : undefined);
}

/**
 * **ADD NEW ATTENDEE**: Creates a new attendee linked to a company
 * @param data - The attendee data including name, email, and companyId
 */
export async function createAttendee(data: {
  name: string;
  email: string;
  companyId: string;
}): Promise<APIResponse<Attendee>> {
  return apiPost<Attendee>('/api/attendees', data);
}

/**
 * Performs translation using Gemini AI (via GAS)
 */
export async function translateText(text: string, sourceLang: string = 'auto'): Promise<APIResponse<Translation> & { detectedLanguage?: string }> {
  return apiPost<Translation>('/api/translate', {
    text,
    sourceLang,
  }) as Promise<APIResponse<Translation> & { detectedLanguage?: string }>;
}

/**
 * Gets error logs from the system
 */
export async function getErrorLogs(): Promise<APIResponse<any[]>> {
  return apiGet('/api/logs');
}

/**
 * Clears error logs
 */
export async function clearErrorLogs(): Promise<APIResponse<void>> {
  return apiPost('/api/logs/clear');
}

/**
 * Gets the spreadsheet URL
 */
export async function getSpreadsheetUrl(): Promise<APIResponse<{ url: string }>> {
  return apiGet<{ url: string }>('/api/spreadsheet-url');
}

/**
 * Exports MOM to PDF (returns base64)
 */
export async function exportMOMToPDF(mom: MOM): Promise<APIResponse<{ pdf: string }>> {
  return apiPost<{ pdf: string }>('/api/export/pdf', { mom });
}

/**
 * Exports MOM to Markdown
 */
export async function exportMOMToMarkdown(mom: MOM): Promise<APIResponse<{ markdown: string }>> {
  return apiPost<{ markdown: string }>('/api/export/markdown', { mom });
}