const PREFIX = "mc_";

export async function storeValue<T>(key: string, value: T): Promise<void> {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    localStorage.removeItem(PREFIX + key);
  }
}

export async function getValue<T>(key: string): Promise<T | null> {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function deleteValue(key: string): Promise<void> {
  localStorage.removeItem(PREFIX + key);
}

export async function clearStore(): Promise<void> {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}
