import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * The library's own tests reach the door by its published name, so a test
 * exercises the same entry a consumer gets. That needs an alias here because
 * nothing has installed the package into itself.
 *
 * The environment is node. Nothing here touches a document, and the halves that
 * will are not written yet.
 *
 * A test gets twenty seconds rather than the five vitest gives when nothing says
 * otherwise. A walk of a demo paints every mark of every frame and a run through
 * a field is a thousand steps of Runge-Kutta against a flattened path, which is
 * seconds of arithmetic rather than a test hanging. At five seconds the slowest
 * of them failed one run in ten on an unchanged tree.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      '@altpsyche/maths': path.resolve(import.meta.dirname, './index.ts'),
    },
  },
});
