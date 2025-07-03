import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-08-16' as any });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Stripeの価格ID（Stripeダッシュボードで作成したProプランのPrice IDを設定）
  const { priceId } = await req.json();
  if (!priceId) {
    return NextResponse.json({ error: 'Price ID required' }, { status: 400 });
  }
  // 既存サブスクリプションがpro→premierの場合はアップグレード
  const customerList = await stripe.customers.list({ email: session.user.email });
  const customer = customerList.data[0];
  let subscription;
  if (customer) {
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'active' });
    subscription = subs.data.find(s => s.status === 'active');
  }
  if (subscription) {
    // 既存サブスクリプションのアイテムをアップグレード
    const updated = await stripe.subscriptions.update(subscription.id, {
      items: [{ id: subscription.items.data[0].id, price: priceId }],
      proration_behavior: 'create_prorations',
    });
    return NextResponse.json({ url: '/' });
  }
  // 新規サブスクリプション
  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      { price: priceId, quantity: 1 },
    ],
    customer_email: session.user.email,
    success_url: `${process.env.NEXTAUTH_URL}/?stripe=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/?stripe=cancel`,
    metadata: { userEmail: session.user.email },
  });
  return NextResponse.json({ url: checkoutSession.url });
} 