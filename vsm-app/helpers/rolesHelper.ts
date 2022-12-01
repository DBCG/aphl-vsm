import { Session } from "next-auth"

// TODO: Once we have definitive permissions and what those things 
// can do we could do something like this to allow
// { author: {
//   valueSet: ['read', 'write']
//   }
// }

export type VSMSession = Session & {
  user: {
    roles?: string[] | null;
  }
}

export const isAuthor = (session: VSMSession | null) => {
  return session?.user?.roles?.includes('author')
}

export const isAdmin = (session: VSMSession | null) => {
  return session?.user?.roles?.includes('admin')
}