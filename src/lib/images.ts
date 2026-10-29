// Images are stored as Blobs in IndexedDB (not localStorage) to support many screenshots.
const DB_NAME = "mein-deutsch-images";
const STORE = "images";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export async function saveImage(blob: Blob): Promise<string> {
  const id = "img_" + newId();
  await tx("readwrite", (s) => s.put(blob, id));
  return id;
}
export const getImage = (id: string) => tx<Blob | undefined>("readonly", (s) => s.get(id));
export const deleteImage = (id: string) => tx("readwrite", (s) => s.delete(id));
export const putImage = (id: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, id));
export const clearImages = () => tx("readwrite", (s) => s.clear());

export function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}
export async function dataUrlToBlob(u: string): Promise<Blob> {
  return (await fetch(u)).blob();
}
