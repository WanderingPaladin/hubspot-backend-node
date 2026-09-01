const { test } = require('node:test');
const assert = require('node:assert/strict');
const { promisify } = require('util');
const { Writable } = require('stream');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const { simulateAsyncOperation, readSampleFile } = require('../src/fundamentals/callbacks');
const { simulateAsyncOperationAsync } = require('../src/fundamentals/asyncAwait');
const { sum } = require('../src/fundamentals/utils_module');
const { createUppercaseTransform } = require('../src/utils/streams');

test('callback simulation succeeds', async () => {
  const result = await promisify(simulateAsyncOperation)('ok');
  assert.equal(result, 'Processed: ok');
});

test('callback simulation surfaces errors', async () => {
  await assert.rejects(() => promisify(simulateAsyncOperation)(''), /Value is required/);
});

test('fs.readFile callback reads the sample file', async () => {
  const contents = await promisify(readSampleFile)();
  assert.match(contents, /callback file read succeeded/);
});

test('promise/async wrapper matches the callback result', async () => {
  const result = await simulateAsyncOperationAsync('async');
  assert.equal(result, 'Processed: async');
});

test('CommonJS sum() adds numbers', () => {
  assert.equal(sum([1, 2, 3, 4, 5]), 15);
});

test('CommonJS sum() rejects non-arrays', () => {
  assert.throws(() => sum('nope'), /array of numbers/);
});

test('stream transform uppercases chunks', async () => {
  const chunks = [];
  const sink = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    },
  });
  await pipeline(Readable.from('hubspot'), createUppercaseTransform(), sink);
  assert.equal(chunks.join(''), 'HUBSPOT');
});
