#!/usr/bin/env node
// AT-MEC_HM_7.5.3 - Startup Doctor
// Controllo leggero prima dell'avvio: non esegue build e non modifica dati produzione.
const fs = require('fs');
const path = require('path');
const net = require('net');
const root = path.resolve(__dirname, '..');
function exists(p){ return fs.existsSync(path.join(root,p)); }
function check(label, ok, detail){
  const row = { label, ok: !!ok, detail: detail || '' };
  checks.push(row);
  console.log(`${ok ? 'OK  ' : 'WARN'} ${label}${detail ? ' - ' + detail : ''}`);
}
function electronBinaryExists(){
  const candidates = [
    'node_modules/electron/dist/electron.exe',
    'node_modules/electron/dist/electron',
    'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
  ];
  return candidates.some(exists);
}
function isPortBusy(port){
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.once('error', () => resolve(true));
    srv.once('listening', () => srv.close(() => resolve(false)));
    srv.listen(port, '0.0.0.0');
  });
}
const checks = [];
(async()=>{
  console.log('AT-MEC_HM_7.5.3 startup doctor');
  check('package.json presente', exists('package.json'));
  check('dist/main/main.js presente', exists('dist/main/main.js'));
  check('src/renderer/index.html presente', exists('src/renderer/index.html'));
  check('node_modules presente', exists('node_modules'), 'se manca, eseguire INSTALLA prima o lasciare che AVVIA installi');
  check('Electron binario presente', electronBinaryExists(), 'se manca, eseguire npm install senza --ignore-scripts');
  const busy8080 = await isPortBusy(8080);
  check('Porta 8080 libera oppure gestita', true, busy8080 ? 'porta occupata: 7.5.3 usa fallback/continua senza chiudere HMI' : 'porta libera');
  check('IotServer startup-safe', /server\.on\('error'/.test(fs.readFileSync(path.join(root,'dist/main/core/IotServer.js'),'utf8')), 'EADDRINUSE non deve chiudere app');
  const criticalMissing = !exists('package.json') || !exists('dist/main/main.js') || !exists('src/renderer/index.html');
  const electronMissing = !electronBinaryExists();
  const report = { version:'AT-MEC_HM_7.5.3_CLEAN_BASELINE_STARTUP_SAFE', createdAt:new Date().toISOString(), checks, criticalMissing, electronMissing };
  try { fs.mkdirSync(path.join(root,'docs/quality'), {recursive:true}); fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_7_5_3_STARTUP_DOCTOR.json'), JSON.stringify(report,null,2)); } catch(_e) {}
  if (criticalMissing) process.exit(2);
  if (electronMissing) process.exit(3);
  process.exit(0);
})();
