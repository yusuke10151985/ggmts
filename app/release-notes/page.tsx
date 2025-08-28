'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Rocket, Bug, Zap, Star, Package, Shield, Globe } from 'lucide-react';

type Language = 'en' | 'ja' | 'th';

const translations = {
  en: {
    title: 'Release Notes',
    subtitle: 'Latest updates and improvements',
    highlights: 'Highlights',
    features: 'New Features',
    improvements: 'Improvements',
    fixes: 'Bug Fixes',
    security: 'Security Updates',
    types: {
      major: 'Major Release',
      minor: 'Minor Release',
      patch: 'Patch'
    }
  },
  ja: {
    title: 'リリースノート',
    subtitle: '最新のアップデートと改善',
    highlights: 'ハイライト',
    features: '新機能',
    improvements: '改善点',
    fixes: 'バグ修正',
    security: 'セキュリティ更新',
    types: {
      major: 'メジャーリリース',
      minor: 'マイナーリリース',
      patch: 'パッチ'
    }
  },
  th: {
    title: 'บันทึกการอัปเดต',
    subtitle: 'การอัปเดตและการปรับปรุงล่าสุด',
    highlights: 'ไฮไลท์',
    features: 'คุณสมบัติใหม่',
    improvements: 'การปรับปรุง',
    fixes: 'แก้ไขบั๊ก',
    security: 'อัปเดตความปลอดภัย',
    types: {
      major: 'รีลีสหลัก',
      minor: 'รีลีสรอง',
      patch: 'แพทช์'
    }
  }
};

