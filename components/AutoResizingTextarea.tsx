'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface AutoResizingTextareaProps {
  value: string
  onChange: (value: string) => void
  minHeight?: number
  maxHeight?: number
  placeholder?: string
  className?: string
  maxChars?: number
  isOverLimit?: boolean
  disabled?: boolean
}

export function AutoResizingTextarea({
  value,
  onChange,
  minHeight = 100,
  maxHeight = 400,
  placeholder = "Enter text to translate...",
  className,
  maxChars,
  isOverLimit,
  disabled
}: AutoResizingTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Adjust height on value change and other triggers
  useEffect(() => {
    const adjustHeight = () => {
      const textarea = textareaRef.current
      if (!textarea) return
      
      // Store current scroll position
      const scrollPos = textarea.scrollTop
      
      // Reset height to recalculate
      textarea.style.height = 'auto'
      
      // Calculate new height
      const scrollHeight = textarea.scrollHeight
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
      
      // Apply new height
      textarea.style.height = `${newHeight}px`
      
      // Restore scroll position
      textarea.scrollTop = scrollPos
      
      // Show scrollbar only when content exceeds max height
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
    }

    // Initial adjustment and on value change
    adjustHeight()

    // Handle window resize
    const handleResize = () => adjustHeight()
    window.addEventListener('resize', handleResize)
    
    return () => window.removeEventListener('resize', handleResize)
  }, [value, minHeight, maxHeight])
  
  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full",
          "resize-none",
          "p-4",
          "rounded-lg border",
          "bg-background text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          "transition-[height,border-color,box-shadow] duration-200 ease-out",
          "auto-resize-textarea",
          isOverLimit && "border-red-500 focus:ring-red-500",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
          overflowY: 'hidden'
        }}
      />
      
      {maxChars && (
        <div className={cn(
          "absolute bottom-2 right-2 text-xs transition-colors",
          value.length > maxChars * 0.8 && "text-orange-500",
          isOverLimit && "text-red-500"
        )}>
          {value.length} / {maxChars}
        </div>
      )}
    </div>
  )
}