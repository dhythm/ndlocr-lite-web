import { useState, useRef, useCallback } from 'react'
import type { OcrResult, PipelineConfig, ProgressInfo } from '../core/pipeline/types.ts'
import { DEFAULT_PIPELINE_CONFIG } from '../core/pipeline/types.ts'
import { runOcrPipeline, runOcrMultiPage } from '../core/pipeline/pipeline.ts'
import { createWorkerClient, type WorkerClient } from '../workers/worker-client.ts'
import { renderPdfPages } from '../pdf/pdf-renderer.ts'

export type OcrStatus = 'idle' | 'loading-models' | 'processing' | 'done' | 'error'

export type OcrState = {
  readonly status: OcrStatus
  readonly progress: ProgressInfo | null
  readonly result: OcrResult | null
  readonly error: string | null
  /** Original image data URLs for preview / bbox overlay */
  readonly imageUrls: string[]
}

const INITIAL_STATE: OcrState = {
  status: 'idle',
  progress: null,
  result: null,
  error: null,
  imageUrls: [],
}

const MODEL_IDS = ['deim', 'parseq-small', 'parseq-medium', 'parseq-large'] as const

function getModelUrl(modelId: string, config: PipelineConfig): string {
  switch (modelId) {
    case 'deim': return config.deimModelUrl
    case 'parseq-small': return config.parseqModelUrls.small
    case 'parseq-medium': return config.parseqModelUrls.medium
    case 'parseq-large': return config.parseqModelUrls.large
    default: throw new Error(`Unknown model: ${modelId}`)
  }
}

/**
 * React hook for running the OCR pipeline.
 */
export function useOcr(config: PipelineConfig = DEFAULT_PIPELINE_CONFIG) {
  const [state, setState] = useState<OcrState>(INITIAL_STATE)
  const clientRef = useRef<WorkerClient | null>(null)
  const modelsLoadedRef = useRef(false)

  const getClient = useCallback((): WorkerClient => {
    if (!clientRef.current) {
      const worker = new Worker(
        new URL('../workers/inference.worker.ts', import.meta.url),
        { type: 'module' },
      )
      clientRef.current = createWorkerClient(worker)
    }
    return clientRef.current
  }, [])

  const loadModels = useCallback(async (client: WorkerClient) => {
    if (modelsLoadedRef.current) return

    for (let i = 0; i < MODEL_IDS.length; i++) {
      const modelId = MODEL_IDS[i]
      const modelUrl = getModelUrl(modelId, config)

      setState(prev => ({
        ...prev,
        status: 'loading-models',
        progress: {
          stage: 'loading-model',
          progress: i / MODEL_IDS.length,
          message: `Loading ${modelId}...`,
        },
      }))

      await client.loadModel(modelUrl, modelId, (message, progress) => {
        setState(prev => ({
          ...prev,
          progress: {
            stage: 'loading-model',
            progress: (i + progress) / MODEL_IDS.length,
            message,
          },
        }))
      })
    }

    modelsLoadedRef.current = true
  }, [config])

  const processFile = useCallback(async (file: File) => {
    setState({ ...INITIAL_STATE, status: 'loading-models', progress: null })

    try {
      const client = getClient()
      await loadModels(client)

      setState(prev => ({
        ...prev,
        status: 'processing',
        progress: { stage: 'detecting-layout', progress: 0, message: 'Starting...' },
      }))

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer()
        const pdfPages = await renderPdfPages(arrayBuffer, 2.0, (page, total) => {
          setState(prev => ({
            ...prev,
            progress: {
              stage: 'detecting-layout',
              progress: 0,
              message: `Rendering PDF page ${page}/${total}...`,
            },
          }))
        })

        // Create preview URLs from PDF pages
        const imageUrls = await Promise.all(
          pdfPages.map(async (p) => {
            const canvas = new OffscreenCanvas(p.width, p.height)
            const ctx = canvas.getContext('2d')!
            ctx.putImageData(new ImageData(new Uint8ClampedArray(p.data), p.width, p.height), 0, 0)
            const blob = await canvas.convertToBlob({ type: 'image/png' })
            return URL.createObjectURL(blob)
          }),
        )

        const result = await runOcrMultiPage(
          pdfPages.map(p => ({ data: p.data, width: p.width, height: p.height })),
          client,
          config,
          (info) => setState(prev => ({ ...prev, progress: info })),
        )

        setState({ status: 'done', progress: null, result, error: null, imageUrls })
      } else {
        // Image file
        const imageUrl = URL.createObjectURL(file)
        const { imageData, width, height } = await loadImageAsImageData(file)

        const pageResult = await runOcrPipeline(
          imageData,
          width,
          height,
          client,
          config,
          (info) => setState(prev => ({ ...prev, progress: info })),
        )

        setState({
          status: 'done',
          progress: null,
          result: { pages: [pageResult] },
          error: null,
          imageUrls: [imageUrl],
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setState(prev => ({ ...prev, status: 'error', error: message, progress: null }))
    }
  }, [getClient, loadModels, config])

  const reset = useCallback(() => {
    // Revoke object URLs
    for (const url of state.imageUrls) {
      URL.revokeObjectURL(url)
    }
    setState(INITIAL_STATE)
  }, [state.imageUrls])

  return { state, processFile, reset }
}

async function loadImageAsImageData(file: File): Promise<{ imageData: Uint8ClampedArray; width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  bitmap.close()
  return { imageData: data.data, width: data.width, height: data.height }
}
