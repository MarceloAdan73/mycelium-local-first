# MYCELIUM — Roadmap de escalamiento

> **Fuentes de verdad:** roadmap y fases en este archivo; decisiones de
> arquitectura vigentes en `ARCHITECTURE.md` (AD-1 a AD-7). Ante duda sobre el
> estado real, verificar el código antes de afirmar.

Versión 0.2.0 · Noviembre 2026 · Documento vivo: actualizar al cerrar cada hito.

> Última revisión: 21/11/2026 — 0.5 cerrado: decision log de arquitectura en
> `ARCHITECTURE.md` (AD-1 a AD-7). Antes, el mismo día: 0.1 cerrado
> (almacenamiento unificado, migración desde y-indexeddb y verificación E2E
> automatizada, Edge headless 16/16). 18/11/2026: reordenado tras auditoría
> técnica + 0.0 cerrado (`.git` recuperado sobre `origin/dev`, rama `dev` activa).

> Principio rector: la app es local-first. Cada fase tiene que ser desplegable
> sola, sin dejar el producto roto a mitad de camino. "Escalar" acá significa
> más valor para el usuario sin romper la promesa: *sin cuentas, sin servidores
> obligatorios, tus datos son tuyos*.

---

## Visión de 12 meses

Mycelium pasa de "editor de notas local" a "espacio de conocimiento personal
cifrado, con búsqueda, exportación, historial y opción de sincronización real
entre dispositivos del mismo usuario".

---

## FASE 0 — Fundación técnica

> **Regla de release (Marcelo):** nada de `git init`, CI, ni deploy a Vercel hasta que
> Marcelo lo autorice explícitamente. Los hitos que lo requieran quedan como
> "pendientes de autorización" y se ejecutan solo cuando se destrabe.

**Objetivo:** ordenar la base para que las fases siguientes no paguen deuda.
**Orden de ejecución:** 0.0 → 0.1 → 0.5 → (autorización) → 0.2 → 0.3 → 0.4.

- [x] **0.0 Recuperar la toolchain (BLOQUEANTE) — cerrado 18/11/2026.** El working
copy de Dev-Clones había perdido el `.git` y los archivos de configuración
(`package.json`, `tsconfig.json`, `next.config.js`, `eslint.config.mjs`,
`pnpm-lock.yaml`). Se recreó el repo local enganchado a `origin/dev`, se
restauraron los configs desde GitHub y se verificó: `pnpm lint` limpio,
`pnpm test` 18/18 (usa `node --test`, runner nativo de Node) y `pnpm build` OK.
Playwright se instala recién en 0.3.
- [x] **0.1 Unificar almacenamiento de documentos (de verdad) — cerrado 21/11/2026.**
  La DB `mycelium-docs` (v2) guarda metadata y contenido en UNA base: store
  `docs` (metadata) + store `content` (log de updates de Yjs con append
  inmediato y compactación en snapshot). `y-indexeddb` removida de
  `package.json`; migración one-shot por nota desde las DB viejas (se borran al
  terminar). Guard: si una nota se borra con el editor montado, no recrea
  content huérfano. *Verificado:* lint limpio, tests 18/18, build OK y smoke
  E2E automatizado en Edge headless 16/16 (crear → escribir → recargar →
  intacto; borrar metadata + content; migrar nota legacy).
- [x] **0.5 Decisiones de arquitectura en `ARCHITECTURE.md` — cerrado 21/11/2026.**
  Decision log con 7 decisiones (AD-1 a AD-7): IDB unificada para docs,
  localStorage solo para identidad/flags, log de updates de Yjs con append
  inmediato + compactación, PAIRING en pausa, limitaciones multi-pestana
  aceptadas y migración one-shot. Va antes que 0.2/0.3: es barato y fija qué
  testear. *Done:* el decision log existe y el resto del roadmap referencia sus
  decisiones (ver "Fuentes de verdad" arriba).
- [ ] **0.2** Correr linter + tests en CI (GitHub Actions): `pnpm lint` + `pnpm test`.
*Pendiente de autorización de git/CI por Marcelo y de 0.0.* *Done:* PR que rompa
lint o tests no se puede mergear.
- [ ] **0.3** Tests E2E mínimos con Playwright: crear nota → escribir → recargar →
contenido intacto; crear identidad → exportar clave → importar → mismo usuarioId.
*Pendiente de autorización de git/CI por Marcelo y de 0.0.* *Done:* corren en
local/CI en Chromium headless.
- [ ] **0.4** Hook de pre-commit (lint-staged + eslint --fix) para que el repo
no acumule warnings. *Pendiente de autorización de git por Marcelo y de 0.0.*