const releasesData = {
  en: [
    {
      version: '2.1.0',
      date: 'December 27, 2024',
      type: 'minor',
      highlights: [
        'SWGR RFQ Dynamic Form integrated into GGMTS',
        'Multi-language support for Terms and Release Notes',
        'Fixed input field visibility issues'
      ],
      features: [
        'SWGR RFQ form with drag-and-drop field reordering',
        'Terms of Service available in English, Japanese, and Thai',
        'Release Notes available in three languages',
        'Dynamic form configuration import/export'
      ],
      improvements: [
        'Removed duplicate header in SWGR RFQ page',
        'Enhanced input field text visibility across all themes',
        'Improved cursor visibility in input fields'
      ],
      fixes: [
        'Fixed text cursor overlapping with text in dark mode',
        'Fixed duplicate GlobalHeader rendering in SWGR RFQ',
        'Resolved input field contrast issues'
      ]
    },
    {
      version: '2.0.0',
      date: 'December 26, 2024',
      type: 'major',
      highlights: [
        'Unified YSS Business Tools platform launch',
        'Three integrated tools: GGMTS, MOM Manager, SWGR RFQ',
        'Role-based access control system'
      ],
      features: [
        'New landing page with tool selection dashboard',
        'Global navigation header with breadcrumb support',
        'Matrix Mode for simultaneous multilingual editing',
        'Private/Shared visibility for MOM documents',
        'Integrated Stripe payment for Pro and Premier plans'
      ],
      improvements: [
        'Consistent UI/UX across all tools',
        'Enhanced performance with Next.js 14',
        'Better mobile responsive design',
        'Optimized Google Sheets API integration'
      ]
    },
    {
      version: '1.9.0',
      date: 'December 24, 2024',
      type: 'minor',
      highlights: [
        'MOM Manager Windows compatibility fixes',
        'Enhanced role-based permissions',
        'Performance optimizations'
      ],
      features: [
        'Special user role for MOM Manager access',
        'Task tracking with status management',
        'File attachment support for MOMs'
      ],
      fixes: [
        'Fixed console.group causing crashes on Windows',
        'Resolved flex-1 layout issues on Windows browsers',
        'Fixed date handling in different timezones'
      ]
    }
  ],
  ja: [
    {
      version: '2.1.0',
      date: '2024年12月27日',
      type: 'minor',
      highlights: [
        'SWGR RFQ動的フォームをGGMTSに統合',
        '利用規約とリリースノートの多言語対応',
        '入力フィールドの表示問題を修正'
      ],
      features: [
        'ドラッグアンドドロップでフィールドを並び替え可能なSWGR RFQフォーム',
        '利用規約を英語、日本語、タイ語で提供',
        'リリースノートを3言語で提供',
        '動的フォーム設定のインポート/エクスポート機能'
      ],
      improvements: [
        'SWGR RFQページの重複ヘッダーを削除',
        '全テーマで入力フィールドのテキスト視認性を向上',
        '入力フィールドのカーソル視認性を改善'
      ],
      fixes: [
        'ダークモードでテキストカーソルとテキストの重なりを修正',
        'SWGR RFQでのGlobalHeader重複表示を修正',
        '入力フィールドのコントラスト問題を解決'
      ]
    },
    {
      version: '2.0.0',
      date: '2024年12月26日',
      type: 'major',
      highlights: [
        'YSSビジネスツール統合プラットフォームのローンチ',
        'GGMTS、MOMマネージャー、SWGR RFQの3つのツールを統合',
        'ロールベースのアクセス制御システム'
      ],
      features: [
        'ツール選択ダッシュボード付き新ランディングページ',
        'パンくずリスト対応のグローバルナビゲーションヘッダー',
        '同時多言語編集のためのマトリックスモード',
        'MOMドキュメントのプライベート/共有表示設定',
        'ProとPremierプランのStripe決済統合'
      ],
      improvements: [
        '全ツールで一貫したUI/UX',
        'Next.js 14によるパフォーマンス向上',
        'モバイルレスポンシブデザインの改善',
        'Google Sheets API統合の最適化'
      ]
    },
    {
      version: '1.9.0',
      date: '2024年12月24日',
      type: 'minor',
      highlights: [
        'MOMマネージャーのWindows互換性修正',
        'ロールベース権限の強化',
        'パフォーマンス最適化'
      ],
      features: [
        'MOMマネージャーアクセス用の特別ユーザーロール',
        'ステータス管理付きタスクトラッキング',
        'MOMのファイル添付サポート'
      ],
      fixes: [
        'Windowsでconsole.groupがクラッシュを引き起こす問題を修正',
        'WindowsブラウザでのFlex-1レイアウト問題を解決',
        '異なるタイムゾーンでの日付処理を修正'
      ]
    }
  ],
  th: [
    {
      version: '2.1.0',
      date: '27 ธันวาคม 2567',
      type: 'minor',
      highlights: [
        'รวมแบบฟอร์มไดนามิก SWGR RFQ เข้ากับ GGMTS',
        'รองรับหลายภาษาสำหรับข้อกำหนดและบันทึกการอัปเดต',
        'แก้ไขปัญหาการแสดงผลในฟิลด์ป้อนข้อมูล'
      ],
      features: [
        'แบบฟอร์ม SWGR RFQ พร้อมการจัดเรียงฟิลด์แบบลากและวาง',
        'ข้อกำหนดการให้บริการในภาษาอังกฤษ ญี่ปุ่น และไทย',
        'บันทึกการอัปเดตใน 3 ภาษา',
        'ฟังก์ชันนำเข้า/ส่งออกการกำหนดค่าแบบฟอร์มแบบไดนามิก'
      ],
      improvements: [
        'ลบส่วนหัวที่ซ้ำกันในหน้า SWGR RFQ',
        'ปรับปรุงการมองเห็นข้อความในฟิลด์ป้อนข้อมูลทุกธีม',
        'ปรับปรุงการมองเห็นเคอร์เซอร์ในฟิลด์ป้อนข้อมูล'
      ],
      fixes: [
        'แก้ไขเคอร์เซอร์ทับข้อความในโหมดมืด',
        'แก้ไขการแสดงผล GlobalHeader ซ้ำใน SWGR RFQ',
        'แก้ไขปัญหาคอนทราสต์ของฟิลด์ป้อนข้อมูล'
      ]
    },
    {
      version: '2.0.0',
      date: '26 ธันวาคม 2567',
      type: 'major',
      highlights: [
        'เปิดตัวแพลตฟอร์ม YSS Business Tools แบบรวม',
        'รวม 3 เครื่องมือ: GGMTS, MOM Manager, SWGR RFQ',
        'ระบบควบคุมการเข้าถึงตามบทบาท'
      ],
      features: [
        'หน้าเริ่มต้นใหม่พร้อมแดชบอร์ดเลือกเครื่องมือ',
        'ส่วนหัวนำทางทั่วโลกพร้อมการรองรับ breadcrumb',
        'โหมดเมทริกซ์สำหรับการแก้ไขหลายภาษาพร้อมกัน',
        'การตั้งค่าการมองเห็นแบบส่วนตัว/แชร์สำหรับเอกสาร MOM',
        'การชำระเงินผ่าน Stripe สำหรับแผน Pro และ Premier'
      ],
      improvements: [
        'UI/UX ที่สอดคล้องกันในทุกเครื่องมือ',
        'ประสิทธิภาพที่ดีขึ้นด้วย Next.js 14',
        'การออกแบบตอบสนองบนมือถือที่ดีขึ้น',
        'การรวม Google Sheets API ที่เหมาะสม'
      ]
    },
    {
      version: '1.9.0',
      date: '24 ธันวาคม 2567',
      type: 'minor',
      highlights: [
        'แก้ไขความเข้ากันได้กับ Windows ของ MOM Manager',
        'เพิ่มสิทธิ์ตามบทบาท',
        'การเพิ่มประสิทธิภาพ'
      ],
      features: [
        'บทบาทผู้ใช้พิเศษสำหรับการเข้าถึง MOM Manager',
        'การติดตามงานพร้อมการจัดการสถานะ',
        'รองรับการแนบไฟล์สำหรับ MOM'
      ],
      fixes: [
        'แก้ไข console.group ที่ทำให้เกิดข้อขัดข้องบน Windows',
        'แก้ไขปัญหาเลย์เอาต์ flex-1 บนเบราว์เซอร์ Windows',
        'แก้ไขการจัดการวันที่ในเขตเวลาต่างๆ'
      ]
    }
  ]
};

