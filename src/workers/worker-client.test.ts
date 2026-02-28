import { describe, it, expect, vi } from 'vitest'
import { createWorkerClient } from './worker-client.ts'
import type { WorkerResponse } from './worker-protocol.ts'

function createMockWorker() {
  let messageHandler: ((event: MessageEvent) => void) | null = null

  const worker = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    set onmessage(handler: ((event: MessageEvent) => void) | null) {
      messageHandler = handler
    },
    get onmessage() {
      return messageHandler
    },
    set onerror(_handler: ((event: ErrorEvent) => void) | null) {
      // no-op for mock
    },
    simulateResponse(response: WorkerResponse) {
      messageHandler?.({ data: response } as MessageEvent)
    },
  }

  return worker
}

describe('createWorkerClient', () => {
  it('loadModel sends load-model message and resolves on model-loaded', async () => {
    const mock = createMockWorker()
    const client = createWorkerClient(mock as unknown as Worker)

    const promise = client.loadModel('/models/test.onnx', 'test-model')
    mock.simulateResponse({ type: 'model-loaded', modelId: 'test-model' })

    await expect(promise).resolves.toBeUndefined()
    expect(mock.postMessage).toHaveBeenCalledWith(
      { type: 'load-model', modelUrl: '/models/test.onnx', modelId: 'test-model' },
      [],
    )
  })

  it('loadModel calls progress callback', async () => {
    const mock = createMockWorker()
    const client = createWorkerClient(mock as unknown as Worker)

    const progressFn = vi.fn()
    const promise = client.loadModel('/models/test.onnx', 'test-model', progressFn)

    mock.simulateResponse({ type: 'progress', message: 'Loading...', progress: 0.5 })
    mock.simulateResponse({ type: 'model-loaded', modelId: 'test-model' })

    await promise
    expect(progressFn).toHaveBeenCalledWith('Loading...', 0.5)
  })

  it('runInference sends inputs and returns outputs', async () => {
    const mock = createMockWorker()
    const client = createWorkerClient(mock as unknown as Worker)

    const inputs = [{
      name: 'input',
      data: new Float32Array([1, 2, 3]),
      dims: [1, 3],
    }]

    const expectedOutputs = [{
      name: 'output',
      data: new Float32Array([4, 5, 6]),
      dims: [1, 3],
    }]

    const promise = client.runInference('test-model', inputs)
    mock.simulateResponse({ type: 'inference-result', outputs: expectedOutputs })

    const result = await promise
    expect(result).toEqual(expectedOutputs)
  })

  it('rejects on error response', async () => {
    const mock = createMockWorker()
    const client = createWorkerClient(mock as unknown as Worker)

    const promise = client.loadModel('/models/bad.onnx', 'bad-model')
    mock.simulateResponse({ type: 'error', message: 'Failed to load' })

    await expect(promise).rejects.toThrow('Failed to load')
  })

  it('disposeModel sends dispose message', () => {
    const mock = createMockWorker()
    const client = createWorkerClient(mock as unknown as Worker)

    client.disposeModel('test-model')

    expect(mock.postMessage).toHaveBeenCalledWith({
      type: 'dispose-model',
      modelId: 'test-model',
    })
  })

  it('terminate calls worker.terminate', () => {
    const mock = createMockWorker()
    const client = createWorkerClient(mock as unknown as Worker)

    client.terminate()

    expect(mock.terminate).toHaveBeenCalled()
  })
})
