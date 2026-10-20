// UI-002 — searchable Individuals and Families lists (custom module
// mytree-lists): Lists → Individuals / Families show the records at once, laid
// out as search box / records / count, paging and rows per page, with the
// list's search, sort, page and filters restored on returning. Runs as the
// fictional editor, whose theme is the site default (MyTree).
const { test, expect } = require('@playwright/test');
const { fictionalName } = require('../fixtures/testData');
const { treeRoute, expandAllCollapses, acceptPendingIfPresent } = require('../fixtures/helpers');

const LISTS = [
  { name: 'Individuals', path: '/individual-list', table: '#mytree-individual-list', search: 'Search individuals…', femaleFilter: 'bg-sex-F' },
  { name: 'Families', path: '/family-list', table: '#mytree-family-list', search: 'Search families…', femaleFilter: null },
];

test.use({ storageState: '.auth/editor.json' });

async function openFromMenu(page, name) {
  await page.goto(treeRoute(''));
  await page.locator('.wt-genealogy-menu .menu-list > a').click();
  // The core genealogy menu marks its items role="menuitem".
  await page.locator('.wt-genealogy-menu .menu-list .dropdown-menu').getByRole('menuitem', { name, exact: true }).click();
  await page.waitForLoadState('networkidle');
}

async function info(page) {
  return (await page.locator('.dt-info').innerText()).trim();
}

for (const list of LISTS) {
  test.describe(`UI-002 ${list.name}`, () => {
    test('the menu shows the records at once: no A–Z or surname table', async ({ page }) => {
      await openFromMenu(page, list.name);

      await expect(page.locator(`${list.table} tbody tr`).first()).toBeVisible();
      expect(await info(page)).toMatch(/^Showing 1 to \d+ of \d+$/);
      await expect(page.locator('.wt-initials-list-surname')).toHaveCount(0);
      await expect(page.locator('.wt-page-options')).toHaveCount(0);

      // The complete list is the default: no "— All" in the heading or title.
      await expect(page.locator('h2.wt-page-title').first()).toHaveText(list.name);
      await expect(page).toHaveTitle(`${list.name} – MyTree`);
      await expect(page.locator('table.wt-table-surname')).toHaveCount(0);
    });

    test('layout: search box on top, records, then count, paging and rows per page', async ({ page }) => {
      await openFromMenu(page, list.name);

      const search = page.getByRole('searchbox', { name: list.search });
      await expect(search).toHaveAttribute('placeholder', list.search);

      const searchBox = await search.boundingBox();
      const tableBox = await page.locator(list.table).boundingBox();
      const container = await page.locator('.dt-container').boundingBox();
      const filters = await page.locator('.wt-table-filters').boundingBox();

      // Desktop: search box about a third of the width, the filter buttons beside it, above the records.
      expect(searchBox.width).toBeGreaterThan(container.width * 0.25);
      expect(searchBox.width).toBeLessThan(container.width * 0.4);
      expect(filters.x).toBeGreaterThan(searchBox.x + searchBox.width);
      expect(Math.abs(filters.y - searchBox.y)).toBeLessThan(searchBox.height);
      expect(searchBox.y).toBeLessThan(tableBox.y);
      expect(filters.y + filters.height).toBeLessThan(tableBox.y);

      const bottom = tableBox.y + tableBox.height;
      for (const selector of ['.dt-info', '.dt-paging', '.dt-length']) {
        expect((await page.locator(selector).boundingBox()).y, selector).toBeGreaterThan(bottom);
      }

      // Rows per page: 10, 20, 50, 100 - below the records, not beside the search box.
      const rows = page.getByLabel('Rows per page');
      await expect(rows).toBeVisible();
      expect(await rows.locator('option').allInnerTexts()).toEqual(['10', '20', '50', '100']);
    });

    test('searching, sorting, paging and rows per page', async ({ page }) => {
      await openFromMenu(page, list.name);
      const all = await info(page);

      // Paging
      await page.locator('.dt-paging').getByRole('link', { name: 'next' }).or(page.locator('.dt-paging').getByRole('button', { name: 'next' })).first().click();
      expect(await info(page)).toMatch(/^Showing 11 to /);

      // Rows per page
      await page.getByLabel('Rows per page').selectOption('20');
      expect(await info(page)).toMatch(/^Showing 1 to 20 of /);

      // Sorting: a column header toggles its order.
      const header = page.locator(`${list.table} thead th.dt-orderable-asc, ${list.table} thead th.dt-orderable-desc`).nth(1);
      await header.click();
      await expect(header).toHaveAttribute('aria-sort', /ascending|descending/);

      // Instant search: no submit needed.
      await page.getByRole('searchbox', { name: list.search }).fill('Pellowby');
      await expect.poll(() => info(page)).toMatch(/filtered from/);
      expect(await info(page)).not.toBe(all);
      for (const row of await page.locator(`${list.table} tbody tr`).all()) {
        await expect(row).toContainText('Pellowby');
      }
    });

    test('search, sort, page and filters are restored after opening a record', async ({ page }) => {
      await openFromMenu(page, list.name);
      const search = page.getByRole('searchbox', { name: list.search });
      await search.fill('Quill');
      await expect.poll(() => info(page)).toMatch(/filtered from/);
      const filtered = await info(page);

      if (list.femaleFilter) {
        await page.locator(`label[for$="-${list.femaleFilter}"]`).click();
        await expect.poll(() => info(page)).not.toBe(filtered);
      }
      const before = await info(page);

      // Open the first record, then come back with the browser's Back button.
      await page.locator(`${list.table} tbody tr a`).first().click();
      await page.waitForLoadState('networkidle');
      expect(decodeURIComponent(page.url())).not.toContain('-list');
      await page.goBack();
      await page.waitForLoadState('networkidle');

      await expect(search).toHaveValue('Quill');
      expect(await info(page)).toBe(before);
      if (list.femaleFilter) {
        await expect(page.locator(`input[id$="-${list.femaleFilter}"]`)).toBeChecked();
      }

      // ... and when reopening the list from the menu.
      await openFromMenu(page, list.name);
      await expect(search).toHaveValue('Quill');
      expect(await info(page)).toBe(before);
    });

    test('A–Z pages still work when linked to directly', async ({ page }) => {
      await page.goto(treeRoute(list.path) + '&alpha=P');
      await expect(page.locator('.wt-initials-list-surname')).toBeVisible();
      await expect(page.locator('h2.wt-page-title').first()).toContainText('P…');
    });
  });
}

