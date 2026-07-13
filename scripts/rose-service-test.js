const assert = require('assert');
const { createRoseReply } = require('../apps/demo/rose');

const originalFetch = global.fetch;
const originalEnv = {
  FIREWORKS_API_KEY: process.env.FIREWORKS_API_KEY,
  FIREWORKS_MODEL: process.env.FIREWORKS_MODEL,
  FIREWORKS_BASE_URL: process.env.FIREWORKS_BASE_URL,
  AI_API_KEY: process.env.AI_API_KEY,
};

function restoreEnvironment() {
  global.fetch = originalFetch;
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

async function main() {
  const intake = await createRoseReply({
    created: false,
    messages: [{ role: 'user', content: 'We need event booking, digital invitations, guest tickets, QR check-in and a clear approval flow.' }],
  });
  assert.equal(intake.ok, true);
  assert.equal(intake.readyToCreate, true);
  assert.match(intake.reply, /Thanks|I’ve got it/i);
  assert.doesNotMatch(intake.reply, /Fireworks|provider|backend|classifier/i);

  process.env.FIREWORKS_API_KEY = 'test-fireworks-key';
  process.env.FIREWORKS_MODEL = 'accounts/fireworks/models/gpt-oss-120b';
  delete process.env.AI_API_KEY;

  let capturedRequest;
  global.fetch = async (url, options) => {
    capturedRequest = { url: String(url), options };
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          choices: [{
            message: {
              content: 'I’d be happy to help. A warm kitchen-party theme could use one coordinated colour palette, simple table details and invitation wording that matches the celebration. Which colours do you already like?',
            },
          }],
        };
      },
    };
  };

  const fireworksReply = await createRoseReply({
    created: true,
    taskId: 'HF-TEST001',
    details: { eventType: 'Kitchen Party' },
    messages: [{ role: 'user', content: 'Can you help me choose a welcoming theme for the kitchen party?' }],
  });

  assert.equal(fireworksReply.ok, true);
  assert.equal(fireworksReply.provider, 'fireworks');
  assert.equal(fireworksReply.model, 'accounts/fireworks/models/gpt-oss-120b');
  assert.match(fireworksReply.reply, /warm kitchen-party theme/i);
  assert.doesNotMatch(fireworksReply.reply, /Fireworks|provider|backend|model|classifier/i);
  assert.match(capturedRequest.url, /api\.fireworks\.ai\/inference\/v1\/chat\/completions$/);
  assert.equal(capturedRequest.options.headers.authorization, 'Bearer test-fireworks-key');

  const payload = JSON.parse(capturedRequest.options.body);
  assert.equal(payload.model, 'accounts/fireworks/models/gpt-oss-120b');
  assert.ok(payload.messages.some(message => message.role === 'system' && /Never mention Fireworks/i.test(message.content)));

  global.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        choices: [{ message: { content: 'We’ll generate the tickets, send them to every guest and enable a live dashboard for you.' } }],
      };
    },
  });

  const guardedReply = await createRoseReply({
    created: true,
    taskId: 'HF-TEST001',
    messages: [{ role: 'user', content: 'Can you help with the overall guest experience?' }],
  });
  assert.equal(guardedReply.ok, true);
  assert.doesNotMatch(guardedReply.reply, /generate the tickets|send them|live dashboard/i);
  assert.match(guardedReply.reply, /request is already saved|keep working through it/i);

  delete process.env.FIREWORKS_API_KEY;
  global.fetch = async () => {
    throw new Error('The network should not be required without a configured key.');
  };

  const fallbackReply = await createRoseReply({
    created: true,
    taskId: 'HF-TEST001',
    messages: [{ role: 'user', content: 'What should we decide next?' }],
  });
  assert.equal(fallbackReply.ok, true);
  assert.equal(fallbackReply.provider, 'rose-guided-fallback');
  assert.match(fallbackReply.reply, /request is already saved|keep working through it/i);

  console.log('ROSE service proof passed: guided intake, Fireworks routing, client-safe filtering and no-key fallback.');
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(restoreEnvironment);
