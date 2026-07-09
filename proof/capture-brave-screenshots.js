const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const brave = process.argv[2];
const outDir = process.argv[3];
const port = 9223;
const target = 'http://localhost:3000/';
const userDataDir = path.join(process.env.TEMP || outDir, `hf-brave-profile-${Date.now()}`);
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(userDataDir, { recursive: true });

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function request(method, url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(data ? JSON.parse(data) : {}); } catch (error) { reject(error); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}
async function waitForPageTarget() {
  for (let i = 0; i < 80; i++) {
    try {
      const targets = await request('GET', `http://127.0.0.1:${port}/json/list`);
      const page = targets.find(t => t.type === 'page' && t.url.startsWith(target)) || targets.find(t => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error('Timed out waiting for Brave page target');
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result || {});
    }
  };
  return new Promise((resolve, reject) => {
    ws.onerror = reject;
    ws.onopen = () => resolve({
      send(method, params = {}) {
        const callId = ++id;
        ws.send(JSON.stringify({ id: callId, method, params }));
        return new Promise((resolve, reject) => pending.set(callId, { resolve, reject }));
      },
      close() { ws.close(); },
    });
  });
}
async function capture(client, name, full = false) {
  await sleep(500);
  const result = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: full });
  fs.writeFileSync(path.join(outDir, name), Buffer.from(result.data, 'base64'));
}
async function evalJs(client, expression) {
  return client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
}

(async () => {
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--window-size=1440,1000',
    target,
  ];
  const proc = spawn(brave, args, { detached: false, stdio: 'ignore' });
  try {
    const pageTarget = await waitForPageTarget();
    const client = await connect(pageTarget.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await client.send('Page.navigate', { url: target });
    await sleep(1800);

    await capture(client, '01-overview-clean.png', true);
    await evalJs(client, `document.getElementById('messageInput').value='We need event booking, digital invitations, guest tickets, QR check-in and a clear approval flow.'; document.getElementById('sendBtn').click();`);
    await sleep(1400);
    await capture(client, '02-overview-after-request.png', true);

    const tabs = [
      ['requests', '03-requests.png'],
      ['tasks', '04-task-board.png'],
      ['apps', '05-connected-apps.png'],
      ['analytics', '06-analytics.png'],
      ['settings', '07-settings.png'],
      ['system', '08-system-health.png'],
    ];
    for (const [tab, file] of tabs) {
      await evalJs(client, `document.querySelector('[data-tab="${tab}"]').click(); window.scrollTo(0,0);`);
      await sleep(750);
      await capture(client, file, true);
    }

    await evalJs(client, `document.querySelector('[data-tab="overview"]').click();`);
    await sleep(500);
    const appState = await evalJs(client, `JSON.stringify({
      title: document.getElementById('systemTitle')?.textContent,
      activeTab: document.querySelector('.tab.active')?.id,
      hasSidebarLogo: Boolean(document.querySelector('.side-logo img[src^="data:image/png;base64,"]')),
      hasHeaderLogo: Boolean(document.querySelector('.brand-logo')),
      kpiRequests: document.getElementById('kpiRequests')?.textContent,
      fireworksState: document.getElementById('fireworksState')?.textContent,
      bridgeState: document.getElementById('bridgeState')?.textContent,
      receiverState: document.getElementById('receiverState')?.textContent
    }, null, 2)`);
    fs.writeFileSync(path.join(outDir, 'ui-state.json'), appState.result.value);
    client.close();
  } finally {
    proc.kill();
    await sleep(500);
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
