import type {
  StudioDoctorResult,
  StudioEnv,
  StudioExternalCliEntry,
  StudioPluginEntry,
} from '../types';
import type { TranslateFn } from './readiness';

export type OpsTone = 'default' | 'info' | 'success' | 'warning' | 'error';

function localizeText(t: TranslateFn | null, key: string, fallback: string): string {
  return t ? t(key) : fallback;
}

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
  t?: TranslateFn;
}): OpsMetric[] {
  const { env, plugins, externalClis, doctor, t = null } = input;
  const installedExternalCount = externalClis.filter((entry) => entry.installed).length;
  const issueCount = doctor?.issues?.length ?? 0;
  const sessionCount = doctor?.sessions?.length ?? 0;
  const totalExternalCount = externalClis.length || env?.externalCliCount || 0;

  return [
    {
      label: localizeText(t, 'ops.metricCommands', 'Commands'),
      value: String(env?.commandCount ?? 0),
      tone: 'default',
    },
    {
      label: localizeText(t, 'ops.metricBrowser', 'Browser-backed'),
      value: String(env?.browserCommandCount ?? 0),
      tone: 'info',
    },
    {
      label: localizeText(t, 'ops.metricPlugins', 'Plugins'),
      value: String(plugins.length || env?.pluginCount || 0),
      tone: 'info',
    },
    {
      label: localizeText(t, 'ops.metricExternal', 'External installed'),
      value: `${installedExternalCount} / ${totalExternalCount}`,
      tone: totalExternalCount === 0
        ? 'info'
        : installedExternalCount === totalExternalCount
          ? 'success'
          : 'warning',
    },
    {
      label: localizeText(t, 'ops.metricIssues', 'Doctor issues'),
      value: String(issueCount),
      tone: issueCount > 0 ? 'warning' : 'success',
    },
    {
      label: localizeText(t, 'ops.metricSessions', 'Sessions'),
      value: String(sessionCount),
      tone: 'info',
    },
  ];
}

export function buildDoctorStatusRows(doctor: StudioDoctorResult | null): DoctorStatusRow[] {
  return buildDoctorStatusRowsWithLabel(doctor, null);
}

export function buildDoctorStatusRowsWithLabel(doctor: StudioDoctorResult | null, t: TranslateFn | null = null): DoctorStatusRow[] {
  const daemonRow: DoctorStatusRow =
    doctor?.daemonRunning === undefined
      ? { label: localizeText(t, 'ops.daemon', 'Daemon'), value: localizeText(t, 'ops.doctorStatus.notChecked', 'Not checked'), tone: 'info' }
      : doctor.daemonRunning
        ? {
          label: localizeText(t, 'ops.daemon', 'Daemon'),
          value: localizeText(t, 'ops.doctorStatus.running', 'Running'),
          tone: 'success',
        }
        : { label: localizeText(t, 'ops.daemon', 'Daemon'), value: localizeText(t, 'ops.doctorStatus.offline', 'Offline'), tone: 'error' };

  const extensionRow: DoctorStatusRow =
    doctor?.extensionConnected === undefined
      ? { label: localizeText(t, 'ops.extension', 'Extension'), value: localizeText(t, 'ops.doctorStatus.notChecked', 'Not checked'), tone: 'info' }
      : doctor.extensionConnected
        ? { label: localizeText(t, 'ops.extension', 'Extension'), value: localizeText(t, 'ops.doctorStatus.connected', 'Connected'), tone: 'success' }
        : { label: localizeText(t, 'ops.extension', 'Extension'), value: localizeText(t, 'ops.doctorStatus.disconnected', 'Disconnected'), tone: 'error' };

  const connectivityRow: DoctorStatusRow =
    !doctor?.connectivity
      ? { label: localizeText(t, 'ops.connectivity', 'Connectivity'), value: localizeText(t, 'ops.doctorStatus.notChecked', 'Not checked'), tone: 'info' }
      : doctor.connectivity.ok
        ? { label: localizeText(t, 'ops.connectivity', 'Connectivity'), value: `${doctor.connectivity.durationMs} ms`, tone: 'success' }
        : { label: localizeText(t, 'ops.connectivity', 'Connectivity'), value: doctor.connectivity.error || localizeText(t, 'ops.connectivityError', 'Probe failed'), tone: 'error' };

  const versionRow: DoctorStatusRow = !doctor?.extensionVersion || !doctor?.latestExtensionVersion
    ? { label: localizeText(t, 'ops.versionSync', 'Version sync'), value: localizeText(t, 'ops.doctorStatus.notChecked', 'Not checked'), tone: 'info' }
    : doctor.extensionVersion === doctor.latestExtensionVersion
      ? {
        label: localizeText(t, 'ops.versionSync', 'Version sync'),
        value: doctor.extensionVersion,
        tone: 'success',
      }
      : {
          label: localizeText(t, 'ops.versionSync', 'Version sync'),
          value: `${doctor.extensionVersion} -> ${doctor.latestExtensionVersion}`,
          tone: 'warning',
        };

  const issueCount = doctor?.issues?.length ?? 0;
  const issuesRow: DoctorStatusRow = {
    label: localizeText(t, 'ops.issue', 'Issues'),
    value: String(issueCount),
    tone: issueCount > 0 ? 'warning' : 'success',
  };

  return [daemonRow, extensionRow, connectivityRow, versionRow, issuesRow];
}
