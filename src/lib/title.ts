/** Titulo por defecto de una nota recien creada. */
export const DEFAULT_DOC_TITLE = "Sin titulo";

/** Longitud maxima del titulo derivado del contenido. */
export const TITLE_MAX_LENGTH = 60;

/**
 * Deriva un titulo a partir del contenido de la nota: primera linea no vacia,
 * con espacios normalizados y recortada a TITLE_MAX_LENGTH.
 * Devuelve null si no hay nada usable.
 */
export function deriveTitleFromContent(content: string): string | null {
  const line = content.split(/\r?\n/).find((l) => l.trim().length > 0);
  if (!line) return null;

  const normalized = line.trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  if (normalized.length <= TITLE_MAX_LENGTH) return normalized;

  return `${normalized.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`;
}
