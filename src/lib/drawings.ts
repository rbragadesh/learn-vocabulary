// Her drawings live in IndexedDB (they're too big for localStorage).

const DB = 'wordquest';
const STORE = 'drawings';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getDrawing(wordId: string): Promise<string | undefined> {
  try {
    return await tx<string | undefined>('readonly', (s) => s.get(wordId));
  } catch {
    return undefined;
  }
}

export async function saveDrawing(wordId: string, dataUrl: string): Promise<void> {
  await tx('readwrite', (s) => s.put(dataUrl, wordId));
}

export async function drawingIds(): Promise<string[]> {
  try {
    return (await tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys())).map(String);
  } catch {
    return [];
  }
}
