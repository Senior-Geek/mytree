# MyTree — project instructions

MyTree is Paul Marriott's personal fork of [webtrees](https://github.com/fisharebest/webtrees)
(`origin` = `Senior-Geek/mytree`, `upstream` = `fisharebest/webtrees`), replacing a
prior Gramps-based workflow. Full context: [README.md](README.md),
[DEVELOPMENT.md](DEVELOPMENT.md), [BACKLOG.md](BACKLOG.md).

## Non-negotiable rules

- **Never commit or push without explicit approval**, including to `main` or `development`.
- **Treat this repository as potentially public**, regardless of its actual GitHub
  visibility. Never add real genealogy data, real GEDCOM exports, media, database
  dumps, or screenshots/pasted output containing real family information — including
  about living people. Use fictional test data only, always.
- **Ask before installing system-wide dependencies** (Homebrew packages, PHP/Composer
  itself) **or making destructive changes** (deleting branches, force-push, dropping
  databases, etc.).
- **Prefer modules over core edits.** New functionality belongs in
  `custom-modules/<name>/`, deployed into the git-ignored `modules_v4/` by symlink or
  copy (see `custom-modules/README.md`). Avoid changes to `app/` that would complicate
  future `upstream/main` merges.
- `main` is stable; work happens on `development` or feature branches cut from it.

## Environment

- PHP **8.3–8.6** (`composer.json` pins extensions: ctype, curl, gd, iconv, intl, json,
  mbstring, pcre, pdo, session, xml; dev/tests also need dom, libxml, pdo_sqlite, sqlite3).
- Composer and Node/npm for dependencies; `composer install && npm install && npm run build`.
- SQLite is a supported storage driver (`DB::SQLITE` in `app/DB.php`) — the simplest
  choice for local dev. Its DB file lands under `data/`, which is already fully
  git-ignored.
- Run locally with `php -S localhost:8080`; run checks with `composer ci` (phpcs,
  phpunit, phpstan) before any commit touching `app/`, `resources/`, or `tests/`.
- PHP and Composer are installed via Homebrew on this machine (`brew install php composer`,
  approved 2026-10-17) — `php`/`composer` are on `PATH` already, no need to re-check or
  reinstall.
- A local SQLite dev install already exists at `data/` with a fictional admin
  (`admin` / see `e2e/fixtures/testData.js`) and tree `mytree_dev_test`. webtrees queues
  most edits as a "pending change" requiring explicit acceptance (Control Panel → tree →
  Pending changes) before they're visible in search/stats/other views — expect that when
  testing manually.
- A Playwright regression suite lives in `e2e/` (its own `package.json`, isolated from
  the application's) covering the core editing workflows. Run it (`cd e2e && npm test`)
  after changes that touch individual/source/family editing, including WT-001/WT-002.
- Full command reference, upstream-sync procedure, and data-isolation rules live in
  `DEVELOPMENT.md` — don't duplicate it here, read it when needed.

## In-flight work

Proposed enhancements are tracked in `BACKLOG.md`, with full specs in
`docs/enhancements/WT-*.md`. Do not implement an enhancement unless explicitly asked
to start it, and don't edit a spec file without discussing the change first.
