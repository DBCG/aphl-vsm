const { execSync } = require('child_process');

const WAIT_TIME = process.env.WAIT_TIME ? parseInt(process.env.WAIT_TIME) : 240_000;
/**
 * Helper to run shell commands (like loading data).
 */
async function setupData() {
  try {
    console.log('Setting up data...');
    // Run the shell script
    execSync(__dirname + '/../bin/load-data.sh');
    console.log(`Waiting for ${WAIT_TIME}ms for data to load...`);
    await sleep(WAIT_TIME);
    console.log('Data setup complete!');
  } catch (error) {
    console.error('Failed to set up data:', error.message);
    process.exit(1); // Exit if setup fails
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { setupData };