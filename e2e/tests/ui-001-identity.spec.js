// UI-001 — MyTree Identity & Navigation: branding, the new header (Help,
// Settings, Account), permissions, phone layout and the disabled webtrees
// upgrade mechanism. Needs the custom modules mytree-identity and
// mytree-theme enabled, the MyTree theme as the site default, and the
// settings listed in docs/enhancements/UI-001-identity-and-navigation.md.
const { test, expect } = require('@playwright/test');
const { TREE, MEMBER } = require('../fixtures/testData');
const { treeRoute } = require('../fixtures/helpers');

const adminRoute = (path) => `/index.php?route=${encodeURIComponent(path)}`;
const VISITOR = { storageState: { cookies: [], origins: [] } };
const loginPage = () => adminRoute(`/login/${TREE}`);

async function openMenu(page, name) {
  const toggle = page.getByRole('button', { name, exact: true });
  await toggle.click();
  const menu = page.locator(`[aria-labelledby="${await toggle.getAttribute('id')}"]`);
  await expect(menu).toBeVisible();
  return menu;
}

test.describe('UI-001 branding', () => {
  test('page titles, logo and favicons are MyTree', async ({ page, request }) => {
    await page.goto(treeRoute(''));

    await expect(page).toHaveTitle(/ – MyTree$/);
    expect(await page.title()).not.toMatch(/webtrees/i);

    const brand = page.locator('header .mytree-brand');
    await expect(brand).toHaveText('MyTree');
    await expect(brand).toHaveAttribute('href', new RegExp(encodeURIComponent(`/tree/${TREE}`)));

    // No webtrees logo drawn by the theme.
    const logo = await page.locator('.wt-site-logo').evaluate((el) => getComputedStyle(el, '::after').content);
    expect(['none', 'normal']).toContain(logo);

    for (const selector of ['link[rel="icon"][sizes="32x32"]', 'link[rel="icon"][sizes="192x192"]', 'link[rel="apple-touch-icon"]']) {
      const href = await page.locator(selector).getAttribute('href');
      expect(decodeURIComponent(href)).toContain('_mytree-identity_');
      const response = await request.get(href);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe('image/png');
    }
  });

  test('footer attributes webtrees; no "Powered by webtrees" logo', async ({ page }) => {
    await page.goto(treeRoute(''));
    const footer = page.locator('footer .mytree-footer');

    await expect(footer).toContainText('MyTree is based on webtrees, free software licensed under the GNU GPL.');
    await expect(footer.getByRole('link', { name: 'webtrees' })).toHaveAttribute('href', 'https://webtrees.net/');
    await expect(page.locator('.wt-footer-powered-by-webtrees')).toHaveCount(0);
  });

  test('About MyTree keeps the upstream attribution and licence', async ({ page }) => {
    await page.goto(treeRoute(''));
    await (await openMenu(page, 'Help')).getByRole('link', { name: 'About MyTree' }).click();

    await expect(page).toHaveTitle(/^About MyTree/);
    const main = page.locator('main');
    await expect(main).toContainText('MyTree is a modified version of webtrees');
    await expect(main).toContainText('webtrees development team');
    await expect(main.getByRole('link', { name: 'GNU General Public License' })).toHaveAttribute('href', 'https://www.gnu.org/licenses/gpl-3.0.html');
    await expect(main).toContainText('The webtrees online upgrade is disabled');
  });


  test('control panel uses MyTree favicon and wording', async ({ page }) => {
    await page.goto(adminRoute('/admin'));
    expect(decodeURIComponent(await page.locator('link[rel="icon"]').getAttribute('href'))).toContain('_mytree-identity_');
    await expect(page.locator('main')).toContainText('MyTree is based on webtrees.');
  });
});

