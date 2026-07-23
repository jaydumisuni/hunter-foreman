import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';

const targetInput = process.env.HUNTER_PROOF_URL || 'https://ec391a63-hunter-ui-review.thetechguy712.workers.dev/portal';
const target = new URL(targetInput);
target.pathname = '/portal';
target.search = '?hunter-diagnostics=1&srg-headless=1';

const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const viewports = [
  { name: 'phone', width: 390, height: 844, mobile: true },
  { name: 'tablet', width: 820, height: 1180, mobile: true },
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'wide', width: 1920, height: 1080, mobile: false },
];

const proof = {
  marker: 'HUNTER_EXTERNAL_PLAYWRIGHT_PROOF_V1',
  target: target.toString(),
  generatedAt: new Date().toISOString(),
  viewports: [],
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

const rendered = async (locator) => {
  try { return await locator.isVisible(); } catch { return false; }
};

async function createPage(viewport, label) {
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
  page.on('pageerror', error => proof.runtimeErrors.push({ viewport: viewport.name, label, message: String(error.stack || error.message || error) }));
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'assert') {
      proof.consoleErrors.push({ viewport: viewport.name, label, type: message.type(), text: message.text() });
    }
  });
  page.on('requestfailed', request => proof.networkFailures.push({ viewport: viewport.name, label, url: request.url(), method: request.method(), failure: request.failure()?.errorText || '' }));
  page.on('request', request => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
      proof.writeRequests.push({ viewport: viewport.name, label, url: request.url(), method: request.method() });
    }
  });
  const url = new URL(target);
  url.searchParams.set('proof', `${viewport.name}-${label}-${Date.now()}`);
  await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#sidebar', { state: 'attached', timeout: 30000 });
  await page.waitForSelector('#roleSelect', { state: 'attached', timeout: 30000 });
  await page.waitForFunction(() => Boolean(globalThis.__HUNTER_SHELL_DIAGNOSTICS__ && globalThis.__HUNTER_SERGEANT_UI__), null, { timeout: 30000 });
  await page.waitForTimeout(300);
  return { context, page };
}

async function fingerprint(page) {
  return page.evaluate(() => {
    const modal = document.querySelector('#modal');
    return {
      page: document.querySelector('.page.active')?.id || '',
      modal: modal?.classList.contains('open') ? (document.querySelector('#modalTitle')?.textContent || '') : '',
      chat: document.documentElement.classList.contains('hunter-unified-chat-mode') || Boolean(document.querySelector('#page-hunter-chat.active')),
      sidebar: Boolean(document.querySelector('#sidebar.open')),
      scrim: Boolean(document.querySelector('#drawerScrim.open')),
      role: document.querySelector('#roleSelect')?.value || '',
      active: Array.from(document.querySelectorAll('#sidebar .active')).map(x => (x.textContent || '').replace(/\s+/g, ' ').trim()).join('|'),
    };
  });
}

async function openDrawer(page, viewport) {
  if (!viewport.mobile) return { ok: true, skipped: true };
  const selector = await rendered(page.locator('#mobileMenu')) ? '#mobileMenu' : '#hcs2Menu';
  await page.locator(selector).click({ timeout: 10000 });
  await page.waitForTimeout(250);
  const state = await page.evaluate(() => globalThis.__HUNTER_MOBILE_SIDEBAR__?.visibleState?.() || ({
    visible: Boolean(document.querySelector('#sidebar.open')),
    scrimVisible: Boolean(document.querySelector('#drawerScrim.open')),
  }));
  return { ok: Boolean(state?.visible && state?.scrimVisible), selector, state };
}

async function closeDrawer(page, viewport) {
  if (!viewport.mobile) return true;
  const scrim = page.locator('#drawerScrim');
  if (await rendered(scrim)) await scrim.click({ position: { x: 2, y: 2 }, timeout: 10000 }).catch(() => {});
  await page.evaluate(() => globalThis.__HUNTER_MOBILE_SIDEBAR__?.close?.());
  await page.waitForTimeout(180);
  const state = await fingerprint(page);
  return !state.sidebar && !state.scrim;
}

