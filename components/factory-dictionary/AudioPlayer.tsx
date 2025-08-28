'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Volume2, VolumeX, Loader2 } from 'lucide-react'

interface AudioPlayerProps {
  text: string
  language: 'ja' | 'en' | 'th'
  audioUrl?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function AudioPlayer({ 
  text, 
  language, 
  audioUrl, 
  className = '',
  size = 'md' 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    // Check if Web Speech API is available
    if (typeof window !== 'undefined' && !window.speechSynthesis) {
      setIsSupported(false)
    }
  }, [])

  const getVoice = () => {
    if (!window.speechSynthesis) return null
    
    const voices = window.speechSynthesis.getVoices()
    
    // Try to find native voice for the language
    const languageMap: Record<string, string[]> = {
      'ja': ['ja-JP', 'ja'],
      'en': ['en-US', 'en-GB', 'en'],
      'th': ['th-TH', 'th']
    }
    
    const targetLangs = languageMap[language] || []
    
    for (const lang of targetLangs) {
      const voice = voices.find(v => v.lang.startsWith(lang))
      if (voice) return voice
    }
    
    return voices[0] // Fallback to first available voice
  }

  const playAudio = async () => {
    if (!text) return
    
    // If we have a pre-generated audio URL, play it
    if (audioUrl) {
      setIsLoading(true)
      try {
        const audio = new Audio(audioUrl)
        audio.onended = () => {
          setIsPlaying(false)
        }
        audio.onerror = () => {
          console.error('Audio playback failed, falling back to speech synthesis')
          playSpeechSynthesis()
        }
        await audio.play()
        setIsPlaying(true)
      } catch (error) {
        console.error('Audio playback error:', error)
        playSpeechSynthesis()
      } finally {
        setIsLoading(false)
      }
    } else {
      // Use Web Speech API
      playSpeechSynthesis()
    }
  }

  const playSpeechSynthesis = () => {
    if (!isSupported || !window.speechSynthesis) {
      console.error('Speech synthesis not supported')
      return
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    
    // Set language
    utterance.lang = language === 'ja' ? 'ja-JP' : 
                     language === 'th' ? 'th-TH' : 
                     'en-US'
    
    // Try to use specific voice if available
    const voice = getVoice()
    if (voice) {
      utterance.voice = voice
    }
    
    // Set speech parameters
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1
    
    utterance.onstart = () => {
      setIsPlaying(true)
    }
    
    utterance.onend = () => {
      setIsPlaying(false)
    }
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      setIsPlaying(false)
    }
    
    window.speechSynthesis.speak(utterance)
  }

  const stopAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsPlaying(false)
  }

  const handleClick = () => {
    if (isPlaying) {
      stopAudio()
    } else {
      playAudio()
    }
  }

  if (!isSupported) {
    return null // Don't show audio button if not supported
  }

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  }

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={`${sizeClasses[size]} ${className}`}
      onClick={handleClick}
      disabled={isLoading || !text}
      title={isPlaying ? 'Stop' : 'Play audio'}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizeClasses[size]} animate-spin`} />
      ) : isPlaying ? (
        <VolumeX className={iconSizeClasses[size]} />
      ) : (
        <Volume2 className={iconSizeClasses[size]} />
      )}
    </Button>
  )
}