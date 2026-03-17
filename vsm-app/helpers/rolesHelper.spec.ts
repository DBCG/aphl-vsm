import { can, allowEditing, allowDelete } from './rolesHelper'

describe('rolesHelper', () => {
  describe('can', () => {
    it('admin role has the expected permissions', () => {
      const allowedPermissions = ['clone', 'approve', 'edit', 'release', 'withdraw', 'retire', 'delete']
      const session = {
        user: {
          roles: ['admin']
        }
      } as any
      allowedPermissions.forEach((permission) => {
        expect(can(session, permission)).toBe(true)
      })
    })

    it('editor role has the expected permissions', () => {
      const allowedPermissions = ['clone', 'approve', 'edit', 'withdraw', 'retire', 'delete']
      const session = {
        user: {
          roles: ['editor']
        }
      } as any
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
      } as any
      allowedPermissions.forEach((permission) => {
        expect(can(session, permission)).toBe(true)
      })
    })

    it('should deny the user if they do not have the appropriate access to permission', () => {
      const session = {
        user: {
          roles: ['reviewer']
        }
      } as any
      expect(can(session, 'edit')).toBe(false)
      expect(can(session, 'thisPermissionDoesNotExist')).toBe(false)
    })
  })

  describe('allowEditing', () => {
    it('should allow editing if the user has the appropriate permissions and the program status is draft and no releaseLabel', () => {
      const session = {
        user: {
          roles: ['editor']
        }
      } as any
      const program = {
        resourceType: 'Library',
        id: '123',
        name: 'Test Program',
        status: 'draft',
        extension: [

        ]
      } as any
      expect(allowEditing({ session, program })).toBe(true)
    })

    it('should not allow editing if the user does not have the appropriate permissions', () => {
      const session = {
        user: {
          roles: ['reviewer']
        }
      } as any
      const program = {
        resourceType: 'Library',
        id: '123',
        name: 'Test Program',
        status: 'draft',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/artifact-releaseLabel',
            valueString: 'ReleaseV2.2.2'
          }

        ]
      } as any
      expect(allowEditing({ session, program })).toBe(false)
    })

    it('should not allow editing if the program status is not draft', () => {
      const session = {
        user: {
          roles: ['editor']
        }
      } as any
      const program = {
        resourceType: 'Library',
        id: '123',
        name: 'Test Program',
        status: 'active',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/artifact-releaseLabel',
            valueString: 'ReleaseV2.2.2'
          }

        ]
      } as any
      expect(allowEditing({ session, program })).toBe(false)
    })

    it('should not allow deleting if the program is not retired', () => {
      const session = {
        user: {
          roles: ['editor']
        }
      } as any
      const program = {
        resourceType: 'Library',
        id: '123',
        name: 'Test Program',
        status: 'active',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/artifact-releaseLabel',
            valueString: 'ReleaseV2.2.2'
          }

        ]
      } as any
      expect(allowDelete({ session, program })).toBe(false)
    })
  })
})