async function scanShell(page, viewport) {
  const result = await page.evaluate(() => {
    const diagnostics = globalThis.__HUNTER_SHELL_DIAGNOSTICS__;
    const scan = diagnostics.scan();
    const packet = diagnostics.packet();
    const srg = globalThis.__HUNTER_SERGEANT_UI__.report();
    const top = document.querySelector('.topbar')?.getBoundingClientRect();
    const search = document.querySelector('.top-search')?.getBoundingClientRect();
    const menu = document.querySelector('#mobileMenu')?.getBoundingClientRect();
    const bell = document.querySelector('#hunterTopButton')?.getBoundingClientRect();
    const avatar = (document.querySelector('#topAvatar') || document.querySelector('.topbar .avatar'))?.getBoundingClientRect();
    const overlap = (a, b) => Boolean(a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom));
    return {
      scan,
      packet,
      srg,
      geometry: {
        innerWidth,
        htmlWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        headerInside: !top || (top.left >= -1 && top.right <= innerWidth + 1),
        overlaps: {
          menuSearch: overlap(menu, search),
          searchBell: overlap(search, bell),
          bellAvatar: overlap(bell, avatar),
        },
      },
    };
  });
  const problems = {
    overflow: result.geometry.htmlWidth > viewport.width + 1 || result.geometry.bodyWidth > viewport.width + 1,
    headerOutside: !result.geometry.headerInside,
    overlaps: Object.entries(result.geometry.overlaps).filter(([, value]) => value).map(([key]) => key),
    obscured: result.scan?.obscured || [],
    unaccounted: result.scan?.unaccounted || [],
    unnamed: result.scan?.unnamed || [],
  };
  const ok = !problems.overflow && !problems.headerOutside && !problems.overlaps.length && !problems.obscured.length && !problems.unaccounted.length && !problems.unnamed.length;
  return { ok, problems, packet: result.packet, srg: result.srg };
}

async function verifyShell(viewport) {
  const { context, page } = await createPage(viewport, 'shell');
  try {
    const scan = await scanShell(page, viewport);
    let drawer = { ok: true, skipped: !viewport.mobile };
    let drawerClosed = true;
    if (viewport.mobile) {
      drawer = await openDrawer(page, viewport).catch(error => ({ ok: false, error: String(error.message || error) }));
      drawerClosed = drawer.ok ? await closeDrawer(page, viewport) : false;
    }
    let bell = { ok: true, skipped: false };
    const bellButton = page.locator('#hunterTopButton');
    if (await rendered(bellButton)) {
      try {
        await bellButton.click({ timeout: 10000 });
        await page.waitForTimeout(220);
        bell = await page.evaluate(() => {
          const isRendered = e => {
            if (!e) return false;
            const s = getComputedStyle(e), r = e.getBoundingClientRect();
            return !e.hidden && s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
          };
          const panels = ['#hunterRoleAttention', '#hunterAttentionPopUnified', '#hunterAttentionPop'].map(s => document.querySelector(s)).filter(isRendered);
          return { ok: panels.length === 1, panel: panels[0]?.id || '', count: panels.length };
        });
      } catch (error) { bell = { ok: false, error: String(error.message || error) }; }
    }
    const entry = { viewport: viewport.name, scan, drawer, drawerClosed, bell, ok: scan.ok && drawer.ok && drawerClosed && bell.ok };
    proof.viewports.push(entry);
    if (!entry.ok) proof.failures.push({ phase: 'shell', ...entry });
    await page.screenshot({ path: `${viewport.name}-hunter-proof.png`, fullPage: false });
  } finally { await context.close(); }
}

