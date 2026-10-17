const { TREE } = require('./testData');

// webtrees' edit forms render fact sections (Name, Birth, Death, Marriage...)
// inside Bootstrap `.collapse` cards that start collapsed. Force them open so
// Playwright can see and fill the fields inside.
async function expandAllCollapses(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.collapse:not(.show)').forEach((el) => el.classList.add('show'));
  });
}

// Unless a user (or tree) has "automatically accept changes" enabled, every
// edit is queued as a pending change. Accept it inline so the rest of the
// test sees live data. No-ops if the record was already auto-accepted.
async function acceptPendingIfPresent(page) {
  const acceptLink = page.getByRole('link', { name: 'accept', exact: true }).first();
  if (await acceptLink.isVisible().catch(() => false)) {
    await acceptLink.click();
    await page.waitForTimeout(400);
  }
}

function treeRoute(path) {
  return `/index.php?route=${encodeURIComponent(`/tree/${TREE}${path}`)}`;
}

// A newly-created record (not just an edit to an existing one) doesn't carry
// an inline "accept" link on the page you land on after saving — e.g. the
// create-source modal returns you to the tree management page, which has no
// per-change control. Go to the pending-changes page and accept everything
// there instead. Safe to call even when nothing is pending.
async function acceptAllPending(page) {
  await page.goto(treeRoute('/pending'));
  const acceptAllButton = page.getByRole('button', { name: 'Accept all changes' });
  if (await acceptAllButton.isVisible().catch(() => false)) {
    await acceptAllButton.click();
    await page.waitForLoadState('networkidle');
  }
}

// webtrees' source/individual pickers are Tom Select comboboxes using the
// "dropdown_input" plugin: clicking `.ts-control` opens a dropdown whose
// *actual* search `<input>` only receives focus a moment later (it isn't
// the element Playwright's role=combobox resolves to). Typing immediately
// after the click silently lands on the wrong element and no search fires.
// A page can have several Tom Select pickers at once (e.g. a citation field
// nested under both an association and the fact itself). `:visible` scopes
// to the one dropdown that's actually open, not just the first in the DOM.
async function openPicker(page, comboboxLabel) {
  await page.getByRole('combobox', { name: comboboxLabel }).first().click();
  const input = page.locator('.ts-dropdown .dropdown-input:visible').first();
  await input.waitFor({ state: 'visible' });
  return input;
}

async function searchAndSelectInPicker(page, comboboxLabel, query) {
  const input = await openPicker(page, comboboxLabel);
  await input.fill(query);
  const option = page.locator('.ts-dropdown .option:visible', { hasText: query }).first();
  await option.waitFor({ state: 'visible', timeout: 10_000 });
  await option.click();
}

module.exports = {
  expandAllCollapses,
  acceptPendingIfPresent,
  acceptAllPending,
  treeRoute,
  openPicker,
  searchAndSelectInPicker,
};
