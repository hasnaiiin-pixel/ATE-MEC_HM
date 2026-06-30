#!/usr/bin/env node
// AT-MEC_HM_7.6 - Startup Doctor
// Controllo leggero prima dell'avvio: non esegue build e non modifica dati produzione.
const fs = require('fs');
const path = require('path');
const net = require('net');
const root = path.resolve(__dirname, '..');
const checks = [];
function exists(p){ return fs.existsSync(path.join(root,p)); }
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
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
(async()=>{
  console.log('AT-MEC_HM_7.6.2 startup doctor');
  check('package.json presente', exists('package.json'));
  check('dist/main/main.js presente', exists('dist/main/main.js'));
  check('src/renderer/index.html presente', exists('src/renderer/index.html'));
  check('AI Copilot 7.6.2 script presente', exists('src/renderer/js/modules/ai/ai-copilot-76.js'));
  check('AI Copilot 7.6.2 CSS presente', exists('src/renderer/css/modules/34-ai-copilot-76.css'));
  check('node_modules presente', exists('node_modules'), 'se manca, eseguire INSTALLA prima o lasciare che AVVIA installi');
  check('Electron binario presente', electronBinaryExists(), 'se manca, eseguire npm install senza --ignore-scripts');
  const busy8080 = await isPortBusy(8080);
  check('Porta 8080 libera oppure gestita', true, busy8080 ? 'porta occupata: fallback/continua senza chiudere HMI' : 'porta libera');
  let iotSafe=false;
  try { iotSafe=/server\.on\('error'/.test(read('dist/main/core/IotServer.js')); } catch(_e) {}
  check('IotServer startup-safe', iotSafe, 'EADDRINUSE non deve chiudere app');
  const criticalMissing = !exists('package.json') || !exists('dist/main/main.js') || !exists('src/renderer/index.html') || !exists('src/renderer/js/modules/ai/ai-copilot-76.js');
  const electronMissing = !electronBinaryExists();
  const report = { version:'AT-MEC_HM_7.6.2_FIX1_AI_COPILOT_UI_ACTIONS', createdAt:new Date().toISOString(), checks, criticalMissing, electronMissing };
  try { fs.mkdirSync(path.join(root,'docs/quality'), {recursive:true}); fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_7_6_2_STARTUP_DOCTOR.json'), JSON.stringify(report,null,2)); } catch(_e) {}
  if (criticalMissing) process.exit(2);
  if (electronMissing) process.exit(3);
  process.exit(0);
})();
