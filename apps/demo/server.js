const http = require('http');
const { createTask } = require('../../packages/foreman-core');

const port = process.env.PORT || 3000;
const tasks = [];

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
    .warn { color: var(--warn); }
    .danger { color: var(--danger); }
    .steps { margin: 10px 0 0; padding-left: 20px; color: #cbd6e5; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    pre { white-space: pre-wrap; background: #0d1118; border: 1px solid var(--line); padding: 12px; border-radius: 14px; color: #dce8f7; }
    .flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
    .flow div { border: 1px solid var(--line); background: rgba(16,21,31,.8); border-radius: 16px; padding: 13px; color: #dce8f7; font-weight: 800; }
    .examples { display: grid; gap: 8px; margin-top: 12px; }
    @media (max-width: 900px) { .grid, .split, .flow { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <span class="tag">Hunter Foreman Phase 1</span>
        <h1>AI Operations Foreman</h1>
        <p>ROSE receives the request. Hunter Foreman routes the work, creates a task, previews updates, and escalates when a human should decide.</p>
        <div class="flow"><div>1. ROSE intake</div><div>2. Foreman routes</div><div>3. Dashboard updates</div><div>4. Human if needed</div></div>
      </div>
      <div class="card hero-card"><strong>Public-safe demo</strong><p>No private Hunter Core, no repair modules, no secrets, no client data. This is a clean public extraction.</p></div>
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
    document.querySelectorAll('[data-example]').forEach(btn => btn.addEventListener('click', () => {
      const data = examples[btn.dataset.example];
      form.customerName.value = data.customerName;
      form.channel.value = data.channel;
      form.message.value = data.message;
    }));
    async function loadTasks(){ const res = await fetch('/api/tasks'); const data = await res.json(); renderTasks(data.tasks); }
    function renderTasks(tasks){
      if(!tasks.length){ tasksEl.innerHTML = '<p>No requests yet. Send one from ROSE intake.</p>'; return; }
      tasksEl.innerHTML = tasks.map(task => `
        <article class="task">
          <div class="row"><span class="pill">${task.id}</span><span class="pill ok">${task.workflow.label}</span><span class="pill ${task.escalation.required ? 'warn' : 'ok'}">Confidence: ${Math.round(task.confidence * 100)}%</span></div>
          <strong>${task.customerName}</strong><p>${task.message}</p>
          <p>Status: <strong class="${task.escalation.required ? 'warn' : ''}">${task.status}</strong></p>
          <p>Owner: <strong>${task.workflow.owner}</strong></p>
          <p>Escalation: <strong class="${task.escalation.required ? 'danger' : ''}">${task.escalation.required ? 'Human review required' : 'Not required'}</strong> — ${task.escalation.reason}</p>
          <ol class="steps">${task.workflow.steps.map(step => `<li>${step}</li>`).join('')}</ol>
          <div class="split"><div><h3>Email Preview</h3><pre>${task.notificationPreview.email}</pre></div><div><h3>WhatsApp Preview</h3><pre>${task.notificationPreview.whatsapp}</pre></div></div>
        </article>`).join('');
    }
    form.addEventListener('submit', async event => { event.preventDefault(); const payload = Object.fromEntries(new FormData(form).entries()); await fetch('/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); await loadTasks(); });
    loadTasks();
  </script>
</body>
</html>`;

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  if (req.url === '/health') return sendJson(res, 200, { ok: true, service: 'hunter-foreman-demo' });
  if (req.method === 'GET' && req.url === '/api/tasks') return sendJson(res, 200, { tasks });
  if (req.method === 'POST' && req.url === '/api/requests') {
    try {
      const body = await readBody(req);
      if (!body.message || !String(body.message).trim()) return sendJson(res, 422, { ok: false, error: 'Request message is required' });
      const task = createTask(body);
      tasks.unshift(task);
      return sendJson(res, 201, { ok: true, task });
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: 'Invalid request body' });
    }
  }
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(html);
}).listen(port, () => console.log(`Hunter Foreman demo running on http://localhost:${port}`));
