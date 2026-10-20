# mytree-identity

The MyTree application identity, for every theme. Implements part of
[UI-001 — MyTree Identity & Navigation](../../docs/enhancements/UI-001-identity-and-navigation.md).

* **Header:** the core row of text links (*My pages | Theme | Language | Sign
  out*) is replaced by three icon menus, after the existing search box:
  * **Help** — help topics (date, name, place, restriction, pending changes),
    opened in the core help dialog; *Roles and permissions*; *About MyTree*;
  * **Settings** — personal preferences, *My roles and access*, *Customize
    this page* (where it applies), theme and appearance, language; then
    administration: control panel, and for site administrators *User
    management* and *Sign-in and registration*, plus *Tree access and
    privacy* for whoever administers the current tree;
  * **Account** — name, username and role in this tree; My account, My page,
    My individual record / My pedigree (when linked), Pending changes
    (moderators, when there are some), Sign out. Visitors: Sign in, and
    Create an account when the site allows registration.
  Options a user can't use are greyed out with the reason shown. A red dot
  on Account means there are pending changes.
* **Role names:** Viewer, Editor, Moderator, Tree Administrator and Site
  Administrator for webtrees' Member, Editor, Moderator, Manager and
  Administrator
  (`src/RoleNames.php`), on a *Roles and permissions* page and as a note in
  the core user editor. Presentation only: webtrees decides every role and
  enforces every permission.
* **Wordmark** in the header's logo slot, **favicons**, and page titles ending
  "– MyTree" (when the tree's *META_TITLE* is the default, "webtrees").
* **Footer:** "MyTree is based on webtrees, free software licensed under the
  GNU GPL", linking to *About MyTree* and webtrees.net.
* **About MyTree** page: upstream attribution, licence, third-party credits.
* **English wording** of a few emails and control-panel lines that call the
  site "webtrees" (custom translations for `en-*` languages).

It adds no data and changes no permissions: every menu entry is built by the
core theme menu builders and links to an existing route, which keeps its own
server-side access check.

## Installation

```bash
ln -s "$(pwd)/custom-modules/mytree-identity" modules_v4/mytree-identity
```

The Docker dev environment mounts it instead (`docker/docker-compose.yml`).
It is enabled automatically ("MyTree identity" in *Control panel → Modules*).
Then, once per installation:

* *Control panel → Modules → Footers*: disable **Powered by webtrees™**.
* *Control panel → Website preferences → Sending email*: set the sender name
  (`SMTP_DISP_NAME`) to `MyTree`.

## Architecture

```
module.php                         bootstrap
src/IdentityModule.php             module: view wrappers, footer, About page, translations
src/HeaderMenus.php                entries of the Help / Settings / Account menus
src/RoleNames.php                  MyTree names for the webtrees roles
resources/views/roles.phtml        the Roles and permissions page
resources/views/admin/*.phtml      wrapper for core admin/users-edit + its role-name note
src/LayoutRewriter.php             the targeted edits to the core layouts' HTML
resources/views/layouts/*.phtml    wrappers for core layouts/default and layouts/administration
resources/views/header/*.phtml     wordmark, menu controls, menu link
resources/views/icons/*.phtml      inline SVG icons (tree mark, help, settings, account)
resources/views/footer.phtml, about.phtml
resources/css/mytree-identity.css  header controls and footer (all themes)
resources/img/                     mark (SVG), favicons (PNG, ICO)
```

* **Wraps, never copies, the core layouts.** `boot()` registers replacements
  for `::layouts/default` and `::layouts/administration`. Each renders the
  **original** core layout, then `LayoutRewriter` edits only: the
  `<ul class="nav wt-user-menu">` list, the empty `.wt-site-logo` slot, the
  `<title>`, and the favicon `<link>` hrefs; and it adds the core
  `modals/ajax` dialog to pages that lack it (for help topics). Upstream
  changes to the layouts keep flowing in. If upstream changes one of those
  fragments, that edit silently does nothing and the e2e tests report it.
* The menu list keeps the core classes (`nav wt-user-menu`), so every theme
  positions it where it positioned the old menu.
* The favicons are generated from `resources/img/mytree-icon.svg` (rendered
  with the Playwright container's Chromium).

## Tests

`e2e/tests/ui-001-identity.spec.js`: branding, header order, each menu's
contents, keyboard use, phone layout and touch targets.
`e2e/tests/ui-001-accounts.spec.js`: the menus for each role, registration
open and closed, sign-out, the roles page, and direct requests proving
webtrees still refuses each role what it may not do.
