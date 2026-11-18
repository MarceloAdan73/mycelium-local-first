"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { CyberButton } from "@/components/CyberButton";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-sm rounded-2xl border border-[#ff00ff]/30 bg-[#0a0a14]/95 shadow-[0_0_40px_rgba(255,0,255,0.12)]"
          >
            <div className="flex items-start gap-4 p-6">
              <div className="flex-shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-[#ff00ff]/10 border border-[#ff00ff]/30 flex items-center justify-center">
                <AlertTriangle size={20} className="text-[#ff00ff]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-mono font-bold text-sm text-[#e0e0f0] tracking-wide uppercase">
                  {title}
                </h2>
                <p className="mt-2 font-mono text-xs text-[#505070] leading-relaxed break-words">
                  {message}
                </p>
              </div>
              <button
                onClick={onCancel}
                className="flex-shrink-0 text-[#505070] hover:text-[#e0e0f0] transition"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex justify-end gap-3 px-6 pb-6">
              <CyberButton
                ref={cancelRef}
                onClick={onCancel}
                variant="ghost"
                size="sm"
                className="!text-[#505070] hover:!text-[#e0e0f0]"
              >
                {cancelLabel}
              </CyberButton>
              <CyberButton
                onClick={onConfirm}
                variant="secondary"
                size="sm"
              >
                {confirmLabel}
              </CyberButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
