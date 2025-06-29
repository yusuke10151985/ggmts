import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Multilingual Translator',
  description: 'Privacy Policy for the Multilingual Translator service.',
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
            <h2 className="text-xl font-semibold">Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at privacy@example.com</p>
          </section>
        </div>
      </div>
    </div>
  )
} 