import { describe, expect, it } from 'vitest';
import { buildCommandReadiness } from './readiness';
import type { StudioCommandItem, StudioDoctorResult, StudioPluginEntry } from '../types';

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
  it('treats public built-in commands as locally runnable', () => {
    expect(buildCommandReadiness({
      command: makeCommand({ command: 'google/trends' }),
      doctor: null,
      plugins: [],
    })).toEqual({
      tone: 'success',
      title: 'Ready to run locally',
      needsOps: false,
      bullets: ['This command does not depend on the browser bridge.'],
    });
  });

  it('warns when a browser-backed command has not been checked yet', () => {
    expect(buildCommandReadiness({
      command: makeCommand({
        command: 'bilibili/hot',
        site: 'bilibili',
        browser: true,
        strategy: 'cookie',
        meta: {
          surface: 'builtin',
          mode: 'browser',
          capability: 'discovery',
          risk: 'safe',
          uiHints: {
            supportsLists: true,
            supportsDetails: false,
            supportsCharts: true,
            supportsTimeSeries: true,
          },
        },
      }),
      doctor: null,
      plugins: [],
    })).toEqual({
      tone: 'warning',
      title: 'Browser bridge not checked yet',
      needsOps: true,
      bullets: ['Run Doctor in Ops before executing this browser-backed command.'],
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
    })).toEqual({
      tone: 'error',
      title: 'Execution blocked by local dependencies',
      needsOps: true,
      bullets: [
        'Browser daemon is offline.',
        'Browser extension is not connected.',
        'Browser connectivity probe failed: Timed out',
        'Plugin coverage is incomplete: 1 of 2 declared commands are registered.',
        'Plugin is installed from a local path and may drift from the current workspace state.',
      ],
    });
  });

  it('marks desktop commands as requiring manual runtime validation', () => {
    expect(buildCommandReadiness({
      command: makeCommand({
        command: 'notion/search',
        site: 'notion',
        browser: false,
        strategy: 'ui',
        meta: {
          surface: 'builtin',
          mode: 'desktop',
          capability: 'search',
          risk: 'safe',
          uiHints: {
            supportsLists: true,
            supportsDetails: false,
            supportsCharts: false,
            supportsTimeSeries: false,
          },
        },
      }),
      doctor: null,
      plugins: [],
    })).toEqual({
      tone: 'info',
      title: 'Desktop runtime must be checked manually',
      needsOps: false,
      bullets: ['Studio cannot verify whether the target desktop app is running or authenticated.'],
    });
  });
});
