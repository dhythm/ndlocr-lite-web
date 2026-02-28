import type { BoundingBox } from '../pipeline/types.ts'

/**
 * XY-Cut reading order algorithm
 * Port of ndlocr-lite/src/reading_order/xy_cut/block_xy_cut.py
 *
 * Determines the reading order of text regions by recursively
 * splitting the page using X and Y projections.
 */

type BlockNode = {
  x0: number
  y0: number
  x1: number
  y1: number
  parent: BlockNode | null
  children: BlockNode[]
  lineIdx: number[]
  numLines: number
  numVerticalLines: number
}

function createNode(x0: number, y0: number, x1: number, y1: number, parent: BlockNode | null): BlockNode {
  return {
    x0: Math.floor(x0),
    y0: Math.floor(y0),
    x1: Math.floor(x1),
    y1: Math.floor(y1),
    parent,
    children: [],
    lineIdx: [],
    numLines: 0,
    numVerticalLines: 0,
  }
}

function isXSplit(node: BlockNode): boolean {
  for (const child of node.children) {
    if (node.y0 !== child.y0 || node.y1 !== child.y1) {
      return false
    }
  }
  return true
}

function isVertical(node: BlockNode): boolean {
  return node.numLines < node.numVerticalLines * 2
}

/**
 * Find the minimum span (largest gap) in a histogram
 */
function calcMinSpan(hist: number[]): { start: number; end: number; value: number } {
  if (hist.length <= 1) {
    return { start: 0, end: 1, value: 0 }
  }

  const minVal = Math.min(...hist)
  const maxVal = Math.max(...hist)

  // Find runs of minimum values
  const isMin = hist.map(v => v === minVal ? 1 : 0)
  const padded = [0, ...isMin, 0]

  const starts: number[] = []
  const ends: number[] = []
  for (let i = 1; i < padded.length; i++) {
    if (padded[i] === 1 && padded[i - 1] === 0) starts.push(i - 1)
    if (padded[i] === 0 && padded[i - 1] === 1) ends.push(i - 1)
  }

  if (starts.length === 0) {
    return { start: 0, end: hist.length, value: 0 }
  }

  // Find longest run
  let bestIdx = 0
  let bestLen = 0
  for (let i = 0; i < starts.length; i++) {
    const len = ends[i] - starts[i]
    if (len > bestLen) {
      bestLen = len
      bestIdx = i
    }
  }

  const value = maxVal > 0 ? -minVal / maxVal : 0

  return { start: starts[bestIdx], end: ends[bestIdx], value }
}

/**
 * Calculate X and Y histograms for a region of the mesh table
 */
function calcHist(table: number[][], x0: number, y0: number, x1: number, y1: number): { xHist: number[]; yHist: number[] } {
  const width = x1 - x0
  const height = y1 - y0

  const xHist = new Array(width).fill(0)
  const yHist = new Array(height).fill(0)

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const val = table[y][x]
      xHist[x - x0] += val
      yHist[y - y0] += val
    }
  }

  return { xHist, yHist }
}

function splitChild(parent: BlockNode, table: number[][], x0: number, y0: number, x1: number, y1: number): void {
  if (!(x0 < x1 && y0 < y1)) return
  if (x0 === parent.x0 && y0 === parent.y0 && x1 === parent.x1 && y1 === parent.y1) return

  const child = createNode(x0, y0, x1, y1, parent)
  parent.children.push(child)
  blockXyCut(table, child)
}

function splitX(parent: BlockNode, table: number[][], xBeg: number, xEnd: number): void {
  splitChild(parent, table, parent.x0, parent.y0, xBeg, parent.y1)
  splitChild(parent, table, xBeg, parent.y0, xEnd, parent.y1)
  splitChild(parent, table, xEnd, parent.y0, parent.x1, parent.y1)
}

function splitY(parent: BlockNode, table: number[][], yBeg: number, yEnd: number): void {
  splitChild(parent, table, parent.x0, parent.y0, parent.x1, yBeg)
  splitChild(parent, table, parent.x0, yBeg, parent.x1, yEnd)
  splitChild(parent, table, parent.x0, yEnd, parent.x1, parent.y1)
}

function blockXyCut(table: number[][], node: BlockNode): void {
  const { x0, y0, x1, y1 } = node
  const { xHist, yHist } = calcHist(table, x0, y0, x1, y1)

  const xSpan = calcMinSpan(xHist)
  const ySpan = calcMinSpan(yHist)

  const xBeg = xSpan.start + x0
  const xEnd = xSpan.end + x0
  const yBeg = ySpan.start + y0
  const yEnd = ySpan.end + y0

  if (x0 === xBeg && x1 === xEnd && y0 === yBeg && y1 === yEnd) return

  if (ySpan.value < xSpan.value) {
    splitX(node, table, xBeg, xEnd)
  } else if (xSpan.value < ySpan.value) {
    splitY(node, table, yBeg, yEnd)
  } else if ((xEnd - xBeg) < (yEnd - yBeg)) {
    splitY(node, table, yBeg, yEnd)
  } else {
    splitX(node, table, xBeg, xEnd)
  }
}

function getOptimalGrid(numBoxes: number): number {
  return 100 * Math.sqrt(numBoxes)
}

