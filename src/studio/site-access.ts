import { Strategy, fullName, type CliCommand } from '../registry.js';
import type { StudioDoctorResult, StudioSiteAccessEntry } from './types.js';

const AUTH_COMMAND_NAMES = ['auth', 'login'];
const CHECK_COMMAND_NAMES = ['me', 'token-info', 'status'];
const CONFIG_COMMAND_NAMES = ['config', 'settings', 'setting', 'model'];

const AUTH_ERROR_PATTERNS = [
  /auth required/i,
  /not logged/i,
  /login/i,
  /log in/i,
  /sign in/i,
  /unauthori[sz]ed/i,
  /forbidden/i,
  /session/i,
  /cookie/i,
  /expired/i,
  /请先登录/,
  /未登录/,
  /需要登录/,
  /登录后/,
  /账号登录/,
  /扫码登录/,
];
const AUTH_SUCCESS_PATTERNS = [
  /\blogged in\b/i,
  /\bsigned in\b/i,
  /login success/i,
  /login successful/i,
  /sign-in success/i,
  /sign-in successful/i,
  /signed in as/i,
  /authenticated/i,
  /authorized/i,
  /已登录/,
  /登录成功/,
  /授权成功/,
];

function isBrowserCommand(command: CliCommand): boolean {
  const strategy = command.strategy ?? (command.browser === false ? Strategy.PUBLIC : Strategy.COOKIE);
  return command.browser !== false && strategy !== Strategy.PUBLIC;
}

function findSiteCommand(commands: CliCommand[], site: string, names: string[]): CliCommand | null {
  for (const name of names) {
    const match = commands.find((command) =>
      command.site === site
      && command.name === name,
    );
    if (match) return match;
  }
  return null;
}

function needsManualInput(command: CliCommand | null): boolean {
  if (!command) return false;
  return command.args.some((arg) =>
    arg.required
    && arg.default === undefined
    && (arg.choices?.length ?? 0) !== 1,
  );
}

function buildProbeArgs(command: CliCommand): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const arg of command.args) {
    if (arg.default !== undefined) {
      args[arg.name] = arg.default;
      continue;
    }

    if ((arg.choices?.length ?? 0) === 1) {
      args[arg.name] = arg.choices?.[0];
    }
  }
  return args;
}

function doctorBlocksBrowser(doctor: StudioDoctorResult | null): boolean {
  if (!doctor) return true;
  if (doctor.daemonRunning === false) return true;
  if (doctor.extensionConnected === false) return true;
  if (doctor.connectivity && !doctor.connectivity.ok) return true;
  if (Array.isArray(doctor.sessions) && doctor.sessions.length === 0) return true;
  return false;
}

function inferAuthStateFromString(value: string): 'signed_in' | 'signed_out' | 'error' {
  const normalized = value.trim();
  if (!normalized) return 'error';
  if (AUTH_SUCCESS_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return 'signed_in';
  }
  if (AUTH_ERROR_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return 'signed_out';
  }
  return 'signed_in';
}

function hasTruthyIdentityField(value: Record<string, unknown>): boolean {
  const keys = ['id', 'uid', 'user', 'userId', 'username', 'nickname', 'name', 'email', 'account', 'profile', 'token'];
  return keys.some((key) => {
    const current = value[key];
    return current !== undefined && current !== null && current !== '';
  });
}

function inferAuthStateFromObject(value: Record<string, unknown>): 'signed_in' | 'signed_out' | 'error' {
  const truthyKeys = ['loggedIn', 'isLoggedIn', 'authenticated', 'authorized', 'signedIn'];
  const falsyKeys = truthyKeys;
  for (const key of truthyKeys) {
    if (value[key] === true) return 'signed_in';
  }
  for (const key of falsyKeys) {
    if (value[key] === false) return 'signed_out';
  }

  const statusValue = value.status;
  if (typeof statusValue === 'string') {
    const inferred = inferAuthStateFromString(statusValue);
    if (inferred !== 'error') return inferred;
  }

  const messageValue = value.message;
  if (typeof messageValue === 'string') {
    const inferred = inferAuthStateFromString(messageValue);
    if (inferred !== 'error') return inferred;
  }

  if ('ok' in value && value.ok === false) {
    return typeof messageValue === 'string' && AUTH_ERROR_PATTERNS.some((pattern) => pattern.test(messageValue))
      ? 'signed_out'
      : 'error';
  }

  if (hasTruthyIdentityField(value)) {
    return 'signed_in';
  }

  return Object.keys(value).length > 0 ? 'signed_in' : 'error';
}

