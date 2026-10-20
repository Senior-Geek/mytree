// UI-001 — accounts, roles and user administration: the Account and Settings
// menus for each role, the Roles and permissions page, registration, and -
// independently of the menus - that webtrees itself still refuses each role
// what it may not do. One fictional account per role is created by
// setup/global.setup.js (e2e/fixtures/testData.js).
const { test, expect } = require('@playwright/test');
const { ADMIN, MEMBER, EDITOR, MODERATOR, MANAGER, TREE } = require('../fixtures/testData');
const { treeRoute } = require('../fixtures/helpers');

const route = (path) => `/index.php?route=${encodeURIComponent(path)}`;
const VISITOR = { storageState: { cookies: [], origins: [] } };
const AUTH = {
  member: '.auth/member.json',
  editor: '.auth/editor.json',
  moderator: '.auth/moderator.json',
  manager: '.auth/manager.json',
};

async function openMenu(page, name) {
  const toggle = page.getByRole('button', { name, exact: true });
  await toggle.click();
  const menu = page.locator(`[aria-labelledby="${await toggle.getAttribute('id')}"]`);
  await expect(menu).toBeVisible();
  return menu;
}

// Status of a GET as the page's signed-in user (shares the browser's cookies).
async function statusOf(page, path) {
  return (await page.request.get(route(path), { maxRedirects: 0 })).status();
}

// Status of a form POST with a valid CSRF token, as the page's user.
async function postStatus(page, path, form) {
  const csrf = await page.locator('meta[name="csrf"]').getAttribute('content');
  return (await page.request.post(route(path), { form: { _csrf: csrf, ...form }, maxRedirects: 0 })).status();
}

async function signIn(page, baseURL, user) {
  // The return address must be an absolute URL on this site.
  const login = route(`/login/${TREE}`) + '&url=' + encodeURIComponent(baseURL + route(`/tree/${TREE}`));
  // A cookie-less first request gets webtrees' "Cookie check" page; the second gets the form.
  await page.goto(login);
  await page.goto(login);
  await page.fill('input[name="username"]', user.username);
  await page.fill('input[name="password"]', user.password);
  await page.locator('input[name="password"]').press('Enter');
  await page.waitForLoadState('networkidle');
}

