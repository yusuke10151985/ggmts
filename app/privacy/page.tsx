'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Language = 'ja' | 'en' | 'th';

export default function PrivacyPolicyPage() {
  const [lang, setLang] = useState<Language>('ja');

  const content = {
    ja: {
      title: 'プライバシーポリシー',
      effectiveDate: '発効日: 2025年1月1日',
      sections: [
        {
          title: '1. 収集する情報',
          content: '当社は以下の種類の情報を収集します：',
          items: [
            'Googleアカウント情報（名前、メールアドレス）',
            '翻訳履歴と議事録データ',
            'サービス改善のための利用統計',
            'プレミアムサブスクリプションの支払い情報（Stripeで処理）'
          ]
        },
        {
          title: '2. 情報の使用方法',
          content: 'お客様の情報は以下の目的で使用されます：',
          items: [
            'サービスの提供と維持',
            '翻訳処理と議事録管理',
            'サービス品質とユーザーエクスペリエンスの向上',
            'サービス関連の通知送信',
            '支払い処理とサブスクリプション管理'
          ]
        },
        {
          title: '3. データの保存とセキュリティ',
          content: '当社はデータセキュリティを重視しています：',
          items: [
            'データは安全なクラウドサーバー（Vercel、Prisma）に保存',
            'すべてのデータ送信はHTTPSで暗号化',
            '議事録はアクセス制御されたGoogle Sheetsに保存',
            '業界標準のセキュリティ対策を実施'
          ]
        },
        {
          title: '4. サードパーティサービス',
          content: '以下のサードパーティサービスを使用しています：',
          items: [
            'Google: 認証、Sheets API、Drive API',
            'Google Gemini: AI翻訳サービス',
            'Stripe: 決済処理',
            'Vercel: ホスティングとデプロイメント'
          ]
        },
        {
          title: '5. データの共有',
          content: '個人情報を第三者に販売、取引、貸与することはありません。情報は以下の場合にのみ共有されます：',
          items: [
            'お客様の明示的な同意がある場合',
            '法的義務を遵守するため',
            '当社の権利と安全を保護するため',
            '業務を支援するサービスプロバイダーと共有'
          ]
        },
        {
          title: '6. お客様の権利',
          content: 'お客様には以下の権利があります：',
          items: [
            '個人データへのアクセス',
            '不正確な情報の訂正',
            'データの削除要求',
            'データのエクスポート',
            '特定のデータ使用のオプトアウト'
          ]
        },
        {
          title: '7. Cookie',
          content: '認証とセッション管理に必要なCookieを使用しています。'
        },
        {
          title: '8. 子供のプライバシー',
          content: '当サービスは13歳未満の子供を対象としていません。13歳未満の子供から故意に個人情報を収集することはありません。'
        },
        {
          title: '9. ポリシーの変更',
          content: 'このプライバシーポリシーは随時更新される場合があります。変更がある場合は、このページに新しいポリシーを掲載してお知らせします。'
        },
        {
          title: '10. お問い合わせ',
          content: 'プライバシーポリシーに関するご質問は以下までお問い合わせください：',
          contactInfo: [
            'メール: privacy@yssbusinesstools.com',
            'YSS Business Tools',
            '日本語、英語、タイ語でのサポート対応'
          ]
        }
      ]
    },
    en: {
      title: 'Privacy Policy',
      effectiveDate: 'Effective Date: January 1, 2025',
      sections: [
        {
          title: '1. Information We Collect',
          content: 'We collect the following types of information:',
          items: [
            'Google account information (name, email address)',
            'Translation history and meeting minutes data',
            'Usage statistics for service improvement',
            'Payment information for premium subscriptions (processed by Stripe)'
          ]
        },
        {
          title: '2. How We Use Information',
          content: 'Your information is used to:',
          items: [
            'Provide and maintain our services',
            'Process translations and manage meeting minutes',
            'Improve service quality and user experience',
            'Send service-related notifications',
            'Process payments and manage subscriptions'
          ]
        },
        {
          title: '3. Data Storage and Security',
          content: 'We take data security seriously:',
          items: [
            'Data is stored on secure cloud servers (Vercel, Prisma)',
            'All data transmission is encrypted using HTTPS',
            'Meeting minutes are stored in Google Sheets with access controls',
            'We implement industry-standard security measures'
          ]
        },
        {
          title: '4. Third-Party Services',
          content: 'We use the following third-party services:',
          items: [
            'Google: Authentication, Sheets API, Drive API',
            'Google Gemini: AI translation services',
            'Stripe: Payment processing',
            'Vercel: Hosting and deployment'
          ]
        },
        {
          title: '5. Data Sharing',
          content: 'We do not sell, trade, or rent your personal information. Information is only shared:',
          items: [
            'With your explicit consent',
            'To comply with legal obligations',
            'To protect our rights and safety',
            'With service providers who assist our operations'
          ]
        },
        {
          title: '6. Your Rights',
          content: 'You have the right to:',
          items: [
            'Access your personal data',
            'Correct inaccurate information',
            'Request deletion of your data',
            'Export your data',
            'Opt-out of certain data uses'
          ]
        },
        {
          title: '7. Cookies',
          content: 'We use essential cookies for authentication and session management.'
        },
        {
          title: '8. Children\'s Privacy',
          content: 'Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.'
        },
        {
          title: '9. Changes to This Policy',
          content: 'We may update this privacy policy from time to time. We will notify you of changes by posting the new policy on this page.'
        },
        {
          title: '10. Contact Us',
          content: 'If you have questions about this privacy policy, please contact us at:',
          contactInfo: [
            'Email: privacy@yssbusinesstools.com',
            'YSS Business Tools',
            'Support available in Japanese, English, and Thai'
          ]
        }
      ]
    },
    th: {
      title: 'นโยบายความเป็นส่วนตัว',
      effectiveDate: 'มีผลตั้งแต่: 1 มกราคม 2568',
      sections: [
        {
          title: '1. ข้อมูลที่เราเก็บรวบรวม',
          content: 'เราเก็บรวบรวมข้อมูลประเภทต่อไปนี้:',
          items: [
            'ข้อมูลบัญชี Google (ชื่อ, อีเมล)',
            'ประวัติการแปลและข้อมูลรายงานการประชุม',
            'สถิติการใช้งานเพื่อปรับปรุงบริการ',
            'ข้อมูลการชำระเงินสำหรับสมาชิกพรีเมียม (ดำเนินการโดย Stripe)'
          ]
        },
        {
          title: '2. วิธีการใช้ข้อมูล',
          content: 'ข้อมูลของคุณถูกใช้เพื่อ:',
          items: [
            'ให้บริการและดูแลรักษาบริการของเรา',
            'ประมวลผลการแปลและจัดการรายงานการประชุม',
            'ปรับปรุงคุณภาพบริการและประสบการณ์ผู้ใช้',
            'ส่งการแจ้งเตือนที่เกี่ยวข้องกับบริการ',
            'ประมวลผลการชำระเงินและจัดการการสมัครสมาชิก'
          ]
        },
        {
          title: '3. การจัดเก็บข้อมูลและความปลอดภัย',
          content: 'เราให้ความสำคัญกับความปลอดภัยของข้อมูล:',
          items: [
            'ข้อมูลถูกเก็บบนเซิร์ฟเวอร์คลาวด์ที่ปลอดภัย (Vercel, Prisma)',
            'การส่งข้อมูลทั้งหมดถูกเข้ารหัสด้วย HTTPS',
            'รายงานการประชุมถูกเก็บใน Google Sheets พร้อมการควบคุมการเข้าถึง',
            'เราใช้มาตรการความปลอดภัยตามมาตรฐานอุตสาหกรรม'
          ]
        },
        {
          title: '4. บริการของบุคคลที่สาม',
          content: 'เราใช้บริการของบุคคลที่สามดังต่อไปนี้:',
          items: [
            'Google: การยืนยันตัวตน, Sheets API, Drive API',
            'Google Gemini: บริการแปลด้วย AI',
            'Stripe: การประมวลผลการชำระเงิน',
            'Vercel: โฮสติ้งและการปรับใช้'
          ]
        },
        {
          title: '5. การแบ่งปันข้อมูล',
          content: 'เราไม่ขาย แลกเปลี่ยน หรือให้เช่าข้อมูลส่วนบุคคลของคุณ ข้อมูลจะถูกแบ่งปันเฉพาะ:',
          items: [
            'เมื่อได้รับความยินยอมอย่างชัดเจนจากคุณ',
            'เพื่อปฏิบัติตามข้อผูกพันทางกฎหมาย',
            'เพื่อปกป้องสิทธิและความปลอดภัยของเรา',
            'กับผู้ให้บริการที่ช่วยในการดำเนินงานของเรา'
          ]
        },
        {
          title: '6. สิทธิของคุณ',
          content: 'คุณมีสิทธิ:',
          items: [
            'เข้าถึงข้อมูลส่วนบุคคลของคุณ',
            'แก้ไขข้อมูลที่ไม่ถูกต้อง',
            'ขอให้ลบข้อมูลของคุณ',
            'ส่งออกข้อมูลของคุณ',
            'เลือกไม่ใช้ข้อมูลบางประเภท'
          ]
        },
        {
          title: '7. คุกกี้',
          content: 'เราใช้คุกกี้ที่จำเป็นสำหรับการยืนยันตัวตนและการจัดการเซสชัน'
        },
        {
          title: '8. ความเป็นส่วนตัวของเด็ก',
          content: 'บริการของเราไม่ได้มีไว้สำหรับเด็กอายุต่ำกว่า 13 ปี เราไม่เก็บข้อมูลส่วนบุคคลจากเด็กอายุต่ำกว่า 13 ปีโดยเจตนา'
        },
        {
          title: '9. การเปลี่ยนแปลงนโยบาย',
          content: 'เราอาจอัปเดตนโยบายความเป็นส่วนตัวนี้เป็นครั้งคราว เราจะแจ้งให้คุณทราบถึงการเปลี่ยนแปลงโดยการโพสต์นโยบายใหม่บนหน้านี้'
        },
        {
          title: '10. ติดต่อเรา',
          content: 'หากคุณมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ โปรดติดต่อเราที่:',
          contactInfo: [
            'อีเมล: privacy@yssbusinesstools.com',
            'YSS Business Tools',
            'บริการสนับสนุนในภาษาญี่ปุ่น อังกฤษ และไทย'
          ]
        }
      ]
    }
  };

  const currentContent = content[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Language Selector */}
        <div className="flex justify-center gap-2 mb-6">
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

        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-6">{currentContent.title}</h1>
          <p className="text-sm text-gray-600 mb-8">{currentContent.effectiveDate}</p>

          <div className="space-y-6 text-gray-700">
            {currentContent.sections.map((section, idx) => (
              <section key={idx}>
                <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
                {section.content && <p className="mb-2">{section.content}</p>}
                {section.items && (
                  <ul className="list-disc pl-6 space-y-1">
                    {section.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.contactInfo && (
                  <div className="mt-2">
                    {section.contactInfo.map((info, i) => (
                      <p key={i}>{info}</p>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          <div className="mt-12 text-center text-sm text-gray-500">
            <p>© 2025 YSS Business Tools. All rights reserved.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}