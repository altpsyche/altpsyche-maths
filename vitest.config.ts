import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * The library's own tests reach the door by its published name, so a test
 * exercises the same entry a consumer gets. That needs an alias here because
 * nothing has installed the package into itself.
 *
 * The environment is node. Nothing here touches a document, and the halves that
 * will are not written yet.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@altpsyche/maths': path.resolve(import.meta.dirname, './index.ts'),
    },
  },
});
