# MyTree end-to-end tests

Playwright regression tests for the core genealogy workflows (create/edit an
individual, create a source and attach a citation, establish a family
relationship, navigate between related records). Intended to be rerun after
implementing WT-001 and WT-002 to confirm neither enhancement broke the
existing editing workflows.

This is a separate, git-tracked Node project — its dependencies
(`@playwright/test`) are **not** added to the application's own
`package.json`/`package-lock.json`, so they never affect the production
build or an upstream sync.

## Prerequisites

1. A local MyTree dev install already set up per [`../DEVELOPMENT.md`](../DEVELOPMENT.md),
   with:
   - SQLite database, fictional data only
   - An admin user `admin` / `FictionalDevPass123` (see `fixtures/testData.js` —
     change both the suite and your local install together if you use
     different credentials)
   - A tree named `mytree_dev_test` (created automatically by the test
     suite's setup step if it doesn't already exist)
2. Node.js (for running Playwright itself — same version as the main repo).

## Setup (one-time)

```bash
cd e2e
npm install
npx playwright install chromium
```

## Running

```bash
cd e2e
npm test            # headless
npm run test:headed # watch it run in a real browser window
npm run report       # open the HTML report from the last run
```

The config's `webServer` block starts `php -S localhost:8080` from the repo
root automatically if nothing is already listening there (`reuseExistingServer: true`,
so it won't conflict with a server you started yourself). Override the URL with
`MYTREE_BASE_URL` if your dev server runs elsewhere.

## What these tests do and don't cover

- They exercise the **existing** webtrees editing workflows that WT-001 and
  WT-002 will build on: creating an individual, creating a source, attaching
  a citation via the existing-source picker, adding a spouse, and navigating
  individual → family → spouse → source → back.
- They do **not** yet test WT-001 ("create person from source") or WT-002
  ("attach existing source with duplicate detection") themselves — those
  aren't implemented. Add new spec files here once they are.
- Every test uses fictional, randomly-suffixed names (`fixtures/testData.js`)
  so the suite is safe to rerun repeatedly against the same dev database
  without colliding with previous runs or with real data.

## Keeping this out of Git

`.gitignore` in this directory excludes `node_modules/`, Playwright's
`test-results/`/`playwright-report/`/`blob-report/` output, the saved login
session (`.auth/`), and any screenshots/videos — none of that belongs in
version control, and test runs can incidentally capture real-looking data in
screenshots if you ever point this at a non-fictional tree (don't).
