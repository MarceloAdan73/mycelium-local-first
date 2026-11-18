import { generateId } from "@/lib/crypto";
import { DEFAULT_DOC_TITLE } from "@/lib/title";
import { getIdentityId } from "@/lib/identity";

export type Doc = {
  id: string;
  nombre: string;
  updated_at: string;
};

const DB_NAME = "mycelium-docs";
const STORE = "docs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

export async function listDocs(): Promise<Doc[]> {
  const uid = await getIdentityId();
  if (!uid) return [];
  const docs = await tx("readonly", (s) => s.getAll() as IDBRequest<Doc[]>);
  return docs
    .filter((d) => !d.id.includes("::") || d.id.startsWith(uid + "::"))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function createDoc(): Promise<Doc | null> {
  const uid = await getIdentityId();
  if (!uid) return null;
  const id = uid + "::" + generateId();
  const doc: Doc = { id, nombre: DEFAULT_DOC_TITLE, updated_at: new Date().toISOString() };
  await tx("readwrite", (s) => s.put(doc));
  return doc;
}

export async function renameDoc(id: string, nombre: string): Promise<boolean> {
  const doc = await tx("readonly", (s) => s.get(id) as IDBRequest<Doc | undefined>);
  if (!doc) return false;
  doc.nombre = nombre;
  doc.updated_at = new Date().toISOString();
  await tx("readwrite", (s) => s.put(doc));
  return true;
}

export async function deleteDoc(id: string): Promise<boolean> {
  await tx("readwrite", (s) => s.delete(id));
  return true;
}
