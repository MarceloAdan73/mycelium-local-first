import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";

/**
 * Tests E2E minimos (hito 0.3):
 *   1. Identidad + recovery key: crear -> exportar -> importar -> mismo usuarioId.
 *   2. Persistencia de notas: crear -> escribir -> recargar -> contenido intacto.
 *
 * El servidor se levanta con `next start` (produccion). Si no hay build previo,
 * se hace `next build` automaticamente antes de arrancar.
 */

const PORT = 3210;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CONTENT_TEXTAREA = 'textarea[aria-label="Contenido de la nota"]';

const ROOT = process.cwd();
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

let server: ChildProcess | null = null;
let browser: Browser | null = null;

function runNext(args: string[]): ChildProcess {
  return spawn(process.execPath, [NEXT_BIN, ...args], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    windowsHide: true,
  });
}

function matarProceso(child: ChildProcess | null): void {
  if (!child || child.exitCode !== null) return;
  try {
    child.kill();
  } catch {
    /* ya muerto */
  }
}

async function esperarServidor(): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok) return;
    } catch {
      /* todavia no responde */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("El servidor no respondio en 120s");
}

async function esperarSalida(child: ChildProcess, ms: number, label: string): Promise<number> {
  const code = await new Promise<number | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    child.once("exit", (c) => {
      clearTimeout(timer);
      resolve(c);
    });
  });
  if (code === null) {
    matarProceso(child);
    throw new Error(`next ${label} no termino en tiempo`);
  }
  return code;
}

before(
  async () => {
    // Build de produccion si falta (BUILD_ID lo genera `next build`).
    if (!existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
      const build = runNext(["build"]);
      const code = await esperarSalida(build, 240_000, "build");
      if (code !== 0) throw new Error("next build fallo");
    }

    server = runNext(["start", "-p", String(PORT)]);
    await esperarServidor();

    browser = await chromium.launch({ headless: true });
  },
  { timeout: 300_000 }
);

after(async () => {
  if (browser) await browser.close().catch(() => {});
  matarProceso(server);
});

/** Crea identidad pasando el gate de la recovery key (copiar + pegar). */
async function crearIdentidad(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto(BASE_URL + "/");

  await page.getByRole("button", { name: "Iniciar Mycelium" }).click();
  const revelar = page.getByRole("button", { name: "Revelar" });
  await revelar.waitFor({ timeout: 15_000 });
  await revelar.click();

  const copiar = page.getByRole("button", { name: "Copiar clave" });
  await copiar.click();
  const key = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(key, /^MYC1-/);

  const confirmar = page.locator('textarea[placeholder^="MYC1"]').first();
  await confirmar.fill(key);

  const continuar = page.getByRole("button", { name: "Ya guarde mi clave" });
  // El click espera la actionabilidad completa: habilitado incluido.
  await continuar.click({ timeout: 10_000 });
  await page.waitForURL("**/dashboard");
  return page;
}

async function leerUsuarioId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("mc_identity");
    if (!raw) throw new Error("mc_identity no existe en localStorage");
    return (JSON.parse(raw) as { usuarioId: string }).usuarioId;
  });
}

test("crear identidad -> exportar clave -> importar -> mismo usuarioId", { timeout: 120_000 }, async () => {
  assert.ok(browser, "el browser no se inicializo");
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  try {
    const page = await crearIdentidad(context);
    const usuarioIdOriginal = await leerUsuarioId(page);
    assert.match(usuarioIdOriginal, /^mc_[0-9a-f]{16}$/);
    const key = await page.evaluate(() => navigator.clipboard.readText());

    await page.getByRole("button", { name: "Cerrar sesion" }).click();
    await page.waitForURL(BASE_URL + "/");

    // La clave viaja por el portapapeles, como lo haria una persona real.
    await page.getByRole("button", { name: "Ya tenes clave? Importala" }).click();
    await page.locator('textarea[placeholder^="MYC1"]').first().fill(key);
    await page.getByRole("button", { name: "Importar identidad" }).click();
    await page.waitForURL("**/dashboard");

    const usuarioIdImportado = await leerUsuarioId(page);
    assert.equal(usuarioIdImportado, usuarioIdOriginal);
  } finally {
    await context.close();
  }
});

test("crear nota -> escribir -> recargar -> contenido intacto", { timeout: 120_000 }, async () => {
  assert.ok(browser, "el browser no se inicializo");
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  try {
    const page = await crearIdentidad(context);

    await page.getByRole("button", { name: "Nuevo documento" }).click();
    const body = page.locator(CONTENT_TEXTAREA);
    await body.waitFor({ timeout: 15_000 });

    const texto = "Nota e2e 0.3\nSegunda linea con contenido persistente.";
    await body.fill(texto);

    // El auto-titulo aparece 600ms despues de escribir; si ya se aplico, los
    // updates del contenido ya estan commiteados en IndexedDB. Sin esta espera
    // el reload puede correr antes del commit y borrar el contenido.
    await page.waitForFunction(
      (esperado) =>
        document.querySelector<HTMLInputElement>('input[aria-label="Titulo de la nota"]')
          ?.value === esperado,
      "Nota e2e 0.3",
      { timeout: 10_000 }
    );

    // Ctrl+S limpia el flag dirty para que el reload no dispare beforeunload.
    await page.keyboard.press("Control+s");
    await page.getByText("Guardado (local)").waitFor({ timeout: 10_000 });

    await page.reload();
    const bodyDespues = page.locator(CONTENT_TEXTAREA);
    await bodyDespues.waitFor({ timeout: 15_000 });
    assert.equal(await bodyDespues.inputValue(), texto);
  } finally {
    await context.close();
  }
});
