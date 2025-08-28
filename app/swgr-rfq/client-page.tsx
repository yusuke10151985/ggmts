'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { RFQFieldData, PageType } from '@/types/swgr-rfq'
import { Button } from '@/components/ui/button'
import DraggableFieldGrid from '@/components/swgr-rfq/DraggableFieldGrid'
import { Progress } from '@/components/ui/progress'
import ThemeToggle from '@/components/swgr-rfq/ThemeToggle'
import { 
  SaveIcon, SendIcon, LayoutListIcon, Grid2X2, Grid3X3, GripVertical, 
  Search, RotateCcw, FileText, Settings, ChevronRight, ChevronLeft, 
  AlertCircle, Check, Edit, Eye, Plus, Upload 
} from 'lucide-react'
import { RFQ_COMPLETE_FIELDS_WITH_HIERARCHY } from '@/data/swgr-rfq-fields'
import SyncStatus from '@/components/swgr-rfq/SyncStatus'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ControlPanel from '@/components/swgr-rfq/ControlPanel'
import CollapsibleCategory from '@/components/swgr-rfq/CollapsibleCategory'
import { AnimatePresence, motion } from 'framer-motion'
import MultiInputField from '@/components/swgr-rfq/MultiInputField'

const SWGRRFQClient: React.FC = () => {
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [fields, setFields] = useState<RFQFieldData[]>(() => {
    const saved = localStorage.getItem('swgr-rfq-form-config')
    if (saved) {
      try {
        const formData = JSON.parse(saved)
        return formData.items.map((f: RFQFieldData) => {
          if (f.id === 'cover_3' && f.fieldType === 'date' && !f.currentValue) {
            return { ...f, currentValue: getTodayDate() }
          }
          return f
        })
      } catch (e) {
        console.error('Failed to load saved configuration:', e)
      }
    }
    return RFQ_COMPLETE_FIELDS_WITH_HIERARCHY.map(f => {
      if (f.id === 'cover_3' && f.fieldType === 'date') {
        return { ...f, currentValue: getTodayDate() }
      }
      return { ...f, currentValue: f.currentValue ?? '' }
    })
  })

  const [isAdminMode, setIsAdminMode] = useState<boolean>(false)
  const [gridColumns, setGridColumns] = useState<number>(3)
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced')
  const [searchTerm, setSearchTerm] = useState('')
  const [showHierarchicalIds, setShowHierarchicalIds] = useState(true)
  const [hasOrderChanged, setHasOrderChanged] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageType>('1.0 Basic Information')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [fieldToEdit, setFieldToEdit] = useState<RFQFieldData | null>(null)
  const [editedField, setEditedField] = useState<RFQFieldData | null>(null)
  const [showSaveNotification, setShowSaveNotification] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [collapseState, setCollapseState] = useState<{[key: string]: boolean}>(() => {
    try {
      const saved = localStorage.getItem('rfq-category-collapse-state')
      if (saved) {
        return JSON.parse(saved).expandedCategories || {}
      }
    } catch(e) {
      console.error("Failed to parse collapse state from localStorage", e)
    }
    const defaultState: {[key: string]: boolean} = {}
    const categories = new Set(fields.filter(f => f.categoryName).map(f => f.categoryName!))
    categories.forEach(cat => defaultState[cat] = true)
    return defaultState
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      setFields(currentFields =>
        currentFields.map(f => (f.justUpdated ? { ...f, justUpdated: false } : f))
      )
    }, 1500)
    return () => clearTimeout(timer)
  }, [fields])

  const filteredFields = useMemo(() => {
    if (!searchTerm) return fields.filter(f => f.pageName === currentPage)
    return fields.filter(f => 
      f.pageName === currentPage &&
      (f.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       f.categoryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       f.id.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [fields, searchTerm, currentPage])

  const categorizedFields = useMemo(() => {
    const categories = new Map<string, RFQFieldData[]>()
    const uncategorized: RFQFieldData[] = []
    
    filteredFields.forEach(field => {
      if (field.categoryName) {
        const existing = categories.get(field.categoryName) || []
        existing.push(field)
        categories.set(field.categoryName, existing)
      } else {
        uncategorized.push(field)
      }
    })
    
    const sortedCategories = Array.from(categories.entries()).sort((a, b) => {
      const extractNumber = (cat: string) => {
        const match = cat.match(/^(\d+\.\d+)/)
        return match ? parseFloat(match[1]) : 999
      }
      return extractNumber(a[0]) - extractNumber(b[0])
    })
    
    return { categories: sortedCategories, uncategorized }
  }, [filteredFields])

  const updateField = (id: string, value: any) => {
    setFields(prevFields =>
      prevFields.map(field =>
        field.id === id
          ? {
              ...field,
              currentValue: value,
              lastModified: new Date().toISOString(),
              modifiedBy: 'current-user@example.com',
              justUpdated: true,
            }
          : field
      )
    )
    setSyncStatus('syncing')
    setTimeout(() => setSyncStatus('synced'), 1000)
  }

  const reorderFields = (newOrder: RFQFieldData[]) => {
    const updatedFields = fields.map(field => {
      const newField = newOrder.find(f => f.id === field.id)
      if (newField) {
        return { ...field, currentIndex: newField.currentIndex }
      }
      return field
    })
    setFields(updatedFields)
    setHasOrderChanged(true)
  }

  const deleteField = (id: string) => {
    setFields(prevFields => prevFields.filter(field => field.id !== id))
    setDeleteDialogOpen(false)
    setFieldToDelete(null)
  }

  const resetToDefaults = () => {
    const defaultFields = RFQ_COMPLETE_FIELDS_WITH_HIERARCHY.map(f => {
      if (f.id === 'cover_3' && f.fieldType === 'date') {
        return { ...f, currentValue: getTodayDate() }
      }
      return { ...f, currentValue: f.currentValue ?? '' }
    })
    setFields(defaultFields)
    setHasOrderChanged(false)
    setIsResetDialogOpen(false)
    localStorage.removeItem('swgr-rfq-form-config')
  }

  const saveConfiguration = () => {
    const config = {
      items: fields,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
    localStorage.setItem('swgr-rfq-form-config', JSON.stringify(config))
    setShowSaveNotification(true)
    setTimeout(() => setShowSaveNotification(false), 3000)
  }

  const exportConfiguration = () => {
    const config = {
      items: fields,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `swgr-rfq-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importConfiguration = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string)
        if (config.items && Array.isArray(config.items)) {
          setFields(config.items)
          saveConfiguration()
        }
      } catch (error) {
        console.error('Failed to import configuration:', error)
      }
    }
    reader.readAsText(file)
  }

  const openEditDialog = (field: RFQFieldData) => {
    setFieldToEdit(field)
    setEditedField({ ...field })
    setEditDialogOpen(true)
  }

  const saveEditedField = () => {
    if (editedField) {
      setFields(prevFields =>
        prevFields.map(field =>
          field.id === editedField.id ? editedField : field
        )
      )
    }
    setEditDialogOpen(false)
    setFieldToEdit(null)
    setEditedField(null)
  }

  const toggleCollapseState = (categoryName: string) => {
    setCollapseState(prev => {
      const newState = { ...prev, [categoryName]: !prev[categoryName] }
      localStorage.setItem('rfq-category-collapse-state', JSON.stringify({ expandedCategories: newState }))
      return newState
    })
  }

  const completedFields = fields.filter(f => f.currentValue && f.currentValue !== '').length
  const totalFields = fields.length
  const completionPercentage = Math.round((completedFields / totalFields) * 100)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">SWGR RFQ Dynamic Form</h1>
              <p className="text-muted-foreground mt-1">
                Fill out the required information for your switchgear request for quotation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SyncStatus status={syncStatus} />
              <ThemeToggle />
            </div>
          </div>

          <div className="flex items-center justify-between bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Progress: {completedFields} / {totalFields} fields completed
              </div>
              <Progress value={completionPercentage} className="w-32" />
              <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'}>
                {completionPercentage}%
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportConfiguration}>
                <SaveIcon className="mr-2 h-4 w-4" />
                Export
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={importConfiguration}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button variant="default" size="sm" onClick={saveConfiguration}>
                <SaveIcon className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </div>

        <ControlPanel
          isAdminMode={isAdminMode}
          setIsAdminMode={setIsAdminMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showHierarchicalIds={showHierarchicalIds}
          setShowHierarchicalIds={setShowHierarchicalIds}
          gridColumns={gridColumns}
          setGridColumns={setGridColumns}
          hasOrderChanged={hasOrderChanged}
          setIsResetDialogOpen={setIsResetDialogOpen}
        />

        <Tabs value={currentPage} onValueChange={(value: string) => setCurrentPage(value as PageType)} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="1.0 Basic Information">
              <FileText className="mr-2 h-4 w-4" />
              Basic Information
            </TabsTrigger>
            <TabsTrigger value="2.0 Technical Specs">
              <Settings className="mr-2 h-4 w-4" />
              Technical Specifications
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-6">
          {categorizedFields.categories.map(([categoryName, categoryFields]) => (
            <CollapsibleCategory
              key={categoryName}
              categoryName={categoryName}
              isExpanded={collapseState[categoryName] ?? true}
              onToggle={() => toggleCollapseState(categoryName)}
            >
              <DraggableFieldGrid
                fields={categoryFields}
                updateField={updateField}
                reorderFields={reorderFields}
                isAdminMode={isAdminMode}
                gridColumns={gridColumns}
                showHierarchicalIds={showHierarchicalIds}
                onDelete={(id) => {
                  setFieldToDelete(id)
                  setDeleteDialogOpen(true)
                }}
                onEdit={openEditDialog}
              />
            </CollapsibleCategory>
          ))}

          {categorizedFields.uncategorized.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Uncategorized</h3>
              <DraggableFieldGrid
                fields={categorizedFields.uncategorized}
                updateField={updateField}
                reorderFields={reorderFields}
                isAdminMode={isAdminMode}
                gridColumns={gridColumns}
                showHierarchicalIds={showHierarchicalIds}
                onDelete={(id) => {
                  setFieldToDelete(id)
                  setDeleteDialogOpen(true)
                }}
                onEdit={openEditDialog}
              />
            </div>
          )}
        </div>

        <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset to Default Configuration?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all fields to their default values and restore the original order. 
                Any custom configurations will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetToDefaults}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Field?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this field? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => fieldToDelete && deleteField(fieldToDelete)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Field Configuration</DialogTitle>
              <DialogDescription>
                Modify the field properties below
              </DialogDescription>
            </DialogHeader>
            {editedField && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="field-name">Field Name</Label>
                  <Input
                    id="field-name"
                    value={editedField.fieldName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedField({ ...editedField, fieldName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="placeholder">Placeholder</Label>
                  <Input
                    id="placeholder"
                    value={editedField.placeholder || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedField({ ...editedField, placeholder: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="required"
                    checked={editedField.required || false}
                    onCheckedChange={(checked) => setEditedField({ ...editedField, required: checked })}
                  />
                  <Label htmlFor="required">Required Field</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveEditedField}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AnimatePresence>
          {showSaveNotification && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Configuration saved successfully
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default SWGRRFQClient