const { test: setup, expect } = require('@playwright/test');
const { ADMIN, MEMBER, EDITOR, MODERATOR, MANAGER, TREE } = require('../fixtures/testData');

const authFile = '.auth/admin.json';

// UI-001 permission tests: one fictional account per role, each with a saved session.
const ROLE_USERS = [
  [MEMBER, '.auth/member.json'],
  [EDITOR, '.auth/editor.json'],
  [MODERATOR, '.auth/moderator.json'],
  [MANAGER, '.auth/manager.json'],
];

const route = (baseURL, path) => `${baseURL}/index.php?route=${encodeURIComponent(path)}`;

async function signIn(page, baseURL, user) {
  await page.goto(`${route(baseURL, '/login')}&url=${encodeURIComponent(baseURL)}`);
  await page.fill('input[name="username"]', user.username);
  await page.fill('input[name="password"]', user.password);
  await page.locator('input[name="password"]').press('Enter');
  await page.waitForLoadState('networkidle');
  // UI-001: "Sign out" is in the header's Account menu.
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Sign out' })).toBeVisible();
}

// A fictional account with one role on the dev tree, made through the core
// "Add a user" page (idempotent: an existing account is left as it is).
async function ensureUser(page, baseURL, user) {
  await page.goto(route(baseURL, '/admin/admin-users-create'));
  await page.fill('input[name="real_name"]', user.realName);
  await page.fill('input[name="username"]', user.username);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="email"]', user.email);
  await page.locator('main form button[type="submit"]').click();
  await page.waitForLoadState('networkidle');

  // A new account opens on its edit page; a duplicate username stays on the form.
  if (await page.locator('select[name^="canedit"]').count() > 0) {
    await page.locator('input[name="verified"]').check();
    await page.locator('input[name="approved"]').check();
    await page.locator('select[name^="canedit"]').selectOption(user.role);
    await page.locator('main form button[type="submit"]').first().click();
    await page.waitForLoadState('networkidle');
  }
}

setup('authenticate as fictional dev admin and ensure test tree exists', async ({ page, baseURL, browser }) => {
  await signIn(page, baseURL, ADMIN);

  // Ensure the fictional dev tree exists (idempotent — skip if already created).
  await page.goto(route(baseURL, '/admin'));
  const bodyText = await page.locator('body').innerText();

  if (!bodyText.includes(TREE)) {
    await page.goto(route(baseURL, '/admin/trees/create'));
    await page.fill('input[name="title"]', 'MyTree Dev Test');
    await page.fill('input[name="name"]', TREE);
    await page.getByRole('button', { name: /^create$/i }).click();
    await page.waitForLoadState('networkidle');
  }

  for (const [user] of ROLE_USERS) {
    await ensureUser(page, baseURL, user);
  }

  await page.context().storageState({ path: authFile });

  for (const [user, file] of ROLE_USERS) {
    const context = await browser.newContext();
    await signIn(await context.newPage(), baseURL, user);
    await context.storageState({ path: file });
    await context.close();
  }
});
