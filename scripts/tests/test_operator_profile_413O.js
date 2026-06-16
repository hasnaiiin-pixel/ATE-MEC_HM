const Module = require('module');
const fs = require('fs');
const os = require('os');
const path = require('path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'atmec-413o-'));
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'electron') return { app: { getPath: () => tmp } };
  return originalLoad.apply(this, arguments);
};
const { UserManager } = require('../../dist/main/core/UserManager.js');
const um = new UserManager();
function assert(name, condition) { console.log((condition ? 'PASS' : 'FAIL') + ' - ' + name); if (!condition) process.exitCode = 1; }
assert('prima del login nessun permesso', um.canCurrentUser('run_test') === false);
assert('login admin/admin', um.login('admin','admin').ok === true);
assert('admin può gestire utenti', um.canCurrentUser('manage_users') === true);
assert('crea ruolo Collaudo', um.createRole('Collaudo', ['run_test','view_reports','view_kpi'], 30).ok === true);
assert('crea utente con codice e foto', um.createUser('op_test','Operatore Test','Collaudo','1234','OP-TEST','data:image/png;base64,AA==').ok === true);
const v = um.verifyCredentials('op_test','1234');
assert('credenziali nuovo utente valide', v.ok === true);
assert('codice operatore salvato', v.operatorCode === 'OP-TEST');
assert('foto profilo salvata', String(v.photoDataUrl || '').startsWith('data:image/'));
assert('verify credentials non cambia sessione admin', um.getCurrentUser().username === 'admin');
assert('update utente con password vuota mantiene credenziali', um.createUser('op_test','Operatore Test 2','Collaudo','','OP-002','').ok === true && um.verifyCredentials('op_test','1234').ok === true);
assert('codice aggiornato', um.verifyCredentials('op_test','1234').operatorCode === 'OP-002');
assert('ruolo aggiornato applica permessi live a getCurrentUser', um.createRole('Admin', ['run_test','view_reports','manage_users','view_kpi','manage_data'], 100).ok === true && um.getCurrentUser().permissions.includes('view_kpi'));
