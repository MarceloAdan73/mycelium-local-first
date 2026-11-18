"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { CyberButton } from "@/components/CyberButton";
import { GlitchText } from "@/components/GlitchText";
import RecoveryKeyDisplay from "@/components/RecoveryKeyDisplay";
import { exportRecoveryKey, importIdentity } from "@/lib/identity";

export default function Home() {
  const { createNewIdentity, identity, unlocked, loading, recoveryPending, acknowledgeRecovery, setIdentity } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"create" | "recovery" | "done">("create");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importKey, setImportKey] = useState("");
  const [importError, setImportError] = useState("");

  const pendingKey = useMemo(() => {
    if (loading || !identity || !recoveryPending) return null;
    try {
      return exportRecoveryKey(identity);
    } catch {
      return null;
    }
  }, [loading, identity, recoveryPending]);

  const shownKey = recoveryKey || pendingKey || "";
  const activeStep = recoveryKey || pendingKey ? "recovery" : step;

  useEffect(() => {
    if (!loading && unlocked && !recoveryPending) router.replace("/dashboard");
  }, [loading, unlocked, recoveryPending, router]);

  useEffect(() => {
    if (!unlocked) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecoveryKey("");
      setStep("create");
      setShowImport(false);
      setImportKey("");
      setImportError("");
    }
  }, [unlocked]);

  async function handleCreate() {
    setBusy(true);
    try {
      const identity = await createNewIdentity();
      const key = exportRecoveryKey(identity);
      setRecoveryKey(key);
      setStep("recovery");
    } catch {
      /* error */
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setBusy(true);
    setImportError("");
    try {
      const key = importKey.trim() || (document.querySelector("textarea")?.value ?? "");
      const identity = await importIdentity(key);
      if (identity) {
        acknowledgeRecovery();
        setIdentity(identity);
        router.replace("/dashboard");
      } else {
        setImportError("Clave invalida. Verifica que este completa.");
      }
    } catch {
      setImportError("Error al importar la clave.");
    } finally {
      setBusy(false);
    }
  }

  function handleDone() {
    acknowledgeRecovery();
    setRecoveryKey("");
    setStep("done");
    router.replace("/dashboard");
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00d4ff] border-t-transparent animate-spin" />
          <p className="text-sm text-[#505070] font-mono">Inicializando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="flex flex-col items-center gap-8 max-w-md">
        <Logo />

        <GlitchText as="h1" className="text-3xl font-bold tracking-[0.15em] uppercase">
          Mycelium
        </GlitchText>

        <div className="text-center space-y-1">
          <p className="text-sm text-[#505070] font-mono">
            &gt;&gt;{" "}
            {activeStep === "recovery"
              ? "Guarda tu clave de recuperacion"
              : "Tu identidad se genera en este dispositivo"}
          </p>
        </div>

        {activeStep === "create" && !showImport && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-sm text-[#505070] text-center font-mono leading-relaxed max-w-sm">
              No hay formularios. No hay passwords. No hay email.
              <br />
              Tu dispositivo genera una identidad criptografica unica.
            </p>
            <CyberButton onClick={handleCreate} disabled={busy} size="lg">
              {busy ? "Generando..." : "Iniciar Mycelium"}
            </CyberButton>
            <p className="text-xs text-[#505070] font-mono">
              &gt;&gt; La clave privada NUNCA sale de tu dispositivo &lt;&lt;
            </p>
            <button
              onClick={() => setShowImport(true)}
              className="text-xs font-mono text-[#505070] hover:text-[#00d4ff] underline underline-offset-2 transition"
            >
              Ya tenes clave? Importala
            </button>
          </div>
        )}

        {activeStep === "create" && showImport && (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <p className="text-sm text-[#505070] text-center font-mono leading-relaxed">
              Pega tu clave de recuperacion para restaurar tu identidad.
            </p>
            <textarea
              value={importKey}
              onChange={(e) => setImportKey(e.target.value)}
              placeholder="MYC1-XXXXX-XXXXX-..."
              rows={4}
              className="w-full p-3 rounded-xl bg-[#0a0a14] border border-[#1a1a3a] text-xs font-mono text-[#e0e0f0] placeholder:text-[#505070] focus:outline-none focus:border-[#00d4ff]/50 resize-none"
            />
            {importError && (
              <p className="text-xs text-[#ff00ff] font-mono">
                &gt;&gt; {importError}
              </p>
            )}
            <CyberButton
              onClick={handleImport}
              disabled={busy || !importKey.trim()}
              size="lg"
            >
              {busy ? "Importando..." : "Importar identidad"}
            </CyberButton>
            <button
              onClick={() => {
                setShowImport(false);
                setImportError("");
                setImportKey("");
              }}
              className="text-xs font-mono text-[#505070] hover:text-[#00d4ff] underline underline-offset-2 transition"
            >
              Volver
            </button>
          </div>
        )}

        {activeStep === "recovery" && (
          <div className="flex flex-col items-center gap-6 w-full">
            <RecoveryKeyDisplay
              recoveryKey={shownKey}
              onAcknowledged={handleDone}
            />
            <div className="w-full max-w-sm space-y-3 text-center">
              <button
                onClick={() => setShowImport((v) => !v)}
                className="text-xs font-mono text-[#505070] hover:text-[#00d4ff] underline underline-offset-2 transition"
              >
                Ya tenes una clave anterior? Usala
              </button>
              {showImport && (
                <div className="flex flex-col items-center gap-3 w-full">
                  <textarea
                    value={importKey}
                    onChange={(e) => setImportKey(e.target.value)}
                    placeholder="MYC1-XXXXX-XXXXX-..."
                    rows={4}
                    className="w-full p-3 rounded-xl bg-[#0a0a14] border border-[#1a1a3a] text-xs font-mono text-[#e0e0f0] placeholder:text-[#505070] focus:outline-none focus:border-[#00d4ff]/50 resize-none"
                  />
                  {importError && (
                    <p className="text-xs text-[#ff00ff] font-mono">
                      &gt;&gt; {importError}
                    </p>
                  )}
                  <CyberButton
                    onClick={handleImport}
                    disabled={busy || !importKey.trim()}
                    size="lg"
                  >
                    {busy ? "Importando..." : "Importar identidad"}
                  </CyberButton>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
