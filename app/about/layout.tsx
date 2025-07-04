import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About GGMTS - Multi-Language Translation & Summarization Service',
  description: 'Learn about GGMTS, an AI-powered translation and summarization service supporting multiple languages including Japanese, English, Thai, and more.',
  keywords: 'translation, summarization, AI, multilingual, GGMTS, Google Gemini, OpenAI GPT',
  openGraph: {
    title: 'About GGMTS - Multi-Language Translation Service',
    description: 'AI-powered translation and summarization service supporting multiple languages',
    url: 'https://www.ggmts.com/about',
    type: 'website',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}