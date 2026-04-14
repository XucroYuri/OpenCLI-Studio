import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { StudioStore } from './store.js';

describe('StudioStore', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'opencli-studio-store-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('stores favorites and presets for later retrieval', () => {
    const store = new StudioStore(tempDir);
    try {
      const favorite = store.setFavorite({
        kind: 'command',
        targetId: 'google/trends',
        favorite: true,
      });

      const preset = store.savePreset({
        kind: 'workbench',
        name: 'US Trends',
        description: 'Track daily US trends',
        state: {
          command: 'google/trends',
          args: { region: 'US', limit: 10 },
        },
      });

      expect(favorite).toMatchObject({
        kind: 'command',
        targetId: 'google/trends',
      });
      expect(store.listFavorites()).toMatchObject([
        {
          kind: 'command',
          targetId: 'google/trends',
        },
      ]);

      expect(preset).toMatchObject({
        kind: 'workbench',
        name: 'US Trends',
        description: 'Track daily US trends',
        state: {
          command: 'google/trends',
          args: { region: 'US', limit: 10 },
        },
      });
      expect(store.listPresets()).toHaveLength(1);

      store.setFavorite({
        kind: 'command',
        targetId: 'google/trends',
        favorite: false,
      });
      store.deletePreset(preset.id);

      expect(store.listFavorites()).toEqual([]);
      expect(store.listPresets()).toEqual([]);
    } finally {
      store.close();
    }
  });
});
