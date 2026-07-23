import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';

const targetInput = process.env.HUNTER_PROOF_URL || 'https://576f31e6-hunter-ui-review.thetechguy712.workers.dev/portal';
const target = new URL(targetInput);
target.pathname = '/portal';
target.search = '?hunter-diagnostics=1&srg-headless=1';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const viewports = [
  { name: 'phone', width: 390, height: 844, mobile: true },
  { name: 'tablet', width: 820, height: 1180, mobile: true },
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'wide', width: 1920, height: 1080, mobile: false },
];

const proof = {
  marker: 'HUNTER_EXTERNAL_PLAYWRIGHT_PROOF_V2',
  target: target.toString(),
  generatedAt: new Date().toISOString(),
  shell: [],
  roleRoutes: [],
  chat: [],
  settings: [],
  runtimeErrors: [],
  consoleErrors: [],
  networkFailures: [],
  writeRequests: [],
  failures: [],
  passed: false,
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function openPage(viewport, label) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    deviceScaleFactor: 1,
    userAgent: viewport.mobile
      ? viewport.width >= 700
        ? 'Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror', error => proof.runtimeErrors.push({ viewport: viewport.name, label, message: String(error.stack || error.message || error) }));
  page.on('console', message => {
    if (['error', 'assert'].includes(message.type())) proof.consoleErrors.push({ viewport: viewport.name, label, type: message.type(), text: message.text() });
  });
  page.on('requestfailed', request => proof.networkFailures.push({ viewport: viewport.name, label, url: request.url(), method: request.method(), failure: request.failure()?.errorText || '' }));
  page.on('request', request => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) proof.writeRequests.push({ viewport: viewport.name, label, url: request.url(), method: request.method() });
  });
  const url = new URL(target);
  url.searchParams.set('proof', `${viewport.name}-${label}-${Date.now()}`);
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#sidebar', { state: 'attached', timeout: 30000 });
  await page.waitForSelector('#roleSelect', { state: 'attached', timeout: 30000 });
  await page.waitForFunction(() => Boolean(globalThis.__HUNTER_MOBILE_SIDEBAR__ && globalThis.__HUNTER_EXACT_HEAD_RECOVERY__), null, { timeout: 30000 });
  await page.waitForTimeout(900);
  return { context, page };
}

async function fingerprint(page) {
  return page.evaluate(() => {
    const modal = document.querySelector('#modal');
    const sidebar = document.querySelector('#sidebar');
    const scrim = document.querySelector('#drawerScrim');
    return {
      page: document.querySelector('.page.active')?.id || '',
      pageText: (document.querySelector('.page.active')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 220),
      modal: modal?.classList.contains('open') ? (document.querySelector('#modalTitle')?.textContent || '').trim() : '',
      chat: document.documentElement.classList.contains('hunter-unified-chat-mode') || Boolean(document.querySelector('#page-hunter-chat.active')),
      sidebar: Boolean(sidebar?.classList.contains('open')),
      scrim: Boolean(scrim?.classList.contains('open')),
      role: document.querySelector('#roleSelect')?.value || '',
      active: Array.from(document.querySelectorAll('#sidebar .active')).map(x => (x.textContent || '').replace(/\s+/g, ' ').trim()).join('|'),
    };
  });
}

async function forceClose(page) {
  await page.evaluate(() => globalThis.__HUNTER_MOBILE_SIDEBAR__?.close?.(true));
  await page.waitForTimeout(120);
  const state = await fingerprint(page);
  return !state.sidebar && !state.scrim;
}

