"use client"

import React from 'react'

interface AdBannerProps {
  title: string
  className?: string
}

export const AdBanner: React.FC<AdBannerProps> = ({ title, className = '' }) => {
  return (
    <div className={`flex items-center justify-center bg-muted/50 border-2 border-dashed border-border rounded-lg text-muted-foreground ${className}`}>
      <p>{title}</p>
    </div>
  )
} 