const { execSync } = require('child_process');

const FHIR_SERVER = process.env.FHIR_SERVER || 'http://localhost:8082/fhir';

// Limit how long we wait for the eRSD import to land.
const READY_TIMEOUT = process.env.READY_TIMEOUT ? parseInt(process.env.READY_TIMEOUT) : 900_000;
const POLL_INTERVAL = process.env.POLL_INTERVAL ? parseInt(process.env.POLL_INTERVAL) : 5_000;

// The landed ValueSet count is the completion signal. The 2024-06-28 eRSD bundle contributes 1405 and the
// RCTC condition-codes bundle one more. If the demo data changes, update this.
const EXPECTED_VALUESETS = process.env.EXPECTED_VALUESETS
  ? Number.parseInt(process.env.EXPECTED_VALUESETS)
  : 1406;

/**
 * Helper to run shell commands (like loading data).
 */
async function setupData() {
  console.log('Setting up data...');
  try {
    // load-data.sh exits non-zero if any load fails, import fail surfaces here instead of proceeding with E2E tests.
    const output = execSync(__dirname + '/../bin/load-data.sh', { stdio: 'pipe' });
    console.log(output.toString());
  } catch (error) {
    const details = [error.stdout, error.stderr]
        .filter(Boolean)
        .map((buffer) => buffer.toString())
        .join('\n');
    throw new Error(`load-data.sh failed: ${error.message}\n${details}`);
  }

  await waitForData();
}

/**
 * Poll the FHIR server until the data the smoke tests depend on is queryable.
 */
async function waitForData() {
  const startedAt = Date.now();
  const deadline = startedAt + READY_TIMEOUT;

  let lastValueSetCount = -1;
  let lastError = null;

  console.log(`Waiting up to ${READY_TIMEOUT}ms for data to load on ${FHIR_SERVER}...`);

  while (Date.now() < deadline) {
    const elapsed = Math.round((Date.now() - startedAt) / 1000);

    try {
      const [libraries, planDefinitions, valueSets] = await Promise.all([
        searchCount('Library?name=SpecificationLibrary'),
        searchCount('PlanDefinition'),
        searchCount('ValueSet'),
      ]);
      lastError = null;
      lastValueSetCount = valueSets;

      console.log(
          `  [${elapsed}s] SpecificationLibrary=${libraries} PlanDefinition=${planDefinitions} ` +
          `ValueSet=${valueSets}/${EXPECTED_VALUESETS}`
      );

      if (valueSets > EXPECTED_VALUESETS) {
        // Not fatal, but EXPECTED_VALUESETS is now stale and no longer marks
        // the end of the import.
        console.warn(
            `  WARNING: ValueSet count ${valueSets} exceeds the expected ${EXPECTED_VALUESETS}. ` +
            `Update EXPECTED_VALUESETS in pw-e2e/util.js if the demo data changed.`
        );
      }

      if (libraries > 0 && planDefinitions > 0 && valueSets >= EXPECTED_VALUESETS) {
        console.log(`Data setup complete after ${elapsed}s.`);
        return;
      }
    } catch (error) {
      // Log error and proceed
      lastError = error;
      console.log(`  [${elapsed}s] not ready yet: ${error.message}`);
    }

    await sleep(POLL_INTERVAL);
  }

  const summary =
      `Timed out after ${READY_TIMEOUT}ms waiting for eRSD data on ${FHIR_SERVER}. ` +
      `Last observed ValueSet count: ${lastValueSetCount} of ${EXPECTED_VALUESETS} expected.` +
      (lastError ? ` Last error: ${lastError.message}` : '');
  throw new Error(summary);
}

function fhirHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.AUTH_TOKEN) {
    headers.Authorization = `Basic ${process.env.AUTH_TOKEN}`;
  }
  return headers;
}

/**
 * Run a FHIR search with _summary=count and return the total.
 */
async function searchCount(query) {
  const separator = query.includes('?') ? '&' : '?';
  const response = await fetch(`${FHIR_SERVER}/${query}${separator}_summary=count`, {
    headers: fhirHeaders(),
  });
  if (!response.ok) {
    throw new Error(`GET ${query} returned ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  return body.total ?? 0;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { setupData };