import { describe, expect, it } from 'vitest';
import { Strategy, type CliCommand } from '../registry.js';
import { buildStudioCommandMeta, buildStudioRegistry } from './metadata.js';

function makeCommand(overrides: Partial<CliCommand>): CliCommand {
  return {
    site: 'studio-test',
    name: 'sample',
    description: 'sample command',
    args: [],
    ...overrides,
  };
}

describe('buildStudioCommandMeta', () => {
  it('classifies read-oriented browser discovery commands as safe insights surfaces', () => {
    const meta = buildStudioCommandMeta(makeCommand({
      site: 'bilibili',
      name: 'hot',
      strategy: Strategy.COOKIE,
      browser: true,
    }));

    expect(meta.mode).toBe('browser');
    expect(meta.capability).toBe('discovery');
    expect(meta.risk).toBe('safe');
    expect(meta.uiHints.supportsCharts).toBe(true);
  });

  it('classifies public search commands as searchable list surfaces', () => {
    const meta = buildStudioCommandMeta(makeCommand({
      site: 'google',
      name: 'trends',
      strategy: Strategy.PUBLIC,
      browser: false,
    }));

    expect(meta.mode).toBe('public');
    expect(meta.capability).toBe('discovery');
    expect(meta.uiHints.supportsLists).toBe(true);
  });

  it('marks write actions as confirmation-required', () => {
    const meta = buildStudioCommandMeta(makeCommand({
      site: 'douyin',
      name: 'publish',
      strategy: Strategy.COOKIE,
      browser: true,
    }));

    expect(meta.capability).toBe('action');
    expect(meta.risk).toBe('confirm');
  });

  it('marks destructive actions as dangerous', () => {
    const meta = buildStudioCommandMeta(makeCommand({
      site: 'douyin',
      name: 'delete',
      strategy: Strategy.COOKIE,
      browser: true,
    }));

    expect(meta.capability).toBe('action');
    expect(meta.risk).toBe('dangerous');
  });
});

describe('buildStudioRegistry', () => {
  it('sorts commands and includes command-level metadata', () => {
    const commands = [
      makeCommand({ site: 'reddit', name: 'search', strategy: Strategy.COOKIE, browser: true }),
      makeCommand({ site: 'bilibili', name: 'hot', strategy: Strategy.COOKIE, browser: true }),
    ];

    const registry = buildStudioRegistry(commands);

    expect(registry.commands.map((item) => item.command)).toEqual([
      'bilibili/hot',
      'reddit/search',
    ]);
    expect(registry.sites).toEqual([
      { site: 'bilibili', commandCount: 1 },
      { site: 'reddit', commandCount: 1 },
    ]);
  });
});
