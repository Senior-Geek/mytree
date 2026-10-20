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

## Development workspace

The working copy lives on a Debian NAS (ZFS, Docker) and is edited from a Mac:

* **Workspace:** `/tank/data/Dev/MyTree` on the NAS, shared to the Mac over SMB.
  Files are read and edited through that share.
* **Commands:** git, Composer, npm, PHP, Docker and Playwright all run **on the
  NAS**, over SSH from the Mac (`ssh <nas> 'cd /tank/data/Dev/MyTree && …'`).
  Machine-specific details (host, user, SSH key) are kept out of the repository,
  in the untracked `CLAUDE.local.md`.
* **Never run git on the Mac against the SMB copy.** It is slow, and two
  machines driving one index risk corrupting it.
* **Claude Code and git:** started in the SMB copy, Claude Code would run
  `git status` and `git log` at startup. The untracked
  `.claude/settings.local.json` sets `"includeGitInstructions": false`, which
  stops that, and denies its Bash tool local `git` commands. It does not stop
  every git call: tested with Claude Code 2.1.292 (`claude -p`), it still runs
  three read-only ones at startup (`git ls-files --error-unmatch
  .claude/settings.local.json`, `git remote`, `git remote get-url origin`).
  These don't write to the repository. Interactive sessions and other versions
  may run other read-only git commands; the deny rule only covers commands
  Claude runs through its Bash tool, not Claude Code's own.
* **Nothing is installed on the NAS host:** every tool runs in a container,
  driven by [`docker/dev`](docker/README.md).
* **File modes:** editing over SMB keeps a file's permissions, but editors that
  save by replacing the file reset scripts to non-executable. If `git status`
  shows `old mode 100755 / new mode 100644`, run `chmod +x <file>` on the NAS.
* **`._*` files:** the share has no Samba `fruit`/`streams_xattr` support, so
  every file the Mac writes gets a `._<name>` companion holding macOS
  attributes. git ignores them (`.git/info/exclude`), but other tools don't —
  Playwright tries to load `._*.spec.js` as tests. Delete them on the NAS
  before running tools:
  `find . \( -path ./node_modules -o -path ./vendor -o -path ./e2e/node_modules \) -prune -o -name '._*' -type f -exec rm -f {} +`.
  (Enabling `vfs objects = catia fruit streams_xattr` on the share would stop
  them being created.)
* **Backups:** the workspace is on `tank/data`, so the NAS backup includes it.
  The dev instance's database lives in a Docker volume (fictional data only;
  recreate it rather than restore it).

The NAS copy of the repository has its own local git settings: pushes go over
SSH (`git@github.com:Senior-Geek/mytree.git`) and commits use the GitHub
no-reply address. The previous Mac workspace (`~/mytree`) is kept only as a
fallback until it is retired; don't develop in both.

## Local environment

All of this is provided by the containers in [`docker/`](docker/README.md) —
`mytree-dev-tools` (PHP 8.3 CLI with the required extensions, Composer 2,
Node 22/npm), `mytree-dev` (Apache + PHP 8.3) and the Playwright image. To work
without Docker on another machine instead, install the prerequisites (same as
upstream, see README):

