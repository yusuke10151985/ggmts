'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2, X } from 'lucide-react'

interface SyncStatusProps {
  status: 'synced' | 'syncing' | 'error'
}

const SyncStatus: React.FC<SyncStatusProps> = ({ status }) => {
  const statusConfig = {
    synced: {
      icon: <Check className="h-4 w-4" />,
      text: 'Saved',
      variant: 'default' as const,
    },
    syncing: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      text: 'Saving...',
      variant: 'secondary' as const,
    },
    error: {
      icon: <X className="h-4 w-4" />,
      text: 'Error',
      variant: 'destructive' as const,
    },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      {config.text}
    </Badge>
  )
}

export default SyncStatus