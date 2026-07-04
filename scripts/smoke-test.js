const assert = require('assert');
const {
  createTask,
  createTaskWithProvider,
  detectIntent,
  classifyWithProvider,
} = require('../packages/foreman-core');
const { CONTRACT_VERSION, createBridgeEnvelope, sendToExternalApp } = require('../packages/app-bridge');

(async () => {
  const eventTask = createTask({
    customerName: 'Demo Events Client',
    channel: 'website',
    message: 'We need wedding invitations, tickets, QR check-in and event booking support.',
  });

  assert.strictEqual(detectIntent(eventTask.message), 'event_booking');
  assert.strictEqual(eventTask.workflow.owner, 'Events Team');
  assert.ok(eventTask.confidence >= 0.7, 'event task should have useful confidence');
  assert.ok(eventTask.notificationPreview.email.includes('ROSE'));
  assert.strictEqual(eventTask.classifier.provider, 'rules');
  assert.strictEqual(eventTask.classifier.fallbackUsed, true);

  const providerFallbackDecision = await classifyWithProvider({
    customerName: 'Fallback Demo',
    channel: 'website',
    message: 'We need an automation dashboard and WhatsApp follow-up workflow.',
  }, { provider: 'fireworks', apiKey: '' });

  assert.strictEqual(providerFallbackDecision.provider, 'rules');
  assert.strictEqual(providerFallbackDecision.fallbackUsed, true);
  assert.ok(providerFallbackDecision.fallbackReason.includes('Missing Fireworks API key'));

  const providerTask = await createTaskWithProvider({
    customerName: 'Provider Fallback Demo',
    channel: 'website',
    message: 'We need an automation dashboard and WhatsApp follow-up workflow.',
  }, { provider: 'fireworks', apiKey: '' });

  assert.strictEqual(providerTask.classifier.provider, 'rules');
  assert.strictEqual(providerTask.classifier.fallbackUsed, true);
  assert.ok(providerTask.classifier.fallbackReason.includes('Missing Fireworks API key'));
  assert.strictEqual(providerTask.workflow.owner, 'Automation Team');

  const urgentTask = createTask({
    customerName: 'Urgent Client',
    channel: 'whatsapp',
    message: 'This is urgent and sensitive. I need human review now.',
  });

  assert.strictEqual(urgentTask.escalation.required, true);
  assert.strictEqual(urgentTask.status, 'needs_human_review');

  const envelope = createBridgeEnvelope(eventTask);
  assert.strictEqual(CONTRACT_VERSION, 'foreman.app.task.v1');
  assert.strictEqual(envelope.contract, CONTRACT_VERSION);
  assert.strictEqual(envelope.eventType, 'task.created');
  assert.strictEqual(envelope.task.id, eventTask.id);
  assert.ok(envelope.timeline.length >= 3, 'bridge envelope should include a visible timeline');

  const dispatch = await sendToExternalApp(eventTask, { baseUrl: '' });
  assert.strictEqual(dispatch.sent, false);
  assert.ok(dispatch.reason.includes('not configured'));

  const receiverAckShape = {
    contract: CONTRACT_VERSION,
    eventId: `${eventTask.id}-demo`,
    eventType: 'task.created',
    receivedAt: new Date().toISOString(),
    task: eventTask,
    timeline: envelope.timeline,
  };

  assert.strictEqual(receiverAckShape.contract, CONTRACT_VERSION);
  assert.strictEqual(receiverAckShape.eventType, 'task.created');
  assert.strictEqual(receiverAckShape.task.id, eventTask.id);
  assert.ok(receiverAckShape.timeline.length >= 3);

  const receiverStateShape = {
    state: 'receiver_accepted',
    label: 'Receiver accepted',
    detail: `External app accepted ${eventTask.id}.`,
  };

  assert.strictEqual(receiverStateShape.state, 'receiver_accepted');
  assert.ok(receiverStateShape.label.includes('Receiver'));
  assert.ok(receiverStateShape.detail.includes(eventTask.id));

  const lifecycleShape = [
    { actor: 'ROSE', action: 'request_received', label: 'ROSE received', status: 'done' },
    { actor: 'Foreman', action: 'task_created', label: 'Task created', status: 'done' },
    { actor: 'ReceiverApp', action: 'acknowledged_task', label: 'Receiver accepted', status: 'done' },
    { actor: 'ReceiverApp', action: 'waiting_for_worker', label: 'Waiting for worker', status: 'pending' },
    { actor: 'ReceiverApp', action: 'work_completed', label: 'Completed', status: 'waiting' },
  ];

  assert.ok(lifecycleShape.every(step => step.actor && step.action && step.label && step.status));
  assert.ok(lifecycleShape.some(step => step.label === 'Waiting for worker'));
  assert.ok(lifecycleShape.some(step => step.label === 'Completed'));

  const statusShape = {
    configured: false,
    target: null,
    tokenConfigured: false,
    aiProvider: 'mock',
    fireworksConfigured: false,
    lastDispatch: null,
  };

  assert.strictEqual(typeof statusShape.configured, 'boolean');
  assert.strictEqual(statusShape.target, null);
  assert.strictEqual(typeof statusShape.tokenConfigured, 'boolean');
  assert.strictEqual(statusShape.aiProvider, 'mock');
  assert.strictEqual(typeof statusShape.fireworksConfigured, 'boolean');

  console.log('Hunter Foreman smoke test passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
