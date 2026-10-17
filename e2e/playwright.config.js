const { defineConfig, devices } = require('@playwright/test');

// Override with MYTREE_BASE_URL if the dev server runs on a different port.
const BASE_URL = process.env.MYTREE_BASE_URL || 'http://localhost:8080';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1, // the PHP built-in dev server and SQLite are not built for concurrent writers
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Starts `php -S localhost:8080` from the repo root if nothing is already
  // listening there. Requires the app to already be installed (see
  // DEVELOPMENT.md) — this does not run the setup wizard.
  webServer: {
    command: 'php -S localhost:8080',
    cwd: '..',
    port: 8080, // a TCP check, not an HTTP GET - webtrees' content negotiation can 406 a plain health-check request
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'setup',
      testDir: './setup',
      testMatch: /global\.setup\.js/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: '.auth/admin.json' },
      dependencies: ['setup'],
    },
  ],
});
