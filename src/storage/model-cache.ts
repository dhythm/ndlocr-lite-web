const DB_NAME = 'ndlocr-lite-web'
const DB_VERSION = 1
const STORE_NAME = 'models'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Failed to open IndexedDB'))
  })
}

export type ModelCache = {
  get(key: string): Promise<ArrayBuffer | null>
  put(key: string, data: ArrayBuffer): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * Create an IndexedDB-backed cache for ONNX model files.
 *
 * First load: fetch from network → store in IndexedDB → return.
 * Subsequent loads: return directly from IndexedDB.
 */
export function createModelCache(): ModelCache {
  return {
    async get(key: string): Promise<ArrayBuffer | null> {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.get(key)

        request.onsuccess = () => {
          db.close()
          resolve(request.result ?? null)
        }
        request.onerror = () => {
          db.close()
          reject(new Error(`Failed to get ${key} from cache`))
        }
      })
    },

    async put(key: string, data: ArrayBuffer): Promise<void> {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.put(data, key)

        request.onsuccess = () => {
          db.close()
          resolve()
        }
        request.onerror = () => {
          db.close()
          reject(new Error(`Failed to put ${key} in cache`))
        }
      })
    },

    async delete(key: string): Promise<void> {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.delete(key)

        request.onsuccess = () => {
          db.close()
          resolve()
        }
        request.onerror = () => {
          db.close()
          reject(new Error(`Failed to delete ${key} from cache`))
        }
      })
    },
  }
}

/**
 * Fetch a model with IndexedDB caching.
 *
 * @param url - Model URL to fetch
 * @param cache - ModelCache instance
 * @param onProgress - Progress callback (0-1)
 * @returns ArrayBuffer of model data
 */
export async function fetchModelWithCache(
  url: string,
  cache: ModelCache,
  onProgress?: (progress: number) => void,
): Promise<ArrayBuffer> {
  // Try cache first
  const cached = await cache.get(url)
  if (cached) {
    onProgress?.(1)
    return cached
  }

  // Fetch from network
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch model: ${response.status} ${response.statusText}`)
  }

  const contentLength = response.headers.get('content-length')
  const total = contentLength ? parseInt(contentLength, 10) : 0

  if (!response.body || total === 0) {
    // Fallback: no streaming support or unknown size
    const data = await response.arrayBuffer()
    await cache.put(url, data)
    onProgress?.(1)
    return data
  }

  // Stream with progress tracking
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onProgress?.(total > 0 ? received / total : 0)
  }

  // Merge chunks into single ArrayBuffer
  const data = new ArrayBuffer(received)
  const view = new Uint8Array(data)
  let offset = 0
  for (const chunk of chunks) {
    view.set(chunk, offset)
    offset += chunk.length
  }

  await cache.put(url, data)
  onProgress?.(1)
  return data
}
