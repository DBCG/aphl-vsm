import { setExtension } from "./fhirResourceHelper";

describe('fhirResourceHelper', () => {
  describe('setExtension', () => {
    it('should set the extension on the resource', () => {
      const resource = {
        resourceType: 'Patient',
        id: '123',
        extension: [
          {
            url: 'http://example.com',
            valueString: 'foo'
          }
        ]
      }
      const result = setExtension(resource, 'http://example.com', 'bar')
      expect(result).toEqual({
        resourceType: 'Patient',
        id: '123',
        extension: [
          {
            url: 'http://example.com',
            valueString: 'bar'
          }
        ]
      })
    })

    it('should set the extension on the resource when there are no existing extensions', () => {
      const resource = {
        resourceType: 'Patient',
        id: '123'
      }
      const result = setExtension(resource, 'http://example.com', 'bar')
      expect(result).toEqual({
        resourceType: 'Patient',
        id: '123',
        extension: [
          {
            url: 'http://example.com',
            valueString: 'bar'
          }
        ]
      })
    })
  })
})