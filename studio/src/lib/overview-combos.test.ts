import { describe, expect, it } from 'vitest';
import {
  buildOverviewComboMergedResult,
  listOverviewCombos,
  type OverviewComboRunOutcome,
} from './overview-combos';
import type { ExecuteResponse, StudioCommandItem } from '../types';

function buildCommand(
  command: string,
  input: Partial<StudioCommandItem> = {},
): StudioCommandItem {
  const [site, name] = command.split('/');
  return {
    command,
    site,
    name,
    description: command,
    args: [],
    browser: false,
    strategy: 'test',
    meta: {
      surface: 'builtin',
      mode: 'public',
      capability: 'discovery',
      risk: 'safe',
      uiHints: {
        supportsLists: true,
        supportsDetails: true,
        supportsCharts: false,
        supportsTimeSeries: false,
      },
      market: 'domestic',
      siteCategory: 'social',
    },
    ...input,
  };
}

function buildResponse(command: string, result: unknown): ExecuteResponse {
  return {
    command,
    result,
    historyEntry: {
      id: 1,
      command,
      site: command.split('/')[0] ?? 'unknown',
      name: command,
      status: 'success',
      args: {},
      result,
      error: null,
      startedAt: '2026-04-15T10:00:00.000Z',
      finishedAt: '2026-04-15T10:00:01.000Z',
      durationMs: 1000,
    },
  };
}

describe('listOverviewCombos', () => {
  it('keeps combo order and only includes available safe commands', () => {
    const combos = listOverviewCombos([
      buildCommand('bilibili/ranking'),
      buildCommand('weibo/hot'),
      buildCommand('zhihu/hot'),
      buildCommand('douyin/hashtag', {
        meta: {
          ...buildCommand('douyin/hashtag').meta,
          mode: 'browser',
        },
      }),
      buildCommand('reddit/popular', {
        meta: {
          ...buildCommand('reddit/popular').meta,
          market: 'international',
        },
      }),
      buildCommand('producthunt/hot', {
        meta: {
          ...buildCommand('producthunt/hot').meta,
          market: 'international',
        },
      }),
      buildCommand('pixiv/ranking', {
        meta: {
          ...buildCommand('pixiv/ranking').meta,
          market: 'international',
        },
      }),
      buildCommand('imdb/trending', {
        meta: {
          ...buildCommand('imdb/trending').meta,
          market: 'international',
        },
      }),
      buildCommand('twitter/trending', {
        meta: {
          ...buildCommand('twitter/trending').meta,
          market: 'international',
        },
      }),
      buildCommand('google/trends', {
        meta: {
          ...buildCommand('google/trends').meta,
          market: 'international',
        },
      }),
      buildCommand('wikipedia/trending', {
        meta: {
          ...buildCommand('wikipedia/trending').meta,
          market: 'international',
        },
      }),
    ]);

    expect(combos.map((combo) => combo.id)).toEqual([
      'creator-hot-domestic',
      'creator-hot-global',
      'creator-reference',
    ]);
    expect(combos[0]?.sourceCount).toBe(4);
    expect(combos[0]?.browserCount).toBe(1);
  });

  it('hides bundle tiles that collapse to a single safe source', () => {
    const combos = listOverviewCombos([
      buildCommand('bilibili/ranking'),
      buildCommand('twitter/trending', {
        meta: {
          ...buildCommand('twitter/trending').meta,
          risk: 'confirm',
          market: 'international',
        },
      }),
    ]);

    expect(combos).toEqual([]);
  });
});

describe('buildOverviewComboMergedResult', () => {
  it('normalizes multi-source rows into a table-first merged result', () => {
    const step = {
      command: 'bilibili/ranking',
      args: {},
      item: buildCommand('bilibili/ranking'),
    };
    const outcomes: OverviewComboRunOutcome[] = [
      {
        step,
        response: buildResponse(step.command, {
          items: [
            {
              rank: 1,
              title: 'Film trailer breakdown',
              play_count: 180000,
              url: 'https://www.bilibili.com/video/BV1',
            },
          ],
        }),
      },
      {
        step: {
          command: 'weibo/hot',
          args: {},
          item: buildCommand('weibo/hot'),
        },
        response: buildResponse('weibo/hot', {
          topic: 'Animation release date',
          heat: 9321,
        }),
      },
    ];

    const merged = buildOverviewComboMergedResult(outcomes, {
      fieldLabels: {
        source: '来源',
        title: '标题',
        summary: '摘要',
        rank: '排名',
        metric: '指标',
        url: '链接',
      },
      getSourceLabel: (comboStep) => comboStep.item.site,
      getCommandLabel: (comboStep) => comboStep.command,
    });

    expect(merged.successCount).toBe(2);
    expect(merged.failureCount).toBe(0);
    expect(merged.items).toEqual([
      {
        来源: 'bilibili',
        标题: 'Film trailer breakdown',
        排名: 1,
        指标: '180000',
        摘要: 'bilibili/ranking',
        链接: 'https://www.bilibili.com/video/BV1',
      },
      {
        来源: 'weibo',
        标题: 'weibo/hot',
        排名: '',
        指标: '',
        摘要: 'topic: Animation release date · heat: 9321',
        链接: '',
      },
    ]);
  });

  it('collects source errors without dropping successful sources', () => {
    const outcomes: OverviewComboRunOutcome[] = [
      {
        step: {
          command: 'zhihu/hot',
          args: {},
          item: buildCommand('zhihu/hot'),
        },
        error: 'browser not ready',
      },
      {
        step: {
          command: 'reddit/popular',
          args: {},
          item: buildCommand('reddit/popular'),
        },
        response: buildResponse('reddit/popular', {
          items: [{ title: 'Pipeline tools', score: 42 }],
        }),
      },
    ];

    const merged = buildOverviewComboMergedResult(outcomes);

    expect(merged.successCount).toBe(1);
    expect(merged.failureCount).toBe(1);
    expect(merged.errors).toEqual([{ source: 'zhihu', message: 'browser not ready' }]);
    expect(merged.items).toHaveLength(1);
  });

  it('does not mistake arbitrary ids for ranking columns in merged rows', () => {
    const merged = buildOverviewComboMergedResult([
      {
        step: {
          command: 'xiaohongshu/user',
          args: {},
          item: buildCommand('xiaohongshu/user'),
        },
        response: buildResponse('xiaohongshu/user', {
          items: [
            {
              note_id: 123456,
              title: 'Launch notes',
              likes: 86,
              url: 'https://www.xiaohongshu.com/explore/123456',
            },
          ],
        }),
      },
    ]);

    expect(merged.items).toEqual([
      {
        Source: 'xiaohongshu',
        Title: 'Launch notes',
        Rank: '',
        Metric: '86',
        Summary: 'note_id: 123456',
        URL: 'https://www.xiaohongshu.com/explore/123456',
      },
    ]);
  });
});
