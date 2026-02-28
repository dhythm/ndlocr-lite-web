import type {
  WorkerRequest,
  WorkerResponse,
  InferenceTensorInput,
  InferenceTensorOutput,
} from './worker-protocol.ts'

type ProgressCallback = (message: string, progress: number) => void

/**
 * Promise-based client for the inference Web Worker.
 */
export function createWorkerClient(worker: Worker) {
  let pendingResolve: ((value: WorkerResponse) => void) | null = null
  let pendingReject: ((reason: Error) => void) | null = null
  let onProgress: ProgressCallback | null = null

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data

    if (response.type === 'progress') {
      onProgress?.(response.message, response.progress)
      return
    }

    if (response.type === 'error') {
      const msg = response.detail
        ? `${response.message}: ${response.detail}`
        : response.message
      pendingReject?.(new Error(msg))
      pendingResolve = null
      pendingReject = null
      return
    }

    pendingResolve?.(response)
    pendingResolve = null
    pendingReject = null
  }

  worker.onerror = (event) => {
    pendingReject?.(new Error(event.message))
    pendingResolve = null
    pendingReject = null
  }

  function sendRequest(request: WorkerRequest): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      pendingResolve = resolve
      pendingReject = reject

      // Transfer ArrayBuffers for better performance
      const transferable: Transferable[] = []
      if (request.type === 'run-inference') {
        for (const input of request.inputs) {
          transferable.push(input.data.buffer)
        }
      }

      worker.postMessage(request, transferable)
    })
  }

  return {
    async loadModel(modelUrl: string, modelId: string, progressCb?: ProgressCallback): Promise<void> {
      onProgress = progressCb ?? null
      const response = await sendRequest({ type: 'load-model', modelUrl, modelId })
      onProgress = null
      if (response.type !== 'model-loaded') {
        throw new Error(`Unexpected response: ${response.type}`)
      }
    },

    async runInference(modelId: string, inputs: InferenceTensorInput[]): Promise<InferenceTensorOutput[]> {
      const response = await sendRequest({ type: 'run-inference', modelId, inputs })
      if (response.type !== 'inference-result') {
        throw new Error(`Unexpected response: ${response.type}`)
      }
      return response.outputs
    },

    disposeModel(modelId: string): void {
      worker.postMessage({ type: 'dispose-model', modelId } satisfies WorkerRequest)
    },

    terminate(): void {
      worker.terminate()
    },
  }
}

export type WorkerClient = ReturnType<typeof createWorkerClient>
