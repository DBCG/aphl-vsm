import { Session } from "next-auth"

// ContentReviewer - Review, Approve
// ContentEditor - Review, Approve, Create drafts, edit any draft version
// ContentAdministrator - Review, Approve, Create drafts, Edit any draft version, Release

const reviewerPermissions = ['approve']
const editorPermissions = ['clone', 'approve', 'edit']
const adminPermissions = Array.from(new Set(['release', ...reviewerPermissions, ...editorPermissions])) // unique permissions

type RolesType = "admin" | "editor" | "reviewer"

const permissions = {
  admin: adminPermissions,
  editor: editorPermissions,
  reviewer: reviewerPermissions,
} as { [key in RolesType as string]: string[] }

export type VSMSession = Session & {
  idToken: string | undefined | null
  user: {
    roles?: string[] | null;
  }
}

export const can = (session: VSMSession, requestedPermission: string) => {
  if (!session || session?.user?.roles == null) {
    return false
  }
  // TODO: when users have more than one role we should look into modifying this
  const role = session.user?.roles[0]
  return permissions?.[role]?.includes(requestedPermission.toLowerCase())
}