import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError, requireRows } from './errors';
import { checkText, fileNameFromPath, isFileSizeOk, normalizeLink, storagePathFor } from './validate';

export const BUCKET = 'drops';
const COLS = 'id,kind,title,url,body,storage_path,size_bytes,created_at';

export type DropKind = 'link' | 'text' | 'file';

export interface Drop {
  id: string;
  kind: DropKind;
  title: string;
  url: string | null;
  body: string | null;
  storage_path: string | null;
  size_bytes: number | null;
  created_at: string;
}

export async function listDrops(db: SupabaseClient): Promise<Drop[]> {
  const { data, error } = await db.from('drops').select(COLS).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Drop[];
}

/** Only the M2proj admin account may add or delete (RLS); everyone can read. */
export async function signInAdmin(db: SupabaseClient, email: string, password: string): Promise<void> {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) throw new AppError('bad-password');
    throw error;
  }
  if (data.user?.app_metadata?.m2proj_role !== 'admin') {
    await db.auth.signOut({ scope: 'local' });
    throw new AppError('not-allowed');
  }
}

export async function isAdmin(db: SupabaseClient): Promise<boolean> {
  const { data } = await db.auth.getSession();
  return data.session?.user.app_metadata?.m2proj_role === 'admin';
}

export async function signOutAdmin(db: SupabaseClient): Promise<void> {
  await db.auth.signOut({ scope: 'local' });
}

async function insertDrop(db: SupabaseClient, row: Partial<Drop>): Promise<Drop> {
  const { data, error } = await db.from('drops').insert(row).select(COLS).single();
  if (error) throw error;
  return data as Drop;
}

export async function addLink(db: SupabaseClient, input: { title: string; url: string }): Promise<Drop> {
  const url = normalizeLink(input.url);
  if (!url) throw new AppError('bad-url');
  return insertDrop(db, { kind: 'link', title: input.title.trim(), url });
}

export async function addText(db: SupabaseClient, input: { title: string; body: string }): Promise<Drop> {
  const problem = checkText(input.body);
  if (problem) throw new AppError(problem);
  return insertDrop(db, { kind: 'text', title: input.title.trim(), body: input.body });
}

export async function addFile(
  db: SupabaseClient,
  input: { title: string; file: Blob; fileName: string },
  id: string = crypto.randomUUID(),
): Promise<Drop> {
  if (!isFileSizeOk(input.file.size)) throw new AppError('too-big');
  const path = storagePathFor(input.fileName, id);
  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(path, input.file, { contentType: input.file.type || 'application/octet-stream', upsert: false });
  if (uploadError) throw uploadError;
  try {
    return await insertDrop(db, { kind: 'file', title: input.title.trim() || input.fileName, storage_path: path, size_bytes: input.file.size });
  } catch (e) {
    await db.storage.from(BUCKET).remove([path]);
    throw e;
  }
}

/** Public bucket: a permanent link that downloads the file under a readable name. */
export function fileUrl(db: SupabaseClient, drop: Drop): string {
  if (!drop.storage_path) return '#';
  return db.storage.from(BUCKET).getPublicUrl(drop.storage_path, { download: fileNameFromPath(drop.storage_path) }).data.publicUrl;
}

/** File first: the bucket is public, so a failed removal must never leave a file online without its entry. */
export async function deleteDrop(db: SupabaseClient, drop: Drop): Promise<void> {
  if (drop.storage_path) {
    const path = drop.storage_path;
    const { data: removed, error: removeError } = await db.storage.from(BUCKET).remove([path]);
    if (removeError) throw removeError;
    if (!removed || removed.length === 0) {
      // Nothing removed: either it is already gone (fine) or we are not allowed (stop, keep the entry).
      const { data: still } = await db.storage.from(BUCKET).list('', { search: path });
      if (still?.some((o) => o.name === path)) throw new AppError('not-allowed');
    }
  }
  const { data, error } = await db.from('drops').delete().eq('id', drop.id).select('id');
  if (error) throw error;
  requireRows(data);
}
