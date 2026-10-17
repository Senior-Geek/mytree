// Milestone 3A investigation: how far does *unmodified* webtrees get with a
// fictional 1851 census household? See
// docs/investigations/WT-001-WT-002-workflow-review.md for the write-up.
//
// These tests assert current behaviour, including limitations, so a future
// WT-001/WT-002 implementation will (intentionally) break some of them.
// All names, places and references are fictional.
const { test, expect } = require('@playwright/test');
const { fictionalName } = require('../fixtures/testData');
const {
  expandAllCollapses,
  acceptPendingIfPresent,
  treeRoute,
} = require('../fixtures/helpers');

test.describe.configure({ mode: 'serial' });

const SURNAME = fictionalName('Quillbrook');
const MAIDEN = fictionalName('Pellowby');
const SOURCE_TITLE = `1851 Census of England — ${SURNAME} household, Lower Quillham, Testshire`;
const PAGE_REF = 'HO 107/9999 folio 12 page 3 schedule 45';
const state = {};

function xrefFromUrl(url) {
  const route = decodeURIComponent(new URL(url).searchParams.get('route') ?? '');
  return route.match(/\/individual\/([A-Za-z0-9]+)/)?.[1];
}

async function fillPerson(page, { sex, given, surname, birthDate, birthPlace }) {
  await expandAllCollapses(page);
  await page.getByLabel(sex === 'M' ? 'Male' : 'Female', { exact: true }).first().check();
  await page.getByLabel('Given names').first().fill(given);
  await page.getByLabel('Surname', { exact: true }).first().fill(surname);
  await page.getByLabel('Date of birth').first().fill(birthDate);
  await page.getByLabel('Place of birth').first().fill(birthPlace);
}

async function saveAndGo(page) {
  await page.getByRole('button', { name: /go to new individual/i }).click();
  await page.waitForLoadState('networkidle');
  await acceptPendingIfPresent(page);
  return xrefFromUrl(page.url());
}

// Raw GEDCOM of a record, via the admin-only "edit raw" page.
async function rawGedcom(page, xref) {
  await page.goto(treeRoute(`/edit-raw/${xref}`));
  const parts = await page.locator('textarea').evaluateAll((els) => els.map((el) => el.value));
  return parts.join('\n');
}

// Like helpers.openPicker, but takes a locator for the Tom Select control
// (several pickers here have no accessible name).
async function openPicker(page, control) {
  await control.click();
  const input = page.locator('.ts-dropdown .dropdown-input:visible').first();
  await input.waitFor({ state: 'visible' });
  return input;
}

async function pickFirst(page, control, query) {
  const input = await openPicker(page, control);
  await input.fill(query);
  const option = page.locator('.ts-dropdown:visible .option', { hasText: query.split(' ')[0] }).first();
  await option.waitFor({ state: 'visible', timeout: 10_000 });
  await option.click();
}

async function pickerResults(page, control, query) {
  const input = await openPicker(page, control);
  await input.fill(query);
  await page.waitForTimeout(1200);
  const texts = await page.locator('.ts-dropdown:visible .option').allInnerTexts();
  await page.keyboard.press('Escape');
  return texts.map((text) => text.trim()).filter(Boolean);
}

test('fixture: head of household and spouse already in the tree', async ({ page }) => {
  await page.goto(treeRoute('/add-unlinked-individual'));
  await fillPerson(page, { sex: 'M', given: 'Josiah', surname: SURNAME, birthDate: 'ABT 1811', birthPlace: 'Lower Quillham, Testshire, England' });
  state.head = await saveAndGo(page);

  await page.goto(treeRoute(`/add-spouse-to-individual/${state.head}`));
  await fillPerson(page, { sex: 'F', given: 'Martha', surname: MAIDEN, birthDate: 'ABT 1815', birthPlace: 'Upper Quillham, Testshire, England' });
  state.spouse = await saveAndGo(page);
  state.family = (await rawGedcom(page, state.spouse)).match(/1 FAMS @(\w+)@/)[1];

  expect(state.head).toBeTruthy();
  expect(state.spouse).toBeTruthy();
});