async function visibleRoutes(page) {
  return page.evaluate(() => {
    const isRendered = e => {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0 && r.width > 0 && r.height > 0;
    };
    return Array.from(document.querySelectorAll('#sidebar #nav button,#sidebar #nav a,#sidebar [data-view],#sidebar [data-business-custom],#sidebar [data-role-accountability-route],#sidebar [data-family-tracking],#sidebar [data-ops-custom],#sidebar [data-hunter-custom],#sidebar [data-unified-chat]'))
      .filter(isRendered)
      .filter((e, i, a) => a.indexOf(e) === i)
      .map((e, index) => {
        if (!e.id) e.id = `hunterExternalProofNav${index}`;
        return { selector: `#${CSS.escape(e.id)}`, label: (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim(), active: e.classList.contains('active') };
      });
  });
}

async function verifyRoleRoutes(viewport) {
  const { context, page } = await createPage(viewport, 'roles');
  try {
    const roles = await page.locator('#roleSelect option').evaluateAll(options => options.map(option => option.value));
    for (const role of roles) {
      await page.locator('#roleSelect').selectOption(role);
      await page.waitForTimeout(260);
      const roleOk = await page.locator('#roleSelect').inputValue() === role;
      if (viewport.mobile) {
        const roleBox = await page.locator('#roleSelect').boundingBox();
        if (!roleBox || roleBox.width <= 0 || roleBox.height <= 0) proof.failures.push({ phase: 'role-selector-hit', viewport: viewport.name, role, roleBox });
      }
      if (viewport.mobile) {
        const drawer = await openDrawer(page, viewport).catch(error => ({ ok: false, error: String(error.message || error) }));
        if (!drawer.ok) {
          const entry = { viewport: viewport.name, role, route: 'drawer', drawer, ok: false };
          proof.roleRoutes.push(entry); proof.failures.push({ phase: 'route-drawer', ...entry }); continue;
        }
      }
      const routes = await visibleRoutes(page);
      for (const route of routes) {
        if (viewport.mobile && !(await fingerprint(page)).sidebar) {
          const drawer = await openDrawer(page, viewport).catch(error => ({ ok: false, error: String(error.message || error) }));
          if (!drawer.ok) {
            const entry = { viewport: viewport.name, role, route: route.label, drawer, ok: false };
            proof.roleRoutes.push(entry); proof.failures.push({ phase: 'route-drawer', ...entry }); continue;
          }
        }
        const before = await fingerprint(page);
        let after = before;
        let error = null;
        try {
          await page.locator(route.selector).click({ timeout: 10000 });
          await page.waitForTimeout(260);
          after = await fingerprint(page);
        } catch (caught) { error = String(caught.message || caught); }
        const changed = route.active || before.page !== after.page || before.modal !== after.modal || before.chat !== after.chat || before.active !== after.active;
        const closed = !viewport.mobile || (!after.sidebar && !after.scrim);
        const entry = { viewport: viewport.name, role, route: route.label, selector: route.selector, before, after, changed, closed, error, ok: roleOk && !error && changed && closed };
        proof.roleRoutes.push(entry);
        if (!entry.ok) proof.failures.push({ phase: 'role-route', ...entry });
        await page.evaluate(() => {
          globalThis.__HUNTER_MOBILE_SIDEBAR__?.close?.();
          document.querySelector('#modal')?.classList.remove('open');
          document.querySelector('#accountMenu')?.classList.remove('open');
          Array.from(document.querySelectorAll('#hunterRoleAttention,#hunterAttentionPopUnified,#hunterAttentionPop')).forEach(e => { e.hidden = true; });
        });
        await page.waitForTimeout(100);
      }
    }
  } finally { await context.close(); }
}

async function selectTalkToHunter(page, viewport) {
  if (viewport.mobile) {
    const drawer = await openDrawer(page, viewport);
    if (!drawer.ok) throw new Error(`Could not open Hunter drawer: ${JSON.stringify(drawer)}`);
  }
  const selector = await page.evaluate(() => {
    const isRendered = e => {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    const element = Array.from(document.querySelectorAll('#sidebar button,#sidebar a')).find(e => isRendered(e) && /Talk to Hunter/i.test(e.textContent || ''));
    if (!element) return null;
    if (!element.id) element.id = 'hunterExternalProofTalk';
    return `#${CSS.escape(element.id)}`;
  });
  if (!selector) throw new Error('Talk to Hunter route missing');
  await page.locator(selector).click({ timeout: 10000 });
  await page.waitForTimeout(250);
}

async function verifyChat(viewport) {
  const { context, page } = await createPage(viewport, 'chat');
  try {
    let result = null, error = null;
    try {
      await selectTalkToHunter(page, viewport);
      const input = page.locator('#hcs2Input');
      await input.click({ timeout: 10000 });
      const message = `Hunter ${viewport.name} external proof`;
      await input.fill(message);
      const before = await page.locator('#page-hunter-chat .hcs2-row.user').count();
      await page.locator('#hcs2Send').click({ timeout: 10000 });
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
  const { context, page } = await createPage(viewport, 'settings');
  try {
    let result = null, error = null;
    try {
      if (viewport.mobile) {
        const drawer = await openDrawer(page, viewport);
        if (!drawer.ok) throw new Error(`Could not open Settings drawer: ${JSON.stringify(drawer)}`);
      }
      const accountSelector = await rendered(page.locator('#accountCard')) ? '#accountCard' : '#topAvatar';
      await page.locator(accountSelector).click({ timeout: 10000 });
      await page.locator('#menuSettings').click({ timeout: 10000 });
      await page.waitForTimeout(250);
      const opened = await page.locator('#modal.open #modalTitle').textContent().then(text => text?.trim() === 'Settings').catch(() => false);
      if (!opened) throw new Error('Settings modal did not open');
      const tabs = await page.locator('[data-final-settings]').evaluateAll(elements => elements.map(e => e.dataset.finalSettings));
      const tabResults = [];
      for (const tab of tabs) {
        const locator = page.locator(`[data-final-settings="${tab}"]`);
        await locator.click({ timeout: 10000 });
        tabResults.push({ tab, active: await locator.evaluate(e => e.classList.contains('active')) });
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
        const toggleBefore = toggle?.classList.contains('on');
        toggle?.click();
        await new Promise(resolve => setTimeout(resolve, 400));
        return {
          theme, density, font, actions,
          toggleChanged: Boolean(toggle && toggleBefore !== toggle.classList.contains('on')),
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
  const ignoredNetwork = proof.networkFailures.filter(item => !/favicon/i.test(item.url || ''));
  const externalWrites = proof.writeRequests.filter(item => !String(item.url || '').includes('hunter-diagnostics'));
  proof.networkFailures = ignoredNetwork;
  proof.writeRequests = externalWrites;
  proof.passed = proof.failures.length === 0 && proof.runtimeErrors.length === 0 && proof.consoleErrors.length === 0 && ignoredNetwork.length === 0 && externalWrites.length === 0;
  proof.completedAt = new Date().toISOString();
} catch (error) {
  proof.failures.push({ phase: 'runner', error: String(error.stack || error.message || error) });
  proof.passed = false;
  proof.completedAt = new Date().toISOString();
} finally {
  await writeFile('hunter-ui-proof.json', JSON.stringify(proof, null, 2));
  await browser.close();
}

console.log(JSON.stringify({
  passed: proof.passed,
  failures: proof.failures.length,
  viewports: proof.viewports.length,
  roleRoutes: proof.roleRoutes.length,
  chat: proof.chat.length,
  settings: proof.settings.length,
  runtimeErrors: proof.runtimeErrors.length,
  consoleErrors: proof.consoleErrors.length,
  networkFailures: proof.networkFailures.length,
  writeRequests: proof.writeRequests.length,
}, null, 2));

if (!proof.passed) process.exitCode = 2;
