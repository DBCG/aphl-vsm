import NextAuth from 'next-auth'
import KeycloakProvider from 'next-auth/providers/keycloak'

const userRoles = [
  'sysadmin',
  'admin',
  'author'
]

export default NextAuth({
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
  jwt: {
    secret: 'test'
  }
})