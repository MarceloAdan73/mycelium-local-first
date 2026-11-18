import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DOC_TITLE,
  TITLE_MAX_LENGTH,
  deriveTitleFromContent,
} from "./title.ts";

test("contenido vacio o solo espacios no genera titulo", () => {
  assert.equal(deriveTitleFromContent(""), null);
  assert.equal(deriveTitleFromContent("\n\n   \n\t"), null);
});

test("usa la primera linea no vacia", () => {
  assert.equal(deriveTitleFromContent("Hola mundo"), "Hola mundo");
  assert.equal(deriveTitleFromContent("\n\n  primera  \nsegunda"), "primera");
  assert.equal(deriveTitleFromContent("corta\nlinea larguisima"), "corta");
});

test("normaliza espacios y recorta extremos", () => {
  assert.equal(deriveTitleFromContent("   con    espacios   internos  "), "con espacios internos");
});

test("recorta a TITLE_MAX_LENGTH con elipsis", () => {
  const largo = "x".repeat(TITLE_MAX_LENGTH + 40);
  const out = deriveTitleFromContent(largo);
  assert.equal(out, "x".repeat(TITLE_MAX_LENGTH - 1) + "…");
  assert.equal(out.length, TITLE_MAX_LENGTH);
});

test("respeta el limite exacto sin agregar elipsis", () => {
  const exacto = "y".repeat(TITLE_MAX_LENGTH);
  assert.equal(deriveTitleFromContent(exacto), exacto);
});

test("el titulo por defecto es el que espera createDoc", () => {
  assert.equal(DEFAULT_DOC_TITLE, "Sin titulo");
});
