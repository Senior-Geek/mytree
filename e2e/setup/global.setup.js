const { test: setup, expect } = require('@playwright/test');
const { ADMIN, TREE } = require('../fixtures/testData');

const authFile = '.auth/admin.json';

setup('authenticate as fictional dev admin and ensure test tree exists', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/index.php?route=${encodeURIComponent('/login')}&url=${encodeURIComponent(baseURL)}`);
  await page.fill('input[name="username"]', ADMIN.username);
  await page.fill('input[name="password"]', ADMIN.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('link', { name: 'Sign out' })).toBeVisible();

  // Ensure the fictional dev tree exists (idempotent — skip if already created).
  await page.goto(`${baseURL}/index.php?route=${encodeURIComponent('/admin')}`);
  const bodyText = await page.locator('body').innerText();

  if (!bodyText.includes(TREE)) {
    await page.goto(`${baseURL}/index.php?route=${encodeURIComponent('/admin/trees/create')}`);
    await page.fill('input[name="title"]', 'MyTree Dev Test');
    await page.fill('input[name="name"]', TREE);
    await page.getByRole('button', { name: /^create$/i }).click();
    await page.waitForLoadState('networkidle');
  }

  await page.context().storageState({ path: authFile });
});
