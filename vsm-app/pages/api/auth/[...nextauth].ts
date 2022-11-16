// @ts-nocheck
import NextAuth from 'next-auth'
import KeycloakProvider from 'next-auth/providers/keycloak'
import type { NextAuthOptions } from 'next-auth'

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
    jwt: async ({ token, user }) => {
      // first time JWT cb is run, user object is available
      if (user) {
        token.id = user.id
      }
      return token
    },
    session: async ({ session, token }) => {
      if (token) {
        session.id = token.id
      }
      return session
    },
  },
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    secret: 'test' // TODO: swap this out
  }
} as NextAuthOptions

export default NextAuth(AuthOptions)