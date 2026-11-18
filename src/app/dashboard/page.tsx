"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { listDocs, createDoc, deleteDoc, renameDoc, type Doc } from "@/lib/docs";
import { PAIRING_ENABLED } from "@/lib/feature-flags";
import { LogoIcon } from "@/components/Logo";
import Editor from "@/components/Editor";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function DashboardPage() {
  const { unlocked, loading, identity, logout, clearAll, recoveryPending } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [terminalMsg, setTerminalMsg] = useState(">> Listo");
  const [dirty, setDirty] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Doc | null>(null);
  const renameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Never bypass the recovery key screen by typing /dashboard directly.
  useEffect(() => {
    if (!loading && unlocked && recoveryPending) router.replace("/");
  }, [loading, unlocked, recoveryPending, router]);

  useEffect(() => {
    if (!loading && !unlocked) router.replace("/");
  }, [loading, unlocked, router]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (pendingDelete) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        handleCreate();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        setTerminalMsg(">> Guardando...");
        window.dispatchEvent(new Event("mycelium:save"));
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P" && PAIRING_ENABLED) {
        e.preventDefault();
        router.push("/login");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const loadDocs = useCallback(async () => {
    if (!identity) return;
    setLoadingDocs(true);
    setError("");
    try {
      const list = await listDocs();
      setDocs(list);
      setActiveId((prev) => prev ?? list[0]?.id ?? null);
      setTerminalMsg(`>> ${list.length} documento(s) cargado(s)`);
    } catch {
      setError("Error al cargar documentos");
      setTerminalMsg(">> ERROR: no se pudieron cargar los documentos");
    } finally {
      setLoadingDocs(false);
    }
  }, [identity]);

  useEffect(() => {
    if (unlocked && identity) queueMicrotask(() => loadDocs());
  }, [unlocked, identity, loadDocs]);

  useEffect(() => {
    return () => {
      if (renameDebounceRef.current) clearTimeout(renameDebounceRef.current);
    };
  }, []);

  async function handleCreate() {
    const doc = await createDoc();
    if (!doc) {
      setError("No se pudo crear el documento");
      setTerminalMsg(">> ERROR: no se pudo crear");
      return;
    }
    setDocs((prev) => [doc, ...prev]);
    setActiveId(doc.id);
    setTerminalMsg(`>> Documento "${doc.nombre}" creado`);
    setDirty(true);
  }

  function handleDelete(doc: Doc) {
    setPendingDelete(doc);
  }

  async function confirmDelete() {
    const doc = pendingDelete;
    if (!doc) return;
    setPendingDelete(null);
    const ok = await deleteDoc(doc.id);
    if (!ok) {
      setError("No se pudo eliminar");
      setTerminalMsg(">> ERROR: no se pudo eliminar");
      return;
    }
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    setActiveId((prev) => (prev === doc.id ? null : prev));
    setTerminalMsg(`>> Documento "${doc.nombre}" eliminado`);
  }

  function startRename(doc: Doc) {
    setEditingId(doc.id);
    setEditingName(doc.nombre);
  }

  function handleRenameChange(value: string) {
    setEditingName(value);
    const id = editingId;
    if (!id) return;
    if (renameDebounceRef.current) clearTimeout(renameDebounceRef.current);
    renameDebounceRef.current = setTimeout(() => {
      renameDoc(id, value).catch(() => {});
      setDocs((prev) =>
        prev.map((d) => (d.id === id ? { ...d, nombre: value } : d))
      );
    }, 600);
  }

  function commitRename() {
    setEditingId(null);
  }

  const onNameChange = useCallback((id: string, name: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, nombre: name } : d))
    );
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  async function handleClearAll() {
    await clearAll();
    router.replace("/");
  }

  if (loading || !unlocked || recoveryPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00d4ff] border-t-transparent animate-spin" />
          <p className="text-sm text-[#505070] font-mono tracking-wide">
            Inicializando...
          </p>
        </div>
      </div>
    );
  }

  const activeDoc = docs.find((d) => d.id === activeId) ?? null;

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-64 shrink-0 flex flex-col border-r border-[#1a1a3a]/40 glass">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a3a]/40">
          <div className="flex items-center gap-2">
            <LogoIcon size={20} />
            <span
              className="text-sm font-bold tracking-wider uppercase"
              style={{
                color: "#00d4ff",
                textShadow: "0 0 10px rgba(0, 212, 255, 0.3)",
              }}
            >
              Mycelium
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#505070]">
            {identity?.usuarioId?.slice(0, 8) ?? ""}
          </span>
        </div>

        <div className="px-3 pt-3 pb-2">
          <button
            onClick={handleCreate}
            className="w-full px-3 py-2 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-sm font-mono tracking-wide hover:bg-[#00d4ff]/20 transition"
          >
            &gt;&gt; Nuevo documento
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,212,255,0.15) transparent" }}>
          {loadingDocs ? (
            <div className="space-y-2 px-1 py-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-9 rounded-lg animate-pulse"
                  style={{
                    background: "linear-gradient(90deg, rgba(0,212,255,0.03) 0%, rgba(0,212,255,0.08) 50%, rgba(0,212,255,0.03) 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[#505070] font-mono">
              &gt;&gt; No hay documentos
              <br />
              <span className="text-xs">Ctrl+N para crear uno</span>
            </p>
          ) : (
            <div className="space-y-1 py-1">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setActiveId(doc.id)}
                  onDoubleClick={() => startRename(doc)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition glitch-hover ${
                    doc.id === activeId
                      ? "bg-[#12122a] text-[#e0e0f0] border border-[#00d4ff]/20 glow-border"
                      : "text-[#505070] hover:bg-[#0a0a14] border border-transparent"
                  }`}
                >
                  {editingId === doc.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => handleRenameChange(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                      }}
                      className="flex-1 min-w-0 bg-transparent border-b border-[#00d4ff] focus:outline-none font-mono text-sm"
                    />
                  ) : (
                    <span className="truncate flex-1 font-mono text-xs tracking-wide">
                      {doc.nombre}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[#505070] hover:text-[#ff00ff] transition ml-2 text-xs font-mono"
                    title="Eliminar"
                  >
                    [x]
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#1a1a3a]/40 p-3 space-y-2">
          {/* Emparejamiento multi-dispositivo en pausa (ver lib/feature-flags.ts). */}
          {PAIRING_ENABLED && (
            <button
              onClick={() => router.push("/login")}
              className="w-full px-3 py-2 rounded-lg border border-[#1a1a3a] text-xs font-mono text-[#505070] hover:text-[#00d4ff] hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/5 transition"
            >
              &gt;&gt; Emparejar dispositivo
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-lg border border-[#1a1a3a] text-xs font-mono text-[#505070] hover:text-[#ff6600] hover:border-[#ff6600]/30 hover:bg-[#ff6600]/5 transition"
          >
            &gt;&gt; Cerrar sesion
          </button>
          <button
            onClick={handleClearAll}
            className="w-full px-3 py-2 rounded-lg border border-[#1a1a3a] text-xs font-mono text-[#505070] hover:text-[#ff00ff] hover:border-[#ff00ff]/30 hover:bg-[#ff00ff]/5 transition"
          >
            &gt;&gt; Borrar todo
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {error && (
            <div className="px-6 py-2 text-sm font-mono text-[#ff00ff] border-b border-[#ff00ff]/20 bg-[#ff00ff]/5">
              [ERROR] {error}
            </div>
          )}
          {activeDoc ? (
            <Editor
              key={activeDoc.id}
              docId={activeDoc.id}
              docName={activeDoc.nombre}
              onNameChange={onNameChange}
              onDirtyChange={setDirty}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-[#505070] text-sm font-mono">
              <div className="text-center space-y-2">
                <p>&gt;&gt; {docs.length === 0 ? "Crea tu primer documento" : "Selecciona un documento"}</p>
                <p className="text-xs text-[#505070]/60">
                  Ctrl+N nuevo &middot; Ctrl+S guardar
                  {PAIRING_ENABLED && " \u00b7 Ctrl+Shift+P emparejar"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="h-7 border-t border-[#1a1a3a]/40 bg-[#0a0a14] flex items-center px-4 gap-3">
          <span className="text-[10px] font-mono text-[#00ff88] animate-blink">&#x25CF;</span>
          <span className="text-[11px] font-mono text-[#505070]">{terminalMsg}</span>
          <span className="flex-1" />
          <span className="text-[10px] font-mono text-[#505070]">[N]uevo</span>
          <span className="text-[10px] font-mono text-[#505070]">[S]ync</span>
          {PAIRING_ENABLED && (
            <span className="text-[10px] font-mono text-[#505070]">[P] emparejar</span>
          )}
        </div>
      </main>

      <ConfirmModal
        open={pendingDelete !== null}
        title="Eliminar documento"
        message={`"${pendingDelete?.nombre ?? ""}" se eliminará de forma permanente. No se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
