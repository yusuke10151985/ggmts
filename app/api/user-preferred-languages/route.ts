import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ preferredLanguages: ['en', 'ja', 'th'] })
    }

    // Get user's translation history and count language usage
    const apiUsageLogs = await prisma.apiUsageLog.findMany({
      where: { 
        userId: session.user.id,
        apiType: { in: ['translate', 'summarize', 'generate'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Last 100 usage records
    })

    // Parse target languages from results and count usage
    const languageCounts: Record<string, number> = {}
    
    apiUsageLogs.forEach(log => {
      try {
        const result = JSON.parse(log.result || '{}')
        if (result.translations && Array.isArray(result.translations)) {
          result.translations.forEach((translation: any) => {
            if (translation.lang) {
              languageCounts[translation.lang] = (languageCounts[translation.lang] || 0) + 1
            }
          })
        }
      } catch (e) {
        // Skip invalid JSON
      }
    })

    // Get top 3 most used languages
    const sortedLanguages = Object.entries(languageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([lang]) => lang)

    // If user has no history, return default languages
    const preferredLanguages = sortedLanguages.length > 0 
      ? sortedLanguages 
      : ['en', 'ja', 'th']

    return NextResponse.json({ preferredLanguages })
  } catch (error) {
    console.error('Error fetching preferred languages:', error)
    return NextResponse.json({ preferredLanguages: ['en', 'ja', 'th'] })
  }
}