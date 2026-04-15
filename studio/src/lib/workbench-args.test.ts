import { describe, expect, it } from 'vitest';
import { buildWorkbenchArgUi, inferWorkbenchFieldKind } from './workbench-args';
import type { StudioCommandArg } from '../types';

function makeArg(overrides: Partial<StudioCommandArg>): StudioCommandArg {
  return {
    name: 'query',
    ...overrides,
  };
}

describe('inferWorkbenchFieldKind', () => {
  it('prefers select controls when choices are available', () => {
    expect(inferWorkbenchFieldKind(makeArg({
      name: 'type',
      choices: ['video', 'user'],
    }))).toBe('select');
  });

  it('detects numeric and boolean controls from the arg metadata', () => {
    expect(inferWorkbenchFieldKind(makeArg({
      name: 'limit',
      type: 'int',
      default: 20,
    }))).toBe('number');

    expect(inferWorkbenchFieldKind(makeArg({
      name: 'execute',
      type: 'boolean',
      default: false,
    }))).toBe('boolean');
  });
});

describe('buildWorkbenchArgUi', () => {
  it('returns localized labels, hints, and placeholders for common text inputs', () => {
    const ui = buildWorkbenchArgUi('google/search', makeArg({
      name: 'query',
      required: true,
    }), 'zh-CN');

    expect(ui.kind).toBe('text');
    expect(ui.label).toBe('搜索关键词');
    expect(ui.hint).toBe('输入你要搜索的关键词，尽量具体。');
    expect(ui.placeholder).toBe('输入想查找的关键词');
  });

  it('falls back to the raw help text in Chinese when no localized hint is available', () => {
    const ui = buildWorkbenchArgUi('spotify/play', makeArg({
      name: 'device',
      type: 'str',
      help: 'Device name to target when multiple players are available.',
      required: true,
    }), 'zh-CN');

    expect(ui.kind).toBe('text');
    expect(ui.label).toBe('Device');
    expect(ui.hint).toBe('Device name to target when multiple players are available.');
    expect(ui.placeholder).toBe('填写Device');
  });

  it('builds select options with localized labels for creator-facing commands', () => {
    const ui = buildWorkbenchArgUi('youtube/search', makeArg({
      name: 'type',
      type: 'str',
      choices: ['shorts', 'video', 'channel', 'playlist'],
    }), 'zh-CN');

    expect(ui.kind).toBe('select');
    expect(ui.label).toBe('内容类型');
    expect(ui.options).toEqual([
      { value: 'shorts', label: 'Shorts 短视频' },
      { value: 'video', label: '视频' },
      { value: 'channel', label: '频道' },
      { value: 'playlist', label: '播放列表' },
    ]);
    expect(ui.placeholder).toBe('请选择内容类型');
  });

  it('keeps large select lists readable and localized in English too', () => {
    const ui = buildWorkbenchArgUi('producthunt/posts', makeArg({
      name: 'category',
      type: 'string',
      choices: [
        'ai-agents',
        'developer-tools',
        'productivity',
        'design-creative',
        'marketing-sales',
        'engineering-development',
      ],
    }), 'en-US');

    expect(ui.kind).toBe('select');
    expect(ui.hint).toBe('Use a category to filter out unrelated products.');
    expect(ui.options[0]).toEqual({ value: 'ai-agents', label: 'AI Agents' });
    expect(ui.options[1]).toEqual({ value: 'developer-tools', label: 'Developer tools' });
  });

  it('localizes special command-specific enum values', () => {
    const ui = buildWorkbenchArgUi('ones/my-tasks', makeArg({
      name: 'mode',
      type: 'str',
      choices: ['assign', 'field004', 'owner', 'both'],
    }), 'zh-CN');

    expect(ui.options.map((option) => option.label)).toEqual([
      '指派给我',
      '负责人字段',
      '我创建的',
      '两者都算',
    ]);
  });

  it('disables single-choice selects so the user does not have to touch them', () => {
    const ui = buildWorkbenchArgUi('tieba/search', makeArg({
      name: 'page',
      type: 'int',
      choices: ['1'],
    }), 'zh-CN');

    expect(ui.disabled).toBe(true);
    expect(ui.placeholder).toBe('1');
  });
});
