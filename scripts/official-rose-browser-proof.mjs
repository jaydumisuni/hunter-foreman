import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = String(process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const outputDir = path.resolve(process.env.PROOF_OUTPUT_DIR || 'test-results/official-rose');
const starter = 'We need event booking, digital invitations, guest tickets, QR check-in and a clear approval flow.';
const internalLanguage = /Fireworks|Workers AI|Cloudflare|deterministic fallback|classifier|provider|backend|API endpoint|language model|Hunter Foreman|public demo|task lifecycle/i;
const unsafeClaims = /(?:\bwe(?:'|’)?ll\b|\bwe will\b|\bwe can\b)[^.!?]{0,90}\b(?:send|set up|create|generate|enable|process|issue|embed|scan|mark|export)\b|\b(?:has|have|was|were)\s+(?:sent|processed|generated|created|booked)\b|\b(?:live|real-time)\s+dashboard\b|\brunning the THETECHGUY app\b|\binstantly marks\b/i;

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const apiRequests = [];
const pageErrors = [];
page.on('request', request => {
  const url = new URL(request.url());
  if (url.pathname.startsWith('/api/')) apiRequests.push({ method: request.method(), path: url.pathname });
});
page.on('pageerror', error => pageErrors.push(String(error)));

const report = { baseUrl, passed: false, apiRequests, pageErrors };
try {
  await page.request.post(`${baseUrl}/api/reset`);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const input = page.locator('#messageInput');
  const send = page.locator('#sendBtn');
  const chat = page.locator('.rose-window .chat');
  await input.waitFor({ state: 'visible', timeout: 30000 });
  assert.equal((await input.inputValue()).trim(), starter);
  assert.equal(await page.locator('html').getAttribute('data-hunter-rose-runtime'), 'installed');
  await page.screenshot({ path: path.join(outputDir, 'before-send.png'), fullPage: true });

  await send.click();
  await page.waitForFunction(() => {
    const node = document.querySelector('.rose-window .chat');
    return node?.classList.contains('conversation-active') && /request has been recorded/i.test(node.innerText) && /HF-[A-Z0-9]+/.test(node.innerText);
  }, null, { timeout: 90000 });

  const firstChat = await chat.innerText();
  const ids = [...firstChat.matchAll(/HF-[A-Z0-9]+/g)].map(match => match[0]);
  assert.equal(await input.inputValue(), '');
  assert.equal(await input.getAttribute('placeholder'), 'Reply to ROSE…');
  assert.equal(await chat.evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(5, 5, 8)');
  assert.equal(new Set(ids).size, 1);
  assert.equal(apiRequests.filter(item => item.method === 'POST' && item.path === '/api/requests').length, 1);
  assert.doesNotMatch(firstChat, internalLanguage);
  assert.match(firstChat, /Thanks|I[’']ve got it/i);
  assert.match(firstChat, /request has been recorded/i);
  assert.equal(await page.locator('#kpiRequests').innerText(), '1');
  assert.equal(await page.locator('#kpiActive').innerText(), '1');
  assert.match(await page.locator('#latestTasks').innerText(), new RegExp(ids[0]));
  assert.ok(await page.locator('.rose-answer-actions').count() >= 2);
  await page.screenshot({ path: path.join(outputDir, 'after-first-send.png'), fullPage: true });

  const roseCount = await page.locator('.rose-window .chat .bubble.rose').count();
  await input.fill('How should QR check-in work for 200 guests?');
  await send.click();
  await page.locator('.rose-window .chat .bubble.rose').nth(roseCount).waitFor({ state: 'visible', timeout: 90000 });
  const lastAnswer = await page.locator('.rose-window .chat .bubble.rose').last().innerText();
  assert.equal(await input.inputValue(), '');
  assert.equal(apiRequests.filter(item => item.method === 'POST' && item.path === '/api/requests').length, 1);
  assert.match(lastAnswer, /unique QR code|unique code/i);
  assert.match(lastAnswer, /doesn[’']t generate or scan the actual codes/i);
  assert.doesNotMatch(lastAnswer, internalLanguage);
  assert.doesNotMatch(lastAnswer, unsafeClaims);
  assert.ok(lastAnswer.trim().split(/\s+/).length <= 180);
  await page.screenshot({ path: path.join(outputDir, 'after-follow-up.png'), fullPage: true });

  await page.getByRole('button', { name: 'Apps' }).click();
  const pos = page.locator('.apps-grid .app-card', { hasText: 'POS System' });
  await pos.waitFor({ state: 'visible', timeout: 30000 });
  assert.equal(await pos.count(), 1);
  assert.match(await pos.innerText(), /Not connected/i);
  await page.screenshot({ path: path.join(outputDir, 'apps-pos.png'), fullPage: true });

  report.passed = true;
  report.requestId = ids[0];
  report.firstChat = firstChat;
  report.lastAnswer = lastAnswer;
  report.pos = await pos.innerText();
  report.actionRows = await page.locator('.rose-answer-actions').count();
  await fs.writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.error = String(error?.stack || error);
  await page.screenshot({ path: path.join(outputDir, 'failure.png'), fullPage: true }).catch(() => {});
  await fs.writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
