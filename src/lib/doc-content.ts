import * as Y from "yjs";
import {
  getDoc,
  loadContentUpdates,
  appendContentUpdate,
  compactContent,
} from "@/lib/doc-store";

/**
 * Puente Yjs <-> IndexedDB unificado (mycelium-docs): reemplaza a y-indexeddb,
 * que guardaba el contenido en una DB por nota.
 *
 * Persistencia por log de updates (append inmediato + compactacion en snapshot).
 * Mismo comportamiento multi-pestana que tenia y-indexeddb: las updates de cada
 * pestana se mergean al recargar.
 */

const LEGACY_UPDATES_STORE = "updates";
const COMPACT_AFTER_UPDATES = 20;
const COMPACT_DEBOUNCE_MS = 1000;

function readLegacyUpdates(docId: string): Promise<Uint8Array[] | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open(docId);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LEGACY_UPDATES_STORE)) {
        // La apertura creo la DB vacia, o no es una DB de y-indexeddb: limpiar.
        db.close();
        void indexedDB.deleteDatabase(docId);
        resolve(null);
        return;
      }
      const t = db.transaction(LEGACY_UPDATES_STORE, "readonly");
      const getAll = t.objectStore(LEGACY_UPDATES_STORE).getAll();
      getAll.onsuccess = () => {
        db.close();
        resolve(getAll.result as Uint8Array[]);
      };
      getAll.onerror = () => {
        db.close();
        resolve(null);
      };
    };
    req.onerror = () => resolve(null);
  });
}

export async function loadDocContent(docId: string, ydoc: Y.Doc): Promise<void> {
  let updates: Uint8Array[];
  try {
    updates = await loadContentUpdates(docId);
  } catch {
    updates = [];
  }

  // Migracion one-shot: primera carga de una nota que vive en la DB vieja de
  // y-indexeddb. Copiar updates al store unificado y borrar la DB vieja.
  if (updates.length === 0) {
    const legacy = await readLegacyUpdates(docId);
    if (legacy !== null) {
      for (const update of legacy) {
        await appendContentUpdate(docId, update);
      }
      void indexedDB.deleteDatabase(docId);
      updates = legacy;
    }
  }

  Y.transact(ydoc, () => {
    for (const update of updates) Y.applyUpdate(ydoc, update);
  });
}

export function watchDocContent(docId: string, ydoc: Y.Doc): () => void {
  let pending = 0;
  let compactTimer: ReturnType<typeof setTimeout> | null = null;

  // Si la nota se borra con el editor montado, no recrear content: solo
  // compactar si la metadata sigue existiendo.
  const compactIfAlive = () => {
    void (async () => {
      if (!(await getDoc(docId))) return;
      await compactContent(docId, Y.encodeStateAsUpdate(ydoc));
    })().catch(() => {});
  };

  const scheduleCompact = () => {
    if (compactTimer) clearTimeout(compactTimer);
    compactTimer = setTimeout(() => {
      compactTimer = null;
      pending = 0;
      compactIfAlive();
    }, COMPACT_DEBOUNCE_MS);
  };

  const onUpdate = (update: Uint8Array) => {
    pending += 1;
    void appendContentUpdate(docId, update).catch(() => {});
    if (pending >= COMPACT_AFTER_UPDATES) scheduleCompact();
  };

  ydoc.on("update", onUpdate);

  return () => {
    ydoc.off("update", onUpdate);
    if (compactTimer) clearTimeout(compactTimer);
    // Flush al cerrar: si quedan updates sin compactar, el snapshot final
    // garantiza que sobrevivan aunque el log viejo se borre luego.
    if (pending > 0) {
      pending = 0;
      compactIfAlive();
    }
  };
}
