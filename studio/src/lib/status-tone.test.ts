import { describe, expect, it } from 'vitest';
import { buildStatusAriaLabel, buildStatusTone } from './status-tone';

describe('buildStatusTone', () => {
  it('keeps success availability as success when no extra confirmation is needed', () => {
    expect(buildStatusTone({
      availability: {
        tone: 'success',
        label: 'Ready',
        detail: 'Everything looks good.',
        action: null,
      },
      risk: 'safe',
    })).toEqual({
      tone: 'success',
      label: 'Ready',
      detail: 'Everything looks good.',
      blocking: false,
    });
  });

  it('escalates actionable warning and info states to error for blocking UI presentation', () => {
    expect(buildStatusTone({
      availability: {
        tone: 'warning',
        label: 'Sign-in required',
        detail: 'Open login first.',
        action: {
          id: 'login',
          kind: 'primary',
          type: 'open-command',
          label: 'Open login',
          command: 'bilibili/auth',
        },
      },
      risk: 'safe',
    }).tone).toBe('error');

    expect(buildStatusTone({
      availability: {
        tone: 'info',
        label: 'Setup required',
        detail: 'Finish setup first.',
        action: {
          id: 'config',
          kind: 'secondary',
          type: 'open-command',
          label: 'Open setup',
          command: 'x/config',
        },
      },
      risk: 'safe',
    }).tone).toBe('error');
  });

  it('falls back to risk-based status when no availability summary exists', () => {
    expect(buildStatusTone({ risk: 'confirm' }).tone).toBe('warning');
    expect(buildStatusTone({ risk: 'dangerous' }).tone).toBe('error');
    expect(buildStatusTone({ risk: 'safe' }).tone).toBe('success');
  });
});

describe('buildStatusAriaLabel', () => {
  it('combines subject, label, and detail for accessible names', () => {
    expect(buildStatusAriaLabel({
      tone: 'warning',
      label: 'Needs confirmation',
      detail: 'Studio will ask before running.',
      blocking: false,
    }, 'B站热视频')).toBe('B站热视频 · Needs confirmation. Studio will ask before running.');
  });
});
