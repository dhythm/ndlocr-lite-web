import { describe, it, expect } from 'vitest'
import { CATEGORY_NAMES, NDL_CLASS_NAMES, TEXT_LINE_CATEGORIES, BLOCK_CATEGORIES } from './categories.ts'

describe('categories', () => {
  it('has 17 category names', () => {
    expect(CATEGORY_NAMES).toHaveLength(17)
  })

  it('has 17 NDL class names', () => {
    expect(NDL_CLASS_NAMES).toHaveLength(17)
  })

  it('text line categories include expected indices', () => {
    expect(TEXT_LINE_CATEGORIES.has(1)).toBe(true)  // line_main
    expect(TEXT_LINE_CATEGORIES.has(16)).toBe(true)  // line_title
    expect(TEXT_LINE_CATEGORIES.has(0)).toBe(false) // text_block is not a line
  })

  it('block categories include expected indices', () => {
    expect(BLOCK_CATEGORIES.has(0)).toBe(true)   // text_block
    expect(BLOCK_CATEGORIES.has(6)).toBe(true)   // block_fig
    expect(BLOCK_CATEGORIES.has(1)).toBe(false)  // line_main is not a block
  })

  it('text line and block categories are disjoint', () => {
    for (const idx of TEXT_LINE_CATEGORIES) {
      expect(BLOCK_CATEGORIES.has(idx)).toBe(false)
    }
  })
})
