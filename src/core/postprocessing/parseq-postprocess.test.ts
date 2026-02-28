import { describe, it, expect } from 'vitest'
import { parseqDecode, shouldEscalateModel } from './parseq-postprocess.ts'

describe('parseqDecode', () => {
  it('decodes a simple sequence', () => {
    const charset = ['A', 'B', 'C', 'D']
    // Output shape: [1, 3, 5] (1 batch, 3 sequence positions, 5 vocab = EOS + 4 chars)
    // Position 0: argmax = 1 → charset[0] = 'A'
    // Position 1: argmax = 3 → charset[2] = 'C'
    // Position 2: argmax = 0 → EOS
    const output = new Float32Array([
      // position 0
      0.1, 0.9, 0.2, 0.3, 0.1,
      // position 1
      0.1, 0.2, 0.3, 0.9, 0.1,
      // position 2
      0.9, 0.1, 0.2, 0.3, 0.1, // EOS
    ])

    const result = parseqDecode(output, 3, 5, charset)

    expect(result.text).toBe('AC')
    expect(result.positions).toHaveLength(2)
  })

  it('returns empty string when first position is EOS', () => {
    const charset = ['A', 'B']
    const output = new Float32Array([
      0.9, 0.1, 0.2, // EOS at position 0
      0.1, 0.9, 0.2, // would be 'A' but after EOS
    ])

    const result = parseqDecode(output, 2, 3, charset)

    expect(result.text).toBe('')
    expect(result.positions).toHaveLength(0)
  })

  it('handles full sequence without EOS', () => {
    const charset = ['A', 'B']
    const output = new Float32Array([
      0.1, 0.9, 0.2, // 'A'
      0.1, 0.2, 0.9, // 'B'
    ])

    const result = parseqDecode(output, 2, 3, charset)

    expect(result.text).toBe('AB')
    expect(result.positions).toHaveLength(2)
  })

  it('computes confidence from probabilities', () => {
    const charset = ['A']
    // softmax-like values where index 1 has highest probability
    const output = new Float32Array([
      0.1, 0.9, // position 0: clearly 'A'
    ])

    const result = parseqDecode(output, 1, 2, charset)

    expect(result.confidence).toBeGreaterThan(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })
})

describe('shouldEscalateModel', () => {
  it('returns true for small model with >25 chars', () => {
    expect(shouldEscalateModel('small', 26)).toBe(true)
    expect(shouldEscalateModel('small', 30)).toBe(true)
  })

  it('returns false for small model with ≤25 chars', () => {
    expect(shouldEscalateModel('small', 25)).toBe(false)
    expect(shouldEscalateModel('small', 10)).toBe(false)
  })

  it('returns true for medium model with >45 chars', () => {
    expect(shouldEscalateModel('medium', 46)).toBe(true)
  })

  it('returns false for medium model with ≤45 chars', () => {
    expect(shouldEscalateModel('medium', 45)).toBe(false)
  })

  it('never escalates from large model', () => {
    expect(shouldEscalateModel('large', 100)).toBe(false)
    expect(shouldEscalateModel('large', 1000)).toBe(false)
  })
})