// People without a known surname: "Mary //" is an unknown surname (stored as
// @N.N.); a name without slashes, "Mary", has no surname at all.
test.describe('UI-002 people without a surname', () => {
  // The fictional admin's changes are accepted automatically.
  test.use({ storageState: '.auth/admin.json' });

  async function createIndividual(page, given, fullName) {
    await page.goto(treeRoute('/add-unlinked-individual'));
    await expandAllCollapses(page);
    await page.getByLabel('Female', { exact: true }).check();
    await page.getByLabel('Given names').fill(given);
    if (fullName !== null) {
      // As typed in the form's full-name field ("edit name"), without slashes.
      await page.locator('input[id$="-INDI-NAME"]').evaluate((input, value) => { input.value = value; }, fullName);
    }
    await page.getByRole('button', { name: /go to new individual/i }).click();
    await page.waitForLoadState('networkidle');
    await acceptPendingIfPresent(page);
  }

  for (const [label, prefix, fullName] of [
    ['unknown surname (Mary //)', 'Unknownsurn', ''],
    ['no surname (Mary)', 'Nosurname', 'GIVEN'],
  ]) {
    test(`an individual with ${label} is listed once and can be found by searching`, async ({ page }) => {
      const given = fictionalName(prefix);
      await createIndividual(page, given, fullName === 'GIVEN' ? given : null);

      await openFromMenu(page, 'Individuals');
      await page.getByRole('searchbox', { name: 'Search individuals…' }).fill(given);
      await expect.poll(() => info(page)).toMatch(/^Showing 1 to 1 of 1 /);
      await expect(page.locator('#mytree-individual-list tbody tr')).toHaveCount(1);
      await expect(page.locator('#mytree-individual-list tbody tr').first()).toContainText(given);
    });
  }
});

test('each list keeps its own search', async ({ page }) => {
  await openFromMenu(page, 'Individuals');
  await page.getByRole('searchbox', { name: 'Search individuals…' }).fill('Pellowby');
  await expect.poll(() => info(page)).toMatch(/filtered from/);

  await openFromMenu(page, 'Families');
  await expect(page.getByRole('searchbox', { name: 'Search families…' })).toHaveValue('');
});

test.describe('UI-002 phone layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  for (const list of LISTS) {
    test(`${list.name}: no horizontal page scrolling; same layout, stacked`, async ({ page }) => {
      await openFromMenu(page, list.name);

      const [scrollWidth, clientWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

      const search = await page.getByRole('searchbox', { name: list.search }).boundingBox();
      expect(search.height).toBeGreaterThanOrEqual(44);
      expect(search.width).toBeGreaterThan(330);
      expect((await page.locator('.wt-table-filters').boundingBox()).y).toBeGreaterThan(search.y + search.height);

      const tableBox = await page.locator(list.table).boundingBox();
      const info = await page.locator('.dt-info').boundingBox();
      const paging = await page.locator('.dt-paging').boundingBox();
      const rows = await page.locator('.dt-length').boundingBox();
      expect(info.y).toBeGreaterThan(tableBox.y + tableBox.height);
      expect(paging.y).toBeGreaterThan(info.y);
      expect(rows.y).toBeGreaterThan(paging.y);
      expect((await page.getByLabel('Rows per page').boundingBox()).height).toBeGreaterThanOrEqual(44);
    });
  }
});
