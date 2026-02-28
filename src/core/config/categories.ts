import type { CategoryName } from '../pipeline/types.ts'

/**
 * NDL layout detection categories (0-indexed)
 * Source: ndlocr-lite/src/config/ndl.yaml
 */
export const CATEGORY_NAMES: readonly CategoryName[] = [
  'body',         // 0: text_block
  'column',       // 1: line_main
  'caption',      // 2: line_caption
  'advertisement', // 3: line_ad
  'footnote',     // 4: line_note
  'footnote',     // 5: line_note_tochu
  'figure',       // 6: block_fig
  'advertisement', // 7: block_ad
  'column',       // 8: block_pillar
  'page_number',  // 9: block_folio
  'other',        // 10: block_rubi
  'table',        // 11: block_chart
  'equation',     // 12: block_eqn
  'separator',    // 13: block_cfm
  'body',         // 14: block_eng
  'table',        // 15: block_table
  'title',        // 16: line_title
] as const

/**
 * Original ndlocr-lite class names for reference
 */
export const NDL_CLASS_NAMES: readonly string[] = [
  'text_block',       // 0
  'line_main',        // 1
  'line_caption',     // 2
  'line_ad',          // 3
  'line_note',        // 4
  'line_note_tochu',  // 5
  'block_fig',        // 6
  'block_ad',         // 7
  'block_pillar',     // 8
  'block_folio',      // 9
  'block_rubi',       // 10
  'block_chart',      // 11
  'block_eqn',        // 12
  'block_cfm',        // 13
  'block_eng',        // 14
  'block_table',      // 15
  'line_title',       // 16
] as const

/**
 * Categories that represent text lines (for PARSeq recognition)
 */
export const TEXT_LINE_CATEGORIES: ReadonlySet<number> = new Set([
  1,  // line_main
  2,  // line_caption
  3,  // line_ad
  4,  // line_note
  5,  // line_note_tochu
  16, // line_title
])

/**
 * Categories that represent block regions (containers)
 */
export const BLOCK_CATEGORIES: ReadonlySet<number> = new Set([
  0,  // text_block
  6,  // block_fig
  7,  // block_ad
  8,  // block_pillar
  9,  // block_folio
  10, // block_rubi
  11, // block_chart
  12, // block_eqn
  13, // block_cfm
  14, // block_eng
  15, // block_table
])