test.describe('UI-001 header navigation', () => {

  test('Account menu: my pages, my account, sign out', async ({ page }) => {
    await page.goto(treeRoute(''));
    const account = await openMenu(page, 'Account');

    await expect(account.getByRole('heading', { name: 'Test Admin' })).toBeVisible();
    for (const name of ['My page', 'My account', 'Sign out']) {
      await expect(account.getByRole('link', { name, exact: true })).toBeVisible();
    }
  });

  test('Settings menu: preferences, theme, language and administration', async ({ page }) => {
    await page.goto(treeRoute(''));
    const settings = await openMenu(page, 'Settings');

    await expect(settings.getByRole('link', { name: 'Personal preferences' })).toBeVisible();
    await expect(settings.getByRole('link', { name: 'Customize this page' })).toBeVisible();
    await expect(settings.getByRole('button', { name: /^Theme/ })).toBeVisible();
    await expect(settings.getByRole('button', { name: /^Language/ })).toBeVisible();

    await settings.getByRole('link', { name: 'Control panel' }).click();
    await expect(page).toHaveTitle('Control panel');
  });

  test('Help topics open in a dialog on any page', async ({ page }) => {
    // The individual list does not include the core help dialog itself.
    await page.goto(treeRoute('/individual-list'));
    await (await openMenu(page, 'Help')).getByRole('link', { name: 'Date', exact: true }).click();

    const dialog = page.locator('#wt-ajax-modal');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Date');
  });


  test('menus work from the keyboard', async ({ page }) => {
    await page.goto(treeRoute(''));
    const toggle = page.getByRole('button', { name: 'Account', exact: true });

    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('link', { name: 'My account', exact: true })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });
});

// Layout and theme checks run as the fictional editor: their result depends on
// the theme in use, and the editor keeps the site default (MyTree), while the
// fictional admin's theme may have been changed by hand.
test.describe('UI-001 MyTree theme and header layout', () => {
  test.use({ storageState: '.auth/editor.json' });

  test('MyTree is the default theme and the webtrees theme is not offered', async ({ page }) => {
    await page.goto(treeRoute(''));
    await expect(page.locator('body')).toHaveClass(/wt-theme-_mytree-theme_/);

    const settings = await openMenu(page, 'Settings');
    const themeToggle = settings.getByRole('button', { name: /^Theme/ });
    await expect(themeToggle).toContainText('MyTree');
    await themeToggle.click();

    const themes = (await settings.locator('#mytree-theme-choices .dropdown-item').allInnerTexts()).map((s) => s.trim());
    expect(themes).toContain('MyTree');
    expect(themes).not.toContain('webtrees');
  });

  test('header order is search, Help, Settings, Account; old text links are gone', async ({ page }) => {
    await page.goto(treeRoute(''));

    const boxes = [];
    for (const locator of [
      page.locator('header .wt-header-search-field'),
      page.getByRole('button', { name: 'Help', exact: true }),
      page.getByRole('button', { name: 'Settings', exact: true }),
      page.getByRole('button', { name: 'Account', exact: true }),
    ]) {
      await expect(locator).toBeVisible();
      boxes.push(await locator.boundingBox());
    }
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].x).toBeGreaterThan(boxes[i - 1].x);
    }

    // The old top bar: "My pages | Theme | Language | Sign out".
    await expect(page.locator('header .menu-mymenu, header .menu-theme, header .menu-language')).toHaveCount(0);
    await expect(page.locator('header').getByRole('link', { name: 'Sign out' })).toBeHidden();
  });

  test('theme choice works from the Settings menu', async ({ page }) => {
    await page.goto(treeRoute(''));
    let settings = await openMenu(page, 'Settings');
    await settings.getByRole('button', { name: /^Theme/ }).click();
    await settings.getByRole('link', { name: 'xenea' }).click();
    await expect(page.locator('body')).toHaveClass(/wt-theme-xenea/);

    // The MyTree header is the same in other themes. Switch back.
    settings = await openMenu(page, 'Settings');
    await settings.getByRole('button', { name: /^Theme/ }).click();
    await settings.getByRole('link', { name: 'MyTree' }).click();
    await expect(page.locator('body')).toHaveClass(/wt-theme-_mytree-theme_/);
  });
});

test.describe('UI-001 permissions: visitor', () => {
  test.use(VISITOR);

  test('Settings is visible; account preferences and control panel are greyed with reasons', async ({ page }) => {
    await page.goto(loginPage());
    const settings = await openMenu(page, 'Settings');

    const controlPanel = settings.getByRole('button', { name: 'Control panel' });
    await expect(controlPanel).toHaveAttribute('aria-disabled', 'true');
    await expect(controlPanel).toHaveAccessibleDescription('Sign in as a site or tree administrator to use the control panel.');

    const preferences = settings.getByRole('button', { name: 'Personal preferences' });
    await expect(preferences).toHaveAttribute('aria-disabled', 'true');
    await expect(preferences).toHaveAccessibleDescription('Sign in to change your personal preferences.');

    await expect(settings.getByRole('link', { name: 'Control panel' })).toHaveCount(0);
  });

  test('Account offers sign in and account creation', async ({ page }) => {
    await page.goto(loginPage());
    const account = await openMenu(page, 'Account');
    await expect(account.getByRole('link')).toHaveText(['Sign in', /Create an account/]);
  });
});

