const { test, expect } = require('@playwright/test');
const { fictionalName } = require('../fixtures/testData');
const { expandAllCollapses, acceptPendingIfPresent, treeRoute } = require('../fixtures/helpers');

test('create and edit an individual', async ({ page }) => {
  const surname = fictionalName('Finch');

  await page.goto(treeRoute('/add-unlinked-individual'));
  await expandAllCollapses(page);

  await page.getByLabel('Male', { exact: true }).check();
  await page.getByLabel('Given names').fill('Jordan');
  await page.getByLabel('Surname', { exact: true }).fill(surname);
  await page.getByLabel('Date of birth').fill('12 MAR 1900');
  await page.getByLabel('Place of birth').fill('Fictional City, Testland');

  await page.getByRole('button', { name: /go to new individual/i }).click();
  await page.waitForLoadState('networkidle');

  await acceptPendingIfPresent(page);

  await expect(page.getByRole('heading', { name: new RegExp(`Jordan ${surname}`) })).toBeVisible();
  await expect(page.getByText('March 12, 1900').first()).toBeVisible();
  await expect(page.getByText('Fictional City, Testland').first()).toBeVisible();
});
