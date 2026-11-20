import { describe, expect, it } from 'vitest';
import {
  checkText,
  fileNameFromPath,
  isFileSizeOk,
  MAX_FILE_BYTES,
  MAX_TEXT_CHARS,
  normalizeLink,
  sanitizeFileName,
  storagePathFor,
} from '../src/scripts/repo/validate';

describe('normalizeLink', () => {
  it('keeps http(s) links and adds https:// when missing', () => {
    expect(normalizeLink(' https://docs.google.com/x ')).toBe('https://docs.google.com/x');
    expect(normalizeLink('docs.google.com/document/d/abc')).toBe('https://docs.google.com/document/d/abc');
  });
  it('refuses other schemes and non-links', () => {
    expect(normalizeLink('javascript:alert(1)')).toBeNull();
    expect(normalizeLink('ftp://example.org/f')).toBeNull();
    expect(normalizeLink('hello')).toBeNull();
    expect(normalizeLink('')).toBeNull();
  });
});

describe('checkText', () => {
  it('accepts a snippet as typed', () => {
    expect(checkText('  ssh mo@lab\n')).toBeNull();
  });
  it('refuses empty or whitespace-only text', () => {
    expect(checkText('   \n ')).toBe('empty');
  });
  it('refuses text over the limit', () => {
    expect(checkText('a'.repeat(MAX_TEXT_CHARS))).toBeNull();
    expect(checkText('a'.repeat(MAX_TEXT_CHARS + 1))).toBe('too-long');
  });
});

describe('files', () => {
  it('caps files at 50 MB', () => {
    expect(isFileSizeOk(MAX_FILE_BYTES)).toBe(true);
    expect(isFileSizeOk(MAX_FILE_BYTES + 1)).toBe(false);
  });
  it('turns French names into safe storage keys and back into a readable name', () => {
    expect(sanitizeFileName('Compte rendu réunion.pdf')).toBe('Compte-rendu-reunion.pdf');
    const path = storagePathFor('Compte rendu réunion.pdf', '0b6f3c1e-9a7d-4e2b-8c1f-2d3e4f5a6b7c');
    expect(fileNameFromPath(path)).toBe('Compte-rendu-reunion.pdf');
  });
});
