import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - Multilingual Translator',
  description: 'Terms of Service for the Multilingual Translator service.',
}

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-card p-6 rounded-lg border border-border shadow-sm text-foreground space-y-4">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-4">
          <section>
            <h2 className="text-xl font-semibold">Acceptance of Terms</h2>
            <p>By using our service, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service. We reserve the right to modify these terms at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Use of Service</h2>
            <p>You agree not to use the service for any illegal or unauthorized purpose. You are solely responsible for your conduct and any data, text, or information you submit.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Service Availability</h2>
            <p>We strive to provide reliable service but cannot guarantee uninterrupted availability. We may modify, suspend, or discontinue the service at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Limitation of Liability</h2>
            <p>We provide this service &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from the use of our service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at terms@example.com</p>
          </section>

          <h2>利用規約</h2>
          <p>当サイト（Multi Translator GGMTS）は、以下の条件に同意いただいた上でご利用ください。</p>
          <h3>禁止事項</h3>
          <ul>
            <li>法令または公序良俗に違反する行為</li>
            <li>当サイトの運営を妨害する行為</li>
            <li>不正アクセス等の行為</li>
          </ul>
          <h3>免責事項</h3>
          <p>当サイトの情報・サービスの利用によって生じた損害等について、当サイトは一切の責任を負いません。</p>
          <h3>規約の変更</h3>
          <p>本規約は予告なく変更されることがあります。最新の内容は本ページをご確認ください。</p>
        </div>
      </div>
    </div>
  )
} 