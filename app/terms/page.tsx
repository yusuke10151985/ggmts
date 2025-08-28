'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

type Language = 'en' | 'ja' | 'th';

const translations = {
  en: {
    title: 'Terms of Service',
    effectiveDate: 'Effective Date: December 1, 2024',
    sections: {
      acceptance: {
        title: '1. Acceptance of Terms',
        content: 'By accessing and using YSS Business Tools (including GGMTS and MOM Manager), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.'
      },
      service: {
        title: '2. Service Description',
        content: 'YSS Business Tools provides:',
        items: [
          'GGMTS: Multilingual translation services powered by AI',
          'MOM Manager: Meeting minutes creation and management system',
          'SWGR RFQ: Dynamic form management for switchgear RFQ',
          'Related features and functionalities'
        ]
      },
      accounts: {
        title: '3. User Accounts',
        items: [
          'You must provide accurate and complete information when creating an account',
          'You are responsible for maintaining the security of your account',
          'You are responsible for all activities under your account',
          'You must notify us immediately of any unauthorized use'
        ]
      },
      plans: {
        title: '4. Subscription Plans',
        free: {
          title: 'Free Plan:',
          items: ['Limited monthly usage', 'Basic features']
        },
        pro: {
          title: 'Pro Plan ($9.99/month):',
          items: ['500 translations per month', 'Advanced features', 'Priority support']
        },
        premier: {
          title: 'Premier Plan ($29.99/month):',
          items: ['2000 translations per month', 'All features', 'Premium support']
        }
      },
      payment: {
        title: '5. Payment Terms',
        items: [
          'Payments are processed through Stripe',
          'Subscriptions are billed monthly in advance',
          'All fees are non-refundable unless required by law',
          'You can cancel your subscription at any time'
        ]
      },
      acceptable: {
        title: '6. Acceptable Use',
        content: 'You agree not to:',
        items: [
          'Use the service for any illegal purposes',
          'Violate any applicable laws or regulations',
          'Infringe on intellectual property rights',
          'Upload malicious content or code',
          'Attempt to gain unauthorized access',
          'Interfere with service operations',
          'Use automated systems to access the service'
        ]
      },
      intellectual: {
        title: '7. Intellectual Property',
        items: [
          'You retain ownership of content you create',
          'You grant us a license to use your content to provide services',
          'Our service, including software and design, is protected by intellectual property laws',
          'You may not copy, modify, or reverse engineer our service'
        ]
      },
      privacy: {
        title: '8. Data and Privacy',
        content: 'Your use of our services is also governed by our Privacy Policy. By using our services, you consent to our data practices as described in the Privacy Policy.'
      },
      disclaimers: {
        title: '9. Disclaimers',
        items: [
          'Services are provided "as is" without warranties',
          'We do not guarantee 100% accuracy of translations',
          'We are not responsible for content you create or share',
          'We do not guarantee uninterrupted service availability'
        ]
      },
      liability: {
        title: '10. Limitation of Liability',
        content: 'To the maximum extent permitted by law, YSS Business Tools shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service.'
      },
      indemnification: {
        title: '11. Indemnification',
        content: 'You agree to indemnify and hold harmless YSS Business Tools from any claims, damages, losses, and expenses arising from your use of the service or violation of these terms.'
      },
      termination: {
        title: '12. Termination',
        content: 'We reserve the right to terminate or suspend your account at any time for violation of these terms or for any other reason at our sole discretion.'
      },
      changes: {
        title: '13. Changes to Terms',
        content: 'We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.'
      },
      governing: {
        title: '14. Governing Law',
        content: 'These terms are governed by the laws of the jurisdiction in which YSS Business Tools operates, without regard to conflict of law principles.'
      },
      contact: {
        title: '15. Contact Information',
        content: 'For questions about these Terms of Service, please contact us at:',
        email: 'Email: legal@yssbusinesstools.com',
        support: 'Support: support@yssbusinesstools.com',
        languages: 'Available in Japanese, English, and Thai'
      }
    }
  },
  ja: {
    title: '利用規約',
    effectiveDate: '発効日: 2024年12月1日',
    sections: {
      acceptance: {
        title: '1. 規約の承諾',
        content: 'YSSビジネスツール（GGMTS、MOMマネージャー、SWGR RFQを含む）にアクセスし使用することにより、お客様は本利用規約に拘束されることに同意するものとします。本規約に同意いただけない場合は、当サービスを利用しないでください。'
      },
      service: {
        title: '2. サービスの説明',
        content: 'YSSビジネスツールは以下を提供します：',
        items: [
          'GGMTS: AI搭載の多言語翻訳サービス',
          'MOMマネージャー: 議事録作成・管理システム',
          'SWGR RFQ: スイッチギアRFQ用動的フォーム管理',
          '関連する機能とサービス'
        ]
      },
      accounts: {
        title: '3. ユーザーアカウント',
        items: [
          'アカウント作成時に正確かつ完全な情報を提供する必要があります',
          'アカウントのセキュリティを維持する責任があります',
          'アカウントでのすべての活動に責任を負います',
          '不正使用を発見した場合は直ちに通知する必要があります'
        ]
      },
      plans: {
        title: '4. サブスクリプションプラン',
        free: {
          title: '無料プラン:',
          items: ['月間利用制限あり', '基本機能']
        },
        pro: {
          title: 'プロプラン ($9.99/月):',
          items: ['月間500回の翻訳', '高度な機能', '優先サポート']
        },
        premier: {
          title: 'プレミアプラン ($29.99/月):',
          items: ['月間2000回の翻訳', 'すべての機能', 'プレミアムサポート']
        }
      },
      payment: {
        title: '5. 支払い条件',
        items: [
          '支払いはStripeを通じて処理されます',
          'サブスクリプションは月額前払いです',
          '法律で要求される場合を除き、すべての料金は返金不可です',
          'いつでもサブスクリプションをキャンセルできます'
        ]
      },
      acceptable: {
        title: '6. 利用規定',
        content: '以下の行為を行わないことに同意します：',
        items: [
          '違法な目的でサービスを使用すること',
          '適用される法律や規制に違反すること',
          '知的財産権を侵害すること',
          '悪意のあるコンテンツやコードをアップロードすること',
          '不正アクセスを試みること',
          'サービスの運用を妨害すること',
          '自動化システムを使用してサービスにアクセスすること'
        ]
      },
      intellectual: {
        title: '7. 知的財産',
        items: [
          '作成したコンテンツの所有権は保持されます',
          'サービス提供のためにコンテンツを使用するライセンスを当社に付与します',
          'ソフトウェアとデザインを含む当社のサービスは知的財産法により保護されています',
          '当社のサービスをコピー、変更、リバースエンジニアリングすることはできません'
        ]
      },
      privacy: {
        title: '8. データとプライバシー',
        content: '当サービスの利用は、プライバシーポリシーによっても規定されています。当サービスを利用することにより、プライバシーポリシーに記載されているデータの取り扱いに同意するものとします。'
      },
      disclaimers: {
        title: '9. 免責事項',
        items: [
          'サービスは「現状のまま」保証なしで提供されます',
          '翻訳の100％の正確性を保証しません',
          '作成または共有するコンテンツについて責任を負いません',
          'サービスの中断のない可用性を保証しません'
        ]
      },
      liability: {
        title: '10. 責任の制限',
        content: '法律で許可される最大限の範囲で、YSSビジネスツールは、サービスの使用または使用不能に起因する間接的、偶発的、特別、結果的、または懲罰的損害について責任を負いません。'
      },
      indemnification: {
        title: '11. 補償',
        content: 'お客様は、サービスの使用または本規約の違反から生じるいかなる請求、損害、損失、および費用からYSSビジネスツールを補償し、損害を与えないことに同意します。'
      },
      termination: {
        title: '12. 終了',
        content: '当社は、本規約の違反またはその他の理由により、いつでもお客様のアカウントを終了または停止する権利を留保します。'
      },
      changes: {
        title: '13. 規約の変更',
        content: '当社はいつでも本規約を変更することがあります。変更後のサービスの継続使用は、新しい規約の承諾を意味します。'
      },
      governing: {
        title: '14. 準拠法',
        content: '本規約は、法の抵触の原則にかかわらず、YSSビジネスツールが運営される管轄区域の法律に準拠します。'
      },
      contact: {
        title: '15. 連絡先情報',
        content: '本利用規約に関するご質問は、以下までお問い合わせください：',
        email: 'メール: legal@yssbusinesstools.com',
        support: 'サポート: support@yssbusinesstools.com',
        languages: '日本語、英語、タイ語対応'
      }
    }
  },
  th: {
    title: 'ข้อกำหนดในการให้บริการ',
    effectiveDate: 'วันที่มีผล: 1 ธันวาคม 2567',
    sections: {
      acceptance: {
        title: '1. การยอมรับข้อกำหนด',
        content: 'เมื่อเข้าถึงและใช้งาน YSS Business Tools (รวมถึง GGMTS, MOM Manager และ SWGR RFQ) คุณตกลงที่จะผูกพันตามข้อกำหนดในการให้บริการเหล่านี้ หากคุณไม่ตกลงกับข้อกำหนดเหล่านี้ กรุณาอย่าใช้บริการของเรา'
      },
      service: {
        title: '2. คำอธิบายบริการ',
        content: 'YSS Business Tools ให้บริการ:',
        items: [
          'GGMTS: บริการแปลหลายภาษาด้วย AI',
          'MOM Manager: ระบบสร้างและจัดการรายงานการประชุม',
          'SWGR RFQ: การจัดการแบบฟอร์มแบบไดนามิกสำหรับ RFQ สวิตช์เกียร์',
          'คุณสมบัติและฟังก์ชันที่เกี่ยวข้อง'
        ]
      },
      accounts: {
        title: '3. บัญชีผู้ใช้',
        items: [
          'คุณต้องให้ข้อมูลที่ถูกต้องและสมบูรณ์เมื่อสร้างบัญชี',
          'คุณมีความรับผิดชอบในการรักษาความปลอดภัยของบัญชีของคุณ',
          'คุณรับผิดชอบต่อกิจกรรมทั้งหมดภายใต้บัญชีของคุณ',
          'คุณต้องแจ้งเราทันทีหากพบการใช้งานที่ไม่ได้รับอนุญาต'
        ]
      },
      plans: {
        title: '4. แผนการสมัครสมาชิก',
        free: {
          title: 'แผนฟรี:',
          items: ['การใช้งานรายเดือนจำกัด', 'คุณสมบัติพื้นฐาน']
        },
        pro: {
          title: 'แผน Pro ($9.99/เดือน):',
          items: ['แปล 500 ครั้งต่อเดือน', 'คุณสมบัติขั้นสูง', 'การสนับสนุนลำดับความสำคัญ']
        },
        premier: {
          title: 'แผน Premier ($29.99/เดือน):',
          items: ['แปล 2000 ครั้งต่อเดือน', 'คุณสมบัติทั้งหมด', 'การสนับสนุนพรีเมียม']
        }
      },
      payment: {
        title: '5. เงื่อนไขการชำระเงิน',
        items: [
          'การชำระเงินดำเนินการผ่าน Stripe',
          'การสมัครสมาชิกจะเรียกเก็บเงินรายเดือนล่วงหน้า',
          'ค่าธรรมเนียมทั้งหมดไม่สามารถคืนเงินได้ เว้นแต่กฎหมายกำหนด',
          'คุณสามารถยกเลิกการสมัครสมาชิกได้ตลอดเวลา'
        ]
      },
      acceptable: {
        title: '6. การใช้งานที่ยอมรับได้',
        content: 'คุณตกลงที่จะไม่:',
        items: [
          'ใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมาย',
          'ละเมิดกฎหมายหรือข้อบังคับที่บังคับใช้',
          'ละเมิดสิทธิ์ในทรัพย์สินทางปัญญา',
          'อัปโหลดเนื้อหาหรือโค้ดที่เป็นอันตราย',
          'พยายามเข้าถึงโดยไม่ได้รับอนุญาต',
          'รบกวนการทำงานของบริการ',
          'ใช้ระบบอัตโนมัติเพื่อเข้าถึงบริการ'
        ]
      },
      intellectual: {
        title: '7. ทรัพย์สินทางปัญญา',
        items: [
          'คุณยังคงเป็นเจ้าของเนื้อหาที่คุณสร้าง',
          'คุณให้สิทธิ์แก่เราในการใช้เนื้อหาของคุณเพื่อให้บริการ',
          'บริการของเรารวมถึงซอฟต์แวร์และการออกแบบได้รับการคุ้มครองโดยกฎหมายทรัพย์สินทางปัญญา',
          'คุณไม่สามารถคัดลอก แก้ไข หรือวิศวกรรมย้อนกลับบริการของเรา'
        ]
      },
      privacy: {
        title: '8. ข้อมูลและความเป็นส่วนตัว',
        content: 'การใช้บริการของเรายังอยู่ภายใต้นโยบายความเป็นส่วนตัวของเรา โดยการใช้บริการของเรา คุณยินยอมให้เราปฏิบัติต่อข้อมูลตามที่อธิบายไว้ในนโยบายความเป็นส่วนตัว'
      },
      disclaimers: {
        title: '9. ข้อจำกัดความรับผิดชอบ',
        items: [
          'บริการให้ "ตามสภาพ" โดยไม่มีการรับประกัน',
          'เราไม่รับประกันความถูกต้อง 100% ของการแปล',
          'เราไม่รับผิดชอบต่อเนื้อหาที่คุณสร้างหรือแบ่งปัน',
          'เราไม่รับประกันความพร้อมใช้งานของบริการอย่างต่อเนื่อง'
        ]
      },
      liability: {
        title: '10. การจำกัดความรับผิด',
        content: 'ภายใต้ขอบเขตสูงสุดที่กฎหมายอนุญาต YSS Business Tools จะไม่รับผิดต่อความเสียหายทางอ้อม อุบัติเหตุ พิเศษ ผลสืบเนื่อง หรือการลงโทษที่เกิดจากการใช้หรือไม่สามารถใช้บริการได้'
      },
      indemnification: {
        title: '11. การชดใช้ค่าเสียหาย',
        content: 'คุณตกลงที่จะชดใช้และปกป้อง YSS Business Tools จากการเรียกร้อง ความเสียหาย การสูญเสีย และค่าใช้จ่ายที่เกิดจากการใช้บริการหรือการละเมิดข้อกำหนดเหล่านี้'
      },
      termination: {
        title: '12. การยุติ',
        content: 'เราขอสงวนสิทธิ์ในการยุติหรือระงับบัญชีของคุณได้ตลอดเวลาสำหรับการละเมิดข้อกำหนดเหล่านี้หรือด้วยเหตุผลอื่นใดตามดุลยพินิจของเราแต่เพียงผู้เดียว'
      },
      changes: {
        title: '13. การเปลี่ยนแปลงข้อกำหนด',
        content: 'เราอาจแก้ไขข้อกำหนดเหล่านี้ได้ตลอดเวลา การใช้บริการต่อเนื่องหลังจากการเปลี่ยนแปลงถือว่าเป็นการยอมรับข้อกำหนดใหม่'
      },
      governing: {
        title: '14. กฎหมายที่ใช้บังคับ',
        content: 'ข้อกำหนดเหล่านี้อยู่ภายใต้กฎหมายของเขตอำนาจที่ YSS Business Tools ดำเนินการ โดยไม่คำนึงถึงหลักการขัดแย้งของกฎหมาย'
      },
      contact: {
        title: '15. ข้อมูลติดต่อ',
        content: 'หากมีคำถามเกี่ยวกับข้อกำหนดในการให้บริการเหล่านี้ กรุณาติดต่อเราที่:',
        email: 'อีเมล: legal@yssbusinesstools.com',
        support: 'ฝ่ายสนับสนุน: support@yssbusinesstools.com',
        languages: 'ให้บริการในภาษาญี่ปุ่น อังกฤษ และไทย'
      }
    }
  }
};

