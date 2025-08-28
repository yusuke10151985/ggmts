'use client'

import React from 'react'
import { RFQFieldData } from '@/types/swgr-rfq'
import FieldCard from './FieldCard'
import { motion, AnimatePresence } from 'framer-motion'

interface DraggableFieldGridProps {
  fields: RFQFieldData[]
  updateField: (id: string, value: any) => void
  reorderFields: (newOrder: RFQFieldData[]) => void
  isAdminMode: boolean
  gridColumns: number
  showHierarchicalIds: boolean
  onDelete?: (id: string) => void
  onEdit?: (field: RFQFieldData) => void
}

const DraggableFieldGrid: React.FC<DraggableFieldGridProps> = ({
  fields,
  updateField,
  reorderFields,
  isAdminMode,
  gridColumns,
  showHierarchicalIds,
  onDelete,
  onEdit,
}) => {
  const [draggedItem, setDraggedItem] = React.useState<RFQFieldData | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, field: RFQFieldData) => {
    setDraggedItem(field)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (!isAdminMode) return
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (!isAdminMode || !draggedItem) return

    const newFields = [...fields]
    const draggedIndex = fields.findIndex(f => f.id === draggedItem.id)
    
    if (draggedIndex !== dropIndex) {
      newFields.splice(draggedIndex, 1)
      newFields.splice(dropIndex, 0, draggedItem)
      
      const updatedFields = newFields.map((field, index) => ({
        ...field,
        currentIndex: index
      }))
      
      reorderFields(updatedFields)
    }
    
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  const gridClass = `grid gap-4 ${
    gridColumns === 1 ? 'grid-cols-1' : 
    gridColumns === 2 ? 'grid-cols-1 md:grid-cols-2' : 
    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  }`

  return (
    <div className={gridClass}>
      <AnimatePresence>
        {fields.map((field, index) => (
          <motion.div
            key={field.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            draggable={isAdminMode}
            onDragStart={(e) => handleDragStart(e as any, field)}
            onDragOver={(e) => handleDragOver(e as any, index)}
            onDrop={(e) => handleDrop(e as any, index)}
            className={`${
              dragOverIndex === index ? 'ring-2 ring-primary ring-offset-2' : ''
            } ${isAdminMode ? 'cursor-move' : ''}`}
          >
            <FieldCard
              field={field}
              updateField={updateField}
              isAdminMode={isAdminMode}
              showHierarchicalId={showHierarchicalIds}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default DraggableFieldGrid