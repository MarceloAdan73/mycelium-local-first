"use client";

import { useEffect, useRef, useState } from "react";
import { generateQrDataUrl } from "@/lib/qr";

type Props = {
  data: string;
  label?: string;
  countdown?: number;
  onExpire?: () => void;
};

export default function QrDisplay({ data, label, countdown, onExpire }: Props) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(countdown ?? 60);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    generateQrDataUrl(data).then((url) => {
      if (mountedRef.current) setQrUrl(url);
    });
    return () => { mountedRef.current = false; };
  }, [data]);

  useEffect(() => {
    if (!countdown || countdown <= 0 || !qrUrl) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown, onExpire, qrUrl]);

  return (
    <div className="flex flex-col items-center gap-4">
      {label && (
        <p className="text-xs font-mono text-[#505070] tracking-wider uppercase">
          &gt;&gt; {label}
        </p>
      )}
      <div className="relative p-4 rounded-2xl glass glow-border">
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrUrl}
            alt="QR Code"
            className="w-64 h-64"
          />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-[#00d4ff] border-t-transparent animate-spin" />
          </div>
        )}
        {countdown && countdown > 0 && (
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#00d4ff] text-[#050508] text-xs font-bold flex items-center justify-center font-mono">
            {timeLeft}
          </div>
        )}
      </div>
    </div>
  );
}
