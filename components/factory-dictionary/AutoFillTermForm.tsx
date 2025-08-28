'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Loader2, 
  Volume2, 
  Wand2, 
  RefreshCw, 
  Lightbulb,
  Sparkles
} from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { FactoryTerm, Language, Category } from '@/types/factory-dictionary'

interface AutoFillTermFormProps {
  term?: FactoryTerm | null
  onSave: (termData: any) => Promise<void>
  onCancel: () => void
  language: Language
}

export function AutoFillTermForm({ term, onSave, onCancel, language }: AutoFillTermFormProps) {
  const [formData, setFormData] = useState({
    japanese: term?.japanese || '',
    japaneseReading: term?.japaneseReading || '',
    english: term?.english || '',
    thai: term?.thai || '',
    thaiReading: term?.thaiReading || '',
    category: term?.category || Category.General,
    description: term?.description || '',
    safetyNotes: term?.safetyNotes || '',
    tags: term?.tags || [] as string[],
  })

  const [autoExtractEnabled, setAutoExtractEnabled] = useState(true)
  const [userEditingField, setUserEditingField] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [suggestedTerms, setSuggestedTerms] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [lastTranslatedValue, setLastTranslatedValue] = useState<{field: string, value: string} | null>(null)

  // Debounced values for API calls
  const debouncedJapanese = useDebounce(formData.japanese, 500)
  const debouncedEnglish = useDebounce(formData.english, 500)
  const debouncedThai = useDebounce(formData.thai, 500)

  const translateFromJapanese = useCallback(async () => {
    console.log('[AutoFillForm] translateFromJapanese called')
    setIsTranslating(true)
    try {
      const requestBody = {
        action: 'translate',
        text: debouncedJapanese,
        sourceLanguage: 'japanese',
        category: formData.category
      }
      console.log('[AutoFillForm] Request body:', requestBody)
      
      const response = await fetch('/api/factory-dictionary/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      console.log('[AutoFillForm] Response status:', response.status)
      const result = await response.json()
      console.log('[AutoFillForm] Response result:', result)
      
      if (result.success && result.data) {
        console.log('[AutoFillForm] Updating form data with:', result.data)
        setFormData(prev => ({
          ...prev,
          english: result.data.english || prev.english,
          thai: result.data.thai || prev.thai,
          japaneseReading: result.data.japaneseReading || prev.japaneseReading,
          thaiReading: result.data.thaiReading || prev.thaiReading,
        }))
      } else {
        console.error('[AutoFillForm] Translation failed:', result)
      }

      setLastTranslatedValue({ field: 'japanese', value: debouncedJapanese })
    } catch (error) {
      console.error('[AutoFillForm] Translation error:', error)
    } finally {
      setIsTranslating(false)
    }
  }, [debouncedJapanese, formData.category])

  const translateFromEnglish = useCallback(async () => {
    setIsTranslating(true)
    try {
      const response = await fetch('/api/factory-dictionary/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'translate',
          text: debouncedEnglish,
          sourceLanguage: 'english',
          category: formData.category
        }),
      })

      const result = await response.json()
      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          japanese: result.data.japanese || prev.japanese,
          thai: result.data.thai || prev.thai,
          japaneseReading: result.data.japaneseReading || prev.japaneseReading,
          thaiReading: result.data.thaiReading || prev.thaiReading,
        }))
      }

      setLastTranslatedValue({ field: 'english', value: debouncedEnglish })
    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setIsTranslating(false)
    }
  }, [debouncedEnglish, formData.category])

  const translateFromThai = useCallback(async () => {
    setIsTranslating(true)
    try {
      const response = await fetch('/api/factory-dictionary/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'translate',
          text: debouncedThai,
          sourceLanguage: 'thai',
          category: formData.category
        }),
      })

      const result = await response.json()
      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          japanese: result.data.japanese || prev.japanese,
          english: result.data.english || prev.english,
          japaneseReading: result.data.japaneseReading || prev.japaneseReading,
          thaiReading: result.data.thaiReading || prev.thaiReading,
        }))
      }

      setLastTranslatedValue({ field: 'thai', value: debouncedThai })
    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setIsTranslating(false)
    }
  }, [debouncedThai, formData.category])

  // Auto-translate when Japanese input changes
  useEffect(() => {
    if (!autoExtractEnabled || !debouncedJapanese.trim()) return
    if (lastTranslatedValue?.field === 'japanese' && lastTranslatedValue?.value === debouncedJapanese) return
    if (userEditingField !== 'japanese') return

    console.log('[AutoFillForm] Translating from Japanese:', debouncedJapanese)
    translateFromJapanese()
  }, [debouncedJapanese, autoExtractEnabled, userEditingField, lastTranslatedValue, translateFromJapanese])

  // Auto-translate when English input changes
  useEffect(() => {
    if (!autoExtractEnabled || !debouncedEnglish.trim()) return
    if (lastTranslatedValue?.field === 'english' && lastTranslatedValue?.value === debouncedEnglish) return
    if (userEditingField !== 'english') return

    console.log('[AutoFillForm] Translating from English:', debouncedEnglish)
    translateFromEnglish()
  }, [debouncedEnglish, autoExtractEnabled, userEditingField, lastTranslatedValue, translateFromEnglish])

  // Auto-translate when Thai input changes
  useEffect(() => {
    if (!autoExtractEnabled || !debouncedThai.trim()) return
    if (lastTranslatedValue?.field === 'thai' && lastTranslatedValue?.value === debouncedThai) return
    if (userEditingField !== 'thai') return

    console.log('[AutoFillForm] Translating from Thai:', debouncedThai)
    translateFromThai()
  }, [debouncedThai, autoExtractEnabled, userEditingField, lastTranslatedValue, translateFromThai])

  const generateDescription = async () => {
    const primaryText = formData.japanese || formData.english || formData.thai
    if (!primaryText.trim()) return

    setIsGeneratingDescription(true)
    try {
      const sourceLanguage = formData.japanese ? 'japanese' : formData.english ? 'english' : 'thai'
      const response = await fetch('/api/factory-dictionary/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'description',
          text: primaryText,
          sourceLanguage,
          category: formData.category
        }),
      })

      const result = await response.json()
      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          description: result.data
        }))
      }
    } catch (error) {
      console.error('Description generation error:', error)
    } finally {
      setIsGeneratingDescription(false)
    }
  }

  const getSuggestions = async () => {
    const primaryText = formData.japanese || formData.english || formData.thai
    if (!primaryText.trim()) return

    try {
      const sourceLanguage = formData.japanese ? 'japanese' : formData.english ? 'english' : 'thai'
      const response = await fetch('/api/factory-dictionary/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest',
          text: primaryText,
          sourceLanguage
        }),
      })

      const result = await response.json()
      if (result.success && result.data) {
        setSuggestedTerms(result.data)
        setShowSuggestions(true)
      }
    } catch (error) {
      console.error('Suggestion error:', error)
    }
  }

  const generateReading = async (text: string, targetLanguage: 'japanese' | 'thai') => {
    if (!text.trim()) return

    try {
      const response = await fetch('/api/factory-dictionary/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reading',
          text,
          sourceLanguage: targetLanguage
        }),
      })

      const result = await response.json()
      if (result.success && result.data) {
        if (targetLanguage === 'japanese') {
          setFormData(prev => ({
            ...prev,
            japaneseReading: result.data.hiragana || prev.japaneseReading
          }))
        } else {
          setFormData(prev => ({
            ...prev,
            thaiReading: result.data.romanized || prev.thaiReading
          }))
        }
      }
    } catch (error) {
      console.error('Reading generation error:', error)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Auto-extract toggle */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAutoExtractEnabled(!autoExtractEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoExtractEnabled ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-300 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoExtractEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">
              AI Auto-Fill {autoExtractEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTranslating && (
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>AI Processing...</span>
            </div>
          )}
          {autoExtractEnabled && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Auto-translating and generating readings as you type
            </p>
          )}
        </div>
      </div>

      {/* Language input fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Japanese */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="japanese" className="font-medium">Japanese</Label>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-6 w-6"
              onClick={() => generateReading(formData.japanese, 'japanese')}
              disabled={!formData.japanese}
              title="Generate reading"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
          <Input
            id="japanese"
            value={formData.japanese}
            onChange={(e) => setFormData({ ...formData, japanese: e.target.value })}
            onFocus={() => setUserEditingField('japanese')}
            onBlur={() => setUserEditingField(null)}
            placeholder="日本語"
            className="text-lg"
          />
          <Input
            value={formData.japaneseReading}
            onChange={(e) => setFormData({ ...formData, japaneseReading: e.target.value })}
            placeholder="ひらがな (auto-generated)"
            className="text-sm italic text-gray-600 dark:text-gray-400"
          />
        </div>

        {/* English */}
        <div className="space-y-3">
          <Label htmlFor="english" className="font-medium">English</Label>
          <Input
            id="english"
            value={formData.english}
            onChange={(e) => setFormData({ ...formData, english: e.target.value })}
            onFocus={() => setUserEditingField('english')}
            onBlur={() => setUserEditingField(null)}
            placeholder="English"
            className="text-lg"
          />
        </div>

        {/* Thai */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="thai" className="font-medium">Thai</Label>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-6 w-6"
              onClick={() => generateReading(formData.thai, 'thai')}
              disabled={!formData.thai}
              title="Generate reading"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
          <Input
            id="thai"
            value={formData.thai}
            onChange={(e) => setFormData({ ...formData, thai: e.target.value })}
            onFocus={() => setUserEditingField('thai')}
            onBlur={() => setUserEditingField(null)}
            placeholder="ภาษาไทย"
            className="text-lg"
          />
          <Input
            value={formData.thaiReading}
            onChange={(e) => setFormData({ ...formData, thaiReading: e.target.value })}
            placeholder="Thai romanization (auto-generated)"
            className="text-sm italic text-gray-600 dark:text-gray-400"
          />
        </div>

        {/* Category */}
        <div className="space-y-3">
          <Label htmlFor="category" className="font-medium">Category</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value: Category) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(Category).map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description with AI generation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="description" className="font-medium">Description</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={generateDescription}
            disabled={isGeneratingDescription || (!formData.japanese && !formData.english && !formData.thai)}
            className="flex items-center gap-2"
          >
            {isGeneratingDescription ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Wand2 className="h-3 w-3" />
            )}
            AI Generate
          </Button>
        </div>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter description or use AI Generate..."
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Safety Notes */}
      <div className="space-y-3">
        <Label htmlFor="safetyNotes" className="font-medium text-red-600 dark:text-red-400">Safety Notes</Label>
        <Textarea
          id="safetyNotes"
          value={formData.safetyNotes}
          onChange={(e) => setFormData({ ...formData, safetyNotes: e.target.value })}
          placeholder="Enter safety notes if applicable..."
          rows={2}
          className="resize-none border-red-200 focus:border-red-500"
        />
      </div>

      {/* AI Suggestions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="font-medium">Related Terms</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={getSuggestions}
            disabled={!formData.japanese && !formData.english && !formData.thai}
            className="flex items-center gap-2"
          >
            <Lightbulb className="h-3 w-3" />
            Get Suggestions
          </Button>
        </div>
        {showSuggestions && suggestedTerms.length > 0 && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Related factory terms:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedTerms.map((suggestion, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary"
                  className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
                  onClick={() => {
                    // Add logic to use suggestion if needed
                    console.log('Selected suggestion:', suggestion)
                  }}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-4 pt-4">
        <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          {term ? 'Update Term' : 'Add Term'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  )
}