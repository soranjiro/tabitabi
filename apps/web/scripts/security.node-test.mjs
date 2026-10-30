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

// Exercise the dependency loaded by the Svelte Vite plugin, not a test-only copy.
const pluginRequire = createRequire(import.meta.resolve('@sveltejs/vite-plugin-svelte'));
for (const entry of ['deepmerge', 'deepmerge/dist/umd.js']) {
  const merge = pluginRequire(entry);

  test(`${entry}: GHSA-gcqx-w48m-w2h4 blocks prototype poisoning in both inputs`, () => {
    const payload = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"prototype":{"polluted":true}}');
    const nullPrototypePayload = Object.assign(Object.create(null), payload);
    for (const malicious of [payload, nullPrototypePayload]) {
      for (const options of [{}, { clone: false }]) {
        for (const result of [
          merge(malicious, {}, options),
          merge(Object.create(null), malicious, options),
          merge({ nested: malicious }, { nested: {} }, options),
          merge({ nested: Object.create(null) }, { nested: malicious }, options),
        ]) {
          const value = result.nested ?? result;
          assert.equal(Object.getPrototypeOf(value), Object.prototype);
          assert.equal(value.polluted, undefined);
          for (const key of ['__proto__', 'constructor', 'prototype']) {
            assert.equal(Object.hasOwn(value, key), false);
          }
        }
      }
    }
    assert.equal(Reflect.get({}, 'polluted'), undefined);
  });

  test(`${entry}: array cloning and merge.all also reject prototype poisoning`, () => {
    const payload = JSON.parse('{"__proto__":{"polluted":true},"safe":1}');
    const nullPrototypePayload = Object.assign(Object.create(null), payload);
    for (const malicious of [payload, nullPrototypePayload]) {
      for (const result of [
        merge([], [malicious])[0],
        merge([malicious], [])[0],
        merge.all([malicious, { additional: 2 }]),
      ]) {
        assert.equal(Object.getPrototypeOf(result), Object.prototype);
        assert.equal(result.polluted, undefined);
        assert.equal(Object.hasOwn(result, '__proto__'), false);
        assert.equal(result.safe, 1);
      }
    }
  });

  test(`${entry}: normal configuration merging still works`, () => {
    const symbol = Symbol('option');
    assert.deepEqual(
      merge({ nested: { a: 1 }, list: [1], [symbol]: { a: 1 } },
        { nested: { b: 2 }, list: [2], [symbol]: { b: 2 } }),
      { nested: { a: 1, b: 2 }, list: [1, 2], [symbol]: { a: 1, b: 2 } },
    );
    assert.deepEqual(merge.all([{ a: 1 }, { b: 2 }]), { a: 1, b: 2 });
    assert.deepEqual(merge({ toString: 'custom' }, {}), { toString: 'custom' });
    /** @type {(target: unknown[], source: unknown[]) => unknown[]} */
    const replaceArray = (_, source) => source;
    assert.deepEqual(merge({ list: [1] }, { list: [2] }, { arrayMerge: replaceArray }), { list: [2] });
  });
}

/** @param {string} open @param {string} close @param {number} depth */
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
