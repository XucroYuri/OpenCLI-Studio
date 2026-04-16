import { describe, expect, it } from 'vitest';
import { buildAvailabilitySummary, buildCommandReadiness, buildSiteAccessSummary } from './readiness';
import type { StudioCommandItem, StudioDoctorResult, StudioExternalCliEntry, StudioPluginEntry, StudioSiteAccessEntry } from '../types';

function makeCommand(overrides: Partial<StudioCommandItem>): StudioCommandItem {
  return {
    command: 'google/trends',
    site: 'google',
    name: 'trends',
    description: 'Daily trends',
    args: [],
    browser: false,
    strategy: 'public',
    meta: {
      surface: 'builtin',
      mode: 'public',
      capability: 'discovery',
      risk: 'safe',
      market: 'international',
      siteCategory: 'news',
      uiHints: {
        supportsLists: true,
        supportsDetails: false,
        supportsCharts: true,
        supportsTimeSeries: true,
      },
    },
    ...overrides,
  };
}

describe('buildCommandReadiness', () => {
  it('treats public built-in commands as directly runnable', () => {
    expect(buildCommandReadiness({
      command: makeCommand({ command: 'google/trends' }),
      doctor: null,
      plugins: [],
      externalClis: [],
      registryCommands: [makeCommand({ command: 'google/trends' })],
    })).toEqual({
      tone: 'success',
      title: 'Ready to run',
      bullets: ['This command can run directly in the current shell.'],
      actions: [],
    });
  });

  it('keeps confirm-risk setup commands behind open-command actions', () => {
    const browserCommand = makeCommand({
      command: 'spotify/status',
      site: 'spotify',
      name: 'status',
      browser: true,
      strategy: 'cookie',
      meta: {
        surface: 'builtin',
        mode: 'browser',
        capability: 'account',
        risk: 'safe',
        market: 'international',
        siteCategory: 'media',
        uiHints: {
          supportsLists: true,
          supportsDetails: false,
          supportsCharts: false,
          supportsTimeSeries: false,
        },
      },
    });
    const loginCommand = makeCommand({
      command: 'spotify/auth',
      site: 'spotify',
      name: 'auth',
      description: 'Spotify auth',
      args: [{
        name: 'provider',
        required: true,
        choices: ['qr'],
      }],
      browser: true,
      strategy: 'cookie',
      meta: {
        surface: 'builtin',
        mode: 'browser',
        capability: 'action',
        risk: 'confirm',
        market: 'international',
        siteCategory: 'media',
        uiHints: {
          supportsLists: false,
          supportsDetails: false,
          supportsCharts: false,
          supportsTimeSeries: false,
        },
      },
    });

    expect(buildCommandReadiness({
      command: browserCommand,
      doctor: null,
      plugins: [],
      externalClis: [],
      registryCommands: [browserCommand, loginCommand],
    })).toEqual({
      tone: 'warning',
      title: 'System check not run yet',
      bullets: [
        'This command depends on the browser connection, extension, and a signed-in site session.',
        'Run the system check once before you start.',
        'You can run "Spotify auth" first to finish authorization.',
      ],
      actions: [
        {
          id: 'run-doctor',
          kind: 'primary',
          type: 'run-doctor',
          label: 'Run system check',
        },
        {
          id: 'open-ops',
          kind: 'secondary',
          type: 'open-ops',
          label: 'Open Checks',
        },
        {
          id: 'auth:spotify/auth',
          kind: 'primary',
          type: 'open-command',
          label: 'Open authorization',
          command: 'spotify/auth',
          args: { provider: 'qr' },
        },
      ],
    });
  });

  it('auto-runs safe setup commands when defaults fully resolve the args', () => {
    const browserCommand = makeCommand({
      command: 'spotify/status',
      site: 'spotify',
      name: 'status',
      browser: true,
      strategy: 'cookie',
      meta: {
        surface: 'builtin',
        mode: 'browser',
        capability: 'account',
        risk: 'safe',
        market: 'international',
        siteCategory: 'media',
        uiHints: {
          supportsLists: true,
          supportsDetails: false,
          supportsCharts: false,
          supportsTimeSeries: false,
        },
      },
    });
    const loginCommand = makeCommand({
      command: 'spotify/auth',
      site: 'spotify',
      name: 'auth',
      description: 'Spotify auth',
      args: [{
        name: 'provider',
        required: true,
        choices: ['qr'],
      }],
      browser: true,
      strategy: 'cookie',
      meta: {
        surface: 'builtin',
        mode: 'browser',
        capability: 'action',
        risk: 'safe',
        market: 'international',
        siteCategory: 'media',
        uiHints: {
          supportsLists: false,
          supportsDetails: false,
          supportsCharts: false,
          supportsTimeSeries: false,
        },
      },
    });

    expect(buildCommandReadiness({
      command: browserCommand,
      doctor: null,
      plugins: [],
      externalClis: [],
      registryCommands: [browserCommand, loginCommand],
    })).toEqual({
      tone: 'warning',
      title: 'System check not run yet',
      bullets: [
        'This command depends on the browser connection, extension, and a signed-in site session.',
        'Run the system check once before you start.',
        'You can run "Spotify auth" first to finish authorization.',
      ],
      actions: [
        {
          id: 'run-doctor',
          kind: 'primary',
          type: 'run-doctor',
          label: 'Run system check',
        },
        {
          id: 'open-ops',
          kind: 'secondary',
          type: 'open-ops',
          label: 'Open Checks',
        },
        {
          id: 'auth:spotify/auth',
          kind: 'primary',
          type: 'run-command',
          label: 'Authorize now',
          command: 'spotify/auth',
          args: { provider: 'qr' },
        },
      ],
    });
  });

  it('surfaces blocking browser issues and plugin caveats together', () => {
    const doctor: StudioDoctorResult = {
      daemonRunning: false,
      extensionConnected: false,
      connectivity: {
        ok: false,
        error: 'Timed out',
        durationMs: 5000,
      },
      issues: ['Daemon offline'],
    };
    const plugins: StudioPluginEntry[] = [
      {
        name: 'hot-digest',
        path: '/plugins/hot-digest',
        commands: ['hot', 'search'],
        declaredCommandCount: 2,
        registeredCommandCount: 1,
        source: 'local:/plugins/hot-digest',
        sourceKind: 'local',
        version: null,
        installedAt: null,
        monorepoName: null,
        description: 'Digest plugin',
      },
    ];

    expect(buildCommandReadiness({
      command: makeCommand({
        command: 'hot-digest/hot',
        site: 'hot-digest',
        browser: true,
        strategy: 'cookie',
        meta: {
          surface: 'plugin',
          mode: 'browser',
          capability: 'discovery',
          risk: 'safe',
          market: 'domestic',
          siteCategory: 'video',
          uiHints: {
            supportsLists: true,
            supportsDetails: false,
            supportsCharts: true,
            supportsTimeSeries: true,
          },
        },
      }),
      doctor,
      plugins,
      externalClis: [],
      registryCommands: [],
    })).toEqual({
      tone: 'error',
      title: 'Browser extension not connected',
      bullets: [
        'This command depends on the browser connection, extension, and a signed-in site session.',
        'The local browser service is offline.',
        'The browser extension is not connected.',
        'Browser connection test failed: Timed out',
        'Plugin registered 1 of 2 declared commands.',
        'This plugin uses a local path and may be out of sync.',
      ],
      actions: [
        {
          id: 'run-doctor',
          kind: 'primary',
          type: 'run-doctor',
          label: 'Run system check',
        },
        {
          id: 'open-ops',
          kind: 'secondary',
          type: 'open-ops',
          label: 'Open Checks',
        },
      ],
    });
  });

  it('offers dependency install and homepage actions for matching external tools', () => {
    const externalClis: StudioExternalCliEntry[] = [
      {
        name: 'gh',
        binary: 'gh',
        description: 'GitHub CLI',
        homepage: 'https://cli.github.com',
        tags: ['github', 'git'],
        installed: false,
        installAvailable: true,
        installCommand: 'brew install gh',
      },
    ];

    expect(buildCommandReadiness({
      command: makeCommand({
        command: 'github/search',
        site: 'github',
      }),
      doctor: null,
      plugins: [],
      externalClis,
      registryCommands: [],
    })).toEqual({
      tone: 'warning',
      title: 'Install "gh" first',
      bullets: [
        'This command can run directly in the current shell.',
        'This command depends on "gh", which is not installed in the current environment.',
      ],
      actions: [
        {
          id: 'install:gh',
          kind: 'primary',
          type: 'install-external',
          label: 'Install dependency',
          externalName: 'gh',
        },
        {
          id: 'copy-install:gh',
          kind: 'secondary',
          type: 'copy-text',
          label: 'Copy install command',
          text: 'brew install gh',
        },
        {
          id: 'homepage:gh',
          kind: 'secondary',
          type: 'open-url',
          label: 'Open install guide',
          url: 'https://cli.github.com',
        },
      ],
    });
  });

  it('detects description-based prerequisites and offers a fix path', () => {
    const externalClis: StudioExternalCliEntry[] = [
      {
        name: 'yt-dlp',
        binary: 'yt-dlp',
        description: 'Downloader',
        homepage: 'https://github.com/yt-dlp/yt-dlp',
        tags: ['download', 'video'],
        installed: false,
        installAvailable: true,
        installCommand: 'brew install yt-dlp',
      },
    ];

    expect(buildCommandReadiness({
      command: makeCommand({
        command: 'bilibili/download',
        site: 'bilibili',
        name: 'download',
        description: 'Download Bilibili video (requires yt-dlp)',
        browser: true,
        strategy: 'cookie',
        meta: {
          surface: 'builtin',
          mode: 'browser',
          capability: 'asset',
          risk: 'safe',
          market: 'domestic',
          siteCategory: 'video',
          uiHints: {
            supportsLists: false,
            supportsDetails: true,
            supportsCharts: false,
            supportsTimeSeries: false,
          },
        },
      }),
      doctor: {
        daemonRunning: true,
        extensionConnected: true,
        connectivity: { ok: true, durationMs: 20 },
        sessions: [{ workspace: '/tmp', windowId: 1, tabCount: 2, idleMsRemaining: 1000 }],
        issues: [],
      },
      plugins: [],
      externalClis,
      registryCommands: [],
    })).toEqual({
      tone: 'warning',
      title: 'Install "yt-dlp" first',
      bullets: [
        'This command depends on the browser connection, extension, and a signed-in site session.',
        'Browser connection is ready.',
        'This command depends on "yt-dlp", which is not installed in the current environment.',
      ],
      actions: [
        {
          id: 'install:yt-dlp',
          kind: 'primary',
          type: 'install-external',
          label: 'Install dependency',
          externalName: 'yt-dlp',
        },
        {
          id: 'copy-install:yt-dlp',
          kind: 'secondary',
          type: 'copy-text',
          label: 'Copy install command',
          text: 'brew install yt-dlp',
        },
        {
          id: 'homepage:yt-dlp',
          kind: 'secondary',
          type: 'open-url',
          label: 'Open install guide',
          url: 'https://github.com/yt-dlp/yt-dlp',
        },
      ],
    });
  });

  it('uses explicit site access state to guide browser commands to the sign-in entry', () => {
    const siteAccess: StudioSiteAccessEntry = {
      site: 'spotify',
      browserRequired: true,
      state: 'signed_out',
      authCommand: 'spotify/auth',
      checkCommand: 'spotify/status',
      configCommand: null,
      reason: 'Not logged in',
      checkedAt: '2026-04-15T00:00:00.000Z',
    };

    expect(buildCommandReadiness({
      command: makeCommand({
        command: 'spotify/following',
        site: 'spotify',
        name: 'following',
        browser: true,
        strategy: 'cookie',
        meta: {
          surface: 'builtin',
          mode: 'browser',
          capability: 'account',
          risk: 'safe',
          market: 'international',
          siteCategory: 'media',
          uiHints: {
            supportsLists: true,
            supportsDetails: true,
            supportsCharts: false,
            supportsTimeSeries: false,
          },
        },
      }),
      doctor: {
        daemonRunning: true,
        extensionConnected: true,
        connectivity: { ok: true, durationMs: 20 },
        sessions: [{ workspace: '/tmp', windowId: 1, tabCount: 2, idleMsRemaining: 1000 }],
        issues: [],
      },
      siteAccess,
      plugins: [],
      externalClis: [],
      registryCommands: [],
      siteLabel: 'Spotify',
    })).toEqual({
      tone: 'warning',
      title: 'Spotify account not signed in',
      bullets: [
        'This command depends on the browser connection, extension, and a signed-in site session.',
        'No active sign-in was found for Spotify.',
      ],
      actions: [
        {
          id: 'auth:spotify/auth',
          kind: 'primary',
          type: 'open-command',
          label: 'Open authorization',
          command: 'spotify/auth',
        },
        {
          id: 'check:spotify/status',
          kind: 'secondary',
          type: 'open-command',
          label: 'Open sign-in check',
          command: 'spotify/status',
        },
      ],
    });
  });

  it('surfaces browser-blocked site access in command readiness banners', () => {
    const siteAccess: StudioSiteAccessEntry = {
      site: 'spotify',
      browserRequired: true,
      state: 'browser_blocked',
      authCommand: 'spotify/auth',
      checkCommand: 'spotify/status',
      configCommand: null,
      reason: 'Browser Bridge extension not connected',
      checkedAt: '2026-04-15T00:00:00.000Z',
    };

    expect(buildCommandReadiness({
      command: makeCommand({
        command: 'spotify/following',
        site: 'spotify',
        name: 'following',
        browser: true,
        strategy: 'cookie',
        meta: {
          surface: 'builtin',
          mode: 'browser',
          capability: 'account',
          risk: 'safe',
          market: 'international',
          siteCategory: 'media',
          uiHints: {
            supportsLists: true,
            supportsDetails: true,
            supportsCharts: false,
            supportsTimeSeries: false,
          },
        },
      }),
      doctor: {
        daemonRunning: true,
        extensionConnected: true,
        connectivity: { ok: true, durationMs: 20 },
        sessions: [{ workspace: '/tmp', windowId: 1, tabCount: 2, idleMsRemaining: 1000 }],
        issues: [],
      },
      siteAccess,
      plugins: [],
      externalClis: [],
      registryCommands: [],
      siteLabel: 'Spotify',
    })).toEqual({
      tone: 'error',
      title: 'Spotify browser extension not connected',
      bullets: [
        'This command depends on the browser connection, extension, and a signed-in site session.',
        'Install or reconnect the browser extension before checking Spotify.',
      ],
      actions: [
        {
          id: 'run-doctor',
          kind: 'primary',
          type: 'run-doctor',
          label: 'Run system check',
        },
        {
          id: 'open-ops',
          kind: 'secondary',
          type: 'open-ops',
          label: 'Open Checks',
        },
      ],
    });
  });

  it('builds a compact site summary from site access state', () => {
    expect(buildSiteAccessSummary({
      siteAccess: {
        site: 'bilibili',
        browserRequired: true,
        state: 'signed_in',
        authCommand: 'bilibili/login',
        checkCommand: 'bilibili/me',
        configCommand: null,
        reason: null,
        checkedAt: '2026-04-15T00:00:00.000Z',
      },
      siteLabel: 'B站',
    })).toEqual({
      tone: 'success',
      label: 'B站 signed in',
      detail: 'B站 session looks ready.',
      action: null,
    });
  });

  it('uses the most actionable detail in compact availability summaries', () => {
    const readiness = buildCommandReadiness({
      command: makeCommand({
        command: 'spotify/following',
        site: 'spotify',
        name: 'following',
        browser: true,
        strategy: 'cookie',
        meta: {
          surface: 'builtin',
          mode: 'browser',
          capability: 'account',
          risk: 'safe',
          market: 'international',
          siteCategory: 'media',
          uiHints: {
            supportsLists: true,
            supportsDetails: true,
            supportsCharts: false,
            supportsTimeSeries: false,
          },
        },
      }),
      doctor: null,
      siteAccess: null,
      plugins: [],
      externalClis: [],
      registryCommands: [],
    });

    expect(buildAvailabilitySummary(readiness)).toEqual({
      tone: 'warning',
      label: 'System check not run yet',
      detail: 'Run the system check once before you start.',
      action: {
        id: 'run-doctor',
        kind: 'primary',
        type: 'run-doctor',
        label: 'Run system check',
      },
    });
  });

  it('maps browser-blocked site summaries to specific browser causes', () => {
    expect(buildSiteAccessSummary({
      siteAccess: {
        site: 'bilibili',
        browserRequired: true,
        state: 'browser_blocked',
        authCommand: 'bilibili/login',
        checkCommand: 'bilibili/me',
        configCommand: null,
        reason: 'Browser Bridge extension not connected',
        checkedAt: '2026-04-15T00:00:00.000Z',
      },
      siteLabel: 'B站',
    })).toEqual({
      tone: 'error',
      label: 'B站 browser extension not connected',
      detail: 'Install or reconnect the browser extension before checking B站.',
      action: {
        id: 'doctor:bilibili',
        kind: 'primary',
        type: 'run-doctor',
        label: 'Run system check',
      },
    });
  });
});
