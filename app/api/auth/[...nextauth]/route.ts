import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      // 必要に応じてユーザー情報をセッションに追加
      if (session.user) {
        const userAny = session.user as any;
        userAny.id = token.sub;
        // DBからroleを取得してsession.userに追加
        const user = await prisma.user.findUnique({ where: { email: userAny.email ?? undefined } });
        // @ts-expect-error: Add custom property 'role' to session.user
        userAny.role = user?.role || 'free';
      }
      return session;
    },
  },
  adapter: PrismaAdapter(prisma),
});

export { handler as GET, handler as POST }; 