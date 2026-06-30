#!/usr/bin/env node
// AT-MEC_HM_7.5.3 - Runtime validation / Clean Baseline guard
// Controllo statico sicuro: non modifica file, verifica che la base pulita non carichi doppioni runtime.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const version = 'AT-MEC_HM_7.5.3_CLEAN_BASELINE_STARTUP_SAFE';
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel){ return fs.existsSync(path.join(root, rel)); }
function listBat(){ return fs.readdirSync(root).filter(f=>/\.bat$/i.test(f)); }
function relExistsFromIndex(src){
  const clean = src.replace(/^\.\//,'');
  return exists(path.join('src/renderer', clean));
}
const checks=[];
function add(label, ok, detail){ checks.push({label, ok: !!ok, detail: detail || ''}); }
let index='', pkg={}, lock={}, readme='', cfg='';
try{ index=read('src/renderer/index.html'); }catch(e){ index=''; }
try{ pkg=JSON.parse(read('package.json')); }catch(e){ pkg={}; }
try{ lock=JSON.parse(read('package-lock.json')); }catch(e){ lock={}; }
try{ readme=read('README.md'); }catch(e){ readme=''; }
try{ cfg=read('config/data_provider.json'); }catch(e){ cfg=''; }
add('index.html presente', !!index, 'src/renderer/index.html');
add('package 7.5.3', pkg.version === '7.5.3' && /7-5-3-clean-baseline-startup-safe/.test(pkg.name||''), `${pkg.name||'?'} ${pkg.version||'?'}`);
add('package-lock 7.5.3', lock.version === '7.5.3' && lock.packages && lock.packages[''] && lock.packages[''].version === '7.5.3', 'package-lock root version');
add('runtime:validate registrato', !!(pkg.scripts && pkg.scripts['runtime:validate'] === 'node scripts/runtime_validate_753.js'), 'package.json scripts.runtime:validate');
const scriptSrc=[...index.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/g)].map(m=>m[1]);
const cssHref=[...index.matchAll(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/g)].map(m=>m[1]);
const partials=[...index.matchAll(/data-partial-src=["']([^"']+)["']/g)].map(m=>m[1]);
const missingScripts=scriptSrc.filter(s=>!relExistsFromIndex(s));
const missingCss=cssHref.filter(s=>!relExistsFromIndex(s));
const missingPartials=partials.filter(s=>!relExistsFromIndex(s));
add('nessuno script JS mancante', missingScripts.length===0, missingScripts.join(', '));
add('nessun CSS mancante', missingCss.length===0, missingCss.join(', '));
add('nessun partial HTML mancante', missingPartials.length===0, missingPartials.join(', '));
add('Clean Baseline 7.5 caricato', /enterprise-clean-baseline-75\.js/.test(index), 'adapter canonico presente');
add('Data Contract 7.4 caricato', /enterprise-data-contract-74\.js/.test(index), 'data contract presente');
add('Backbone 7.3 caricato', /enterprise-backbone-73\.js/.test(index), 'backbone presente');
add('Legacy WO 6.0 non caricato runtime', !/src=["'][^"']*work-order-product-60\.js["']|href=["'][^"']*15-work-order-product\.css["']|data-partial-src=["'][^"']*work-order-product-60\.html["']/.test(index), 'nessun script/partial/css legacy 6.0');
add('Legacy Firmware 6.1 non caricato runtime', !/src=["'][^"']*revision-firmware-61\.js["']|href=["'][^"']*16-revision-firmware\.css["']|data-partial-src=["'][^"']*revision-firmware-61\.html["']/.test(index), 'nessun script/partial/css legacy 6.1');
add('Archivio decommission presente', exists('docs/deprecated/runtime_7_5_removed_from_app/work-order-product-60.js') && exists('docs/deprecated/runtime_7_5_removed_from_app/revision-firmware-61.js'), 'docs/deprecated/runtime_7_5_removed_from_app');
add('Menu KPI doppi nascosti', !/Database \/ KPI|Analisi Produzione<\/button>|Analisi Produzione\s*<\/button>/.test(index), 'Analytics Center è accesso principale');
add('Menu Enterprise Clean Baseline 7.5.3', /Enterprise Clean Baseline 7\.5\.3/.test(index) || /Enterprise Clean Baseline 7\.5\.3/.test(read('src/renderer/partials/enterprise-stable-422.html')), 'voce menu/pannello aggiornata');
add('Runtime validation UI presente', /runEnterpriseRuntimeValidation753|enterprise753-runtime-list/.test(read('src/renderer/partials/enterprise-stable-422.html')) && /runEnterpriseRuntimeValidation753/.test(read('src/renderer/js/modules/core/enterprise-clean-baseline-75.js')), 'pannello validazione nel Clean Baseline');
add('data_provider senza path assoluti Windows', !/[A-Z]:\\|Users\\|Documents\\GITHUB/.test(cfg), 'path relativi');
const bats=listBat();
const avvia=bats.filter(f=>/^AVVIA_/i.test(f) || /^START_SERVER/i.test(f));
const badAvvia=avvia.filter(f=>/npm\s+run\s+build/i.test(read(f)));
add('BAT avvio senza npm run build', badAvvia.length===0, badAvvia.join(', '));
add('IotServer startup-safe', /server\.on\('error'/.test(read('dist/main/core/IotServer.js')), 'porta 8080 occupata non deve chiudere app');
add('Startup doctor 7.5.3 presente', exists('scripts/startup_doctor_753.js') && pkg.scripts && pkg.scripts['startup:doctor'] === 'node scripts/startup_doctor_753.js', 'npm run startup:doctor');
add('BAT 7.5.3 presenti', exists('INSTALLA_AT_MEC_HM_7.5.3_CLEAN_BASELINE_STARTUP_SAFE.bat') && exists('AVVIA_AT_MEC_HM_7.5.3_CLEAN_BASELINE_STARTUP_SAFE.bat') && exists('CREA_INSTALLER_WINDOWS_7.5.3_CLEAN_BASELINE_STARTUP_SAFE.bat'), 'install/avvia/installer');
add('Documentazione deprecati 7.5.3 presente', exists('docs/deprecated/DEPRECATED_MODULES_7.5.3.md'), 'docs/deprecated/DEPRECATED_MODULES_7.5.3.md');
add('Regression checklist 7.5.3 presente', exists('docs/releases/REGRESSION_CHECKLIST_7.5.3.md'), 'docs/releases/REGRESSION_CHECKLIST_7.5.3.md');
const score = Math.round(checks.filter(c=>c.ok).length / checks.length * 100);
const report = {version, createdAt: new Date().toISOString(), score, checks, missingScripts, missingCss, missingPartials};
fs.mkdirSync(path.join(root,'docs/quality'), {recursive:true});
fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_7_5_3_RUNTIME_VALIDATION.json'), JSON.stringify(report,null,2));
const menuAudit = {
  version,
  createdAt: report.createdAt,
  primaryMenu: ['Test Mode','Ricette & Step','Traceability / Storico','Repair Center','Analytics Center','Hardware & Strumenti','Enterprise Clean Baseline 7.5.3','Impostazioni'],
  hiddenDuplicates: ['Database / KPI','Analisi Produzione','Product Master legacy 6.0','Firmware/Revisions legacy 6.1'],
  result: checks.find(c=>c.label==='Menu KPI doppi nascosti').ok ? 'OK' : 'CHECK'
};
fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_7_5_3_MENU_AUDIT.json'), JSON.stringify(menuAudit,null,2));
console.log('AT-MEC_HM_7.5.3 runtime validation');
for(const c of checks){ console.log(`${c.ok?'OK  ':'FAIL'} ${c.label}${c.detail?' - '+c.detail:''}`); }
console.log(`SCORE ${score}%`);
if(checks.some(c=>!c.ok)) process.exit(1);
