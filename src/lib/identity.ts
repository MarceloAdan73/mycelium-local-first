"use client";

import { storeValue, getValue, deleteValue } from "./db";
import {
  exportRecoveryKey,
  parseRecoveryKey,
  getDefaultDeviceName,
  type IdentityData,
} from "./recovery-key";

export { exportRecoveryKey, parseRecoveryKey, getDefaultDeviceName };
export type { IdentityData };

const IDENTITY_KEY = "identity";

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createIdentity(
  deviceName?: string
): Promise<IdentityData> {
  const algorithm = { name: "Ed25519" } as EcKeyGenParams;
  const keypair = await crypto.subtle.generateKey(algorithm, true, [
    "sign",
    "verify",
  ]);

  const [publicKeyJwk, privateKeyJwk] = await Promise.all([
    crypto.subtle.exportKey("jwk", keypair.publicKey),
    crypto.subtle.exportKey("jwk", keypair.privateKey),
  ]);

  const pubKeyBytes = new TextEncoder().encode(
    JSON.stringify(publicKeyJwk)
  );
  const hash = await crypto.subtle.digest("SHA-256", pubKeyBytes);
  const usuarioId = "mc_" + bufToHex(new Uint8Array(hash)).slice(0, 16);

  const identity: IdentityData = {
    usuarioId,
    publicKeyJwk,
    privateKeyJwk,
    deviceName: deviceName ?? getDefaultDeviceName(),
    createdAt: new Date().toISOString(),
  };

  await storeValue(IDENTITY_KEY, identity);
  return identity;
}

export async function loadIdentity(): Promise<IdentityData | null> {
  return getValue<IdentityData>(IDENTITY_KEY);
}

export async function getIdentityId(): Promise<string | null> {
  const id = await loadIdentity();
  return id?.usuarioId ?? null;
}

export async function deleteIdentity(): Promise<void> {
  await deleteValue(IDENTITY_KEY);
}

export async function signWithIdentity(
  challenge: string,
  privateKeyJwk: JsonWebKey
): Promise<string> {
  const algorithm = { name: "Ed25519" } as EcKeyImportParams;
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    algorithm,
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "Ed25519" } as EcdsaParams,
    privateKey,
    new TextEncoder().encode(challenge)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function importIdentity(
  recoveryKey: string
): Promise<IdentityData | null> {
  const identity = parseRecoveryKey(recoveryKey.trim());
  if (!identity) return null;
  await storeValue(IDENTITY_KEY, identity);
  return identity;
}

export async function verifySignature(
  challenge: string,
  signatureBase64: string,
  publicKeyJwk: JsonWebKey
): Promise<boolean> {
  const algorithm = { name: "Ed25519" } as EcKeyImportParams;
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    publicKeyJwk,
    algorithm,
    false,
    ["verify"]
  );

  const sigBytes = new Uint8Array(
    atob(signatureBase64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  return crypto.subtle.verify(
    { name: "Ed25519" } as EcdsaParams,
    publicKey,
    sigBytes,
    new TextEncoder().encode(challenge)
  );
}