export default function TermsPage() {
  const [language, setLanguage] = useState<Language>('en');
  const t = translations[language];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{t.title}</h1>
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
          
          <p className="text-sm text-gray-600 mb-8">{t.effectiveDate}</p>

          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.acceptance.title}</h2>
              <p>{t.sections.acceptance.content}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.service.title}</h2>
              <p className="mb-2">{t.sections.service.content}</p>
              <ul className="list-disc pl-6 space-y-1">
                {t.sections.service.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.accounts.title}</h2>
              <ul className="list-disc pl-6 space-y-2">
                {t.sections.accounts.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.plans.title}</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold">{t.sections.plans.free.title}</h3>
                  <ul className="list-disc pl-6 mt-1">
                    {t.sections.plans.free.items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold">{t.sections.plans.pro.title}</h3>
                  <ul className="list-disc pl-6 mt-1">
                    {t.sections.plans.pro.items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold">{t.sections.plans.premier.title}</h3>
                  <ul className="list-disc pl-6 mt-1">
                    {t.sections.plans.premier.items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.payment.title}</h2>
              <ul className="list-disc pl-6 space-y-2">
                {t.sections.payment.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.acceptable.title}</h2>
              <p className="mb-2">{t.sections.acceptable.content}</p>
              <ul className="list-disc pl-6 space-y-1">
                {t.sections.acceptable.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.intellectual.title}</h2>
              <ul className="list-disc pl-6 space-y-2">
                {t.sections.intellectual.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.privacy.title}</h2>
              <p>{t.sections.privacy.content}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.disclaimers.title}</h2>
              <ul className="list-disc pl-6 space-y-2">
                {t.sections.disclaimers.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.liability.title}</h2>
              <p>{t.sections.liability.content}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.indemnification.title}</h2>
              <p>{t.sections.indemnification.content}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.termination.title}</h2>
              <p>{t.sections.termination.content}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.changes.title}</h2>
              <p>{t.sections.changes.content}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.governing.title}</h2>
              <p>{t.sections.governing.content}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t.sections.contact.title}</h2>
              <p>{t.sections.contact.content}</p>
              <p className="mt-2">
                {t.sections.contact.email}<br />
                {t.sections.contact.support}<br />
                {t.sections.contact.languages}
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
}