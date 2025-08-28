'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare, User, Send, Globe } from 'lucide-react';

type Lang = 'ja' | 'en' | 'th';

const labels: Record<Lang, { 
  title: string; 
  subtitle: string;
  name: string; 
  email: string; 
  message: string; 
  send: string; 
  required: string; 
  success: string; 
  error: string;
  signInRequired: string;
  signIn: string;
  supportInfo: string;
  responseTime: string;
}> = {
  ja: { 
    title: 'お問い合わせ', 
    subtitle: 'ご質問やご要望をお聞かせください',
    name: 'お名前', 
    email: 'メールアドレス', 
    message: 'お問い合わせ内容', 
    send: '送信', 
    required: '全ての項目を入力してください。', 
    success: '送信が完了しました。ありがとうございました。', 
    error: '送信に失敗しました。しばらくして再度お試しください。',
    signInRequired: 'お問い合わせフォームをご利用いただくには、ログインが必要です。',
    signIn: 'Googleでログイン',
    supportInfo: 'サポート情報',
    responseTime: '通常2営業日以内にご返信いたします'
  },
  en: { 
    title: 'Contact Us', 
    subtitle: 'We\'d love to hear from you',
    name: 'Name', 
    email: 'Email', 
    message: 'Message', 
    send: 'Send', 
    required: 'Please fill in all fields.', 
    success: 'Your message has been sent. Thank you!', 
    error: 'Failed to send. Please try again later.',
    signInRequired: 'Please sign in to use the contact form.',
    signIn: 'Sign in with Google',
    supportInfo: 'Support Information',
    responseTime: 'We typically respond within 2 business days'
  },
  th: { 
    title: 'ติดต่อเรา', 
    subtitle: 'เรายินดีรับฟังความคิดเห็นจากคุณ',
    name: 'ชื่อ', 
    email: 'อีเมล', 
    message: 'ข้อความ', 
    send: 'ส่ง', 
    required: 'กรุณากรอกทุกช่อง', 
    success: 'ส่งข้อความเรียบร้อย ขอบคุณค่ะ!', 
    error: 'ส่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    signInRequired: 'กรุณาเข้าสู่ระบบเพื่อใช้แบบฟอร์มติดต่อ',
    signIn: 'เข้าสู่ระบบด้วย Google',
    supportInfo: 'ข้อมูลการสนับสนุน',
    responseTime: 'เราจะตอบกลับภายใน 2 วันทำการ'
  }
};

const contactMethods = [
  {
    icon: Mail,
    title: 'Email Support',
    value: 'support@yssbusinesstools.com',
    description: 'For general inquiries'
  },
  {
    icon: MessageSquare,
    title: 'Technical Support',
    value: 'tech@yssbusinesstools.com',
    description: 'For technical issues'
  },
  {
    icon: Globe,
    title: 'Languages',
    value: 'Japanese, English, Thai',
    description: 'Multilingual support available'
  }
];

export default function ContactPage() {
  const { data: session, status } = useSession();
  const [lang, setLang] = useState<Lang>('ja');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const email = session?.user?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name || !email || !message) {
      setError(labels[lang].required);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, lang })
      });
      
      if (res.ok) {
        setSent(true);
        setName('');
        setMessage('');
      } else {
        setError(labels[lang].error);
      }
    } catch {
      setError(labels[lang].error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {labels[lang].title}
          </h1>
          <p className="text-xl text-gray-600">{labels[lang].subtitle}</p>
        </div>

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

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
            
            {status === 'loading' ? (
              <div className="text-center py-8">Loading...</div>
            ) : !session ? (
              <div className="text-center py-8">
                <p className="mb-4 text-gray-600">{labels[lang].signInRequired}</p>
                <Button onClick={() => signIn('google')} className="mx-auto">
                  <Mail className="w-4 h-4 mr-2" />
                  {labels[lang].signIn}
                </Button>
              </div>
            ) : sent ? (
              <div className="p-6 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300 rounded-lg">
                <p className="text-lg font-semibold">{labels[lang].success}</p>
                <p className="mt-2 text-sm">{labels[lang].responseTime}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    <User className="w-4 h-4 inline mr-1" />
                    {labels[lang].name}
                  </label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700"
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    <Mail className="w-4 h-4 inline mr-1" />
                    {labels[lang].email}
                  </label>
                  <input 
                    type="email" 
                    className="w-full border rounded-lg p-3 bg-gray-100 dark:bg-gray-800 dark:border-gray-700"
                    value={email} 
                    readOnly 
                    disabled 
                  />
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    {labels[lang].message}
                  </label>
                  <textarea 
                    className="w-full border rounded-lg p-3 resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700"
                    rows={6} 
                    value={message} 
                    onChange={e => setMessage(e.target.value)} 
                    required 
                  />
                </div>
                
                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}
                
                <Button type="submit" disabled={loading} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? 'Sending...' : labels[lang].send}
                </Button>
              </form>
            )}
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6">{labels[lang].supportInfo}</h2>
              <div className="space-y-4">
                {contactMethods.map((method, idx) => {
                  const Icon = method.icon;
                  return (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{method.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{method.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">{method.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <h3 className="font-semibold mb-3">Office Hours</h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>Monday - Friday: 9:00 AM - 6:00 PM (JST)</li>
                <li>Saturday: 10:00 AM - 4:00 PM (JST)</li>
                <li>Sunday & Holidays: Closed</li>
              </ul>
              <p className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                {labels[lang].responseTime}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}