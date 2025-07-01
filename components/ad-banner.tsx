"use client"

import React from 'react'

interface AdBannerProps {
  title: string
  className?: string
}

export const AdBanner: React.FC<AdBannerProps> = ({ title, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center bg-muted/50 border-2 border-dashed border-border rounded-lg text-muted-foreground ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-widest mb-1">Ad</span>
      <p>{title}</p>
    </div>
  )
} 