/**
 * Model download and IndexedDB cache management.
 */

const DB_NAME = 'NDLOCRLiteDB'
const DB_VERSION = 2
const STORE_NAME = 'models'

export const MODEL_VERSION = '1.0.0'

const MODEL_BASE_URL = import.meta.env?.VITE_MODEL_BASE_URL ?? ''

export const MODEL_URLS: Record<string, string> = {
  layout: `${MODEL_BASE_URL}/models/deim-s-1024x1024.onnx`,
  recognition30: `${MODEL_BASE_URL}/models/parseq-ndl-16x256-30-tiny-192epoch-tegaki3.onnx`,
  recognition50: `${MODEL_BASE_URL}/models/parseq-ndl-16x384-50-tiny-146epoch-tegaki2.onnx`,
  recognition100: `${MODEL_BASE_URL}/models/parseq-ndl-16x768-100-tiny-165epoch-tegaki2.onnx`,
}

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models', { keyPath: 'name' })
      }
      if (db.objectStoreNames.contains('results')) {
        db.deleteObjectStore('results')
      }
      const resultsStore = db.createObjectStore('results', { keyPath: 'id' })
      resultsStore.createIndex('by_createdAt', 'createdAt', { unique: false })
    }
  })
}

async function getModelFromCache(modelName: string): Promise<ArrayBuffer | undefined> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(modelName)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const entry = request.result
      if (entry && entry.version === MODEL_VERSION) {
        resolve(entry.data)
      } else {
        resolve(undefined)
      }
    }
  })
}

async function saveModelToCache(modelName: string, data: ArrayBuffer): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put({
      name: modelName,
      data,
      cachedAt: Date.now(),
      version: MODEL_VERSION,
    })
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

async function downloadWithProgress(
  url: string,
  onProgress?: (progress: number) => void,
): Promise<ArrayBuffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('text/html')) {
    throw new Error(`Model file not found (HTML returned): ${url}`)
  }

  const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
  let receivedLength = 0
  const reader = response.body!.getReader()
  const chunks: Uint8Array[] = []

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    receivedLength += value.length
    if (onProgress && contentLength > 0) {
      onProgress(receivedLength / contentLength)
    }
  }

  const allChunks = new Uint8Array(receivedLength)
  let position = 0
  for (const chunk of chunks) {
    allChunks.set(chunk, position)
    position += chunk.length
  }
  return allChunks.buffer
}

export async function loadModel(
  modelType: string,
  onProgress?: (progress: number) => void,
): Promise<ArrayBuffer> {
  const modelUrl = MODEL_URLS[modelType]
  if (!modelUrl) {
    throw new Error(`Unknown model type: ${modelType}`)
  }

  const cached = await getModelFromCache(modelType)
  if (cached) {
    if (onProgress) onProgress(1.0)
    return cached
  }

  const modelData = await downloadWithProgress(modelUrl, onProgress)
  await saveModelToCache(modelType, modelData)
  return modelData
}

export async function clearModelCache(): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}
