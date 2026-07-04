const { createTask } = require('../foreman-core');

const CONTRACT_VERSION = 'foreman.app.task.v1';

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

function createBridgeEnvelope(task, options = {}) {
  const now = new Date().toISOString();
  return {
    contract: CONTRACT_VERSION,
    eventId: `${task.id}-${Date.now()}`,
    eventType: 'task.created',
    source: options.source || 'hunter-foreman',
    createdAt: now,
    task,
    timeline: [
      { at: now, actor: 'ROSE', action: 'request_received' },
      { at: now, actor: 'Foreman', action: 'task_created' },
      { at: now, actor: 'AppBridge', action: 'dispatch_requested' },
    ],
  };
}

async function sendToExternalApp(task, options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl || process.env.FOREMAN_APP_WEBHOOK_URL);
  if (!baseUrl) {
    return { sent: false, reason: 'FOREMAN_APP_WEBHOOK_URL not configured' };
  }

  const envelope = createBridgeEnvelope(task, options);
  const response = await fetch(`${baseUrl}/foreman/tasks`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-foreman-contract': CONTRACT_VERSION,
    },
    body: JSON.stringify(envelope),
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (_) { body = text; }
  return { sent: response.ok, response: { statusCode: response.status, body } };
}

async function createAndDispatchRequest(input, options = {}) {
  const task = createTask(input);
  const dispatch = await sendToExternalApp(task, options);
  return { task, dispatch };
}

module.exports = { CONTRACT_VERSION, createBridgeEnvelope, createAndDispatchRequest, sendToExternalApp };