async function openDrawer(page, viewport) {
  if (!viewport.mobile) return { ok: true, skipped: true };
  await forceClose(page);
  const selector = await page.evaluate(() => {
    const rendered = element => {
      if (!element) return false;
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    if (rendered(document.querySelector('#mobileMenu'))) return '#mobileMenu';
    if (rendered(document.querySelector('#hcs2Menu'))) return '#hcs2Menu';
    return null;
  });
  if (!selector) return { ok: false, error: 'No rendered mobile menu trigger' };
  let error = null;
  try { await page.locator(selector).click(); } catch (caught) { error = String(caught.message || caught); }
  await page.waitForTimeout(260);
  const state = await page.evaluate(() => globalThis.__HUNTER_MOBILE_SIDEBAR__?.visibleState?.() || ({
    visible: Boolean(document.querySelector('#sidebar.open')),
    scrimVisible: Boolean(document.querySelector('#drawerScrim.open')),
  }));
  return { ok: !error && Boolean(state?.visible && state?.scrimVisible), selector, state, error };
}

async function closeOverlays(page) {
  await page.evaluate(() => {
    globalThis.__HUNTER_MOBILE_SIDEBAR__?.close?.(true);
    document.querySelector('#modal')?.classList.remove('open');
    document.querySelector('#accountMenu')?.classList.remove('open');
    document.querySelectorAll('#hunterRoleAttention,#hunterAttentionPopUnified,#hunterAttentionPop,#hunterRolePop').forEach(element => { element.hidden = true; });
  });
  await page.waitForTimeout(100);
}

async function routeDescriptors(page) {
  return page.evaluate(() => {
    const rendered = element => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    };
    const attrs = ['data-view', 'data-business-custom', 'data-ops-custom', 'data-hunter-custom', 'data-role-accountability-route', 'data-family-tracking', 'data-family-accountability', 'data-unified-chat', 'data-unified-project'];
    const nodes = Array.from(document.querySelectorAll('#sidebar #nav button,#sidebar #nav a,#sidebar #hunterUnifiedChatNav button,#sidebar #hunterUnifiedChatNav a,#sidebar [data-view],#sidebar [data-unified-chat],#sidebar [data-unified-project],#sidebar [data-role-accountability-route],#sidebar [data-business-custom],#sidebar [data-family-tracking],#sidebar [data-family-accountability],#sidebar [data-ops-custom],#sidebar [data-hunter-custom]'))
      .filter(rendered)
      .filter((element, index, all) => all.indexOf(element) === index);
    const seen = new Set();
    return nodes.map(element => {
      const label = (element.getAttribute('aria-label') || element.textContent || '').replace(/\s+/g, ' ').trim();
      let key = '';
      for (const attr of attrs) if (element.hasAttribute(attr)) { key = `${attr}:${element.getAttribute(attr)}`; break; }
      if (!key) key = `label:${label}`;
      return { key, label, active: element.classList.contains('active') };
    }).filter(item => item.label && !seen.has(item.key) && seen.add(item.key));
  });
}

async function resolveRoute(page, descriptor) {
  return page.evaluate(desc => {
    const rendered = element => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    };
    const nodes = Array.from(document.querySelectorAll('#sidebar #nav button,#sidebar #nav a,#sidebar #hunterUnifiedChatNav button,#sidebar #hunterUnifiedChatNav a,#sidebar [data-view],#sidebar [data-unified-chat],#sidebar [data-unified-project],#sidebar [data-role-accountability-route],#sidebar [data-business-custom],#sidebar [data-family-tracking],#sidebar [data-family-accountability],#sidebar [data-ops-custom],#sidebar [data-hunter-custom]')).filter(rendered);
    let element = null;
    if (desc.key.startsWith('label:')) element = nodes.find(node => (node.getAttribute('aria-label') || node.textContent || '').replace(/\s+/g, ' ').trim() === desc.label);
    else {
      const split = desc.key.indexOf(':');
      const attr = desc.key.slice(0, split), value = desc.key.slice(split + 1);
      element = nodes.find(node => node.getAttribute(attr) === value);
    }
    if (!element) return null;
    if (!element.id) element.id = `hunterV2Route${Math.random().toString(36).slice(2)}`;
    return `#${CSS.escape(element.id)}`;
  }, descriptor);
}

