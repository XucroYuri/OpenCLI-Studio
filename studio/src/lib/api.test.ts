import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeCommand, fetchRegistry } from './api';

describe('studio api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON payloads on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ commands: [], sites: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })));

    await expect(fetchRegistry()).resolves.toEqual({ commands: [], sites: [] });
  });

  it('surfaces structured API errors as plain messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error: 'Invalid args' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })));

    await expect(executeCommand('google/trends', {})).rejects.toThrow('Invalid args');
  });

  it('falls back to plain-text error responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response('Bad gateway', {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })));

    await expect(fetchRegistry()).rejects.toThrow('Bad gateway');
  });
});
