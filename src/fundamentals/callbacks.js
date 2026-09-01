const fs = require('fs');
const path = require('path');

/**
 * Simulates an asynchronous operation with a Node-style (error-first) callback.
 * Uses setTimeout so the work is clearly off the current stack.
 */
function simulateAsyncOperation(value, callback) {
  setTimeout(() => {
    if (value === undefined || value === null || value === '') {
      callback(new Error('Value is required'));
      return;
    }
    callback(null, `Processed: ${value}`);
  }, 80);
}

/**
 * Alternative callback demo using fs.readFile (also required by the brief).
 */
function readSampleFile(callback) {
  const filePath = path.join(__dirname, 'sample.txt');
  fs.readFile(filePath, 'utf8', (error, data) => {
    if (error) {
      callback(error);
      return;
    }
    callback(null, data.trim());
  });
}

function runCallbackExamples() {
  simulateAsyncOperation('hello from callbacks', (error, result) => {
    if (error) {
      console.error('simulateAsyncOperation failed:', error.message);
      return;
    }
    console.log(result);
  });

  simulateAsyncOperation('', (error) => {
    if (error) {
      console.error('simulateAsyncOperation expected error:', error.message);
    }
  });

  readSampleFile((error, contents) => {
    if (error) {
      console.error('readSampleFile failed:', error.message);
      return;
    }
    console.log('readSampleFile:', contents);
  });
}

if (require.main === module) {
  runCallbackExamples();
}

module.exports = { simulateAsyncOperation, readSampleFile, runCallbackExamples };
