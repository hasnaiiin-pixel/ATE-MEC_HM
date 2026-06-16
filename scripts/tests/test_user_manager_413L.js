/* Test locale rapido RBAC 4.13L: node scripts/tests/test_user_manager_413L.js */
const Module = require('module');
const os = require('os');
const fs = require('fs');
const path = require('path');
const origLoad = Module._load;
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'atmec-413l-userdata-'));
Module._load = function(request, parent, isMain) {
  if (request === 'electron') return { app: { getPath: () => userData } };
  return origLoad.apply(this, arguments);
};
const { UserManager } = require('../../dist/main/core/UserManager.js');
const um = new UserManager();
function assert(name, cond, detail) {
  if (!cond) { console.error('FAIL', name, detail || ''); process.exitCode = 1; }
  else console.log('PASS', name);
}
assert('deny run_test before login', um.canCurrentUser('run_test') === false);
assert('deny createRole before login', um.createRole('X', ['run_test'], 10).ok === false);
assert('admin login ok', um.login('admin', 'admin').ok === true);
assert('create role ok', um.createRole('SoloTest', ['run_test'], 10).ok === true);
assert('create user ok', um.createUser('optest', 'Operatore Test', 'SoloTest', '1234').ok === true);
assert('blank password update keeps password', um.createUser('optest', 'Operatore Test 2', 'Operator', '').ok === true);
const currentBefore = um.getCurrentUser().username;
assert('verify credentials ok', um.verifyCredentials('optest', '1234').ok === true);
assert('verify does not mutate current user', um.getCurrentUser().username === currentBefore);
um.logout();
assert('logout clears session', um.getCurrentUser().ok === false);
assert('list users denied after logout', um.listUsers().ok === false);
assert('operator login ok', um.login('optest', '1234').ok === true);
assert('operator cannot create admin', um.createUser('evil', 'Evil', 'Admin', '1234').ok === false);
