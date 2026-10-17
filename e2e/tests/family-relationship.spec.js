const { test, expect } = require('@playwright/test');
const { fictionalName } = require('../fixtures/testData');
const { expandAllCollapses, acceptPendingIfPresent, treeRoute } = require('../fixtures/helpers');

test('establish a family relationship (add spouse)', async ({ page }) => {
  const husbandSurname = fictionalName('Finch');
  const wifeSurname = fictionalName('Thornwood');

  await page.goto(treeRoute('/add-unlinked-individual'));
  await expandAllCollapses(page);
  await page.getByLabel('Male', { exact: true }).check();
  await page.getByLabel('Given names').fill('Jordan');
  await page.getByLabel('Surname', { exact: true }).fill(husbandSurname);
  await page.getByRole('button', { name: /go to new individual/i }).click();
  await page.waitForLoadState('networkidle');
  await acceptPendingIfPresent(page);

  const xref = decodeURIComponent(new URL(page.url()).searchParams.get('route')).split('/')[4];

  await page.goto(treeRoute(`/add-spouse-to-individual/${xref}`));
  await expandAllCollapses(page);

  await page.getByLabel('Female', { exact: true }).check();
  await page.getByLabel('Given names').first().fill('Casey');
  await page.getByLabel('Surname', { exact: true }).first().fill(wifeSurname);
  await page.getByLabel('Date of marriage').fill('20 JUN 1922');
  await page.getByLabel('Place of marriage').fill('Fictional City, Testland');

  await page.getByRole('button', { name: /^save$/i }).click();
  await page.waitForLoadState('networkidle');
  await acceptPendingIfPresent(page);

  await expect(page.getByText(`Casey ${wifeSurname}`).first()).toBeVisible();
  await expect(page.getByText('June 20, 1922').first()).toBeVisible();
});
