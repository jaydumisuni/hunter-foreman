const http = require('http');
const { createTaskWithProvider } = require('../../packages/foreman-core');
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
  if (!bridgeUrl) return { state: 'local_only', label: 'Local only', detail: 'No receiver app is configured for this run.' };
  if (!dispatch.sent) return { state: 'dispatch_failed', label: 'Dispatch failed', detail: dispatch.reason || 'Receiver did not accept the task.' };
  if (ack) return { state: 'receiver_accepted', label: 'Receiver accepted', detail: `External app accepted ${task.id}.` };
  return { state: 'waiting_for_receiver', label: 'Waiting for receiver', detail: 'Task was sent but no receiver acknowledgement is visible yet.' };
}

function buildTaskLifecycle(task, dispatch) {
  const now = new Date().toISOString();
  const ack = getReceiverAck(dispatch);
  const receiverState = getReceiverState(task, dispatch);
  const steps = [
    { at: now, actor: 'ROSE', action: 'request_received', label: 'Request captured', status: 'done' },
    { at: now, actor: 'Foreman', action: 'intent_classified', label: 'Intent classified', status: 'done' },
    { at: now, actor: 'Foreman', action: 'workflow_selected', label: 'Workflow selected', status: 'done' },
    { at: now, actor: 'Foreman', action: 'task_created', label: 'Task created', status: 'done' },
  ];

  if (!bridgeUrl) {
    steps.push({ at: now, actor: 'AppBridge', action: 'local_only_no_receiver_configured', label: 'App bridge skipped', status: 'skipped' });
    steps.push({ at: now, actor: 'ReceiverApp', action: 'not_configured', label: 'Receiver not configured', status: 'skipped' });
  } else if (dispatch.sent) {
    steps.push({ at: now, actor: 'AppBridge', action: 'task_dispatched', label: 'Task dispatched', status: 'done' });
    steps.push({ at: ack && ack.receivedAt ? ack.receivedAt : now, actor: 'ReceiverApp', action: 'acknowledged_task', label: 'Receiver accepted', status: ack ? 'done' : 'pending' });
  } else {
    steps.push({ at: now, actor: 'AppBridge', action: 'dispatch_failed', label: 'Dispatch failed', status: 'needs_attention' });
    steps.push({ at: now, actor: 'ReceiverApp', action: 'not_received', label: 'Receiver not reached', status: 'needs_attention' });
  }

  steps.push({ at: now, actor: 'Operations', action: 'waiting_for_worker', label: 'Worker queue', status: receiverState.state === 'receiver_accepted' ? 'pending' : 'waiting' });
  steps.push({ at: now, actor: 'Operations', action: 'worker_in_progress', label: 'In progress', status: 'waiting' });
  steps.push({ at: now, actor: 'Operations', action: 'work_completed', label: 'Completed', status: 'waiting' });
  if (task.escalation.required) steps.push({ at: now, actor: 'Foreman', action: 'human_review_required', label: 'Human review required', status: 'needs_attention' });
  return steps;
}