function inferAuthStateFromResult(result: unknown): 'signed_in' | 'signed_out' | 'error' {
  if (result === undefined || result === null) return 'error';
  if (typeof result === 'boolean') return result ? 'signed_in' : 'signed_out';
  if (typeof result === 'string') return inferAuthStateFromString(result);
  if (Array.isArray(result)) return 'signed_in';
  if (typeof result === 'object') return inferAuthStateFromObject(result as Record<string, unknown>);
  return 'signed_in';
}

function inferAuthStateFromError(error: unknown): { state: 'signed_out' | 'error'; reason: string } {
  const reason = error instanceof Error ? error.message : String(error);
  if (AUTH_ERROR_PATTERNS.some((pattern) => pattern.test(reason))) {
    return { state: 'signed_out', reason };
  }
  return { state: 'error', reason };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;

  async function run(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => run());
  await Promise.all(workers);
  return results;
}

export async function buildSiteAccessEntries(input: {
  sites: string[];
  commands: CliCommand[];
  doctor: (options?: { live?: boolean; sessions?: boolean }) => Promise<StudioDoctorResult>;
  execute: (command: CliCommand, args: Record<string, unknown>) => Promise<unknown>;
}): Promise<{ doctor: StudioDoctorResult | null; entries: StudioSiteAccessEntry[] }> {
  const requestedSites = [...new Set(input.sites.filter(Boolean))];
  const commandsBySite = new Map<string, CliCommand[]>();

  for (const command of input.commands) {
    const existing = commandsBySite.get(command.site);
    if (existing) {
      existing.push(command);
    } else {
      commandsBySite.set(command.site, [command]);
    }
  }

  const browserSites = requestedSites.filter((site) =>
    (commandsBySite.get(site) ?? []).some((command) => isBrowserCommand(command)),
  );
  const doctorResult = browserSites.length > 0
    ? await input.doctor({ live: true, sessions: true })
    : null;

  const entries = await mapWithConcurrency(requestedSites, 4, async (site): Promise<StudioSiteAccessEntry> => {
    const siteCommands = commandsBySite.get(site) ?? [];
    const browserRequired = siteCommands.some((command) => isBrowserCommand(command));
    const authCommand = findSiteCommand(siteCommands, site, AUTH_COMMAND_NAMES);
    const checkCommand = findSiteCommand(siteCommands, site, CHECK_COMMAND_NAMES);
    const configCommand = findSiteCommand(siteCommands, site, CONFIG_COMMAND_NAMES);
    const checkedAt = new Date().toISOString();

    if (!browserRequired) {
      return {
        site,
        browserRequired,
        state: 'not_required',
        authCommand: authCommand ? fullName(authCommand) : null,
        checkCommand: checkCommand ? fullName(checkCommand) : null,
        configCommand: configCommand ? fullName(configCommand) : null,
        reason: null,
        checkedAt,
      };
    }

    if (doctorBlocksBrowser(doctorResult)) {
      return {
        site,
        browserRequired,
        state: 'browser_blocked',
        authCommand: authCommand ? fullName(authCommand) : null,
        checkCommand: checkCommand ? fullName(checkCommand) : null,
        configCommand: configCommand ? fullName(configCommand) : null,
        reason: doctorResult?.issues?.[0] ?? null,
        checkedAt,
      };
    }

    if (!checkCommand || needsManualInput(checkCommand)) {
      return {
        site,
        browserRequired,
        state: 'check_unavailable',
        authCommand: authCommand ? fullName(authCommand) : null,
        checkCommand: checkCommand ? fullName(checkCommand) : null,
        configCommand: configCommand ? fullName(configCommand) : null,
        reason: null,
        checkedAt,
      };
    }

    try {
      const result = await input.execute(checkCommand, buildProbeArgs(checkCommand));
      const state = inferAuthStateFromResult(result);
      return {
        site,
        browserRequired,
        state,
        authCommand: authCommand ? fullName(authCommand) : null,
        checkCommand: fullName(checkCommand),
        configCommand: configCommand ? fullName(configCommand) : null,
        reason: null,
        checkedAt,
      };
    } catch (error) {
      const inferred = inferAuthStateFromError(error);
      return {
        site,
        browserRequired,
        state: inferred.state,
        authCommand: authCommand ? fullName(authCommand) : null,
        checkCommand: fullName(checkCommand),
        configCommand: configCommand ? fullName(configCommand) : null,
        reason: inferred.reason,
        checkedAt,
      };
    }
  });

  return {
    doctor: doctorResult,
    entries,
  };
}
