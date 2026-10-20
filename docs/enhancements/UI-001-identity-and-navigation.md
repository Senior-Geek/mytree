# UI-001 — MyTree Identity & Navigation

**Priority:** High
**Status:** Done (accepted 2026-10-20)
**Category:** Application identity, navigation, maintenance safety
**Investigation:** [docs/investigations/UI-001-identity-and-navigation.md](../investigations/UI-001-identity-and-navigation.md)

## Background

MyTree is a maintained fork of webtrees. The application still presents
itself as webtrees (logo, theme, browser title, favicon, footer, emails), its
top-right navigation is a row of text links, and its built-in updater would
download an upstream webtrees release over MyTree. The Project Director
approved this scope on 2026-10-20 after the branding and UI inventory.

## Problem

1. Users see webtrees branding throughout an application that is now MyTree.
2. The header mixes text links and dropdowns, takes a lot of room on a phone,
   and gives no obvious route to help or to the control panel.
3. webtrees contacts dev.webtrees.net daily and offers an upgrade wizard that
   would replace MyTree's code with an upstream release, outside the
   deliberate Git/Docker workflow MyTree is updated through.

## Required Behavior

### 1. Branding
* A simple MyTree wordmark and tree icon, used in the header, favicons and
  the home-screen icon.
* The MyTree theme keeps the existing grey/blue appearance of the webtrees
  theme (no new palette yet).
* Delivered as custom modules, not core edits.

### 2. Header
Top right, left to right: **Search bar · Help (?) · Settings (gear) · Account**.
* **Help:** contextual help topics (dates, names, places, pending changes,
  restrictions) and an *About MyTree* page.
* **Settings:** personal preferences, Theme, Language and an obvious Control
  panel entry. Visible to everyone.
* **Account:** My page (plus My individual record / My pedigree when linked),
  My account, Pending changes when there are some, Sign out — or Sign in for
  visitors.
* Options that don't apply are greyed out with an explanation (tooltip plus
  visible text); sensitive or irrelevant ones are hidden.
* Server-side permission checks are unchanged; the menus only link to
  existing routes.
* The old top-bar text links are removed. The genealogy menu stays below.

### 3. Responsive and accessible
* Compact phone layout; no horizontal page scrolling.
* Icon buttons have accessible names; dropdowns work from the keyboard;
  touch targets are at least 44 px.

### 4. Theme and identity cleanup
* The "webtrees" theme is no longer offered; the MyTree theme is the default.
* No webtrees logo, title suffix, favicon or footer branding remains in
  normal use.
* GPL licence, copyright notices, third-party credits and a visible "based on
  webtrees" attribution are preserved. Internal identifiers are unchanged.

### 5. Upgrade mechanism disabled (required)
* No automatic version checks: nothing contacts dev.webtrees.net.
* The "Check for new version" module is disabled and can send no notices.
* The upgrade wizard and its routes (`/admin/upgrade`, `/admin/upgrade-action`,
  `/admin/check-now`) are unavailable to everyone, administrators included,
  and the service refuses to download, extract or install a release even if
  called directly.
* No upgrade buttons or links remain in the interface.
* Independent of module state and user permissions; Composer, Git, Docker
  and the upstream merge process are unaffected.

### 5a. Accounts, roles and user administration (extension, 2026-10-20)

Uses webtrees' own authentication, user management, roles and permission
checks; no separate system.

* **Account menu.** Visitors: *Sign in*; *Create an account* when the site's
  registration setting allows it (noting that an administrator approves each
  account), otherwise shown greyed with the reason. Signed-in users: display
  name, username and role in the current tree; *My account*, *My page*
  (plus My individual record / My pedigree / Pending changes where they
  apply); *Sign out*.
* **Settings menu.** Everyone: personal preferences, theme and appearance,
  language. Administration: *Control panel*; for site administrators also
  *User management* and *Sign-in and registration*; *Tree access and
  privacy* for whoever administers the current tree. Tree administrators see
  *User management* greyed with the reason; viewers and editors see only the
  greyed control panel.
* **Role names** (presentation only; the webtrees roles and per-tree model
  are unchanged):

  | MyTree | webtrees | Summary |
  |---|---|---|
  | Viewer | Member | Read-only, within the tree's privacy settings |
  | Editor | Editor | Edits records (changes may wait for approval) |
  | Moderator | Moderator | An editor who also approves or rejects others' changes |
  | Tree Administrator | Manager | Tree records and configuration, privacy and visitor access; no user administration |
  | Site Administrator | Administrator | Everything, including user accounts, registrations and role assignment |

  Shown on a *Roles and permissions* page (with the user's own role per
  tree), in the Account menu, and as a note on the core user editor.
* **Security.** Only site administrators can administer users (webtrees'
  `AuthAdministrator` routes). Tree administrators cannot reach user
  administration or gain site administrator rights through the interface or
  by direct request; *My account* accepts no privilege fields.

### 6. Remaining branding
Emails, control-panel text, reports and other user-facing references are
reviewed; changed where practical without causing upstream merge conflicts;
exceptions documented.

## Acceptance Criteria

* Header order is Search, Help, Settings, Account on desktop and phone.
* Visitor, ordinary user and administrator each see the right Account and
  Settings items; the control panel is greyed with an explanation for users
  who can't open it, and its routes still refuse them server-side.
