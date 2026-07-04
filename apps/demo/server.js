const http = require('http');
const { createTask } = require('../../packages/foreman-core');
const { sendToExternalApp } = require('../../packages/app-bridge');

const port = process.env.PORT || 3000;
const tasks = [];
const dispatches = [];
const bridgeUrl = process.env.FOREMAN_APP_WEBHOOK_URL || '';

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(payload, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (error) { reject(error); }
    });
  });
}

function getDispatchForTask(taskId) {
  return dispatches.find(item => item.taskId === taskId) || { sent: false, reason: 'Not dispatched' };
}

function getReceiverAck(dispatch) {
  return dispatch && dispatch.response && dispatch.response.body && dispatch.response.body.received
    ? dispatch.response.body.received
    : null;
}

function getReceiverState(task, dispatch) {
  const ack = getReceiverAck(dispatch);
  if (!bridgeUrl) {
    return { state: 'local_only', label: 'Local only', detail: 'No receiver app is configured for this run.' };
  }
  if (!dispatch.sent) {
    return { state: 'dispatch_failed', label: 'Dispatch failed', detail: dispatch.reason || 'Receiver did not accept the task.' };
  }
  if (ack) {
    return { state: 'receiver_accepted', label: 'Receiver accepted', detail: `External app accepted ${task.id}.` };
  }
  return { state: 'waiting_for_receiver', label: 'Waiting for receiver', detail: 'Task was sent but no receiver acknowledgement is visible yet.' };
}

function buildTaskLifecycle(task, dispatch) {
  const now = new Date().toISOString();
  const ack = getReceiverAck(dispatch);
  const receiverState = getReceiverState(task, dispatch);
  const steps = [
    { at: now, actor: 'ROSE', action: 'request_received', label: 'ROSE received', status: 'done' },
    { at: now, actor: 'Foreman', action: 'intent_classified', label: 'Foreman analyzed', status: 'done' },
    { at: now, actor: 'Foreman', action: 'workflow_selected', label: 'Workflow selected', status: 'done' },
    { at: now, actor: 'Foreman', action: 'task_created', label: 'Task created', status: 'done' },
  ];

  if (!bridgeUrl) {
    steps.push({ at: now, actor: 'AppBridge', action: 'local_only_no_receiver_configured', label: 'Sent to app', status: 'skipped' });
    steps.push({ at: now, actor: 'ReceiverApp', action: 'not_configured', label: 'Receiver accepted', status: 'skipped' });
  } else if (dispatch.sent) {
    steps.push({ at: now, actor: 'AppBridge', action: 'task_dispatched', label: 'Sent to app', status: 'done' });
    steps.push({ at: ack && ack.receivedAt ? ack.receivedAt : now, actor: 'ReceiverApp', action: 'acknowledged_task', label: 'Receiver accepted', status: ack ? 'done' : 'pending' });
  } else {
    steps.push({ at: now, actor: 'AppBridge', action: 'dispatch_failed', label: 'Sent to app', status: 'needs_attention' });
    steps.push({ at: now, actor: 'ReceiverApp', action: 'not_received', label: 'Receiver accepted', status: 'needs_attention' });
  }

  steps.push({ at: now, actor: 'ReceiverApp', action: 'waiting_for_worker', label: 'Waiting for worker', status: receiverState.state === 'receiver_accepted' ? 'pending' : 'waiting' });
  steps.push({ at: now, actor: 'ReceiverApp', action: 'worker_in_progress', label: 'In progress', status: 'waiting' });
  steps.push({ at: now, actor: 'ReceiverApp', action: 'work_completed', label: 'Completed', status: 'waiting' });

  if (task.escalation.required) {
    steps.push({ at: now, actor: 'Foreman', action: 'human_review_required', label: 'Human review required', status: 'needs_attention' });
  }

  return steps;
}

