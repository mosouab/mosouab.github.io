import type { SupabaseClient } from '@supabase/supabase-js';
import { ADMIN_EMAIL, makeClient } from './client';
import { h } from './dom';
import { addFile, addLink, addText, deleteDrop, type Drop, type DropKind, fileUrl, isAdmin, listDrops, signInAdmin, signOutAdmin } from './drops';
import { MESSAGES, toAppError } from './errors';
import { isFileSizeOk } from './validate';
import { renderDrops } from './view';

const listEl = document.getElementById('drops') as HTMLElement;
const toolsEl = document.getElementById('repo-tools') as HTMLElement;
const statusEl = document.getElementById('repo-status') as HTMLElement;

let admin = false;
let drops: Drop[] = [];

function say(message: string, kind: 'info' | 'error' = 'info'): void {
  statusEl.textContent = message;
  statusEl.className = `repo-status ${kind}`;
  if (kind === 'info' && message) setTimeout(() => statusEl.textContent === message && (statusEl.textContent = ''), 3000);
}

async function attempt<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    console.error(e);
    const err = toAppError(e);
    say(MESSAGES[err.code], 'error');
    return { ok: false };
  }
}

/** Clipboard API first; school PCs sometimes block it, so fall back to a selected textarea. */
async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;opacity:0' }, text);
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

function main(db: SupabaseClient): void {
  const render = () => {
    renderDrops(listEl, {
      drops,
      admin,
      fileUrl: (d) => fileUrl(db, d),
      onCopy: copy,
      onDelete: async (d) => {
        const r = await attempt(() => deleteDrop(db, d));
        if (r.ok) say('Deleted.');
        await load();
      },
    });
  };

  const load = async () => {
    const r = await attempt(() => listDrops(db));
    if (r.ok) drops = r.value;
    render();
  };

  const loginForm = (): HTMLElement => {
    const password = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Admin password', 'aria-label': 'Admin password', required: true });
    const submit = h('button', { class: 'btn small', type: 'submit' }, 'Log in');
    const form = h(
      'form',
      {
        class: 'repo-form inline',
        onsubmit: async (e: Event) => {
          e.preventDefault();
          submit.disabled = true;
          const r = await attempt(() => signInAdmin(db, ADMIN_EMAIL, password.value));
          submit.disabled = false;
          if (!r.ok) return password.select();
          admin = true;
          say('Logged in until you close this tab.');
          tools();
          render();
        },
      },
      password,
      submit,
      h('button', { class: 'btn ghost small', type: 'button', onclick: () => tools() }, 'Cancel'),
    );
    setTimeout(() => password.focus(), 0);
    return form;
  };

  const addForm = (): HTMLElement => {
    let kind: DropKind = 'link';
    const title = h('input', { type: 'text', placeholder: 'Title (optional)', 'aria-label': 'Title', maxlength: 200 });
    const url = h('input', { type: 'text', inputmode: 'url', placeholder: 'https://…', 'aria-label': 'Link' });
    const body = h('textarea', { rows: 6, placeholder: 'Text to copy on the other computer', 'aria-label': 'Text', maxlength: 20000 });
    const file = h('input', { type: 'file', 'aria-label': 'File (max 50 MB)' });
    const fields: Record<DropKind, HTMLElement> = { link: url, text: body, file };
    const tabs = (Object.keys(fields) as DropKind[]).map((k) =>
      h('button', { type: 'button', class: k === kind ? 'seg-btn active' : 'seg-btn', onclick: () => setKind(k) }, k),
    );
    const setKind = (next: DropKind) => {
      kind = next;
      tabs.forEach((b) => b.classList.toggle('active', b.textContent === next));
      for (const [k, el] of Object.entries(fields)) el.hidden = k !== next;
    };
    setKind('link');
    const submit = h('button', { class: 'btn small', type: 'submit' }, 'Add');
    const form = h(
      'form',
      {
        class: 'repo-form',
        onsubmit: async (e: Event) => {
          e.preventDefault();
          const picked = file.files?.[0];
          if (kind === 'file' && !picked) return say('Choose a file first.', 'error');
          if (kind === 'file' && picked && !isFileSizeOk(picked.size)) return say(MESSAGES['too-big'], 'error');
          submit.disabled = true;
          submit.textContent = kind === 'file' ? 'Uploading…' : 'Adding…';
          const r = await attempt(() =>
            kind === 'link'
              ? addLink(db, { title: title.value, url: url.value })
              : kind === 'text'
                ? addText(db, { title: title.value, body: body.value })
                : addFile(db, { title: title.value, file: picked as File, fileName: (picked as File).name }),
          );
          submit.disabled = false;
          submit.textContent = 'Add';
          if (!r.ok) return;
          form.reset();
          say('Added.');
          await load();
        },
      },
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Kind' }, tabs),
      title,
      url,
      body,
      file,
      h(
        'div',
        { class: 'repo-form-actions' },
        submit,
        h(
          'button',
          {
            class: 'btn ghost small',
            type: 'button',
            onclick: async () => {
              await signOutAdmin(db);
              admin = false;
              tools();
              render();
            },
          },
          'Log out',
        ),
      ),
    );
    return form;
  };

  const tools = () => {
    toolsEl.replaceChildren(
      admin ? addForm() : h('button', { class: 'btn ghost small', type: 'button', onclick: () => toolsEl.replaceChildren(loginForm()) }, '+ add'),
    );
  };

  void (async () => {
    admin = await isAdmin(db);
    tools();
    await load();
  })();
}

const db = makeClient();
if (db) main(db);
else listEl.replaceChildren(h('p', { class: 'drops-empty' }, 'Not configured yet.'));