**Estimación:** 1–2 semanas si la toolchain se recupera rápido; +3–5 días si hay
que reconstruir configs. · **Riesgo:** bajo-medio (0.0 es el único punto duro).

---

## FASE 1 — Producto utilizable a diario

**Objetivo:** que alguien pueda usar Mycelium como su notepad principal.

- [ ] **1.1 Búsqueda full-text.** Índice en memoria al cargar (docs suelen ser
pocos cientos). Ctrl+K para paleta de búsqueda; resultados con título,
snippet y fecha. *Done:* buscar una palabra del contenido filtra y abre
la nota en <300ms con 200 notas.
- [ ] **1.2 Exportación.** Botón por nota: Markdown y .txt. Botón global:
"Exportar todo" (zip o carpeta con un .md por nota + `manifest.json`).
*Done:* un export se reimporta como texto idéntico (fidelidad round-trip).
- [ ] **1.3 Markdown básico en el editor.** Preview toggle (⌘/Ctrl+E o botón).
No tocar el Y.Text: el preview se deriva del mismo string. Empezar con:
headers, bold/italic, listas, code fences, links.
- [ ] **1.4 Renombrar sin doble click.** Botón contextual por item en la
sidebar (hoy solo doble click, no es descubrible). Doble click sigue
funcionando.
- [ ] **1.5 Detalles de UX.** Contador de notas en el sidebar, orden por
última edición (ya está por updated_at; verificar que el editor lo
actualice al escribir), indicador de guardado más claro.
- [ ] **1.6 Escritura incremental del Y.Text.** Hoy `Editor.tsx` reemplaza todo
el texto en cada tecla (`delete(0, len)` + `insert(0, value)`): funciona para una
persona, pero produce merges feos. Pasar a operaciones incrementales. No bloquea
Fase 1, pero es precondición de Fase 3.

**Estimación:** 3–4 semanas (+2–3 días por 1.6). · **Riesgo:** bajo. · **Nota:**
1.1 y 1.2 son las que más pesan; si se achica la fase, que sea acá.

---

## FASE 2 — Confianza y control de datos

**Objetivo:** que perder el navegador no signifique perder nada, y que nadie
que toque el dispositivo lea las notas.

**Orden sugerido:** 2.2 → 2.1 → 2.4 → 2.5 → spike de 2.3.

- [ ] **2.2 Bloqueo por inactividad.** Si no hay interacción en N minutos (default
15, configurable), la sesión se bloquea: blur + pedir re-ingreso. Hoy
cualquiera con el navegador abierto lee todo; esto cierra ese hueco. Va primero
porque reduce el riesgo que 2.3 pretendía cubrir.
- [ ] **2.1 Papelera / historial.** Al borrar, la nota va a "Papelera" por 30
días (campo `deleted_at` en el doc, no delete físico). Restaurar desde
papelera. Vaciar papelera = delete real. La decision de donde viven metadata y
contenido queda fijada en 0.1 y `ARCHITECTURE.md`.
- [ ] **2.4 Autoguardado visible.** El ">> Sin guardar" de hoy es confuso: Yjs
persiste en vivo. Reemplazar por timestamp de última edición.
- [ ] **2.5 Backup automático local.** Descargar silencioso de un .zip semanal
(File System Access API donde exista — Chrome/Edge; descarga manual como fallback).
- [ ] **2.3 Cifrado en reposo del contenido (DIFERIDO / spike).**
Passphrase opcional → PBKDF2/Argon2 → AES-GCM sobre el Y.Doc antes de
IDB. El Yjs sigue operando en memoria; lo cifrado es lo persistido.
*Decisión:* spike de 1 semana recién después de cerrar 2.2. Si el bloqueo ya
cubre el perfil de riesgo, se posterga a Fase 4 y se anota en `ARCHITECTURE.md`.

**Estimación:** 3–5 semanas sin 2.3. · **Riesgo:** medio; 2.3 es el único
"opcional" y no tiene fecha comprometida hasta después del spike.

---

## FASE 3 — Segundo dispositivo (decisión de negocio)

**Objetivo:** misma identidad en 2+ dispositivos con sincronización real.
**Punto de no retorno de arquitectura: elegir UN camino antes de escribir código.**

> **Precondiciones (no negociables):** Fase 1 cerrada (regla 5), 1.6 resuelto y
> `relay.ts` reemplazado: hoy usa `storage events`, que solo conecta pestañas del
> mismo navegador — no es transporte entre dispositivos. El código de pairing de
> `PAIRING_ENABLED` es un stub, no una base de sync.

