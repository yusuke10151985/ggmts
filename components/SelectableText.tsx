'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface SelectableTextProps {
  text: string
  type: 'source' | 'input' | 'output'
  lang?: string
  isSelected: boolean
  selectionOrder?: number
  onToggle: () => void
  className?: string
}

export function SelectableText({
  text,
  type,
  lang,
  isSelected,
  selectionOrder,
  onToggle,
  className
}: SelectableTextProps) {
  if (!text || !text.trim()) return null

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg transition-all',
        isSelected && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="mt-1"
          aria-label={`Select ${type} text for copying`}
        />
        
        {isSelected && selectionOrder !== undefined && (
          <span className="text-3xl font-extrabold text-primary ml-2">
            {selectionOrder}
          </span>
        )}
        
        <div className="flex-1 whitespace-pre-wrap break-words overflow-wrap-anywhere">
          {text}
        </div>
      </div>
    </div>
  )
}