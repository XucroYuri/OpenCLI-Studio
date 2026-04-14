import type {
  StudioDoctorResult,
  StudioEnv,
  StudioExternalCliEntry,
  StudioPluginEntry,
} from '../types';

export type OpsTone = 'default' | 'info' | 'success' | 'warning' | 'error';

export interface OpsMetric {
  label: string;
  value: string;
  tone: OpsTone;
}

export interface DoctorStatusRow {
  label: string;
  value: string;
  tone: Exclude<OpsTone, 'default'>;
}

export function buildOpsMetrics(input: {
  env: StudioEnv | null;
  plugins: StudioPluginEntry[];
  externalClis: StudioExternalCliEntry[];
  doctor: StudioDoctorResult | null;
}): OpsMetric[] {
  const { env, plugins, externalClis, doctor } = input;
  const installedExternalCount = externalClis.filter((entry) => entry.installed).length;
  const issueCount = doctor?.issues?.length ?? 0;
  const sessionCount = doctor?.sessions?.length ?? 0;
  const totalExternalCount = externalClis.length || env?.externalCliCount || 0;

  return [
    {
      label: 'Commands',
      value: String(env?.commandCount ?? 0),
      tone: 'default',
    },
    {
      label: 'Browser-backed',
      value: String(env?.browserCommandCount ?? 0),
      tone: 'info',
    },
    {
      label: 'Plugins',
      value: String(plugins.length || env?.pluginCount || 0),
      tone: 'info',
    },
    {
      label: 'External installed',
      value: `${installedExternalCount} / ${totalExternalCount}`,
      tone: totalExternalCount === 0
        ? 'info'
        : installedExternalCount === totalExternalCount
          ? 'success'
          : 'warning',
    },
    {
      label: 'Doctor issues',
      value: String(issueCount),
      tone: issueCount > 0 ? 'warning' : 'success',
    },
    {
      label: 'Sessions',
      value: String(sessionCount),
      tone: 'info',
    },
  ];
}

export function buildDoctorStatusRows(doctor: StudioDoctorResult | null): DoctorStatusRow[] {
  const daemonRow: DoctorStatusRow =
    doctor?.daemonRunning === undefined
      ? { label: 'Daemon', value: 'Not checked', tone: 'info' }
      : doctor.daemonRunning
        ? { label: 'Daemon', value: 'Running', tone: 'success' }
        : { label: 'Daemon', value: 'Offline', tone: 'error' };

  const extensionRow: DoctorStatusRow =
    doctor?.extensionConnected === undefined
      ? { label: 'Extension', value: 'Not checked', tone: 'info' }
      : doctor.extensionConnected
        ? { label: 'Extension', value: 'Connected', tone: 'success' }
        : { label: 'Extension', value: 'Disconnected', tone: 'error' };

  const connectivityRow: DoctorStatusRow =
    !doctor?.connectivity
      ? { label: 'Connectivity', value: 'Not checked', tone: 'info' }
      : doctor.connectivity.ok
        ? { label: 'Connectivity', value: `${doctor.connectivity.durationMs} ms`, tone: 'success' }
        : { label: 'Connectivity', value: doctor.connectivity.error || 'Probe failed', tone: 'error' };

  const versionRow: DoctorStatusRow = !doctor?.extensionVersion || !doctor?.latestExtensionVersion
    ? { label: 'Version sync', value: 'Not checked', tone: 'info' }
    : doctor.extensionVersion === doctor.latestExtensionVersion
      ? { label: 'Version sync', value: doctor.extensionVersion, tone: 'success' }
      : {
          label: 'Version sync',
          value: `${doctor.extensionVersion} -> ${doctor.latestExtensionVersion}`,
          tone: 'warning',
        };

  const issueCount = doctor?.issues?.length ?? 0;
  const issuesRow: DoctorStatusRow = {
    label: 'Issues',
    value: String(issueCount),
    tone: issueCount > 0 ? 'warning' : 'success',
  };

  return [daemonRow, extensionRow, connectivityRow, versionRow, issuesRow];
}
