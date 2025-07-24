'use client'

import { useState, useCallback } from 'react'

export interface CopyItem {
  id: string
  text: string
  order: number
  type: 'source' | 'input' | 'output'
  lang?: string
}

interface UseBulkCopyReturn {
  selectedItems: CopyItem[]
  toggleSelection: (item: Omit<CopyItem, 'order'>) => void
  copySelected: () => void
  clearSelection: () => void
  isSelected: (id: string) => boolean
  getSelectionOrder: (id: string) => number | undefined
}

export function useBulkCopy(): UseBulkCopyReturn {
  const [selectedItems, setSelectedItems] = useState<CopyItem[]>([])

  const toggleSelection = useCallback((item: Omit<CopyItem, 'order'>) => {
    setSelectedItems(prev => {
      const existingIndex = prev.findIndex(selected => selected.id === item.id)
      
      if (existingIndex !== -1) {
        // Remove item
        return prev.filter(selected => selected.id !== item.id)
      } else {
        // Add item with order
        return [...prev, { ...item, order: prev.length + 1 }]
      }
    })
  }, [])

  const copySelected = useCallback(() => {
    if (selectedItems.length === 0) return

    // Sort by order and concatenate texts
    const sortedItems = [...selectedItems].sort((a, b) => a.order - b.order)
    let textToCopy = ''

    sortedItems.forEach(item => {
      const header = item.type === 'source' 
        ? `--- Original Text ---`
        : item.lang 
          ? `--- ${item.lang} ---`
          : `--- Translation ---`
      
      textToCopy += `${header}\n${item.text}\n\n`
    })

    navigator.clipboard.writeText(textToCopy.trim())
  }, [selectedItems])

  const clearSelection = useCallback(() => {
    setSelectedItems([])
  }, [])

  const isSelected = useCallback((id: string) => {
    return selectedItems.some(item => item.id === id)
  }, [selectedItems])

  const getSelectionOrder = useCallback((id: string) => {
    const item = selectedItems.find(item => item.id === id)
    return item?.order
  }, [selectedItems])

  return {
    selectedItems,
    toggleSelection,
    copySelected,
    clearSelection,
    isSelected,
    getSelectionOrder
  }
}