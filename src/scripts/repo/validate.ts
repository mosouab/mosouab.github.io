export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_TEXT_CHARS = 20000;

export function isFileSizeOk(bytes: number): boolean {
  return bytes <= MAX_FILE_BYTES;
}

/** Text is kept exactly as typed (snippets, commands); only empty or oversized text is refused. */
export function checkText(body: string): 'empty' | 'too-long' | null {
  if (!body.trim()) return 'empty';
  if (body.length > MAX_TEXT_CHARS) return 'too-long';
  return null;
}

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** A clean http(s) URL, adding https:// when the scheme is missing, or null if it is not a link. */
export function normalizeLink(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const candidate = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.href;
  } catch {
    return null;
  }
}

function cleanPart(s: string): string {
  return s
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** ASCII-only, Storage-safe file name that keeps the extension. */
export function sanitizeFileName(name: string): string {
  const ascii = name.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const dot = ascii.lastIndexOf('.');
  const stem = cleanPart(dot > 0 ? ascii.slice(0, dot) : ascii).slice(0, 90) || 'file';
  const ext = cleanPart(dot > 0 ? ascii.slice(dot + 1) : '').slice(0, 10);
  return ext ? `${stem}.${ext}` : stem;
}

export function storagePathFor(fileName: string, uuid: string): string {
  return `${uuid}-${sanitizeFileName(fileName)}`;
}

const UUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;

export function fileNameFromPath(path: string): string {
  return path.replace(UUID_PREFIX, '');
}
