#!/usr/bin/env node
// AT-MEC_HM_7.7 - Runtime validation / AI Provider & Approval Safe
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const version = 'AT-MEC_HM_7.7.1_AI_APPROVAL_PERSISTENCE_UX';
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
const cfg=safeRead('config/data_provider.json');
let pkg={}, lock={};
try{pkg=JSON.parse(safeRead('package.json')||'{}');}catch(_e){pkg={};}
try{lock=JSON.parse(safeRead('package-lock.json')||'{}');}catch(_e){lock={};}
add('index.html presente', !!index, 'src/renderer/index.html');
add('package 7.7.1', pkg.version === '7.7.1' && /7-7-1-ai-approval-persistence-ux/.test(pkg.name||''), `${pkg.name||'?'} ${pkg.version||'?'}`);
add('package-lock 7.7.1', lock.version === '7.7.1' && lock.packages && lock.packages[''] && lock.packages[''].version === '7.7.1', 'package-lock root version');
add('runtime:validate 7.7.1 registrato', !!(pkg.scripts && pkg.scripts['runtime:validate'] === 'node scripts/runtime_validate_77.js'), 'package.json scripts.runtime:validate');
add('startup:doctor 7.7.1 registrato', !!(pkg.scripts && pkg.scripts['startup:doctor'] === 'node scripts/startup_doctor_77.js'), 'package.json scripts.startup:doctor');
const scriptSrc=[...index.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/g)].map(m=>m[1]);
const cssHref=[...index.matchAll(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/g)].map(m=>m[1]);
const partials=[...index.matchAll(/data-partial-src=["']([^"']+)["']/g)].map(m=>m[1]);
const missingScripts=scriptSrc.filter(s=>!relExistsFromIndex(s));
const missingCss=cssHref.filter(s=>!relExistsFromIndex(s));
const missingPartials=partials.filter(s=>!relExistsFromIndex(s));
add('nessuno script JS mancante', missingScripts.length===0, missingScripts.join(', '));
add('nessun CSS mancante', missingCss.length===0, missingCss.join(', '));
add('nessun partial HTML mancante', missingPartials.length===0, missingPartials.join(', '));
add('AI Copilot 7.6 mantenuto come pagina unica', /js\/modules\/ai\/ai-copilot-76\.js/.test(index) && /ai-copilot-tab/.test(index), 'non crea seconda pagina AI');
add('AI Provider Approval 7.7.1 caricato', /js\/modules\/ai\/ai-provider-approval-77\.js/.test(index) && exists('src/renderer/js/modules/ai/ai-provider-approval-77.js'), 'estensione provider/approvazioni');
add('CSS AI Provider Approval 7.7.1 caricato', /css\/modules\/35-ai-provider-approval-77\.css/.test(index) && exists('src/renderer/css/modules/35-ai-provider-approval-77.css'), 'stile 7.7.1');
add('Provider UI 7.7.1 presente', /ai77-provider-api-key|testAiProvider77|generateAiProviderAnswer77/.test(aiPartial), 'api key sessione, test provider, risposta AI');
add('Approval queue 7.7.1 presente', /ai77-approval-queue|buildAiApprovalQueue77|exportAiApprovals77/.test(aiPartial), 'coda approvazioni manuale');
add('Decisioni approvazione persistenti', /mergeApprovalState|approvalSignature|APPROVED_NO_RUNTIME_CHANGE/.test(ai77), 'approve/reject mantenuti dopo aggiorna coda');
add('Pulsanti AI selezionabili', /data-ai-main=|data-ai-action=/.test(aiPartial) && /ai76-action-selected|setActiveAiSection771/.test(ai76), 'colore sezione selezionata');
add('Roadmap AI ridotta visibile', /ai771-roadmap-readiness/.test(aiPartial) && /renderRoadmapReadiness/.test(ai76), 'stato verso 8.0 nella pagina AI esistente');
add('Provider non invia automaticamente', /confirm\(msg/.test(ai77) && /manual_approval_required_no_runtime_change/.test(ai77), 'invio solo con conferma operatore');
add('API key non esportata', /sessionStorage\.setItem\(API_KEY_SESSION/.test(ai77) && !/apiKey\s*:/.test(ai77), 'key solo sessione, report con hasApiKey');
add('Approvazione non modifica runtime', /APPROVED_NO_RUNTIME_CHANGE/.test(ai77) && /Nessuna modifica automatica/.test(ai77), 'approva registra solo decisione');
add('Menu AI dedicato senza doppioni', /<summary>🤖 AI Copilot/.test(index) && /AI Copilot Center/.test(index) && /Provider & Approvazioni AI/.test(index), 'un solo gruppo AI');
add('Legacy WO 6.0 non caricato runtime', !/src=["'][^"']*work-order-product-60\.js["']|href=["'][^"']*15-work-order-product\.css["']|data-partial-src=["'][^"']*work-order-product-60\.html["']/.test(index), 'nessun script/partial/css legacy 6.0');
add('Legacy Firmware 6.1 non caricato runtime', !/src=["'][^"']*revision-firmware-61\.js["']|href=["'][^"']*16-revision-firmware\.css["']|data-partial-src=["'][^"']*revision-firmware-61\.html["']/.test(index), 'nessun script/partial/css legacy 6.1');
add('Menu KPI doppi nascosti', !/Database \/ KPI|Analisi Produzione<\/button>|Analisi Produzione\s*<\/button>/.test(index), 'Analytics Center è accesso principale');
add('AI non duplica moduli business', /Non duplica moduli business/.test(ai77) && /Non duplicare Traceability, Repair, Analytics, MES, Factory o Work Orders/.test(ai76), 'AI sopra moduli esistenti');
add('data_provider senza path assoluti Windows', !/[A-Z]:\\|Users\\|Documents\\GITHUB/.test(cfg), 'path relativi');
const bats=listBat();
const avvia=bats.filter(f=>/^AVVIA_/i.test(f) || /^START_SERVER/i.test(f));
const badAvvia=avvia.filter(f=>/npm\s+run\s+build/i.test(safeRead(f)));
add('BAT avvio senza npm run build', badAvvia.length===0, badAvvia.join(', '));
add('BAT 7.7.1 presenti', exists('INSTALLA_AT_MEC_HM_7.7.1_AI_APPROVAL_PERSISTENCE_UX.bat') && exists('AVVIA_AT_MEC_HM_7.7.1_AI_APPROVAL_PERSISTENCE_UX.bat') && exists('CREA_INSTALLER_WINDOWS_7.7.1_AI_APPROVAL_PERSISTENCE_UX.bat'), 'install/avvia/installer');
add('Documentazione 7.7.1 presente', exists('docs/ai/AI_PROVIDER_APPROVAL_7.7.md') && exists('docs/releases/README_AT_MEC_HM_7_7_1_AI_APPROVAL_PERSISTENCE_UX.md'), 'docs AI/release');
const score = Math.round(checks.filter(c=>c.ok).length / checks.length * 100);
const report = {version, createdAt: new Date().toISOString(), score, checks, missingScripts, missingCss, missingPartials};
fs.mkdirSync(path.join(root,'docs/quality'), {recursive:true});
fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_7_7_1_RUNTIME_VALIDATION.json'), JSON.stringify(report,null,2));
const menuAudit = {version,createdAt:report.createdAt,primaryMenu:['AI Copilot Center','Analisi completa AI','Provider & Approvazioni AI'],hiddenDuplicates:['Nuova pagina AI duplicata','Nuovo Analytics AI','Nuovo Repair AI','Nuovo MES AI'],aiRule:'7.7 estende la pagina AI esistente: provider e approvazioni manuali, nessuna modifica automatica.',result:checks.every(c=>c.ok)?'OK':'CHECK'};
fs.writeFileSync(path.join(root,'docs/quality/AT_MEC_HM_7_7_1_MENU_AUDIT.json'), JSON.stringify(menuAudit,null,2));
console.log('AT-MEC_HM_7.7.1 runtime validation');
for(const c of checks){ console.log(`${c.ok?'OK  ':'FAIL'} ${c.label}${c.detail?' - '+c.detail:''}`); }
console.log(`SCORE ${score}%`);
if(checks.some(c=>!c.ok)) process.exit(1);
