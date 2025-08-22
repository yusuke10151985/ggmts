// Validation utilities for MOM fields

import { MOM } from '@/types/mom';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates required fields for MOM
 * @param mom - The MOM to validate
 * @returns Array of validation errors
 */
export function validateRequiredFields(mom: MOM): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // **必須フィールド 1**: Meeting Title
  if (!mom.title || mom.title.trim() === '') {
    errors.push({
      field: 'title',
      message: 'Meeting Title is required'
    });
  }
  
  // **必須フィールド 2**: Meeting Goal
  if (!mom.goal || mom.goal.trim() === '') {
    errors.push({
      field: 'goal',
      message: 'Meeting Goal is required'
    });
  }
  
  // Note: Meeting Date, Time, Companies, and Attendees are NOT required
  // They have default values or can be left empty
  
  return errors;
}

/**
 * Formats validation errors into a user-friendly message
 * @param errors - Array of validation errors
 * @returns Formatted error message
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';
  
  const header = 'Please fill in the following required fields:\n\n';
  const errorList = errors.map((error, index) => `${index + 1}. ${error.message}`).join('\n');
  
  return header + errorList;
}