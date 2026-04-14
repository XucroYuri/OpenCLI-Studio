import type { StudioCommandItem, StudioDoctorResult, StudioPluginEntry } from '../types';

export type TranslateFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

function localizeText(t: TranslateFn | null, key: string, fallback: string): string {
  if (!t) return fallback;
  return t(key);
}

function localizeTextWithParams(
  t: TranslateFn | null,
  key: string,
  fallback: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  if (!t) return fallback;
  return t(key, params);
}

export interface CommandReadiness {
  tone: 'success' | 'info' | 'warning' | 'error';
  title: string;
  needsOps: boolean;
  bullets: string[];
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

export function buildCommandReadiness(input: {
  command: StudioCommandItem | null;
  doctor: StudioDoctorResult | null;
  plugins: StudioPluginEntry[];
  t?: TranslateFn;
}): CommandReadiness | null {
  const { command, doctor, plugins, t = null } = input;
  if (!command) return null;

  const bullets: string[] = [];
  let tone: CommandReadiness['tone'] = 'success';
  let title = localizeText(t, 'readiness.ready', 'Ready to run locally');
  let needsOps = false;

  if (command.meta.mode === 'public') {
    pushUnique(bullets, localizeText(t, 'readiness.bullet.public', 'This command does not depend on the browser bridge.'));
  }

  if (command.meta.mode === 'desktop') {
    tone = 'info';
    title = localizeText(t, 'readiness.title.desktop', 'Desktop runtime must be checked manually');
    pushUnique(bullets, localizeText(t, 'readiness.bullet.desktop', 'Studio cannot verify whether the target desktop app is running or authenticated.'));
  }

  if (command.meta.mode === 'browser') {
    needsOps = true;

    if (!doctor) {
      tone = 'warning';
      title = localizeText(t, 'readiness.title.browser.unchecked', 'Browser bridge not checked yet');
      pushUnique(bullets, localizeText(t, 'readiness.bullet.browser.unchecked', 'Run Doctor in Ops before executing this browser-backed command.'));
    } else {
      const blockingIssues: string[] = [];
      if (doctor.daemonRunning === false) {
        blockingIssues.push(localizeText(t, 'readiness.bullet.browser.daemonOffline', 'Browser daemon is offline.'));
      }
      if (doctor.extensionConnected === false) {
        blockingIssues.push(localizeText(t, 'readiness.bullet.browser.extensionDisconnected', 'Browser extension is not connected.'));
      }
      if (doctor.connectivity && !doctor.connectivity.ok) {
        const connectivityError = doctor.connectivity.error || 'Unknown error';
        blockingIssues.push(
          localizeTextWithParams(
            t,
            'readiness.bullet.browser.connectivityFailed',
            `Browser connectivity probe failed: ${connectivityError}`,
            { value: connectivityError },
          ),
        );
      }

      if (blockingIssues.length > 0) {
        tone = 'error';
        title = localizeText(t, 'readiness.title.browser.blocked', 'Execution blocked by local dependencies');
        for (const issue of blockingIssues) {
          pushUnique(bullets, issue);
        }
      } else if (doctor.sessions && doctor.sessions.length === 0) {
        tone = 'warning';
        title = localizeText(t, 'readiness.title.browser.noSessions', 'Browser bridge has no active sessions');
        pushUnique(bullets, localizeText(t, 'readiness.bullet.browser.noSessions', 'No active browser sessions were reported for extension-backed commands.'));
      } else {
        pushUnique(bullets, localizeText(t, 'readiness.bullet.browser.healthy', 'Browser bridge checks look healthy for this command.'));
      }
    }
  }

  if (command.meta.surface === 'plugin') {
    const plugin = plugins.find((entry) => entry.name === command.site);
    if (!plugin) {
      tone = tone === 'error' ? tone : 'warning';
      title = tone === 'error' ? title : localizeText(t, 'readiness.title.plugin.untracked', 'Plugin inventory needs review');
      pushUnique(bullets, localizeText(t, 'readiness.bullet.plugin.untracked', 'This command comes from a plugin, but no matching plugin inventory entry was found.'));
    } else {
      if (plugin.registeredCommandCount < plugin.declaredCommandCount) {
        tone = tone === 'error' ? tone : 'warning';
        title = tone === 'error' ? title : localizeText(t, 'readiness.title.plugin.incomplete', 'Plugin inventory needs review');
        pushUnique(
          bullets,
          localizeTextWithParams(
            t,
            'readiness.bullet.plugin.coverage',
            `Plugin coverage is incomplete: ${plugin.registeredCommandCount} of ${plugin.declaredCommandCount} declared commands are registered.`,
            {
              registered: plugin.registeredCommandCount,
              declared: plugin.declaredCommandCount,
            },
          ),
        );
      }
      if (plugin.sourceKind === 'local') {
        if (tone === 'success') {
          tone = 'info';
          title = localizeText(t, 'readiness.title.plugin.local', 'Plugin state should be reviewed');
        }
        pushUnique(bullets, localizeText(t, 'readiness.bullet.plugin.local', 'Plugin is installed from a local path and may drift from the current workspace state.'));
      }
    }
  }

  return {
    tone,
    title,
    needsOps,
    bullets,
  };
}
