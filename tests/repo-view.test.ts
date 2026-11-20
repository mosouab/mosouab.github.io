// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import type { Drop } from '../src/scripts/repo/drops';
import { renderDrops } from '../src/scripts/repo/view';

const base = { title: '', url: null, body: null, storage_path: null, size_bytes: null, created_at: '2026-11-20T10:00:00+00:00' };
const link: Drop = { ...base, id: 'l', kind: 'link', title: 'TP sujet', url: 'https://example.org/tp' };
const text: Drop = { ...base, id: 't', kind: 'text', title: 'Commande', body: '<b>ssh mo@lab</b>' };
const file: Drop = { ...base, id: 'f', kind: 'file', title: 'rapport.pdf', storage_path: 'x-rapport.pdf', size_bytes: 2_400_000 };

function render(admin: boolean, drops: Drop[] = [link, text, file]) {
  const root = document.createElement('div');
  const handlers = {
    fileUrl: (d: Drop) => `https://cdn.example/${d.storage_path}`,
    onDelete: vi.fn(async () => {}),
    onCopy: vi.fn(async () => {}),
  };
  renderDrops(root, { drops, admin, ...handlers });
  return { root, ...handlers };
}

describe('renderDrops', () => {
  it('shows a link with Open (new tab) and Copy', () => {
    const { root, onCopy } = render(false);
    const row = root.querySelector('[data-id=l]') as HTMLElement;
    const open = row.querySelector('a') as HTMLAnchorElement;
    expect(open.getAttribute('href')).toBe('https://example.org/tp');
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('rel')).toContain('noopener');
    (row.querySelector('button.copy') as HTMLButtonElement).click();
    expect(onCopy).toHaveBeenCalledWith('https://example.org/tp');
  });

  it('shows text as text (never HTML) and copies it', () => {
    const { root, onCopy } = render(false);
    const pre = root.querySelector('[data-id=t] pre') as HTMLElement;
    expect(pre.textContent).toBe('<b>ssh mo@lab</b>');
    expect(pre.children).toHaveLength(0);
    (root.querySelector('[data-id=t] button.copy') as HTMLButtonElement).click();
    expect(onCopy).toHaveBeenCalledWith('<b>ssh mo@lab</b>');
  });

  it('shows a file with its size and a download link', () => {
    const { root } = render(false);
    const row = root.querySelector('[data-id=f]') as HTMLElement;
    expect(row.textContent).toMatch(/2\.3\s?MB/);
    expect(row.querySelector('a')?.getAttribute('href')).toBe('https://cdn.example/x-rapport.pdf');
  });

  it('has no delete buttons for visitors', () => {
    expect(render(false).root.querySelector('button.delete')).toBeNull();
  });

  it('asks the admin to confirm before deleting', async () => {
    const { root, onDelete } = render(true);
    const del = root.querySelector('[data-id=l] button.delete') as HTMLButtonElement;
    del.click();
    expect(onDelete).not.toHaveBeenCalled();
    expect(del.textContent).toMatch(/confirm/i);
    del.click();
    expect(onDelete).toHaveBeenCalledWith(link);
  });

  it('says so when there is nothing yet', () => {
    expect(render(false, []).root.textContent).toMatch(/nothing here yet/i);
  });
});
