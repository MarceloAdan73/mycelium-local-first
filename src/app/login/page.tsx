"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { CyberButton } from "@/components/CyberButton";
import QrDisplay from "@/components/QrDisplay";
import QrScanner from "@/components/QrScanner";
import {
  createPairingRequest,
  createPairingResponse,
  parseQrData,
  verifyPairingResponse,
} from "@/lib/qr";
import { loadIdentity } from "@/lib/identity";
import { sendRelayMessage, waitForRelayMessage } from "@/lib/relay";
import { PAIRING_ENABLED } from "@/lib/feature-flags";
import type { PairingRequest, PairingResponse } from "@/lib/qr";

type Mode = "select" | "show_qr" | "scan_qr";

export default function LoginPage() {
  const { unlocked, loading, setPairingState } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("select");
  const [pairReq, setPairReq] = useState<PairingRequest | null>(null);
  const [status, setStatus] = useState("");

  // El emparejamiento multi-dispositivo esta en pausa: esta ruta redirige al
  // dashboard y el flujo QR de abajo queda intacto para reactivarlo cambiando
  // PAIRING_ENABLED (ver lib/feature-flags.ts).
  useEffect(() => {
    if (loading) return;
    if (!PAIRING_ENABLED) {
      router.replace("/dashboard");
      return;
    }
    if (unlocked) router.replace("/dashboard");
  }, [loading, unlocked, router]);

  const handleShowQr = useCallback(async () => {
    setMode("show_qr");
    setStatus(">> Generando QR...");
    const { request } = await createPairingRequest(
      navigator.userAgent.includes("Android") || navigator.userAgent.includes("iPhone")
        ? "Movil"
        : "PC"
    );
    setPairReq(request);
    setStatus("");

    const relayId = request.challenge.slice(0, 8);
    const msg = await waitForRelayMessage(relayId, 60000);
    if (msg && msg.type === "pair_res") {
      const response = msg.data as PairingResponse;
      const valid = await verifyPairingResponse(response, request);
      if (valid) {
        setPairingState({ phase: "done" });
        setStatus(">> Dispositivo emparejado!");
        setTimeout(() => router.replace("/dashboard"), 1000);
      } else {
        setStatus(">> ERROR: firma invalida");
      }
    } else {
      setStatus(">> Tiempo de espera agotado");
      setMode("select");
    }
  }, [router, setPairingState]);

  const handleScanQr = useCallback(
    async (data: string) => {
      setPairingState({ phase: "scanning" });
      const parsed = parseQrData(data);
      if (!parsed || parsed.type !== "pair_req") {
        setStatus(">> ERROR: QR invalido");
        setPairingState({ phase: "error", error: "QR invalido" });
        return;
      }

      const req = parsed as PairingRequest;
      const id = await loadIdentity();
      if (!id) {
        setStatus(">> ERROR: No hay identidad en este dispositivo");
        setPairingState({ phase: "error", error: "Sin identidad" });
        return;
      }

      setPairingState({ phase: "pairing" });
      setStatus(">> Emparejando...");

      const response = await createPairingResponse(
        req,
        id.publicKeyJwk,
        id.privateKeyJwk,
        id.usuarioId,
        "PC"
      );

      const relayId = req.challenge.slice(0, 8);
      await sendRelayMessage(relayId, "pair_res", response);

      setStatus(">> Dispositivo emparejado!");
      setPairingState({ phase: "done" });
      setTimeout(() => {
        setPairingState({ phase: "idle" });
        setMode("select");
        setStatus("");
      }, 2000);
    },
    [setPairingState]
  );

  const handleScanError = useCallback(
    (error: string) => {
      setStatus(`>> ERROR: ${error}`);
      setPairingState({ phase: "error", error });
    },
    [setPairingState]
  );

  if (loading || !PAIRING_ENABLED) {
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

        <div className="text-center space-y-1">
          <p className="text-sm text-[#505070] font-mono">
            &gt;&gt;{" "}
            {mode === "select"
              ? "Empareja este dispositivo"
              : mode === "show_qr"
              ? "Escanea el QR desde tu otro dispositivo"
              : "Escanea el QR del otro dispositivo"}
          </p>
        </div>

        {mode === "select" && (
          <div className="flex flex-col gap-4 w-full">
            <CyberButton onClick={handleShowQr} variant="primary">
              Mostrar QR para emparejar
            </CyberButton>
            <CyberButton onClick={() => setMode("scan_qr")} variant="secondary">
              Escanear QR
            </CyberButton>
            <CyberButton onClick={() => router.push("/dashboard")} variant="ghost">
              Cancelar
            </CyberButton>
            {status && (
              <p className="text-xs text-center font-mono text-[#505070]">{status}</p>
            )}
          </div>
        )}

        {mode === "show_qr" && pairReq && (
          <div className="flex flex-col items-center gap-4">
            <QrDisplay
              data={JSON.stringify(pairReq)}
              label="QR de emparejamiento"
              countdown={60}
              onExpire={() => {
                setMode("select");
                setStatus(">> QR expirado");
              }}
            />
            {status && (
              <p className="text-xs font-mono text-[#00ff88]">{status}</p>
            )}
            <button
              onClick={() => setMode("select")}
              className="text-xs font-mono text-[#505070] hover:text-[#00d4ff] underline underline-offset-2 transition"
            >
              Cancelar
            </button>
          </div>
        )}

        {mode === "scan_qr" && (
          <div className="flex flex-col items-center gap-4">
            <QrScanner
              onScan={handleScanQr}
              onError={handleScanError}
              label="Escanea el QR del otro dispositivo"
            />
            {status && (
              <p
                className={`text-xs font-mono ${
                  status.includes("ERROR")
                    ? "text-[#ff00ff]"
                    : "text-[#00ff88]"
                }`}
              >
                {status}
              </p>
            )}
            <button
              onClick={() => setMode("select")}
              className="text-xs font-mono text-[#505070] hover:text-[#00d4ff] underline underline-offset-2 transition"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
