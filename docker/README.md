# MyTree development environment

Everything needed to build, test and run MyTree, in containers - nothing is
installed on the host. Used on the NAS (`/tank/data/Dev/MyTree`), and works on
any Docker host with Compose v2. Compose project: `mytree-dev`.

| Service | Image | Role |
|---|---|---|
| `mytree` | `mytree-dev` (Apache + PHP 8.3) | Serves the **current checkout** (including uncommitted work) on port 8081 |
| `tools` | `mytree-dev-tools` (PHP 8.3 CLI, Composer 2, Node 22/npm) | `composer`, `php`, `npm`, the CI checks; runs as uid 1000 so files stay the checkout owner's |
| `e2e` | `mcr.microsoft.com/playwright` (same version as `e2e/package-lock.json`) | The Playwright suites, sharing the web container's network |

| | |
|---|---|
| Code | this checkout, bind-mounted (`/var/www/html` in `mytree`, `/work` in `tools`/`e2e`) |
| Data | the named volume `mytree-dev_mytree-data` (database, `config.ini.php`, cache, media). **Not** the checkout's `data/`, and not any other installation's database. Fictional data only |
| Custom modules | each module in `custom-modules/` mounted into a container-only `modules_v4/` |
| URL | `http://<host>:8081` (change with `MYTREE_PORT`) |

## Usage

`docker/dev` wraps `docker compose` (run it from anywhere in the checkout):

```bash
docker/dev up                 # build and start the web container
docker/dev composer install   # PHP dependencies       (tools container)
docker/dev npm ci             # JS dependencies
docker/dev npm run build      # compile CSS/JS into public/
docker/dev ci                 # phpcs, phpunit, phpstan
docker/dev e2e-install        # e2e/ dependencies (first time, or after a lockfile change)
docker/dev e2e                # Playwright regression suite
docker/dev e2e investigate    # Playwright investigation suite
docker/dev logs -f            # Apache/PHP logs
docker/dev down               # stop (data volume kept)
```

`docker/dev ci` runs the same three checks as `composer ci`, except that
phpcs never auto-fixes files (`composer ci` falls back to `phpcbf`), and
phpunit runs with `--no-coverage`: no coverage driver is installed, and
PHPUnit 12 runs **no tests** when `phpunit.xml.dist`'s coverage reports
are requested without one.

The Playwright suites default to `http://localhost:8080`. Inside the `e2e`
container that is the web container itself (Apache also listens on 8080 there,
unpublished), so `playwright.config.js` needs no change.

Options (environment variables or a `docker/.env` file):

* `MYTREE_PORT`: host port (default `8081`).
* `MYTREE_PHP_VERSION`: PHP version for both images (default `8.3`;
  supported range 8.3-8.6). Rebuild with `docker/dev up` after changing it.
* `MYTREE_PLAYWRIGHT_VERSION`: must match `@playwright/test` in `e2e/package-lock.json`.
* `MYTREE_UID` / `MYTREE_GID`: owner of the checkout (default 1000).

The tools image uses PHP's development `php.ini`; the web image sets
`short_open_tag = Off` in `php-mytree.ini`. Both need it: the official images
have no `php.ini`, PHP's built-in default is On, and the XML templates start
with `<?xml`.

## First run

Visiting the URL starts the webtrees setup wizard. Choose **SQLite**, with a
database name of letters, digits and underscores only (e.g. `mytree`). The
file is created inside the data volume.

This environment is for **fictional data only**. Use the fictional admin from
`e2e/fixtures/testData.js`, create the tree `mytree_dev_test`, enable
auto-accept for the admin (see `DEVELOPMENT.md`, step 7), then run the
Playwright suites against it:
```bash
docker/dev e2e
```

Real genealogy never goes into this environment, its volume or the
repository. A production instance will be a separate Compose project with its
data under `/tank/private/mytree` on the NAS.

## Adding another custom module

Add one line per module under `volumes:` in `docker-compose.yml`:

```yaml
- ../custom-modules/<module-name>:/var/www/html/modules_v4/<module-name>:ro
```

then `docker/dev up`. New modules are enabled automatically.

## Notes

* Apache denies web access to `data/`, `.git`, `node_modules`, `e2e`,
  `tests` and `docker` (see `apache-mytree.conf`), because the checkout's
  `.htaccess` files aren't read.
* Pretty URLs are off by default (webtrees' own setting). `mod_rewrite` is
  enabled in case you turn them on later.
* Backing up the container's data:
  `docker run --rm -v mytree-dev_mytree-data:/data -v "$HOME/Backups":/backup alpine tar czf /backup/mytree-data.tgz -C /data .`
  This writes to `~/Backups`, outside the repository. Keep it that way if the volume holds real data.
