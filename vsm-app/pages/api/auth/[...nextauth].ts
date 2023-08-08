// @ts-nocheck
import NextAuth from 'next-auth'
import KeycloakProvider from 'next-auth/providers/keycloak'
import type { NextAuthOptions } from 'next-auth'
import jwt_decode from 'jwt-decode'

export const AuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_ID,
      clientSecret: process.env.KEYCLOAK_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
      redirect_uris: [process.env.KEYCLOAK_REDIRECT_URI]
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session?.user == null || session?.roles == null) {
        const decodedToken = jwt_decode(token?.account?.access_token)
        const roles = decodedToken?.resource_access?.[process.env.KEYCLOAK_ID]?.roles || []
        session.user = token?.user || {}
        session.idToken = token?.account?.id_token
        session.user.roles = roles
      }
      return session
    },
    async jwt({ token, user, account }) {
      // first time JWT cb is run, user object is available
      if (user) {
        token.user = user
        token.account = account
      }
      return token
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET
  },
  pages: {
    signIn: '/auth/signin',
  }
} as NextAuthOptions

export default NextAuth(AuthOptions)
