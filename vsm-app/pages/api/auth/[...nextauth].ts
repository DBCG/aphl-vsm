import NextAuth from 'next-auth'
import CredentialProvider from 'next-auth/providers/credentials'

const userRoles = [
  'sysadmin',
  'admin',
  'author'
]

export default NextAuth({
  providers: [
    CredentialProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'username', type: 'text', placeholder: 'test' },
        password: { label: 'password', type: 'password', placeholder: 'testPw' }
      },
      authorize: (credentials) => {
        // db lookup would go here
        if (credentials?.username?.toLocaleLowerCase() === 'test' && credentials?.password === 'testPw') {
          return {
            id: 2,
            name: 'test',
            email: 'test@test.com',
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
  jwt: {
    secret: 'test'
  }
})