# MYCELIUM — Knowledge Web Local-First

> Microdot: editor de notas local-first con identidad criptografica sin passwords.
> Los documentos viven en tu dispositivo. Un dispositivo por diseño (ver Fase 3 de `ROADMAP.md`).

<!-- ORQUESTADOR v1 - lo mantiene el agente de esta area; el central SOLO lo lee -->
## ORQUESTADOR - estado para el agente central
**Actualizado**: 21/11/2026 17:31 - **Estado**: EN DESARROLLO (0.1 cerrado; commits pusheados a `origin/dev`; ROADMAP.md y AGENTS.md versionados en `dev`; sesion cerrada a las 17:31, la proxima sesion arranca con 0.5)
**Ultimo hito cerrado**: 21/11/2026 - 0.1 del ROADMAP: almacenamiento unificado. La DB `mycelium-docs` (v2) guarda metadata + contenido en una sola base: store `docs` + store `content` (log de updates de Yjs, append inmediato + compactacion en snapshot). Migracion one-shot por nota desde las DB de y-indexeddb (se borran al migrar); dependencia `y-indexeddb` removida; guard contra content huerfano al borrar con editor montado. Verificado: `pnpm lint` limpio, `pnpm test` 18/18, `pnpm build` OK y smoke E2E automatizado en Edge headless con playwright-core 16/16 (crear→escribir→recargar→intacto, borrado limpio, migracion legacy). `playwright-core` quedo como devDependency (base para 0.3).
**Proximo hito**: 0.5 `ARCHITECTURE.md` (decision log: IDB unificada para docs, localStorage para identidad/flags, formato del store content, limitaciones multi-pestana conocidas) → 0.2 CI, 0.3 E2E Playwright, 0.4 pre-commit (requieren autorizacion explicita de git/CI) → Fase 1 (busqueda full-text, exportacion, preview Markdown).
**Vencimientos**: NINGUNO - sin fecha ni evento externo.
**Espera de Marcelo**: autorizar CI/pre-commit/E2E y definir que arrancar despues de 0.5. `opencode.json` y `generar-transcripcion/` siguen sin trackear (decision: no se versionan).
**No hacer**: no poner `PAIRING_ENABLED = true`; no relajar gate de la recovery key; no trabajar ni commitear en `main`; no mergear a `main` sin fase completa; no pushear sin pedido explicito; no deploy a Vercel sin autorizacion.
**Me falta confirmar**: que hito arrancar tras cerrar 0.5 (0.2/0.3/0.4 vs Fase 1).
<!-- FIN ORQUESTADOR -->

## 🛡️ GUARDIÁN DE TOKENS (Reglas de Eficiencia)
Estas reglas son de máxima prioridad y se aplican a TODA interacción.

1. **Alerta de contexto:** Si la sesión lleva más de 8 turnos sobre el mismo tema, avisá: "💡 *Sugerencia: Para ahorrar tokens, usá `/new` si vamos a cambiar de tema.*"
2. **Alerta de prompt:** Si Marcelo pega un texto muy largo (más de 500 palabras), decí: "⚠️ *Estás pegando mucho texto. Para cuidar tu cuota, copiá solo la parte relevante.*"
3. **Cero búsquedas web:** No uses `webfetch` ni `websearch` a menos que se te pida explícitamente.
4. **Respuestas concisas:** No repitas la pregunta. Ve directo al concepto. Usá viñetas si ayuda a ahorrar palabras.

## Cierre de sesion (automatico — instalado 13/10/2026)

Cuando Marcelo diga "terminamos esta sesion por hoy", "terminamos" o "termine",
actualizá vos mismo el bloque ORQUESTADOR de este archivo con el estado REAL de
la sesion: `Actualizado` con fecha y hora de ahora, `Estado`, `Ultimo hito
cerrado`, `Proximo hito`, `Vencimientos`, `Espera de Marcelo`, `No hacer`,
`Me falta confirmar`. Solo este archivo: el orquestador central SOLO lo lee.
`Actualizado` es el reloj: cuerpo editado sin tocarla = bloque desactualizado.

## Alcance actual (importante)

Mycelium hoy es un **editor de notas local**: crear, editar, renombrar, borrar y
titulo automatico. Todo 100% en el dispositivo, sin cuentas ni servidores.

**Emparejamiento multi-dispositivo por QR: EN PAUSA.**
El codigo sigue en el repo pero **no se expone en la UI** (ver
`src/lib/feature-flags.ts`, `PAIRING_ENABLED = false`). Motivo: el relay
usa `storage events`, que solo conecta pestanas del mismo navegador — nunca dos
dispositivos reales. Reactivarlo requiere transporte real (WebRTC + senalizacion
o backend), que es el salto de complejidad de la Fase 3 del `ROADMAP.md`. Poner
el flag en `true` solo muestra la UI: NO habilita sincronizacion entre dispositivos.

La **recovery key si esta expuesta y funciona** (crear → exportar → importar →
mismo `usuarioId` + notas intactas; verificado con `pnpm test`, 18/18). Solo el
emparejamiento por QR esta en pausa.

## Reglas de este espacio

1. **REGLA CRÍTICA DE TOKENS:** El detalle historico y las convenciones de codigo **NO viven en este archivo**. No existe `DETALLE_MYCELIUM.md`: no lo busques. Para el día a día alcanzan el bloque ORQUESTADOR, este archivo y `ROADMAP.md`. Si hace falta historial viejo, se consulta el git del repo bajo demanda.
2. No commitear, pushear ni desplegar sin pedido explícito. El `git init` local del 18/11/2026 ya fue autorizado; el deploy a Vercel sigue requiriendo autorización.
3. No poner `PAIRING_ENABLED = true` sin pedido explícito.
4. No relajar el gate de la recovery key sin que lo pida.
5. Todo en español, voseo rioplatense (textos de UI y agentes).
6. **Fuentes de verdad:** roadmap y fases en `ROADMAP.md`; estado actual en el bloque ORQUESTADOR; stack y comandos en `package.json`. Ante duda sobre el estado real, verificar el código antes de afirmar.
7. **Flujo de trabajo (Marcelo 18/11/2026):** `main` es la versión publicada (GitHub/Vercel) y no se toca. Todo lo que hagamos es en local, sobre la rama `dev`. Nunca trabajar, commitear ni pushear directo en `main` sin fase completa y autorización explícita.
8. **Ruta del repo:** el `.git` vive en la raíz del workspace (`Mycelium/`); todo —app, docs y configs— está al mismo nivel. Los comandos `git` se corren directamente en esa carpeta. `AGENTS.md` y `ROADMAP.md` se versionan en `dev` (desde el 21/11/2026); `opencode.json` y `generar-transcripcion/` siguen sin trackear (decisión de Marcelo: no se versionan).