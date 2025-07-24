'use client'

import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface TranslationModeToggleProps {
  onModeChange?: (isRealTime: boolean) => void
}

export function TranslationModeToggle({ onModeChange }: TranslationModeToggleProps) {
  const [isRealTime, setIsRealTime] = useState(false)

  useEffect(() => {
    const savedMode = localStorage.getItem('translationMode')
    const isRealTimeMode = savedMode === 'realtime'
    setIsRealTime(isRealTimeMode)
    onModeChange?.(isRealTimeMode)
  }, [])

  const handleModeChange = (checked: boolean) => {
    setIsRealTime(checked)
    localStorage.setItem('translationMode', checked ? 'realtime' : 'normal')
    onModeChange?.(checked)
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="translation-mode"
        checked={isRealTime}
        onCheckedChange={handleModeChange}
      />
      <Label htmlFor="translation-mode" className="text-sm font-medium">
        {isRealTime ? 'リアルタイムモード' : '通常モード'}
      </Label>
    </div>
  )
}