function normalizeBboxes(bboxes: number[][], grid: number): number[][] {
  if (bboxes.length === 0) return []

  // Ensure valid coords
  for (const b of bboxes) {
    if (b[0] > b[2]) b[2] = b[0]
    if (b[1] > b[3]) b[3] = b[1]
  }

  const xMin = Math.min(...bboxes.map(b => b[0]))
  const yMin = Math.min(...bboxes.map(b => b[1]))
  const wPage = Math.max(...bboxes.map(b => b[2])) - xMin
  const hPage = Math.max(...bboxes.map(b => b[3])) - yMin

  if (wPage === 0 || hPage === 0) return bboxes

  const xGrid = wPage < hPage ? grid : grid * (wPage / hPage)
  const yGrid = hPage < wPage ? grid : grid * (hPage / wPage)

  return bboxes.map(b => [
    Math.max(0, Math.floor((b[0] - xMin) * xGrid / wPage)),
    Math.max(0, Math.floor((b[1] - yMin) * yGrid / hPage)),
    Math.max(0, Math.floor((b[2] - xMin) * xGrid / wPage)),
    Math.max(0, Math.floor((b[3] - yMin) * yGrid / hPage)),
  ])
}

function makeMeshTable(bboxes: number[][]): number[][] {
  const xMax = Math.max(...bboxes.map(b => b[2])) + 1
  const yMax = Math.max(...bboxes.map(b => b[3])) + 1

  const table: number[][] = Array.from({ length: yMax }, () => new Array(xMax).fill(0))

  for (const [x0, y0, x1, y1] of bboxes) {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        table[y][x] = 1
      }
    }
  }

  return table
}

function calcIou(box: number[], boxes: number[][]): number[] {
  return boxes.map(other => {
    const x0 = Math.max(box[0], other[0])
    const y0 = Math.max(box[1], other[1])
    const x1 = Math.min(box[2], other[2])
    const y1 = Math.min(box[3], other[3])

    const interArea = Math.max(0, x1 - x0 + 1) * Math.max(0, y1 - y0 + 1)
    const boxArea = (box[2] - other[0] + 1) * (box[3] - other[1] + 1)
    const otherArea = (other[2] - box[0] + 1) * (other[3] - box[1] + 1)
    const unionArea = boxArea + otherArea - interArea

    return unionArea > 0 ? interArea / unionArea : 0
  })
}

function getLeafNodes(root: BlockNode): { routers: number[][]; bboxes: number[][] } {
  const bboxes: number[][] = []
  const routers: number[][] = []

  function collect(node: BlockNode, router: number[]): void {
    if (node.children.length === 0) {
      bboxes.push([node.x0, node.y0, node.x1, node.y1])
      routers.push(router)
    }
    for (let i = 0; i < node.children.length; i++) {
      collect(node.children[i], [...router, i])
    }
  }

  collect(root, [])
  return { routers, bboxes }
}

function routeTree(root: BlockNode, router: number[]): BlockNode {
  let node = root
  for (const i of router) {
    node = node.children[i]
  }
  return node
}

function assignBboxToNode(root: BlockNode, bboxes: number[][]): void {
  const { routers, bboxes: leaves } = getLeafNodes(root)

  for (let i = 0; i < bboxes.length; i++) {
    const ious = calcIou(bboxes[i], leaves)
    let bestIdx = 0
    let bestIou = -1
    for (let j = 0; j < ious.length; j++) {
      if (!isNaN(ious[j]) && ious[j] > bestIou) {
        bestIou = ious[j]
        bestIdx = j
      }
    }
    routeTree(root, routers[bestIdx]).lineIdx.push(i)
  }
}

function sortNodes(node: BlockNode, bboxes: number[][]): [number, number] {
  if (node.lineIdx.length > 0) {
    node.numLines = node.lineIdx.length
    node.numVerticalLines = 0

    for (const idx of node.lineIdx) {
      const w = bboxes[idx][2] - bboxes[idx][0]
      const h = bboxes[idx][3] - bboxes[idx][1]
      if (w < h) node.numVerticalLines++
    }

    if (node.numLines > 1) {
      const vert = isVertical(node)
      node.lineIdx.sort((a, b) => {
        const boxA = bboxes[a]
        const boxB = bboxes[b]
        if (vert) {
          // Vertical text: sort by -x0 first (right to left), then y0
          if (boxA[0] !== boxB[0]) return boxB[0] - boxA[0]
          return boxA[1] - boxB[1]
        } else {
          // Horizontal text: sort by y0 first (top to bottom), then x0
          if (boxA[1] !== boxB[1]) return boxA[1] - boxB[1]
          return boxA[0] - boxB[0]
        }
      })
    }
  } else {
    for (const child of node.children) {
      const [num, vNum] = sortNodes(child, bboxes)
      node.numLines += num
      node.numVerticalLines += vNum
    }
    if (isXSplit(node) && isVertical(node)) {
      node.children.reverse()
    }
  }

  return [node.numLines, node.numVerticalLines]
}

function getRanking(node: BlockNode, ranks: number[], rank: number): number {
  for (const i of node.lineIdx) {
    ranks[i] = rank
    rank++
  }
  for (const child of node.children) {
    rank = getRanking(child, ranks, rank)
  }
  return rank
}

/**
 * Solve reading order for a set of bounding boxes using the XY-Cut algorithm.
 *
 * @param boxes - Array of bounding boxes
 * @returns Array of reading order indices (rank[i] = reading order of box i)
 */
export function solveReadingOrder(boxes: readonly BoundingBox[]): number[] {
  if (boxes.length === 0) return []

  // Convert BoundingBox to [x1, y1, x2, y2] arrays
  const bboxes = boxes.map(b => [b.x1, b.y1, b.x2, b.y2])

  const grid = getOptimalGrid(bboxes.length)
  const normalized = normalizeBboxes(bboxes, grid)
  const table = makeMeshTable(normalized)

  const h = table.length
  const w = table[0].length

  const root = createNode(0, 0, w, h, null)
  blockXyCut(table, root)
  assignBboxToNode(root, normalized)
  sortNodes(root, normalized)

  const ranks = new Array(bboxes.length).fill(-1)
  getRanking(root, ranks, 0)

  return ranks
}
