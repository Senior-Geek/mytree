# UI-001 investigation — application identity, header navigation and upgrades

**Date:** 2026-10-20 · **Data:** fictional dev tree `mytree_dev_test` only ·
**Baseline:** `e2e/investigations/ui-001-identity-baseline.spec.js` (6/6 passed
against upstream behaviour before any UI-001 change).

This records what webtrees already does for branding, the header and upgrades,
which extension points a module can use, and where a module is not enough.
The approved scope is in
[docs/enhancements/UI-001-identity-and-navigation.md](../enhancements/UI-001-identity-and-navigation.md).

## 1. Branding inventory

### User-facing branding (to become MyTree)

| Where | What users see | Source | Route to change |
|---|---|---|---|
| Header, every page | "webtrees" logo image | `resources/css/webtrees.css` (`.wt-site-logo::after`) — only the "webtrees" theme draws a logo | MyTree theme + header logo |
| Browser tab | `<page> – webtrees` | tree setting `META_TITLE`, default `Webtrees::NAME` (`app/Tree.php`) | Layout wrapper (default) + per-tree setting |
| Browser tab, untitled pages | `webtrees` | `ViewResponseTrait`, `ResponseFactory` fall back to `Webtrees::NAME` | Layout wrapper |
| Favicons | webtrees icon | `public/favicon-*.png`, `favicon.ico`, `apple-touch-icon.png` referenced from `layouts/default` and `layouts/administration` | Layout wrappers point at module assets |
| Footer | "webtrees" logo link to webtrees.net | `powered-by-webtrees` footer module | Disable it; MyTree footer with attribution |
| Theme menu | Theme named "webtrees" | `WebtreesTheme` | Disable the core theme; MyTree theme is the default |
| Emails | sender "webtrees" when no display name is set; subject "webtrees message – …"; body text "the webtrees site", "registered with webtrees", "a webtrees user" | `SMTP_DISP_NAME` setting, `MessageService`, `views/emails/*` | Setting + custom translations |
| Control panel | "Support and documentation can be found at webtrees.net"; version check text | `admin/control-panel.phtml` | Custom translations (the upgrade part is removed — §3) |
| Sign-in (admins) | "A new version of webtrees is available. Upgrade to webtrees x" | `Login.php` | Unreachable once upgrades are disabled (§3) |
| Reports (16 templates) | webtrees logo in report output; PDF author "webtrees x.y" | `<WebtreesLogo/>`, `Report/ParserGenerate.php`, `ReportGenerate.php` | Deferred: hard-coded in core; it is a credit |
| Setup wizard, database error pages | "Setup wizard for webtrees", forum link | `layouts/setup`, `errors/*` | Deferred: shown before modules load |
| Admin help text (≈15 strings) | "webtrees needs to send emails…" etc. | `admin/*.phtml` | Leave: accurate description of the underlying software |

The help pages (`resources/views/help/`) contain no webtrees branding.

### Attribution, copyright and licensing (preserve)

GPL v3 `LICENSE.md` and `GPL-3.0-or-later` in `composer.json`; the copyright
header "webtrees development team" in every source file; the "webtrees™"
trademark (MyTree must say *based on* webtrees, never *is* webtrees); the
upstream version shown in the control panel; third-party credits (TinyMCE™,
map tile attributions, vendor licences).

### Internal identifiers (leave unchanged)

Namespace `Fisharebest\Webtrees`, class `Webtrees` and `Webtrees::NAME`,
package `fisharebest/webtrees`, `wt_` tables and `WT_`-style settings, `wt-`
CSS classes, `window.webtrees`, asset names, module IDs, `modules_v4/`, the
GEDCOM export header (`1 SOUR webtrees`) and approved system ID (read by other
genealogy programs).

## 2. Header and navigation

* `layouts/default` renders the header: an empty `.wt-site-logo` (themes draw
  the logo in CSS), the tree title, the quick-search form (only when a tree is
  selected), then `<ul class="nav wt-user-menu">` filled from
  `$theme->userMenu($tree)`, then the genealogy menu.
* `userMenu()` (`ModuleThemeTrait`) returns: Pending changes, My pages (My
  page, My individual record, My pedigree, My account, Control panel,
  Customize this page), Theme, Language, Sign in / Sign out. Each builder
  (`menuControlPanel()`, `menuPendingChanges()`, …) applies its own permission
  check and returns `null` when the item doesn't apply. The routes behind
  them enforce the same permissions server-side (`AuthAdministrator`,
  `AuthManager`, …).
* The menu component renders dropdown items as plain links: no headers,
  disabled items or icon-only toggles.
* Bootstrap 5 dropdowns support keyboard navigation over `.dropdown-item`
  elements; `data-bs-auto-close="outside"` keeps a dropdown open while a
  section inside it is expanded.
* Contextual help opens in the AJAX modal `#wt-ajax-modal`
  (`views/help/link.phtml`, `HelpText` controller), but that modal is only
  included by some pages (edit forms, some admin pages) — not by the layout.
* The control panel uses its own layout (`layouts/administration`), which
  deliberately skips custom modules' `headContent()`/`bodyContent()`.
* The site's default theme is the `THEME_DIR` setting. `UseTheme` tries the
  session's last theme, then `THEME_DIR`, then always falls back to the core
  `WebtreesTheme`, even when that module is disabled.

## 3. The upgrade mechanism

* `Services/UpgradeService` fetches `https://dev.webtrees.net/build/latest-version.txt`
  at most once a day, sending the webtrees version, PHP version, database
  driver and a site UUID. It also downloads the release ZIP, extracts it and
  moves the files over the installation (`downloadFile`,
  `extractWebtreesZip`, `moveFiles`, `cleanFiles`).
