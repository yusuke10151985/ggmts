'use client'

import React, { useState } from 'react'
import { Expand, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TermImage {
  id?: string
  image_url: string
  caption?: string
  order_index?: number
}

interface TermImageGalleryProps {
  images: TermImage[]
  termName: string
  className?: string
}

export function TermImageGallery({ images, termName, className = '' }: TermImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  
  if (!images || images.length === 0) {
    return null
  }

  const sortedImages = images.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index)
  }

  const closeLightbox = () => {
    setSelectedImageIndex(null)
  }

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return
    
    if (direction === 'prev') {
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : sortedImages.length - 1)
    } else {
      setSelectedImageIndex(selectedImageIndex < sortedImages.length - 1 ? selectedImageIndex + 1 : 0)
    }
  }

  return (
    <>
      <div className={`grid gap-4 ${sortedImages.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} ${className}`}>
        {sortedImages.map((image, index) => (
          <div key={image.id || index} className="relative group">
            <div className="relative overflow-hidden rounded-lg shadow-md bg-gray-100">
              <img
                src={image.image_url}
                alt={image.caption || `${termName} image ${index + 1}`}
                className="w-full h-48 object-cover cursor-pointer transition-transform group-hover:scale-105"
                loading="lazy"
                onClick={() => openLightbox(index)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/placeholder-image.svg'
                }}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <Expand className="text-white opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 drop-shadow-lg" />
              </div>
            </div>
            {image.caption && (
              <p className="mt-2 text-sm text-gray-600 text-center px-2">
                {image.caption}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <Dialog open={selectedImageIndex !== null} onOpenChange={() => closeLightbox()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>{termName} Image Gallery</DialogTitle>
          </DialogHeader>
          
          {selectedImageIndex !== null && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 h-8 w-8 bg-black/20 hover:bg-black/40 text-white"
                onClick={closeLightbox}
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="flex items-center justify-center">
                <img
                  src={sortedImages[selectedImageIndex].image_url}
                  alt={sortedImages[selectedImageIndex].caption || `${termName} image`}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/placeholder-image.svg'
                  }}
                />
              </div>

              {sortedImages[selectedImageIndex].caption && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg inline-block">
                    {sortedImages[selectedImageIndex].caption}
                  </p>
                </div>
              )}

              {sortedImages.length > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigateImage('prev')}
                    className="flex-1 mr-2"
                  >
                    Previous
                  </Button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    {selectedImageIndex + 1} / {sortedImages.length}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => navigateImage('next')}
                    className="flex-1 ml-2"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}