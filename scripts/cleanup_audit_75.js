#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel){return fs.existsSync(path.join(root,rel)) ? fs.readFileSync(path.join(root,rel),'utf8') : '';}
function exists(rel){return fs.existsSync(path.join(root,rel));}
const index = read('src/renderer/index.html');
const checks = [];
function check(label, ok, detail){checks.push({label, ok:!!ok, detail:detail||''});}
check('Legacy Work Order 6.0 non caricato', !/work-order-product-60\.js|work-order-product-60\.html|15-work-order-product\.css/.test(index), 'index.html non deve caricare moduli 6.0');
check('Legacy Revision/Firmware 6.1 non caricato', !/revision-firmware-61\.js|revision-firmware-61\.html|16-revision-firmware\.css/.test(index), 'index.html non deve caricare moduli 6.1');
check('Clean Baseline 7.5 caricato', /enterprise-clean-baseline-75\.js/.test(index), 'adapter canonico 7.5 presente');
check('CSS Clean Baseline 7.5 caricato', /33-enterprise-clean-baseline-75\.css/.test(index), 'stile pannello 7.5 presente');
check('Archivio decommission presente', exists('docs/deprecated/runtime_7_5_removed_from_app/work-order-product-60.js') && exists('docs/deprecated/runtime_7_5_removed_from_app/revision-firmware-61.js'), 'legacy spostato fuori runtime');
check('Sync queue path relativo', !/C:\\Users|Documents\\PROGETTI|AT-MEC_HM_4\.13G/.test(read('config/data_provider.json')), 'config/data_provider.json portabile');
check('Menu KPI doppio nascosto', !/Database \/ KPI|Analisi Produzione<\/button>/.test(index), 'menu Report/QC usa Analytics Center come accesso principale');
check('AI Copilot 8.0 senza duplicare moduli', /ai-copilot-76\.js/.test(index) && /ai-provider-approval-77\.js/.test(index) && /ai-ready-80\.js/.test(index) && /showAiCopilot76/.test(index) && /ai-copilot-tab/.test(index), 'AI apre pagina dedicata e aggiunge solo readiness dentro pagina esistente');
const score = Math.round(checks.filter(c=>c.ok).length/checks.length*100);
const report = {version:'AT-MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE', createdAt:new Date().toISOString(), score, checks};
fs.mkdirSync(path.join(root,'docs','quality'),{recursive:true});
fs.writeFileSync(path.join(root,'docs','quality','AT_MEC_HM_8_0_CLEANUP_AUDIT.json'), JSON.stringify(report,null,2));
console.log(`AT-MEC HM 8.0 cleanup audit: ${score}%`);
checks.forEach(c=>console.log(`${c.ok?'OK ':'ERR'} ${c.label} - ${c.detail}`));
process.exit(checks.every(c=>c.ok)?0:1);
