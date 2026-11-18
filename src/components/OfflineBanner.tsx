"use client";

import { useState, useEffect } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    const syncAsync = () => queueMicrotask(sync);
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    syncAsync();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      suppressHydrationWarning
      className="fixed top-0 left-0 right-0 z-[60] bg-[#ff6600]/10 border-b border-[#ff6600]/30 px-4 py-2 text-center"
    >
      <span className="font-mono text-sm text-[#ff6600]">
        &gt;&gt; OFFLINE — Los cambios se guardaran localmente
      </span>
    </div>
  );
}
