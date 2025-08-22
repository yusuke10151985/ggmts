'use client';

import { useMOM } from '@/contexts/mom/MOMContext';

export function useLoadingState() {
  const { state } = useMOM();
  const { saving, uploading, loading } = state;
  
  const isAnyLoading = saving || uploading || loading;
  
  return {
    saving,
    uploading,
    loading,
    isAnyLoading,
  };
}