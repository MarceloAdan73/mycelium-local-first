export type LocalDoc = {
  id: string;
  nombre: string;
  updated_at: string;
};

function getUsuarioId(): string | null {
  try {
    const raw = localStorage.getItem("mc_identity");
    if (!raw) return null;
    const identity = JSON.parse(raw);
    return identity?.usuarioId ?? null;
  } catch {
    return null;
  }
}

function docsKey(): string {
  const uid = getUsuarioId();
  if (!uid) throw new Error("No hay sesion activa");
  return "mc_docs_" + uid;
}

function readDocs(): LocalDoc[] {
  try {
    const raw = localStorage.getItem(docsKey());
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeDocs(docs: LocalDoc[]): void {
  try {
    localStorage.setItem(docsKey(), JSON.stringify(docs));
  } catch {
    /* storage full */
  }
}

export function listLocalDocs(): LocalDoc[] {
  if (!getUsuarioId()) return [];
  return readDocs().sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function createLocalDoc(id: string, nombre: string): LocalDoc | null {
  if (!getUsuarioId()) return null;
  const doc: LocalDoc = { id, nombre, updated_at: new Date().toISOString() };
  const docs = readDocs();
  docs.push(doc);
  writeDocs(docs);
  return doc;
}

export function renameLocalDoc(id: string, nombre: string): boolean {
  const docs = readDocs();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return false;
  docs[idx].nombre = nombre;
  docs[idx].updated_at = new Date().toISOString();
  writeDocs(docs);
  return true;
}

export function deleteLocalDoc(id: string): boolean {
  const docs = readDocs();
  const filtered = docs.filter((d) => d.id !== id);
  if (filtered.length === docs.length) return false;
  writeDocs(filtered);
  return true;
}