* PHP 8.3–8.6 with `ctype`, `curl`, `gd`, `iconv`, `intl`, `json`, `mbstring`,
  `pcre`, `pdo`, `session`, `xml` extensions, with `short_open_tag = Off`
  (PHP's default when no `php.ini` is loaded is On, which breaks the XML
  templates).
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
docker/dev composer install   # PHP dependencies (installs dev tools: phpunit, phpstan, phpcs)
docker/dev npm ci             # JS dependencies, exactly as locked
docker/dev npm run build      # Compile CSS/JS into public/
```

(Without Docker: the same commands without `docker/dev`.)

### Running locally

```bash
docker/dev up       # build if needed and start; http://<nas>:8081
docker/dev logs -f  # Apache/PHP logs
docker/dev down     # stop (the data volume is kept)
```

The `mytree-dev` container serves the live checkout (including uncommitted
work) with Apache, and keeps its own database, config and media in the Docker
volume `mytree-dev_mytree-data` — never in the checkout's `data/`. MyTree's
custom modules are bind-mounted into a container-only `modules_v4/`. Without
Docker, PHP's built-in server (`php -S localhost:8080`) is sufficient for
quick iteration.

### Local development installation (SQLite, isolated, fictional data)

This sets up a throwaway MyTree instance with its own SQLite file, config, and
cache — inside the `mytree-dev_mytree-data` volume with Docker, or inside the
checkout's git-ignored `data/` without it — with no connection to any other
webtrees/MyTree installation. Follow this exactly once (or after a reset,
below). The NAS instance already exists: its volume was seeded from the
previous Mac workspace's fictional dev database.

1. Start the dev instance (`docker/dev up`) and open `http://<nas>:8081`
   (without Docker: `php -S localhost:8080` and <http://localhost:8080>).
   The setup wizard runs automatically.
2. Step through: language → environment check (informational) → **database
   type: SQLite**.
3. **Database name**: letters, digits, and underscores only (no hyphens —
   the wizard rejects them silently and just re-shows the same step). Use
   something like `mytree_dev`. The file lands at `data/mytree_dev.sqlite`
   (inside the volume with Docker; covered by `data/.gitignore` without it).
4. **Administrator account**: use a fictional name/username/email — e.g.
   name "Test Admin", username `admin`, email `admin@example.test`. This is
   a local-only account with no connection to any real identity. The
   `e2e/` test suite (below) expects exactly these values by default; if you
   choose different ones, update `e2e/fixtures/testData.js` to match.
5. Finish the wizard, sign in, and create a tree from the Control Panel
   ("Create a family tree"). Give it a fictional title and the internal name
   `mytree_dev_test` (the `e2e/` suite creates this automatically if it's
   missing, but creating it yourself first is fine too).
6. Populate it with **fictional individuals, families, and sources only** —
   see "Protecting live genealogy data" below. Never import a real GEDCOM
   file into this instance.
7. **Enable auto-accept for the dev admin**, using webtrees' own setting
   (no code involved): Control Panel → Users → edit the admin user → check
   "Automatically accept changes made by this user" → save. This is a
   per-user preference (`auto_accept`, stored in `wt_user_setting`), not a
   tree setting — webtrees has no tree-level auto-accept, only this
   per-user one — but since this admin is the only user on the fictional
   dev tree, enabling it here has the same effect.
8. **Install the MyTree custom modules.** With Docker, each module is
   bind-mounted by `docker/docker-compose.yml` (add one line per new module,
   see [`docker/README.md`](docker/README.md)). Without Docker, symlink each
   one from `custom-modules/` into the git-ignored `modules_v4/` (see
   [`custom-modules/README.md`](custom-modules/README.md)), e.g.
   `ln -s ../custom-modules/mytree-<name> modules_v4/mytree-<name>`.
   New modules are enabled automatically. The `e2e/` regression suite
   expects them.
9. **Apply the MyTree identity settings (UI-001).** The same steps apply to
   any MyTree installation, including production:
   * default theme: `php index.php site-setting THEME_DIR _mytree-theme_`
     (Docker: `docker compose -f docker/docker-compose.yml exec -u www-data mytree php index.php site-setting THEME_DIR _mytree-theme_`),
     or Control Panel → Website preferences → Default theme → MyTree;
   * email sender name: `site-setting SMTP_DISP_NAME MyTree`, or Control
     Panel → Sending email → Sender name;
   * Control Panel → Modules → All modules: disable **webtrees** (theme),
     **Powered by webtrees™** (footer) and **Check for new version**.

   The upgrade mechanism itself is disabled in code, whatever these settings
   say (see "MyTree core changes" below). The `e2e/` setup also creates
   fictional *member*, *editor*, *moderator* and *treeadmin* accounts (Viewer,
   Editor, Moderator and Tree Administrator; `e2e/fixtures/testData.js`) for the permission tests.
   The registration test switches "Allow visitors to request a new user
   account" off and back on.

By default (and for any *other* user you create), webtrees queues edits as a
**pending change** requiring explicit acceptance (Control Panel → the tree →
"Pending changes" → "Accept all changes", or the inline "accept" link next
to a just-edited record) before they're visible elsewhere in the app (stats,
search, other views). With step 7 done, the dev admin's edits skip this and
apply immediately — verified by creating a test individual and confirming no
pending-change banner appeared.

### Your own administrator account

Create personal accounts through webtrees' own *Add a user* page, so the
password is typed only into the browser form: it travels in the POST body,
is stored hashed, and isn't written to webtrees' logs (which record only the
username) or Apache's access log. Don't use the `user-edit` CLI command for
this: it takes the password as a command-line argument (shell history,
process list) and prints it back.

1. On the Mac, in your own terminal, open an SSH tunnel and leave it running,
   so the password never crosses the network in plain HTTP:
   `ssh -N -L 8081:localhost:8081 <nas>`
2. Open <http://localhost:8081>, sign in as the fictional `admin`
   (`e2e/fixtures/testData.js`), then **Settings → User management → Add a
   user**. Choose a username, name and email; type your password in the
   form only.
3. On the edit page that follows, tick **Email verified**, **Approved by
   administrator** and **Administrator**; optionally **Automatically accept
   changes**. Save.
4. **Account → Sign out**, then sign in as yourself. The Account menu should
   read "<username> · Site Administrator".

