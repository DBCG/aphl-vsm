import { incrementSemver } from './utils'

describe('incrementSemver', () => {
  it('increments major if well-formed', () => {
    expect(incrementSemver({
      valueToIncrement: '1.0.0',
      incrementType: 'major',
      fallbackValue: '2.0.0'
    })).toBe('2.0.0')
  })

  it('increments minor if well-formed', () => {
    expect(incrementSemver({
      valueToIncrement: '1.0.0',
      incrementType: 'minor',
      fallbackValue: '2.0.0'
    })).toBe('1.1.0')
  })

  it('increments patch if well-formed', () => {
    expect(incrementSemver({
      valueToIncrement: '1.0.0',
      incrementType: 'patch',
      fallbackValue: '2.0.0'
    })).toBe('1.0.1')
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