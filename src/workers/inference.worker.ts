import * as ort from 'onnxruntime-web/wasm'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import type { WorkerRequest, WorkerResponse, InferenceTensorOutput } from './worker-protocol.ts'
import { createModelCache, fetchModelWithCache } from '../storage/model-cache.ts'

// Configure ONNX Runtime Web
ort.env.wasm.numThreads = 1
ort.env.wasm.wasmPaths = { wasm: wasmUrl }
ort.env.wasm.proxy = false
ort.env.logLevel = 'warning'

const sessions = new Map<string, ort.InferenceSession>()
const modelCache = createModelCache()

function postResponse(response: WorkerResponse): void {
  self.postMessage(response)
}

async function loadModel(modelUrl: string, modelId: string): Promise<void> {
  try {
    postResponse({ type: 'progress', message: `Loading model: ${modelId}`, progress: 0 })

    const buffer = await fetchModelWithCache(modelUrl, modelCache, (progress) => {
      postResponse({ type: 'progress', message: `Downloading: ${modelId}`, progress: progress * 0.5 })
    })

    postResponse({ type: 'progress', message: `Creating session: ${modelId}`, progress: 0.5 })

    const session = await ort.InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
      logSeverityLevel: 4,
      graphOptimizationLevel: 'basic',
      enableCpuMemArena: false,
      enableMemPattern: false,
    })

    sessions.set(modelId, session)
    postResponse({ type: 'model-loaded', modelId })
  } catch (error) {
    postResponse({
      type: 'error',
      message: `Failed to load model: ${modelId}`,
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}

async function runInference(
  modelId: string,
  inputs: Array<{ name: string; data: Float32Array | BigInt64Array; dims: number[] }>,
): Promise<void> {
  const session = sessions.get(modelId)
  if (!session) {
    postResponse({ type: 'error', message: `Model not loaded: ${modelId}` })
    return
  }

  try {
    const feeds: Record<string, ort.Tensor> = {}
    for (const input of inputs) {
      if (input.data instanceof BigInt64Array) {
        feeds[input.name] = new ort.Tensor('int64', input.data, input.dims)
      } else {
        feeds[input.name] = new ort.Tensor('float32', input.data, input.dims)
      }
    }

    const results = await session.run(feeds)

    const outputs: InferenceTensorOutput[] = Object.entries(results).map(([name, tensor]) => ({
      name,
      data: tensor.data as Float32Array,
      dims: tensor.dims as number[],
    }))

    postResponse({ type: 'inference-result', outputs })
  } catch (error) {
    postResponse({
      type: 'error',
      message: `Inference failed for model: ${modelId}`,
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}

function disposeModel(modelId: string): void {
  const session = sessions.get(modelId)
  if (session) {
    session.release()
    sessions.delete(modelId)
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data

  switch (message.type) {
    case 'load-model':
      loadModel(message.modelUrl, message.modelId)
      break
    case 'run-inference':
      runInference(message.modelId, message.inputs)
      break
    case 'dispose-model':
      disposeModel(message.modelId)
      break
  }
}
