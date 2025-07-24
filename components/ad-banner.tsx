"use client"

import React from 'react'
import { useSession } from 'next-auth/react'
import { shouldShowAds } from '@/lib/utils/ads'

interface AdBannerProps {
  title: string
  className?: string
}

export const AdBanner: React.FC<AdBannerProps> = ({ title, className = '' }) => {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  
  // Use utility function to determine if ads should be shown
  if (!shouldShowAds(userRole)) {
    return null
  }
  
  return (
    <div className={`flex flex-col items-center justify-center bg-muted/50 border-2 border-dashed border-border rounded-lg text-muted-foreground ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-widest mb-1">Ad</span>
      <p>{title}</p>
    </div>
  )
} 