export default function ReleaseNotesPage() {
  const [language, setLanguage] = useState<Language>('en');
  const t = translations[language];
  const releases = releasesData[language];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'major': return 'bg-red-500';
      case 'minor': return 'bg-blue-500';
      case 'patch': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'major': return <Rocket className="h-4 w-4" />;
      case 'minor': return <Package className="h-4 w-4" />;
      case 'patch': return <Shield className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <div className="flex gap-2">
              <Button
                variant={language === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('en')}
              >
                EN
              </Button>
              <Button
                variant={language === 'ja' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('ja')}
              >
                日本語
              </Button>
              <Button
                variant={language === 'th' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('th')}
              >
                ไทย
              </Button>
            </div>
          </div>
          <p className="text-lg text-gray-600">{t.subtitle}</p>
        </div>

        <div className="space-y-8">
          {releases.map((release) => (
            <Card key={release.version} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">v{release.version}</h2>
                  <Badge className={`${getTypeColor(release.type)} text-white`}>
                    <span className="flex items-center gap-1">
                      {getTypeIcon(release.type)}
                      {t.types[release.type as keyof typeof t.types]}
                    </span>
                  </Badge>
                </div>
                <span className="text-sm text-gray-500">{release.date}</span>
              </div>

              {release.highlights && (
                <div className="mb-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                    <Star className="h-5 w-5 text-yellow-500" />
                    {t.highlights}
                  </h3>
                  <ul className="space-y-2">
                    {release.highlights.map((highlight, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-yellow-500 mr-2">★</span>
                        <span className="text-gray-700">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {release.features && (
                <div className="mb-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                    <Rocket className="h-5 w-5 text-blue-500" />
                    {t.features}
                  </h3>
                  <ul className="space-y-2">
                    {release.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">✓</span>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {release.improvements && (
                <div className="mb-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                    <Zap className="h-5 w-5 text-green-500" />
                    {t.improvements}
                  </h3>
                  <ul className="space-y-2">
                    {release.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">↑</span>
                        <span className="text-gray-700">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {release.fixes && (
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                    <Bug className="h-5 w-5 text-orange-500" />
                    {t.fixes}
                  </h3>
                  <ul className="space-y-2">
                    {release.fixes.map((fix, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-orange-500 mr-2">•</span>
                        <span className="text-gray-700">{fix}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}