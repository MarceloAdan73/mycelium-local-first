# MYCELIUM — Decisiones de arquitectura

> Decision log vivo. Cada decisión tiene contexto, decisión, por qué y consecuencias.
> Si el código y este documento difieren, gana el código: se actualiza el doc.

**Última actualización:** 21/11/2026 — cierra el hito 0.5 del `ROADMAP.md`.

---

## Mapa de almacenamiento

| Dato                                  | Almacén                          | Formato                                            | Código                    |
| ------------------------------------- | -------------------------------- | -------------------------------------------------- | ------------------------- |
| Metadata de notas                     | IndexedDB `mycelium-docs` (v2) → store `docs` | `{ id, nombre, updated_at }`, key `id` | `src/lib/doc-store.ts`    |
| Contenido de notas (Yjs)              | IndexedDB `mycelium-docs` (v2) → store `content` | `{ docId, update: Uint8Array }`, index `byDoc` | `src/lib/doc-store.ts` |
| Identidad + flag de recovery          | localStorage con prefijo `mc_`   | JSON                                               | `src/lib/db.ts`           |
| Mensajes del relay (en pausa)         | localStorage con prefijo `mc_`   | JSON                                               | `src/lib/relay.ts`        |

`id` de una nota = `usuarioId::uuid` → el filtro de `listDocs` aísla notas por identidad
(`src/lib/doc-store.ts:59`).

---

## Decisiones

### AD-1 — Documentos en una sola IndexedDB unificada (`mycelium-docs` v2)

**Contexto.** Antes vivían en dos lugares: la DB `y-indexeddb` creaba UNA base por
nota (nombre = `docId`, store `updates`) y la metadata iba en otra DB.

**Decisión.** Una única DB `mycelium-docs` versión 2 con dos stores: `docs`
(metadata) y `content` (log de updates de Yjs, ver AD-2). La dependencia
`y-indexeddb` fue removida de `package.json`.

**Por qué.**
- Borrar una nota, migrar o hacer wipe es una operación acotada a una DB, sin
  recorrer N bases por nota.
- Listar notas no requiere abrir ninguna DB extra.
- Menos superficie para DBs huérfanas (el problema que motivó 0.1).

**Consecuencias.**
- `deleteDoc` borra metadata + content (`clearContent`) y, por si la nota nunca
  migró, también hace `deleteDatabase(docId)` sobre la DB legacy
  (`src/lib/doc-store.ts:90`).
- `clearAll` de identidad borra la DB completa (`src/context/AuthContext.tsx:82`).

---

### AD-2 — Contenido de Yjs: log de updates con append inmediato + compactación

**Decisión.** El contenido NO se guarda como documento plano sino como log de
updates binarios de Yjs:

- Cada update del `ydoc` se appendea inmediatamente al store `content`
  (`appendContentUpdate`, `src/lib/doc-content.ts:97`).
- Cada 20 updates se compacta con debounce de 1 s: se agrega un snapshot
  (`Y.encodeStateAsUpdate`) y se borra el resto del log de esa nota en la misma
  transacción (`compactContent`, `src/lib/doc-store.ts:126`).
- Al desmontar el editor, si quedan updates sin compactar, se hace flush con un
  snapshot de estado completo (`src/lib/doc-content.ts:105`).
- Al abrir el editor se aplican todos los updates del log en orden
  (`loadDocContent`, `src/lib/doc-content.ts:49`). El CRDT converge sin importar
  el orden de aplicación.

**Por qué append-first.** La escritura crítica es el append inmediato: un crash
no pierde nada. La compactación es una optimización de tamaño, no un camino
crítico; si falla o se demora, el log sigue siendo la fuente.

**Consecuencias.**
- Guard contra content huérfano: si la nota se borra con el editor montado, la
  compactación chequea que la metadata siga existiendo antes de escribir
  (`compactIfAlive`, `src/lib/doc-content.ts:81`).
- Migración one-shot desde `y-indexeddb` (ver AD-7).
- Limitación conocida (detectada por el E2E de 0.3 en CI): el append es
  fire-and-forget y el indicador "Guardado (local)" solo refleja estado de UI.
  Si la página se descarga milisegundos después de escribir, el último update
  puede no llegar a commitear. El flush al desmontar mitiga parcialmente (ese
  write corre la misma carrera); un flush en `pagehide` sería el cierre
  robusto — pendiente en 1.5.

---

### AD-3 — localStorage solo para identidad, flags y relay (en pausa)

**Decisión.** localStorage (prefijo `mc_`) guarda solo datos chicos y sincrónicos:
la identidad (`mc_identity`), el flag de recovery pendiente (`mc_recovery`) y el
mensaje del relay (`mc_relay`, en pausa). Los documentos nunca van ahí.

