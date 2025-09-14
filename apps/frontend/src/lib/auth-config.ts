import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './prisma';
import { comparePassword } from './auth';
import { databaseService } from './database';

export const authConfig: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const admin = await databaseService.getAdmin(credentials.username);
          if (!admin) {
            return null;
          }

          const isValidPassword = await comparePassword(credentials.password, admin.password);
          if (!isValidPassword) {
            return null;
          }

          return {
            id: admin.id,
            username: admin.username,
            name: admin.username,
            email: `${admin.username}@localhost`
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.adminId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.username = token.username as string;
        session.user.adminId = token.adminId as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/admin/login'
  }
};