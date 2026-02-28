/**
 * Message types for Worker ↔ Main thread communication
 */

export type WorkerRequest =
  | { type: 'load-model'; modelUrl: string; modelId: string }
  | { type: 'run-inference'; modelId: string; inputs: InferenceTensorInput[] }
  | { type: 'dispose-model'; modelId: string }

export type WorkerResponse =
  | { type: 'model-loaded'; modelId: string }
  | { type: 'inference-result'; outputs: InferenceTensorOutput[] }
  | { type: 'error'; message: string; detail?: string }
  | { type: 'progress'; message: string; progress: number }

export type InferenceTensorInput = {
  name: string
  data: Float32Array | BigInt64Array
  dims: number[]
}

export type InferenceTensorOutput = {
  name: string
  data: Float32Array
  dims: number[]
}
