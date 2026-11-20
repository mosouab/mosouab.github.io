export type ErrorCode = 'bad-password' | 'not-allowed' | 'bad-url' | 'too-big' | 'empty' | 'too-long' | 'network' | 'unknown';

export const MESSAGES: Record<ErrorCode, string> = {
  'bad-password': 'Wrong password.',
  'not-allowed': 'Only the admin can do that. Log in again.',
  'bad-url': 'That does not look like a link.',
  'too-big': 'File too big (50 MB max).',
  empty: 'Nothing to add.',
  'too-long': 'Text too long (20,000 characters max).',
  network: 'Connection problem. Try again.',
  unknown: 'Something went wrong. Try again.',
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }
}

export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  const err = (e ?? {}) as { code?: unknown; status?: unknown; message?: unknown };
  const message = String(err.message ?? '');
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) return new AppError('network', message);
  if (String(err.code) === '42501' || Number(err.status) === 401 || Number(err.status) === 403 || /row-level security|jwt/i.test(message)) {
    return new AppError('not-allowed', message);
  }
  return new AppError('unknown', message);
}

/** RLS makes a forbidden DELETE affect 0 rows without an error. */
export function requireRows<T>(data: T[] | null): T[] {
  if (!data || data.length === 0) throw new AppError('not-allowed');
  return data;
}