async function verifyShell(viewport) {
  const { context, page } = await openPage(viewport, 'shell');
  try {
    const initial = await fingerprint(page);
    const geometry = await page.evaluate(() => {
      const top = document.querySelector('.topbar')?.getBoundingClientRect();
      const search = document.querySelector('.top-search')?.getBoundingClientRect();
      const menu = document.querySelector('#mobileMenu')?.getBoundingClientRect();
      const bell = document.querySelector('#hunterTopButton')?.getBoundingClientRect();
      const avatar = (document.querySelector('#topAvatar') || document.querySelector('.topbar .avatar'))?.getBoundingClientRect();
      const overlap = (a, b) => Boolean(a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom));
      return {
        htmlWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        innerWidth,
        headerInside: !top || (top.left >= -1 && top.right <= innerWidth + 1),
        overlaps: { menuSearch: overlap(menu, search), searchBell: overlap(search, bell), bellAvatar: overlap(bell, avatar) },
      };
    });
    let drawer = { ok: true, skipped: !viewport.mobile }, drawerClosed = true;
    if (viewport.mobile) {
      drawer = await openDrawer(page, viewport);
      const roleBox = await page.locator('#roleSelect').boundingBox();
      drawer.roleSelectorReachable = Boolean(roleBox && roleBox.width > 0 && roleBox.height > 0);
      const closeButton = page.locator('#hunterMobileSidebarClose');
      try { await closeButton.click(); } catch { await forceClose(page); }
      drawerClosed = await forceClose(page);
    }
    let bell = { ok: true };
    try {
      await page.locator('#hunterTopButton').click();
      await page.waitForTimeout(220);
      bell = await page.evaluate(() => {
        const rendered = element => {
          if (!element) return false;
          const style = getComputedStyle(element), rect = element.getBoundingClientRect();
          return !element.hidden && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const panels = ['#hunterRoleAttention', '#hunterAttentionPopUnified', '#hunterAttentionPop', '#hunterRolePop'].map(selector => document.querySelector(selector)).filter(rendered);
        return { ok: panels.length === 1, panel: panels[0]?.id || '', count: panels.length };
      });
    } catch (error) { bell = { ok: false, error: String(error.message || error) }; }
    const overlaps = Object.entries(geometry.overlaps).filter(([, value]) => value).map(([key]) => key);
    const ok = (!viewport.mobile || (!initial.sidebar && !initial.scrim)) && initial.page && initial.pageText.length > 20 && geometry.htmlWidth <= viewport.width + 1 && geometry.bodyWidth <= viewport.width + 1 && geometry.headerInside && overlaps.length === 0 && drawer.ok && (drawer.roleSelectorReachable !== false) && drawerClosed && bell.ok;
    const entry = { viewport: viewport.name, initial, geometry, drawer, drawerClosed, bell, ok };
    proof.shell.push(entry);
    if (!ok) proof.failures.push({ phase: 'shell', ...entry });
    await closeOverlays(page);
    await page.screenshot({ path: `${viewport.name}-hunter-proof-v2.png`, fullPage: false });
  } finally { await context.close(); }
}

async function verifyRoleRoutes(viewport) {
  const { context, page } = await openPage(viewport, 'roles');
  try {
    const roles = await page.locator('#roleSelect option').evaluateAll(options => options.map(option => option.value));
    for (const role of roles) {
      if (viewport.mobile) {
        const drawer = await openDrawer(page, viewport);
        if (!drawer.ok) {
          const entry = { viewport: viewport.name, role, route: 'drawer', drawer, ok: false };
          proof.roleRoutes.push(entry); proof.failures.push({ phase: 'role-drawer', ...entry }); continue;
        }
      }
      const roleBox = await page.locator('#roleSelect').boundingBox();
      const selectorReachable = Boolean(roleBox && roleBox.width > 0 && roleBox.height > 0);
      await page.locator('#roleSelect').selectOption(role);
      await page.waitForTimeout(300);
      const selected = await page.locator('#roleSelect').inputValue();
      const routes = await routeDescriptors(page);
      for (const descriptor of routes) {
        if (viewport.mobile) {
          const drawer = await openDrawer(page, viewport);
          if (!drawer.ok) {
            const entry = { viewport: viewport.name, role, route: descriptor, drawer, ok: false };
            proof.roleRoutes.push(entry); proof.failures.push({ phase: 'route-drawer', ...entry }); continue;
          }
        }
        const selector = await resolveRoute(page, descriptor);
        const before = await fingerprint(page);
        let after = before, error = null;
        if (!selector) error = 'Current rendered route could not be resolved';
        else {
          try {
            await page.locator(selector).click();
            await page.waitForTimeout(260);
            after = await fingerprint(page);
          } catch (caught) { error = String(caught.message || caught); }
        }
        const changed = descriptor.active || before.page !== after.page || before.modal !== after.modal || before.chat !== after.chat || before.active !== after.active;
        const closed = !viewport.mobile || (!after.sidebar && !after.scrim);
        const ok = selected === role && selectorReachable && !error && changed && closed;
        const entry = { viewport: viewport.name, role, route: descriptor, selector, before, after, changed, closed, error, ok };
        proof.roleRoutes.push(entry);
        if (!ok) proof.failures.push({ phase: 'role-route', ...entry });
        await closeOverlays(page);
      }
    }
  } finally { await context.close(); }
}