* The theme list offers MyTree and no "webtrees" theme; MyTree is the default.
* Page titles end "– MyTree"; favicons and the header logo are MyTree's; the
  footer says "based on webtrees" with a link.
* The upgrade routes return 404 for an administrator; the control panel has
  no version-check or upgrade controls; the bootstrapped application uses the
  disabled upgrade service and its middleware stack has no version check.
* Phone width: no horizontal scroll, header controls reachable, touch targets
  ≥ 44 px.
* `docker/dev ci` shows no new failures beyond the documented baseline; the
  e2e regression suite passes.

## Out of Scope

UI-002 and later usability work (list defaults, new-individual form sections,
fact action icons, admin page navigation); a new colour palette; non-English
custom translations; changing internal identifiers.

## Implementation Notes

Modules (source in `custom-modules/`, mounted into `modules_v4/` by
`docker/docker-compose.yml`):

* `mytree-theme` — the MyTree theme.
* `mytree-identity` — header controls, logo, favicons, title, help modal,
  footer, About page, custom translations.

Core change (approved scope §5): `app/Webtrees.php` plus `app/MyTree/`. See
the investigation §3 and DEVELOPMENT.md → "MyTree core changes".

### As built (2026-10-20)

* **Header:** `mytree-identity` wraps the core `layouts/default` and replaces
  only the user-menu list, so it applies to every theme. Help topics open in
  the core help dialog (added to pages that lack it). Settings uses
  `data-bs-auto-close="outside"` so the theme and language lists can expand
  inside it. Unavailable options are focusable `aria-disabled` buttons with a
  visible reason linked by `aria-describedby` (and a tooltip). The Account
  button shows a red dot when pending changes await a moderator.
* **Branding:** wordmark in the logo slot; favicons from
  `mytree-icon.svg`; title suffix rewritten when META_TITLE is the default;
  admin layout gets the favicon; footer and About page carry the webtrees
  attribution, licence and third-party credits.
* **Upgrade mechanism:** container binding to `DisabledUpgradeService`,
  `CheckForNewVersion` middleware removed, `DisableUpgrades` route lockdown.
  Live check: last-check timestamp reset to 0 stayed at 0 through sign-in,
  browsing and the control panel; upgrade URLs 404 for visitor and admin.
* **Wording (English only):** control-panel support and version lines, the
  "MyTree message" email subject, three email bodies, the database-error
  advice.
* **Accounts and roles (extension):** `HeaderMenus` (menus), `RoleNames`
  (MyTree names, computed only from `Auth::isAdmin/isManager/isModerator/
  isEditor/isMember`), a *Roles and permissions* page (module action
  `Roles`), and a wrapper on the core `admin/users-edit` view adding the
  role-name note after its "Access to family trees" heading. Registration
  uses the same `USE_REGISTRATION_MODULE` setting the core registration
  pages enforce (they return 404 when it is off).
* **Verified by tests** (`e2e/tests/ui-001-accounts.spec.js`, 25 tests, with
  fictional Viewer, Editor, Moderator and Tree Administrator accounts): each role's
  menus; registration open and closed; sign-out; the roles page; and direct
  requests — viewers get 403 for editing, tree and site administration;
  editors can edit but get 403 for approving changes and for tree and site
  administration; moderators can also approve changes (200) but get 403 for
  tree and site administration; tree
  administrators get 200 for their tree's preferences and privacy, but 403
  for every site/user administration page and for POSTs creating users or
  setting the Administrator option; a tampered *My account* form adding
  privilege fields leaves them a tree administrator.
* **Settings applied to the dev instance:** `THEME_DIR=_mytree-theme_`,
  `SMTP_DISP_NAME=MyTree`; modules `webtrees`, `powered-by-webtrees`,
  `check-for-new-version` disabled. Production needs the same (DEVELOPMENT.md,
  local installation step 9).

### Deferred exceptions

| Item | Why deferred |
|---|---|
| Report output: webtrees logo and "webtrees x.y" PDF author | Hard-coded in core report code; it is a credit, not site branding |
| Setup wizard and database-connection error page | Shown before modules load; rarely seen |
| Non-English text naming webtrees (emails, control panel) | English custom translations only for now |
| Reply-to name "webtrees" (`NoReplyUser`) on the new-registration and email-verification notices sent to administrators | Hard-coded `Webtrees::NAME`, not translatable; admin-only |
| `<meta name="generator" content="webtrees …">`, GEDCOM export header `1 SOUR webtrees` | Internal / interchange identifiers |
| `favicon.ico` and `apple-touch-icon.png` in the repository root and `public/` | Core files; only requested by clients that ignore the page's icon links |
| Admin help text describing "webtrees" (≈15 strings) | Accurate description of the underlying software |
| Module titles "Powered by webtrees™", theme "webtrees" in the module lists | Upstream modules, disabled; names kept |
| Role names inside core admin pages (role select, role descriptions) | Kept as webtrees names; a note maps them to MyTree's names, to avoid relabelling core strings used elsewhere |
| Sign-in page opened without a return address shows "The parameter “url” is invalid" | Upstream behaviour; MyTree's own links always include one |
