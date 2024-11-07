import { Session } from 'next-auth'

// ContentReviewer - Review, Approve
// ContentEditor - Review, Approve, Create drafts, edit any draft version
// ContentAdministrator - Review, Approve, Create drafts, Edit any draft version, Release

const reviewerPermissions = ['approve']
const editorPermissions = ['clone', 'approve', 'edit', 'withdraw', 'retire', 'delete']
const adminPermissions = Array.from(new Set(['release', ...reviewerPermissions, ...editorPermissions])) // unique permissions

type RolesType = 'admin' | 'editor' | 'reviewer'

const permissions: { [key in RolesType]: string[] } = {
  admin: adminPermissions,
  editor: editorPermissions,
  reviewer: reviewerPermissions
}

export type VSMSession = Session & {
  idToken: string | undefined | null
  user: {
    id: string
    roles?: string[] | null
  }
}

export const can = (session: VSMSession, requestedPermission: string) => {
  if (!session || session?.user?.roles == null) {
    return false
  }
  // TODO: when users have more than one role we should look into modifying this
  const allRoles = session.user?.roles[0]
  let highestRole
  const roles = ['reviewer', 'editor', 'admin']

  for (const role of roles) {
    if (allRoles?.includes(role)) {
      highestRole = role
    }
  }

  if (highestRole === 'admin' || highestRole === 'editor' || highestRole === 'reviewer') {
    return permissions?.[highestRole]?.includes(requestedPermission.toLowerCase())
  } else {
    console.error('invalid role:', highestRole)
    return false
  }
}

interface AllowToEdit {
  session: VSMSession
  programStatus: fhir4.Library['status'] | undefined
}

interface AllowToClone {
  session: VSMSession
  programStatus: fhir4.Library['status'] | undefined
}

interface AllowToWithdraw {
  session: VSMSession
  programStatus: fhir4.Library['status'] | undefined
}

interface AllowToRetire {
  session: VSMSession
  programStatus: fhir4.Library['status'] | undefined
}

interface AllowToDelete {
  session: VSMSession
  programStatus: fhir4.Library['status'] | undefined
}

interface AllowToRelease {
  session: VSMSession
  programStatus: fhir4.Library['status'] | undefined
  hasApproval: boolean
}

export const allowClone = ({ session, programStatus }: AllowToClone): boolean => {
  return can(session, 'clone') && programStatus === 'active'
}

export const allowRelease = ({ session, programStatus, hasApproval }: AllowToRelease): boolean => {
  return can(session, 'release') && programStatus === 'draft' && hasApproval
}

export const allowEditing = ({ session, programStatus }: AllowToEdit): boolean => {
  return can(session, 'edit') && programStatus === 'draft'
}

export const allowWithdraw = ({ session, programStatus }: AllowToWithdraw): boolean => {
  return can(session, 'withdraw') && programStatus === 'draft'
}

export const allowRetire = ({ session, programStatus }: AllowToRetire): boolean => {
  return can(session, 'retire') && programStatus === 'active'
}

export const allowDelete = ({ session, programStatus }: AllowToDelete): boolean => {
  return can(session, 'delete') && programStatus === 'retired'
}
