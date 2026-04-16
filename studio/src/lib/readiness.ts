import type {
  StudioCommandArg,
  StudioCommandItem,
  StudioDoctorResult,
  StudioExternalCliEntry,
  StudioPluginEntry,
  StudioSiteAccessEntry,
} from '../types';

export type TranslateFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

export interface CommandReadinessAction {
  id: string;
  kind: 'primary' | 'secondary';
  type: 'run-doctor' | 'open-ops' | 'run-command' | 'open-command' | 'install-external' | 'copy-text' | 'open-url';
  label: string;
  command?: string;
  args?: Record<string, unknown>;
  externalName?: string;
  text?: string;
  url?: string;
}

export interface CommandReadiness {
  tone: 'success' | 'info' | 'warning' | 'error';
  title: string;
  bullets: string[];
  actions: CommandReadinessAction[];
}

export interface AvailabilitySummary {
  tone: CommandReadiness['tone'];
  label: string;
  detail: string | null;
  action: CommandReadinessAction | null;
}

function browserIssueKind(reason: string | null | undefined): 'extension' | 'daemon' | 'connectivity' | 'generic' {
  const text = (reason ?? '').trim();
  if (!text) return 'generic';
  if (/extension|插件/i.test(text)) return 'extension';
  if (/daemon|service|本地服务/i.test(text)) return 'daemon';
  if (/connect|connection|probe|连接/i.test(text)) return 'connectivity';
  return 'generic';
}

function selectBrowserTitle(input: {
  doctor: StudioDoctorResult | null;
  t?: TranslateFn | null;
}): string {
  const { doctor, t = null } = input;
  if (!doctor) {
    return localizeText(t, 'readiness.title.browser.unchecked', 'System check not run yet');
  }
  if (doctor.extensionConnected === false) {
    return localizeText(t, 'readiness.title.browser.extensionDisconnected', 'Browser extension not connected');
  }
  if (doctor.daemonRunning === false) {
    return localizeText(t, 'readiness.title.browser.daemonOffline', 'Local browser service is offline');
  }
  if (doctor.connectivity && !doctor.connectivity.ok) {
    return localizeText(t, 'readiness.title.browser.connectivityFailed', 'Browser connection test failed');
  }
  return localizeText(t, 'readiness.title.browser.blocked', 'Browser connection issue');
}

function selectAvailabilityDetail(readiness: CommandReadiness): string | null {
  if (readiness.bullets.length === 0) return null;
  if (readiness.tone !== 'success' && readiness.bullets.length > 1) {
    return readiness.bullets[1];
  }
  return readiness.bullets[readiness.bullets.length - 1] ?? null;
}

function buildBrowserBlockedCopy(input: {
  site: string | null | undefined;
  siteLabel?: string | null;
  reason: string | null | undefined;
  t: TranslateFn | null;
}): { title: string; detail: string } {
  const { site, siteLabel, reason, t } = input;
  const issueKind = browserIssueKind(reason);
  const resolvedSiteLabel = resolveSiteLabel(site, siteLabel);
  const siteParams = { site: resolvedSiteLabel };

  if (issueKind === 'extension') {
    return {
      title: localizeTextWithParams(t, 'readiness.siteState.browserExtension', `${resolvedSiteLabel} browser extension not connected`, siteParams),
      detail: localizeTextWithParams(t, 'readiness.siteDetail.browserExtension', `Install or reconnect the browser extension before checking ${resolvedSiteLabel}.`, siteParams),
    };
  }

  if (issueKind === 'daemon') {
    return {
      title: localizeTextWithParams(t, 'readiness.siteState.browserService', `${resolvedSiteLabel} local browser service is offline`, siteParams),
      detail: localizeTextWithParams(t, 'readiness.siteDetail.browserService', `Start the local browser service before checking ${resolvedSiteLabel}.`, siteParams),
    };
  }

  if (issueKind === 'connectivity') {
    return {
      title: localizeTextWithParams(t, 'readiness.siteState.browserConnectivity', `${resolvedSiteLabel} browser connection failed`, siteParams),
      detail: localizeTextWithParams(t, 'readiness.siteDetail.browserConnectivity', `The browser connection test failed. Fix the connection before checking ${resolvedSiteLabel}.`, siteParams),
    };
  }

  return {
    title: localizeTextWithParams(t, 'readiness.siteState.browserBlocked', `${resolvedSiteLabel} browser connection issue`, siteParams),
    detail: localizeTextWithParams(t, 'readiness.siteDetail.browserBlocked', `Fix the browser connection before checking ${resolvedSiteLabel}.`, siteParams),
  };
}

