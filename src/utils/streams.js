const { Readable, Transform } = require('stream');
const { pipeline } = require('stream/promises');

function createUppercaseTransform() {
  return new Transform({
    transform(chunk, _encoding, callback) {
      callback(null, chunk.toString().toUpperCase());
    },
  });
}

/**
 * Read from Readable.from(...), uppercase the bytes, and pipe to stdout.
 */
async function runUppercaseStream(input = 'hubspot crm integration — streams demo\n') {
  const readable = Readable.from(input);
  const toUpper = createUppercaseTransform();
  await pipeline(readable, toUpper, process.stdout);
}

if (require.main === module) {
  runUppercaseStream().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { runUppercaseStream, createUppercaseTransform };