* **The check runs on every full page request, for every visitor**: the core
  middleware `Http/Middleware/CheckForNewVersion` (in `Webtrees::MIDDLEWARE`)
  calls `isUpgradeAvailable()` on each non-AJAX GET. `ControlPanel`, `Login`,
  `UpgradeWizard`, `UpgradeWizardStep`, `CheckForNewVersionNow` and the
  "Check for new version" module (admin emails) also call the service.
* That middleware runs **before** `BootModules`, so no module can intercept
  or replace the service in time. The dev instance had already contacted
  dev.webtrees.net (control panel: "Last checked 21 hours ago").
* Routes: `/admin/upgrade` (`UpgradeWizard`), `/admin/upgrade-action`
  (`UpgradeWizardStep`), `/admin/check-now` (`CheckForNewVersionNow`), all
  administrator-only. `RouteCollection` has no remove method, but `add()`
  replaces the route registered for a controller.
* The container's `bind()` maps a class to a substitute, so binding
  `UpgradeService` to a subclass changes every consumer without editing
  `UpgradeService.php` itself.

**Conclusion:** stopping the automatic check needs a core change; a module
alone cannot. The smallest robust change is additive: a subclass of
`UpgradeService` that never contacts the network and refuses to download or
install, bound in the container at bootstrap; the `CheckForNewVersion`
middleware removed from the stack; and a middleware after `LoadRoutes` that
re-registers the three upgrade routes behind a handler that always returns
404. `UpgradeService.php`, `WebRoutes.php` and the upstream tests stay
untouched, and none of it depends on a module being enabled.

## 3a. Accounts, roles and user administration (extension)

* **Roles** (`Enums/Role`): per tree, Visitor (`none`), Member (`access`),
  Editor (`edit`), Moderator (`accept`), Manager (`admin`); plus the
  site-wide *Administrator* user option. `Auth::isMember/isEditor/
  isModerator/isManager()` are cumulative and true for administrators.
* **Route groups** enforce them server-side (`WebRoutes.php`):
  `AuthAdministrator` for `/admin/*` site pages, including every user
  administration page (`admin-users`, `-create`, `-edit`, cleanup) and
  sign-in/registration settings; `AuthManager` for one tree's management
  (`/admin/trees/manage/{tree}`, preferences, privacy, import/export, data
  fixes). Managers have **no** route that lists, creates, edits or deletes
  users or assigns roles.
* **My account** (`Account::post()`) reads a fixed list of personal fields
  (name, email, username, password, language, time zone, contact method,
  visibility, default individual); it never reads role or administrator
  fields.
* **Registration**: `USE_REGISTRATION_MODULE` (default on). The register
  pages return 404 when it is off. New accounts always need email
  verification and administrator approval before signing in. *Disabling* an
  account is unticking "Approved by administrator".
* **Tree access** for a manager is the tree's privacy page (who sees what)
  and its preferences (e.g. whether visitors must sign in).
* A cookie-less first request from a browser gets webtrees' "Cookie check"
  page; the sign-in page without a return address shows "The parameter
  “url” is invalid" (both upstream behaviour, relevant to tests).

**Conclusion:** the requested roles map one-to-one onto webtrees' (Moderator
kept as its own role, at the Project Director's request: it can approve
others' changes), and the existing route groups already
enforce the requested limits. UI-001 only presents them: menus, names, a
roles page, a note in the user editor. No authorization code changes.

## 4. Extension points used

| Need | Mechanism | Core edit? |
|---|---|---|
| MyTree theme (existing look) | Theme module: core `webtrees.min.css` + a small override stylesheet | No |
| New header controls, logo, favicons, title, help modal | Wrap `layouts/default` and `layouts/administration` with `View::registerCustomView` (render the core view, then replace marked fragments) — not a copy, so upstream layout changes still flow through | No |
| Header styling for all themes | `ModuleGlobalInterface::headContent()` | No |
| Footer attribution | `ModuleFooterInterface` | No |
| Text in emails / control panel | `ModuleCustomInterface::customTranslations()` | No |
| Default theme, disabled modules, sender name | Site settings (`THEME_DIR`, module status, `SMTP_DISP_NAME`) | No |
| Upgrade lockdown | Container binding + middleware (§3) | **Yes — `app/Webtrees.php` plus two new files in `app/MyTree/`** |

## 5. Constraints found

* **AppleDouble files on the SMB share.** The `tank-data` share has no Samba
  `fruit`/`streams_xattr` modules, so every file the Mac writes gets a `._name`
  companion holding macOS attributes. git ignores them (`.git/info/exclude`),
  but Playwright tried to load `._*.spec.js` as a test. Workaround: delete
  them on the NAS before running tools. Fix: add
  `vfs objects = catia fruit streams_xattr` to the share (a system change).
* Visitors to the dev tree only see the sign-in page (the tree requires
  authentication), so visitor tests run there.

## 6. Classification

| Item | Classification |
|---|---|
| Theme name, logo, favicon, footer, title suffix | Configuration change + module |
| New header with Help / Settings / Account dropdowns | Usability improvement (module) |
| Compact mobile header | Usability improvement (module CSS) |
| Disabling version checks and the upgrade wizard | New capability — needs a small, isolated core change |
| Email / control-panel wording | Configuration + module translations |
| Report logo, setup wizard, error pages | Deferred (core, rarely seen, or a credit) |
