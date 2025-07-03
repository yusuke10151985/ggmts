import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { SessionStrategy } from 'next-auth';
import prisma from './prisma';
import nodemailer from 'nodemailer';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt' as SessionStrategy,
  },
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        const userAny = session.user as any;
        userAny.id = token.sub;
        const user = await prisma.user.findUnique({ where: { email: userAny.email ?? undefined } });
        userAny.role = user?.role || 'free';
      }
      return session;
    },
  },
  adapter: PrismaAdapter(prisma),
  events: {
    async createUser({ user }: { user: any }) {
      // 新規サインイン時のみ管理者へメール送信
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_FROM,
            pass: process.env.EMAIL_PASS,
          },
        });
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: 'ggtms.info@gmail.com',
          subject: `[ggmts] 新規ユーザーサインイン: ${user.name || user.email}`,
          text: `新しいユーザーがサインインしました。\n\n名前: ${user.name}\nメール: ${user.email}`,
        });
      } catch (e) {
        console.error('新規サインイン通知メール送信エラー:', e);
      }
    },
  },
}; 