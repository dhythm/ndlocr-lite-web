/**
 * ONNX Runtime Web shared configuration for all workers.
 * Uses onnxruntime-web/wasm subpackage with Vite ?url import for COEP compliance.
 */
import * as ort from 'onnxruntime-web/wasm'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'

function initializeONNX(): void {
  ort.env.wasm.wasmPaths = { wasm: wasmUrl }
  ort.env.wasm.numThreads = 1
  ort.env.logLevel = 'warning'
  ort.env.wasm.proxy = false
}

export async function createSession(
  modelData: ArrayBuffer,
  options: Partial<ort.InferenceSession.SessionOptions> = {},
): Promise<ort.InferenceSession> {
  const defaultOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: ['wasm'],
    logSeverityLevel: 4,
    graphOptimizationLevel: 'basic',
    enableCpuMemArena: false,
    enableMemPattern: false,
    ...options,
  }

  const session = await ort.InferenceSession.create(modelData, defaultOptions)
  return session
}

initializeONNX()

export { ort }
