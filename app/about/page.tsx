import React from 'react';

export default function AboutPage() {
  return (
    <main className="max-w-2xl mx-auto p-4">
      <section className="mb-6 bg-card p-4 rounded shadow border">
        <h1 className="text-2xl font-bold mb-2">About Multi Translator GGMTS</h1>
        <p className="mb-2">Multi Translator GGMTS is an AI-powered web app that allows you to translate and summarize text in multiple languages instantly. Powered by Google Gemini and OpenAI GPT, it supports Japanese, English, Thai, and more.</p>
        <ul className="list-disc pl-5 mb-2">
          <li>Enter or paste your text in the input area.</li>
          <li>Select the target language(s) and choose Translate or Summarize.</li>
          <li>Copy, save, or share your results easily.</li>
          <li>History and multi-language support included.</li>
        </ul>
        <p className="text-sm text-muted-foreground">For questions or feedback, please use the <a href="/contact" className="underline">contact form</a>.</p>
      </section>
    </main>
  );
} 