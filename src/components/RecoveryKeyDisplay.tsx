"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, Download, Eye, EyeOff } from "lucide-react";
import { parseRecoveryKey } from "@/lib/recovery-key";

type Props = {
  recoveryKey: string;
  onAcknowledged: () => void;
};

export default function RecoveryKeyDisplay({ recoveryKey, onAcknowledged }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [confirmKey, setConfirmKey] = useState("");

  // Proof of custody: the flow cannot be skipped without actually taking the key out
  // of the screen (clipboard or file).
  const hasProof = copied || downloaded;
  const originalIdentity = parseRecoveryKey(recoveryKey);
  const enteredIdentity = parseRecoveryKey(confirmKey);
  const keyMatches =
    !!originalIdentity &&
    !!enteredIdentity &&
    originalIdentity.usuarioId === enteredIdentity.usuarioId &&
    originalIdentity.publicKeyJwk.x === enteredIdentity.publicKeyJwk.x;
  const canContinue = hasProof && keyMatches;

  function handleDownload() {
    try {
      const blob = new Blob([recoveryKey], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mycelium-recovery-key.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch {
      setDownloaded(false);
    }
  }

  async function handleCopy() {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
    } catch {
      setCopyError("El navegador no dejo copiar. Usá Descargar o seleccioná el texto a mano.");
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
      <div className="text-center space-y-2">
        <p className="text-sm text-[#505070] font-mono leading-relaxed">
          Esta es tu clave de recuperacion. Con ella podes restaurar tu identidad
          en otro navegador o dispositivo. Sin ella, si perdes este navegador,
          perdes tus notas.
        </p>
        <p className="text-xs text-[#505070] font-mono">
          Empieza con <span className="text-[#00d4ff]">MYC1-</span> y son 24 grupos
          de 5. Se puede pegar en minúsculas, con espacios o sin guiones.
        </p>
        <p className="text-xs text-[#ff6600] font-mono">
          &gt;&gt; Guardala en un lugar seguro antes de continuar &lt;&lt;
        </p>
      </div>

      <div className="w-full p-4 rounded-xl glass glow-border">
        {revealed ? (
          <div className="space-y-3">
            <p className="text-xs font-mono text-[#e0e0f0] break-all leading-relaxed max-h-48 overflow-y-auto">
              {recoveryKey}
            </p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1a1a3a] text-xs text-[#505070] font-mono hover:text-[#00d4ff] hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/5 transition"
            >
              <Copy size={14} />
              {copied ? "Copiada!" : "Copiar clave"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-[#505070] font-mono">
              {"> "} Haz clic para revelar
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setRevealed(!revealed)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1a1a3a] text-sm text-[#505070] font-mono hover:text-[#00d4ff] hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/5 transition"
        >
          {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          {revealed ? "Ocultar" : "Revelar"}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1a1a3a] text-sm text-[#505070] font-mono hover:text-[#00ff88] hover:border-[#00ff88]/30 hover:bg-[#00ff88]/5 transition"
        >
          <Download size={16} />
          Descargar
        </button>
      </div>

      {(copied || downloaded || copyError) && (
        <div className="space-y-1 text-center">
          {copied && (
            <p className="text-xs text-[#00ff88] font-mono">&gt;&gt; Clave copiada al portapapeles</p>
          )}
          {downloaded && (
            <p className="text-xs text-[#00ff88] font-mono">
              &gt;&gt; Archivo mycelium-recovery-key.txt descargado &mdash; guardalo fuera del navegador
            </p>
          )}
          {copyError && (
            <p className="text-xs text-[#ff6600] font-mono">&gt;&gt; {copyError}</p>
          )}
        </div>
      )}

      <div className="w-full space-y-3">
        <div className="space-y-2">
          <p className="text-xs text-[#505070] font-mono">
            Para confirmar que la guardaste, pegala aca:
          </p>
          <textarea
            value={confirmKey}
            onChange={(e) => setConfirmKey(e.target.value)}
            placeholder="MYC1-XXXXX-XXXXX-..."
            rows={3}
            className="w-full p-3 rounded-xl bg-[#0a0a14] border border-[#1a1a3a] text-xs font-mono text-[#e0e0f0] placeholder:text-[#505070] focus:outline-none focus:border-[#00d4ff]/50 resize-none"
          />
          {confirmKey.trim() && !keyMatches && (
            <p className="text-xs text-[#ff00ff] font-mono">
              &gt;&gt; La clave no coincide. Verifica que la copiaste completa.
            </p>
          )}
          {keyMatches && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-[#00ff88] font-mono">
              <Check size={12} />
              Clave confirmada.
            </p>
          )}
        </div>
        <button
          onClick={onAcknowledged}
          disabled={!canContinue}
          className={
            canContinue
              ? "w-full px-8 py-3 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/40 text-[#00d4ff] font-mono text-sm tracking-wide hover:bg-[#00d4ff]/20 transition"
              : "w-full px-8 py-3 rounded-xl bg-[#0a0a14] border border-[#1a1a3a] text-[#505070] font-mono text-sm tracking-wide cursor-not-allowed"
          }
        >
          &gt;&gt; Ya guarde mi clave
        </button>
        {!hasProof ? (
          <p className="flex items-start justify-center gap-1.5 text-xs text-[#ff6600] font-mono leading-relaxed">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span>
              Para continuar tenes que copiar o descargar la clave. Sin ella no existe forma de
              recuperar estas notas.
            </span>
          </p>
        ) : !keyMatches ? (
          <p className="text-xs text-[#ff6600] font-mono">
            &gt;&gt; Copiada. Ahora pegala arriba para confirmar.
          </p>
        ) : (
          <p className="flex items-center justify-center gap-1.5 text-xs text-[#00ff88] font-mono">
            <Check size={12} />
            Copiada o descargada. Ahora si podes continuar.
          </p>
        )}
      </div>
    </div>
  );
}
