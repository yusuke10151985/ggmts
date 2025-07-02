import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, lang } = await req.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: '全ての項目を入力してください。' }, { status: 400 });
    }
    // DB保存
    await prisma.contact.create({
      data: { name, email, message },
    });
    // メール送信
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_FROM, // 管理者宛
      subject: `[ggmts] お問い合わせ: ${name}`,
      text: `お名前: ${name}\nメール: ${email}\n内容: ${message}`,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: '送信に失敗しました。', detail: e instanceof Error ? e.message + '\n' + e.stack : String(e) }, { status: 500 });
  }
}

// 必要な環境変数:
// EMAIL_FROM=送信元Gmailアドレス
// EMAIL_PASS=Gmailアプリパスワード
// EMAIL_SERVER（未使用、参考用） 