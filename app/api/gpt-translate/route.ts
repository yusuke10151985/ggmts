import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { jaTitle, jaBody, to } = await req.json();
    if ((!jaTitle && !jaBody) || !Array.isArray(to)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const results: Record<string, any> = {};
    for (const lang of to) {
      results[lang] = {};
      if (jaTitle) {
        let prompt = '';
        if (lang === 'en') {
          prompt = `以下の日本語タイトルを自然な英語タイトルに翻訳してください。\n\n${jaTitle}`;
        } else if (lang === 'th') {
          prompt = `以下の日本語タイトルを自然なタイ語タイトルに翻訳してください。\n\n${jaTitle}`;
        }
        if (prompt) {
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
              max_tokens: 256,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            results[lang].title = data.choices?.[0]?.message?.content?.trim() || '';
          }
        }
      }
      if (jaBody) {
        let prompt = '';
        if (lang === 'en') {
          prompt = `以下の日本語本文を自然な英語に翻訳してください。\n\n${jaBody}`;
        } else if (lang === 'th') {
          prompt = `以下の日本語本文を自然なタイ語に翻訳してください。\n\n${jaBody}`;
        }
        if (prompt) {
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
          if (res.ok) {
            const data = await res.json();
            results[lang].body = data.choices?.[0]?.message?.content?.trim() || '';
          }
        }
      }
    }
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 