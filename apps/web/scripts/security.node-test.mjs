import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

// Test the actual transitive dependencies, including the file watcher path.
const require = createRequire(import.meta.url);
const tailwindRequire = createRequire(require.resolve('tailwindcss'));
const consumers = {
  chokidar: createRequire(tailwindRequire.resolve('chokidar')),
  micromatch: createRequire(tailwindRequire.resolve('micromatch')),
  'fast-glob/micromatch': createRequire(
    createRequire(tailwindRequire.resolve('fast-glob')).resolve('micromatch')
  ),
};

const nested = (open, close, depth) => open.repeat(depth) + 'a' + close.repeat(depth);

for (const [consumer, consumerRequire] of Object.entries(consumers)) {
  const braces = consumerRequire('braces');

  test(`${consumer}: GHSA-vfj7-8cjw-p6xm rejects excessive AST depth`, () => {
    for (const pattern of [
      nested('{', '}', 101),
      nested('(', ')', 101),
      nested('{(', ')}', 51),
      nested('{', '}', 4000),
      nested('(', ')', 4000),
      '{'.repeat(4000),
    ]) {
      for (const method of ['parse', 'compile', 'expand', 'stringify']) {
        assert.throws(() => braces[method](pattern), {
          name: 'SyntaxError',
          message: 'Pattern nesting exceeds maximum depth (100)',
        });
      }
      assert.throws(() => braces(pattern), SyntaxError);
      assert.throws(() => braces(pattern, { expand: true }), SyntaxError);
    }
  });

  test(`${consumer}: normal glob patterns and literal braces still work`, () => {
    assert.deepEqual(braces.expand('./src/**/*.{html,js,svelte,ts}'), [
      './src/**/*.html', './src/**/*.js', './src/**/*.svelte', './src/**/*.ts',
    ]);
    assert.equal(braces.compile('a/{b,c}/d'), 'a/(b|c)/d');
    assert.deepEqual(braces.expand('{1..3}'), ['1', '2', '3']);
    assert.equal(braces.stringify(braces.parse(nested('{', '}', 100))), nested('{', '}', 100));
    assert.equal(braces.stringify(braces.parse(nested('(', ')', 100))), nested('(', ')', 100));
    for (const pattern of [
      '\\{'.repeat(200),
      '"' + '{'.repeat(200) + '"',
      '[' + '{'.repeat(200) + ']',
      '{a,b}'.repeat(200),
    ]) {
      assert.doesNotThrow(() => braces.compile(pattern));
    }
  });
}
