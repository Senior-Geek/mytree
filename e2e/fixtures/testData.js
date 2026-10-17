// Fictional, dev-only credentials for the local MyTree test instance created by
// DEVELOPMENT.md's "Local development installation" procedure. Not a real
// account, not a secret — this only exists against a throwaway SQLite
// database on localhost. Never point these tests at a real installation.
const ADMIN = {
  username: 'admin',
  password: 'FictionalDevPass123',
};

const TREE = 'mytree_dev_test';

// Fictional names only — see DEVELOPMENT.md "Protecting live genealogy data".
// Suffixed with a run-unique id so specs can rerun against a non-empty tree
// without colliding with records from a previous run.
function uniqueSuffix() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fictionalName(label) {
  return `${label}${uniqueSuffix()}`;
}

module.exports = { ADMIN, TREE, fictionalName };
