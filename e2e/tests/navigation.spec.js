const { test, expect } = require('@playwright/test');
const { fictionalName } = require('../fixtures/testData');
const {
  expandAllCollapses,
  acceptPendingIfPresent,
  acceptAllPending,
  treeRoute,
  searchAndSelectInPicker,
} = require('../fixtures/helpers');

test('navigate between related records: individual -> family -> spouse -> source -> back', async ({ page }) => {
  const husbandSurname = fictionalName('Finch');
  const wifeSurname = fictionalName('Thornwood');
  const sourceTitle = `Nav Test Record ${fictionalName('')}`;

  // Husband + wife, married.
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

  // Source + citation on the husband.
  await page.goto(`/index.php?route=${encodeURIComponent('/admin/trees/manage/mytree_dev_test')}`);
  await page.getByRole('link', { name: 'Source' }).click();
  await page.waitForSelector('.modal.show');
  await page.locator('.modal.show input[name="title"]').fill(sourceTitle);
  await page.locator('.modal.show').getByRole('button', { name: /^save$/i }).click();
  await page.waitForLoadState('networkidle');
  await acceptAllPending(page);

  await page.goto(treeRoute(`/add-fact/${xref}/SOUR`));
  await searchAndSelectInPicker(page, 'Source citation', sourceTitle);
  await page.getByRole('button', { name: /^save$/i }).click();
  await page.waitForLoadState('networkidle');
  await acceptPendingIfPresent(page);

  // individual -> family
  await page.getByRole('link', { name: 'View this family' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/%2Ffamily%2F/);

  // family -> spouse
  await page.getByRole('link', { name: new RegExp(`Casey ${wifeSurname}`) }).first().click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/%2Findividual%2F/);
  await expect(page.getByRole('heading', { name: new RegExp(`Casey ${wifeSurname}`) })).toBeVisible();

  // back to husband, then husband -> sources tab -> source record
  await page.goBack();
  await page.goBack();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: new RegExp(`Jordan ${husbandSurname}`) })).toBeVisible();

  await page.getByRole('tab', { name: 'Sources' }).click();
  await page.getByRole('link', { name: sourceTitle }).click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/%2Fsource%2F/);
  await expect(page.getByRole('heading', { name: sourceTitle })).toBeVisible();
});
