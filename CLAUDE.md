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
  future `upstream/main` merges. A core change needs explicit approval and must be
  isolated, documented, tested, and have its upstream-sync impact explained.
- **Investigate before implementing.** Before building any enhancement, check what
  webtrees already does (code + Playwright on the fictional dev tree), write it up in
  `docs/investigations/`, and revise the spec to cover only genuine gaps. Full policy:
  `BACKLOG.md` → "Investigate before implementing".
- `main` is stable; work happens on `development` or feature branches cut from it.

## Environment

- **Where things run.** The workspace lives on the NAS; Claude Code runs on the Mac with
  its working directory on the SMB mount of that workspace. Host, user, paths and the
  exact SSH command are in `CLAUDE.local.md` (not tracked).
  - Read and edit files directly through the SMB mount.
  - Run **every** command — git, composer, npm, php, docker, Playwright — on the NAS
    over SSH, from the workspace root on the NAS.
  - **Never run git on the Mac against the SMB copy**: it is slow, and two machines
    driving one index risk corrupting it. Claude Code's startup git snapshot (status,
    log) is switched off for this workspace (`.claude/settings.local.json`), so there is
    no git status in context — run `git status` on the NAS when you need it. That setting
    doesn't stop every git call: Claude Code still runs a few read-only ones itself
    (see DEVELOPMENT.md → Development workspace).
  - Files written over SMB get `._*` companions; delete them on the NAS before running
    tools (command in DEVELOPMENT.md → "Development workspace").
  - Nothing is installed on the NAS host itself: every tool runs in a container through
    `docker/dev` (see `docker/README.md`).
  - Some editors save by replacing the file, which resets a script's executable bit; if
    `git status` shows `old mode 100755 / new mode 100644`, restore it on the NAS with
    `chmod +x`.
- PHP **8.3–8.6** (`composer.json` pins extensions: ctype, curl, gd, iconv, intl, json,
  mbstring, pcre, pdo, session, xml; dev/tests also need dom, libxml, pdo_sqlite, sqlite3).
  The tools container provides PHP 8.3, Composer 2 and Node 22.
- Dependencies and assets: `docker/dev composer install`, `docker/dev npm ci`,
  `docker/dev npm run build`.
- Dev instance: `docker/dev up` serves the checkout on port 8081 (Apache + PHP 8.3).
  Its SQLite database, config and media live in the Docker volume
  `mytree-dev_mytree-data` — never in the checkout's `data/`. It holds a fictional admin
  (`admin` / see `e2e/fixtures/testData.js`) and the tree `mytree_dev_test`. webtrees
  queues most edits as a "pending change" requiring explicit acceptance (Control Panel →
  tree → Pending changes) before they're visible in search/stats/other views — expect
  that when testing manually (the dev admin has auto-accept on).
- Checks: `docker/dev ci` (phpcs without auto-fixing, phpunit `--no-coverage`, phpstan)
  before any commit touching `app/`, `resources/`, or `tests/`. Known baseline failures
  are listed in `DEVELOPMENT.md`; anything else is a regression.
- A Playwright regression suite lives in `e2e/` (its own `package.json`, isolated from
  the application's) covering the core editing workflows. Run it (`docker/dev e2e`)
  after changes that touch individual/source/family editing, including WT-001/WT-002.
- Real genealogy data never enters this environment, the dev volume, or the repository.
  A future production instance will be a separate Compose project with its data under
  `/tank/private/mytree`; don't touch it from here.
- The previous Mac workspace (`~/mytree`) is kept only as a fallback until it is retired;
  don't develop in it.
- Full command reference, upstream-sync procedure, and data-isolation rules live in
  `DEVELOPMENT.md` — don't duplicate it here, read it when needed.

## In-flight work

Proposed enhancements are tracked in `BACKLOG.md`, with full specs in
`docs/enhancements/` (`WT-*`, `UI-*`). Do not implement an enhancement unless explicitly
asked to start it, and don't edit a spec file without discussing the change first.

- UI-001 (MyTree identity & navigation) is done (accepted 2026-10-20): modules
  `custom-modules/mytree-identity/` and `mytree-theme/`, plus the approved core change
  disabling the webtrees upgrade mechanism (`app/MyTree/`, `app/Webtrees.php`; see
  DEVELOPMENT.md → "MyTree core changes"). Never re-enable the upgrade mechanism.
- WT-001 (Guided census evidence workflow) and WT-002 (Duplicate-aware evidence entry)
  were re-scoped after the Milestone 3A investigation
  (`docs/investigations/WT-001-WT-002-workflow-review.md`). Milestone 3B
  (implementation) is not yet authorised.
- Use "unlinked" (never "unrelated") for census occupants not tied to a person record.
- `e2e/investigations/` (`docker/dev e2e investigate`) records *current* behaviour,
  including limitations, as a baseline. It's separate from the regression suite; update
  it deliberately when an enhancement changes that behaviour.
