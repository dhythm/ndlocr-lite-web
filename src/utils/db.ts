import type { DBRunEntry } from '../types/db'

const DB_NAME = 'NDLOCRLiteDB'
const DB_VERSION = 2
const STORE_NAME = 'results'
const MAX_ENTRIES = 100

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (db.objectStoreNames.contains('results')) {
        db.deleteObjectStore('results')
      }
      const store = db.createObjectStore('results', { keyPath: 'id' })
      store.createIndex('by_createdAt', 'createdAt', { unique: false })
    }
  })
}

export async function saveRunEntry(entry: DBRunEntry): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(entry)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getRunEntries(): Promise<DBRunEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('by_createdAt')
    const request = index.openCursor(null, 'prev')
    const entries: DBRunEntry[] = []

    request.onsuccess = () => {
      const cursor = request.result
      if (cursor && entries.length < MAX_ENTRIES) {
        entries.push(cursor.value)
        cursor.continue()
      } else {
        resolve(entries)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

export async function clearRunEntries(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
