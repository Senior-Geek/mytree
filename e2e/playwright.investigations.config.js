// Config for exploratory investigation specs (e.g. Milestone 3A, WT-001/WT-002).
// These specs document *current* webtrees behaviour - including limitations -
// and are deliberately kept out of the default regression run (`npm test`),
// whose testDir is ./tests. Run with: npm run investigate
const base = require('./playwright.config');

module.exports = {
  ...base,
  projects: base.projects.map((project) => (
    project.name === 'chromium' ? { ...project, testDir: './investigations' } : project
  )),
};