- [ ] **3.0 Spike de decisión (1–2 semanas).** Probar de punta a punta:
**(A) WebRTC + signaling** (y-webrtc): sin backend, P2P, conexión directa
cuando ambos dispositivos están online; degradación = no sincroniza.
**(B) Backend ligero** (Supabase está en el backlog): sincronización
garante, historial central, compartir. Rompe "sin servidores" salvo que
sea self-hosted.
Criterio: ¿cuántos usuarios reales necesitan sync > 2 dispositivos?
Si <50: camino A. Si se busca crecer con sync: camino B.
- [ ] **3.1 Implementar el elegido.** El 70% del merge existe SOLO en el CRDT
(Yjs); lo demás es nuevo: handshake (la identidad Ed25519 ya firma — reusar
`qr.ts`), canal de transporte real, signaling si es WebRTC, y resolución de
"dispositivo huérfano".
- [ ] **3.2 UI de dispositivos.** Lista de dispositivos emparejados, revocar
uno, ver última sync de cada uno.
- [ ] **3.3 Conflictos visibles.** Cuando el merge no es trivial (edición
simultánea offline en dos dispositivos), mostrar diff por bloque.

**Estimación:** 6–10 semanas según camino (4–8 solo si ya hay experiencia previa
con WebRTC/signaling). · **Riesgo:** alto. · El pairing por QR
(`PAIRING_ENABLED`) se reactiva acá, con transporte real.

---

## FASE 4 — Crecimiento y ecosistema

**Objetivo:** pasar de app personal a producto.

- [ ] **4.1 Empaquetado nativo.** Tauri (desktop) o Capacitor (mobile).
El PWA ya está; esto amplía instalación y acceso a sistema de archivos.
- [ ] **4.2 Compartir por enlace.** Nota pública firmada con Ed25519 → link
verificable `mycelium.app/n/{usuarioId}/{hash}`. Lectura pública, sin
cuentas para quien recibe.
- [ ] **4.3 Estructura de conocimiento.** Tags o wikilinks `[[nota]]` con
backlinks en la sidebar. Mycelium deja de ser bloc y pasa a ser red.
- [ ] **4.4 API pública de identidad.** Firmar mensajes / verificar firmas
con el `mc_` ID (reusar `signWithIdentity`/`verifySignature`, ya están).
- [ ] **4.5 Onboarding y feedback.** Tour de 3 pasos al crear identidad,
canal de reporte de bugs sin cuenta.
- [ ] **4.6 Cifrado en reposo (si 2.3 se difirió).** Retomar el spike una vez
cerrada Fase 2 y con la decisión escrita en `ARCHITECTURE.md`.

**Estimación:** rolling, 1 hito por iteración. · **Riesgo:** medio, depende de
adopción real de la Fase 1–3.

---

## Reglas del roadmap

1. **Git/CI/deploy solo con autorización explícita de Marcelo.** Todo el trabajo
   se hace sobre la rama `dev` (nunca en `main`); cada cambio se prueba en
   local (`pnpm lint` + `pnpm test` + `pnpm build`) antes de pushear o pedir
   aprobación, y `main` solo recibe fases completas con autorización explícita.
2. **Ningún hito desde 0.2 arranca sin 0.0 cerrada:** no se da por done lo que no
   se puede correr ni verificar.
3. Cada fase se mergea completa o no se mergea: nada de medias fases en `main`.
4. Al cerrar un hito: actualizar este archivo (fecha, estado) y el bloque
   ORQUESTADOR de AGENTS.md.
5. Nada de Fase 3 hasta cerrar Fase 1: sync sobre un producto flojo es
   complejidad regalada. Tampoco sin 1.6 y sin reemplazar `relay.ts`.
6. **2.3 no se fecha:** spike posterior a 2.2, y su decisión se escribe en
   `ARCHITECTURE.md`.
7. Cualquier cosa que requiera servidor se documenta con su alternativa
   self-hosted antes de aceptarse (promesa local-first).
8. `PAIRING_ENABLED` sigue en `false` hasta la Fase 3.0, que define el
   transporte real.

## Qué NO está en el roadmap (decidido)

- No colaboración multi-usuario en tiempo real (out of scope; Yjs lo permite
pero es otro producto).
- No marketplace de plantillas/plugins hasta Fase 4 con tracción.
- No cambio de editor (el textarea+Y.Text funciona; markdown preview es el
techo por ahora, un editor rich-text como TipTap se evalúa en Fase 4 si
los usuarios lo piden).
