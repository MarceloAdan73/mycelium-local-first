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
 * pestanas del mismo navegador — nunca entre dos dispositivos reales. Y la
 * clave de recuperacion se trunca a 12 grupos de 4 caracteres, con lo cual es
 * inutilizable para restaurar nada. Reactivar esto requiere transporte real
 * (WebRTC + senalizacion) o un backend, que es el salto de complexity de R5.
 *
 * Para reactivarlo: poner el flag en `true`. No hay que reescribir logica.
 */
export const PAIRING_ENABLED: boolean = false;