**Por qué.**
- Identidad y flags son JSON chicos que se leen en el primer render: localStorage
  es el camino más simple y sincrónico.
- El contenido de notas es binario, crece sin límite y se escribe por-update:
  localStorage no escala para eso (límites de cuota, serialización costosa).

**Consecuencias.**
- `logout` borra identidad + flag, NO las notas (`src/context/AuthContext.tsx:74`).
- `clearAll` borra todo `mc_*` + la DB unificada (borrado total del dispositivo).

---

### AD-4 — Identidad: Ed25519 (JWK) + recovery key MYC1

**Decisión.**
- La identidad es un par de claves Ed25519 exportadas como JWK.
- `usuarioId` = `mc_` + primeros 16 hex de `SHA-256(JSON de la clave pública)`
  (`src/lib/identity.ts:22`).
- Recovery key `MYC1`: payload de 72 bytes (uid 8B + privada 32B + pública 32B)
  codificado en base32 (alfabeto sin `I L O U`), checksum CRC-32 truncado a 2
  bytes, grupos de 5 separados por guiones (`src/lib/recovery-key.ts`).
- Al importar se acepta también el formato legacy (JSON en base64), para claves
  viejas (`parseRecoveryKey`).

**Consecuencias / amenaza aceptada hoy.** La clave privada descansa en texto
claro en localStorage: quien acceda al perfil del navegador es dueño de la
identidad. Para un local-first single-device es el trade-off deliberado de la
Fase 0; cifrarla es una decisión futura que NO está en el roadmap actual.

---

### AD-5 — Emparejamiento multi-dispositivo: EN PAUSA

**Decisión.** `PAIRING_ENABLED = false` en `src/lib/feature-flags.ts`. El código
del flujo QR (`src/lib/qr.ts`, `src/lib/relay.ts`, componentes y `login`) queda
en el repo pero no se expone en la UI.

**Por qué.** El "relay" actual persiste mensajes en localStorage y usa `storage`
events: solo conecta pestañas del mismo navegador, nunca dos dispositivos reales.
Reactivar requiere transporte real (WebRTC + señalización, o backend): es el
salto de complejidad de la Fase 3 del `ROADMAP.md`.

**Consecuencias.**
- Poner el flag en `true` solo muestra la UI: NO sincroniza dispositivos.
- Hoy la migración de identidad entre dispositivos es la recovery key MYC1
  (exportar → importar → mismo `usuarioId`, notas intactas tras recargar).

---

### AD-6 — Multi-pestana: limitaciones conocidas y aceptadas

**Comportamiento actual.** Cada pestaña appendea sus updates al mismo log; al
recargar, cada una re-aplica el log completo y converge (CRDT). No hay sync en
vivo entre pestañas (no existe BroadcastChannel ni listener de la DB).

**Limitaciones aceptadas.**
- Dos pestañas no ven los cambios de la otra en tiempo real: converge al recargar.
- La lista de notas no se refresca sola si otra pestaña crea/borra.
- Compactación concurrente: dos pestañas pueden compactar a la vez; una puede
  borrar updates que la otra todavía no mergeó. La pestaña viva re-appendea en su
  próximo update o al desmontar (flush con estado completo), así que converge;
  el riesgo residual solo existe si se mata el proceso entre medio.

**Por qué se acepta.** El producto objetivo (hito 0.1 / Fase 0) es un usuario con
una pestaña. El costo de BroadcastChannel es bajo y se evaluará si aparece uso
real multi-pestana.

---

### AD-7 — Migración one-shot desde `y-indexeddb`

**Decisión.** Si el store `content` no tiene updates para una nota y existe una
DB legacy con el mismo nombre que el `docId` (formato de `y-indexeddb`), se
copian sus updates al store unificado y se borra la DB legacy
(`src/lib/doc-content.ts:57`). Si la apertura crea una DB vacía o no es de
y-indexeddb, también se borra.

**Por qué one-shot por nota.** No hay paso de migración global ni versionado de
schema: la primera vez que abrís una nota vieja, se migra. Las notas que nunca
se abran se limpian igual al borrarlas (`deleteDoc`) o con `clearAll`.

---

## Qué cambiaría en Fase 3 (segundo dispositivo)

- Transporte real de sincronización (WebRTC + señalización o backend) reemplaza
  al relay de localStorage; AD-5 se reescribe.
- El log de updates de AD-2 ya es el formato ideal para replicar: se mandan
  updates entre pares y la compactación reduce el volumen.
- La identidad probablemente necesite cifrado en reposo o en movimiento; AD-4
  se revisa con ese requisito.
