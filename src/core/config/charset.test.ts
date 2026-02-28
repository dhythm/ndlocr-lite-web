import { describe, it, expect } from 'vitest'
import { PARSEQ_CHARSET, PARSEQ_CHARSET_SIZE } from './charset.ts'

describe('charset', () => {
  it('has 7143 characters', () => {
    expect(PARSEQ_CHARSET).toHaveLength(7143)
  })

  it('PARSEQ_CHARSET_SIZE matches array length', () => {
    expect(PARSEQ_CHARSET_SIZE).toBe(PARSEQ_CHARSET.length)
  })

  it('starts with space character', () => {
    expect(PARSEQ_CHARSET[0]).toBe(' ')
  })

  it('contains ASCII characters', () => {
    expect(PARSEQ_CHARSET).toContain('A')
    expect(PARSEQ_CHARSET).toContain('z')
    expect(PARSEQ_CHARSET).toContain('0')
    expect(PARSEQ_CHARSET).toContain('9')
  })

  it('contains Japanese hiragana', () => {
    expect(PARSEQ_CHARSET).toContain('あ')
    expect(PARSEQ_CHARSET).toContain('ん')
  })

  it('contains Japanese katakana', () => {
    expect(PARSEQ_CHARSET).toContain('ア')
    expect(PARSEQ_CHARSET).toContain('ン')
  })

  it('contains common kanji', () => {
    expect(PARSEQ_CHARSET).toContain('一')
    expect(PARSEQ_CHARSET).toContain('龍')
  })

  it('each character is a single string element', () => {
    for (const char of PARSEQ_CHARSET) {
      expect(typeof char).toBe('string')
      expect(char.length).toBeGreaterThanOrEqual(1)
    }
  })
})
