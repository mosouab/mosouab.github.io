// Integration check for /repo against the real Supabase project.
// Run: npm run check:drops   (needs .env: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, PUBLIC_ADMIN_EMAIL,
// PUBLIC_TEAM_EMAIL, M2_ADMIN_PASSWORD, M2_TEAM_PASSWORD). Creates and removes its own items.
import { createClient } from '@supabase/supabase-js';
import { addFile, addLink, addText, BUCKET, deleteDrop, fileUrl, listDrops, signInAdmin } from '../src/scripts/repo/drops';
import { toAppError } from '../src/scripts/repo/errors';

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name} in .env`);
    process.exit(2);
  }
  return v;
}
const client = () => createClient(env('PUBLIC_SUPABASE_URL'), env('PUBLIC_SUPABASE_ANON_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });

let failures = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures++;
};
const failsWith = async (fn: () => Promise<unknown>, code?: string) => {
  try {
    await fn();
    return false;
  } catch (e) {
    return code ? toAppError(e).code === code : true;
  }
};

async function main(): Promise<void> {
  const anon = client();
  const team = client();
  const admin = client();

  check('the team password cannot log in to /repo', await failsWith(() => signInAdmin(client(), env('PUBLIC_TEAM_EMAIL'), env('M2_TEAM_PASSWORD')), 'not-allowed'));
  await team.auth.signInWithPassword({ email: env('PUBLIC_TEAM_EMAIL'), password: env('M2_TEAM_PASSWORD') });
  await signInAdmin(admin, env('PUBLIC_ADMIN_EMAIL'), env('M2_ADMIN_PASSWORD'));
  check('a wrong password is reported as such', await failsWith(() => signInAdmin(client(), env('PUBLIC_ADMIN_EMAIL'), 'definitely-wrong'), 'bad-password'));

  check('anyone can read /repo', (await anon.from('drops').select('id').limit(1)).error === null);
  check('anonymous visitors cannot add', (await anon.from('drops').insert({ kind: 'text', body: 'x' })).error !== null);
  check('the team account cannot add', await failsWith(() => addText(team, { title: 'zz', body: 'intruder' })));
  check('the team account cannot upload files', (await team.storage.from(BUCKET).upload(`zz-${Date.now()}.txt`, new Blob(['x']))).error !== null);
  check('the database refuses javascript: links', (await admin.from('drops').insert({ kind: 'link', url: 'javascript:alert(1)' })).error !== null);

  const link = await addLink(admin, { title: 'zz link', url: 'example.org/page' });
  const text = await addText(admin, { title: 'zz text', body: '  ssh mo@lab\n' });
  const content = `bonjour ${Date.now()}`;
  const file = await addFile(admin, { title: '', file: new Blob([content], { type: 'text/plain' }), fileName: 'Compte rendu réunion.txt' });
  const seen = await listDrops(anon);
  check('a visitor sees what the admin added', [link.id, text.id, file.id].every((id) => seen.some((d) => d.id === id)));
  check('links get https:// added', link.url === 'https://example.org/page');
  check('text is kept exactly as typed', text.body === '  ssh mo@lab\n');
  const res = await fetch(fileUrl(anon, file));
  check('a visitor downloads the file without logging in', res.ok && (await res.text()) === content);
  check('the download keeps a readable file name', /Compte-rendu-reunion\.txt/.test(res.headers.get('content-disposition') ?? ''));

  check('the team account cannot delete', await failsWith(() => deleteDrop(team, link), 'not-allowed'));
  for (const d of [link, text, file]) await deleteDrop(admin, d);
  check('the admin deletes items', !(await listDrops(anon)).some((d) => [link.id, text.id, file.id].includes(d.id)));
  check('deleting a file removes it from storage', !(await fetch(fileUrl(anon, file))).ok);

  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error('Crashed:', e);
  process.exit(1);
});
