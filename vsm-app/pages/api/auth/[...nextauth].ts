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
        username: { label: 'username', type: 'text', placeholder: 'John123' },
        password: { label: 'password', type: 'password' }
      },
      authorize: (credentials) => {
        // db lookup would go here
        if (credentials.username.toLocaleLowerCase() === 'john123' && credentials.password === 'test') {
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