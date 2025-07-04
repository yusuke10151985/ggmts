'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

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
}

export default function AnalyticsStats() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
    // リアルタイムデータは30秒ごとに更新
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      if (!response.ok) {
        throw new Error('Analytics data fetch failed')
      }
      const data = await response.json()
      setAnalytics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="text-red-600 text-center">
            <p className="font-medium">Analytics data could not be loaded</p>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={fetchAnalytics}
              className="mt-2 px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) return null

  const userGrowth = analytics.thisWeekUsers > analytics.lastWeekUsers 
    ? ((analytics.thisWeekUsers - analytics.lastWeekUsers) / analytics.lastWeekUsers * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* リアルタイム統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">リアルタイムユーザー</CardTitle>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.realTimeUsers}</div>
            <p className="text-xs text-muted-foreground">現在サイトを閲覧中</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日のユーザー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.todayUsers}</div>
            <p className="text-xs text-muted-foreground">
              昨日: {analytics.yesterdayUsers} 
              <span className={analytics.todayUsers > analytics.yesterdayUsers ? 'text-green-600' : 'text-red-600'}>
                ({analytics.todayUsers > analytics.yesterdayUsers ? '+' : ''}{analytics.todayUsers - analytics.yesterdayUsers})
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今週のユーザー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.thisWeekUsers}</div>
            <p className="text-xs text-muted-foreground">
              先週比: <span className="text-green-600">+{userGrowth}%</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月のユーザー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.thisMonthUsers}</div>
            <p className="text-xs text-muted-foreground">
              AdSense目標: 1,500人
            </p>
          </CardContent>
        </Card>
      </div>

      {/* エンゲージメント指標 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今日のページビュー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.todayPageViews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均セッション時間</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.averageSessionDuration)}秒</div>
            <p className="text-xs text-muted-foreground">
              目標: 120秒以上
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">直帰率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.bounceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              目標: 70%以下
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 日次トラフィックグラフ */}
      <Card>
        <CardHeader>
          <CardTitle>過去7日間のトラフィック</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
              <Line type="monotone" dataKey="pageViews" stroke="#82ca9d" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 人気ページとトラフィック源 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>人気ページ（今日）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topPages.map((page, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm truncate">{page.page}</span>
                  <span className="text-sm font-medium">{page.views}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>トラフィック源</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.trafficSources.map((source, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{source.source}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{source.users}</span>
                    <span className="text-xs text-muted-foreground">({source.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AdSense審査進捗 */}
      <Card>
        <CardHeader>
          <CardTitle>AdSense審査進捗</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>日次ユーザー目標 (50人/日)</span>
                <span>{analytics.todayUsers}/50</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${Math.min((analytics.todayUsers / 50) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>月次ページビュー目標 (2,000PV)</span>
                <span>{analytics.thisMonthUsers * 2}/2000</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${Math.min(((analytics.thisMonthUsers * 2) / 2000) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}