async function setRegistration(page, allowed) {
  await page.goto(route('/admin/site-registration'));
  await page.locator(`input[name="USE_REGISTRATION_MODULE"][value="${allowed ? 1 : 0}"]`).check();
  await page.locator('main form button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
}

test.describe('Account menu', () => {
  test.describe('visitor', () => {
    test.use(VISITOR);

    test('sign in and create an account (registration allowed)', async ({ page }) => {
      await page.goto(route(`/login/${TREE}`));
      const account = await openMenu(page, 'Account');

      await expect(account.getByRole('link', { name: 'Sign in' })).toBeVisible();
      const create = account.getByRole('link', { name: /Create an account/ });
      await expect(create).toContainText('A site administrator approves each new account.');

      await create.click();
      await expect(page).toHaveTitle(/^Request a new user account/);
    });
  });

  test('registration closed: option explained, and refused by the server', async ({ page, browser }) => {
    // page = administrator. Close registration, check as a visitor, then reopen it.
    await setRegistration(page, false);
    const visitor = await browser.newContext(VISITOR);

    try {
      const visitorPage = await visitor.newPage();
      await visitorPage.goto(route(`/login/${TREE}`));
      const account = await openMenu(visitorPage, 'Account');

      const create = account.getByRole('button', { name: 'Create an account' });
      await expect(create).toHaveAttribute('aria-disabled', 'true');
      await expect(create).toHaveAccessibleDescription('This website isn’t accepting new accounts. Ask the site administrator for one.');
      await expect(account.getByRole('link', { name: /Create an account/ })).toHaveCount(0);

      expect(await statusOf(visitorPage, `/register/${TREE}`)).toBe(404);
    } finally {
      await visitor.close();
      await setRegistration(page, true);
    }
  });

  for (const [label, user, role, file] of [
    ['administrator', ADMIN, 'Site Administrator', null],
    ['tree administrator', MANAGER, 'Tree Administrator', AUTH.manager],
    ['moderator', MODERATOR, 'Moderator', AUTH.moderator],
    ['editor', EDITOR, 'Editor', AUTH.editor],
    ['viewer', MEMBER, 'Viewer', AUTH.member],
  ]) {
    test.describe(label, () => {
      if (file) {
        test.use({ storageState: file });
      }

      test('shows who is signed in, their role, and their pages', async ({ page }) => {
        await page.goto(treeRoute(''));
        const account = await openMenu(page, 'Account');

        await expect(account.locator('.mytree-identity-name')).toHaveText(user.realName ?? 'Test Admin');
        await expect(account.locator('.mytree-identity-detail')).toHaveText(`${user.username} · ${role}`);

        const items = (await account.getByRole('link').allInnerTexts()).map((s) => s.trim());
        expect(items[0]).toBe('My account');
        expect(items[1]).toBe('My page');
        expect(items.at(-1)).toBe('Sign out');
      });
    });
  }

  test.describe('signing out', () => {
    test.use(VISITOR);

    test('returns the menu to the visitor state', async ({ page, baseURL }) => {
      // A fresh session, so the saved test sessions stay signed in.
      await signIn(page, baseURL, MEMBER);
      let account = await openMenu(page, 'Account');
      await account.getByRole('link', { name: 'Sign out' }).click();
      await page.waitForLoadState('networkidle');

      account = await openMenu(page, 'Account');
      await expect(account.getByRole('link', { name: 'Sign in' })).toBeVisible();
      await expect(account.getByRole('link', { name: 'Sign out' })).toHaveCount(0);
      await expect(account.locator('.mytree-identity-name')).toHaveCount(0);
    });
  });
});

test.describe('Settings menu by role', () => {
  test('site administrator: control panel, user management, registration, tree access', async ({ page }) => {
    await page.goto(treeRoute(''));
    const settings = await openMenu(page, 'Settings');

    for (const name of ['Personal preferences', 'My roles and access', 'Control panel', 'User management', 'Sign-in and registration', 'Tree access and privacy']) {
      await expect(settings.getByRole('link', { name, exact: true })).toBeVisible();
    }
    await expect(settings.getByRole('button', { name: /^Theme and appearance/ })).toBeVisible();
    await expect(settings.getByRole('button', { name: /^Language/ })).toBeVisible();

    // Each link opens the existing webtrees page.
    const targets = {
      'User management': 'User administration',
      'Sign-in and registration': 'Sign-in and registration',
      'Tree access and privacy': /Privacy$/,
    };
    for (const [name, title] of Object.entries(targets)) {
      await page.goto(treeRoute(''));
      await (await openMenu(page, 'Settings')).getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveTitle(title);
    }
  });

  test.describe('tree administrator', () => {
    test.use({ storageState: AUTH.manager });

    test('tree control panel and tree access; user management greyed with the reason', async ({ page }) => {
      await page.goto(treeRoute(''));
      const settings = await openMenu(page, 'Settings');

      await expect(settings.getByRole('link', { name: 'Control panel' })).toBeVisible();
      await expect(settings.getByRole('link', { name: 'Tree access and privacy' })).toBeVisible();
      await expect(settings.getByRole('link', { name: 'Sign-in and registration' })).toHaveCount(0);

      const users = settings.getByRole('button', { name: 'User management' });
      await expect(users).toHaveAttribute('aria-disabled', 'true');
      await expect(users).toHaveAccessibleDescription('Only site administrators can manage user accounts and roles.');

      await settings.getByRole('link', { name: 'Control panel' }).click();
      await expect(page).toHaveTitle(/^Manage family trees/);
    });
  });

  for (const [label, file] of [['moderator', AUTH.moderator], ['editor', AUTH.editor], ['viewer', AUTH.member]]) {
    test.describe(label, () => {
      test.use({ storageState: file });

      test('preferences, theme and language; only the control panel shown, greyed', async ({ page }) => {
        await page.goto(treeRoute(''));
        const settings = await openMenu(page, 'Settings');

        await expect(settings.getByRole('link', { name: 'Personal preferences' })).toBeVisible();
        await expect(settings.getByRole('button', { name: /^Theme and appearance/ })).toBeVisible();
        await expect(settings.getByRole('button', { name: 'Control panel' })).toHaveAttribute('aria-disabled', 'true');
        await expect(settings.getByText('User management')).toHaveCount(0);
        await expect(settings.getByText('Tree access and privacy')).toHaveCount(0);
      });
    });
  }
});

test.describe('Roles and permissions page', () => {
  for (const [label, file, role, webtrees] of [
    ['administrator', null, 'Site Administrator', 'Administrator'],
    ['tree administrator', AUTH.manager, 'Tree Administrator', 'Manager'],
    ['moderator', AUTH.moderator, 'Moderator', 'Moderator'],
    ['editor', AUTH.editor, 'Editor', 'Editor'],
    ['viewer', AUTH.member, 'Viewer', 'Member'],
  ]) {
    test.describe(label, () => {
      if (file) {
        test.use({ storageState: file });
      }

      test(`shows the user's own role: ${role}`, async ({ page }) => {
        await page.goto(treeRoute(''));
        await (await openMenu(page, 'Settings')).getByRole('link', { name: 'My roles and access' }).click();

        await expect(page).toHaveTitle(/^Roles and permissions/);
        const row = page.locator('.mytree-my-roles tbody tr', { hasText: 'MyTree Dev Test' });
        await expect(row.locator('td').nth(1)).toHaveText(role);
        await expect(row.locator('td').nth(2)).toHaveText(webtrees);

        const roles = page.locator('.mytree-role-table tbody th');
        await expect(roles).toHaveText(['Visitor', 'Viewer', 'Editor', 'Moderator', 'Tree Administrator', 'Site Administrator']);
      });
    });
  }

  test('the user editor explains the MyTree role names', async ({ page }) => {
    await page.goto(route('/admin/admin-users-edit') + '&user_id=1');
    const note = page.locator('.mytree-role-names');
    await expect(note).toContainText('Moderator = Moderator');
    await expect(note).toContainText('Tree Administrator = Manager');
    await expect(note).toContainText('Site Administrator = Administrator');
  });
});

test.describe('Permissions are enforced by webtrees, not the menus', () => {
  const SITE_ADMIN_PAGES = ['/admin', '/admin/admin-users', '/admin/admin-users-create', '/admin/site-registration', '/admin/modules'];

  test.describe('viewer', () => {
    test.use({ storageState: AUTH.member });

    test('cannot edit, manage the tree, or administer the site', async ({ page }) => {
      await page.goto(treeRoute(''));
      expect(await statusOf(page, `/tree/${TREE}/add-fact/X100/OCCU`)).toBe(403);
      expect(await statusOf(page, `/tree/${TREE}/preferences`)).toBe(403);
      for (const path of SITE_ADMIN_PAGES) {
        expect(await statusOf(page, path), path).toBe(403);
      }
    });
  });

  test.describe('editor', () => {
    test.use({ storageState: AUTH.editor });

    test('can edit records, but not approve changes, manage the tree or administer the site', async ({ page }) => {
      await page.goto(treeRoute(''));
      expect(await statusOf(page, `/tree/${TREE}/add-fact/X100/OCCU`)).toBe(200);
      expect(await statusOf(page, `/tree/${TREE}/pending`)).toBe(403);
      expect(await statusOf(page, `/tree/${TREE}/preferences`)).toBe(403);
      expect(await statusOf(page, `/tree/${TREE}/privacy`)).toBe(403);
      for (const path of SITE_ADMIN_PAGES) {
        expect(await statusOf(page, path), path).toBe(403);
      }
    });
  });

  test.describe('moderator', () => {
    test.use({ storageState: AUTH.moderator });

    test('can edit and approve changes, but not manage the tree or administer the site', async ({ page }) => {
      await page.goto(treeRoute(''));
      expect(await statusOf(page, `/tree/${TREE}/add-fact/X100/OCCU`)).toBe(200);
      expect(await statusOf(page, `/tree/${TREE}/pending`)).toBe(200);
      expect(await statusOf(page, `/tree/${TREE}/preferences`)).toBe(403);
      expect(await statusOf(page, `/tree/${TREE}/privacy`)).toBe(403);
      for (const path of SITE_ADMIN_PAGES) {
        expect(await statusOf(page, path), path).toBe(403);
      }
    });
  });

  test.describe('tree administrator', () => {
    test.use({ storageState: AUTH.manager });

    test('manages the tree but cannot reach site or user administration', async ({ page }) => {
      await page.goto(treeRoute(''));
      expect(await statusOf(page, `/tree/${TREE}/preferences`)).toBe(200);
      expect(await statusOf(page, `/tree/${TREE}/privacy`)).toBe(200);
      expect(await statusOf(page, `/admin/trees/manage/${TREE}`)).toBe(200);
      for (const path of [...SITE_ADMIN_PAGES, '/admin/admin-users-edit']) {
        expect(await statusOf(page, path), path).toBe(403);
      }
    });

    test('cannot make anyone a site administrator or change roles by direct request', async ({ page }) => {
      await page.goto(treeRoute(''));
      // The user editor's own form fields, posted directly.
      expect(await postStatus(page, '/admin/admin-users-edit', {
        user_id: '1', username: MANAGER.username, real_name: MANAGER.realName, email: MANAGER.email,
        canadmin: '1', canedit1: 'admin', approved: '1', verified: '1',
      })).toBe(403);
      expect(await postStatus(page, '/admin/admin-users-create', {
        username: 'escalation', real_name: 'Escalation', email: 'escalation@example.test', password: 'Fictional123',
      })).toBe(403);
      expect(await statusOf(page, '/admin/admin-users')).toBe(403);
    });

    test('cannot grant themselves site administration through My account', async ({ page }) => {
      // Submit the real My account form with extra privilege fields added.
      await page.goto(route(`/my-account/${TREE}`));
      await page.evaluate(() => {
        const form = document.querySelector('main form');
        for (const [name, value] of [['canadmin', '1'], ['canedit1', 'admin'], ['approved', '1'], ['role', 'admin']]) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.append(input);
        }
      });
      await page.locator('main form button[type="submit"]').first().click();
      await page.waitForLoadState('networkidle');

      // Still a tree administrator only.
      for (const path of SITE_ADMIN_PAGES) {
        expect(await statusOf(page, path), path).toBe(403);
      }
      await page.goto(treeRoute(''));
      const account = await openMenu(page, 'Account');
      await expect(account.locator('.mytree-identity-detail')).toHaveText(`${MANAGER.username} · Tree Administrator`);
    });
  });
});
