/**
 * Feature flags del producto.
 *
 * PAIRING_ENABLED = false
 * ----------------------
 * El emparejamiento multi-dispositivo por QR esta EN PAUSA. El flujo completo
 * (src/app/login/page.tsx, src/components/QrDisplay.tsx, QrScanner.tsx,
 * RecoveryKeyDisplay.tsx) y su logica (src/lib/qr.ts, src/lib/relay.ts) siguen
 * en el repo, pero no se exponen en la UI.
 *
 * Motivo: el "relay" actual usa storage events, que solo funcionan entre
 * pestanas del mismo navegador — nunca entre dos dispositivos reales.
 * Reactivar esto requiere transporte real (WebRTC + senalizacion) o un backend,
 * que es el salto de complejidad de la siguiente fase.
 *
 * Poner el flag en `true` solo expone la UI: NO habilita sincronizacion entre
 * dispositivos. La recovery key (MYC1) funciona por separado, verificada en
 * src/lib/recovery-key.test.mts.
 */
export const PAIRING_ENABLED: boolean = false;