interface SiteSetupCommand {
  actionKind: 'auth' | 'check' | 'config';
  command: StudioCommandItem;
}

const AUTH_COMMAND_NAMES = new Set(['auth', 'login']);
const CHECK_COMMAND_NAMES = new Set(['me', 'token-info', 'status']);
const CONFIG_COMMAND_NAMES = new Set(['config', 'settings', 'setting', 'model']);

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

function resolveSiteLabel(site: string | null | undefined, siteLabel?: string | null): string {
  const explicit = siteLabel?.trim();
  if (explicit) return explicit;

  const fallback = site?.trim();
  if (fallback) return fallback;

  return 'this site';
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function pushAction(target: CommandReadinessAction[], action: CommandReadinessAction | null): void {
  if (!action) return;
  if (target.some((entry) => entry.id === action.id)) return;
  target.push(action);
}

function needsManualInput(args: StudioCommandArg[]): boolean {
  return args.some((arg) =>
    arg.required
    && arg.default === undefined
    && (arg.choices?.length ?? 0) !== 1,
  );
}

function buildAutomaticArgs(args: StudioCommandArg[]): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const arg of args) {
    if (arg.default !== undefined) {
      resolved[arg.name] = arg.default;
      continue;
    }

    if ((arg.choices?.length ?? 0) === 1) {
      resolved[arg.name] = arg.choices?.[0];
    }
  }

  return resolved;
}

function canAutoRunSetupCommand(command: StudioCommandItem): boolean {
  return command.meta.risk === 'safe' && !needsManualInput(command.args);
}

function findSiteCommand(
  commands: StudioCommandItem[],
  site: string,
  names: string[],
  exclude: string,
): StudioCommandItem | null {
  for (const name of names) {
    const match = commands.find((command) =>
      command.site === site
      && command.command !== exclude
      && command.name === name
      && command.meta.risk !== 'dangerous',
    );
    if (match) return match;
  }
  return null;
}

function findSiteSetupCommands(
  commands: StudioCommandItem[],
  currentCommand: StudioCommandItem,
): SiteSetupCommand[] {
  const authCommand = findSiteCommand(commands, currentCommand.site, ['auth', 'login'], currentCommand.command);
  const checkCommand = findSiteCommand(commands, currentCommand.site, ['me', 'token-info', 'status'], currentCommand.command);
  const configCommand = findSiteCommand(commands, currentCommand.site, ['config', 'settings', 'setting', 'model'], currentCommand.command);

  return [
    authCommand ? { actionKind: 'auth' as const, command: authCommand } : null,
    checkCommand ? { actionKind: 'check' as const, command: checkCommand } : null,
    configCommand ? { actionKind: 'config' as const, command: configCommand } : null,
  ].filter((item): item is SiteSetupCommand => Boolean(item));
}

