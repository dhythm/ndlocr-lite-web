import type {
  OcrPageResult,
  OcrResult,
  PipelineConfig,
  ProgressCallback,
  DetectionResult,
  RecognitionResult,
  TextRegion,
  ParseqModelSize,
} from './types.ts'
import { preprocessForDeim } from '../preprocessing/deim-preprocess.ts'
import { preprocessForParseq, selectParseqModelSize } from '../preprocessing/parseq-preprocess.ts'
import { deimPostprocess } from '../postprocessing/deim-postprocess.ts'
import { parseqDecode, shouldEscalateModel } from '../postprocessing/parseq-postprocess.ts'
import { cropRegion } from '../preprocessing/image-utils.ts'
import { solveReadingOrder } from '../reading-order/xy-cut.ts'
import { PARSEQ_CHARSET } from '../config/charset.ts'
import { TEXT_LINE_CATEGORIES, BLOCK_CATEGORIES } from '../config/categories.ts'
import type { WorkerClient } from '../../workers/worker-client.ts'

/**
 * Run the full OCR pipeline on a single image.
 *
 * 1. DEIM layout detection → bounding boxes
 * 2. Crop text lines from original image
 * 3. PARSeq text recognition (cascade)
 * 4. XY-Cut reading order
 * 5. Assemble results
 */
export async function runOcrPipeline(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  client: WorkerClient,
  config: PipelineConfig,
  onProgress?: ProgressCallback,
): Promise<OcrPageResult> {
  // === Step 1: DEIM Layout Detection ===
  onProgress?.({ stage: 'detecting-layout', progress: 0, message: 'Detecting layout...' })

  const deimInput = preprocessForDeim(imageData, height, width)

  const deimOutputs = await client.runInference('deim', [
    { name: 'images', data: deimInput.imageTensor, dims: [1, 3, deimInput.inputHeight, deimInput.inputWidth] },
    { name: 'orig_target_sizes', data: deimInput.origTargetSizes, dims: [1, 2] },
  ])

  // Parse DEIM outputs
  const labelsOut = deimOutputs.find(o => o.name === 'labels')
  const boxesOut = deimOutputs.find(o => o.name === 'boxes')
  const scoresOut = deimOutputs.find(o => o.name === 'scores')
  const charCountOut = deimOutputs.find(o => o.name === 'char_count')

  if (!labelsOut || !boxesOut || !scoresOut) {
    throw new Error('DEIM output missing expected tensors (labels, boxes, scores)')
  }

  const detections = deimPostprocess(
    {
      labels: labelsOut.data,
      boxes: boxesOut.data,
      scores: scoresOut.data,
      charCounts: charCountOut?.data,
    },
    { height, width },
    config.detConfThreshold,
  )

  onProgress?.({ stage: 'detecting-layout', progress: 1, message: `Detected ${detections.length} regions` })

  // === Step 2: Filter text lines and recognize ===
  const textLines = detections.filter(d => TEXT_LINE_CATEGORIES.has(d.categoryIndex))
  const blockRegions = detections.filter(d => BLOCK_CATEGORIES.has(d.categoryIndex))

  onProgress?.({ stage: 'recognizing-text', progress: 0, message: `Recognizing ${textLines.length} text lines...` })

  const recognitions: RecognitionResult[] = []

  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i]
    const { bbox } = line

    // Crop line image from original
    const cropped = cropRegion(imageData, width, height, bbox.x1, bbox.y1, bbox.x2, bbox.y2)
    if (cropped.width === 0 || cropped.height === 0) continue

    // Select model size based on predicted char count
    let modelSize = selectParseqModelSize(line.predCharCount)

    // Preprocess for PARSeq
    let parseqInput = preprocessForParseq(cropped.data, cropped.height, cropped.width, modelSize)

    // Run PARSeq inference
    const modelId = `parseq-${modelSize}` as const
    let parseqOutputs = await client.runInference(modelId, [
      { name: 'input', data: parseqInput.tensor, dims: [1, 3, 16, parseqInput.modelWidth] },
    ])

    let result = parseqDecode(parseqOutputs[0].data, parseqOutputs[0].dims[1], parseqOutputs[0].dims[2], PARSEQ_CHARSET)

    // Escalation: if text is too long for current model, try larger model
    if (shouldEscalateModel(modelSize, result.text.length)) {
      const nextSize: ParseqModelSize = modelSize === 'small' ? 'medium' : 'large'
      parseqInput = preprocessForParseq(cropped.data, cropped.height, cropped.width, nextSize)

      const nextModelId = `parseq-${nextSize}` as const
      parseqOutputs = await client.runInference(nextModelId, [
        { name: 'input', data: parseqInput.tensor, dims: [1, 3, 16, parseqInput.modelWidth] },
      ])

      result = parseqDecode(parseqOutputs[0].data, parseqOutputs[0].dims[1], parseqOutputs[0].dims[2], PARSEQ_CHARSET)
    }

    recognitions.push({
      text: result.text,
      bbox,
      confidence: result.confidence,
    })

    onProgress?.({
      stage: 'recognizing-text',
      progress: (i + 1) / textLines.length,
      message: `Recognized ${i + 1}/${textLines.length} lines`,
      detail: result.text.slice(0, 30),
    })
  }

  // === Step 3: Reading order ===
  onProgress?.({ stage: 'ordering-text', progress: 0, message: 'Determining reading order...' })

  const readingOrder = solveReadingOrder(recognitions.map(r => r.bbox))

  // === Step 4: Assemble text regions ===
  const regions: TextRegion[] = assembleRegions(blockRegions, recognitions, readingOrder)

  onProgress?.({ stage: 'complete', progress: 1, message: 'OCR complete' })

  return {
    width,
    height,
    regions,
    detections,
  }
}

