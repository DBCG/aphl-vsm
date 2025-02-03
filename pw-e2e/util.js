const { execSync } = require('child_process');

/**
 * Helper to run shell commands (like loading data).
 */
async function setupData() {
  try {
    console.log('Setting up data...');
    // Run the shell script
    execSync('../bin/load-data.sh');
    console.log('Data setup complete!');
  } catch (error) {
    console.error('Failed to set up data:', error.message);
    process.exit(1); // Exit if setup fails
  }
}

module.exports = { setupData };