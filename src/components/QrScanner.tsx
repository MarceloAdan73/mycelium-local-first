"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { scanQrFromCamera } from "@/lib/qr";

type Props = {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  label?: string;
};

export default function QrScanner({ onScan, onError, label }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setEnabled(true);
      setScanning(true);
    } catch {
      onError?.("No se pudo acceder a la camara");
    }
  }, [onError]);

  const stop = useCallback(() => {
    setScanning(false);
    setEnabled(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  useEffect(() => {
    if (!scanning || !videoRef.current) return;

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current) return;
      const data = await scanQrFromCamera(videoRef.current);
      if (data) {
        stop();
        onScan(data);
      }
    }, 500);

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [scanning, onScan, stop]);

  return (
    <div className="flex flex-col items-center gap-4">
      {label && (
        <p className="text-xs font-mono text-[#505070] tracking-wider uppercase">
          &gt;&gt; {label}
        </p>
      )}
      <div className="relative w-72 h-72 rounded-2xl overflow-hidden border-2 border-[#00d4ff]/50 shadow-[0_0_20px_rgba(0,212,255,0.1)]">
        {!enabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a14] z-10">
            <button
              onClick={start}
              className="px-6 py-3 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/40 text-[#00d4ff] font-mono text-sm tracking-wide hover:bg-[#00d4ff]/20 transition"
            >
              &gt;&gt; Activar camara
            </button>
          </div>
        )}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <div className="absolute inset-0 border-[3px] border-[#00d4ff]/30 rounded-2xl pointer-events-none" />
        <div className="absolute inset-8 border-2 border-[#00d4ff]/60 rounded-xl pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 border border-[#00ff88]/30 rounded-lg" />
        </div>
      </div>
      {enabled && scanning && (
        <p className="text-xs font-mono text-[#00d4ff] animate-pulse">
          &gt;&gt; Escaneando...
        </p>
      )}
    </div>
  );
}
