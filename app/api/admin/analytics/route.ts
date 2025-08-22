import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

// Google Analytics Data API (GA4)を使用

interface AnalyticsData {
  realTimeUsers: number
  todayUsers: number
  yesterdayUsers: number
  thisWeekUsers: number
  lastWeekUsers: number
  thisMonthUsers: number
  lastMonthUsers: number
  todayPageViews: number
  averageSessionDuration: number
  bounceRate: number
  topPages: Array<{ page: string; views: number }>
  dailyStats: Array<{ date: string; users: number; pageViews: number }>
  trafficSources: Array<{ source: string; users: number; percentage: number }>
  deviceCategories: Array<{ category: string; users: number; percentage: number }>
  topCountries: Array<{ country: string; users: number }>
  newVsReturning: { new: number; returning: number }
}

// Google Analytics クライアントの初期化
function getAnalyticsClient() {
  try {
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    if (!credentials) {
      console.log('Google service account credentials not found')
      return null
    }

    const serviceAccountKey = JSON.parse(credentials)
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: serviceAccountKey
    })

    return analyticsDataClient
  } catch (error) {
    console.error('Analytics client setup error:', error)
    return null
  }
}

// 日付フォーマット
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// パーセンテージ計算
function calculatePercentage(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

// 実際のGoogle Analytics APIからデータを取得
async function fetchRealAnalyticsData(): Promise<AnalyticsData | null> {
  try {
    const client = getAnalyticsClient()
    if (!client) {
      console.log('Analytics client not configured')
      return null
    }

    const propertyId = process.env.GA4_PROPERTY_ID
    if (!propertyId) {
      console.log('GA4_PROPERTY_ID environment variable not set')
      return null
    }

    const property = `properties/${propertyId}`
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const twoWeeksAgo = new Date(today)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const monthAgo = new Date(today)
    monthAgo.setDate(monthAgo.getDate() - 30)
    const twoMonthsAgo = new Date(today)
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60)

    // 複数のレポートを並行して取得
    const [
      realTimeResponse,
      dailyResponse,
      topPagesResponse,
      trafficSourcesResponse,
      deviceResponse,
      geoResponse,
      userTypeResponse,
      overviewResponse
    ] = await Promise.all([
      // リアルタイムユーザー数
      client.runRealtimeReport({
        property,
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }]
      }).catch(() => null),
      
      // 日別統計（過去7日間）
      client.runReport({
        property,
        dateRanges: [{ startDate: formatDate(weekAgo), endDate: formatDate(today) }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' }
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      }),
      
      // トップページ
      client.runReport({
        property,
        dateRanges: [{ startDate: formatDate(today), endDate: formatDate(today) }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        limit: 10,
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }]
      }),
      
      // トラフィックソース
      client.runReport({
        property,
        dateRanges: [{ startDate: formatDate(today), endDate: formatDate(today) }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }]
      }),
      
      // デバイスカテゴリ
      client.runReport({
        property,
        dateRanges: [{ startDate: formatDate(today), endDate: formatDate(today) }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }]
      }),
      
      // 国別ユーザー
      client.runReport({
        property,
        dateRanges: [{ startDate: formatDate(today), endDate: formatDate(today) }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 5,
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }]
      }),
      
      // 新規 vs リピーター
      client.runReport({
        property,
        dateRanges: [{ startDate: formatDate(today), endDate: formatDate(today) }],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'activeUsers' }]
      }),
      
      // 概要メトリクス
      client.runReport({
        property,
        dateRanges: [
          { startDate: formatDate(today), endDate: formatDate(today) },
          { startDate: formatDate(yesterday), endDate: formatDate(yesterday) },
          { startDate: formatDate(weekAgo), endDate: formatDate(today) },
          { startDate: formatDate(twoWeeksAgo), endDate: formatDate(weekAgo) },
          { startDate: formatDate(monthAgo), endDate: formatDate(today) },
          { startDate: formatDate(twoMonthsAgo), endDate: formatDate(monthAgo) }
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' }
        ]
      })
    ])

    // データの処理
    const realTimeUsers = realTimeResponse?.[0]?.rows?.reduce((sum, row) => 
      sum + parseInt(row.metricValues?.[0]?.value || '0'), 0) || 0

    // 日別統計の処理
    const dailyStats = dailyResponse[0]?.rows?.map(row => ({
      date: `${row.dimensionValues?.[0]?.value?.slice(0,4)}-${row.dimensionValues?.[0]?.value?.slice(4,6)}-${row.dimensionValues?.[0]?.value?.slice(6,8)}`,
      users: parseInt(row.metricValues?.[0]?.value || '0'),
      pageViews: parseInt(row.metricValues?.[1]?.value || '0')
    })) || []

    // 概要メトリクスの処理
    const overviewMetrics = overviewResponse[0]?.rows?.[0]?.metricValues || []
    const todayUsers = parseInt(overviewMetrics[0]?.value || '0')
    const todayPageViews = parseInt(overviewMetrics[1]?.value || '0')
    const avgSessionDuration = parseFloat(overviewMetrics[2]?.value || '0')
    const bounceRate = parseFloat(overviewMetrics[3]?.value || '0') * 100

    const yesterdayUsers = overviewResponse[0]?.rows?.[1]?.metricValues?.[0]?.value 
      ? parseInt(overviewResponse[0].rows[1].metricValues[0].value) : 0
    const thisWeekUsers = overviewResponse[0]?.rows?.[2]?.metricValues?.[0]?.value 
      ? parseInt(overviewResponse[0].rows[2].metricValues[0].value) : 0
    const lastWeekUsers = overviewResponse[0]?.rows?.[3]?.metricValues?.[0]?.value 
      ? parseInt(overviewResponse[0].rows[3].metricValues[0].value) : 0
    const thisMonthUsers = overviewResponse[0]?.rows?.[4]?.metricValues?.[0]?.value 
      ? parseInt(overviewResponse[0].rows[4].metricValues[0].value) : 0
    const lastMonthUsers = overviewResponse[0]?.rows?.[5]?.metricValues?.[0]?.value 
      ? parseInt(overviewResponse[0].rows[5].metricValues[0].value) : 0

    // トップページの処理
    const topPages = topPagesResponse[0]?.rows?.map(row => ({
      page: row.dimensionValues?.[0]?.value || '',
      views: parseInt(row.metricValues?.[0]?.value || '0')
    })) || []

    // トラフィックソースの処理
    const totalSourceUsers = trafficSourcesResponse[0]?.rows?.reduce((sum, row) => 
      sum + parseInt(row.metricValues?.[0]?.value || '0'), 0) || 1
    const trafficSources = trafficSourcesResponse[0]?.rows?.map(row => {
      const users = parseInt(row.metricValues?.[0]?.value || '0')
      return {
        source: row.dimensionValues?.[0]?.value || '',
        users,
        percentage: calculatePercentage(users, totalSourceUsers)
      }
    }) || []

    // デバイスカテゴリの処理
    const totalDeviceUsers = deviceResponse[0]?.rows?.reduce((sum, row) => 
      sum + parseInt(row.metricValues?.[0]?.value || '0'), 0) || 1
    const deviceCategories = deviceResponse[0]?.rows?.map(row => {
      const users = parseInt(row.metricValues?.[0]?.value || '0')
      return {
        category: row.dimensionValues?.[0]?.value || '',
        users,
        percentage: calculatePercentage(users, totalDeviceUsers)
      }
    }) || []

    // 国別ユーザーの処理
    const topCountries = geoResponse[0]?.rows?.map(row => ({
      country: row.dimensionValues?.[0]?.value || '',
      users: parseInt(row.metricValues?.[0]?.value || '0')
    })) || []

    // 新規 vs リピーターの処理
    let newUsers = 0, returningUsers = 0
    userTypeResponse[0]?.rows?.forEach(row => {
      const type = row.dimensionValues?.[0]?.value
      const users = parseInt(row.metricValues?.[0]?.value || '0')
      if (type === 'new') newUsers = users
      else if (type === 'returning') returningUsers = users
    })

    return {
      realTimeUsers,
      todayUsers,
      yesterdayUsers,
      thisWeekUsers,
      lastWeekUsers,
      thisMonthUsers,
      lastMonthUsers,
      todayPageViews,
      averageSessionDuration: Math.round(avgSessionDuration),
      bounceRate: Math.round(bounceRate * 10) / 10,
      topPages,
      dailyStats,
      trafficSources,
      deviceCategories,
      topCountries,
      newVsReturning: { new: newUsers, returning: returningUsers }
    }
    
  } catch (error) {
    console.error('Google Analytics API error:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // 管理者権限チェック
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 実際のAnalyticsデータを取得
    const analyticsData = await fetchRealAnalyticsData()
    
    if (!analyticsData) {
      return NextResponse.json(
        { error: 'Analytics data not available. Please check GA4 configuration.' },
        { status: 503 }
      )
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}