# MYCELIUM — Knowledge Web Local-First

> Microdot: editor de notas local-first con identidad criptografica sin passwords.
> Los documentos viven en tu dispositivo. Un dispositivo por diseño (ver Fase 3 de `ROADMAP.md`).

<!-- ORQUESTADOR v1 - lo mantiene el agente de esta area; el central SOLO lo lee -->
## ORQUESTADOR - estado para el agente central
**Actualizado**: 21/11/2026 20:42 - **Estado**: FASE 0 COMPLETA (0.4 cerrado en esta sesion, `10797ce`; 0.3 cerrado run verde `44962662168` `08f17e6`; 0.2 `44961377141`; 0.5 `22b3e0d`; 0.1 `368d07e`; prueba local de Marcelo OK + doble verificacion automatizada; commits de cierre docs 0.3 `4a07cb9` + 0.4 cierre sin pushear)
**Ultimo hito cerrado**: 21/11/2026 - 0.4 del ROADMAP: pre-commit. husky 9 + lint-staged 17, `.husky/pre-commit` corre `pnpm exec lint-staged` → `eslint --fix` sobre `*.{ts,tsx,mts,mjs,cjs,js}` staged; errores no autofixables bloquean el commit; se reinstala solo con `pnpm install` (script `prepare`). Validado con archivo staged real + commits reales. Con esto FASE 0 completa: 0.0-0.5.
**Proximo hito**: merge Fase 0 a `main` (requiere autorizacion explicita de Marcelo; `main` esta 10+ commits atras: unificacion de storage + CI + E2E + docs) → Fase 1 (1.1 busqueda full-text Ctrl+K, 1.2 exportacion, 1.3 preview Markdown, 1.4 renombrar sin doble click, 1.5 UX guardado incl. flush en pagehide, 1.6 escritura incremental Y.Text).
**Vencimientos**: NINGUNO - sin fecha ni evento externo.
**Espera de Marcelo**: autorizar merge de Fase 0 a `main` y pusheo (`main` toca Vercel, requiere visto explicito); o elegir arrancar Fase 1 mientras; visto para pushear commits pendientes a `origin/dev` (`4a07cb9`, `10797ce` + cierre). Annotation actions @v4 sigue pendiente (cosmetica).
**No hacer**: NO mergear a `main` ni pushear `main` sin autorizacion explicita; no poner `PAIRING_ENABLED = true`; no relajar gate de la recovery key; no trabajar ni commitear en `main`; no pushear sin pedido explicito; no deploy a Vercel sin autorizacion.
**Me falta confirmar**: si Marcelo autoriza el merge a `main` de la Fase 0, si pushear los pendientes a `origin/dev`, y si arrancar Fase 1.
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