async function openHunter(page, viewport) {
  if (viewport.mobile) {
    const drawer = await openDrawer(page, viewport);
    if (!drawer.ok) throw new Error(`Could not open Hunter drawer: ${JSON.stringify(drawer)}`);
  }
  const descriptor = (await routeDescriptors(page)).find(item => /Talk to Hunter/i.test(item.label));
  if (!descriptor) throw new Error('Talk to Hunter route missing');
  const selector = await resolveRoute(page, descriptor);
  if (!selector) throw new Error('Talk to Hunter route not rendered');
  await page.locator(selector).click();
  await page.waitForTimeout(300);
}

async function verifyChat(viewport) {
  const { context, page } = await openPage(viewport, 'chat');
  try {
    let result = null, error = null;
    try {
      await openHunter(page, viewport);
      const input = page.locator('#hcs2Input');
      await input.waitFor({ state: 'visible' });
      const message = `Hunter ${viewport.name} exact-head proof`;
      await input.fill(message);
      const before = await page.locator('#page-hunter-chat .hcs2-row.user').count();
      await page.locator('#hcs2Send').click();
      await page.waitForTimeout(350);
      result = await page.evaluate(() => {
        const input = document.querySelector('#hcs2Input'), rect = input?.getBoundingClientRect();
        const attach = document.querySelector('#hcs2Attach')?.getBoundingClientRect();
        const voice = document.querySelector('#hcs2Voice')?.getBoundingClientRect();
        const send = document.querySelector('#hcs2Send')?.getBoundingClientRect();
        const overlap = (a, b) => Boolean(a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom));
        return {
          users: document.querySelectorAll('#page-hunter-chat .hcs2-row.user').length,
          inputValue: input?.value || '',
          inputWidth: rect?.width || 0,
          overlaps: { attach: overlap(rect, attach), voice: overlap(rect, voice), send: overlap(rect, send) },
          composerAudit: globalThis.__HUNTER_CHAT_COMPOSER_RELIABILITY_AUDIT__ || null,
        };
      });
      result.before = before;
    } catch (caught) { error = String(caught.message || caught); }
    const ok = !error && result?.users > result?.before && result?.inputValue === '' && result?.inputWidth >= 80 && !Object.values(result?.overlaps || {}).some(Boolean) && result?.composerAudit?.passed === true;
    const entry = { viewport: viewport.name, result, error, ok };
    proof.chat.push(entry);
    if (!ok) proof.failures.push({ phase: 'chat', ...entry });
  } finally { await context.close(); }
}

