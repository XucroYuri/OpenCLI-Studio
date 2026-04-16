import { describe, expect, it, vi } from 'vitest';
import { runStudioCommand } from './command.js';

describe('runStudioCommand', () => {
  it('starts the Studio server and opens the browser in open mode', async () => {
    const startServer = vi.fn(async () => ({
      url: 'http://127.0.0.1:4310',
      close: vi.fn(async () => undefined),
    }));
    const openBrowser = vi.fn(async () => undefined);
    const onReady = vi.fn();

    await runStudioCommand(
      { mode: 'open', port: 4310, openBrowser: true },
      {
        startServer,
        openBrowser,
        onReady,
        resolveStaticDir: () => '/repo/dist/studio',
      },
    );

    expect(startServer).toHaveBeenCalledWith(expect.objectContaining({ port: 4310 }));
    expect(openBrowser).toHaveBeenCalledWith('http://127.0.0.1:4310');
    expect(onReady).toHaveBeenCalledWith('http://127.0.0.1:4310');
  });

  it('starts the Studio server without opening the browser in serve mode', async () => {
    const startServer = vi.fn(async () => ({
      url: 'http://127.0.0.1:4311',
      close: vi.fn(async () => undefined),
    }));
    const openBrowser = vi.fn(async () => undefined);
    const onReady = vi.fn();

    await runStudioCommand(
      { mode: 'serve', port: 4311, openBrowser: false },
      { startServer, openBrowser, onReady },
    );

    expect(startServer).toHaveBeenCalledWith(expect.objectContaining({ port: 4311 }));
    expect(openBrowser).not.toHaveBeenCalled();
    expect(onReady).toHaveBeenCalledWith('http://127.0.0.1:4311');
  });

  it('passes the built Studio static directory to the server when available', async () => {
    const startServer = vi.fn(async () => ({
      url: 'http://127.0.0.1:4312',
      close: vi.fn(async () => undefined),
    }));

    await runStudioCommand(
      { mode: 'open', port: 4312, openBrowser: false },
      {
        startServer,
        resolveStaticDir: () => '/repo/dist/studio',
      },
    );

    expect(startServer).toHaveBeenCalledWith(expect.objectContaining({
      port: 4312,
      staticDir: '/repo/dist/studio',
    }));
  });

  it('does not auto-open a browser when frontend assets are missing', async () => {
    const startServer = vi.fn(async () => ({
      url: 'http://127.0.0.1:4313',
      close: vi.fn(async () => undefined),
    }));
    const openBrowser = vi.fn(async () => undefined);
    const onReady = vi.fn();

    await runStudioCommand(
      { mode: 'open', port: 4313, openBrowser: true },
      {
        startServer,
        openBrowser,
        onReady,
        resolveStaticDir: () => undefined,
      },
    );

    expect(onReady).toHaveBeenCalledWith('http://127.0.0.1:4313');
    expect(openBrowser).not.toHaveBeenCalled();
  });
});
