'use client'

import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

interface CollapsibleCategoryProps {
  categoryName: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

const CollapsibleCategory: React.FC<CollapsibleCategoryProps> = ({
  categoryName,
  isExpanded,
  onToggle,
  children,
}) => {
  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="flex items-center gap-2 text-lg font-semibold hover:bg-transparent p-0"
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5" />
        ) : (
          <ChevronRight className="h-5 w-5" />
        )}
        {categoryName}
      </Button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CollapsibleCategory