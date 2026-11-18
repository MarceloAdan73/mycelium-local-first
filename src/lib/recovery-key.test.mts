import test from "node:test"
import assert from "node:assert/strict"
import {
  packRecoveryKey,
  unpackRecoveryKey,
  exportRecoveryKey,
  parseRecoveryKey,
  type IdentityData,
} from "./recovery-key.ts"

const FIXTURE_D = "AE9GdSe2ZjPD4FTuboIi7Rp3NTaw04BHWrTsRcX7S88"
const FIXTURE_X = "xpYNRebfge0GhwYXsGrH3-tO0jLqwSIPSG-dV86sZkc"
const FIXTURE_UID = "mc_6f0c9474e5f0f32c"

const privateKeyJwk = {
  crv: "Ed25519",
  d: FIXTURE_D,
  key_ops: ["sign"],
  kty: "OKP",
  x: FIXTURE_X,
} as JsonWebKey

const publicKeyJwk = {
  crv: "Ed25519",
  key_ops: ["verify"],
  kty: "OKP",
  x: FIXTURE_X,
} as JsonWebKey

const identity: IdentityData = {
  usuarioId: FIXTURE_UID,
  publicKeyJwk,
  privateKeyJwk,
  deviceName: "PC",
  createdAt: "2026-09-26T01:02:03.456Z",
}

function pack(): string {
  const key = packRecoveryKey(FIXTURE_UID, privateKeyJwk, publicKeyJwk)
  assert.ok(key, "packRecoveryKey deberia devolver una clave")
  return key
}

test("la clave empaquetada es mucho mas corta que el JSON crudo", () => {
  const key = pack()
  assert.equal(key.split("-")[0], "MYC1")
  assert.ok(key.length < 160, `esperaba menos de 160 chars, hubo ${key.length}`)
  assert.ok(btoa(JSON.stringify(identity)).length > key.length)
})

test("round-trip preserva usuarioId, d y x exactos", () => {
  const packed = unpackRecoveryKey(pack())
  assert.ok(packed)
  assert.equal(packed.usuarioId, FIXTURE_UID)
  assert.equal(packed.privateKeyJwk.d, FIXTURE_D)
  assert.equal(packed.privateKeyJwk.x, FIXTURE_X)
  assert.equal(packed.publicKeyJwk.x, FIXTURE_X)
  assert.equal(packed.privateKeyJwk.crv, "Ed25519")
  assert.equal(packed.privateKeyJwk.kty, "OKP")
})

test("la clave reconstruida firma y verifica con WebCrypto", async () => {
  const packed = unpackRecoveryKey(pack())
  assert.ok(packed)

  const algorithm = { name: "Ed25519" } as EcKeyGenParams
  const priv = await crypto.subtle.importKey("jwk", packed.privateKeyJwk, algorithm, false, ["sign"])
  const pub = await crypto.subtle.importKey("jwk", packed.publicKeyJwk, algorithm, false, ["verify"])

  const challenge = new TextEncoder().encode("mycelium-recovery-check")
  const signature = await crypto.subtle.sign(algorithm, priv, challenge)
  assert.equal(await crypto.subtle.verify(algorithm, pub, signature, challenge), true)

  const other = await crypto.subtle.sign(algorithm, priv, new TextEncoder().encode("otro"))
  assert.equal(await crypto.subtle.verify(algorithm, pub, other, challenge), false)
})

test("tolera minusculas, espacios y guiones extra al pegar", () => {
  const messy = "  " + pack().toLowerCase().replace(/-/g, " - ") + "  "
  const packed = unpackRecoveryKey(messy)
  assert.ok(packed)
  assert.equal(packed.usuarioId, FIXTURE_UID)
  assert.equal(packed.privateKeyJwk.d, FIXTURE_D)
})

test("rechaza un solo caracter corrupto", () => {
  const body = pack().slice("MYC1-".length)
  const pos = 10
  const swapped = body[pos] === "Z" ? "Y" : "Z"
  const broken = "MYC1-" + body.slice(0, pos) + swapped + body.slice(pos + 1)
  assert.notEqual(broken, pack())
  assert.equal(unpackRecoveryKey(broken), null)
})

test("rechaza la transposicion de dos caracteres adyacentes", () => {
  const body = pack().slice("MYC1-".length)
  const broken = "MYC1-" + body.slice(0, 1) + body[2] + body[1] + body.slice(3)
  assert.notEqual(broken, pack())
  assert.equal(unpackRecoveryKey(broken), null)
})

test("rechaza caracteres ambiguos que no estan en el alfabeto", () => {
  const body = pack().slice("MYC1-".length)
  for (const bad of ["I", "L", "O", "U"]) {
    const broken = "MYC1-" + body.slice(0, 3) + bad + body.slice(4)
    assert.equal(unpackRecoveryKey(broken), null, `deberia rechazar ${bad}`)
  }
})

test("rechaza version desconocida, prefijo ausente y truncado", () => {
  const key = pack()
  assert.equal(unpackRecoveryKey(key.replace("MYC1", "MYC2")), null)
  assert.equal(unpackRecoveryKey(key.slice("MYC1-".length)), null)
  assert.equal(unpackRecoveryKey(key.slice(0, key.length - 6)), null)
  assert.equal(unpackRecoveryKey(""), null)
})

test("rechaza un usuarioId con formato inesperado", () => {
  assert.equal(packRecoveryKey("mc_zzz", privateKeyJwk, publicKeyJwk), null)
  assert.equal(packRecoveryKey("otro_usuario", privateKeyJwk, publicKeyJwk), null)
})

test("exportRecoveryKey usa el formato nuevo y parseRecoveryKey lo restaura", () => {
  const key = exportRecoveryKey(identity)
  assert.ok(key.startsWith("MYC1-"))

  const restored = parseRecoveryKey(key)
  assert.ok(restored)
  assert.equal(restored.usuarioId, FIXTURE_UID)
  assert.equal(restored.privateKeyJwk.d, FIXTURE_D)
  assert.equal(restored.privateKeyJwk.x, FIXTURE_X)
  assert.equal(restored.publicKeyJwk.x, FIXTURE_X)
  assert.equal(exportRecoveryKey(restored), key)
})

test("parseRecoveryKey sigue aceptando el formato legacy en base64", () => {
  const restored = parseRecoveryKey(btoa(JSON.stringify(identity)))
  assert.ok(restored)
  assert.equal(restored.usuarioId, FIXTURE_UID)
  assert.equal(restored.deviceName, "PC")
  assert.equal(restored.createdAt, "2026-09-26T01:02:03.456Z")
})

test("parseRecoveryKey devuelve null ante basura", () => {
  assert.equal(parseRecoveryKey("no soy una clave"), null)
  assert.equal(parseRecoveryKey("MYC1-AAAA"), null)
})
