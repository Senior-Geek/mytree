const { test, expect } = require('@playwright/test');
const { TREE, fictionalName } = require('../fixtures/testData');
const {
  expandAllCollapses,
  acceptPendingIfPresent,
  acceptAllPending,
  treeRoute,
  openPicker,
  searchAndSelectInPicker,
} = require('../fixtures/helpers');

async function createSource(page, title) {
  await page.goto(`/index.php?route=${encodeURIComponent('/admin/trees/manage/' + TREE)}`);
  await page.getByRole('link', { name: 'Source' }).click();
  await page.waitForSelector('.modal.show');
  await page.locator('.modal.show input[name="title"]').fill(title);
  await page.locator('.modal.show').getByRole('button', { name: /^save$/i }).click();
  await page.waitForLoadState('networkidle');
  await acceptAllPending(page);
}

async function createIndividual(page, surname) {
  await page.goto(treeRoute('/add-unlinked-individual'));
  await expandAllCollapses(page);
  await page.getByLabel('Female', { exact: true }).check();
  await page.getByLabel('Given names').fill('Avery');
  await page.getByLabel('Surname', { exact: true }).fill(surname);
  await page.getByRole('button', { name: /go to new individual/i }).click();
  await page.waitForLoadState('networkidle');
  await acceptPendingIfPresent(page);
  const url = new URL(page.url());
  return decodeURIComponent(url.searchParams.get('route')).split('/')[4]; // xref
}

test('create a source record', async ({ page }) => {
  const title = `Fictional Record ${fictionalName('')}`;
  await createSource(page, title);

  // Confirm it's live by finding it through the same picker the citation
  // workflow uses — exercises the actual search path, not just the DB row.
  await page.goto(treeRoute('/add-unlinked-individual'));
  await expandAllCollapses(page);
  const input = await openPicker(page, 'Source citation');
  await input.fill(title);
  await expect(page.locator('.ts-dropdown .option:visible', { hasText: title }).first()).toBeVisible();
});

test('attach a citation for an existing source to an individual', async ({ page }) => {
  const sourceTitle = `Citable Record ${fictionalName('')}`;
  const surname = fictionalName('Harrow');

  await createSource(page, sourceTitle);
  const xref = await createIndividual(page, surname);

  await page.goto(treeRoute(`/add-fact/${xref}/SOUR`));
  await searchAndSelectInPicker(page, 'Source citation', sourceTitle);
  await page.getByLabel('Citation details').fill('test citation details');
  await page.getByRole('button', { name: /^save$/i }).click();
  await page.waitForLoadState('networkidle');
  await acceptPendingIfPresent(page);

  await page.getByRole('tab', { name: 'Sources' }).click();
  await expect(page.getByRole('link', { name: sourceTitle })).toBeVisible();
});
