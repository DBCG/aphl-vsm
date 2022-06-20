import NextAuth from 'next-auth'
import CredentialProvider from 'next-auth/providers/credentials'

const userRoles = [
  'admin',
  'author'
]

export default NextAuth({
  providers: [
    CredentialProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'email', type: 'email', placeholder: 'johndoe@test.com' },
        password: { label: 'password', type: 'password' }
      },
      authorize: (credentials) => {
        // db lookup
        if (credentials.username === 'johndoe@test.com' && credentials.password === 'test') {
          return {
            id: 2,
            name: 'John',
            email: 'johndoe@test.com',
            role: 'admin'
          }
        }
        return null
      }
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
  secret: 'test',
  jwt: {
    secret: 'test',
    encryption: true
  }
})