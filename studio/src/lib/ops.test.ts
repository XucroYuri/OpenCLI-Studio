import { describe, expect, it } from 'vitest';
import { buildDoctorStatusRows, buildOpsMetrics } from './ops';
import type { StudioDoctorResult, StudioEnv, StudioExternalCliEntry, StudioPluginEntry } from '../types';

const ENV: StudioEnv = {
  storageDir: '/tmp/opencli-studio',
  commandCount: 48,
  browserCommandCount: 17,
  pluginCount: 2,
  externalCliCount: 3,
  platform: 'win32',
  nodeVersion: 'v22.0.0',
};

const PLUGINS: StudioPluginEntry[] = [
  {
    name: 'hot-digest',
    path: '/plugins/hot-digest',
    commands: ['hot'],
    declaredCommandCount: 1,
    registeredCommandCount: 1,
    source: 'github:example/opencli-plugin-hot-digest',
    sourceKind: 'git',
    version: '1.0.0',
    installedAt: '2026-04-14T00:00:00.000Z',
    monorepoName: null,
    description: 'Digest plugin',
  },
  {
    name: 'local-bridge',
    path: '/plugins/local-bridge',
    commands: ['sync'],
    declaredCommandCount: 1,
    registeredCommandCount: 0,
    source: 'local:/plugins/local-bridge',
    sourceKind: 'local',
    version: null,
    installedAt: null,
    monorepoName: null,
    description: null,
  },
];

const EXTERNAL_CLIS: StudioExternalCliEntry[] = [
  {
    name: 'gh',
    binary: 'gh',
    description: 'GitHub CLI',
    homepage: 'https://cli.github.com',
    tags: ['git', 'github'],
    installed: true,
    installAvailable: true,
  },
  {
    name: 'yt-dlp',
    binary: 'yt-dlp',
    description: 'Downloader',
    homepage: null,
    tags: ['media'],
    installed: false,
    installAvailable: true,
  },
];

describe('buildOpsMetrics', () => {
  it('summarizes core ops inventory and health counts', () => {
    const doctor: StudioDoctorResult = {
      daemonRunning: true,
      extensionConnected: true,
      connectivity: { ok: true, durationMs: 182 },
      sessions: [{ workspace: 'C:/repo', windowId: 9, tabCount: 2, idleMsRemaining: 45_000 }],
      issues: ['Extension version mismatch'],
    };

    expect(buildOpsMetrics({
      env: ENV,
      plugins: PLUGINS,
      externalClis: EXTERNAL_CLIS,
      doctor,
    })).toEqual([
      { label: 'Commands', value: '48', tone: 'default' },
      { label: 'Browser-backed', value: '17', tone: 'info' },
      { label: 'Plugins', value: '2', tone: 'info' },
      { label: 'External installed', value: '1 / 2', tone: 'warning' },
      { label: 'Doctor issues', value: '1', tone: 'warning' },
      { label: 'Sessions', value: '1', tone: 'info' },
    ]);
  });
});

describe('buildDoctorStatusRows', () => {
  it('turns doctor output into operator-facing status rows', () => {
    const doctor: StudioDoctorResult = {
      daemonRunning: false,
      extensionConnected: true,
      extensionVersion: '0.3.0',
      latestExtensionVersion: '0.4.0',
      connectivity: { ok: false, error: 'Timed out', durationMs: 5000 },
      issues: ['Daemon not running', 'Extension version mismatch'],
    };

    expect(buildDoctorStatusRows(doctor)).toEqual([
      { label: 'Daemon', value: 'Offline', tone: 'error' },
      { label: 'Extension', value: 'Connected', tone: 'success' },
      { label: 'Connectivity', value: 'Timed out', tone: 'error' },
      { label: 'Version sync', value: '0.3.0 -> 0.4.0', tone: 'warning' },
      { label: 'Issues', value: '2', tone: 'warning' },
    ]);
  });

  it('falls back to inspection defaults before doctor has been run', () => {
    expect(buildDoctorStatusRows(null)).toEqual([
      { label: 'Daemon', value: 'Not checked', tone: 'info' },
      { label: 'Extension', value: 'Not checked', tone: 'info' },
      { label: 'Connectivity', value: 'Not checked', tone: 'info' },
      { label: 'Version sync', value: 'Not checked', tone: 'info' },
      { label: 'Issues', value: '0', tone: 'success' },
    ]);
  });
});