Keep the fictional `admin` account: the `e2e/` suite signs in with it.

### Starting, stopping, and resetting the dev install

```bash
docker/dev up        # start
docker/dev down      # stop

# Reset to a blank install (deletes the dev database, config, cache and media
# in the volume - fictional data only, nothing you can't recreate)
docker/dev down
docker volume rm mytree-dev_mytree-data
docker/dev up        # then revisit http://<nas>:8081 to run the setup wizard again
```

Without Docker: start with `php -S localhost:8080`, stop with Ctrl-C, and
reset with `rm -f data/config.ini.php data/*.sqlite && rm -rf data/cache`.

A reset deletes the whole SQLite database, which includes the `auto_accept`
preference set in step 7 above — redo that step after resetting.

### End-to-end tests

[`e2e/`](e2e/) holds a Playwright suite that drives the actual browser
workflows (create/edit an individual, create a source and attach a citation,
establish a family relationship, navigate between related records) against
the dev instance. It's a separate Node project so its dependencies never
touch the application's own `package.json`. See [`e2e/README.md`](e2e/README.md)
for details — in short:

```bash
docker/dev e2e-install        # one-time, and after an e2e/package-lock.json change
docker/dev e2e                # regression suite
docker/dev e2e investigate    # investigation suite (current-behaviour baseline)
```

The Playwright container shares the dev instance's network, where Apache also
listens on the suites' default `http://localhost:8080`, so no configuration
changes are needed. Without Docker: `cd e2e && npm install && npx playwright
install chromium` once, then `npm test` (it starts `php -S localhost:8080` if
nothing is listening there).

Rerun this suite after implementing WT-001 or WT-002 to confirm neither
enhancement broke the existing editing workflows it covers.

### Running tests and checks

```bash
docker/dev ci                                                      # phpcs, phpunit, phpstan - full local CI
docker/dev php vendor/bin/phpunit --no-coverage                    # all tests
docker/dev php vendor/bin/phpunit --no-coverage --filter=testMethodName
docker/dev php vendor/bin/phpunit --no-coverage tests/Feature/SomeTest.php
docker/dev php vendor/bin/phpcbf                                   # auto-fix style issues
docker/dev php vendor/bin/phpstan analyse                          # static analysis only
```

`docker/dev ci` runs the same three tools as `composer ci`, with two
differences: phpcs never auto-fixes files (`composer ci` falls back to
`phpcbf`, which rewrites them), and phpunit runs with `--no-coverage`. Run it
before every commit that touches `app/`, `resources/`, or `tests/`.

#### Known baseline test failures

As of the upstream commit this fork was created from (`c5ddf7f816`), the
full suite is 42,652 tests / 237,015 assertions with **2 pre-existing
failures**, both in `tests/Unit/TreeTest.php`:

* `testImportAndDeleteGedcomFile`
* `testHasPendingEdits`

Both are reproducible in isolation (`vendor/bin/phpunit tests/Unit/TreeTest.php`)
and are not caused by anything in this fork — they were present before any
MyTree-specific change. Treat these two as a known baseline: don't spend time
re-diagnosing them unless investigating `Tree`/`TreeService` specifically,
and treat any *new* failure elsewhere as a real regression.

Also part of the baseline:

* **17 PDF report snapshot failures on Linux** (the NAS containers), all in
  `tests/Unit/Report/ReportRegressionTest.php`
  (`testReportPdfOutputMatchesSnapshot`). Only the zlib-compressed bytes of an
  embedded image (and the byte offsets after it) differ from the snapshots;
  the HTML snapshots of the same 17 reports pass, and the PDF ones pass on
  macOS. Don't regenerate the snapshots for this.
* **2 PHPStan errors** in upstream code, reported on both platforms:
  `app/Http/Controllers/GedcomLoad.php:196` (`$progress` might not be defined)
  and `app/Report/LayoutEngine.php:677` (a strict comparison with null that is
  always false).

Without Docker, default CLI memory (128 MB) is too low for a full run — use
`php -d memory_limit=1G vendor/bin/phpunit --no-coverage`. Always pass
`--no-coverage` when no coverage driver is installed: PHPUnit 12 otherwise
runs **no tests**, because `phpunit.xml.dist` requests coverage reports.

## Git workflow

Run all git commands on the NAS (see "Development workspace").

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

Expect conflicts in files MyTree has customized — currently `README.md`,
`app/Webtrees.php` and `app/Module/AbstractIndividualListModule.php` (see
"MyTree core changes" below). Resolve `README.md` by
keeping MyTree's fork-identity sections and reconciling any upstream edits to
the "Technical architecture" content underneath them. `CHANGELOG.md` and
`BACKLOG.md` should not conflict, since upstream does not touch them.

After a successful sync:

