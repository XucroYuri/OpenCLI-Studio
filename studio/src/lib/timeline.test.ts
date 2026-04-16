import { describe, expect, it } from 'vitest';
import { buildSnapshotTimelineRows } from './timeline';

describe('buildSnapshotTimelineRows', () => {
  it('derives count and primary numeric series from snapshot results', () => {
    const rows = buildSnapshotTimelineRows([
      {
        id: 2,
        status: 'success',
        capturedAt: '2026-04-14T02:00:00.000Z',
        result: {
          items: [
            { title: 'AI', score: 94 },
            { title: 'OpenAI', score: 81 },
          ],
        },
      },
      {
        id: 1,
        status: 'success',
        capturedAt: '2026-04-14T01:00:00.000Z',
        result: {
          items: [
            { title: 'AI', score: 88 },
            { title: 'OpenAI', score: 74 },
          ],
        },
      },
    ]);

    expect(rows).toEqual([
      {
        snapshotId: 1,
        capturedAt: '2026-04-14T01:00:00.000Z',
        status: 'success',
        count: 2,
        primaryLabel: 'AI',
        primaryValue: 88,
      },
      {
        snapshotId: 2,
        capturedAt: '2026-04-14T02:00:00.000Z',
        status: 'success',
        count: 2,
        primaryLabel: 'AI',
        primaryValue: 94,
      },
    ]);
  });
});
