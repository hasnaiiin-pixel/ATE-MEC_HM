#!/usr/bin/env node
// AT-MEC_HM_7.6 - Runtime validation / AI Copilot Clean guard
// Controllo statico sicuro: non modifica dati produzione, verifica base pulita + AI senza doppioni.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const version = 'AT-MEC_HM_7.6.2_FIX1_AI_COPILOT_UI_ACTIONS';
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function safeRead(rel){ try{return read(rel);}catch(_e){return '';} }
function exists(rel){ return fs.existsSync(path.join(root, rel)); }
function listBat(){ return fs.readdirSync(root).filter(f=>/\.bat$/i.test(f)); }
function relExistsFromIndex(src){ const clean = src.replace(/^\.\//,''); return exists(path.join('src/renderer', clean)); }
const checks=[];
function add(label, ok, detail){ checks.push({label, ok: !!ok, detail: detail || ''}); }
const index=safeRead('src/renderer/index.html');
let pkg={}, lock={};
try{pkg=JSON.parse(safeRead('package.json')||'{}');}catch(_e){pkg={};}
try{lock=JSON.parse(safeRead('package-lock.json')||'{}');}catch(_e){lock={};}
const partial=safeRead('src/renderer/partials/enterprise-stable-422.html');
const aiPartial=safeRead('src/renderer/partials/ai-copilot-76.html');
const cfg=safeRead('config/data_provider.json');
add('index.html presente', !!index, 'src/renderer/index.html');
add('package 7.6.2 FIX1', pkg.version === '7.6.2-fix1' && /7-6-2-fix1-ai-copilot-ui-actions/.test(pkg.name||''), `${pkg.name||'?'} ${pkg.version||'?'}`);
add('package-lock 7.6.2 FIX1', lock.version === '7.6.2-fix1' && lock.packages && lock.packages[''] && lock.packages[''].version === '7.6.2-fix1', 'package-lock root version');
add('runtime:validate 7.6.2 registrato', !!(pkg.scripts && pkg.scripts['runtime:validate'] === 'node scripts/runtime_validate_76.js'), 'package.json scripts.runtime:validate');
add('startup:doctor 7.6.2 registrato', !!(pkg.scripts && pkg.scripts['startup:doctor'] === 'node scripts/startup_doctor_76.js'), 'package.json scripts.startup:doctor');
const scriptSrc=[...index.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/g)].map(m=>m[1]);
const cssHref=[...index.matchAll(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/g)].map(m=>m[1]);
const partials=[...index.matchAll(/data-partial-src=["']([^"']+)["']/g)].map(m=>m[1]);
const missingScripts=scriptSrc.filter(s=>!relExistsFromIndex(s));
const missingCss=cssHref.filter(s=>!relExistsFromIndex(s));
const missingPartials=partials.filter(s=>!relExistsFromIndex(s));
add('nessuno script JS mancante', missingScripts.length===0, missingScripts.join(', '));
add('nessun CSS mancante', missingCss.length===0, missingCss.join(', '));
add('nessun partial HTML mancante', missingPartials.length===0, missingPartials.join(', '));
add('Clean Baseline 7.5 mantenuto', /enterprise-clean-baseline-75\.js/.test(index), 'adapter canonico resta uno');
add('Data Contract 7.4 mantenuto', /enterprise-data-contract-74\.js/.test(index), 'data contract esistente');
add('Backbone 7.3 mantenuto', /enterprise-backbone-73\.js/.test(index), 'backbone esistente');
add('AI Copilot 7.6.2 caricato', /js\/modules\/ai\/ai-copilot-76\.js/.test(index), 'script AI nuovo, non duplica moduli');
add('CSS AI Copilot 7.6.2 caricato', /css\/modules\/34-ai-copilot-76\.css/.test(index), 'stile AI nuovo');
add('AI Copilot in partial dedicato', /ai-copilot-tab|enterprise76-ai-card|runAiLocalAnalysis76|ai76-workbench-card/.test(aiPartial), 'pagina dedicata AI senza duplicare moduli business');
add('AI Complete 7.6.2 presente', /runAiCompleteAnalysis762|ai762-readiness-matrix|ai762-duplication-guard|ai762-quality-summary|exportAiCompleteReport762/.test(aiPartial + safeRead('src/renderer/js/modules/ai/ai-copilot-76.js')), 'analisi completa, matrice, anti-doppioni, report');
add('AI non resta dentro Enterprise Clean Baseline', !/id=\"enterprise76-ai-card\"/.test(partial), 'Enterprise resta solo Clean Baseline / Backbone');
add('Menu AI dedicato presente', /<summary>🤖 AI Copilot/.test(index) && /showAiCopilot76\(\)/.test(index) && /data-partial-mount=\"ai-copilot-tab\"/.test(index), 'voce principale AI Copilot Center');
add('Legacy WO 6.0 non caricato runtime', !/src=["'][^"']*work-order-product-60\.js["']|href=["'][^"']*15-work-order-product\.css["']|data-partial-src=["'][^"']*work-order-product-60\.html["']/.test(index), 'nessun script/partial/css legacy 6.0');
add('Legacy Firmware 6.1 non caricato runtime', !/src=["'][^"']*revision-firmware-61\.js["']|href=["'][^"']*16-revision-firmware\.css["']|data-partial-src=["'][^"']*revision-firmware-61\.html["']/.test(index), 'nessun script/partial/css legacy 6.1');
add('Menu KPI doppi nascosti', !/Database \/ KPI|Analisi Produzione<\/button>|Analisi Produzione\s*<\/button>/.test(index), 'Analytics Center è accesso principale');
add('Provider AI default sicuro', /provider:'local_rules'/.test(safeRead('src/renderer/js/modules/ai/ai-copilot-76.js')) && /readOnly:true/.test(safeRead('src/renderer/js/modules/ai/ai-copilot-76.js')), 'local-first/read-only default');
add('AI non duplica Traceability Repair Analytics MES Factory', /Non duplicare Traceability, Repair, Analytics, MES, Factory o Work Orders/.test(safeRead('src/renderer/js/modules/ai/ai-copilot-76.js')), 'regole anti-doppioni nel prompt');
add('data_provider senza path assoluti Windows', !/[A-Z]:\\|Users\\|Documents\\GITHUB/.test(cfg), 'path relativi');
const bats=listBat();
const avvia=bats.filter(f=>/^AVVIA_/i.test(f) || /^START_SERVER/i.test(f));
const badAvvia=avvia.filter(f=>/npm\s+run\s+build/i.test(safeRead(f)));
add('BAT avvio senza npm run build', badAvvia.length===0, badAvvia.join(', '));
add('IotServer startup-safe', /server\.on\('error'/.test(safeRead('dist/main/core/IotServer.js')), 'porta 8080 occupata non deve chiudere app');
add('BAT 7.6.2 FIX1 presenti', exists('INSTALLA_AT_MEC_HM_7.6.2_FIX1_AI_COPILOT_UI_ACTIONS.bat') && exists('AVVIA_AT_MEC_HM_7.6.2_FIX1_AI_COPILOT_UI_ACTIONS.bat') && exists('CREA_INSTALLER_WINDOWS_7.6.2_FIX1_AI_COPILOT_UI_ACTIONS.bat'), 'install/avvia/installer');
add('Documentazione AI 7.6.2 presente', exists('docs/ai/AI_COPILOT_COMPLETE_7.6.2.md') && exists('docs/releases/README_AT_MEC_HM_7_6_2_FIX1_AI_COPILOT_UI_ACTIONS.md'), 'docs AI/release');
const score = Math.round(checks.filter(c=>c.ok).length / checks.length * 100);
const report = {version, createdAt: new Date().toISOString(), score, checks, missingScripts, missingCss, missingPartials};
fs.mkdirSync(path.join(root,'docs/quality'), {recursive:true});
fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_7_6_2_FIX1_RUNTIME_VALIDATION.json'), JSON.stringify(report,null,2));
const menuAudit = {
  version,
  createdAt: report.createdAt,
  primaryMenu: ['Test Mode','Ricette & Step','Traceability / Storico','Repair Center','Analytics Center','AI Copilot Center','Work Orders / MES Ready','Hardware & Strumenti','Enterprise Clean Baseline','Impostazioni'],
  hiddenDuplicates: ['Database / KPI','Analisi Produzione','Product Master legacy 6.0','Firmware/Revisions legacy 6.1'],
  aiRule: 'AI Copilot ha menu dedicato ma legge moduli esistenti; non duplica Traceability/Repair/Analytics/MES/Factory/WO.',
  result: checks.every(c=>c.ok) ? 'OK' : 'CHECK'
};
fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_7_6_2_FIX1_MENU_AUDIT.json'), JSON.stringify(menuAudit,null,2));
console.log('AT-MEC_HM_7.6.2 runtime validation');
for(const c of checks){ console.log(`${c.ok?'OK  ':'FAIL'} ${c.label}${c.detail?' - '+c.detail:''}`); }
console.log(`SCORE ${score}%`);
if(checks.some(c=>!c.ok)) process.exit(1);
