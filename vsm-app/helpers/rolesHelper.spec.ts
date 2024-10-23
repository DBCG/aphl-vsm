import { can, allowEditing, allowDelete } from './rolesHelper'

describe('rolesHelper', () => {
  describe('can', () => {
    it('admin role has the expected permissions', () => {
      const allowedPermissions = ['clone', 'approve', 'edit', 'release', 'withdraw', 'delete']
      const session = {
        user: {
          roles: ['admin']
        }
      }
      allowedPermissions.forEach((permission) => {
        expect(can(session, permission)).toBe(true)
      })
    })

    it('editor role has the expected permissions', () => {
      const allowedPermissions = ['clone', 'approve', 'edit', 'withdraw', 'delete']
      const session = {
        user: {
          roles: ['editor']
        }
      }
      allowedPermissions.forEach((permission) => {
        expect(can(session, permission)).toBe(true)
      })
    })

    it('reviewer role has the expected permissions', () => {
      const allowedPermissions = ['approve']
      const session = {
        user: {
          roles: ['reviewer']
        }
      }
      allowedPermissions.forEach((permission) => {
        expect(can(session, permission)).toBe(true)
      })
    })

    it('should deny the user if they do not have the appropriate access to permission', () => {
      const session = {
        user: {
          roles: ['reviewer']
        }
      }
      expect(can(session, 'edit')).toBe(false)
      expect(can(session, 'thisPermissionDoesNotExist')).toBe(false)
    })
  })

  describe('allowEditing', () => {
    it('should allow editing if the user has the appropriate permissions and the program status is draft', () => {
      const session = {
        user: {
          roles: ['editor']
        }
      }
      const programStatus = 'draft'
      expect(allowEditing({ session, programStatus })).toBe(true)
    })

    it('should not allow editing if the user does not have the appropriate permissions', () => {
      const session = {
        user: {
          roles: ['reviewer']
        }
      }
      const programStatus = 'draft'
      expect(allowEditing({ session, programStatus })).toBe(false)
    })

    it('should not allow editing if the program status is not draft', () => {
      const session = {
        user: {
          roles: ['editor']
        }
      }
      const programStatus = 'active'
      expect(allowEditing({ session, programStatus })).toBe(false)
    })

    it('should not allow deleting if the program is not retired', () => {
      const session = {
        user: {
          roles: ['editor']
        }
      }
      const programStatus = 'active'
      expect(allowDelete({ session, programStatus})).toBe(false)
    })
  })
})
