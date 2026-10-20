// UI-002 investigation — the Individuals and Families list pages, as found
// BEFORE UI-002. Findings: docs/investigations/UI-002-searchable-lists.md.
//
// Recorded 2026-10-20 against the fictional dev tree. UI-002 deliberately
// changes the first and last behaviours, so the suite is skipped unless
// MYTREE_UPSTREAM_BASELINE=1 (set it only against an instance without the
// mytree-lists module).
const { test, expect } = require('@playwright/test');
const { treeRoute } = require('../fixtures/helpers');

test.describe('UI-002 baseline (upstream webtrees lists)', () => {
  test.skip(process.env.MYTREE_UPSTREAM_BASELINE !== '1', 'Upstream baseline: UI-002 changed this behaviour deliberately.');

  for (const [list, path] of [['Individuals', '/individual-list'], ['Families', '/family-list']]) {
    test(`${list}: the list page opens on the A–Z selector, with no table`, async ({ page }) => {
      await page.goto(treeRoute(path));
      await expect(page.locator('.wt-initials-list-surname')).toBeVisible();
      await expect(page.locator('table.wt-datatables')).toHaveCount(0);
      await expect(page.locator('h2.wt-page-title').first()).toContainText(`${list} — …`);
    });

    test(`${list}: "All" shows a DataTables list with search, sorting, paging and filters`, async ({ page }) => {
      await page.goto(treeRoute(path) + '&show_all=yes&show=indi&show_all_firstnames=yes');
      const table = page.locator('table.wt-datatables');
      await expect(table).toBeVisible();
      await expect(page.locator('.dt-search input')).toBeVisible();
      await expect(page.locator('.dt-paging')).toBeVisible();
      await expect(page.locator('.wt-table-filters')).toBeVisible();
      await expect(table.locator('thead th.dt-orderable-asc, thead th.dt-orderable-desc').first()).toBeVisible();
    });

    test(`${list}: the table has no id, so its saved state shares DataTables' default key`, async ({ page }) => {
      await page.goto(treeRoute(path) + '&show_all=yes&show=indi&show_all_firstnames=yes');
      await expect(page.locator('table.wt-datatables')).toHaveAttribute('id', 'DataTables_Table_0');
      const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('DataTables_')));
      expect(keys).toContain('DataTables_DataTables_Table_0_/index.php');
    });
  }
});
