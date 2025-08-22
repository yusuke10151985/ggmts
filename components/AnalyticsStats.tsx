'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { Users, Eye, Clock, MousePointer, TrendingUp, Globe, Smartphone } from 'lucide-react'

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analytics data fetch failed')
      }
      const data = await response.json()
      setAnalytics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
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
            <p className="text-xs mt-2 text-gray-600">
              GA4設定を確認してください: GOOGLE_SERVICE_ACCOUNT_KEY, GA4_PROPERTY_ID
            </p>
            <button 
              onClick={fetchAnalytics}
              className="mt-3 px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
            >
              再試行
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) return null

  const userGrowth = analytics.lastWeekUsers > 0
    ? ((analytics.thisWeekUsers - analytics.lastWeekUsers) / analytics.lastWeekUsers * 100).toFixed(1)
    : '0'

  const monthGrowth = analytics.lastMonthUsers > 0
    ? ((analytics.thisMonthUsers - analytics.lastMonthUsers) / analytics.lastMonthUsers * 100).toFixed(1)
    : '0'

  // 新規vsリピーターのデータ
  const userTypeData = [
    { name: '新規', value: analytics.newVsReturning.new, percentage: analytics.newVsReturning.new + analytics.newVsReturning.returning > 0 ? (analytics.newVsReturning.new / (analytics.newVsReturning.new + analytics.newVsReturning.returning) * 100).toFixed(1) : '0' },
    { name: 'リピーター', value: analytics.newVsReturning.returning, percentage: analytics.newVsReturning.new + analytics.newVsReturning.returning > 0 ? (analytics.newVsReturning.returning / (analytics.newVsReturning.new + analytics.newVsReturning.returning) * 100).toFixed(1) : '0' }
  ]

  return (
    <div className="space-y-6">
      {/* リアルタイム統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <Users className="inline h-4 w-4 mr-1" />
              リアルタイムユーザー
            </CardTitle>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.realTimeUsers}</div>
            <p className="text-xs text-muted-foreground">現在サイトを閲覧中</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <Users className="inline h-4 w-4 mr-1" />
              今日のユーザー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.todayUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              昨日: {analytics.yesterdayUsers.toLocaleString()} 
              <span className={analytics.todayUsers >= analytics.yesterdayUsers ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                ({analytics.todayUsers >= analytics.yesterdayUsers ? '+' : ''}{(analytics.todayUsers - analytics.yesterdayUsers).toLocaleString()})
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <TrendingUp className="inline h-4 w-4 mr-1" />
              今週のユーザー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.thisWeekUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              先週比: 
              <span className={parseFloat(userGrowth) >= 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                {parseFloat(userGrowth) >= 0 ? '+' : ''}{userGrowth}%
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <TrendingUp className="inline h-4 w-4 mr-1" />
              今月のユーザー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.thisMonthUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              先月比: 
              <span className={parseFloat(monthGrowth) >= 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                {parseFloat(monthGrowth) >= 0 ? '+' : ''}{monthGrowth}%
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* エンゲージメント指標 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              <Eye className="inline h-4 w-4 mr-1" />
              今日のページビュー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.todayPageViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ユーザーあたり: {analytics.todayUsers > 0 ? (analytics.todayPageViews / analytics.todayUsers).toFixed(1) : '0'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              <Clock className="inline h-4 w-4 mr-1" />
              平均セッション時間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(analytics.averageSessionDuration / 60)}分{analytics.averageSessionDuration % 60}秒
            </div>
            <p className="text-xs text-muted-foreground">
              目標: 2分以上 {analytics.averageSessionDuration >= 120 ? '✅' : '❌'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              <MousePointer className="inline h-4 w-4 mr-1" />
              直帰率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.bounceRate}%</div>
            <p className="text-xs text-muted-foreground">
              目標: 70%以下 {analytics.bounceRate <= 70 ? '✅' : '❌'}
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
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => {
                  const date = new Date(value as string)
                  return date.toLocaleDateString('ja-JP')
                }}
              />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#8884d8" 
                strokeWidth={2} 
                name="ユーザー数"
              />
              <Line 
                type="monotone" 
                dataKey="pageViews" 
                stroke="#82ca9d" 
                strokeWidth={2} 
                name="ページビュー"
              />
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
            <div className="space-y-3">
              {analytics.topPages.slice(0, 7).map((page, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm truncate flex-1 mr-2">{page.page}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(page.views / analytics.todayPageViews) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{page.views}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>トラフィック源</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.trafficSources}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="users"
                >
                  {analytics.trafficSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* デバイスと地域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <Smartphone className="inline h-4 w-4 mr-1" />
              デバイスカテゴリ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.deviceCategories.map((device, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{device.category}</span>
                    <span>{device.users} ({device.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{ width: `${device.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Globe className="inline h-4 w-4 mr-1" />
              上位アクセス国
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topCountries.map((country, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{country.country}</span>
                  <span className="text-sm font-medium">{country.users}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>新規 vs リピーター</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userTypeData.map((type, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{type.name}</span>
                    <span>{type.value} ({type.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${index === 0 ? 'bg-green-600' : 'bg-blue-600'}`}
                      style={{ width: `${type.percentage}%` }}
                    />
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
          <CardTitle>サイト成長指標</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>日次ユーザー目標 (100人/日)</span>
                <span className="font-medium">{analytics.todayUsers}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((analytics.todayUsers / 100) * 100, 100)}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>月次ユーザー目標 (3,000人/月)</span>
                <span className="font-medium">{analytics.thisMonthUsers.toLocaleString()}/3,000</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((analytics.thisMonthUsers / 3000) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>エンゲージメント目標 (平均2分以上)</span>
                <span className="font-medium">
                  {Math.floor(analytics.averageSessionDuration / 60)}分{analytics.averageSessionDuration % 60}秒
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-purple-600 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((analytics.averageSessionDuration / 120) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}