import { incrementSemver } from './utils'

describe('incrementSemver', () => {
  it('increments major if well-formed', () => {
    expect(incrementSemver({
      valueToIncrement: '1.0.0',
      incrementType: 'major',
      fallbackValue: '3.0.0'
    })).toBe('2.0.0.0')

    // with revision
    expect(incrementSemver({
      valueToIncrement: '1.0.0.0',
      incrementType: 'major',
      fallbackValue: '3.0.0.0'
    })).toBe('2.0.0.0')
  })

  it('increments minor if well-formed', () => {
    expect(incrementSemver({
      valueToIncrement: '1.0.0',
      incrementType: 'minor',
      fallbackValue: '2.0.0'
    })).toBe('1.1.0.0')

    // with revision
    expect(incrementSemver({
      valueToIncrement: '1.0.0.3',
      incrementType: 'minor',
      fallbackValue: '2.0.0.1'
    })).toBe('1.1.0.0')
  })

  it('increments patch if well-formed', () => {
    expect(incrementSemver({
      valueToIncrement: '1.0.0',
      incrementType: 'patch',
      fallbackValue: '3.0.0'
    })).toBe('1.0.1.0')

    // with revision
    expect(incrementSemver({
      valueToIncrement: '1.0.0.9',
      incrementType: 'patch',
      fallbackValue: '3.0.0.8'
    })).toBe('1.0.1.0')
  })

  it('increments revision if well-formed', () => {
    expect(incrementSemver({
      valueToIncrement: '1.0.0.9',
      incrementType: 'revision',
      fallbackValue: '3.0.0'
    })).toBe('1.0.0.10')

    // what happens if we want to increment revision
    // and it doesn't exist
    // we'd maybe want to do add 0 to the place so that it exists?
    expect(incrementSemver({
      valueToIncrement: '1.0.0',
      incrementType: 'revision',
      fallbackValue: '3.0.0'
    })).toBe('1.0.0.0')
  })

  it('provides fallback if invalid format', () => {
    expect(incrementSemver({
      valueToIncrement: '1.invalid.semver',
      incrementType: 'major',
      fallbackValue: '2.0.0'
    })).toBe('2.0.0')

    expect(incrementSemver({
      valueToIncrement: '123',
      incrementType: 'major',
      fallbackValue: '2.0.0'
    })).toBe('2.0.0')
  })
})