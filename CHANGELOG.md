# Changelog

All notable MyTree-specific changes are documented here, in the style of
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

This file tracks **MyTree's own changes only**. It does not restate upstream
webtrees history — that remains in `git log` and upstream's own release notes
at <https://github.com/fisharebest/webtrees/releases>. Each entry below is
tagged as either:

* **MyTree** — a change specific to this fork (new feature, custom module,
  documentation, configuration).
* **Upstream sync** — a note recording that upstream changes were merged in,
  with the commit range or tag, but without restating upstream's own log.

## [Unreleased]

### MyTree
- UI-002 (searchable lists): new custom module `custom-modules/mytree-lists/`.
  Lists → Individuals / Families show the records at once (webtrees' own
  "All" DataTables view) instead of the A–Z selector, headed "Individuals" /
  "Families": search box with the filter buttons beside it, records, then
  count, paging and rows per page (10/20/50/100). No A–Z or surname-count
  table in the list view. Search, sort, page and filters are restored when
  returning to a list (stable table ids for DataTables' saved state); phone
  layout without sideways page scrolling. **Core change:** the complete
  list includes people with a blank or unknown surname, once each
  (`AbstractIndividualListModule::individuals()`; DEVELOPMENT.md → "MyTree
  core changes"). Tests: `e2e/tests/ui-002-lists.spec.js` (15),
  `tests/Unit/MyTree/CompleteIndividualListTest.php` (4); baseline
  `e2e/investigations/ui-002-lists-baseline.spec.js`; findings in
  `docs/investigations/UI-002-searchable-lists.md`.
- UI-001 (MyTree identity & navigation):
  - New custom modules `custom-modules/mytree-identity/` and
    `custom-modules/mytree-theme/`. The header's text links are replaced by
    Help, Settings and Account menus after the search box; unavailable options
    are greyed with the reason shown; compact phone layout. MyTree wordmark,
    favicons, "– MyTree" page titles, a "based on webtrees" footer and an
    About MyTree page; the MyTree theme keeps the existing look. The core
    layouts are wrapped, not copied.
  - **Core change:** the webtrees upgrade mechanism is disabled — no version
    checks with dev.webtrees.net, no upgrade wizard (its routes return 404),
    and the upgrade service refuses to download or install. New
    `app/MyTree/`, plus `app/Webtrees.php`; see DEVELOPMENT.md → "MyTree core
    changes".
  - Settings: MyTree default theme; the webtrees theme, "Powered by
    webtrees" footer and "Check for new version" module disabled; email
    sender name MyTree.
  - Accounts and roles: the Account menu shows the signed-in user and their
    role, or Sign in / Create an account (following the site's registration
    setting); Settings links to user management, sign-in and registration,
    and tree access and privacy for those allowed. MyTree names for the
    webtrees roles (Viewer, Editor, Moderator, Tree Administrator, Site Administrator)
    on a Roles and permissions page and in the user editor. Presentation
    only — no authorization changes.
  - Tests: `tests/Unit/MyTree/` (12 PHPUnit tests),
    `e2e/tests/ui-001-identity.spec.js` (23) and
    `e2e/tests/ui-001-accounts.spec.js` (25 Playwright tests, including
    direct-request checks that each role is refused what it may not do). The
    e2e setup now creates fictional viewer, editor, moderator and tree
    administrator accounts. Upstream baseline recorded in
    `e2e/investigations/ui-001-identity-baseline.spec.js`; findings in
    `docs/investigations/UI-001-identity-and-navigation.md`.
- Development environment: the working copy moved to a NAS and is developed
  with Docker (`docker/`): an Apache/PHP dev instance on port 8081 with its
  own data volume (never the checkout's `data/`), a tools container (PHP,
  Composer, Node) and Playwright, driven by `docker/dev`. `DEVELOPMENT.md`
  and `CLAUDE.md` describe the NAS workspace, the Docker commands and the
  known Linux test baseline.
- Added fork documentation: `README.md` rewritten to identify MyTree as a
  fork of webtrees with upstream attribution; added `DEVELOPMENT.md`,
  `BACKLOG.md`, and this `CHANGELOG.md`.
- Added initial enhancement specifications in `docs/enhancements/`:
  - `WT-001-create-person-from-source.md` — create a person inline while
    editing a source record.
  - `WT-002-attach-existing-source.md` — attach an existing source to a
    person, with duplicate detection.

- Milestone 3A workflow investigation of WT-001/WT-002 against existing
  webtrees functionality: report in
  `docs/investigations/WT-001-WT-002-workflow-review.md`, a draft (unsubmitted)
  upstream bug report for "Find duplicates" failing on SQLite, and an
  investigation baseline suite in `e2e/investigations/`
  (`npm run investigate`), separate from the regression suite.
- Revised and renamed the enhancement specifications following the
  investigation:
  - WT-001 → `WT-001-guided-census-evidence-workflow.md` (contextual workflow
    guidance in the Census Assistant; inline person creation deferred).
  - WT-002 → `WT-002-duplicate-aware-evidence-entry.md` (duplicate source and
    same-record duplicate citation/fact warnings; attaching existing sources
    is already supported).
- Added an investigate-before-implement policy to `BACKLOG.md` and
  `CLAUDE.md`.

### Upstream sync
- Forked from `fisharebest/webtrees` at commit `c5ddf7f816` ("Fix:
  SearchService tests"), 2026-10-17.

<!--
Template for future upstream syncs:

### Upstream sync
- Merged upstream `main` from `<old-commit>` to `<new-commit>` (`<old-tag>`
  → `<new-tag>`). See the upstream changelog for details.
- Conflicts/adjustments required in MyTree code: <none | describe>.
-->
