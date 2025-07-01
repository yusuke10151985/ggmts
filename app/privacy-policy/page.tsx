import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Multi Translator GGMTS',
  description: 'Privacy Policy for the Multi Translator GGMTS service.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-card p-6 rounded-lg border border-border shadow-sm text-foreground space-y-4">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-4">
          <section>
            <h2 className="text-xl font-semibold">Information We Collect</h2>
            <p>We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and disclose your personal information. We collect information you provide directly to us, such as when you enter text for translation.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">How We Use Your Information</h2>
            <p>We may use the information we collect to provide, maintain, and improve our services. We do not share your personal information with third parties except as described in this Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Data Storage</h2>
            <p>Translation history is stored locally in your browser using localStorage. We do not store your translation data on our servers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Third-Party Services</h2>
            <p>We use third-party AI services (Google Gemini, OpenAI GPT) to process translations. These services may have their own privacy policies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Google AdSense and Cookies</h2>
            <p>This site uses Google AdSense, a third-party advertising service. AdSense may use cookies to display personalized ads based on your interests. For more information about how Google uses cookies in advertising, please see <a href="https://policies.google.com/technologies/ads?hl=en" target="_blank" rel="noopener noreferrer">here</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Contact Information</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:ggmts.info@gmail.com">ggmts.info@gmail.com</a></p>
          </section>

          <h2>プライバシーポリシー</h2>
          <p>当サイト（Multi Translator GGMTS）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。</p>
          <h3>広告配信について</h3>
          <p>当サイトでは、第三者配信の広告サービス（Google AdSense）を利用しています。広告配信事業者は、ユーザーの興味に応じた広告を表示するためにCookieを使用することがあります。Googleによる広告でのCookieの取り扱いについては<a href="https://policies.google.com/technologies/ads?hl=ja" target="_blank" rel="noopener noreferrer">こちら</a>をご覧ください。</p>
          <h3>アクセス解析ツールについて</h3>
          <p>当サイトでは、Google Analytics等のアクセス解析ツールを利用する場合があります。これらのツールはトラフィックデータ収集のためにCookieを使用しますが、個人を特定するものではありません。</p>
          <h3>個人情報の利用目的</h3>
          <p>お問い合わせ時に取得した個人情報は、返信・連絡のためにのみ利用します。</p>
          <h3>免責事項</h3>
          <p>当サイトの情報・広告等の利用によって生じた損害等については一切の責任を負いかねます。</p>
        </div>
      </div>
    </div>
  )
} 