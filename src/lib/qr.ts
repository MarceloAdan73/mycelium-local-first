"use client";

import QRCode from "qrcode";
import jsQR from "jsqr";

export type PairingRequest = {
  version: 1;
  type: "pair_req";
  tempPubKeyJwk: JsonWebKey;
  challenge: string;
  deviceName: string;
};

export type PairingResponse = {
  version: 1;
  type: "pair_res";
  identityPubKeyJwk: JsonWebKey;
  usuarioId: string;
  challenge: string;
  signature: string;
  deviceName: string;
};

export async function generateQrDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 400,
    margin: 2,
    color: {
      dark: "#00d4ff",
      light: "#050508",
    },
  });
}

export function generateChallenge(): string {
  const buf = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateTempKeypair(): Promise<CryptoKeyPair> {
  const algorithm = { name: "Ed25519" } as EcKeyGenParams;
  return crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
}

export async function createPairingRequest(
  deviceName: string
): Promise<{ request: PairingRequest; tempKeypair: CryptoKeyPair }> {
  const tempKeypair = await generateTempKeypair();
  const tempPubKeyJwk = await crypto.subtle.exportKey("jwk", tempKeypair.publicKey);
  const challenge = generateChallenge();

  return {
    request: {
      version: 1,
      type: "pair_req",
      tempPubKeyJwk,
      challenge,
      deviceName,
    },
    tempKeypair,
  };
}

export async function createPairingResponse(
  request: PairingRequest,
  identityPubKeyJwk: JsonWebKey,
  identityPrivKeyJwk: JsonWebKey,
  usuarioId: string,
  deviceName: string
): Promise<PairingResponse> {
  const dataToSign = request.tempPubKeyJwk.x + request.challenge;
  const algorithm = { name: "Ed25519" } as EcKeyImportParams;
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    identityPrivKeyJwk,
    algorithm,
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "Ed25519" } as EcdsaParams,
    privateKey,
    new TextEncoder().encode(dataToSign)
  );

  return {
    version: 1,
    type: "pair_res",
    identityPubKeyJwk,
    usuarioId,
    challenge: request.challenge,
    signature: btoa(String.fromCharCode(...new Uint8Array(signature))),
    deviceName,
  };
}

export async function verifyPairingResponse(
  response: PairingResponse,
  originalRequest: PairingRequest
): Promise<boolean> {
  const dataToVerify = originalRequest.tempPubKeyJwk.x + response.challenge;
  const algorithm = { name: "Ed25519" } as EcKeyImportParams;
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    response.identityPubKeyJwk,
    algorithm,
    false,
    ["verify"]
  );

  const sigBytes = new Uint8Array(
    atob(response.signature)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  return crypto.subtle.verify(
    { name: "Ed25519" } as EcdsaParams,
    publicKey,
    sigBytes,
    new TextEncoder().encode(dataToVerify)
  );
}

export function parseQrData(text: string): PairingRequest | PairingResponse | null {
  try {
    const data = JSON.parse(text);
    if (data.version === 1 && data.type) return data;
    return null;
  } catch {
    return null;
  }
}

export async function scanQrFromCamera(
  video: HTMLVideoElement
): Promise<string | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(imageData.data, imageData.width, imageData.height);

  return result?.data ?? null;
}
