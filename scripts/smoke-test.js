const assert = require('assert');
const { createTask, detectIntent } = require('../packages/foreman-core');
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

  const lifecycleShape = [
    { actor: 'ROSE', action: 'request_received', status: 'done' },
    { actor: 'Foreman', action: 'task_created', status: 'done' },
    { actor: 'ReceiverApp', action: 'acknowledged_task', status: 'done' },
  ];

  assert.ok(lifecycleShape.every(step => step.actor && step.action && step.status));

  const statusShape = {
    configured: false,
    target: null,
    tokenConfigured: false,
    lastDispatch: null,
  };

  assert.strictEqual(typeof statusShape.configured, 'boolean');
  assert.strictEqual(statusShape.target, null);
  assert.strictEqual(typeof statusShape.tokenConfigured, 'boolean');

  console.log('Hunter Foreman smoke test passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
