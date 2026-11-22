# MYCELIUM — Knowledge Web Local-First

> Microdot: editor de notas local-first con identidad criptografica sin passwords.
> Los documentos viven en tu dispositivo. Un dispositivo por diseño (ver Fase 3 de `ROADMAP.md`).

<!-- ORQUESTADOR v1 - lo mantiene el agente de esta area; el central SOLO lo lee -->
## ORQUESTADOR - estado para el agente central
**Actualizado**: 21/11/2026 21:05 - **Estado**: FASE 0 MERGEADA A `main` Y PUSHEADA (merge `c096817`, CI verde en `main` run `44964845405`: e2e 50s + lint-test 30s; Vercel publica `main`). Sesion cerrada 21:05. Dev completa y pusheada.
**Ultimo hito cerrado**: 21/11/2026 - CIERRE DE FASE 0 (0.0-0.5): merge `--no-ff` de `dev` a `main` autorizado por Marcelo tras su prueba local OK + verificacion doble (suite E2E prod 2/2 + sonda sobre dev server 2/2). Fase 0 incluye: toolchain recuperada, storage unificado con migracion, CI (lint+tests), E2E Playwright, pre-commit husky+lint-staged, decision log ARCHITECTURE.md.
**Proximo hito**: Fase 1 (producto): 1.1 busqueda full-text Ctrl+K (la mas pesada, hace falta decidir indice en memoria), 1.2 exportacion MD/txt + zip, 1.3 preview Markdown, 1.4 renombrar sin doble click, 1.5 UX guardado (incl. flush en pagehide por la race detectada en 0.3), 1.6 escritura incremental Y.Text.
**Vencimientos**: NINGUNO - sin fecha ni evento externo.
**Espera de Marcelo**: nada bloqueante; arrancar Fase 1 cuando abra la proxima sesion. Annotation actions @v4 sigue pendiente (cosmetica). `opencode.json` y `generar-transcripcion/` siguen sin trackear (decision: no se versionan).
**No hacer**: no poner `PAIRING_ENABLED = true`; no relajar gate de la recovery key; no trabajar ni commitear en `main` (merges de fase completa con autorizacion); no pushear sin pedido explicito; no deploy a Vercel manual sin autorizacion (main ya despliega automatico).
**Me falta confirmar**: nada; proxima sesion arranca con Fase 1 (preguntar por donde: 1.1 vs 1.4/1.5 rapidos).
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