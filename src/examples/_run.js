function printResult(title, value) {
  console.log(`\n=== ${title} ===`);
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}

async function runExample(title, fn) {
  try {
    const result = await fn();
    printResult(title, result);
    return result;
  } catch (error) {
    console.error(`\n=== ${title} FAILED ===`);
    console.error(error.message);
    if (error.type) {
      console.error(`type=${error.type} status=${error.status || 'n/a'}`);
    }
    process.exitCode = 1;
    return null;
  }
}

module.exports = { runExample, printResult };