/**
 * Assemble recognized text lines into regions based on block detections.
 */
function assembleRegions(
  blocks: DetectionResult[],
  recognitions: RecognitionResult[],
  readingOrder: number[],
): TextRegion[] {
  if (blocks.length === 0) {
    // No block detections - create a single region containing all lines
    const orderedLines = recognitions
      .map((r, i) => ({ ...r, order: readingOrder[i] }))
      .sort((a, b) => a.order - b.order)

    if (orderedLines.length === 0) return []

    return [{
      bbox: {
        x1: Math.min(...orderedLines.map(l => l.bbox.x1)),
        y1: Math.min(...orderedLines.map(l => l.bbox.y1)),
        x2: Math.max(...orderedLines.map(l => l.bbox.x2)),
        y2: Math.max(...orderedLines.map(l => l.bbox.y2)),
      },
      category: 'body',
      lines: orderedLines,
      readingOrder: 0,
    }]
  }

  // Assign each line to its best-fitting block
  const blockLines: RecognitionResult[][] = blocks.map(() => [])
  const unassigned: RecognitionResult[] = []

  for (let i = 0; i < recognitions.length; i++) {
    const line = recognitions[i]
    let bestBlock = -1
    let bestOverlap = 0

    for (let j = 0; j < blocks.length; j++) {
      const overlap = calcOverlap(line.bbox, blocks[j].bbox)
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        bestBlock = j
      }
    }

    if (bestBlock >= 0 && bestOverlap > 0.3) {
      blockLines[bestBlock].push(line)
    } else {
      unassigned.push(line)
    }
  }

  const regions: TextRegion[] = blocks
    .map((block, i) => ({
      bbox: block.bbox,
      category: block.category,
      lines: blockLines[i].sort((a, b) => {
        const orderA = readingOrder[recognitions.indexOf(a)]
        const orderB = readingOrder[recognitions.indexOf(b)]
        return orderA - orderB
      }),
      readingOrder: 0,
    }))
    .filter(r => r.lines.length > 0)

  // Assign reading order to regions based on first line
  const regionOrder = solveReadingOrder(regions.map(r => r.bbox))
  return regions
    .map((r, i) => ({ ...r, readingOrder: regionOrder[i] }))
    .sort((a, b) => a.readingOrder - b.readingOrder)
}

function calcOverlap(a: { x1: number; y1: number; x2: number; y2: number }, b: { x1: number; y1: number; x2: number; y2: number }): number {
  const x1 = Math.max(a.x1, b.x1)
  const y1 = Math.max(a.y1, b.y1)
  const x2 = Math.min(a.x2, b.x2)
  const y2 = Math.min(a.y2, b.y2)

  if (x2 <= x1 || y2 <= y1) return 0

  const intersection = (x2 - x1) * (y2 - y1)
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1)

  return areaA > 0 ? intersection / areaA : 0
}

/**
 * Run OCR on multiple pages (e.g., from a PDF)
 */
export async function runOcrMultiPage(
  pages: Array<{ data: Uint8ClampedArray; width: number; height: number }>,
  client: WorkerClient,
  config: PipelineConfig,
  onProgress?: ProgressCallback,
): Promise<OcrResult> {
  const results: OcrPageResult[] = []

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const pageResult = await runOcrPipeline(
      page.data,
      page.width,
      page.height,
      client,
      config,
      onProgress ? (info) => {
        onProgress({
          ...info,
          message: `Page ${i + 1}/${pages.length}: ${info.message}`,
          progress: (i + info.progress) / pages.length,
        })
      } : undefined,
    )
    results.push(pageResult)
  }

  return { pages: results }
}
