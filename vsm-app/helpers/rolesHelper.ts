import { Session } from 'next-auth'

// ContentReviewer - Review, Approve
// ContentEditor - Review, Approve, Create drafts, edit any draft version
// ContentAdministrator - Review, Approve, Create drafts, Edit any draft version, Release

const reviewerPermissions = ['approve']
const editorPermissions = ['clone', 'approve', 'edit']
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
  const role = session.user?.roles[0]
  if (role === 'admin' || role === 'editor' || role === 'reviewer') {
    return permissions?.[role]?.includes(requestedPermission.toLowerCase())
  } else {
    throw new Error("Invalid role: " + role)
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
