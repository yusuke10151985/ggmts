'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Search, LayoutList, Grid2X2, Grid3X3, RotateCcw } from 'lucide-react'

interface ControlPanelProps {
  isAdminMode: boolean
  setIsAdminMode: (value: boolean) => void
  searchTerm: string
  setSearchTerm: (value: string) => void
  showHierarchicalIds: boolean
  setShowHierarchicalIds: (value: boolean) => void
  gridColumns: number
  setGridColumns: (value: number) => void
  hasOrderChanged: boolean
  setIsResetDialogOpen: (value: boolean) => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isAdminMode,
  setIsAdminMode,
  searchTerm,
  setSearchTerm,
  showHierarchicalIds,
  setShowHierarchicalIds,
  gridColumns,
  setGridColumns,
  hasOrderChanged,
  setIsResetDialogOpen,
}) => {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search fields..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="admin-mode"
              checked={isAdminMode}
              onCheckedChange={setIsAdminMode}
            />
            <Label htmlFor="admin-mode">Admin Mode</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="show-ids"
              checked={showHierarchicalIds}
              onCheckedChange={setShowHierarchicalIds}
            />
            <Label htmlFor="show-ids">Show IDs</Label>
          </div>
          
          <ToggleGroup
            type="single"
            value={gridColumns.toString()}
            onValueChange={(value) => value && setGridColumns(parseInt(value))}
          >
            <ToggleGroupItem value="1" aria-label="Single column">
              <LayoutList className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="2" aria-label="Two columns">
              <Grid2X2 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="3" aria-label="Three columns">
              <Grid3X3 className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          
          {hasOrderChanged && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetDialogOpen(true)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Order
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ControlPanel