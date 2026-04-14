import { describe, expect, it } from 'vitest';
import { buildResultExports } from './export';

describe('buildResultExports', () => {
  it('builds json, markdown, and csv artifacts for collection results', () => {
    const exports = buildResultExports('Bilibili Hot', {
      items: [
        { title: 'Topic A', heat: 91 },
        { title: 'Topic B', heat: 72 },
      ],
    });

    expect(exports.baseName).toBe('bilibili-hot');
    expect(exports.json.filename).toBe('bilibili-hot.json');
    expect(exports.markdown.filename).toBe('bilibili-hot.md');
    expect(exports.csv?.filename).toBe('bilibili-hot.csv');
    expect(exports.markdown.contents).toContain('| title | heat |');
    expect(exports.csv?.contents).toContain('title,heat');
  });

  it('builds key-fact markdown for object results without tabular rows', () => {
    const exports = buildResultExports('Keyword Snapshot', {
      keyword: 'AI',
      total: 42,
      region: 'US',
    });

    expect(exports.csv).toBeNull();
    expect(exports.markdown.contents).toContain('- **keyword**: AI');
    expect(exports.markdown.contents).toContain('- **total**: 42');
  });
});