function buildSiteSetupAction(
  input: {
    setup: SiteSetupCommand;
    t: TranslateFn | null;
  },
): CommandReadinessAction {
  const { setup, t } = input;
  const runnable = canAutoRunSetupCommand(setup.command);
  const inferredArgs = buildAutomaticArgs(setup.command.args);
  const actionArgs = Object.keys(inferredArgs).length > 0 ? inferredArgs : undefined;

  if (setup.actionKind === 'auth') {
    return {
      id: `auth:${setup.command.command}`,
      kind: 'primary',
      type: runnable ? 'run-command' : 'open-command',
      label: runnable
        ? localizeText(t, 'readiness.action.runAuth', 'Authorize now')
        : localizeText(t, 'readiness.action.openAuth', 'Open authorization'),
      command: setup.command.command,
      args: actionArgs,
    };
  }

  if (setup.actionKind === 'config') {
    return {
      id: `config:${setup.command.command}`,
      kind: 'secondary',
      type: runnable ? 'run-command' : 'open-command',
      label: runnable
        ? localizeText(t, 'readiness.action.runConfig', 'Complete setup')
        : localizeText(t, 'readiness.action.openConfig', 'Open setup command'),
      command: setup.command.command,
      args: actionArgs,
    };
  }

  return {
    id: `check:${setup.command.command}`,
    kind: 'secondary',
    type: runnable ? 'run-command' : 'open-command',
    label: runnable
      ? localizeText(t, 'readiness.action.runCheck', 'Check sign-in')
      : localizeText(t, 'readiness.action.openCheck', 'Open sign-in check'),
    command: setup.command.command,
    args: actionArgs,
  };
}

function pushSiteSetupBullet(
  bullets: string[],
  input: {
    setup: SiteSetupCommand;
    formatCommandLabel: (command: StudioCommandItem) => string;
    t: TranslateFn | null;
  },
): void {
  const { setup, t, formatCommandLabel } = input;
  const label = formatCommandLabel(setup.command);

  if (setup.actionKind === 'auth') {
    pushUnique(
      bullets,
      localizeTextWithParams(
        t,
        'readiness.bullet.siteAuth',
        `You can run "${label}" first to finish authorization.`,
        { value: label },
      ),
    );
    return;
  }

  if (setup.actionKind === 'config') {
    pushUnique(
      bullets,
      localizeTextWithParams(
        t,
        'readiness.bullet.siteConfig',
        `You can use "${label}" to finish the required setup for this site.`,
        { value: label },
      ),
    );
    return;
  }

  pushUnique(
    bullets,
    localizeTextWithParams(
      t,
      'readiness.bullet.siteCheck',
      `You can use "${label}" to confirm the current account or login state.`,
      { value: label },
    ),
  );
}

function buildSiteCommandAction(
  actionKind: SiteSetupCommand['actionKind'],
  commandName: string,
  t: TranslateFn | null,
): CommandReadinessAction {
  if (actionKind === 'auth') {
    return {
      id: `auth:${commandName}`,
      kind: 'primary',
      type: 'open-command',
      label: localizeText(t, 'readiness.action.openAuth', 'Open authorization'),
      command: commandName,
    };
  }

  if (actionKind === 'config') {
    return {
      id: `config:${commandName}`,
      kind: 'secondary',
      type: 'open-command',
      label: localizeText(t, 'readiness.action.openConfig', 'Open setup command'),
      command: commandName,
    };
  }

  return {
    id: `check:${commandName}`,
    kind: 'secondary',
    type: 'open-command',
    label: localizeText(t, 'readiness.action.openCheck', 'Open sign-in check'),
    command: commandName,
  };
}

function addSiteAccessActions(
  actions: CommandReadinessAction[],
  input: {
    siteAccess: StudioSiteAccessEntry;
    currentName: string;
    t: TranslateFn | null;
  },
): void {
  const { siteAccess, currentName, t } = input;

  if (siteAccess.authCommand && !AUTH_COMMAND_NAMES.has(currentName)) {
    pushAction(actions, buildSiteCommandAction('auth', siteAccess.authCommand, t));
  }
  if (siteAccess.checkCommand && !CHECK_COMMAND_NAMES.has(currentName)) {
    pushAction(actions, buildSiteCommandAction('check', siteAccess.checkCommand, t));
  }
  if (siteAccess.configCommand && !CONFIG_COMMAND_NAMES.has(currentName)) {
    pushAction(actions, buildSiteCommandAction('config', siteAccess.configCommand, t));
  }
}

