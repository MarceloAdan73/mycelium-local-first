"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  createIdentity,
  loadIdentity,
  deleteIdentity,
  type IdentityData,
} from "@/lib/identity";
import { getValue, storeValue, deleteValue, clearStore } from "@/lib/db";

const RECOVERY_FLAG = "recovery_pending";

type PairingState = {
  phase: "idle" | "waiting_qr" | "scanning" | "pairing" | "done" | "error";
  error?: string;
};

type AuthContextType = {
  identity: IdentityData | null;
  loading: boolean;
  unlocked: boolean;
  recoveryPending: boolean;
  acknowledgeRecovery: () => void;
  setIdentity: (id: IdentityData | null) => void;
  pairingState: PairingState;
  setPairingState: (state: PairingState) => void;
  createNewIdentity: (deviceName?: string) => Promise<IdentityData>;
  logout: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<IdentityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [pairingState, setPairingState] = useState<PairingState>({
    phase: "idle",
  });

  useEffect(() => {
    loadIdentity()
      .then(async (id) => {
        if (id) {
          setIdentity(id);
          setRecoveryPending((await getValue<boolean>(RECOVERY_FLAG)) === true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createNewIdentity = useCallback(async (deviceName?: string) => {
    const id = await createIdentity(deviceName);
    setIdentity(id);
    await storeValue(RECOVERY_FLAG, true);
    setRecoveryPending(true);
    return id;
  }, []);

  const acknowledgeRecovery = useCallback(() => {
    setRecoveryPending(false);
    deleteValue(RECOVERY_FLAG).catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    await deleteIdentity();
    await deleteValue(RECOVERY_FLAG).catch(() => {});
    setIdentity(null);
    setRecoveryPending(false);
    setPairingState({ phase: "idle" });
  }, []);

  const clearAll = useCallback(async () => {
    await deleteIdentity();
    await clearStore();
    await deleteValue(RECOVERY_FLAG).catch(() => {});
    try {
      indexedDB.deleteDatabase("mycelium-docs");
    } catch {
      /* noop */
    }
    setIdentity(null);
    setRecoveryPending(false);
    setPairingState({ phase: "idle" });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        identity,
        loading,
        unlocked: identity !== null,
        recoveryPending,
        acknowledgeRecovery,
        setIdentity,
        pairingState,
        setPairingState,
        createNewIdentity,
        logout,
        clearAll,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