test('WT-002: a source can be created inline from a fact form without losing unsaved input', async ({ page }) => {
  await page.goto(treeRoute(`/add-fact/${state.head}/CENS`));
  await expandAllCollapses(page);
  const address = page.locator('textarea[id$="-INDI-CENS-ADDR"]');
  await address.fill('Mill Lane, Lower Quillham');

  await page.locator('.input-group:has(> select[id$="-INDI-CENS-SOUR"]) [title="Create a source"]').click();
  await page.locator('.modal.show input[name="title"]').fill(SOURCE_TITLE);
  await page.locator('.modal.show').getByRole('button', { name: /^save$/i }).click();
  await expect(page.locator('.modal.show')).toHaveCount(0);

  state.source = (await page.locator('select[id$="-INDI-CENS-SOUR"]').inputValue()).replaceAll('@', '');
  expect(state.source).toMatch(/^X?\w+$/);
  await expect(address).toHaveValue('Mill Lane, Lower Quillham');
});

test('WT-001: married-name search misses a spouse recorded by maiden name', async ({ page }) => {
  await page.goto(treeRoute(`/add-fact/${state.head}/SOUR`));
  const control = page.locator('select[id$="-INDI-SOUR"] + .ts-wrapper .ts-control').first();
  // Source picker matches words in any order.
  expect((await pickerResults(page, control, `quillham 1851 ${SURNAME}`)).join()).toContain(SOURCE_TITLE);

  await page.goto(treeRoute('/add-unlinked-individual'));
  await expandAllCollapses(page);
  const associate = page.locator('select[id$="-INDI-BIRT-_ASSO"] + .ts-wrapper .ts-control').first();
  // The default surname tradition adds a married name with a surname but no given name.
  expect(await pickerResults(page, associate, `Martha ${SURNAME}`)).toEqual([]);
  expect((await pickerResults(page, associate, SURNAME)).join()).toContain(`Martha ${MAIDEN}`);
});

test('census assistant: household citation entered once, copied to each linked member', async ({ page }) => {
  await page.goto(treeRoute(`/add-fact/${state.head}/CENS`));
  await expandAllCollapses(page);
  await pickFirst(page, page.locator('select[id$="-INDI-CENS-SOUR"] + .ts-wrapper .ts-control'), SURNAME);
  await page.locator('input[id$="-INDI-CENS-SOUR-PAGE"]').fill(PAGE_REF);

  await page.evaluate(() => {
    const select = document.querySelector('.census-selector');
    const option = [...select.options].find((o) => /1851/.test(o.text) && /England/.test(o.text));
    select.selectedIndex = option.index;
    select.dispatchEvent(new Event('change'));
  });
  await expect(page.locator('input[id$="-INDI-CENS-DATE"]')).toHaveValue('30 MAR 1851');
  await page.locator('.census-assistant-link a').click();

  const rows = page.locator('#census-assistant-table tbody tr');
  await expect(rows).toHaveCount(1); // head added automatically

  await pickFirst(page, page.locator('#census-assistant-individual + .ts-wrapper .ts-control'), `Martha ${MAIDEN}`);
  await page.locator('.census-assistant-add').click();
  await expect(rows).toHaveCount(2);

  // Limitation: there is no way to add a row for someone not in the tree.
  await page.locator('.census-assistant-add').click();
  await page.waitForTimeout(1000);
  await expect(rows).toHaveCount(2);

  await page.locator('#census-assistant-citation').fill(PAGE_REF);
  await page.locator('#census-assistant-notes').fill([
    'Not linked: Eliza, Dau, 9, Scholar; Samuel, Son, 5;',
    `Thomas ${MAIDEN}, Cousin, U, 19, Ag Lab; Henry Vosperton, Lodger, U, 34, Blacksmith;`,
    'Ann Cridgeworth, Serv, U, 16, House Servant',
  ].join('\n'));
  await page.getByRole('button', { name: /^save$/i }).click();
  await page.waitForLoadState('networkidle');

  const headGedcom = await rawGedcom(page, state.head);
  const spouseGedcom = await rawGedcom(page, state.spouse);
  const citation = `2 SOUR @${state.source}@\n3 PAGE ${PAGE_REF}`;
  expect(headGedcom).toContain(citation);
  expect(spouseGedcom).toContain(citation); // separate citation on the spouse's own CENS fact
  state.note = spouseGedcom.match(/2 NOTE @(\w+)@/)[1];
  expect(await rawGedcom(page, state.note)).toContain('Henry Vosperton, Lodger');
});