function getBridgeStatus() {
  return {
    configured: Boolean(bridgeUrl),
    target: bridgeUrl || null,
    tokenConfigured: Boolean(process.env.FOREMAN_APP_TOKEN),
    lastDispatch: dispatches[0] || null,
  };
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hunter Foreman Demo</title>
  <style>
    :root { color-scheme: dark; --bg: #0b0d11; --panel: #151923; --line: #293140; --text: #f4f7fb; --muted: #a7b0c0; --accent: #8dffcf; --warn: #ffd166; --danger: #ff7a90; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: radial-gradient(circle at top, #1c2330 0, var(--bg) 48%); color: var(--text); }
    main { max-width: 1220px; margin: 0 auto; padding: 34px 18px 60px; }
    header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 24px; }
    h1 { font-size: clamp(38px, 6vw, 74px); margin: 8px 0; letter-spacing: -0.06em; line-height: .92; }
    h2 { margin: 0 0 12px; }
    h3 { margin: 10px 0 8px; }
    p { color: var(--muted); line-height: 1.55; }
    .tag { display: inline-block; padding: 7px 11px; border-radius: 999px; background: #1d2430; border: 1px solid var(--line); color: var(--accent); font-weight: 800; font-size: 13px; }
    .grid { display: grid; grid-template-columns: 0.82fr 1.18fr; gap: 18px; }
    .card { background: rgba(21,25,35,.92); border: 1px solid var(--line); border-radius: 22px; padding: 20px; box-shadow: 0 20px 60px rgba(0,0,0,.28); }
    .hero-card { max-width: 390px; }
    label { display: block; font-size: 13px; font-weight: 900; color: #dbe7f6; margin: 13px 0 7px; }
    input, select, textarea, button { width: 100%; border-radius: 14px; border: 1px solid var(--line); padding: 13px 14px; font: inherit; }
    input, select, textarea { background: #0f131b; color: var(--text); }
    textarea { min-height: 155px; resize: vertical; }
    button { margin-top: 14px; background: linear-gradient(135deg, #8dffcf, #9bb7ff); color: #081015; font-weight: 950; cursor: pointer; border: 0; }
    button.secondary { background: #202839; color: #dce8f7; border: 1px solid var(--line); margin: 6px 0 0; }
    .task { border: 1px solid var(--line); border-radius: 18px; padding: 16px; margin-top: 14px; background: #10151f; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
    .pill { display: inline-flex; padding: 6px 9px; border-radius: 999px; background: #202839; color: #dce8f7; font-size: 12px; font-weight: 900; }
    .pill.ok { color: var(--accent); }
    .pill.warn { color: var(--warn); }
    .pill.danger { color: var(--danger); }
    .pill.waiting { color: #9bb7ff; }
    .warn { color: var(--warn); }
    .danger { color: var(--danger); }
    .ok { color: var(--accent); }
    .steps { margin: 10px 0 0; padding-left: 20px; color: #cbd6e5; }
    .state-ladder { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
    .state-card { border: 1px solid var(--line); border-radius: 14px; padding: 10px; background: #0d1118; min-height: 72px; }
    .timeline { display: grid; gap: 8px; margin: 12px 0; }
    .timeline-step { border: 1px solid var(--line); border-radius: 14px; padding: 10px; background: #0d1118; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    pre { white-space: pre-wrap; background: #0d1118; border: 1px solid var(--line); padding: 12px; border-radius: 14px; color: #dce8f7; }
    code { color: #dce8f7; }
    .flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
    .flow div { border: 1px solid var(--line); background: rgba(16,21,31,.8); border-radius: 16px; padding: 13px; color: #dce8f7; font-weight: 800; }
    .examples { display: grid; gap: 8px; margin-top: 12px; }
    .bridge { margin-top: 14px; border-top: 1px solid var(--line); padding-top: 12px; }
    @media (max-width: 900px) { .grid, .split, .flow, .state-ladder { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <span class="tag">Hunter Foreman Phase 1</span>
        <h1>AI Operations Foreman</h1>
        <p>ROSE receives the request. Hunter Foreman routes the work, creates a task, previews updates, and dispatches to a connected app when configured.</p>
        <div class="flow"><div>1. ROSE intake</div><div>2. Foreman routes</div><div>3. Dashboard updates</div><div>4. App bridge</div></div>
      </div>
      <div class="card hero-card">
        <strong>App bridge status</strong>
        <div id="bridgeStatus" class="bridge"><p>Checking bridge...</p></div>
      </div>
    </header>
    <section class="grid">
      <div class="card">
        <h2>ROSE Intake</h2>
        <p>Choose an example or type a request. The public Foreman core will classify it and create a task.</p>
        <div class="examples">
          <button class="secondary" data-example="events" type="button">Load Events Example</button>
          <button class="secondary" data-example="support" type="button">Load Support Example</button>
          <button class="secondary" data-example="automation" type="button">Load Automation Example</button>
          <button class="secondary" data-example="urgent" type="button">Load Escalation Example</button>
        </div>
        <form id="requestForm">
          <label>Customer / Business</label><input name="customerName" value="A&B Replacement Parts" />
          <label>Channel</label><select name="channel"><option>website</option><option>whatsapp</option><option>email</option></select>
          <label>Request</label><textarea name="message">We need an AI receptionist and dashboard that can receive customer requests, route them to the right person, and send WhatsApp/email updates.</textarea>
          <button type="submit">Send to Hunter Foreman</button>
        </form>
      </div>
      <div class="card"><h2>Foreman Dashboard</h2><div id="tasks"></div></div>
    </section>
  </main>
  <script>
    const examples = {
      events: { customerName: 'Chilanga Mulilo Client', channel: 'website', message: 'We need event booking, digital invitations, guest tickets, QR check-in and a clear approval flow for our Chilanga Mulilo.' },
      support: { customerName: 'A&B Replacement Parts', channel: 'email', message: 'Our website contact form is not working and customers are not receiving replies. Please route this to tech support.' },
      automation: { customerName: 'Local Services Business', channel: 'website', message: 'We need an AI receptionist and dashboard that can receive customer requests, route them to the right person, and send WhatsApp/email updates.' },
      urgent: { customerName: 'Owner Escalation Demo', channel: 'whatsapp', message: 'This is urgent and sensitive. A client is angry about payment and I need the owner to review this now.' }
    };
    const form = document.getElementById('requestForm');
    const tasksEl = document.getElementById('tasks');
    const bridgeEl = document.getElementById('bridgeStatus');
    function escapeHtml(value){ return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
    function safeStatusClass(status){ return status === 'needs_attention' ? 'danger' : status === 'skipped' ? 'warn' : status === 'waiting' || status === 'pending' ? 'waiting' : 'ok'; }
    function receiverAck(dispatch){ return dispatch && dispatch.response && dispatch.response.body && dispatch.response.body.received ? dispatch.response.body.received : null; }
    document.querySelectorAll('[data-example]').forEach(btn => btn.addEventListener('click', () => {
      const data = examples[btn.dataset.example];
      form.customerName.value = data.customerName;
      form.channel.value = data.channel;
      form.message.value = data.message;
    }));
    async function loadBridgeStatus(){
      const res = await fetch('/api/app-bridge/status');
      const data = await res.json();
      const ack = receiverAck(data.lastDispatch);
      bridgeEl.innerHTML = \`
        <p>Status: <strong class="${data.configured ? 'warn' : ''}">${data.configured ? 'Connected' : 'Local only'}</strong></p>
        <p>Target: <code>${escapeHtml(data.target || 'not configured')}</code></p>
        <p>Last dispatch: <strong>${data.lastDispatch ? (data.lastDispatch.sent ? 'sent' : 'failed/local') : 'none yet'}</strong></p>
        <p>Receiver ack: <strong>${ack ? 'received' : 'none yet'}</strong></p>
        ${ack ? \`<p>Receiver event: <code>${escapeHtml(ack.eventId)}</code></p>\` : ''}
      \`;
    }
    async function loadTasks(){ const res = await fetch('/api/tasks'); const data = await res.json(); renderTasks(data.tasks); await loadBridgeStatus(); }
    function renderStateLadder(task){
      return \`<div class="state-ladder">${task.lifecycle.map(step => \`
        <div class="state-card">
          <span class="pill ${safeStatusClass(step.status)}">${escapeHtml(step.status)}</span>
          <p><strong>${escapeHtml(step.label || step.action)}</strong></p>
          <small>${escapeHtml(step.actor)}</small>
        </div>\`).join('')}</div>\`;
    }
    function renderTasks(tasks){
      if(!tasks.length){ tasksEl.innerHTML = '<p>No requests yet. Send one from ROSE intake.</p>'; return; }
      tasksEl.innerHTML = tasks.map(task => {
        const ack = receiverAck(task.dispatch);
        return \`
        <article class="task">
          <div class="row"><span class="pill">${escapeHtml(task.id)}</span><span class="pill ok">${escapeHtml(task.workflow.label)}</span><span class="pill ${task.escalation.required ? 'warn' : 'ok'}">Confidence: ${Math.round(task.confidence * 100)}%</span></div>
          <strong>${escapeHtml(task.customerName)}</strong><p>${escapeHtml(task.message)}</p>
          <p>Status: <strong class="${task.escalation.required ? 'warn' : ''}">${escapeHtml(task.status)}</strong></p>
          <p>Owner: <strong>${escapeHtml(task.workflow.owner)}</strong></p>
          <p>Receiver state: <strong class="${task.receiverState.state === 'receiver_accepted' ? 'ok' : task.receiverState.state === 'dispatch_failed' ? 'danger' : 'warn'}">${escapeHtml(task.receiverState.label)}</strong> — ${escapeHtml(task.receiverState.detail)}</p>
          <p>Escalation: <strong class="${task.escalation.required ? 'danger' : ''}">${task.escalation.required ? 'Human review required' : 'Not required'}</strong> — ${escapeHtml(task.escalation.reason)}</p>
          <p>App bridge: <strong>${task.dispatch.sent ? 'Sent' : 'Local only'}</strong> — ${escapeHtml(task.dispatch.reason || 'Receiver accepted task')}</p>
          <p>Receiver acknowledgement: <strong class="${ack ? 'ok' : 'warn'}">${ack ? 'Received by connected app' : 'No receiver acknowledgement yet'}</strong></p>
          ${ack ? \`<p>Receiver event ID: <code>${escapeHtml(ack.eventId)}</code></p>\` : ''}
          <h3>Live state ladder</h3>
          ${renderStateLadder(task)}
          <h3>Detailed timeline</h3>
          <div class="timeline">${task.lifecycle.map(step => \`<div class="timeline-step"><span class="pill ${safeStatusClass(step.status)}">${escapeHtml(step.status)}</span> <strong>${escapeHtml(step.actor)}</strong>: ${escapeHtml(step.action)}<br><small>${escapeHtml(step.at)}</small></div>\`).join('')}</div>
          <ol class="steps">${task.workflow.steps.map(step => \`<li>${escapeHtml(step)}</li>\`).join('')}</ol>
          <div class="split"><div><h3>Email Preview</h3><pre>${escapeHtml(task.notificationPreview.email)}</pre></div><div><h3>WhatsApp Preview</h3><pre>${escapeHtml(task.notificationPreview.whatsapp)}</pre></div></div>
        </article>\`;
      }).join('');
    }
    form.addEventListener('submit', async event => { event.preventDefault(); const payload = Object.fromEntries(new FormData(form).entries()); await fetch('/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); await loadTasks(); });
    loadTasks();
    setInterval(loadBridgeStatus, 2500);
  </script>
</body>
</html>`;

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  if (req.url === '/health') return sendJson(res, 200, { ok: true, service: 'hunter-foreman-demo', appBridge: Boolean(process.env.FOREMAN_APP_WEBHOOK_URL) });
  if (req.method === 'GET' && req.url === '/api/app-bridge/status') return sendJson(res, 200, getBridgeStatus());
  if (req.method === 'GET' && req.url === '/api/tasks') return sendJson(res, 200, { tasks });
  if (req.method === 'POST' && req.url === '/api/requests') {
    try {
      const body = await readBody(req);
      if (!body.message || !String(body.message).trim()) return sendJson(res, 422, { ok: false, error: 'Request message is required' });
      const task = createTask(body);
      const dispatch = await sendToExternalApp(task).catch(error => ({ sent: false, reason: error.message }));
      task.dispatch = dispatch;
      task.receiverState = getReceiverState(task, dispatch);
      task.lifecycle = buildTaskLifecycle(task, dispatch);
      dispatches.unshift({ taskId: task.id, receiverState: task.receiverState, ...dispatch });
      tasks.unshift(task);
      return sendJson(res, 201, { ok: true, task, dispatch });
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: 'Invalid request body' });
    }
  }
  if (req.method === 'GET' && req.url.startsWith('/api/dispatch/')) {
    const taskId = decodeURIComponent(req.url.split('/').pop());
    return sendJson(res, 200, getDispatchForTask(taskId));
  }
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(html);
}).listen(port, () => console.log(`Hunter Foreman demo running on http://localhost:${port}`));
