import { describe, it, expect, beforeEach } from 'vitest'
import { createModelCache, type ModelCache } from './model-cache.ts'

/**
 * In-memory IndexedDB mock.
 *
 * The key issue with mocking IDB is that `indexedDB.open()` returns
 * an IDBOpenDBRequest, and the consumer sets `.onsuccess` on the
 * returned object. We must fire the callback on that same object,
 * not a copy. Using `queueMicrotask` ensures callbacks fire after
 * the consumer has assigned them.
 */
function installMockIndexedDB() {
  const store = new Map<string, ArrayBuffer>()

  function createRequest<T>(resultValue: T) {
    const req = {
      result: resultValue,
      onsuccess: null as ((e: Event) => void) | null,
      onerror: null as ((e: Event) => void) | null,
    }
    queueMicrotask(() => req.onsuccess?.(new Event('success')))
    return req
  }

  const mockDB = {
    transaction(_storeName: string, _mode?: string) {
      return {
        objectStore() {
          return {
            get(key: string) {
              return createRequest(store.get(key) ?? undefined)
            },
            put(value: ArrayBuffer, key: string) {
              store.set(key, value)
              return createRequest(undefined)
            },
            delete(key: string) {
              store.delete(key)
              return createRequest(undefined)
            },
          }
        },
      }
    },
    objectStoreNames: { contains: () => false },
    createObjectStore() {},
    close() {},
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.indexedDB = {
    open() {
      const openReq = {
        result: mockDB,
        onsuccess: null as ((e: Event) => void) | null,
        onerror: null as ((e: Event) => void) | null,
        onupgradeneeded: null as ((e: Event) => void) | null,
      }
      queueMicrotask(() => {
        openReq.onupgradeneeded?.(new Event('upgradeneeded'))
        openReq.onsuccess?.(new Event('success'))
      })
      return openReq
    },
  } as any
}

describe('ModelCache', () => {
  let cache: ModelCache

  beforeEach(() => {
    installMockIndexedDB()
    cache = createModelCache()
  })

  it('returns null for cache miss', async () => {
    const result = await cache.get('nonexistent-model')
    expect(result).toBeNull()
  })

  it('stores and retrieves model data', async () => {
    const modelData = new ArrayBuffer(100)
    const view = new Uint8Array(modelData)
    view[0] = 42
    view[99] = 255

    await cache.put('test-model', modelData)

    const result = await cache.get('test-model')
    expect(result).not.toBeNull()
    const resultView = new Uint8Array(result!)
    expect(resultView[0]).toBe(42)
    expect(resultView[99]).toBe(255)
  })

  it('deletes cached model', async () => {
    const modelData = new ArrayBuffer(10)
    await cache.put('to-delete', modelData)

    await cache.delete('to-delete')

    const result = await cache.get('to-delete')
    expect(result).toBeNull()
  })

  it('overwrites existing cached model', async () => {
    const data1 = new ArrayBuffer(10)
    new Uint8Array(data1)[0] = 1
    await cache.put('model', data1)

    const data2 = new ArrayBuffer(10)
    new Uint8Array(data2)[0] = 2
    await cache.put('model', data2)

    const result = await cache.get('model')
    expect(new Uint8Array(result!)[0]).toBe(2)
  })
})