async function verifySettings(viewport) {
  const { context, page } = await openPage(viewport, 'settings');
  try {
    let result = null, error = null;
    try {
      if (viewport.mobile) {
        const drawer = await openDrawer(page, viewport);
        if (!drawer.ok) throw new Error(`Could not open Settings drawer: ${JSON.stringify(drawer)}`);
      }
      await page.locator('#accountCard').click();
      await page.locator('#menuSettings').click();
      await page.waitForSelector('#modal.open #modalTitle');
      const title = (await page.locator('#modalTitle').textContent())?.trim();
      if (title !== 'Settings') throw new Error(`Settings modal title was ${title}`);
      const tabs = await page.locator('[data-final-settings]').evaluateAll(elements => elements.map(element => element.dataset.finalSettings));
      const tabResults = [];
      for (const tab of tabs) {
        const locator = page.locator(`[data-final-settings="${tab}"]`);
        await locator.click();
        tabResults.push({ tab, active: await locator.evaluate(element => element.classList.contains('active')) });
      }
      result = await page.evaluate(async () => {
        function setSelect(key, value) {
          const select = document.querySelector(`select[data-final-pref="${key}"]`);
          if (!select) return { ok: false, reason: 'missing' };
          const option = Array.from(select.options).find(item => item.value === value || item.textContent.trim() === value);
          if (!option) return { ok: false, reason: 'option', options: Array.from(select.options).map(item => item.value) };
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return { ok: true, value: select.value };
        }
        const theme = setSelect('theme', 'Light');
        const density = setSelect('density', 'Compact');
        const font = setSelect('fontSize', 'Large');
        const actions = setSelect('responseActions', 'Collapsed');
        const toggle = document.querySelector('[data-final-toggle="inApp"]');
        const before = toggle?.classList.contains('on');
        toggle?.click();
        await new Promise(resolve => setTimeout(resolve, 400));
        return {
          theme, density, font, actions,
          toggleChanged: Boolean(toggle && before !== toggle.classList.contains('on')),
          datasets: {
            theme: document.documentElement.dataset.hunterThemeEffective || '',
            density: document.documentElement.dataset.hunterDensity || '',
            font: document.documentElement.dataset.hunterFontSize || '',
            actions: document.documentElement.dataset.hunterActionLayout || '',
          },
          settingsAudit: globalThis.__HUNTER_SETTINGS_RUNTIME_AUDIT__ || null,
          stability: globalThis.__HUNTER_OWNER_LAST_STABILITY_AUDIT__ || null,
        };
      });
      result.tabs = tabResults;
    } catch (caught) { error = String(caught.message || caught); }
    const ok = !error && result?.tabs?.every(item => item.active) && result?.toggleChanged && result?.datasets?.theme === 'light' && result?.datasets?.density === 'compact' && result?.datasets?.font === 'large' && result?.datasets?.actions === 'collapsed' && result?.settingsAudit?.passed === true && result?.stability?.passed === true;
    const entry = { viewport: viewport.name, result, error, ok };
    proof.settings.push(entry);
    if (!ok) proof.failures.push({ phase: 'settings', ...entry });
  } finally { await context.close(); }
}

try {
  for (const viewport of viewports) {
    await verifyShell(viewport);
    if (viewport.name === 'phone' || viewport.name === 'desktop') await verifyRoleRoutes(viewport);
    await verifyChat(viewport);
    await verifySettings(viewport);
  }
  proof.networkFailures = proof.networkFailures.filter(item => !/favicon|hunter-logo/i.test(item.url || ''));
  proof.writeRequests = proof.writeRequests.filter(item => !String(item.url || '').includes('hunter-diagnostics'));
  proof.passed = proof.failures.length === 0 && proof.runtimeErrors.length === 0 && proof.consoleErrors.length === 0 && proof.networkFailures.length === 0 && proof.writeRequests.length === 0;
} catch (error) {
  proof.failures.push({ phase: 'runner', error: String(error.stack || error.message || error) });
  proof.passed = false;
} finally {
  proof.completedAt = new Date().toISOString();
  await writeFile('hunter-ui-proof-v2.json', JSON.stringify(proof, null, 2));
  await browser.close();
}

console.log(JSON.stringify({
  passed: proof.passed,
  failures: proof.failures.length,
  shell: proof.shell.length,
  roleRoutes: proof.roleRoutes.length,
  chat: proof.chat.length,
  settings: proof.settings.length,
  runtimeErrors: proof.runtimeErrors.length,
  consoleErrors: proof.consoleErrors.length,
  networkFailures: proof.networkFailures.length,
  writeRequests: proof.writeRequests.length,
}, null, 2));
if (!proof.passed) process.exitCode = 2;
