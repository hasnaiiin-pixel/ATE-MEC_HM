#!/usr/bin/env node
// AT-MEC_HM_8.0 - Runtime validation / AI Ready Enterprise Stable
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const version = 'AT-MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE';
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function safeRead(rel){ try{return read(rel);}catch(_e){return '';} }
function exists(rel){ return fs.existsSync(path.join(root, rel)); }
function listBat(){ return fs.readdirSync(root).filter(f=>/\.bat$/i.test(f)); }
function relExistsFromIndex(src){ const clean = src.replace(/^\.\//,''); return exists(path.join('src/renderer', clean)); }
const checks=[]; function add(label, ok, detail){ checks.push({label, ok: !!ok, detail: detail || ''}); }
const index=safeRead('src/renderer/index.html');
const aiPartial=safeRead('src/renderer/partials/ai-copilot-76.html');
const ai76=safeRead('src/renderer/js/modules/ai/ai-copilot-76.js');
const ai77=safeRead('src/renderer/js/modules/ai/ai-provider-approval-77.js');
const ai80=safeRead('src/renderer/js/modules/ai/ai-ready-80.js');
const cfg=safeRead('config/data_provider.json');
let pkg={}, lock={};
try{pkg=JSON.parse(safeRead('package.json')||'{}');}catch(_e){pkg={};}
try{lock=JSON.parse(safeRead('package-lock.json')||'{}');}catch(_e){lock={};}
add('index.html presente', !!index, 'src/renderer/index.html');
add('package 8.0.0', pkg.version === '8.0.0' && /8-0-ai-ready-enterprise-stable/.test(pkg.name||''), `${pkg.name||'?'} ${pkg.version||'?'}`);
add('package-lock 8.0.0', lock.version === '8.0.0' && lock.packages && lock.packages[''] && lock.packages[''].version === '8.0.0', 'package-lock root version');
add('runtime:validate 8.0 registrato', !!(pkg.scripts && pkg.scripts['runtime:validate'] === 'node scripts/runtime_validate_80.js'), 'package.json scripts.runtime:validate');
add('startup:doctor 8.0 registrato', !!(pkg.scripts && pkg.scripts['startup:doctor'] === 'node scripts/startup_doctor_80.js'), 'package.json scripts.startup:doctor');
const scriptSrc=[...index.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/g)].map(m=>m[1]);
const cssHref=[...index.matchAll(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/g)].map(m=>m[1]);
const partials=[...index.matchAll(/data-partial-src=["']([^"']+)["']/g)].map(m=>m[1]);
const missingScripts=scriptSrc.filter(s=>!relExistsFromIndex(s));
const missingCss=cssHref.filter(s=>!relExistsFromIndex(s));
const missingPartials=partials.filter(s=>!relExistsFromIndex(s));
add('nessuno script JS mancante', missingScripts.length===0, missingScripts.join(', '));
add('nessun CSS mancante', missingCss.length===0, missingCss.join(', '));
add('nessun partial HTML mancante', missingPartials.length===0, missingPartials.join(', '));
add('AI Copilot pagina unica mantenuta', /js\/modules\/ai\/ai-copilot-76\.js/.test(index) && /ai-copilot-tab/.test(index), 'non crea seconda pagina AI');
add('AI Provider Approval mantenuto', /js\/modules\/ai\/ai-provider-approval-77\.js/.test(index) && exists('src/renderer/js/modules/ai/ai-provider-approval-77.js'), 'provider/approvazioni');
add('AI Ready 8.0 caricato', /js\/modules\/ai\/ai-ready-80\.js/.test(index) && exists('src/renderer/js/modules/ai/ai-ready-80.js'), 'status center/readiness finale');
add('CSS AI Ready 8.0 caricato', /css\/modules\/36-ai-ready-80\.css/.test(index) && exists('src/renderer/css/modules/36-ai-ready-80.css'), 'stile 8.0');
add('Pannello AI Ready 8.0 presente', /ai80-status-center|runAiReady80|exportAiReadyReport80/.test(aiPartial), 'status center dentro pagina AI esistente');
add('Menu AI Ready 8.0 dedicato presente', /showAiReady80\(\)/.test(index) && /AI Ready 8\.0/.test(index), 'menu principale AI, non Enterprise');
add('Readiness score implementato', /buildReadyReport|ai80-readiness-score|AI_READY_ENTERPRISE_STABLE/.test(ai80), 'score e status finale');
add('Safe mode AI 8.0 read-only', /readOnly:true|noAutomaticActions:true|approvalRequired:true|apiKeyExported:false/.test(ai80), 'nessuna azione automatica');
add('AI report 8.0 esportabile', /exportAiReadyReport80|AT_MEC_HM_8_0_AI_READY_REPORT/.test(ai80), 'export JSON finale');
add('Decisioni approvazione persistenti mantenute', /mergeApprovalState|APPROVED_NO_RUNTIME_CHANGE/.test(ai77), 'approve/reject mantenuti dopo aggiorna coda');
add('Provider non invia automaticamente', /confirm\(msg/.test(ai77) && /manual_approval_required_no_runtime_change/.test(ai77), 'invio solo con conferma operatore');
add('API key non esportata', /sessionStorage\.setItem\(API_KEY_SESSION/.test(ai77) && !/apiKey\s*:/.test(ai77), 'key solo sessione, report con hasApiKey');
add('Legacy WO 6.0 non caricato runtime', !/src=["'][^"']*work-order-product-60\.js["']|href=["'][^"']*15-work-order-product\.css["']|data-partial-src=["'][^"']*work-order-product-60\.html["']/.test(index), 'nessun script/partial/css legacy 6.0');
add('Legacy Firmware 6.1 non caricato runtime', !/src=["'][^"']*revision-firmware-61\.js["']|href=["'][^"']*16-revision-firmware\.css["']|data-partial-src=["'][^"']*revision-firmware-61\.html["']/.test(index), 'nessun script/partial/css legacy 6.1');
add('Menu KPI doppi nascosti', !/Database \/ KPI|Analisi Produzione<\/button>|Analisi Produzione\s*<\/button>/.test(index), 'Analytics Center è accesso principale');
add('AI non duplica moduli business', /Non duplica moduli business/.test(ai77) && /senza ricrearli/.test(ai80), 'AI sopra moduli esistenti');
add('data_provider senza path assoluti Windows', !/[A-Z]:\\|Users\\|Documents\\GITHUB/.test(cfg), 'path relativi');
const bats=listBat();
const avvia=bats.filter(f=>/^AVVIA_/i.test(f) || /^START_SERVER/i.test(f));
const badAvvia=avvia.filter(f=>/npm\s+run\s+build/i.test(safeRead(f)));
add('BAT avvio senza npm run build', badAvvia.length===0, badAvvia.join(', '));
add('BAT 8.0 presenti', exists('INSTALLA_AT_MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE.bat') && exists('AVVIA_AT_MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE.bat') && exists('CREA_INSTALLER_WINDOWS_8.0_AI_READY_ENTERPRISE_STABLE.bat'), 'install/avvia/installer');
add('Documentazione 8.0 presente', exists('docs/ai/AI_READY_ENTERPRISE_8.0.md') && exists('docs/releases/README_AT_MEC_HM_8_0_AI_READY_ENTERPRISE_STABLE.md'), 'docs AI/release');
const score = Math.round(checks.filter(c=>c.ok).length / checks.length * 100);
const report = {version, createdAt: new Date().toISOString(), score, checks, missingScripts, missingCss, missingPartials};
fs.mkdirSync(path.join(root,'docs/quality'), {recursive:true});
fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_8_0_RUNTIME_VALIDATION.json'), JSON.stringify(report,null,2));
const menuAudit = {version,createdAt:report.createdAt,primaryMenu:['AI Copilot Center','AI Ready 8.0','Analisi completa AI','Provider & Approvazioni AI'],hiddenDuplicates:['Nuova pagina AI duplicata','Nuovo Analytics AI','Nuovo Repair AI','Nuovo MES AI'],aiRule:'8.0 consolida la pagina AI esistente: readiness score, report finale, safe mode e approvazioni manuali.',result:checks.every(c=>c.ok)?'OK':'CHECK'};
fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_8_0_MENU_AUDIT.json'), JSON.stringify(menuAudit,null,2));
console.log('AT-MEC_HM_8.0 runtime validation');
for(const c of checks){ console.log(`${c.ok?'OK  ':'FAIL'} ${c.label}${c.detail?' - '+c.detail:''}`); }
console.log(`SCORE ${score}%`);
if(checks.some(c=>!c.ok)) process.exit(1);
