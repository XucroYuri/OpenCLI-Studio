import { defineConfig } from 'vitest/config';
import * as path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname),
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
