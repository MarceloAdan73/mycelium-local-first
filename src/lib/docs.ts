import {
  listDocs as listStoreDocs,
  createDoc as createStoreDoc,
  renameDoc as renameStoreDoc,
  deleteDoc as deleteStoreDoc,
  type Doc,
} from "@/lib/doc-store";

export type { Doc };

export async function listDocs(): Promise<Doc[]> {
  return listStoreDocs();
}

export async function createDoc(): Promise<Doc | null> {
  return createStoreDoc();
}

export async function renameDoc(id: string, nombre: string): Promise<boolean> {
  return renameStoreDoc(id, nombre);
}

export async function deleteDoc(id: string): Promise<boolean> {
  return deleteStoreDoc(id);
}