test.describe('UI-001 permissions: member', () => {
  test.use({ storageState: '.auth/member.json' });

  test('control panel is greyed with a reason, and still refused by the server', async ({ page, request }) => {
    await page.goto(treeRoute(''));
    const settings = await openMenu(page, 'Settings');

    const controlPanel = settings.getByRole('button', { name: 'Control panel' });
    await expect(controlPanel).toHaveAttribute('aria-disabled', 'true');
    await expect(controlPanel).toHaveAccessibleDescription('Only site and tree administrators can use the control panel.');
    await expect(settings.getByRole('link', { name: 'Personal preferences' })).toBeVisible();

    const response = await request.get(adminRoute('/admin'));
    expect(response.status()).toBe(403);
  });

  test('Account shows the member’s pages', async ({ page }) => {
    await page.goto(treeRoute(''));
    const account = await openMenu(page, 'Account');
    await expect(account.getByRole('heading', { name: MEMBER.realName })).toBeVisible();
    for (const name of ['My page', 'My account', 'Sign out']) {
      await expect(account.getByRole('link', { name, exact: true })).toBeVisible();
    }
  });
});

test.describe('UI-001 phone layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, storageState: '.auth/editor.json' });

  test('compact header without horizontal scrolling', async ({ page }) => {
    await page.goto(treeRoute(''));

    const [scrollWidth, clientWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    const header = await page.locator('header').boundingBox();
    expect(header.height).toBeLessThan(260);

    // Wordmark and the three controls share the top row; search is full width below.
    const brand = await page.locator('header .mytree-brand').boundingBox();
    for (const name of ['Help', 'Settings', 'Account']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(Math.abs(box.y + box.height / 2 - (brand.y + brand.height / 2))).toBeLessThan(12);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
    }
    const search = await page.locator('header .wt-header-search').boundingBox();
    expect(search.y).toBeGreaterThan(brand.y + brand.height - 1);
    expect(search.width).toBeGreaterThan(330);
  });

  test('touch targets are at least 44 px and menus fit the screen', async ({ page }) => {
    await page.goto(treeRoute(''));

    for (const name of ['Help', 'Settings', 'Account']) {
      const toggle = page.getByRole('button', { name, exact: true });
      const box = await toggle.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);

      const menu = await openMenu(page, name);
      const menuBox = await menu.boundingBox();
      expect(menuBox.x).toBeGreaterThanOrEqual(0);
      expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(390);

      for (const item of await menu.locator('.dropdown-item:visible').all()) {
        expect((await item.boundingBox()).height).toBeGreaterThanOrEqual(44);
      }
      await page.keyboard.press('Escape');
    }
  });
});

test.describe('UI-001 upgrade mechanism disabled', () => {
  for (const path of ['/admin/upgrade', '/admin/upgrade-action', '/admin/check-now']) {
    test(`${path} is unavailable to an administrator`, async ({ request }) => {
      expect((await request.get(adminRoute(path))).status()).toBe(404);
    });
  }

  test('POST to the upgrade actions is refused', async ({ page, request }) => {
    await page.goto(adminRoute('/admin'));
    const csrf = await page.locator('meta[name="csrf"]').getAttribute('content');
    for (const path of ['/admin/check-now', '/admin/upgrade-action']) {
      expect((await request.post(adminRoute(path), { form: { _csrf: csrf } })).status()).toBe(404);
    }
  });

  test('control panel has no version check or upgrade controls', async ({ page }) => {
    await page.goto(adminRoute('/admin'));
    const main = page.locator('main');

    await expect(main).toContainText('Online upgrades are disabled. MyTree is updated through its development workflow.');
    await expect(main.locator('[data-wt-post-url*="check-now"]')).toHaveCount(0);
    await expect(main.locator('a[href*="upgrade"]')).toHaveCount(0);
    await expect(main).not.toContainText(/check now|A new version of webtrees|Upgrade to webtrees/i);
  });

  test.describe('visitor', () => {
    test.use(VISITOR);

    test('upgrade wizard is not found (not a sign-in prompt)', async ({ page }) => {
      // A first, cookie-less request gets webtrees' "Cookie check" page instead,
      // so visit as a browser does: one page first, then the upgrade URL.
      await page.goto(loginPage());
      expect((await page.request.get(adminRoute('/admin/upgrade'))).status()).toBe(404);
    });
  });
});
