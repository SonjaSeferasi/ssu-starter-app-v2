// Real application UI with intercepted API fixtures; no hosted account or data writes.
// Start Next locally, then set SOCIALU_PLAYWRIGHT_MODULE and optionally SOCIALU_BROWSER_EXECUTABLE.
const { chromium } = require(process.env.SOCIALU_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { mkdirSync, writeFileSync } = require('node:fs');
const base = process.env.SOCIALU_TEST_URL || 'http://127.0.0.1:3034';
const output = process.env.SOCIALU_EVIDENCE_DIR || 'tmp/navigation-srs-evidence';

(async () => {
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.SOCIALU_BROWSER_EXECUTABLE });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  let position = 'bottom', unread = [4, 7];
  const checks = [], errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  await context.addInitScript(() => localStorage.setItem('access_token', 'local-navigation-fixture'));
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data = { members: [], posts: [], hasMore: false };
    if (path === '/api/auth/session') data = { community: { name: 'Local QA fixture' } };
    else if (path === '/api/preferences') {
      if (route.request().method() === 'PUT') position = route.request().postDataJSON().position;
      data = { position };
    } else if (path === '/api/message-notifications') data = { notifications: unread.map((n, i) => ({ conversation_id: String(i + 1), kind: i ? 'group' : 'private', unread_count: n, sender: { username: 'fixture', name: 'Fixture', photo_url: null }, message_kind: 'text', text: 'Fixture message', sent_at: '2026-11-17T00:00:00Z' })) };
    else if (path === '/api/group-invitations') data = { invitations: [{ id: 'invitation-fixture' }] };
    else if (path === '/api/notifications') data = { unread: 0, notifications: [] };
    else if (path === '/api/events/invitations') data = { invitations: [] };
    else if (path === '/api/points') data = { balance: 0 };
    else if (path === '/api/profile') data = { profile: null, defaults: { fullName: 'Local QA Fixture', username: 'local_qa' } };
    else if (path.includes('/posts/feed/')) data = { posts: [] };
    else if (path === '/api/campus/members') data = { members: [], hasMore: false };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  try {
    await page.goto(base + '/profile');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.waitFor();
    await page.waitForFunction(() => document.querySelector('[data-navigation]')?.getAttribute('data-navigation') === 'bottom');
    const bounds = () => nav.evaluate(el => ({ position: getComputedStyle(el).position, ...Object.fromEntries(['top', 'bottom', 'left', 'right'].map(k => [k, el.getBoundingClientRect()[k]])) }));
    for (const width of [390, 640, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      const rect = await bounds();
      assert.equal(rect.position, 'fixed'); assert.ok(Math.abs(rect.bottom - 844) < 2);
      checks.push(`SRS-601.3: Profile Bottom stays fixed at viewport bottom at ${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: output + '/profile-bottom.png' });
    await nav.getByRole('button', { name: 'Preferences', exact: true }).click();
    await nav.getByRole('button', { name: 'Side', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-navigation]')?.getAttribute('data-navigation') === 'side');
    assert.equal((await bounds()).position, 'fixed'); assert.equal((await bounds()).left, 0);
    await nav.getByRole('button', { name: 'Top', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-navigation]')?.getAttribute('data-navigation') === 'top');
    assert.equal((await bounds()).position, 'sticky');
    await nav.getByRole('button', { name: 'Bottom', exact: true }).click();
    await nav.getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-navigation]')?.getAttribute('data-navigation') === 'bottom');
    checks.push('SRS-601.3: Side/Top/Bottom switch correctly; fixture preference restores on reload');
    const messageLink = nav.locator('a[href="/messages"]');
    await page.waitForFunction(() => document.querySelector('nav a[href="/messages"]')?.textContent.includes('11 unread'));
    assert.ok((await messageLink.innerText()).includes('11'));
    assert.ok(await page.getByRole('link', { name: 'Notifications, 3 unread', exact: true }).count());
    checks.push('SRS-603.1: 4 private + 7 group unread = 11; invitation excluded; bell remains 3 notification entries');
    unread = [];
    await page.evaluate(() => window.dispatchEvent(new Event('socialu-chat-activity')));
    await page.waitForFunction(() => !document.querySelector('nav a[href="/messages"]')?.textContent.includes('unread'));
    checks.push('SRS-603.2: unread badge disappears after messages are read, even with a pending invitation');
    const create = nav.getByRole('button', { name: 'Create', exact: true });
    await create.click();
    await page.getByRole('dialog').waitFor();
    await page.screenshot({ path: output + '/create-menu.png' });
    const original = page.url();
    await page.keyboard.press('Escape');
    assert.equal(page.url(), original); assert.ok(await create.evaluate(el => el === document.activeElement));
    await create.click(); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(page.url(), original);
    checks.push('SRS-604.3: Escape and Cancel retain current page; Escape restores focus to Create');
    await create.click(); await page.getByRole('link', { name: 'Text Post', exact: true }).click();
    await page.getByRole('textbox', { name: 'Post text', exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement?.id === 'create-text-post');
    await page.getByRole('textbox', { name: 'Post text', exact: true }).fill('Local draft retained when switching creation choices');
    await create.click(); await page.getByRole('link', { name: 'Photo Post', exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.id === 'create-photo-post');
    assert.equal(await page.getByRole('textbox', { name: 'Post text', exact: true }).inputValue(), 'Local draft retained when switching creation choices');
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Choose photos for your post' }).click();
    const chooser = await chooserPromise; assert.equal(chooser.isMultiple(), true);
    checks.push('SRS-604.1/604.2: Text Post focuses existing composer; Photo Post focuses working photo selector and retains draft');
    await create.click(); await page.getByRole('link', { name: 'Event', exact: true }).click();
    await page.waitForURL('**/events/create');
    await page.getByRole('heading', { name: /Create.*event/i }).waitFor();
    checks.push('SRS-604.2: Event opens the existing event creation form');
    assert.deepEqual(errors, []);
    writeFileSync(output + '/results.json', JSON.stringify({ evidence: 'Local Next.js application in headless Chromium/Edge with intercepted API fixtures. Not hosted acceptance.', checks, errors }, null, 2));
    console.log(JSON.stringify({ passed: checks.length, checks, output }, null, 2));
  } catch (error) {
    await page.screenshot({ path: output + '/failure.png' });
    console.log(JSON.stringify({ checks, errors, url: page.url(), focus: await page.evaluate(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id })) }, null, 2));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
