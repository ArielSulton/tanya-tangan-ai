/**
 * Tiny IndexedDB wrapper for persisting gesture-recorder samples.
 * Two object stores: 'staticSamples' and 'dynamicSamples', keyed by id.
 * All operations are async via Promise.
 */

import type { StaticSample, DynamicSample } from './types'

const DB_NAME = 'gesture-recorder'
const DB_VERSION = 1
const STATIC_STORE = 'staticSamples'
const DYNAMIC_STORE = 'dynamicSamples'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STATIC_STORE)) {
        db.createObjectStore(STATIC_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(DYNAMIC_STORE)) {
        db.createObjectStore(DYNAMIC_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(new Error(`Failed to open IndexedDB: ${req.error?.message ?? 'unknown'}`))
  })
}

async function txAll<T>(store: string, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const req = op(tx.objectStore(store))
    let result: T | undefined
    req.onsuccess = () => {
      result = req.result
    }
    req.onerror = () => reject(new Error(req.error?.message ?? 'IDB error'))
    // Resolve on transaction commit (not just request success) so writes are
    // durable before the caller acts on them.
    tx.oncomplete = () => {
      db.close()
      resolve(result as T)
    }
    tx.onerror = () => {
      db.close()
      reject(new Error(tx.error?.message ?? 'IDB transaction error'))
    }
  })
}

export async function addStatic(sample: StaticSample): Promise<void> {
  await txAll(STATIC_STORE, 'readwrite', (s) => s.add(sample) as IDBRequest<unknown> as IDBRequest<void>)
}

export async function addDynamic(sample: DynamicSample): Promise<void> {
  await txAll(DYNAMIC_STORE, 'readwrite', (s) => s.add(sample) as IDBRequest<unknown> as IDBRequest<void>)
}

export async function listStatic(): Promise<StaticSample[]> {
  return txAll(STATIC_STORE, 'readonly', (s) => s.getAll() as IDBRequest<StaticSample[]>)
}

export async function listDynamic(): Promise<DynamicSample[]> {
  return txAll(DYNAMIC_STORE, 'readonly', (s) => s.getAll() as IDBRequest<DynamicSample[]>)
}

export async function deleteStatic(id: string): Promise<void> {
  await txAll(STATIC_STORE, 'readwrite', (s) => s.delete(id) as IDBRequest<unknown> as IDBRequest<void>)
}

export async function deleteDynamic(id: string): Promise<void> {
  await txAll(DYNAMIC_STORE, 'readwrite', (s) => s.delete(id) as IDBRequest<unknown> as IDBRequest<void>)
}

export async function clearStatic(): Promise<void> {
  await txAll(STATIC_STORE, 'readwrite', (s) => s.clear() as IDBRequest<unknown> as IDBRequest<void>)
}

export async function clearDynamic(): Promise<void> {
  await txAll(DYNAMIC_STORE, 'readwrite', (s) => s.clear() as IDBRequest<unknown> as IDBRequest<void>)
}

async function deleteByLabel(store: string, label: string): Promise<number> {
  const db = await openDb()
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const objStore = tx.objectStore(store)
    let deleted = 0
    const req = objStore.openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor === null) return
      const value = cursor.value as { label?: string }
      if (value.label === label) {
        cursor.delete()
        deleted++
      }
      cursor.continue()
    }
    tx.oncomplete = () => {
      db.close()
      resolve(deleted)
    }
    tx.onerror = () => {
      db.close()
      reject(new Error(tx.error?.message ?? 'IDB cursor error'))
    }
  })
}

export async function deleteStaticByLabel(label: string): Promise<number> {
  return deleteByLabel(STATIC_STORE, label)
}

export async function deleteDynamicByLabel(label: string): Promise<number> {
  return deleteByLabel(DYNAMIC_STORE, label)
}

export async function clearAll(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STATIC_STORE, DYNAMIC_STORE], 'readwrite')
    tx.objectStore(STATIC_STORE).clear()
    tx.objectStore(DYNAMIC_STORE).clear()
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(new Error(tx.error?.message ?? 'IDB clear error'))
    }
  })
}
