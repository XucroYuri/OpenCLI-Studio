import type { AvailabilitySummary, TranslateFn } from './readiness';
import type { StudioRisk } from '../types';

export type StatusTone = 'success' | 'info' | 'warning' | 'error';

export interface StatusToneState {
  tone: StatusTone;
  label: string;
  detail: string | null;
  blocking: boolean;
}

function localizeText(t: TranslateFn | null, key: string, fallback: string): string {
  if (!t) return fallback;
  return t(key);
}

export function buildStatusTone(input: {
  availability?: AvailabilitySummary | null;
  risk: StudioRisk;
  t?: TranslateFn | null;
}): StatusToneState {
  const { availability = null, risk, t = null } = input;

  if (availability) {
    const blocking = availability.tone === 'error'
      || (availability.tone === 'warning' && Boolean(availability.action))
      || (availability.tone === 'info' && Boolean(availability.action));

    if (blocking) {
      return {
        tone: 'error',
        label: availability.label,
        detail: availability.detail,
        blocking: true,
      };
    }

    if (availability.tone === 'warning') {
      return {
        tone: 'warning',
        label: availability.label,
        detail: availability.detail,
        blocking: false,
      };
    }

    if (availability.tone === 'info') {
      return {
        tone: 'info',
        label: availability.label,
        detail: availability.detail,
        blocking: false,
      };
    }

    if (risk === 'dangerous') {
      return {
        tone: 'error',
        label: localizeText(t, 'statusTone.dangerous', 'High-risk command'),
        detail: localizeText(t, 'statusTone.dangerousDetail', 'This item performs risky changes or destructive actions.'),
        blocking: true,
      };
    }

    if (risk === 'confirm') {
      return {
        tone: 'warning',
        label: localizeText(t, 'statusTone.confirm', 'Needs confirmation'),
        detail: localizeText(t, 'statusTone.confirmDetail', 'This item can run, but Studio will ask for confirmation first.'),
        blocking: false,
      };
    }

    return {
      tone: 'success',
      label: availability.label,
      detail: availability.detail,
      blocking: false,
    };
  }

  if (risk === 'dangerous') {
    return {
      tone: 'error',
      label: localizeText(t, 'statusTone.dangerous', 'High-risk command'),
      detail: localizeText(t, 'statusTone.dangerousDetail', 'This item performs risky changes or destructive actions.'),
      blocking: true,
    };
  }

  if (risk === 'confirm') {
    return {
      tone: 'warning',
      label: localizeText(t, 'statusTone.confirm', 'Needs confirmation'),
      detail: localizeText(t, 'statusTone.confirmDetail', 'This item can run, but Studio will ask for confirmation first.'),
      blocking: false,
    };
  }

  return {
    tone: 'success',
    label: localizeText(t, 'statusTone.ready', 'Ready to run'),
    detail: localizeText(t, 'statusTone.readyDetail', 'This item looks ready in the current workspace.'),
    blocking: false,
  };
}

export function buildStatusAriaLabel(status: StatusToneState, subject?: string): string {
  const prefix = subject?.trim();
  if (prefix && status.detail) {
    return `${prefix} · ${status.label}. ${status.detail}`;
  }
  if (prefix) {
    return `${prefix} · ${status.label}`;
  }
  return status.detail ? `${status.label}. ${status.detail}` : status.label;
}