export function buildAvailabilitySummary(readiness: CommandReadiness | null): AvailabilitySummary | null {
  if (!readiness) return null;
  return {
    tone: readiness.tone,
    label: readiness.title,
    detail: selectAvailabilityDetail(readiness),
    action: readiness.actions[0] ?? null,
  };
}

export function buildSiteAccessSummary(input: {
  siteAccess: StudioSiteAccessEntry | null;
  siteLabel?: string;
  t?: TranslateFn;
}): AvailabilitySummary | null {
  const { siteAccess, siteLabel, t = null } = input;
  if (!siteAccess) return null;
  const resolvedSiteLabel = resolveSiteLabel(siteAccess.site, siteLabel);
  const siteParams = { site: resolvedSiteLabel };

  if (siteAccess.state === 'signed_in') {
    return {
      tone: 'success',
      label: localizeTextWithParams(t, 'readiness.siteState.signedIn', `${resolvedSiteLabel} signed in`, siteParams),
      detail: localizeTextWithParams(t, 'readiness.siteDetail.signedIn', `${resolvedSiteLabel} session looks ready.`, siteParams),
      action: null,
    };
  }

  if (siteAccess.state === 'signed_out') {
    return {
      tone: 'warning',
      label: localizeTextWithParams(t, 'readiness.siteState.signedOut', `${resolvedSiteLabel} account not signed in`, siteParams),
      detail: localizeTextWithParams(t, 'readiness.siteDetail.signedOut', `Sign in to ${resolvedSiteLabel} before running dependent commands.`, siteParams),
      action: siteAccess.authCommand
        ? buildSiteCommandAction('auth', siteAccess.authCommand, t)
        : siteAccess.checkCommand
          ? buildSiteCommandAction('check', siteAccess.checkCommand, t)
          : null,
    };
  }

  if (siteAccess.state === 'check_unavailable') {
    return {
      tone: 'info',
      label: localizeTextWithParams(t, 'readiness.siteState.checkUnavailable', `${resolvedSiteLabel} needs sign-in or setup`, siteParams),
      detail: localizeTextWithParams(t, 'readiness.siteDetail.checkUnavailable', `${resolvedSiteLabel} still needs sign-in or setup before some commands can run.`, siteParams),
      action: siteAccess.authCommand
        ? buildSiteCommandAction('auth', siteAccess.authCommand, t)
        : siteAccess.configCommand
          ? buildSiteCommandAction('config', siteAccess.configCommand, t)
          : null,
    };
  }

  if (siteAccess.state === 'browser_blocked') {
    const blocked = buildBrowserBlockedCopy({
      site: siteAccess.site,
      siteLabel,
      reason: siteAccess.reason,
      t,
    });
    return {
      tone: 'error',
      label: blocked.title,
      detail: blocked.detail,
      action: {
        id: `doctor:${siteAccess.site}`,
        kind: 'primary',
        type: 'run-doctor',
        label: localizeText(t, 'readiness.action.runDoctor', 'Run system check'),
      },
    };
  }

  if (siteAccess.state === 'not_required') {
    return {
      tone: 'success',
      label: localizeText(t, 'readiness.siteState.notRequired', 'Direct-run'),
      detail: localizeTextWithParams(t, 'readiness.siteDetail.notRequired', `${resolvedSiteLabel} does not need a browser sign-in check.`, siteParams),
      action: null,
    };
  }

  return {
    tone: 'warning',
    label: localizeTextWithParams(t, 'readiness.siteState.error', `${resolvedSiteLabel} check failed`, siteParams),
    detail: siteAccess.reason || localizeTextWithParams(t, 'readiness.siteDetail.error', `${resolvedSiteLabel} session could not be verified automatically.`, siteParams),
    action: siteAccess.checkCommand
      ? buildSiteCommandAction('check', siteAccess.checkCommand, t)
      : null,
  };
}

