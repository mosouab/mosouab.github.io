import { h } from './dom';
import type { Drop } from './drops';

export interface DropsViewProps {
  drops: Drop[];
  admin: boolean;
  fileUrl(drop: Drop): string;
  onDelete(drop: Drop): Promise<void>;
  onCopy(text: string): Promise<void>;
}

const KIND_LABEL: Record<Drop['kind'], string> = { link: '[link]', text: '[text]', file: '[file]' };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function copyButton(value: string, onCopy: (text: string) => Promise<void>): HTMLButtonElement {
  const button: HTMLButtonElement = h(
    'button',
    {
      class: 'btn ghost small copy',
      type: 'button',
      onclick: async () => {
        await onCopy(value);
        button.textContent = 'Copied';
        setTimeout(() => (button.textContent = 'Copy'), 1500);
      },
    },
    'Copy',
  );
  return button;
}

/** Two clicks: the first arms the button, the second deletes. */
function deleteButton(drop: Drop, onDelete: (d: Drop) => Promise<void>): HTMLButtonElement {
  let armed = false;
  const button: HTMLButtonElement = h(
    'button',
    {
      class: 'btn ghost small delete',
      type: 'button',
      onclick: async () => {
        if (!armed) {
          armed = true;
          button.textContent = 'Confirm delete?';
          button.classList.add('armed');
          setTimeout(() => {
            armed = false;
            button.textContent = 'Delete';
            button.classList.remove('armed');
          }, 4000);
          return;
        }
        button.disabled = true;
        await onDelete(drop);
      },
    },
    'Delete',
  );
  return button;
}

function renderDrop(drop: Drop, p: DropsViewProps): HTMLElement {
  const actions: (HTMLElement | null)[] = [];
  let content: HTMLElement | null = null;
  let title = drop.title;

  if (drop.kind === 'link' && drop.url) {
    title ||= drop.url;
    content = h('a', { class: 'drop-url', href: drop.url, target: '_blank', rel: 'noopener noreferrer' }, drop.url);
    actions.push(h('a', { class: 'btn small', href: drop.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open'), copyButton(drop.url, p.onCopy));
  } else if (drop.kind === 'text' && drop.body !== null) {
    content = h('pre', { class: 'drop-text' }, drop.body);
    actions.push(copyButton(drop.body, p.onCopy));
  } else if (drop.kind === 'file') {
    title ||= 'file';
    content = h('span', { class: 'drop-meta' }, drop.size_bytes !== null ? formatSize(drop.size_bytes) : '');
    actions.push(h('a', { class: 'btn small', href: p.fileUrl(drop) }, 'Download'));
  }
  if (p.admin) actions.push(deleteButton(drop, p.onDelete));

  return h(
    'li',
    { class: `drop drop-${drop.kind}`, 'data-id': drop.id },
    h('div', { class: 'drop-head' }, h('span', { class: 'drop-kind' }, KIND_LABEL[drop.kind]), title ? h('span', { class: 'drop-title' }, title) : null, h('span', { class: 'drop-date' }, formatDate(drop.created_at))),
    content,
    h('div', { class: 'drop-actions' }, actions),
  );
}

export function renderDrops(root: HTMLElement, p: DropsViewProps): void {
  root.replaceChildren(p.drops.length ? h('ul', { class: 'drops' }, p.drops.map((d) => renderDrop(d, p))) : h('p', { class: 'drops-empty' }, 'Nothing here yet.'));
}
