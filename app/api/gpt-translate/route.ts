import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { ja, to } = await req.json();
    if (!ja || !Array.isArray(to)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const results: Record<string, string> = {};
    for (const lang of to) {
      let prompt = '';
      if (lang === 'en') {
        prompt = `以下の日本語を自然な英語に翻訳してください。\n\n${ja}`;
      } else if (lang === 'th') {
        prompt = `以下の日本語を自然なタイ語に翻訳してください。\n\n${ja}`;
      } else {
        continue;
      }
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a professional translator.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1024,
        }),
      });
      if (!res.ok) {
        results[lang] = '';
        continue;
      }
      const data = await res.json();
      results[lang] = data.choices?.[0]?.message?.content?.trim() || '';
    }
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 