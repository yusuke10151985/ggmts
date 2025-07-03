import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-08-16' as any });

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${(err as Error).message}` }, { status: 400 });
  }
  // サブスクリプション作成時
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const email = session.customer_email || session.metadata?.userEmail;
    if (email) {
      // どちらのプランか判定
      const line = session.display_items?.[0] || session.line_items?.[0] || (session.lines?.data?.[0]);
      const priceId = line?.price?.id || line?.price || line?.plan?.id;
      let role = 'pro';
      if (priceId === process.env.NEXT_PUBLIC_STRIPE_PREMIER_PRICE_ID) role = 'premier';
      const result = await prisma.user.updateMany({ where: { email: { equals: email, mode: 'insensitive' } }, data: { role: role as any } });
      console.log('Stripe Webhook:', { email, role, updatedCount: result.count });
      if (result.count === 0) {
        console.error('Stripe Webhook: No user found for email', email);
      }
    }
  }
  return NextResponse.json({ received: true });
} 