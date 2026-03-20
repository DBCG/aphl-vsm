import { Session } from 'next-auth'
import { isReleaseInProgress } from './libraryHelpers'

// ContentReviewer - Review, Approve
// ContentEditor - Review, Approve, Create drafts, edit any draft version
// ContentAdministrator - Review, Approve, Create drafts, Edit any draft version, Release

// implementerPermissions is intentionally empty: implementers are read-only and have no write actions
const implementerPermissions: string[] = []
const reviewerPermissions = ['approve']
const editorPermissions = ['clone', 'approve', 'edit', 'withdraw', 'retire', 'delete']
const adminPermissions = Array.from(new Set(['release', ...reviewerPermissions, ...editorPermissions])) // unique permissions
const publisherPermissions = [...adminPermissions]

type RolesType = 'admin' | 'editor' | 'reviewer' | 'implementer' | 'publisher'

const permissions: { [key in RolesType]: string[] } = {
  admin: adminPermissions,
  publisher: publisherPermissions,
  editor: editorPermissions,
  reviewer: reviewerPermissions,
  implementer: implementerPermissions
}

export type VSMSession = Session & {
  idToken: string | undefined | null
  user: {
    id: string
    roles?: string[] | null
  }
}

// Role hierarchy: highest privilege first. Used to resolve the effective role when a user has multiple.
const roleHierarchy = ['admin', 'publisher', 'editor', 'reviewer', 'implementer'] as const

export const getHighestPermissionOfUser = (roles: string[] | string | null): string | null => {
  if (!roles) return null
  if (typeof roles === 'string') return roles
  for (const role of roleHierarchy) {
    if (roles.includes(role)) return role
  }
  return null
}

export const can = (session: VSMSession, requestedPermission: string) => {
  if (!session || session?.user?.roles == null) {
    return false
  }
  const highestRole = getHighestPermissionOfUser(session.user.roles) as RolesType | null
  if (!highestRole || !permissions[highestRole]) {
    console.error('invalid role:', highestRole)
    return false
  }
  return permissions[highestRole].includes(requestedPermission.toLowerCase())
}

export const getUserRole = (session: VSMSession): string | null => {
  if (!session?.user?.roles) return null
  const highest = getHighestPermissionOfUser(session.user.roles)
  return highest ? highest.charAt(0).toUpperCase() + highest.slice(1) : null
}

export const isAdmin = (session: VSMSession) => {
  if (!session || session?.user?.roles == null) {
    return false
  }
  return getHighestPermissionOfUser(session.user.roles) === 'admin'
}

export const isImplementer = (session: VSMSession) => {
  if (!session || session?.user?.roles == null) {
    return false
  }
  return getHighestPermissionOfUser(session.user.roles) === 'implementer'
}

export const isPublisher = (session: VSMSession) => {
  if (!session || session?.user?.roles == null) {
    return false
  }
  return getHighestPermissionOfUser(session.user.roles) === 'publisher'
}

interface AllowToEdit {
  session: VSMSession
  program: fhir4.Library
}

interface AllowToClone {
  session: VSMSession
  program: fhir4.Library
}

interface AllowToWithdraw {
  session: VSMSession
  program: fhir4.Library
}

interface AllowToRetire {
  session: VSMSession
  program: fhir4.Library
}

interface AllowToDelete {
  session: VSMSession
  program: fhir4.Library
}

interface AllowToRelease {
  session: VSMSession
  program: fhir4.Library
  hasApproval: boolean
}

export const allowClone = ({ session, program }: AllowToClone): boolean => {
  return can(session, 'clone') && program?.status === 'active'
}

export const allowRelease = ({ session, program, hasApproval }: AllowToRelease): boolean => {
  return can(session, 'release') && program?.status === 'draft' && hasApproval
}

export const allowEditing = ({ session, program }: AllowToEdit): boolean => {
  const isReleasing = isReleaseInProgress(program)
  return can(session, 'edit') && program?.status === 'draft' && !isReleasing
}

export const allowWithdraw = ({ session, program }: AllowToWithdraw): boolean => {
  return can(session, 'withdraw') && program?.status === 'draft'
}

export const allowRetire = ({ session, program }: AllowToRetire): boolean => {
  return can(session, 'retire') && program?.status === 'active'
}

export const allowDelete = ({ session, program }: AllowToDelete): boolean => {
  return can(session, 'delete') && program?.status === 'retired'
}
