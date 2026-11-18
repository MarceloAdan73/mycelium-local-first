"use client";

import { storeValue, getValue, deleteValue } from "./db";
import type { PairingRequest, PairingResponse } from "./qr";

const RELAY_KEY = "pairing_relay";

type RelayMessage = {
  id: string;
  type: "pair_req" | "pair_res";
  data: PairingRequest | PairingResponse;
  createdAt: string;
};

const listeners = new Map<string, (msg: RelayMessage) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== "mc_" + RELAY_KEY) return;
    if (!e.newValue) return;
    try {
      const msg = JSON.parse(e.newValue) as RelayMessage;
      const handler = listeners.get(msg.id);
      if (handler) handler(msg);
    } catch {
      /* ignore */
    }
  });
}

export async function sendRelayMessage(
  id: string,
  type: "pair_req" | "pair_res",
  data: PairingRequest | PairingResponse
): Promise<void> {
  const msg: RelayMessage = { id, type, data, createdAt: new Date().toISOString() };
  await storeValue(RELAY_KEY, msg);
}

export async function waitForRelayMessage(
  id: string,
  timeoutMs = 30000
): Promise<RelayMessage | null> {
  const existing = await getValue<RelayMessage>(RELAY_KEY);
  if (existing && existing.id === id) return existing;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      listeners.delete(id);
      resolve(null);
    }, timeoutMs);

    listeners.set(id, (msg) => {
      clearTimeout(timer);
      listeners.delete(id);
      resolve(msg);
    });
  });
}

export async function clearRelayMessage(): Promise<void> {
  await deleteValue(RELAY_KEY);
}
