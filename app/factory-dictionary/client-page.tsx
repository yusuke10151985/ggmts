'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FactoryTerm, 
  Language, 
  Category, 
  ActiveTab 
} from '@/types/factory-dictionary'
import { 
  Search, 
  Plus, 
  Book, 
  User, 
  Home,
  Edit2,
  Trash2,
  Volume2,
  Globe,
  Filter,
  X,
  ChevronDown,
  Loader2,
  ImagePlus,
  Eye
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { AutoFillTermForm } from '@/components/factory-dictionary/AutoFillTermForm'
import { TermImageGallery } from '@/components/factory-dictionary/TermImageGallery'
import { AudioPlayer } from '@/components/factory-dictionary/AudioPlayer'

// Translation helper function
const t = (key: string, lang: Language): string => {
  // Simple inline translations - will move to proper i18n later
  const translations: Record<string, Record<Language, string>> = {
    'title.dictionary': {
      en: 'Factory Dictionary',
      ja: '工場用語辞典',
      th: 'พจนานุกรมโรงงาน'
    },
    'nav.add': {
      en: 'Add Term',
      ja: '用語追加',
      th: 'เพิ่มคำศัพท์'
    },
    'nav.home': {
      en: 'Home',
      ja: 'ホーム',
      th: 'หน้าแรก'
    },
    'nav.search': {
      en: 'Search',
      ja: '検索',
      th: 'ค้นหา'
    },
    'nav.learn': {
      en: 'Learn',
      ja: '学習',
      th: 'เรียนรู้'
    },
    'nav.profile': {
      en: 'Profile',
      ja: 'プロフィール',
      th: 'โปรไฟล์'
    },
    'title.add': {
      en: 'Add Term',
      ja: '用語を追加',
      th: 'เพิ่มคำศัพท์'
    },
    'label.japanese': {
      en: 'Japanese',
      ja: '日本語',
      th: 'ภาษาญี่ปุ่น'
    },
    'label.english': {
      en: 'English',
      ja: '英語',
      th: 'ภาษาอังกฤษ'
    },
    'label.thai': {
      en: 'Thai',
      ja: 'タイ語',
      th: 'ภาษาไทย'
    },
    'label.category': {
      en: 'Category',
      ja: 'カテゴリー',
      th: 'หมวดหมู่'
    },
    'label.description': {
      en: 'Description',
      ja: '説明',
      th: 'คำอธิบาย'
    },
    'label.safetyNotes': {
      en: 'Safety Notes',
      ja: '安全注意事項',
      th: 'หมายเหตุด้านความปลอดภัย'
    },
    'btn.save': {
      en: 'Save',
      ja: '保存',
      th: 'บันทึก'
    },
    'btn.cancel': {
      en: 'Cancel',
      ja: 'キャンセル',
      th: 'ยกเลิก'
    },
    'btn.close': {
      en: 'Close',
      ja: '閉じる',
      th: 'ปิด'
    },
    'btn.edit': {
      en: 'Edit',
      ja: '編集',
      th: 'แก้ไข'
    },
    'msg.noResults': {
      en: 'No results found',
      ja: '結果が見つかりません',
      th: 'ไม่พบผลลัพธ์'
    },
    'category.safety': {
      en: 'Safety',
      ja: '安全',
      th: 'ความปลอดภัย'
    },
    'category.machinery': {
      en: 'Machinery',
      ja: '機械',
      th: 'เครื่องจักร'
    },
    'category.quality': {
      en: 'Quality',
      ja: '品質',
      th: 'คุณภาพ'
    },
    'category.tools': {
      en: 'Tools',
      ja: '工具',
      th: 'เครื่องมือ'
    },
    'category.materials': {
      en: 'Materials',
      ja: '材料',
      th: 'วัสดุ'
    },
    'category.general': {
      en: 'General',
      ja: '一般',
      th: 'ทั่วไป'
    }
  }
  return translations[key]?.[lang] || key
}

const getCategoryColor = (category: Category): string => {
  const colors: Record<Category, string> = {
    [Category.Safety]: 'bg-red-100 text-red-800 border-red-300',
    [Category.Machinery]: 'bg-blue-100 text-blue-800 border-blue-300',
    [Category.Quality]: 'bg-green-100 text-green-800 border-green-300',
    [Category.Tools]: 'bg-orange-100 text-orange-800 border-orange-300',
    [Category.Materials]: 'bg-purple-100 text-purple-800 border-purple-300',
    [Category.General]: 'bg-gray-100 text-gray-800 border-gray-300',
  }
  return colors[category]
}

export default function FactoryDictionaryClient() {
  const { data: session } = useSession()
  const [lang, setLang] = useState<Language>(Language.EN)
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')
  const [terms, setTerms] = useState<FactoryTerm[]>([])
  const [selectedTerm, setSelectedTerm] = useState<FactoryTerm | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingTerm, setEditingTerm] = useState<FactoryTerm | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [imageGenerating, setImageGenerating] = useState(false)

  // New term form state
  const [newTerm, setNewTerm] = useState({
    japanese: '',
    japaneseReading: '',
    english: '',
    thai: '',
    thaiReading: '',
    category: Category.General,
    description: '',
    safetyNotes: '',
    tags: [] as string[],
  })

  // Check if user is admin
  useEffect(() => {
    if (session) {
      setIsAdmin((session.user as any)?.role === 'admin')
    }
  }, [session])

  // Fetch terms from API
  useEffect(() => {
    fetchTerms()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchQuery])

  const fetchTerms = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await fetch(`/api/factory-dictionary/terms?${params}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        // Map Supabase field names to client field names
        const mappedTerms = data.data.map((term: any) => {
          return {
            id: term.id,
            japanese: term.japanese || '',
            japaneseReading: term.japanese_reading || term.japaneseReading || '',
            english: term.english || '',
            thai: term.thai || '',
            thaiReading: term.thai_reading || term.thaiReading || '',
            category: term.category,
            description: term.description || '',
            safetyNotes: term.safety_notes || term.safetyNotes || '',
            imageUrl: (term.image_urls && term.image_urls.length > 0 ? term.image_urls[0] : null) || term.image_url || term.imageUrl || (term.term_images && term.term_images.length > 0 ? term.term_images[0].image_url : null),
            images: term.term_images || [],
            japaneseAudioUrl: term.japanese_audio_url || term.japaneseAudioUrl,
            englishAudioUrl: term.english_audio_url || term.englishAudioUrl,
            thaiAudioUrl: term.thai_audio_url || term.thaiAudioUrl,
            tags: term.tags || [],
            viewCount: term.view_count || term.viewCount || 0,
            lastAccessedAt: term.last_accessed_at || term.lastAccessedAt,
            createdAt: term.created_at || term.createdAt,
            updatedAt: term.updated_at || term.updatedAt,
            createdBy: term.created_by || term.createdBy,
            usageExamples: term.usage_examples || term.usageExamples || []
          }
        })
        setTerms(mappedTerms)
      } else {
        // API failed - show empty state
        console.log('API failed, showing empty state')
        setTerms([])
      }
    } catch (error) {
      console.error('Error fetching terms:', error)
      // Show empty state on error
      setTerms([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTerms = useMemo(() => {
    let filtered = [...terms]
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(term => term.category === selectedCategory)
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(term => 
        (term.japanese || '').toLowerCase().includes(query) ||
        (term.japaneseReading || '').toLowerCase().includes(query) ||
        (term.english || '').toLowerCase().includes(query) ||
        (term.thai || '').toLowerCase().includes(query) ||
        (term.thaiReading || '').toLowerCase().includes(query) ||
        (term.description || '').toLowerCase().includes(query) ||
        (term.tags || []).some(tag => tag.toLowerCase().includes(query))
      )
    }
    
    // Sort by view count (most popular first)
    filtered.sort((a, b) => b.viewCount - a.viewCount)
    
    return filtered
  }, [terms, selectedCategory, searchQuery])

  const handleAddTerm = async (termData?: any) => {
    const dataToSubmit = termData || newTerm
    try {
      const response = await fetch('/api/factory-dictionary/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit)
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchTerms() // Refresh the list
        setShowAddDialog(false)
        if (!termData) resetNewTerm()
      } else {
        alert(data.error || 'Failed to add term')
      }
    } catch (error) {
      console.error('Error adding term:', error)
      alert('Failed to add term')
    }
  }

  const handleEditTerm = async (termData?: any) => {
    if (!editingTerm) return
    const dataToSubmit = termData ? { id: editingTerm.id, ...termData } : editingTerm
    
    try {
      const response = await fetch('/api/factory-dictionary/terms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit)
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchTerms() // Refresh the list
        setShowEditDialog(false)
        setEditingTerm(null)
      } else {
        alert(data.error || 'Failed to update term')
      }
    } catch (error) {
      console.error('Error updating term:', error)
      alert('Failed to update term')
    }
  }

  const handleDeleteTerm = async (id: string) => {
    if (!confirm('Are you sure you want to delete this term?')) return
    
    try {
      const response = await fetch(`/api/factory-dictionary/terms?id=${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchTerms() // Refresh the list
      } else {
        alert(data.error || 'Failed to delete term')
      }
    } catch (error) {
      console.error('Error deleting term:', error)
      alert('Failed to delete term')
    }
  }

  const handleGenerateImage = async (termId: string, prompt: string) => {
    if (!isAdmin) {
      alert('Image generation is restricted to Admin users only')
      return
    }
    
    setImageGenerating(true)
    try {
      const response = await fetch('/api/factory-dictionary/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termId, prompt })
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchTerms() // Refresh to show new image
        alert('Image generated successfully!')
      } else {
        alert(data.error || 'Failed to generate image')
      }
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Failed to generate image')
    } finally {
      setImageGenerating(false)
    }
  }


  const resetNewTerm = () => {
    setNewTerm({
      japanese: '',
      japaneseReading: '',
      english: '',
      thai: '',
      thaiReading: '',
      category: Category.General,
      description: '',
      safetyNotes: '',
      tags: [],
    })
  }


  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">{t('title.dictionary', lang)}</h3>
          <p className="text-3xl font-bold text-primary">{terms.length}</p>
          <p className="text-sm text-muted-foreground">Total Terms</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Recent Activity</h3>
          <p className="text-3xl font-bold text-primary">
            {terms.filter(t => {
              const date = new Date(t.lastAccessedAt)
              const today = new Date()
              return date.toDateString() === today.toDateString()
            }).length}
          </p>
          <p className="text-sm text-muted-foreground">Terms viewed today</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Categories</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.values(Category).map(cat => (
              <Badge key={cat} className={getCategoryColor(cat)}>
                {t(`category.${cat}`, lang)}
              </Badge>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Popular Terms</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {terms.slice(0, 6).map(term => (
            <Card 
              key={term.id} 
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedTerm(term)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">{term.japanese}</h4>
                <Badge className={getCategoryColor(term.category)}>
                  {t(`category.${term.category}`, lang)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{term.japaneseReading}</p>
              <p className="text-sm mt-1">{term.english}</p>
              <p className="text-sm text-muted-foreground">{term.thai}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">
                  Views: {term.viewCount}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )

  const renderSearch = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder={t('msg.searchPlaceholder', lang)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.values(Category).map(cat => (
                <SelectItem key={cat} value={cat}>
                  {t(`category.${cat}`, lang)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTerms.map(term => (
          <Card 
            key={term.id} 
            className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedTerm(term)}
          >
            {/* Term Image */}
            {term.imageUrl && (
              <div className="mb-3">
                <img
                  src={term.imageUrl}
                  alt={term.japanese}
                  className="w-full h-32 object-cover rounded-md"
                  loading="lazy"
                />
              </div>
            )}
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold">{term.japanese}</h4>
              <div className="flex gap-1">
                <AudioPlayer 
                  text={term.japanese}
                  language="ja"
                  audioUrl={term.japaneseAudioUrl}
                  size="sm"
                />
                {isAdmin && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleGenerateImage(term.id, term.japanese + ' - ' + term.english)}
                      disabled={imageGenerating}
                      title="Generate Image (Admin Only)"
                    >
                      {imageGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingTerm(term)
                        setShowEditDialog(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteTerm(term.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{term.japaneseReading}</p>
            <p className="text-sm font-medium mb-1">{term.english}</p>
            <p className="text-sm text-muted-foreground mb-2">{term.thai}</p>
            <p className="text-xs text-muted-foreground mb-3">{term.description}</p>
            <div className="flex justify-between items-center">
              <Badge className={getCategoryColor(term.category)}>
                {t(`category.${term.category}`, lang)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Views: {term.viewCount}
              </span>
            </div>
            {term.safetyNotes && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                {term.safetyNotes}
              </div>
            )}
          </Card>
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">{t('msg.noResults', lang)}</p>
        </Card>
      )}
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard()
      case 'search':
        return renderSearch()
      case 'learn':
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Learning Mode</h2>
            <p className="text-muted-foreground">Practice factory terms with flashcards and quizzes.</p>
            <p className="mt-4 text-sm">Coming soon...</p>
          </Card>
        )
      case 'profile':
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Profile</h2>
            <p className="text-muted-foreground">Manage your account and preferences.</p>
          </Card>
        )
      default:
        return renderDashboard()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{t('title.dictionary', lang)}</h1>
          <div className="flex items-center gap-2">
            <Select value={lang} onValueChange={(value: any) => setLang(value)}>
              <SelectTrigger className="w-[140px]">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Language.EN}>English</SelectItem>
                <SelectItem value={Language.JA}>日本語</SelectItem>
                <SelectItem value={Language.TH}>ไทย</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('nav.add', lang)}
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="dashboard">
              <Home className="h-4 w-4 mr-2" />
              {t('nav.home', lang)}
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              {t('nav.search', lang)}
            </TabsTrigger>
            <TabsTrigger value="learn">
              <Book className="h-4 w-4 mr-2" />
              {t('nav.learn', lang)}
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              {t('nav.profile', lang)}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

        {/* Add Term Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{t('title.add', lang)}</span>
                <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  AI Enhanced
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Add a new term with AI-powered translation and auto-fill features
              </DialogDescription>
            </DialogHeader>
            <AutoFillTermForm
              onSave={handleAddTerm}
              onCancel={() => setShowAddDialog(false)}
              language={lang}
            />
          </DialogContent>
        </Dialog>

        {/* Term Detail Dialog */}
        <Dialog open={!!selectedTerm} onOpenChange={() => setSelectedTerm(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTerm?.japanese}</DialogTitle>
              <DialogDescription>
                {selectedTerm?.japaneseReading} - {selectedTerm?.english} - {selectedTerm?.thai}
              </DialogDescription>
            </DialogHeader>
            {selectedTerm && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="font-semibold">{t('label.japanese', lang)}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{selectedTerm.japanese}</span>
                      <AudioPlayer 
                        text={selectedTerm.japanese}
                        language="ja"
                        audioUrl={selectedTerm.japaneseAudioUrl}
                        size="md"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedTerm.japaneseReading}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">{t('label.english', lang)}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{selectedTerm.english}</span>
                      <AudioPlayer 
                        text={selectedTerm.english}
                        language="en"
                        audioUrl={selectedTerm.englishAudioUrl}
                        size="md"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-semibold">{t('label.thai', lang)}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{selectedTerm.thai}</span>
                      <AudioPlayer 
                        text={selectedTerm.thai}
                        language="th"
                        audioUrl={selectedTerm.thaiAudioUrl}
                        size="md"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedTerm.thaiReading}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="font-semibold">{t('label.description', lang)}</Label>
                  <p className="mt-2 text-gray-700">{selectedTerm.description}</p>
                </div>

                {selectedTerm.safetyNotes && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                    <Label className="font-semibold text-red-600 dark:text-red-400">Safety Notes</Label>
                    <p className="mt-1 text-red-600 dark:text-red-400 text-sm">{selectedTerm.safetyNotes}</p>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <Badge className={getCategoryColor(selectedTerm.category)}>
                    {t(`category.${selectedTerm.category}`, lang)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Views: {selectedTerm.viewCount}
                  </span>
                </div>

                {selectedTerm.tags && selectedTerm.tags.length > 0 && (
                  <div>
                    <Label className="font-semibold">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTerm.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Images Section */}
                {(selectedTerm.imageUrl || (selectedTerm.images && selectedTerm.images.length > 0)) && (
                  <div>
                    <Label className="font-semibold">Images</Label>
                    <div className="mt-3">
                      {selectedTerm.images && selectedTerm.images.length > 0 ? (
                        <TermImageGallery 
                          images={selectedTerm.images}
                          termName={selectedTerm.japanese}
                        />
                      ) : selectedTerm.imageUrl ? (
                        <div className="grid grid-cols-1">
                          <img 
                            src={selectedTerm.imageUrl} 
                            alt={selectedTerm.japanese} 
                            className="w-full h-auto rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow" 
                            onClick={() => {
                              window.open(selectedTerm.imageUrl, '_blank')
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTerm(null)}>
                {t('btn.close', lang) || 'Close'}
              </Button>
              {isAdmin && selectedTerm && (
                <Button onClick={() => {
                  setEditingTerm(selectedTerm)
                  setSelectedTerm(null)
                  setShowEditDialog(true)
                }}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  {t('btn.edit', lang) || 'Edit'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Term Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>Edit Term</span>
                <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  AI Enhanced
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Edit term with AI-powered translation and auto-fill features
              </DialogDescription>
            </DialogHeader>
            {editingTerm && (
              <AutoFillTermForm
                term={editingTerm}
                onSave={handleEditTerm}
                onCancel={() => {
                  setShowEditDialog(false)
                  setEditingTerm(null)
                }}
                language={lang}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}