'use client'

import React from 'react'
import { RFQFieldData, SubField } from '@/types/swgr-rfq'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface MultiInputFieldProps {
  field: RFQFieldData
  updateField: (id: string, value: any) => void
}

const MultiInputField: React.FC<MultiInputFieldProps> = ({ field, updateField }) => {
  const handleSubFieldChange = (subFieldId: string, value: string) => {
    const currentValue = field.currentValue || {}
    const updatedValue = { ...currentValue, [subFieldId]: value }
    updateField(field.id, updatedValue)
  }

  if (!field.subFields) return null

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-0 space-y-3">
        {field.subFields.map((subField: SubField) => (
          <div key={subField.id} className="space-y-1">
            <Label htmlFor={`${field.id}-${subField.id}`} className="text-xs">
              {subField.label}
              {subField.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            
            {subField.type === 'dropdown' && subField.dropdownOptions ? (
              <Select
                value={field.currentValue?.[subField.id] || ''}
                onValueChange={(value: string) => handleSubFieldChange(subField.id, value)}
              >
                <SelectTrigger id={`${field.id}-${subField.id}`} className="h-8">
                  <SelectValue placeholder={subField.placeholder || 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  {subField.dropdownOptions.split(',').map((option) => (
                    <SelectItem key={option.trim()} value={option.trim()}>
                      {option.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={`${field.id}-${subField.id}`}
                type={subField.type}
                value={field.currentValue?.[subField.id] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSubFieldChange(subField.id, e.target.value)}
                placeholder={subField.placeholder}
                className="h-8"
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default MultiInputField