* Run `docker/dev ci` and `docker/dev e2e` to confirm nothing broke. The
  UI-001 tests check that the MyTree header, branding and upgrade lockdown
  still apply to the upstream layouts and middleware.
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
* **The dev instance is fictional-only**: its database lives in the Docker
  volume `mytree-dev_mytree-data`, outside the repository. Never import real
  data into it, and never copy anything from it into the checkout.
* **Keep secrets out of commits**: database passwords and mail credentials
  live only in `data/config.ini.php` (in the volume with Docker), which is
  never tracked.
* **Back up `data/` and the database independently of git** — git history is
  not a backup strategy for live data.

Real data (your actual family tree, for using MyTree day-to-day) belongs only
to a separate production instance — its own Compose project, with its data
under `/tank/private/mytree` on the NAS — never to the dev instance, its
volume, or the repository. It is never staged, committed, or included in a
bug report.

## MyTree custom module source: `custom-modules/`

webtrees only loads modules from `modules_v4/`, which upstream's `.gitignore`
excludes entirely (it assumes that directory holds only third-party
downloads). Rather than modify `.gitignore`, MyTree-specific module source is
tracked in a separate, git-tracked directory, **`custom-modules/`**, and
deployed into `modules_v4/` by bind mount (the Docker dev instance), symlink
(local dev without Docker) or copy (deployment). See
[custom-modules/README.md](custom-modules/README.md) for the exact commands.
`modules_v4/` itself remains untouched and git-ignored, exactly as upstream
intends.

## MyTree core changes

MyTree prefers modules, view wrappers, translations and settings to edits in
`app/`. These are the exceptions, each approved for a specific reason. Keep
the list current; review each one when merging upstream.

### UI-001: webtrees upgrade mechanism disabled

MyTree is updated through Git, Composer and Docker, never by downloading an
upstream release over itself. webtrees checks `dev.webtrees.net` for a new
version on every page view (once a day), in core middleware that runs before
any module loads, so a module cannot prevent it.

| File | Change |
|---|---|
| `app/MyTree/DisabledUpgradeService.php` (new) | Subclass of `UpgradeService`: never reports an upgrade, never contacts the network (its HTTP client refuses every request), refuses to download, unpack, move or delete files |
| `app/MyTree/DisableUpgrades.php` (new) | Middleware after `LoadRoutes`: re-registers `/admin/upgrade`, `/admin/upgrade-action` and `/admin/check-now` behind a refusal, so they return 404 for everyone |
| `app/Webtrees.php` | Binds `UpgradeService` to `DisabledUpgradeService`; removes `CheckForNewVersion` from the middleware stack and adds `DisableUpgrades` after `LoadRoutes` (each marked `MyTree:`) |

`UpgradeService.php`, `WebRoutes.php`, the controllers and upstream's tests
are unchanged. The control panel's version line then reads "No upgrade
information is available", which `mytree-identity` rewords; the "Check for
new version" module is disabled in settings and, being given the disabled
service, could not send anything anyway.

**Merging upstream:** if `app/Webtrees.php` conflicts, keep the `MyTree:`
lines. If upstream adds a new consumer of the upgrade mechanism, adds or
renames upgrade routes, or changes `UpgradeService`'s public methods, update
`app/MyTree/`. `tests/Unit/MyTree/` fails if the binding, the middleware
order or the route lockdown is lost, and `e2e/tests/ui-001-identity.spec.js`
checks the result in the running application.

**Verified 2026-10-20** on the dev instance: with the last-check timestamp
reset to 0 (which upstream treats as "check now"), signing in, browsing and
opening the control panel left it at 0, and the three upgrade URLs returned
404 for a visitor and for the administrator, by GET and POST.

### UI-002: complete individual list includes people without a surname

The Individuals and Families lists open on webtrees' "All" view
(`custom-modules/mytree-lists/`). Upstream that view leaves out people whose
surname is blank (`Mary`) or unknown (`Mary //`, stored as `@N.N.`); a
module can't change the query.

| File | Change |
|---|---|
| `app/Module/AbstractIndividualListModule.php`, `individuals()` (marked `MyTree (UI-002)`) | For the complete list (`$surns_to_show === []`): no longer excludes `''` and `@N.N.`; orders by `n_num` and lists each individual once, under their first name record. Surname (A–Z) views are unchanged. Families use the same query, so families with such a spouse are included too. |

**Merging upstream:** if `individuals()` conflicts, keep upstream's code and
re-apply the marked block: drop the `whereNotIn` for the empty-surname case,
order by `n_num`, and skip an individual already listed.
`tests/Unit/MyTree/CompleteIndividualListTest.php` (using `tests/data/demo.ged`)
fails if blank/unknown surnames go missing, an individual appears twice, or
the surname views change.
