const http = require('http');
const https = require('https');
const { createTask } = require('../foreman-core');

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

function postJson(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = JSON.stringify(payload);
    const client = target.protocol === 'https:' ? https : http;
    const request = client.request({
      method: 'POST',
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
        ...headers,
      },
    }, response => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch (_) { parsed = data; }
        resolve({ statusCode: response.statusCode, body: parsed });
      });
    });
    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

async function sendToExternalApp(task, options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl || process.env.FOREMAN_APP_WEBHOOK_URL);
  if (!baseUrl) {
    return { sent: false, reason: 'FOREMAN_APP_WEBHOOK_URL not configured' };
  }

  const headers = {};
  const token = options.token || process.env.FOREMAN_APP_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await postJson(`${baseUrl}/foreman/tasks`, { task }, headers);
  return { sent: response.statusCode >= 200 && response.statusCode < 300, response };
}

async function createAndDispatchRequest(input, options = {}) {
  const task = createTask(input);
  const dispatch = await sendToExternalApp(task, options);
  return { task, dispatch };
}

module.exports = { createAndDispatchRequest, sendToExternalApp };
