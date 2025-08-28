'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Languages, FileText, Zap, Users, Globe, Shield, ClipboardList, BookOpen } from 'lucide-react';

export default function AboutPage() {
  const [lang, setLang] = useState<'ja' | 'en' | 'th'>('ja');

  const content = {
    ja: {
      title: 'YSS Business Toolsについて',
      subtitle: 'ビジネスの効率化を支援する統合プラットフォーム',
      description: 'YSS Business Toolsは、多言語翻訳と議事録管理を統合した革新的なビジネスツールプラットフォームです。',
      tools: {
        ggmts: {
          name: 'GGMTS - 多言語翻訳システム',
          description: 'Google Gemini Multi-Translator Service - AI技術を活用した高精度な多言語翻訳ツールです。',
          features: [
            '日本語、英語、タイ語、中国語を含む多言語対応',
            'Google Gemini AIによる高精度翻訳',
            'リアルタイム翻訳と履歴管理',
            'ドキュメント要約機能'
          ]
        },
        mom: {
          name: 'MOM Manager - 議事録管理システム',
          description: '会議の議事録を効率的に作成・管理・共有するための包括的なツールです。',
          features: [
            '多言語議事録作成',
            'タスクトラッキング機能',
            'マトリックスビューとグループビュー',
            'Google Sheets統合'
          ]
        },
        swgr: {
          name: 'SWGR RFQ - 動的フォームシステム',
          description: 'Switchgear RFQのための動的フォーム管理システムです。',
          features: [
            'ドラッグ&ドロップフィールド配置',
            'リアルタイムバリデーション',
            'JSON/CSV エクスポート',
            '管理者モード'
          ]
        },
        factory: {
          name: 'Factory Dictionary - 工場用語辞典',
          description: '製造業向けの多言語用語辞典システムです。',
          features: [
            '日本語・英語・タイ語対応',
            '安全注意事項の管理',
            'カテゴリー別分類',
            '発音ガイド機能'
          ]
        }
      },
      features: [
        { icon: Globe, title: '多言語対応', desc: '複数言語をシームレスにサポート' },
        { icon: Zap, title: 'AI駆動', desc: '最新のAI技術による高精度処理' },
        { icon: Users, title: 'チーム協業', desc: 'チーム全体での効率的な作業' },
        { icon: Shield, title: 'セキュア', desc: 'エンタープライズグレードのセキュリティ' }
      ]
    },
    en: {
      title: 'About YSS Business Tools',
      subtitle: 'Integrated Platform for Business Efficiency',
      description: 'YSS Business Tools is an innovative business platform integrating multilingual translation and meeting minutes management.',
      tools: {
        ggmts: {
          name: 'GGMTS - Multilingual Translation System',
          description: 'Google Gemini Multi-Translator Service - A high-precision multilingual translation tool powered by AI technology.',
          features: [
            'Support for Japanese, English, Thai, Chinese and more',
            'High-precision translation with Google Gemini AI',
            'Real-time translation and history management',
            'Document summarization feature'
          ]
        },
        mom: {
          name: 'MOM Manager - Meeting Minutes System',
          description: 'A comprehensive tool for efficiently creating, managing, and sharing meeting minutes.',
          features: [
            'Multilingual meeting minutes creation',
            'Task tracking functionality',
            'Matrix view and grouped view support',
            'Google Sheets integration'
          ]
        },
        swgr: {
          name: 'SWGR RFQ - Dynamic Form System',
          description: 'Dynamic form management system for Switchgear RFQ.',
          features: [
            'Drag & drop field placement',
            'Real-time validation',
            'JSON/CSV export',
            'Admin mode'
          ]
        },
        factory: {
          name: 'Factory Dictionary - Industrial Terms Dictionary',
          description: 'Multilingual dictionary system for manufacturing industry.',
          features: [
            'Japanese, English, Thai support',
            'Safety notes management',
            'Category classification',
            'Pronunciation guide'
          ]
        }
      },
      features: [
        { icon: Globe, title: 'Multilingual', desc: 'Seamless support for multiple languages' },
        { icon: Zap, title: 'AI-Powered', desc: 'High precision with latest AI technology' },
        { icon: Users, title: 'Team Collaboration', desc: 'Efficient teamwork across departments' },
        { icon: Shield, title: 'Secure', desc: 'Enterprise-grade security' }
      ]
    },
    th: {
      title: 'เกี่ยวกับ YSS Business Tools',
      subtitle: 'แพลตฟอร์มรวมเพื่อประสิทธิภาพทางธุรกิจ',
      description: 'YSS Business Tools เป็นแพลตฟอร์มธุรกิจนวัตกรรมที่รวมการแปลหลายภาษาและการจัดการรายงานการประชุม',
      tools: {
        ggmts: {
          name: 'GGMTS - ระบบแปลหลายภาษา',
          description: 'Google Gemini Multi-Translator Service - เครื่องมือแปลหลายภาษาที่มีความแม่นยำสูงด้วยเทคโนโลยี AI',
          features: [
            'รองรับภาษาญี่ปุ่น อังกฤษ ไทย จีน และอื่นๆ',
            'การแปลที่แม่นยำสูงด้วย Google Gemini AI',
            'การแปลแบบเรียลไทม์และการจัดการประวัติ',
            'ฟีเจอร์สรุปเอกสาร'
          ]
        },
        mom: {
          name: 'MOM Manager - ระบบจัดการรายงานการประชุม',
          description: 'เครื่องมือครอบคลุมสำหรับการสร้าง จัดการ และแชร์รายงานการประชุมอย่างมีประสิทธิภาพ',
          features: [
            'การสร้างรายงานการประชุมหลายภาษา',
            'ฟังก์ชันติดตามงาน',
            'รองรับมุมมองแบบเมทริกซ์และกลุ่ม',
            'การเชื่อมต่อกับ Google Sheets'
          ]
        },
        swgr: {
          name: 'SWGR RFQ - ระบบฟอร์มไดนามิก',
          description: 'ระบบจัดการฟอร์มไดนามิกสำหรับ Switchgear RFQ',
          features: [
            'ลากและวางการจัดวางฟิลด์',
            'การตรวจสอบแบบเรียลไทม์',
            'ส่งออก JSON/CSV',
            'โหมดผู้ดูแลระบบ'
          ]
        },
        factory: {
          name: 'Factory Dictionary - พจนานุกรมคำศัพท์โรงงาน',
          description: 'ระบบพจนานุกรมหลายภาษาสำหรับอุตสาหกรรมการผลิต',
          features: [
            'รองรับภาษาญี่ปุ่น อังกฤษ ไทย',
            'การจัดการหมายเหตุด้านความปลอดภัย',
            'การจัดหมวดหมู่',
            'คู่มือการออกเสียง'
          ]
        }
      },
      features: [
        { icon: Globe, title: 'หลายภาษา', desc: 'รองรับหลายภาษาอย่างราบรื่น' },
        { icon: Zap, title: 'ขับเคลื่อนด้วย AI', desc: 'ความแม่นยำสูงด้วยเทคโนโลยี AI ล่าสุด' },
        { icon: Users, title: 'การทำงานเป็นทีม', desc: 'ทำงานร่วมกันอย่างมีประสิทธิภาพ' },
        { icon: Shield, title: 'ปลอดภัย', desc: 'ความปลอดภัยระดับองค์กร' }
      ]
    }
  };

  const currentContent = content[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Language Selector */}
        <div className="flex justify-center gap-2 mb-8">
          {(['ja', 'en', 'th'] as const).map(l => (
            <Button
              key={l}
              variant={lang === l ? 'default' : 'outline'}
              onClick={() => setLang(l)}
              size="sm"
            >
              {l === 'ja' ? '日本語' : l === 'en' ? 'English' : 'ไทย'}
            </Button>
          ))}
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {currentContent.title}
          </h1>
          <p className="text-xl text-gray-600">{currentContent.subtitle}</p>
          <p className="mt-4 text-gray-700 max-w-3xl mx-auto">{currentContent.description}</p>
        </div>

        {/* Tools Section */}
        <div className="space-y-8 mb-12">
          {/* GGMTS */}
          <Card className="p-8">
            <div className="flex items-start gap-4">
              <Languages className="w-10 h-10 text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-3">{currentContent.tools.ggmts.name}</h2>
                <p className="text-gray-600 mb-4">{currentContent.tools.ggmts.description}</p>
                <ul className="space-y-2">
                  {currentContent.tools.ggmts.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* MOM Manager */}
          <Card className="p-8">
            <div className="flex items-start gap-4">
              <FileText className="w-10 h-10 text-purple-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-3">{currentContent.tools.mom.name}</h2>
                <p className="text-gray-600 mb-4">{currentContent.tools.mom.description}</p>
                <ul className="space-y-2">
                  {currentContent.tools.mom.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-purple-500 mt-1">•</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {currentContent.features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="p-6 text-center hover:shadow-lg transition-shadow">
                <Icon className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </Card>
            );
          })}
        </div>

        {/* Version Info */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Version 2.2.0 - Released January 2025</p>
          <p className="mt-2">© 2025 YSS Business Tools. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}