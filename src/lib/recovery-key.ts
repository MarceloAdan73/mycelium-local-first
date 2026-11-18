export type IdentityData = {
  usuarioId: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  deviceName: string;
  createdAt: string;
};

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
const GROUP_SIZE = 5
const VERSION = "MYC1"
const UID_BYTES = 8
const KEY_BYTES = 32
const CHECKSUM_BYTES = 2
const PAYLOAD_BYTES = UID_BYTES + KEY_BYTES * 2

const INDEX: Record<string, number> = {}
for (let i = 0; i < ALPHABET.length; i++) INDEX[ALPHABET[i]] = i

export function getDefaultDeviceName(): string {
  if (typeof navigator === "undefined") return "PC"
  const ua = navigator.userAgent
  if (ua.includes("Android")) return "Android"
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS"
  return "PC"
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0) return null
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function bytesToBase32(bytes: Uint8Array): string {
  let out = ""
  let value = 0
  let bits = 0
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += ALPHABET[(value >>> bits) & 31]
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

function base32ToBytes(str: string): Uint8Array | null {
  const out: number[] = []
  let value = 0
  let bits = 0
  for (const char of str) {
    const digit = INDEX[char]
    if (digit === undefined) return null
    value = (value << 5) | digit
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((value >>> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlToBytes(str: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(str)) return null
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  const padding = (4 - (base64.length % 4)) % 4
  try {
    const binary = atob(base64 + "=".repeat(padding))
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

function checksum(payload: Uint8Array): Uint8Array {
  let crc = 0xffffffff
  for (const byte of payload) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  const value = (crc ^ 0xffffffff) >>> 0
  return new Uint8Array([(value >>> 24) & 0xff, (value >>> 16) & 0xff])
}

function isEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function buildJwk(x: Uint8Array, d?: Uint8Array): JsonWebKey {
  const encodedX = bytesToBase64Url(x)
  if (!d) {
    return { crv: "Ed25519", key_ops: ["verify"], kty: "OKP", x: encodedX }
  }
  return {
    crv: "Ed25519",
    d: bytesToBase64Url(d),
    key_ops: ["sign"],
    kty: "OKP",
    x: encodedX,
  }
}

export function packRecoveryKey(
  usuarioId: string,
  privateKeyJwk: JsonWebKey,
  publicKeyJwk: JsonWebKey
): string | null {
  const match = /^mc_([0-9a-f]{16})$/.exec(usuarioId)
  if (!match) return null

  const uidBytes = hexToBytes(match[1])
  const d = typeof privateKeyJwk.d === "string" ? base64UrlToBytes(privateKeyJwk.d) : null
  const x = typeof publicKeyJwk.x === "string" ? base64UrlToBytes(publicKeyJwk.x) : null
  if (!uidBytes || !d || d.length !== KEY_BYTES || !x || x.length !== KEY_BYTES) return null

  const payload = new Uint8Array(PAYLOAD_BYTES)
  payload.set(uidBytes, 0)
  payload.set(d, UID_BYTES)
  payload.set(x, UID_BYTES + KEY_BYTES)

  const body = bytesToBase32(payload) + bytesToBase32(checksum(payload))
  const groups: string[] = []
  for (let i = 0; i < body.length; i += GROUP_SIZE) {
    groups.push(body.slice(i, i + GROUP_SIZE))
  }
  return VERSION + "-" + groups.join("-")
}

export function unpackRecoveryKey(key: string): IdentityData | null {
  const raw = key.trim().toUpperCase()
  if (!raw.startsWith(VERSION)) return null

  const body = raw.slice(VERSION.length).replace(/[^0-9A-Z]/g, "")
  const dataChars = Math.ceil((PAYLOAD_BYTES * 8) / 5)
  const checkChars = Math.ceil((CHECKSUM_BYTES * 8) / 5)
  if (body.length !== dataChars + checkChars) return null

  const data = base32ToBytes(body.slice(0, dataChars))
  const check = base32ToBytes(body.slice(dataChars))
  if (!data || data.length !== PAYLOAD_BYTES) return null
  if (!check || check.length !== CHECKSUM_BYTES) return null
  if (!isEqual(check, checksum(data))) return null

  const x = data.slice(UID_BYTES + KEY_BYTES)
  const d = data.slice(UID_BYTES, UID_BYTES + KEY_BYTES)

  return {
    usuarioId: "mc_" + bytesToHex(data.slice(0, UID_BYTES)),
    publicKeyJwk: buildJwk(x),
    privateKeyJwk: buildJwk(x, d),
    deviceName: getDefaultDeviceName(),
    createdAt: new Date().toISOString(),
  }
}

function encodeLegacyRecoveryKey(identity: IdentityData): string {
  return btoa(JSON.stringify(identity))
}

function decodeLegacyRecoveryKey(data: string): IdentityData | null {
  try {
    const parsed = JSON.parse(atob(data))
    if (parsed.usuarioId && parsed.publicKeyJwk && parsed.privateKeyJwk) {
      return parsed as IdentityData
    }
    return null
  } catch {
    return null
  }
}

export function exportRecoveryKey(identity: IdentityData): string {
  return (
    packRecoveryKey(identity.usuarioId, identity.privateKeyJwk, identity.publicKeyJwk) ??
    encodeLegacyRecoveryKey(identity)
  )
}

export function parseRecoveryKey(data: string): IdentityData | null {
  const raw = data.trim()
  return unpackRecoveryKey(raw) ?? decodeLegacyRecoveryKey(raw)
}
