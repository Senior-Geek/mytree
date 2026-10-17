# MyTree Development Guide

This document covers the local development environment, git workflow, build
and test commands, upstream synchronization, and precautions for protecting
live genealogy data. It supplements the upstream-derived technical reference
in [README.md](README.md#technical-architecture) and is specific to this fork.

## Repository layout

```
origin    https://github.com/Senior-Geek/mytree.git   (this fork — read/write)
upstream  https://github.com/fisharebest/webtrees.git  (original project — read-only)
```

Branches:

* `main` — stable. Should always be installable and match a known-good state.
* `development` — integration branch for MyTree work in progress.
* Feature branches — cut from `development` for individual enhancements
  (e.g. `wt-001-create-person-from-source`).

Never commit directly to `main`. Merge `development` (or a feature branch)
into `main` only once it has been tested locally.

## Local environment

Prerequisites (same as upstream, see README):

* PHP 8.3–8.6 with `ctype`, `curl`, `gd`, `iconv`, `intl`, `json`, `mbstring`,
  `pcre`, `pdo`, `session`, `xml` extensions.
* [Composer](https://getcomposer.org/)
* [Node.js](https://nodejs.org/) with npm
* A database: **SQLite is confirmed supported** by this version of webtrees —
  `app/DB.php` defines a `DB::SQLITE` driver, the setup wizard offers it, and
  `ServerCheckService` checks for `sqlite3`/`pdo_sqlite` and a minimum SQLite
  version of 3.8.8. It's the simplest option for local development (no
  server process to run), and the database file is created at
  `data/<name>.sqlite` — already covered by `data/.gitignore`. Use
  MySQL/MariaDB or PostgreSQL instead if you want to match a specific
  production setup.

### First-time setup

```bash
composer install      # PHP dependencies (installs dev tools: phpunit, phpstan, phpcs)
npm install            # JS dependencies
npm run build           # Compile CSS/JS into public/
```

### Running locally

For quick iteration, PHP's built-in server is sufficient:

```bash
php -S localhost:8080
```

Then open <http://localhost:8080> — the setup wizard runs on first visit and
will ask for database connection details. Point it at a **local, disposable**
database and data directory (see "Protecting live data" below), not a
production tree.

For something closer to production, run under Apache or NGINX with URL
rewriting enabled, per the upstream installation guide.

### Running tests and checks

```bash
composer ci            # phpcs (or phpcbf), phpunit, phpstan — full local CI
vendor/bin/phpunit                                   # all tests
vendor/bin/phpunit --filter=testMethodName            # one test method
vendor/bin/phpunit tests/Feature/SomeTest.php         # one test file
vendor/bin/phpcbf                                     # auto-fix style issues
vendor/bin/phpstan                                    # static analysis only
```

Run `composer ci` before every commit that touches `app/`, `resources/`, or
`tests/`.

## Git workflow

1. Branch from `development` for each unit of work:
   `git checkout -b wt-00X-short-description development`
2. Commit small, focused changes. Keep MyTree-specific commits separable from
   any upstream-sync commits (see below) so `CHANGELOG.md` stays accurate.
3. Open a pull request from the feature branch into `development` on
   `origin` (even working solo, this keeps a review point and a clean merge
   history).
4. Periodically merge `development` into `main` once it is stable.
5. **Do not push or merge without explicit approval** — this applies to
   `main` in particular, and to any merge that would touch shared/production
   state.

## Synchronizing with upstream webtrees

Upstream is added as a second remote so security fixes and improvements can
be pulled in without re-forking:

```bash
git fetch upstream
git log development..upstream/main --oneline     # see what's new upstream
```

To merge an upstream update into `development`:

```bash
git checkout development
git merge upstream/main
```

Expect conflicts in files MyTree has customized — currently `README.md`.
Resolve by keeping MyTree's fork-identity sections and reconciling any
upstream edits to the "Technical architecture" content underneath them.
`CHANGELOG.md` and `BACKLOG.md` should not conflict, since upstream does not
touch them.

After a successful sync:

* Run `composer ci` to confirm nothing broke.
* Add an "Upstream sync" entry to `CHANGELOG.md` recording the commit range
  (see the template at the bottom of that file) rather than copying
  upstream's own log.
* If any MyTree module or customization depended on an internal API that
  upstream changed, note it in `BACKLOG.md` against the relevant enhancement.

## Protecting live genealogy data

**This repository is treated as potentially public**, regardless of its
current GitHub visibility setting. The following rules are absolute, not
just best-effort:

* **Never commit real genealogy data** — no real GEDCOM exports, no real
  media files, no database dumps, no personal records of any living or
  identifiable person. Use small, fictional test data for everything
  (webtrees ships generic sample data; prefer fabricated names/dates over
  anything derived from a real family tree).
* **Never attach screenshots or pasted output containing real family
  information** to a commit, commit message, issue, or pull request — this
  includes screenshots of the UI with real names visible, error messages
  containing real data, or database rows pasted for debugging.
* **`data/` is already fully git-ignored** (`data/.gitignore` excludes
  everything except `.gitignore`, `.htaccess`, and `index.php`). This is
  where webtrees stores `config.ini.php` (DB credentials), imported GEDCOM
  files, media, and cache, including the SQLite database file described
  above. Do not override this with `git add -f`.
* **Keep secrets out of commits**: database passwords and mail credentials
  live only in `data/config.ini.php`, which is already ignored.
* **Back up `data/` and the database independently of git** — git history is
  not a backup strategy for live data.

If real data is ever needed for local testing (e.g. importing your actual
family tree to use MyTree day-to-day), it stays confined to the git-ignored
`data/` directory on your own machine and is never staged, committed, or
included in a bug report.

## MyTree custom module source: `custom-modules/`

webtrees only loads modules from `modules_v4/`, which upstream's `.gitignore`
excludes entirely (it assumes that directory holds only third-party
downloads). Rather than modify `.gitignore`, MyTree-specific module source is
tracked in a separate, git-tracked directory, **`custom-modules/`**, and
deployed into `modules_v4/` by symlink (local dev) or copy (deployment). See
[custom-modules/README.md](custom-modules/README.md) for the exact commands.
`modules_v4/` itself remains untouched and git-ignored, exactly as upstream
intends.
