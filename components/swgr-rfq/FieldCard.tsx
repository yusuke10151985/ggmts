'use client'

import React from 'react'
import { RFQFieldData } from '@/types/swgr-rfq'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { GripVertical, X, Edit, AlertCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import MultiInputField from './MultiInputField'

interface FieldCardProps {
  field: RFQFieldData
  updateField: (id: string, value: any) => void
  isAdminMode: boolean
  showHierarchicalId: boolean
  onDelete?: (id: string) => void
  onEdit?: (field: RFQFieldData) => void
}

const FieldCard: React.FC<FieldCardProps> = ({
  field,
  updateField,
  isAdminMode,
  showHierarchicalId,
  onDelete,
  onEdit,
}) => {
  const renderField = () => {
    if (field.isMultipleInput && field.subFields) {
      return (
        <MultiInputField
          field={field}
          updateField={updateField}
        />
      )
    }

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
        return (
          <Input
            type={field.fieldType}
            value={field.currentValue || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.readOnly}
            className={field.justUpdated ? 'ring-2 ring-green-500' : ''}
          />
        )
      
      case 'multiline':
        return (
          <Textarea
            value={field.currentValue || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.readOnly}
            rows={3}
            className={field.justUpdated ? 'ring-2 ring-green-500' : ''}
          />
        )
      
      case 'dropdown':
        const options = field.dropdownOptions?.split(',').map(opt => opt.trim()) || []
        return (
          <Select
            value={field.currentValue || ''}
            onValueChange={(value: string) => updateField(field.id, value)}
            disabled={field.readOnly}
          >
            <SelectTrigger className={field.justUpdated ? 'ring-2 ring-green-500' : ''}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={field.currentValue || false}
              onCheckedChange={(checked) => updateField(field.id, checked)}
              disabled={field.readOnly}
            />
            <Label htmlFor={field.id}>Check to confirm</Label>
          </div>
        )
      
      case 'signature':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Signature field</p>
            {field.currentValue && (
              <p className="mt-2 font-medium">{field.currentValue}</p>
            )}
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <Card className={`relative ${field.justUpdated ? 'animate-pulse' : ''}`}>
      {isAdminMode && (
        <div className="absolute top-2 left-2 cursor-move">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {showHierarchicalId && (
                <Badge variant="outline" className="text-xs">
                  {field.hierarchicalId}
                </Badge>
              )}
              {field.fieldName}
              {field.required && (
                <span className="text-red-500">*</span>
              )}
              {field.helpText && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{field.helpText}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardTitle>
          </div>
          
          {isAdminMode && (
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(field)}
                  className="h-6 w-6"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(field.id)}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {renderField()}
        
        {field.lastModified && (
          <p className="text-xs text-muted-foreground mt-2">
            Last modified: {new Date(field.lastModified).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default FieldCard