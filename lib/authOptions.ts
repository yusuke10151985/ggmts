import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { SessionStrategy } from 'next-auth';
import prisma from './prisma';

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
}; 