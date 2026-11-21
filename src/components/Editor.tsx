"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as Y from "yjs";
import { renameDoc } from "@/lib/docs";
import { loadDocContent, watchDocContent } from "@/lib/doc-content";
import { DEFAULT_DOC_TITLE, deriveTitleFromContent } from "@/lib/title";

/** Mismo debounce que usa el rename del sidebar (dashboard/page.tsx). */
const RENAME_DEBOUNCE_MS = 600;

type Props = {
  docId: string;
  docName: string;
  onNameChange: (id: string, name: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export default function Editor({ docId, docName, onNameChange, onDirtyChange }: Props) {
  const ydocRef = useRef<Y.Doc | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const onNameChangeRef = useRef(onNameChange);
  const onDirtyRef = useRef(onDirtyChange);

  useEffect(() => {
    onNameChangeRef.current = onNameChange;
  }, [onNameChange]);

  useEffect(() => {
    onDirtyRef.current = onDirtyChange;
  }, [onDirtyChange]);

  const [content, setContent] = useState("");
  const [title, setTitle] = useState(docName);
  /** Ultimo titulo conocido (input o prop): espejo de docName. */
  const titleRef = useRef(docName);
  /** El usuario escribio el titulo a mano: el auto-titulo deja de pisarlo. */
  const titleEditedManuallyRef = useRef(false);
  /** Ultimo titulo que asigno el auto-titulo (para no pisarse a si mismo). */
  const autoTitleRef = useRef<string | null>(null);
  const autoTitleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Nombre visto en el ultimo render, para syncear el input cuando el rename
  // viene del sidebar. Ajuste en render y no en un effect: setState dentro de
  // un effect dispara renders en cascada (react-hooks/set-state-in-effect).
  const [lastDocName, setLastDocName] = useState(docName);

  if (docName !== lastDocName) {
    setLastDocName(docName);
    setTitle(docName);
  }

  useEffect(() => {
    titleRef.current = docName;
  }, [docName]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    let disposed = false;
    let stopPersist: (() => void) | null = null;

    loadDocContent(docId, ydoc).then(() => {
      if (disposed) return;
      stopPersist = watchDocContent(docId, ydoc);
      setReady(true);
      const ytext = ydoc.getText("content");
      setContent(ytext.toString());

      // Nota nueva: el cursor arranca en el cuerpo, que es donde se escribe.
      // El titulo se arma solo con la primera linea (auto-titulo).
      if (ytext.length === 0) {
        requestAnimationFrame(() => bodyRef.current?.focus());
      }

      ytext.observe(() => {
        setContent(ytext.toString());
      });
    });

    return () => {
      disposed = true;
      if (autoTitleDebounceRef.current) clearTimeout(autoTitleDebounceRef.current);
      if (stopPersist) stopPersist();
      ydoc.destroy();
    };
  }, [docId]);

  const handleSave = useCallback(() => {
    setSaved(true);
    onDirtyRef.current?.(false);
  }, []);

  useEffect(() => {
    window.addEventListener("mycelium:save", handleSave);
    return () => window.removeEventListener("mycelium:save", handleSave);
  }, [handleSave]);

  const applyAutoTitle = useCallback(
    (value: string) => {
      if (titleEditedManuallyRef.current) return;
      // Un rename hecho desde el sidebar cuenta como titulo manual.
      const current = titleRef.current;
      if (current && current !== DEFAULT_DOC_TITLE && current !== autoTitleRef.current) {
        titleEditedManuallyRef.current = true;
        return;
      }
      const next = deriveTitleFromContent(value);
      if (!next || next === titleRef.current) return;

      autoTitleRef.current = next;
      titleRef.current = next;
      setTitle(next);
      renameDoc(docId, next);
      onNameChangeRef.current(docId, next);
    },
    [docId]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContent(value);
      const ydoc = ydocRef.current;
      if (ydoc) {
        const ytext = ydoc.getText("content");
        ydoc.transact(() => {
          ytext.delete(0, ytext.length);
          ytext.insert(0, value);
        });
      }
      setSaved(false);
      onDirtyRef.current?.(true);

      if (autoTitleDebounceRef.current) clearTimeout(autoTitleDebounceRef.current);
      autoTitleDebounceRef.current = setTimeout(() => {
        applyAutoTitle(value);
      }, RENAME_DEBOUNCE_MS);
    },
    [applyAutoTitle]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      // Un titulo vacio no es "titulo manual": el auto-titulo puede llenarlo.
      if (name.trim()) {
        titleEditedManuallyRef.current = true;
        autoTitleRef.current = null;
      }
      titleRef.current = name;
      setTitle(name);
      onDirtyRef.current?.(true);
      if (name !== docName) {
        renameDoc(docId, name);
        onNameChangeRef.current(docId, name);
      }
    },
    [docId, docName]
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-2 border-b border-[#1a1a3a]/30">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#00ff88]">&#x25B6;</span>
          <span className={`text-xs font-mono tracking-wide ${saved ? "text-[#00ff88]" : "text-[#ff6600]"}`}>
            {ready ? (saved ? ">> Guardado (local)" : ">> Sin guardar") : ">> Cargando..."}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#505070]">
          {content.split(/\s+/).filter(Boolean).length} palabras
        </span>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,212,255,0.15) transparent" }}>
        <div className="max-w-3xl mx-auto px-8 pb-16">
          <input
            value={title}
            onChange={handleTitleChange}
            placeholder="titulo"
            aria-label="Titulo de la nota"
            className="w-full pt-10 pb-3 text-3xl font-bold bg-transparent focus:outline-none text-[#e0e0f0] placeholder-[#505070]/30 tracking-tight font-mono"
          />

          {/* Delimitador: separa el titulo del cuerpo y marca donde se escribe. */}
          <div
            onClick={() => bodyRef.current?.focus()}
            className="mt-4 cursor-text border-t border-dashed border-[#00d4ff]/25 pt-4"
          >
            <p className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-[#505070]">
              <span className="text-[#00d4ff]/60">&gt;&gt;&gt;</span>
              contenido
            </p>
            <textarea
              ref={bodyRef}
              value={content}
              onChange={handleChange}
              aria-label="Contenido de la nota"
              placeholder="Escribi aca. La primera linea se usa como titulo."
              className="w-full min-h-[60vh] resize-none rounded-lg border border-transparent border-l-2 border-l-[#00d4ff]/20 bg-[#00d4ff]/[0.02] px-4 py-3 text-base leading-relaxed text-[#e0e0f0]/90 placeholder:text-[#505070]/60 focus:border-[#1a1a3a] focus:border-l-[#00d4ff]/60 focus:bg-[#00d4ff]/[0.04] focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