test('WT-001: new child created with a citation; citation details autocomplete', async ({ page }) => {
  await page.goto(treeRoute(`/add-child-to-family/${state.family}/F`));
  await expandAllCollapses(page);
  await expect(page.getByLabel('Surname', { exact: true }).first()).toHaveValue(SURNAME);
  await page.getByLabel('Given names').first().fill('Eliza');
  await page.getByLabel('Date of birth').first().fill('ABT 1842');
  await pickFirst(page, page.locator('select[id$="-INDI-BIRT-SOUR"] + .ts-wrapper .ts-control').first(), SURNAME);
  const pageRef = page.locator('input[id$="-INDI-BIRT-SOUR-PAGE"]').first();
  await pageRef.click();
  await pageRef.pressSequentially('HO 107', { delay: 50 });
  const suggestion = page.locator('[id^="autoComplete_list"]:visible li', { hasText: PAGE_REF });
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  state.child1 = await saveAndGo(page);
  expect(await rawGedcom(page, state.child1)).toContain(`3 PAGE ${PAGE_REF}`);
});

test('clipboard: copy the census fact and paste it onto a second new child', async ({ page }) => {
  await page.goto(treeRoute(`/add-child-to-family/${state.family}/M`));
  await expandAllCollapses(page);
  await page.getByLabel('Given names').first().fill('Samuel');
  await page.getByLabel('Date of birth').first().fill('ABT 1846');
  state.child2 = await saveAndGo(page);

  await page.goto(treeRoute(`/individual/${state.head}/x`));
  const censusRow = page.locator('tr', { has: page.locator('th', { hasText: /Census/ }) }).first();
  await censusRow.locator('[data-wt-post-url*="copy"]').click();
  await page.waitForTimeout(800);

  await page.goto(treeRoute(`/individual/${state.child2}/x`));
  await page.evaluate(() => document.querySelector('form[action*="paste-fact"]').submit());
  await page.waitForLoadState('networkidle');
  const gedcom = await rawGedcom(page, state.child2);
  expect(gedcom).toContain(`2 SOUR @${state.source}@\n3 PAGE ${PAGE_REF}`);
  expect(gedcom).toContain(`2 NOTE @${state.note}@`);
});

test('duplicates: no warning for duplicate source titles or duplicate citations', async ({ page }) => {
  await page.goto(treeRoute(`/add-fact/${state.head}/SOUR`));
  await page.locator('.input-group [title="Create a source"]').first().click();
  await page.locator('.modal.show input[name="title"]').fill(SOURCE_TITLE); // identical title
  await page.locator('.modal.show').getByRole('button', { name: /^save$/i }).click();
  await expect(page.locator('.modal.show')).toHaveCount(0);
  const duplicate = (await page.locator('select[id$="-INDI-SOUR"]').first().inputValue()).replaceAll('@', '');
  expect(duplicate).not.toBe(state.source);

  // Pasting the same census fact again duplicates it silently.
  await page.goto(treeRoute(`/individual/${state.child2}/x`));
  await page.evaluate(() => document.querySelector('form[action*="paste-fact"]').submit());
  await page.waitForLoadState('networkidle');
  expect((await rawGedcom(page, state.child2)).match(/\n1 CENS/g)).toHaveLength(2);
});
