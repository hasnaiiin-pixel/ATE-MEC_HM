/* Test contratto permessi 4.13N: node scripts/tests/test_permissions_contract_413N.js */
const Module = require('module');
const os = require('os');
const fs = require('fs');
const path = require('path');
const origLoad = Module._load;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'atmec-413n-userdata-'));
const legacyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atmec-413n-legacy-'));
process.chdir(legacyRoot);
fs.mkdirSync(path.join(legacyRoot, 'config'), { recursive: true });
fs.writeFileSync(path.join(legacyRoot, 'config', 'users.json'), JSON.stringify({
  roles: {
    Admin: { level: 100, permissions: ['run_test','manage_users','manage_archive'] },
    Developer: { level: 80, permissions: ['run_test','manage_archive','edit_layout'] },
    LegacyData: { level: 60, permissions: ['run_test','manage_archive'] }
  },
  users: [
    { username: 'admin', displayName: 'Admin', role: 'Admin', salt: 'x', passwordHash: 'bad', enabled: true }
  ]
}, null, 2));
Module._load = function(request, parent, isMain) {
  if (request === 'electron') return { app: { getPath: () => tmp } };
  return origLoad.apply(this, arguments);
};
const { UserManager } = require('../../dist/main/core/UserManager.js');
const um = new UserManager();
function assert(name, cond, detail) {
  if (!cond) { console.error('FAIL', name, detail || ''); process.exitCode = 1; }
  else console.log('PASS', name);
}
assert('admin repair login ok', um.login('admin', 'admin').ok === true);
const admin = um.getCurrentUser();
assert('admin has manage_data canonical', admin.permissions.includes('manage_data'), admin.permissions);
assert('admin has view_reports canonical default', admin.permissions.includes('view_reports'), admin.permissions);
assert('manage_archive alias accepted by backend', um.canCurrentUser('manage_archive') === true);
assert('create legacy role normalizes manage_archive to manage_data', um.createRole('LegacyCustom', ['run_test','manage_archive'], 60).ok === true);
const legacyRole = um.listRoles().find(r => r.role === 'LegacyCustom');
assert('legacy custom role stores manage_data', legacyRole.permissions.includes('manage_data') && !legacyRole.permissions.includes('manage_archive'), legacyRole.permissions);
assert('create user with custom data role ok', um.createUser('datauser', 'Data User', 'LegacyCustom', '1234').ok === true);
um.logout();
assert('datauser login ok', um.login('datauser', '1234').ok === true);
assert('datauser can manage_data', um.canCurrentUser('manage_data') === true);
assert('datauser alias manage_archive works', um.canCurrentUser('manage_archive') === true);
assert('datauser cannot manage_users', um.canCurrentUser('manage_users') === false);
