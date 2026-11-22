import { generateId } from "@/lib/crypto";
import { DEFAULT_DOC_TITLE } from "@/lib/title";
import { getIdentityId } from "@/lib/identity";

export type Doc = {
  id: string;
  nombre: string;
  updated_at: string;
};

const DB_NAME = "mycelium-docs";
const DB_VERSION = 2;
const STORE = "docs";
const CONTENT_STORE = "content";
const CONTENT_INDEX = "byDoc";

type ContentRecord = { docId: string; update: Uint8Array };

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CONTENT_STORE)) {
        const content = db.createObjectStore(CONTENT_STORE, { autoIncrement: true });
        content.createIndex(CONTENT_INDEX, "docId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withDB<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDB();
  try {
    return await fn(db);
  } finally {
    db.close();
  }
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

export async function getDoc(id: string): Promise<Doc | undefined> {
  return tx("readonly", (s) => s.get(id) as IDBRequest<Doc | undefined>);
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
  await clearContent(id);
  // DB legacy de y-indexeddb (nombre = docId) si nunca migro: no hace falta
  // saber si existe, deleteDB sobre nombre inexistente no falla.
  void indexedDB.deleteDatabase(id);
  return true;
}

export async function loadContentUpdates(id: string): Promise<Uint8Array[]> {
  return withDB(
    (db) =>
      new Promise<Uint8Array[]>((resolve, reject) => {
        const t = db.transaction(CONTENT_STORE, "readonly");
        const req = t.objectStore(CONTENT_STORE).index(CONTENT_INDEX).getAll(id);
        req.onsuccess = () =>
          resolve((req.result as ContentRecord[]).map((r) => r.update));
        req.onerror = () => reject(req.error);
      })
  );
}

export async function appendContentUpdate(id: string, update: Uint8Array): Promise<void> {
  return withDB(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(CONTENT_STORE, "readwrite");
        t.objectStore(CONTENT_STORE).add({ docId: id, update });
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

/** Colapsa el log de updates en un snapshot: agrega primero, borra el resto. */
export async function compactContent(id: string, snapshot: Uint8Array): Promise<void> {
  return withDB(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(CONTENT_STORE, "readwrite");
        const store = t.objectStore(CONTENT_STORE);
        const addReq = store.add({ docId: id, update: snapshot });
        addReq.onsuccess = () => {
          const snapshotKey = addReq.result;
          const cursorReq = store.index(CONTENT_INDEX).openCursor(IDBKeyRange.only(id));
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor) return;
            if (cursor.primaryKey !== snapshotKey) cursor.delete();
            cursor.continue();
          };
        };
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

async function clearContent(id: string): Promise<void> {
  return withDB(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(CONTENT_STORE, "readwrite");
        const cursorReq = t
          .objectStore(CONTENT_STORE)
          .index(CONTENT_INDEX)
          .openCursor(IDBKeyRange.only(id));
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor) return;
          cursor.delete();
          cursor.continue();
        };
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}
