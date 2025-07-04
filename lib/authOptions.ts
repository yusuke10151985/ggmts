import GoogleProvider from 'next-auth/providers/google';
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
      console.log('Session callback triggered for user:', session?.user?.email, 'token.sub:', token.sub);
      if (session.user) {
        try {
          const userAny = session.user as any;
          userAny.id = token.sub;
          
          // ユーザーが存在するかチェック
          let user = await prisma.user.findUnique({ where: { email: userAny.email ?? undefined } });
          
          // ユーザーが存在しない場合は作成
          if (!user && userAny.email) {
            console.log('Creating new user:', userAny.email, 'with ID:', token.sub);
            try {
              user = await prisma.user.create({
                data: {
                  id: token.sub,
                  email: userAny.email,
                  name: userAny.name || null,
                  image: userAny.image || null,
                  role: 'free'
                }
              });
              console.log('User created successfully:', user.id);
            } catch (createError) {
              console.error('Failed to create user:', createError);
              // ユーザー作成に失敗した場合、再度検索を試行（同時作成のケース）
              try {
                user = await prisma.user.findUnique({ where: { email: userAny.email } });
                if (user) {
                  console.log('User found after creation failure:', user.id);
                } else {
                  console.error('User still not found after creation failure');
                }
              } catch (retryError) {
                console.error('Retry search also failed:', retryError);
              }
            }
          }
          
          userAny.role = user?.role || 'free';
        } catch (error) {
          console.error('Error fetching or creating user:', error);
          // セッションを維持し、デフォルトロールを設定
          (session.user as any).role = 'free';
        }
      }
      return session;
    },
  },
  debug: false,
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