function findRelatedExternalCli(
  command: StudioCommandItem,
  externalClis: StudioExternalCliEntry[],
): StudioExternalCliEntry | null {
  const site = command.site.toLowerCase();
  const strategy = command.strategy.toLowerCase();
  const description = `${command.command} ${command.description || ''}`.toLowerCase();

  return externalClis.find((entry) => {
    if (entry.installed) return false;
    const tags = entry.tags.map((tag) => tag.toLowerCase());
    const names = [entry.name, entry.binary]
      .map((value) => value.toLowerCase().trim())
      .filter((value, index, values) => value && values.indexOf(value) === index);

    return entry.name.toLowerCase() === site
      || entry.binary.toLowerCase() === site
      || tags.includes(site)
      || tags.includes(strategy)
      || site.includes(entry.name.toLowerCase())
      || names.some((name) => description.includes(name));
  }) ?? null;
}

export function buildCommandReadiness(input: {
  command: StudioCommandItem | null;
  doctor: StudioDoctorResult | null;
  siteAccess?: StudioSiteAccessEntry | null;
  siteLabel?: string;
  plugins: StudioPluginEntry[];
  externalClis: StudioExternalCliEntry[];
  registryCommands: StudioCommandItem[];
  formatCommandLabel?: (command: StudioCommandItem) => string;
  t?: TranslateFn;
}): CommandReadiness | null {
  const {
    command,
    doctor,
    siteAccess = null,
    siteLabel,
    plugins,
    externalClis,
    registryCommands,
    formatCommandLabel = (item) => item.description || item.command,
    t = null,
  } = input;
  if (!command) return null;

  const bullets: string[] = [];
  const actions: CommandReadinessAction[] = [];
  let tone: CommandReadiness['tone'] = 'success';
  let title = localizeText(t, 'readiness.ready', 'Ready to run');

  const relatedExternalCli = findRelatedExternalCli(command, externalClis);
  const siteSetupCommands = findSiteSetupCommands(registryCommands, command);
  const currentName = command.name.toLowerCase();
  const isAuthCommand = AUTH_COMMAND_NAMES.has(currentName);
  const isCheckCommand = CHECK_COMMAND_NAMES.has(currentName);
  const isConfigCommand = CONFIG_COMMAND_NAMES.has(currentName);
  const resolvedSiteLabel = resolveSiteLabel(command.site, siteLabel);
  const siteParams = { site: resolvedSiteLabel };

  if (command.meta.mode === 'public') {
    pushUnique(bullets, localizeText(t, 'readiness.bullet.public', 'This command can run directly in the current shell.'));
  }

  if (command.meta.mode === 'desktop') {
    tone = 'info';
    title = localizeText(t, 'readiness.title.desktop', 'Open the desktop app first');
    pushUnique(bullets, localizeText(t, 'readiness.bullet.desktop', 'Open the desktop app and make sure the account is already signed in.'));
  }

  if (command.meta.mode === 'browser') {
    pushUnique(
      bullets,
      localizeText(
        t,
        'readiness.bullet.browser.needsSignin',
        'This command depends on the browser connection, extension, and a signed-in site session.',
      ),
    );

    if (!doctor) {
      tone = 'warning';
      title = selectBrowserTitle({ doctor, t });
      pushUnique(bullets, localizeText(t, 'readiness.bullet.browser.unchecked', 'Run the system check once before you start.'));
      pushAction(actions, {
        id: 'run-doctor',
        kind: 'primary',
        type: 'run-doctor',
        label: localizeText(t, 'readiness.action.runDoctor', 'Run system check'),
      });
      pushAction(actions, {
        id: 'open-ops',
        kind: 'secondary',
        type: 'open-ops',
        label: localizeText(t, 'readiness.action.openOps', 'Open Checks'),
      });
    } else {
      const blockingIssues: string[] = [];
      if (doctor.daemonRunning === false) {
        blockingIssues.push(localizeText(t, 'readiness.bullet.browser.daemonOffline', 'The local browser service is offline.'));
      }
      if (doctor.extensionConnected === false) {
        blockingIssues.push(localizeText(t, 'readiness.bullet.browser.extensionDisconnected', 'The browser extension is not connected.'));
      }
      if (doctor.connectivity && !doctor.connectivity.ok) {
        const connectivityError = doctor.connectivity.error || 'Unknown error';
        blockingIssues.push(
          localizeTextWithParams(
            t,
            'readiness.bullet.browser.connectivityFailed',
            `Browser connection test failed: ${connectivityError}`,
            { value: connectivityError },
          ),
        );
      }

      if (blockingIssues.length > 0) {
        tone = 'error';
        title = selectBrowserTitle({ doctor, t });
        for (const issue of blockingIssues) {
          pushUnique(bullets, issue);
        }
        pushAction(actions, {
          id: 'run-doctor',
          kind: 'primary',
          type: 'run-doctor',
          label: localizeText(t, 'readiness.action.runDoctor', 'Run system check'),
        });
        pushAction(actions, {
          id: 'open-ops',
          kind: 'secondary',
          type: 'open-ops',
          label: localizeText(t, 'readiness.action.openOps', 'Open Checks'),
        });
      } else if (doctor.sessions && doctor.sessions.length === 0) {
        tone = 'warning';
        title = localizeText(t, 'readiness.title.browser.noSessions', 'No signed-in browser window found');
        pushUnique(bullets, localizeText(t, 'readiness.bullet.browser.noSessions', 'No usable signed-in browser window was found.'));
        pushAction(actions, {
          id: 'open-ops',
          kind: 'secondary',
          type: 'open-ops',
          label: localizeText(t, 'readiness.action.openOps', 'Open Checks'),
        });
      } else {
        const siteNeedsAttention = siteAccess && siteAccess.state !== 'signed_in' && siteAccess.state !== 'not_required';
        if (!siteNeedsAttention) {
          pushUnique(bullets, localizeText(t, 'readiness.bullet.browser.healthy', 'Browser connection is ready.'));
        }
        if (!isAuthCommand && !isCheckCommand && !isConfigCommand && siteAccess?.state === 'signed_in') {
          pushUnique(
            bullets,
            localizeTextWithParams(t, 'readiness.bullet.siteSignedIn', `${resolvedSiteLabel} sign-in looks healthy.`, siteParams),
          );
        }
      }
    }
  }

  if (command.meta.surface === 'plugin') {
    const plugin = plugins.find((entry) => entry.name === command.site);
    if (!plugin) {
      tone = tone === 'error' ? tone : 'warning';
      title = tone === 'error' ? title : localizeText(t, 'readiness.title.plugin.untracked', 'Check plugin status');
      pushUnique(bullets, localizeText(t, 'readiness.bullet.plugin.untracked', 'This command is from a plugin that is not in the current inventory.'));
      pushAction(actions, {
        id: 'open-ops',
        kind: 'secondary',
        type: 'open-ops',
        label: localizeText(t, 'readiness.action.openOps', 'Open Checks'),
      });
    } else {
      if (plugin.registeredCommandCount < plugin.declaredCommandCount) {
        tone = tone === 'error' ? tone : 'warning';
        title = tone === 'error' ? title : localizeText(t, 'readiness.title.plugin.incomplete', 'Check plugin status');
        pushUnique(
          bullets,
          localizeTextWithParams(
            t,
            'readiness.bullet.plugin.coverage',
            `Plugin registered ${plugin.registeredCommandCount} of ${plugin.declaredCommandCount} declared commands.`,
            {
              registered: plugin.registeredCommandCount,
              declared: plugin.declaredCommandCount,
            },
          ),
        );
        pushAction(actions, {
          id: 'open-ops',
          kind: 'secondary',
          type: 'open-ops',
          label: localizeText(t, 'readiness.action.openOps', 'Open Checks'),
        });
      }
      if (plugin.sourceKind === 'local') {
        if (tone === 'success') {
          tone = 'info';
          title = localizeText(t, 'readiness.title.plugin.local', 'Check local plugin status');
        }
        pushUnique(bullets, localizeText(t, 'readiness.bullet.plugin.local', 'This plugin uses a local path and may be out of sync.'));
      }
    }
  }

  if (relatedExternalCli) {
    if (tone === 'success') {
      tone = 'warning';
      title = localizeTextWithParams(
        t,
        'readiness.title.external.installSpecific',
        `Install "${relatedExternalCli.name}" first`,
        { value: relatedExternalCli.name },
      );
    }
    pushUnique(
      bullets,
      localizeTextWithParams(
        t,
        'readiness.bullet.external.missing',
        `This command depends on "${relatedExternalCli.name}", which is not installed in the current environment.`,
        { value: relatedExternalCli.name },
      ),
    );

    if (relatedExternalCli.installAvailable) {
      pushAction(actions, {
        id: `install:${relatedExternalCli.name}`,
        kind: 'primary',
        type: 'install-external',
        label: localizeText(t, 'readiness.action.installDependency', 'Install dependency'),
        externalName: relatedExternalCli.name,
      });
    } else {
      pushUnique(
        bullets,
        localizeText(
          t,
          'readiness.bullet.external.manual',
          'Auto-install is not available for this dependency. Open the homepage for setup steps.',
        ),
      );
    }

    if (relatedExternalCli.installCommand) {
      pushAction(actions, {
        id: `copy-install:${relatedExternalCli.name}`,
        kind: 'secondary',
        type: 'copy-text',
        label: localizeText(t, 'ops.copyInstall', 'Copy install command'),
        text: relatedExternalCli.installCommand,
      });
    }

    if (relatedExternalCli.homepage) {
      pushAction(actions, {
        id: `homepage:${relatedExternalCli.name}`,
        kind: 'secondary',
        type: 'open-url',
        label: localizeText(t, 'readiness.action.openInstallGuide', 'Open install guide'),
        url: relatedExternalCli.homepage,
      });
    }
  }

  if (command.meta.mode === 'browser') {
    if (tone === 'success' && isAuthCommand) {
      tone = 'info';
      title = localizeTextWithParams(t, 'readiness.title.site.authEntry', `${resolvedSiteLabel} authorization command`, siteParams);
      pushUnique(bullets, localizeTextWithParams(t, 'readiness.bullet.siteAuthEntry', `Use this command to sign in or authorize ${resolvedSiteLabel}.`, siteParams));
    } else if (tone === 'success' && isCheckCommand) {
      tone = 'info';
      title = localizeTextWithParams(t, 'readiness.title.site.checkEntry', `${resolvedSiteLabel} sign-in check command`, siteParams);
      pushUnique(bullets, localizeTextWithParams(t, 'readiness.bullet.siteCheckEntry', `Use this command to confirm the current account or sign-in state for ${resolvedSiteLabel}.`, siteParams));
    } else if (tone === 'success' && isConfigCommand) {
      tone = 'info';
      title = localizeTextWithParams(t, 'readiness.title.site.configEntry', `${resolvedSiteLabel} setup command`, siteParams);
      pushUnique(bullets, localizeTextWithParams(t, 'readiness.bullet.siteConfigEntry', `Use this command to complete the setup for ${resolvedSiteLabel} before running dependent commands.`, siteParams));
    } else if (siteAccess?.state === 'browser_blocked') {
      const blocked = buildBrowserBlockedCopy({
        site: command.site,
        siteLabel: resolvedSiteLabel,
        reason: siteAccess.reason,
        t,
      });
      tone = 'error';
      title = blocked.title;
      pushUnique(bullets, blocked.detail);
      pushAction(actions, {
        id: 'run-doctor',
        kind: 'primary',
        type: 'run-doctor',
        label: localizeText(t, 'readiness.action.runDoctor', 'Run system check'),
      });
      pushAction(actions, {
        id: 'open-ops',
        kind: 'secondary',
        type: 'open-ops',
        label: localizeText(t, 'readiness.action.openOps', 'Open Checks'),
      });
    } else if (siteAccess?.state === 'signed_out') {
      tone = tone === 'error' ? tone : 'warning';
      if (tone !== 'error') {
        title = localizeTextWithParams(t, 'readiness.title.site.signedOut', `${resolvedSiteLabel} account not signed in`, siteParams);
      }
      pushUnique(
        bullets,
        localizeTextWithParams(t, 'readiness.bullet.siteSignedOut', `No active sign-in was found for ${resolvedSiteLabel}.`, siteParams),
      );
      addSiteAccessActions(actions, { siteAccess, currentName, t });
    } else if (siteAccess?.state === 'check_unavailable') {
      if (tone === 'success') {
        tone = 'info';
        title = localizeTextWithParams(t, 'readiness.title.site.checkUnavailable', `${resolvedSiteLabel} needs sign-in or setup`, siteParams);
      }
      pushUnique(
        bullets,
        localizeTextWithParams(t, 'readiness.bullet.siteCheckUnavailable', `${resolvedSiteLabel} still needs sign-in or setup before some commands can run.`, siteParams),
      );
      addSiteAccessActions(actions, { siteAccess, currentName, t });
    } else if (siteAccess?.state === 'error') {
      if (tone === 'success') {
        tone = 'warning';
        title = localizeTextWithParams(t, 'readiness.title.site.error', `${resolvedSiteLabel} sign-in check failed`, siteParams);
      }
      pushUnique(
        bullets,
        siteAccess.reason
          ? localizeTextWithParams(
            t,
            'readiness.bullet.siteError',
            `${resolvedSiteLabel} sign-in could not be verified automatically: ${siteAccess.reason}`,
            { ...siteParams, value: siteAccess.reason },
          )
          : localizeTextWithParams(t, 'readiness.bullet.siteErrorFallback', `${resolvedSiteLabel} sign-in could not be verified automatically.`, siteParams),
      );
      addSiteAccessActions(actions, { siteAccess, currentName, t });
    } else if (!siteAccess) {
      for (const setup of siteSetupCommands) {
        if (setup.actionKind === 'auth' && isAuthCommand) continue;
        if (setup.actionKind === 'check' && isCheckCommand) continue;
        if (setup.actionKind === 'config' && isConfigCommand) continue;
        pushSiteSetupBullet(bullets, { setup, formatCommandLabel, t });
        pushAction(actions, buildSiteSetupAction({ setup, t }));
      }

      if (tone === 'success' && siteSetupCommands.length > 0) {
        const preferredSetup = siteSetupCommands[0];
        tone = 'info';
        if (preferredSetup.actionKind === 'auth') {
          title = localizeTextWithParams(t, 'readiness.title.site.auth', `${resolvedSiteLabel} authorization required`, siteParams);
        } else if (preferredSetup.actionKind === 'config') {
          title = localizeTextWithParams(t, 'readiness.title.site.config', `${resolvedSiteLabel} setup required`, siteParams);
        } else {
          title = localizeTextWithParams(t, 'readiness.title.site.check', `${resolvedSiteLabel} sign-in check required`, siteParams);
        }
      }
    } else if (siteAccess.state === 'signed_in' && tone === 'success') {
      title = localizeTextWithParams(t, 'readiness.title.site.signedIn', `${resolvedSiteLabel} signed in and ready`, siteParams);
    }
  }

  return {
    tone,
    title,
    bullets,
    actions,
  };
}
