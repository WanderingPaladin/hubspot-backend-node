const { promisify } = require('util');
const { simulateAsyncOperation, readSampleFile } = require('./callbacks');

const simulateAsyncOperationAsync = promisify(simulateAsyncOperation);
const readSampleFileAsync = promisify(readSampleFile);

/**
 * Same operation as callbacks.js, consumed with async/await.
 */
async function runAsyncAwaitExamples() {
  try {
    const result = await simulateAsyncOperationAsync('hello from async/await');
    console.log(result);
  } catch (error) {
    console.error('simulateAsyncOperationAsync failed:', error.message);
  }

  try {
    await simulateAsyncOperationAsync('');
  } catch (error) {
    console.error('simulateAsyncOperationAsync expected error:', error.message);
  }

  try {
    const fileContents = await readSampleFileAsync();
    console.log('readSampleFileAsync:', fileContents);
  } catch (error) {
    console.error('readSampleFileAsync failed:', error.message);
  }
}

if (require.main === module) {
  runAsyncAwaitExamples();
}

module.exports = {
  simulateAsyncOperationAsync,
  readSampleFileAsync,
  runAsyncAwaitExamples,
};
