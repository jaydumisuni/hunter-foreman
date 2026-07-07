/*
 * test-fireworks-live.js
 *
 * Standalone live test for the Fireworks AI classification path.
 *
 * Run from the repo root:
 *   FIREWORKS_API_KEY=your-real-key node scripts/test-fireworks-live.js
 *
 * PowerShell:
 *   $env:FIREWORKS_API_KEY="your-real-key"
 *   node scripts/test-fireworks-live.js
 *
 * Optional overrides:
 *   FIREWORKS_BASE_URL
 *   FIREWORKS_MODEL
 *
 * This script makes real network calls and may incur normal Fireworks API usage.
 */

const { classifyWithProvider, VALID_INTENTS } = require('../packages/foreman-core');

const VERIFIED_FIREWORKS_MODEL = 'accounts/fireworks/models/gpt-oss-120b';

const CASES = [
  {
    label: 'Event booking clear intent',
    input: {
      customerName: 'Live Test Events',
      channel: 'website',
      message: 'We need wedding invitations, tickets, and QR check-in support for a conference.',
    },
    expectIntent: 'event_booking',
  },
  {
    label: 'Tech support clear intent',
    input: {
      customerName: 'Live Test Support',
      channel: 'whatsapp',
      message: 'Our app keeps showing an error and the website is not working for customers.',
    },
    expectIntent: 'tech_support',
  },
  {
    label: 'Business automation clear intent',
    input: {
      customerName: 'Live Test Automation',
      channel: 'email',
      message: 'We want to automate our WhatsApp and email workflow with a receptionist dashboard.',
    },
    expectIntent: 'business_automation',
  },
  {
    label: 'Ambiguous general request',
    input: {
      customerName: 'Live Test General',
      channel: 'website',
      message: 'Hi, I had a question about something.',
    },
    expectIntent: null,
  },
];

function pass(message) {
  console.log(`  PASS ${message}`);
}

function fail(message) {
  console.log(`  FAIL ${message}`);
}

async function runCase(testCase, index) {
  console.log(`\n[${index + 1}/${CASES.length}] ${testCase.label}`);
  console.log(`  message: "${testCase.input.message}"`);

  let result;
  try {
    result = await classifyWithProvider(testCase.input, { provider: 'fireworks' });
  } catch (error) {
    fail(`classifyWithProvider threw unexpectedly: ${error.message}`);
    return { ok: false };
  }

  console.log(`  raw result: ${JSON.stringify(result)}`);

  const checks = [];

  if (result.provider === 'fireworks' && result.fallbackUsed === false) {
    checks.push(true);
    pass('provider is fireworks and fallbackUsed is false');
  } else {
    checks.push(false);
    fail(`expected provider=fireworks and fallbackUsed=false, got provider=${result.provider} fallbackUsed=${result.fallbackUsed}${result.fallbackReason ? ` reason=${result.fallbackReason}` : ''}`);
  }

  if (VALID_INTENTS.includes(result.intent)) {
    checks.push(true);
    pass(`intent ${result.intent} is valid`);
  } else {
    checks.push(false);
    fail(`intent ${result.intent} is not valid. Valid intents: ${VALID_INTENTS.join(', ')}`);
  }

  if (typeof result.confidence === 'number' && result.confidence >= 0.35 && result.confidence <= 0.98) {
    checks.push(true);
    pass(`confidence ${result.confidence} is valid`);
  } else {
    checks.push(false);
    fail(`confidence ${result.confidence} is invalid`);
  }

  if (typeof result.summary === 'string' && result.summary.trim().length > 0) {
    checks.push(true);
    pass('summary is present');
  } else {
    checks.push(false);
    fail('summary is missing');
  }

  if (testCase.expectIntent) {
    if (result.intent === testCase.expectIntent) {
      pass(`intent matches expected ${testCase.expectIntent}`);
    } else {
      console.log(`  NOTE intent ${result.intent} differs from expected ${testCase.expectIntent}; review model judgment if needed`);
    }
  }

  return { ok: checks.every(Boolean) };
}

(async () => {
  console.log('Hunter Foreman - Fireworks LIVE provider test');
  console.log('================================================');

  const apiKey = process.env.FIREWORKS_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) {
    console.log('\nABORTED: No FIREWORKS_API_KEY or AI_API_KEY found in environment.');
    console.log('Set it and re-run:');
    console.log('  FIREWORKS_API_KEY=your-real-key node scripts/test-fireworks-live.js');
    process.exit(1);
  }

  console.log(`Using base URL: ${process.env.FIREWORKS_BASE_URL || 'https://api.fireworks.ai/inference/v1'}`);
  console.log(`Using model: ${process.env.FIREWORKS_MODEL || VERIFIED_FIREWORKS_MODEL}`);
  console.log(`API key present: yes (${apiKey.slice(0, 4)}...${apiKey.slice(-4)})`);

  const results = [];
  for (let i = 0; i < CASES.length; i += 1) {
    results.push(await runCase(CASES[i], i));
  }

  const passed = results.filter(result => result.ok).length;
  const total = results.length;

  console.log('\n================================================');
  console.log(`RESULT: ${passed}/${total} cases fully passed`);

  if (passed === total) {
    console.log('SUCCESS: Fireworks live integration verified.');
    console.log('Submission wording may state: Fireworks AI integration verified live with classifier.provider=fireworks and fallbackUsed=false across multiple real requests.');
    process.exit(0);
  }

  console.log('INCOMPLETE: One or more cases fell back to rules or failed shape checks.');
  console.log('Check fallbackReason values above. Common causes: invalid key, wrong model, account issue, or network/firewall block.');
  process.exit(1);
})();