function getBridgeStatus() {
  return {
    configured: Boolean(bridgeUrl),
    target: bridgeUrl || null,
    tokenConfigured: Boolean(process.env.FOREMAN_APP_TOKEN),
    aiProvider: process.env.AI_PROVIDER || 'mock',
    fireworksConfigured: Boolean(process.env.FIREWORKS_API_KEY || process.env.AI_API_KEY),
    model: process.env.FIREWORKS_MODEL || 'accounts/fireworks/models/gpt-oss-120b',
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
    :root {
      color-scheme: dark;
      --bg:#05070d;
      --panel:rgba(13,18,31,.78);
      --panel2:rgba(20,28,46,.88);
      --line:rgba(150,185,255,.18);
      --text:#f7fbff;
      --muted:#aebbd3;
      --soft:#d9e7ff;
      --accent:#5df7d4;
      --accent2:#8fb3ff;
      --gold:#ffd166;
      --danger:#ff6f91;
      --ok:#5df7d4;
      --shadow:0 28px 90px rgba(0,0,0,.42);
    }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body {
      margin:0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 18% -10%, rgba(93,247,212,.20), transparent 32%),
        radial-gradient(circle at 78% 0%, rgba(143,179,255,.24), transparent 30%),
        linear-gradient(135deg, #05070d 0%, #0b1020 50%, #05070d 100%);
      color:var(--text);
      min-height:100vh;
    }
    body::before {
      content:"";
      position:fixed; inset:0;
      background-image:linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
      background-size:42px 42px;
      mask-image:linear-gradient(to bottom, rgba(0,0,0,.75), transparent 82%);
      pointer-events:none;
    }
    main { width:min(1440px, calc(100% - 48px)); margin:0 auto; padding:38px 0 70px; position:relative; }
    .hero {
      border:1px solid var(--line);
      background:linear-gradient(135deg, rgba(13,18,31,.82), rgba(14,21,38,.58));
      border-radius:34px;
      padding:34px;
      box-shadow:var(--shadow);
      overflow:hidden;
      position:relative;
    }
    .hero::after {
      content:"";
      position:absolute; right:-120px; top:-140px; width:420px; height:420px;
      border-radius:50%; background:radial-gradient(circle, rgba(93,247,212,.23), transparent 62%);
      pointer-events:none;
    }
    header { display:grid; grid-template-columns:1.4fr .9fr; gap:22px; align-items:stretch; }
    .eyebrow,.tag,.pill,.mini-pill {
      display:inline-flex; align-items:center; gap:7px;
      border-radius:999px; font-weight:900; letter-spacing:.01em;
      border:1px solid var(--line);
      background:rgba(93,247,212,.09);
      color:var(--accent);
      box-shadow:inset 0 0 18px rgba(93,247,212,.05);
    }
    .eyebrow { padding:8px 12px; font-size:13px; }
    .pill { padding:7px 11px; font-size:12px; color:var(--soft); background:rgba(255,255,255,.055); }
    .mini-pill { padding:6px 10px; font-size:11px; }
    h1 { font-size:clamp(54px, 7.4vw, 112px); line-height:.86; letter-spacing:-.08em; margin:16px 0 18px; max-width:940px; }
    h2 { font-size:28px; letter-spacing:-.035em; margin:0 0 12px; }
    h3 { margin:12px 0 8px; letter-spacing:-.02em; }
    p { color:var(--muted); line-height:1.58; font-size:16px; }
    .lead { font-size:20px; max-width:900px; color:#dce8ff; }
    .proof-strip { display:flex; flex-wrap:wrap; gap:10px; margin-top:20px; }
    .proof-strip .pill strong { color:var(--accent); }
    .card,.task,.metric,.flow-step,.state-card,.timeline-step,pre {
      background:var(--panel);
      border:1px solid var(--line);
      border-radius:24px;
      box-shadow:0 18px 70px rgba(0,0,0,.25);
      backdrop-filter:blur(18px);
    }
    .card { padding:22px; }
    .status-card { background:linear-gradient(180deg, rgba(20,28,46,.94), rgba(10,14,25,.78)); }
    .status-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; }
    .metric { padding:14px; min-height:94px; }
    .metric small { display:block; color:var(--muted); font-weight:800; text-transform:uppercase; font-size:11px; letter-spacing:.08em; }
    .metric strong { display:block; margin-top:8px; color:var(--text); font-size:18px; word-break:break-word; }
    .flow { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:22px; }
    .flow-step { padding:16px; background:rgba(255,255,255,.045); }
    .flow-step b { display:block; font-size:15px; }
    .flow-step span { color:var(--muted); font-size:13px; }
    .grid { display:grid; grid-template-columns:.85fr 1.15fr; gap:22px; margin-top:24px; }
    label { display:block; font-size:12px; font-weight:950; color:#dbe7f6; margin:14px 0 7px; text-transform:uppercase; letter-spacing:.08em; }
    input,select,textarea,button { width:100%; border-radius:16px; border:1px solid var(--line); padding:14px 15px; font:inherit; }
    input,select,textarea { background:rgba(5,8,15,.9); color:var(--text); outline:none; }
    input:focus,select:focus,textarea:focus { border-color:rgba(93,247,212,.7); box-shadow:0 0 0 4px rgba(93,247,212,.08); }
    textarea { min-height:150px; resize:vertical; }
    button {
      margin-top:14px;
      background:linear-gradient(135deg, var(--accent), var(--accent2));
      color:#06111a; font-weight:1000; cursor:pointer; border:0;
      box-shadow:0 14px 45px rgba(93,247,212,.18);
    }
    button.secondary { background:rgba(255,255,255,.055); color:#eaf2ff; border:1px solid var(--line); margin:6px 0 0; box-shadow:none; }
    button.secondary:hover { border-color:rgba(93,247,212,.45); color:var(--accent); }
    .example-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:14px 0 10px; }
    .dashboard-empty { border:1px dashed rgba(143,179,255,.25); border-radius:24px; padding:30px; background:rgba(255,255,255,.035); }
    .task { padding:22px; margin-top:14px; background:linear-gradient(180deg, rgba(20,28,46,.9), rgba(10,14,25,.86)); }
    .task-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap; border-bottom:1px solid var(--line); padding-bottom:14px; margin-bottom:14px; }
    .row { display:flex; gap:8px; flex-wrap:wrap; margin:10px 0; }
    .ok { color:var(--ok); } .warn { color:var(--gold); } .danger { color:var(--danger); }
    .summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:14px 0; }
    .summary-grid .metric strong { font-size:16px; }
    .state-ladder { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:12px 0 18px; }
    .state-card { padding:14px; min-height:112px; background:rgba(255,255,255,.045); }
    .state-card p { margin:8px 0 4px; color:var(--text); font-weight:850; }
    .state-card small { color:var(--muted); }
    .timeline { display:grid; gap:8px; margin:12px 0; }
    .timeline-step { padding:12px; background:rgba(5,8,15,.72); }
    .split { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    pre { white-space:pre-wrap; color:#dce8f7; overflow:auto; padding:14px; margin:0; background:rgba(5,8,15,.75); }
    code { color:#dce8f7; }
    .footer-note { margin-top:18px; color:var(--muted); font-size:13px; }
    @media (max-width:1050px){ header,.grid,.split{grid-template-columns:1fr;} .flow,.state-ladder,.summary-grid{grid-template-columns:1fr 1fr;} }
    @media (max-width:650px){ main{width:min(100% - 26px, 1440px); padding-top:20px;} .hero{padding:22px;} .flow,.state-ladder,.summary-grid,.example-grid,.status-grid{grid-template-columns:1fr;} h1{font-size:52px;} }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <header>
        <div>
          <span class="eyebrow">⚡ Hunter Foreman • AMD Hackathon Demo</span>
          <h1>AI Operations Foreman</h1>
          <p class="lead">ROSE captures the request. Foreman classifies it with Fireworks, creates owned work, updates the dashboard, and dispatches the task to a connected app.</p>
          <div class="proof-strip">
            <span class="pill"><strong>Fireworks live</strong> provider verified</span>
            <span class="pill"><strong>4/4</strong> classifier proof</span>
            <span class="pill"><strong>App Bridge</strong> connected</span>
            <span class="pill"><strong>Fallback</strong> verified</span>
          </div>
          <div class="flow">
            <div class="flow-step"><b>1. ROSE intake</b><span>Request captured</span></div>
            <div class="flow-step"><b>2. Foreman classify</b><span>Provider or fallback</span></div>
            <div class="flow-step"><b>3. Work owned</b><span>Task + escalation</span></div>
            <div class="flow-step"><b>4. App bridge</b><span>External receiver</span></div>
          </div>
        </div>
        <div class="card status-card">
          <h2>Live System Status</h2>
          <div id="bridgeStatus"><p>Checking...</p></div>
        </div>
      </header>

      <section class="grid">
        <div class="card">
          <span class="eyebrow">ROSE Intake</span>
          <h2>Start with a customer request</h2>
          <p>Choose an example or type a request. Fireworks is used when configured; otherwise Hunter Foreman marks the deterministic fallback clearly.</p>
          <div class="example-grid">
            <button class="secondary" data-example="events" type="button">Events + QR check-in</button>
            <button class="secondary" data-example="support" type="button">Tech support</button>
            <button class="secondary" data-example="automation" type="button">Business automation</button>
            <button class="secondary" data-example="urgent" type="button">Escalation</button>
          </div>
          <form id="requestForm">
            <label>Customer / Business</label><input name="customerName" value="A&B Replacement Parts" />
            <label>Channel</label><select name="channel"><option>website</option><option>whatsapp</option><option>email</option></select>
            <label>Request</label><textarea name="message">We need event booking, digital invitations, guest tickets, QR check-in and a clear approval flow.</textarea>
            <button type="submit">Send to Hunter Foreman</button>
          </form>
        </div>
        <div class="card">
          <span class="eyebrow">Foreman Dashboard</span>
          <h2>Owned work state</h2>
          <div id="tasks"></div>
        </div>
      </section>
      <p class="footer-note">Public-safe demo: no private Hunter internals, no production credentials, no client data.</p>
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
    function escapeHtml(value){ return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char])); }
    function statusClass(status){ return status === 'needs_attention' ? 'danger' : status === 'skipped' ? 'warn' : status === 'waiting' || status === 'pending' ? 'warn' : 'ok'; }
    function receiverAck(dispatch){ return dispatch && dispatch.response && dispatch.response.body && dispatch.response.body.received ? dispatch.response.body.received : null; }
    document.querySelectorAll('[data-example]').forEach(btn => btn.addEventListener('click', () => { const data = examples[btn.dataset.example]; form.customerName.value = data.customerName; form.channel.value = data.channel; form.message.value = data.message; }));
    async function loadBridgeStatus(){
      const res = await fetch('/api/app-bridge/status');
      const data = await res.json();
      const ack = receiverAck(data.lastDispatch);
      bridgeEl.innerHTML = '<div class="status-grid">' +
        '<div class="metric"><small>Bridge</small><strong class="' + (data.configured ? 'ok' : 'warn') + '">' + (data.configured ? 'Connected' : 'Local only') + '</strong></div>' +
        '<div class="metric"><small>AI Provider</small><strong>' + escapeHtml(data.aiProvider) + '</strong></div>' +
        '<div class="metric"><small>Fireworks</small><strong class="' + (data.fireworksConfigured ? 'ok' : 'warn') + '">' + (data.fireworksConfigured ? 'Configured' : 'Not configured') + '</strong></div>' +
        '<div class="metric"><small>Receiver Ack</small><strong class="' + (ack ? 'ok' : 'warn') + '">' + (ack ? 'Received' : 'None yet') + '</strong></div>' +
        '</div><p><small>Target:</small><br><code>' + escapeHtml(data.target || 'not configured') + '</code></p>' +
        '<p><small>Model:</small><br><code>' + escapeHtml(data.model || 'not set') + '</code></p>';
    }
    async function loadTasks(){ const res = await fetch('/api/tasks'); const data = await res.json(); renderTasks(data.tasks); await loadBridgeStatus(); }
    function renderTasks(tasks){
      if(!tasks.length){ tasksEl.innerHTML = '<div class="dashboard-empty"><span class="mini-pill warn">Waiting</span><h3>No requests yet</h3><p>Send one from ROSE intake to show classification, task ownership, app bridge dispatch, and receiver acknowledgement.</p></div>'; return; }
      tasksEl.innerHTML = tasks.map(task => {
        const ack = receiverAck(task.dispatch);
        const classifier = task.classifier || { provider: 'unknown', summary: '' };
        const providerClass = classifier.provider === 'fireworks' && !classifier.fallbackUsed ? 'ok' : classifier.fallbackUsed ? 'warn' : '';
        return '<article class="task">' +
          '<div class="task-head"><div><div class="row"><span class="pill">' + escapeHtml(task.id) + '</span><span class="pill">' + escapeHtml(task.workflow.label) + '</span><span class="pill">Confidence ' + Math.round(task.confidence * 100) + '%</span></div>' +
          '<h2>' + escapeHtml(task.customerName) + '</h2></div><span class="mini-pill ' + providerClass + '">' + escapeHtml(classifier.provider) + (classifier.fallbackUsed ? ' fallback' : ' live') + '</span></div>' +
          '<p>' + escapeHtml(task.message) + '</p>' +
          '<div class="summary-grid">' +
            '<div class="metric"><small>Classifier</small><strong class="' + providerClass + '">' + escapeHtml(classifier.provider) + '</strong></div>' +
            '<div class="metric"><small>Status</small><strong>' + escapeHtml(task.status) + '</strong></div>' +
            '<div class="metric"><small>Receiver</small><strong class="' + (task.receiverState.state === 'receiver_accepted' ? 'ok' : task.receiverState.state === 'dispatch_failed' ? 'danger' : 'warn') + '">' + escapeHtml(task.receiverState.label) + '</strong></div>' +
          '</div>' +
          '<p><strong>Classifier note:</strong> ' + escapeHtml(classifier.fallbackReason || classifier.summary || 'none') + '</p>' +
          '<p><strong>Escalation:</strong> <span class="' + (task.escalation.required ? 'danger' : 'ok') + '">' + (task.escalation.required ? 'Human review required' : 'Not required') + '</span> — ' + escapeHtml(task.escalation.reason) + '</p>' +
          '<p><strong>Receiver acknowledgement:</strong> <span class="' + (ack ? 'ok' : 'warn') + '">' + (ack ? 'Received by connected app' : 'No receiver acknowledgement yet') + '</span></p>' +
          '<h3>Live state ladder</h3><div class="state-ladder">' + task.lifecycle.map(step => '<div class="state-card"><span class="mini-pill ' + statusClass(step.status) + '">' + escapeHtml(step.status) + '</span><p>' + escapeHtml(step.label || step.action) + '</p><small>' + escapeHtml(step.actor) + '</small></div>').join('') + '</div>' +
          '<h3>Detailed timeline</h3><div class="timeline">' + task.lifecycle.map(step => '<div class="timeline-step"><span class="mini-pill ' + statusClass(step.status) + '">' + escapeHtml(step.status) + '</span> <strong>' + escapeHtml(step.actor) + '</strong>: ' + escapeHtml(step.action) + '<br><small>' + escapeHtml(step.at) + '</small></div>').join('') + '</div>' +
          '<div class="split"><div><h3>Email Preview</h3><pre>' + escapeHtml(task.notificationPreview.email) + '</pre></div><div><h3>WhatsApp Preview</h3><pre>' + escapeHtml(task.notificationPreview.whatsapp) + '</pre></div></div>' +
          '</article>';
      }).join('');
    }
    form.addEventListener('submit', async event => { event.preventDefault(); const payload = Object.fromEntries(new FormData(form).entries()); await fetch('/api/requests', { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify(payload) }); await loadTasks(); });
    loadTasks(); setInterval(loadBridgeStatus, 2500);
  </script>
</body>
</html>`;

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  if (req.url === '/health') return sendJson(res, 200, { ok: true, service: 'hunter-foreman-demo', appBridge: Boolean(process.env.FOREMAN_APP_WEBHOOK_URL), aiProvider: process.env.AI_PROVIDER || 'mock' });
  if (req.method === 'GET' && req.url === '/api/app-bridge/status') return sendJson(res, 200, getBridgeStatus());
  if (req.method === 'GET' && req.url === '/api/tasks') return sendJson(res, 200, { tasks });
  if (req.method === 'POST' && req.url === '/api/requests') {
    try {
      const body = await readBody(req);
      if (!body.message || !String(body.message).trim()) return sendJson(res, 422, { ok: false, error: 'Request message is required' });
      const task = await createTaskWithProvider(body);
      const dispatch = await sendToExternalApp(task).catch(error => ({ sent: false, reason: error.message }));
      task.dispatch = dispatch;
      task.receiverState = getReceiverState(task, dispatch);
      task.lifecycle = buildTaskLifecycle(task, dispatch);
      dispatches.unshift({ taskId: task.id, receiverState: task.receiverState, ...dispatch });
      tasks.unshift(task);
      return sendJson(res, 201, { ok: true, task, dispatch });
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: 'Invalid request body', detail: error.message });
    }
  }
  if (req.method === 'GET' && req.url.startsWith('/api/dispatch/')) {
    const taskId = decodeURIComponent(req.url.split('/').pop());
    return sendJson(res, 200, getDispatchForTask(taskId));
  }
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(html);
}).listen(port, () => console.log(`Hunter Foreman demo running on http://localhost:${port}`));
