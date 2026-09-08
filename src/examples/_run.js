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
    if (error.details) {
      console.error(JSON.stringify(error.details, null, 2));
    }
    if (error.type === 'AUTH') {
      console.error('Copy .env.example to .env and set HUBSPOT_ACCESS_TOKEN (Private App token).');
    } else if (error.type === 'VALIDATION') {
      console.error('If HubSpot rejected pipeline/stage values, run: npm run example:pipelines');
    }
    process.exitCode = 1;
    return null;
  }
}

module.exports = { runExample, printResult };
