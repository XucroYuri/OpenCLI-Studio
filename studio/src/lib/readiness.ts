import type { StudioCommandItem, StudioDoctorResult, StudioPluginEntry } from '../types';

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
}): CommandReadiness | null {
  const { command, doctor, plugins } = input;
  if (!command) return null;

  const bullets: string[] = [];
  let tone: CommandReadiness['tone'] = 'success';
  let title = 'Ready to run locally';
  let needsOps = false;

  if (command.meta.mode === 'public') {
    pushUnique(bullets, 'This command does not depend on the browser bridge.');
  }

  if (command.meta.mode === 'desktop') {
    tone = 'info';
    title = 'Desktop runtime must be checked manually';
    pushUnique(bullets, 'Studio cannot verify whether the target desktop app is running or authenticated.');
  }

  if (command.meta.mode === 'browser') {
    needsOps = true;

    if (!doctor) {
      tone = 'warning';
      title = 'Browser bridge not checked yet';
      pushUnique(bullets, 'Run Doctor in Ops before executing this browser-backed command.');
    } else {
      const blockingIssues: string[] = [];
      if (doctor.daemonRunning === false) {
        blockingIssues.push('Browser daemon is offline.');
      }
      if (doctor.extensionConnected === false) {
        blockingIssues.push('Browser extension is not connected.');
      }
      if (doctor.connectivity && !doctor.connectivity.ok) {
        blockingIssues.push(`Browser connectivity probe failed: ${doctor.connectivity.error || 'Unknown error'}`);
      }

      if (blockingIssues.length > 0) {
        tone = 'error';
        title = 'Execution blocked by local dependencies';
        for (const issue of blockingIssues) {
          pushUnique(bullets, issue);
        }
      } else if (doctor.sessions && doctor.sessions.length === 0) {
        tone = 'warning';
        title = 'Browser bridge has no active sessions';
        pushUnique(bullets, 'No active browser sessions were reported for extension-backed commands.');
      } else {
        pushUnique(bullets, 'Browser bridge checks look healthy for this command.');
      }
    }
  }

  if (command.meta.surface === 'plugin') {
    const plugin = plugins.find((entry) => entry.name === command.site);
    if (!plugin) {
      tone = tone === 'error' ? tone : 'warning';
      title = tone === 'error' ? title : 'Plugin inventory needs review';
      pushUnique(bullets, 'This command comes from a plugin, but no matching plugin inventory entry was found.');
    } else {
      if (plugin.registeredCommandCount < plugin.declaredCommandCount) {
        tone = tone === 'error' ? tone : 'warning';
        title = tone === 'error' ? title : 'Plugin inventory needs review';
        pushUnique(
          bullets,
          `Plugin coverage is incomplete: ${plugin.registeredCommandCount} of ${plugin.declaredCommandCount} declared commands are registered.`,
        );
      }
      if (plugin.sourceKind === 'local') {
        if (tone === 'success') {
          tone = 'info';
          title = 'Plugin state should be reviewed';
        }
        pushUnique(bullets, 'Plugin is installed from a local path and may drift from the current workspace state.');
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
