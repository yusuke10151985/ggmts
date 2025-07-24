'use client'

import { useState, useCallback } from 'react'
import { getLanguageByCode } from '@/lib/constants'

export interface CopyItem {
  id: string
  text: string
  order: number
  type: 'source' | 'input' | 'output'
  lang?: string
  sourceLanguage?: string
}

interface UseBulkCopyReturn {
  selectedItems: CopyItem[]
  toggleSelection: (item: Omit<CopyItem, 'order'>) => void
  copySelected: () => void
  clearSelection: () => void
  isSelected: (id: string) => boolean
  getSelectionOrder: (id: string) => number | undefined
}

// Multi-language notice texts (same as in translator-app.tsx)
const NOTICE_TEXTS: Record<string, string> = {
  ja: '【ご注意】本出力はAIによる機械翻訳・要約です。内容の正確性は保証されません。ご自身で必ずご確認ください。',
  en: '[Notice] This output is machine-translated/summarized by AI. Accuracy is not guaranteed. Please verify the content yourself.',
  th: '[ข้อควรระวัง] ข้อมูลนี้เป็นผลลัพธ์จากการแปล/สรุปโดย AI ความถูกต้องอาจไม่สมบูรณ์ กรุณาตรวจสอบด้วยตนเอง',
  default: '[Notice] This output is machine-translated/summarized by AI. Accuracy is not guaranteed. Please verify the content yourself.'
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
      if (item.type === 'source' || item.type === 'input') {
        const sourceLanguageName = item.sourceLanguage 
          ? (getLanguageByCode(item.sourceLanguage)?.name || 'Source Text')
          : 'Source Text'
        textToCopy += `--- ${sourceLanguageName} (Original language) ---\n${item.text}\n\n`
      } else if (item.lang) {
        const langName = getLanguageByCode(item.lang)?.name || item.lang
        textToCopy += `--- ${langName} ---\n${NOTICE_TEXTS[item.lang] || NOTICE_TEXTS.default}\n${item.text}\n\n`
      }
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