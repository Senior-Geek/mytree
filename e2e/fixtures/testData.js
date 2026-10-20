// Fictional, dev-only credentials for the local MyTree test instance created by
// DEVELOPMENT.md's "Local development installation" procedure. Not a real
// account, not a secret — this only exists against a throwaway SQLite
// database on localhost. Never point these tests at a real installation.
const ADMIN = {
  username: 'admin',
  password: 'FictionalDevPass123',
};

// Fictional accounts with one role each on the dev tree, created by
// setup/global.setup.js for the UI-001 permission tests. `role` is the
// webtrees role value; the comment gives MyTree's name for it.
const MEMBER = { // Viewer: can sign in and view only
  username: 'member',
  password: 'FictionalMemberPass123',
  realName: 'Fictional Member',
  email: 'member@example.test',
  role: 'access',
};

const EDITOR = { // Editor
  username: 'editor',
  password: 'FictionalEditorPass123',
  realName: 'Fictional Editor',
  email: 'editor@example.test',
  role: 'edit',
};

const MODERATOR = { // Moderator: an editor who can also approve changes
  username: 'moderator',
  password: 'FictionalModeratorPass123',
  realName: 'Fictional Moderator',
  email: 'moderator@example.test',
  role: 'accept',
};

const MANAGER = { // Tree Administrator
  username: 'treeadmin',
  password: 'FictionalTreeAdminPass123',
  realName: 'Fictional Tree Administrator',
  email: 'treeadmin@example.test',
  role: 'admin',
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

module.exports = { ADMIN, MEMBER, EDITOR, MODERATOR, MANAGER, TREE, fictionalName };
