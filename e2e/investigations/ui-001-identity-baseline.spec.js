// UI-001 investigation — application identity, header navigation and the
// webtrees upgrade mechanism, as found BEFORE UI-001 (upstream behaviour).
// Findings: docs/investigations/UI-001-identity-and-navigation.md.
//
// Each test records one observed behaviour. Recorded 2026-10-20: 6/6 passed
// before UI-001 was installed. UI-001 deliberately changes all of them (see
// e2e/tests/ui-001-identity.spec.js), so they are skipped unless
// MYTREE_UPSTREAM_BASELINE=1 - set it only against an instance without the
// MyTree identity/theme modules, the related settings and app/MyTree.
const { test, expect } = require('@playwright/test');
const { treeRoute } = require('../fixtures/helpers');

test.describe('UI-001 baseline (upstream webtrees)', () => {
  test.skip(process.env.MYTREE_UPSTREAM_BASELINE !== '1', 'Upstream baseline: UI-001 changed this behaviour deliberately.');

  test('top-right user menu is a row of text links', async ({ page }) => {
    await page.goto(treeRoute(''));
    const items = await page.locator('.wt-user-menu > li > a').allInnerTexts();
    expect(items.map((s) => s.trim())).toEqual(['My pages', 'Theme', 'Language', 'Sign out']);
  });

  test('theme menu offers the webtrees-branded theme', async ({ page }) => {
    await page.goto(treeRoute(''));
    const themes = await page.locator('.menu-theme .dropdown-item').allInnerTexts();
    expect(themes.map((s) => s.trim())).toContain('webtrees');
  });

  test('browser title ends with the webtrees name', async ({ page }) => {
    await page.goto(treeRoute(''));
    expect(await page.title()).toMatch(/– webtrees$/);
  });

  test('header logo, favicon and footer are webtrees-branded', async ({ page }) => {
    await page.goto(treeRoute(''));
    // The build inlines the theme's webtrees.png logo as a data: URI.
    const logo = await page.locator('.wt-site-logo').evaluate((el) => getComputedStyle(el, '::after').content);
    expect(logo).toMatch(/^url\("data:image\/png;base64,/);
    await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute('href', /favicon-32\.png/);
    await expect(page.locator('footer a.wt-footer-powered-by-webtrees')).toHaveAttribute('href', 'https://webtrees.net/');
  });

  test('control panel shows the upstream version check and upgrade wizard', async ({ page }) => {
    await page.goto('/index.php?route=' + encodeURIComponent('/admin'));
    await expect(page.locator('body')).toContainText(/latest version of webtrees|A new version of webtrees|No upgrade information/);
    const wizard = await page.goto('/index.php?route=' + encodeURIComponent('/admin/upgrade'));
    expect(wizard.status()).toBe(200);
  });
});
