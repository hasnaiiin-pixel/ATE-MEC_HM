/* AT-MEC_HM_4.16D_CORE_MODULE_SPLIT
 * ESP32, Keysight, hardware UI e avvio produzione/Test Mode.
 * Estratto da app-legacy-core.js preservando ordine di esecuzione.
 */
function collectReportsForLot(){
  const f=getLotFilterPayload();
  const lot=f.lot.toLowerCase();
  let rows=[];
  const all = Array.isArray(auditCache) ? auditCache.slice() : [];
  rows = all.filter(r => {
    const rlot=String(r.lot_number || r.work_order || '').toLowerCase();
    const rsn=String(r.serial_dut || '').toLowerCase();
    const rr=String(r.final_result || '').toUpperCase();
    if(lot && !rlot.includes(lot)) return false;
    if(f.serial && !rsn.includes(f.serial.toLowerCase())) return false;
    if(f.result && f.result !== 'ALL' && rr !== f.result) return false;
    return true;
  });
  return rows.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
}
async function loadLotDashboard(){
  if(!Array.isArray(auditCache) || !auditCache.length) { try { await loadAudit(); } catch{} }
  const f=getLotFilterPayload();
  const rows=collectReportsForLot();
  const pass=rows.filter(r=>String(r.final_result).toUpperCase()==='PASS').length;
  const fail=rows.filter(r=>String(r.final_result).toUpperCase()==='FAIL').length;
  const serials=new Set(rows.map(r=>String(r.serial_dut||'').trim()).filter(Boolean));
  const yieldRate=rows.length ? ((pass/rows.length)*100).toFixed(1) : '0.0';
  const top={};
  rows.filter(r=>String(r.final_result).toUpperCase()==='FAIL').forEach(r=>{ const fl=(r.steps_log||[]).find(x=>x.result==='FAIL'); const k=fl ? `${fl.step_id||''} ${fl.type||''}`.trim() : (r.recipe_name||'FAIL'); top[k]=(top[k]||0)+1; });
  const topHtml=Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`<div class="lot-list-row"><div>${escapeHtml(k)}</div><div>${v}</div><div>FAIL</div><div></div></div>`).join('') || '<div class="hint">Nessun guasto nel filtro.</div>';
  const list=rows.slice(0,30).map(r=>`<div class="lot-list-row"><div><b>${escapeHtml(r.serial_dut||'-')}</b><br><span class="hint">${escapeHtml(r.recipe_name||'')} · ${new Date(r.timestamp).toLocaleString('it-IT')}</span></div><div class="${String(r.final_result).toLowerCase()==='pass'?'validation-ok':'validation-fail'}">${escapeHtml(r.final_result||'')}</div><div>${escapeHtml(String(r.execution_time_ms?((r.execution_time_ms/1000).toFixed(1)+'s'):''))}</div><div>${escapeHtml(r.operator||'')}</div></div>`).join('') || '<div class="hint">Nessun test trovato per questo lotto/filtro.</div>';
  const el=document.getElementById('lot-dashboard-result');
  if(el) el.innerHTML=`<div class="lot-grid"><div class="lot-card"><div class="big">${rows.length}</div><div>Test lotto</div></div><div class="lot-card"><div class="big">${serials.size}</div><div>Seriali unici</div></div><div class="lot-card"><div class="big" style="color:var(--pass)">${pass}</div><div>PASS</div></div><div class="lot-card"><div class="big" style="color:var(--fail)">${fail}</div><div>FAIL</div></div><div class="lot-card"><div class="big">${yieldRate}%</div><div>Yield</div></div></div><h4>Top difetti</h4>${topHtml}<h4>Ultimi seriali lotto ${escapeHtml(f.lot||'')}</h4>${list}`;
}
function copyLotToDbFilters(){
  const lot=document.getElementById('lot-manager-input')?.value||''; const serial=document.getElementById('lot-manager-serial')?.value||''; const result=document.getElementById('lot-manager-result')?.value||'ALL';
  const dl=document.getElementById('db-lot'); if(dl) dl.value=lot; const ds=document.getElementById('db-serial'); if(ds) ds.value=serial; const dr=document.getElementById('db-result'); if(dr) dr.value=result;
  loadDatabaseDashboard();
}
function exportLotCsv(){
  const rows=collectReportsForLot(); const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const head=['Data','Lotto','Seriale','Esito','Ricetta','Versione','Operatore','Tempo_s','Riparazione'];
  const body=rows.map(r=>[r.timestamp||'',r.lot_number||r.work_order||'',r.serial_dut||'',r.final_result||'',r.recipe_name||'',r.recipe_version||'',r.operator||'',r.execution_time_ms?Number(r.execution_time_ms/1000).toFixed(2):'',r.repair_note||''].map(esc).join(';')).join('\n');
  downloadTextFile(`AT-MEC_lotto_${(getLotFilterPayload().lot||'ALL').replace(/[^a-z0-9_-]+/gi,'_')}_${new Date().toISOString().slice(0,10)}.csv`, head.map(esc).join(';')+'\n'+body, 'text/csv');
}
function exportLotPdf(){
  const f=getLotFilterPayload(); const rows=collectReportsForLot();
  const pass=rows.filter(r=>String(r.final_result).toUpperCase()==='PASS').length; const fail=rows.filter(r=>String(r.final_result).toUpperCase()==='FAIL').length; const y=rows.length?((pass/rows.length)*100).toFixed(1):'0.0';
  let html=`<html><head><title>Report lotto ${escapeHtml(f.lot||'ALL')}</title><style>body{font-family:Arial;padding:28px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:6px;font-size:12px}.pass{color:green;font-weight:bold}.fail{color:red;font-weight:bold}.k{display:inline-block;margin-right:20px;font-size:14px}

/* AT-MEC_HM_3.33_TEST_LIGHT - UX compatta e ordinata */
.chrome-toggle{min-width:72px;}
body.left-rail-collapsed #sidebar{position:absolute;left:-280px;top:43px;bottom:0;z-index:7000;box-shadow:18px 0 40px rgba(0,0,0,.45);transition:left .18s ease;}
body.left-rail-open #sidebar{position:absolute;left:0;top:43px;bottom:0;z-index:7000;box-shadow:18px 0 40px rgba(0,0,0,.45);transition:left .18s ease;}
body.right-rail-collapsed #right{position:absolute;right:-310px;top:43px;bottom:0;z-index:7000;box-shadow:-18px 0 40px rgba(0,0,0,.45);transition:right .18s ease;}
body.right-rail-open #right{position:absolute;right:0;top:43px;bottom:0;z-index:7000;box-shadow:-18px 0 40px rgba(0,0,0,.45);transition:right .18s ease;}
body.right-step-compact #current-step-box .detail-line, body.right-step-compact #current-step-box pre{display:none!important;}
#run-tab .brand-hero{min-height:58px!important;padding:8px 12px!important;display:grid!important;grid-template-columns:minmax(220px,1fr) minmax(280px,.75fr)!important;gap:10px!important;align-items:center!important;}
#run-tab .brand-hero img{display:none!important;}
#run-tab .brand-hero .run-mini-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
#run-tab>.kpi-grid{display:none!important;}
.dashboard-production-grid{grid-template-columns:minmax(0,1fr) minmax(260px,.45fr)!important;}
.dashboard-card{padding:10px!important;border-radius:14px!important;}
.dashboard-card h3{font-size:13px!important;margin-bottom:7px!important;}
.dashboard-start-row{grid-template-columns:repeat(4,minmax(110px,1fr))!important;gap:8px!important;}
.dashboard-start-row .btn{min-height:42px!important;font-size:13px!important;padding:8px 10px!important;}
.run-actions-modern{display:none!important;}
.prod-actions{display:grid!important;grid-template-columns:repeat(5,minmax(90px,1fr))!important;gap:6px!important;}
.prod-actions .btn{min-height:38px!important;font-size:11px!important;padding:7px!important;}
.prod-kpis{transform:scale(.82);transform-origin:top right;margin-bottom:-14px!important;}
.prod-test-body{grid-template-columns:minmax(0,1fr) minmax(240px,.38fr)!important;}
.prod-info-cell{border:1px solid rgba(0,212,255,.18)!important;border-radius:12px!important;background:rgba(0,212,255,.045)!important;}
.prod-meta-row-225{align-items:stretch!important;}
.prod-timing-strip{text-align:center!important;justify-content:center!important;}
.prod-time-cell{text-align:center!important;}
#recipe-tab{font-size:11px!important;}
.recipe-page-layout{grid-template-columns:300px minmax(0,1fr)!important;gap:9px!important;}
.recipe-big-card,.modern-panel{padding:9px!important;border-radius:12px!important;}
.recipe-template-grid{grid-template-columns:repeat(auto-fit,minmax(118px,1fr))!important;gap:6px!important;}
.recipe-template-btn{padding:8px!important;min-height:58px!important;font-size:11px!important;border-radius:11px!important;}
.recipe-template-btn span{font-size:10px!important;}
.recipe-flow-card{grid-template-columns:42px minmax(0,1fr) auto!important;gap:8px!important;padding:9px!important;border-radius:13px!important;}
.recipe-flow-icon{width:36px!important;height:36px!important;border-radius:12px!important;font-size:20px!important;}
.recipe-flow-title{font-size:13px!important;}
.recipe-flow-desc{font-size:10.5px!important;}
.recipe-inline-edit{grid-template-columns:repeat(auto-fit,minmax(86px,1fr))!important;gap:5px!important;padding:7px!important;}
.recipe-inline-edit input,.recipe-inline-edit select{height:29px!important;font-size:11px!important;border:1px solid rgba(0,212,255,.38)!important;background:rgba(0,212,255,.055)!important;}
.manual-clear-alert{border:1px solid rgba(243,156,18,.65);background:rgba(243,156,18,.12);color:#ffd58a;border-radius:12px;padding:10px;margin:8px 0;font-weight:800;line-height:1.35;}
.manual-input-panel{border:2px solid rgba(0,212,255,.58);border-radius:14px;background:rgba(0,212,255,.08);padding:12px;margin-top:10px;}
.manual-measure-input{height:48px!important;font-size:22px!important;font-weight:900!important;text-align:center!important;border-color:var(--accent)!important;background:#071923!important;}
.manual-action-grid{grid-template-columns:repeat(3,minmax(160px,1fr))!important;}
.logo-white-local,#login-large-logo,#login-developer-logo,#app-large-logo,#developer-small-logo,#prod-company-logo,#prod-dev-logo{background:#fff!important;padding:8px!important;box-shadow:0 0 0 1px rgba(0,0,0,.08)!important;filter:none!important;}
#prod-company-logo{max-width:120px!important;max-height:48px!important;}
#prod-dev-logo{max-width:105px!important;max-height:42px!important;}



/* AT-MEC_HM_3.33_TEST_LIGHT - major UI/UX, Communication Hub, misure live */
:root{--atmec-compact-scale:.92;}
input[type="checkbox"]{appearance:none;-webkit-appearance:none;width:42px!important;height:22px!important;min-width:42px;border-radius:999px!important;border:1px solid rgba(255,255,255,.22)!important;background:rgba(255,255,255,.14)!important;position:relative;vertical-align:middle;cursor:pointer;transition:.16s ease;}
input[type="checkbox"]:before{content:"";position:absolute;width:16px;height:16px;border-radius:50%;left:3px;top:2px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.35);transition:.16s ease;}
input[type="checkbox"]:checked{background:linear-gradient(90deg,var(--accent),#22c55e)!important;border-color:rgba(34,197,94,.8)!important;}
input[type="checkbox"]:checked:before{left:21px;}
input[type="checkbox"]:after{content:"OFF";position:absolute;right:5px;top:4px;font-size:8px;font-weight:900;color:rgba(255,255,255,.78);}
input[type="checkbox"]:checked:after{content:"ON";left:5px;right:auto;color:#031417;}
.submenu-device,.nav-group{border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.035);margin:7px 0;padding:5px;}
.submenu-device summary,.nav-group summary{cursor:pointer;list-style:none;font-weight:900;font-size:12px;padding:8px;border-radius:9px;color:var(--text);display:flex;justify-content:space-between;align-items:center;}
.submenu-device summary::-webkit-details-marker,.nav-group summary::-webkit-details-marker{display:none;}
.submenu-device[open] summary,.nav-group[open] summary{background:rgba(0,212,255,.075);color:var(--accent);}
.submenu-btn{margin-top:4px!important;font-size:11px!important;min-height:30px!important;padding:6px 8px!important;}
body.left-rail-collapsed #main{grid-template-columns:0 minmax(0,1fr) 0!important;}
body.left-rail-open #sidebar,body.right-rail-open #right{backdrop-filter:blur(10px);}
#run-tab .brand-hero{min-height:44px!important;padding:6px 9px!important;grid-template-columns:minmax(180px,1fr) minmax(240px,.52fr)!important;}
#run-tab .brand-hero [style*="font-size:22px"]{font-size:17px!important;}
#run-tab .brand-hero [style*="font-size:12px"]{display:none!important;}
#run-tab .run-mini-kpi,.run-mini-kpi{transform:scale(.78);transform-origin:top right;justify-self:end;}
.dashboard-production-grid{grid-template-columns:minmax(0,.62fr) minmax(280px,.38fr)!important;gap:8px!important;}
.dashboard-card,.recipe-big-card,.modern-panel{transform:scale(var(--atmec-compact-scale));transform-origin:top left;}
.recipe-step-workspace{max-width:100%;}
.recipe-page-layout{grid-template-columns:260px minmax(0,1fr)!important;align-items:start!important;}
#recipe-steps-page-list{max-width:100%;}
.recipe-flow-card{max-width:100%;}
.recipe-compact-step-details{display:none;margin-top:8px;border:1px dashed rgba(255,255,255,.14);border-radius:10px;padding:8px;background:rgba(0,0,0,.14);}
body.recipe-details-visible .recipe-compact-step-details{display:block;}
.recipe-customer-toolbar{display:grid;grid-template-columns:repeat(2,minmax(130px,1fr));gap:8px;}
.recipe-customer-toolbar input{height:32px!important;font-size:12px!important;}
.prod-kpis{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:6px!important;transform:scale(.70)!important;transform-origin:top right!important;margin-left:auto!important;max-width:260px!important;}
.prod-kpi{padding:7px!important;border-radius:10px!important;}
.prod-kpi .num{font-size:18px!important;}
.prod-kpi .lbl{font-size:9px!important;}
.prod-actions-vertical-318{grid-template-columns:1fr!important;}
.prod-big-action{min-height:58px!important;font-size:13px!important;}
.prod-current-step{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;}
.step-live-measure-panel{border:1px solid rgba(0,212,255,.32);border-radius:14px;background:rgba(0,212,255,.07);padding:10px;margin-top:8px;}
.step-live-measure-panel .live-title{font-size:11px;color:var(--text2);letter-spacing:.9px;text-transform:uppercase;font-weight:900;}
.step-live-measure-panel .live-value{font-size:28px;font-weight:950;color:var(--accent);font-family:monospace;line-height:1.15;}
.step-live-measure-panel .live-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px;}
.step-live-measure-panel .live-cell{border:1px solid var(--border);border-radius:10px;padding:6px;background:rgba(0,0,0,.14);font-size:10px;}
.step-live-measure-panel .live-cell b{display:block;font-size:12px;color:var(--text);}
.manual-clear-alert{font-size:14px!important;border-width:2px!important;}
.manual-measure-input{outline:3px solid rgba(0,212,255,.18);}
.db-kpi-page-319{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:12px;align-items:start;}
.db-kpi-compact-right{position:sticky;top:6px;display:grid;gap:7px;}
.db-kpi-small{border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.04);padding:8px;text-align:right;}
.db-kpi-small .n{font-size:20px;font-weight:950;color:var(--accent);}
.db-action-row-319{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.comm-grid{display:grid;grid-template-columns:320px minmax(0,1fr) 340px;gap:12px;align-items:start;}
.comm-card{border:1px solid var(--border);border-radius:16px;background:rgba(255,255,255,.04);padding:12px;}
.comm-log{height:430px;overflow:auto;background:#05070b;border:1px solid var(--border);border-radius:12px;padding:10px;font-family:monospace;font-size:12px;white-space:pre-wrap;}
.comm-row-rx{color:#9be7ff}.comm-row-tx{color:#9dffb0}.comm-row-sys{color:#ffd98a}.comm-pass{color:var(--pass);font-weight:900}.comm-fail{color:var(--fail);font-weight:900}
@media(max-width:1200px){.comm-grid{grid-template-columns:1fr}.db-kpi-page-319{grid-template-columns:1fr}.recipe-page-layout{grid-template-columns:1fr!important}.prod-kpis{max-width:none!important}}



/* AT-MEC_HM_3.30 - correzioni reali da base 3.30 */
html, body { height:100%; overflow:auto !important; }
#center, .tab-content, #production-test-mode, .prod-test-body { overflow:auto !important; }
body.production-test-active #production-test-mode { display:flex !important; flex-direction:column !important; height:100vh !important; max-height:100vh !important; overflow-y:auto !important; padding-bottom:24px !important; }
body.production-test-active .prod-test-body { flex:1 1 auto !important; min-height:0 !important; overflow-y:auto !important; grid-template-columns:minmax(0,1fr) minmax(260px,340px) !important; align-items:start !important; }
.prod-panel { min-height:0 !important; }
.prod-meta-row-318 { grid-template-columns:minmax(160px,.8fr) minmax(220px,1fr) minmax(220px,1fr) !important; gap:10px !important; }
.prod-info-cell, .prod-check-card { min-height:72px !important; padding:8px 10px !important; }
.prod-check-card label { margin-bottom:4px !important; }
.prod-inline-control { height:28px !important; min-height:28px !important; padding:3px 8px !important; display:grid !important; grid-template-columns:1fr 48px !important; align-items:center !important; gap:8px !important; font-size:11px !important; }
.prod-inline-control input[type="checkbox"] { justify-self:end !important; margin-left:auto !important; width:42px !important; min-width:42px !important; height:22px !important; transform:none !important; }
.prod-input-row { height:30px !important; }
.prod-input-row input { height:30px !important; }
.prod-boxed-hint { min-height:30px !important; padding:5px 7px !important; font-size:10px !important; }
.prod-kpis { transform:none !important; max-width:none !important; width:100% !important; grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:10px !important; margin:0 0 10px 0 !important; }
.prod-kpi { min-height:72px !important; padding:12px !important; display:flex !important; flex-direction:column !important; justify-content:center !important; align-items:center !important; }
.prod-kpi .num { font-size:28px !important; line-height:1 !important; }
.prod-kpi .lbl { font-size:11px !important; text-align:center !important; }
.prod-actions-vertical-318 { display:grid !important; grid-template-columns:1fr !important; gap:10px !important; margin-top:8px !important; }
.prod-actions-vertical-318 .prod-big-action { width:100% !important; min-height:58px !important; height:58px !important; display:flex !important; align-items:center !important; justify-content:center !important; text-align:center !important; gap:10px !important; border-radius:14px !important; box-shadow:0 10px 22px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.14) !important; }
.prod-actions-vertical-318 .action-ico { font-size:22px !important; filter:drop-shadow(0 2px 2px rgba(0,0,0,.3)); }
.prod-right-timing-326 { margin:8px 0 10px !important; display:grid !important; grid-template-columns:1fr 1fr !important; gap:8px !important; }
.prod-right-timing-326 #prod-state-cell { grid-column:1 / -1 !important; order:3 !important; }
.prod-right-timing-326 .prod-time-cell { min-height:54px !important; padding:8px !important; border:1px solid var(--border); border-radius:12px; background:rgba(255,255,255,.045); }
.prod-right-timing-326 .prod-time-cell b { font-size:18px !important; }
.prod-current-step { overflow:visible !important; }
#prod-current-step.value { white-space:normal !important; overflow-wrap:anywhere !important; line-height:1.25 !important; max-height:none !important; }
.prod-status-banner { min-height:48px !important; display:flex !important; align-items:center !important; justify-content:center !important; font-size:18px !important; }
.dashboard-production-grid { grid-template-columns:minmax(0,.50fr) minmax(320px,.50fr) !important; }
#run-tab .prod-kpis, #run-tab .run-mini-kpi { transform:scale(1.2) !important; transform-origin:top right !important; }
.db-kpi-page-319, .db-kpi-page-326 { display:grid !important; grid-template-columns:minmax(0,1fr) 300px !important; gap:14px !important; align-items:start !important; }
.db-kpi-compact-right { position:sticky !important; top:10px !important; display:grid !important; gap:8px !important; }
.recipe-page-layout { display:grid !important; grid-template-columns:minmax(300px,380px) minmax(0,1fr) !important; gap:14px !important; align-items:start !important; }
#recipe-tab .recipe-big-card { transform:none !important; }
.recipe-page-toolbar { display:grid !important; grid-template-columns:repeat(4,minmax(145px,1fr)) !important; gap:8px !important; align-items:end !important; margin-bottom:8px !important; }
.recipe-actions-grid { display:flex !important; flex-wrap:wrap !important; justify-content:flex-start !important; gap:8px !important; margin:8px 0 10px !important; padding:8px !important; border:1px solid var(--border); border-radius:12px; background:rgba(0,0,0,.12); }
.recipe-actions-grid .btn { min-height:34px !important; padding:7px 10px !important; }
.recipe-template-grid { display:grid !important; grid-template-columns:1fr !important; gap:8px !important; max-height:520px !important; overflow:auto !important; }
.recipe-template-btn { min-height:54px !important; text-align:left !important; }
.recipe-step-workspace { min-width:0 !important; }
#recipe-steps-page-list { display:grid !important; gap:10px !important; }
.recipe-flow-card { width:100% !important; max-width:none !important; }
.recipe-preview-326 { margin-top:10px; border:1px solid rgba(0,212,255,.24); border-radius:14px; background:rgba(0,212,255,.06); padding:10px; }
.recipe-preview-326-title { font-size:12px; font-weight:900; color:var(--accent); text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; }
.recipe-preview-326-flow { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.recipe-preview-326-chip { border:1px solid var(--border); background:rgba(0,0,0,.20); border-radius:999px; padding:5px 8px; font-size:11px; font-weight:800; }
.recipe-stopfail-326 { margin-top:8px; padding:7px 8px; border:1px solid rgba(255,193,7,.25); border-radius:10px; background:rgba(255,193,7,.06); display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:11px; font-weight:800; }
.comm-step-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; margin:10px 0; }
#device-tab .device-manager-mini { margin-top:12px; }
.logo-halo-fix, #prod-company-logo, #prod-dev-logo { background:#fff !important; border-radius:10px !important; padding:4px !important; object-fit:contain !important; }
@media(max-width:1100px){ body.production-test-active .prod-test-body,.recipe-page-layout,.db-kpi-page-319,.db-kpi-page-326{grid-template-columns:1fr!important}.recipe-page-toolbar{grid-template-columns:1fr 1fr!important}.prod-right-timing-326{grid-template-columns:1fr!important}.comm-step-actions{grid-template-columns:1fr!important} }



/* AT-MEC_HM_3.31 - correzioni richieste: login INVIO, FAIL per step, layout KPI/Test Mode/Ricette */
html, body { min-height:100%; overflow:auto !important; }
body.production-test-active { overflow:auto !important; }
body.production-test-active #production-test-mode { overflow-y:auto !important; overflow-x:hidden !important; padding-bottom:28px !important; }
body.production-test-active .prod-test-body { align-items:start !important; padding-bottom:30px !important; }
body.production-test-active .prod-kpis { display:grid !important; grid-template-columns:1fr 1fr !important; gap:12px !important; width:100% !important; max-width:430px !important; }
body.production-test-active .prod-kpi { min-height:86px !important; padding:14px !important; display:flex !important; flex-direction:column !important; justify-content:center !important; }
body.production-test-active .prod-kpi .num { font-size:clamp(28px,3vw,42px) !important; line-height:1 !important; }
body.production-test-active .prod-kpi .lbl { font-size:12px !important; white-space:normal !important; }
body.production-test-active .prod-actions-vertical-318 { margin-top:12px !important; display:flex !important; flex-direction:column !important; align-items:stretch !important; gap:10px !important; }
body.production-test-active .prod-big-action { justify-content:flex-start !important; text-align:center !important; min-height:58px !important; padding:12px 16px !important; font-size:15px !important; border-radius:14px !important; }
body.production-test-active .prod-big-action span:last-child { flex:1; text-align:center; }
body.production-test-active .action-ico { font-size:22px !important; width:36px !important; text-align:center !important; }
body.production-test-active .prod-current-step { overflow:visible !important; min-height:110px !important; }
body.production-test-active #prod-current-step { white-space:normal !important; overflow-wrap:anywhere !important; word-break:break-word !important; line-height:1.25 !important; }
body.production-test-active .prod-status-banner { width:100% !important; min-height:58px !important; font-size:22px !important; display:flex !important; align-items:center !important; justify-content:center !important; }
body.production-test-active .prod-meta-row-318 { align-items:stretch !important; }
body.production-test-active .prod-check-card { min-height:112px !important; padding:10px 12px !important; display:grid !important; grid-template-rows:auto auto 1fr !important; }
body.production-test-active .prod-inline-control { justify-content:space-between !important; gap:12px !important; }
body.production-test-active .prod-inline-control input[type="checkbox"] { width:48px !important; height:24px !important; flex:0 0 auto !important; accent-color:var(--accent) !important; }
body.production-test-active .prod-input-row input { min-height:34px !important; }
body.production-test-active .prod-boxed-hint { min-height:34px !important; padding:6px 8px !important; }
body.production-test-active .prod-right-timing-326, body.production-test-active .prod-timing-strip { display:grid !important; grid-template-columns:1fr !important; gap:8px !important; margin:0 0 12px 0 !important; }
body.production-test-active .prod-time-cell { min-height:54px !important; }
#db-tab, #audit-tab { overflow:auto !important; }
#db-tab .recipe-big-card, #db-tab .kpi-card, #db-tab .log-list { position:relative !important; z-index:auto !important; }
#db-tab .kpi-grid { display:grid !important; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)) !important; gap:12px !important; margin:12px 0 !important; }
#db-tab .db-panel-grid { display:grid !important; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)) !important; gap:12px !important; align-items:start !important; }
#db-tab .recipe-page-toolbar { display:grid !important; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)) !important; gap:10px !important; align-items:end !important; }
#recipe-tab { overflow:auto !important; }
#recipe-tab .recipe-page-toolbar { display:grid !important; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)) !important; gap:10px !important; align-items:end !important; margin-bottom:8px !important; }
#recipe-tab .recipe-actions-grid { display:flex !important; flex-wrap:wrap !important; align-items:center !important; justify-content:flex-start !important; gap:8px !important; margin:8px 0 12px !important; padding:8px !important; border:1px solid var(--border) !important; border-radius:12px !important; background:rgba(0,0,0,.14) !important; position:sticky !important; top:0 !important; z-index:5 !important; }
#recipe-tab .recipe-page-layout { display:grid !important; grid-template-columns:280px minmax(0,1fr) !important; gap:14px !important; align-items:start !important; }
#recipe-tab .recipe-template-grid { display:grid !important; grid-template-columns:1fr !important; gap:8px !important; max-height:calc(100vh - 260px) !important; overflow:auto !important; }
#recipe-tab .recipe-template-btn { width:100% !important; text-align:left !important; min-height:48px !important; }
#recipe-tab #recipe-steps-page-list { display:grid !important; gap:10px !important; }
.recipe-stopfail-331 { margin-top:8px; padding:8px 10px; border:1px solid rgba(255,193,7,.35); border-radius:10px; background:rgba(255,193,7,.08); display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:12px; font-weight:800; }
.recipe-stopfail-331 input[type="checkbox"] { width:46px; height:22px; accent-color:var(--warn); flex:0 0 auto; }
.step-live-measure-panel { margin-top:10px !important; border:1px solid rgba(0,212,255,.28) !important; border-radius:14px !important; background:rgba(0,212,255,.07) !important; padding:10px !important; }
.step-live-measure-panel .live-value { font-size:30px !important; font-weight:900 !important; text-align:center !important; color:var(--accent) !important; }
.step-live-measure-panel .live-grid { display:grid !important; grid-template-columns:repeat(3,minmax(0,1fr)) !important; gap:6px !important; }
.step-live-measure-panel .live-cell { border:1px solid var(--border); border-radius:9px; padding:6px; font-size:10px; color:var(--text2); }
.step-live-measure-panel .live-cell b { display:block; color:var(--text); font-size:12px; margin-top:2px; overflow:hidden; text-overflow:ellipsis; }
@media(max-width:1150px){ #recipe-tab .recipe-page-layout{grid-template-columns:1fr!important} body.production-test-active .prod-test-body{grid-template-columns:1fr!important} }

</style></head><body>`;
  html+=`<h1>AT-MEC - Report lotto</h1><p><b>Lotto:</b> ${escapeHtml(f.lot||'Tutti')}<br><b>Generato:</b> ${new Date().toLocaleString('it-IT')}</p>`;
  html+=`<p><span class="k">Test: <b>${rows.length}</b></span><span class="k">PASS: <b>${pass}</b></span><span class="k">FAIL: <b>${fail}</b></span><span class="k">Yield: <b>${y}%</b></span></p>`;
  html+=`<table><thead><tr><th>Data</th><th>Seriale</th><th>Esito</th><th>Ricetta</th><th>Operatore</th><th>Riparazione</th></tr></thead><tbody>`+rows.map(r=>`<tr><td>${new Date(r.timestamp).toLocaleString('it-IT')}</td><td>${escapeHtml(r.serial_dut||'')}</td><td class="${String(r.final_result).toLowerCase()}">${escapeHtml(r.final_result||'')}</td><td>${escapeHtml(r.recipe_name||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('')+`</tbody></table>`;
  const sig=getOperatorSignature(); if(sig.name) html+=`<p style="margin-top:28px"><b>Firma operatore:</b> ${escapeHtml(sig.name)}<br><b>Nota:</b> ${escapeHtml(sig.note||'')}</p>`;
  html+='</body></html>'; const w=window.open('', '_blank'); if(!w){downloadTextFile('report_lotto.html', html, 'text/html');return;} w.document.write(html); w.document.close(); setTimeout(()=>{try{w.print();}catch{}},350);
}
function validateRecipeAdvanced(showAlert=false){
  const issues=[]; const warnings=[]; const steps=Array.isArray(recipe?.steps)?recipe.steps:[];
  if(!recipe?.recipe_name || recipe.recipe_name==='Nuova Ricetta') warnings.push('Nome ricetta generico: assegna un nome chiaro.');
  if(!steps.length) issues.push('Nessuno step configurato.');
  steps.forEach((st,i)=>{ const n=i+1; const type=String(st.type||'');
    if(!type) issues.push(`Step ${n}: tipo mancante.`);
    if(['VoltageMeasurement','CurrentMeasurement','ResistanceTest','FrequencyTest','ManualMeasurement','PowerSupplyMeasureCurrent'].includes(type)){
      const hasRange = st.min !== undefined || st.max !== undefined || st.expected !== undefined || st.value !== undefined;
      if(!hasRange) warnings.push(`Step ${n}: misura senza valore atteso/min/max.`);
      if(st.min!==undefined && st.max!==undefined && Number(st.min)>Number(st.max)) issues.push(`Step ${n}: min maggiore di max.`);
    }
    if(type==='PowerSupplySet' && (st.voltage===undefined || st.current_limit===undefined)) warnings.push(`Step ${n}: alimentatore senza tensione o limite corrente.`);
    if(type==='Delay' && !Number(st.timeout||st.ms||st.value)) warnings.push(`Step ${n}: attesa senza tempo valido.`);
    if((st.if_fail_goto!==undefined || st.goto_on_fail!==undefined) && Number(st.if_fail_goto||st.goto_on_fail)>steps.length) issues.push(`Step ${n}: IF FAIL punta a step inesistente.`);
    if(st.loop_count!==undefined && Number(st.loop_count)<1) issues.push(`Step ${n}: loop_count non valido.`);
  });
  const box=document.getElementById('recipe-health');
  const html=`<div class="recipe-validation-list"><div class="${issues.length?'validation-fail':warnings.length?'validation-warn':'validation-ok'}">${issues.length?'Ricetta NON valida':warnings.length?'Ricetta valida con avvisi':'Ricetta OK'}</div>${issues.map(x=>`<div>❌ ${escapeHtml(x)}</div>`).join('')}${warnings.map(x=>`<div>⚠️ ${escapeHtml(x)}</div>`).join('') || '<div>✅ Nessun avviso importante.</div>'}</div>`;
  if(box) box.innerHTML=html;
  if(showAlert) alert(issues.length ? `Ricetta NON valida: ${issues.length} errori, ${warnings.length} avvisi.` : `Ricetta valida: ${warnings.length} avvisi.`);
  return { ok: issues.length===0, issues, warnings };
}
try { const oldRenderRecipePage = renderRecipePage; renderRecipePage = function(){ oldRenderRecipePage(); try{ validateRecipeAdvanced(false); loadOperatorSignature(); }catch{} }; } catch{}

function esp32Log(text, cls='info') {
  addLog(document.getElementById('esp32-control-log'), text, cls);
}

function getEsp32Channels(type, opts = {}) {
  const onlySafe = opts.onlySafe === true;
  return (esp32IoCatalog || [])
    .filter(x => String(x.io_type || '').toUpperCase() === type)
    .filter(x => !onlySafe || x.safe !== false)
    .filter(x => Number.isFinite(Number(x.channel)) && Number(x.channel) > 0);
}

function isEsp32SafeChannel(type, channel) {
  return getEsp32Channels(type).some(x => Number(x.channel) === Number(channel) && x.safe !== false);
}

async function initEsp32ControlPage() {
  if (esp32ControlInitialized) return;
  esp32ControlInitialized = true;
  await loadEsp32IoCatalog();
  renderEsp32ControlGrids();
  await esp32ControlScanPorts(false);
  await esp32ControlRefreshStatus();
}

function renderEsp32ControlGrids() {
  const doGrid = document.getElementById('esp32-do-grid');
  const inGrid = document.getElementById('esp32-input-grid');
  if (!doGrid || !inGrid) return;
  const dos = getEsp32Channels('DO');
  const dis = getEsp32Channels('DI');
  const ais = getEsp32Channels('AI');
  doGrid.innerHTML = (dos.length ? dos : Array.from({length:16},(_,i)=>({io_type:'DO',channel:i,label:`DO_${String(i).padStart(2,'0')}`,safe:true}))).map(ch => {
    const key = `DO_${ch.channel}`;
    const val = liveIoSnapshot[key];
    const cls = val === true ? 'high' : val === false ? 'low' : '';
    const disabled = ch.safe === false;
    return `<div class="io-control-card ${disabled?'disabled':''}">
      <div class="io-control-head"><span class="io-name">${escapeHtml(ch.label || key)}</span><span id="esp32-state-${key}" class="state-led ${cls}">${val === true ? 'HIGH' : val === false ? 'LOW' : '---'}</span></div>
      <div class="detail-line">GPIO ${ch.channel}${ch.note ? ' — '+escapeHtml(ch.note) : ''}</div>
      <div class="row">
        <button class="btn btn-success btn-xs" ${disabled?'disabled':''} onclick="esp32SetDo(${Number(ch.channel)}, true)">HIGH</button>
        <button class="btn btn-ghost btn-xs" ${disabled?'disabled':''} onclick="esp32SetDo(${Number(ch.channel)}, false)">LOW</button>
        <button class="btn btn-ghost btn-xs" onclick="esp32ReadOne('DO', ${Number(ch.channel)})">Leggi</button>
      </div>
    </div>`;
  }).join('');
  inGrid.innerHTML = [
    ...(dis.length ? dis : Array.from({length:16},(_,i)=>({io_type:'DI',channel:i,label:`DI_${String(i).padStart(2,'0')}`,safe:true}))),
    ...(ais.length ? ais : Array.from({length:8},(_,i)=>({io_type:'AI',channel:i,label:`AI_${String(i).padStart(2,'0')}`,safe:true})))
  ].map(ch => {
    const type = String(ch.io_type).toUpperCase();
    const key = `${type}_${ch.channel}`;
    const val = liveIoSnapshot[key];
    const cls = val === true ? 'high' : val === false ? 'low' : '';
    const text = typeof val === 'number' ? val.toFixed(3) : (val === true ? 'HIGH' : val === false ? 'LOW' : '---');
    return `<div class="io-control-card ${ch.safe===false?'disabled':''}">
      <div class="io-control-head"><span class="io-name">${escapeHtml(ch.label || key)}</span><span id="esp32-state-${key}" class="state-led ${cls}">${text}</span></div>
      <div class="detail-line">${type === 'AI' ? 'Ingresso analogico' : 'Ingresso digitale'} — GPIO ${ch.channel}</div>
      <button class="btn btn-ghost btn-xs" onclick="esp32ReadOne('${type}', ${Number(ch.channel)})">Leggi ora</button>
    </div>`;
  }).join('');
}

function updateEsp32ControlChip(type, channel, value) {
  const key = `${type}_${channel}`;
  liveIoSnapshot[key] = value;
  const el = document.getElementById(`esp32-state-${key}`);
  if (!el) return;
  el.classList.remove('high','low');
  if (value === true) { el.classList.add('high'); el.textContent = 'HIGH'; }
  else if (value === false) { el.classList.add('low'); el.textContent = 'LOW'; }
  else if (typeof value === 'number') { el.textContent = value.toFixed(3); }
  else { el.textContent = '---'; }
}

async function esp32ControlScanPorts(log=true) {
  const list = document.getElementById('esp32-control-ports');
  const sel = document.getElementById('esp32-control-com');
  if (!api || !list || !sel) return;
  try {
    const ports = await guardedUi('Scansione periferiche ESP32', () => api.scanSerialPorts(), { timeoutMs: 3500, logTo: document.getElementById('esp32-control-log'), fallback: [] });
    serialPortsCache = Array.isArray(ports) ? ports : [];
    sel.innerHTML = '<option value="mock">mock</option>' + serialPortsCache.map(p => `<option value="${escapeHtml(p.path)}">${escapeHtml(p.friendlyName || p.path)}${p.likelyEsp32 ? ' ⭐ ESP32' : ''}</option>`).join('');
    const cfgSel = document.getElementById('cfg-esp-com');
    if (cfgSel?.value && cfgSel.value !== 'mock') sel.value = cfgSel.value;
    else {
      const likely = serialPortsCache.find(p => p.likelyEsp32);
      if (likely) sel.value = likely.path;
    }
    list.innerHTML = serialPortsCache.map(p => `<div class="port-card ${p.likelyEsp32?'likely':''}"><div><b>${escapeHtml(p.path)}</b><div class="detail-line">${escapeHtml(p.friendlyName || p.manufacturer || 'periferica seriale')}</div></div><button class="btn btn-ghost btn-xs" onclick="document.getElementById('esp32-control-com').value='${escapeHtml(p.path)}'">Usa</button></div>`).join('') || '<div class="detail-line">Nessuna periferica seriale trovata.</div>';
    if (log) esp32Log(`Periferiche trovate: <b>${serialPortsCache.length}</b>`, 'info');
  } catch(e) { list.innerHTML = '❌ ' + escapeHtml(e.message || e); }
}

async function esp32ConnectOnPort(port, log=true) {
  const baud = Number(document.getElementById('cfg-esp-baud')?.value || 115200);
  if (document.getElementById('cfg-esp-com')) document.getElementById('cfg-esp-com').value = port;
  if (document.getElementById('esp32-control-com')) document.getElementById('esp32-control-com').value = port;
  if (api?.saveAppSettings) {
    try { await api.saveAppSettings({ esp32Port: port, esp32Baud: baud }); } catch {}
  }
  const configs = [
    { name: 'modbus_serial', conn: port, baud },
    { name: 'Keysight_34461A', conn: ((document.getElementById('cfg-keysight-mode')?.value === 'USB') ? 'usb://' : '') + (document.getElementById('cfg-keysight-ip')?.value || '127.0.0.1'), baud: Number(document.getElementById('cfg-keysight-port')?.value || 5025) },
    { name: 'AimTTi_PL303', conn: document.getElementById('cfg-tti-com')?.value || 'mock', baud: Number(document.getElementById('cfg-tti-baud')?.value || 9600) }
  ];
  const res = await guardedUi('Connessione ESP32/modbus_serial', () => api.reconnectHardware(configs), { timeoutMs: 7000, logTo: document.getElementById('esp32-control-log') || document.getElementById('run-log'), fallback: [] });
  latestHardwareStatuses = Array.isArray(res) ? res : [];
  updateHwBadges(latestHardwareStatuses);
  await esp32ControlRefreshStatus();
  const st = latestHardwareStatuses.find(x => x.name === 'modbus_serial');
  if (log) esp32Log(st && !st.mock ? `✅ ESP32 LIVE su <b>${escapeHtml(port)}</b>. Le ricette useranno modbus_serial.` : `❌ ESP32 non live su ${escapeHtml(port)}.`, st && !st.mock ? 'pass' : 'fail');
  return st && !st.mock;
}

async function esp32ControlConnect() {
  const port = document.getElementById('esp32-control-com')?.value || 'mock';
  await esp32ConnectOnPort(port, true);
}

async function esp32AutoConnectAndUseForRecipes() {
  await esp32ControlScanPorts(false);
  const selected = document.getElementById('esp32-control-com')?.value;
  const likely = serialPortsCache.find(p => p.likelyEsp32)?.path;
  const port = (selected && selected !== 'mock') ? selected : (likely || serialPortsCache[0]?.path || 'mock');
  if (!port || port === 'mock') { esp32Log('❌ Nessuna COM ESP32 trovata. Controlla cavo USB dati e driver.', 'fail'); return; }
  document.getElementById('esp32-control-com').value = port;
  const ok = await esp32ConnectOnPort(port, true);
  if (ok) {
    setPowerSourceValue('ESP32_RELAY_POWER');
    const psPage = document.getElementById('power-source-page'); if (psPage) psPage.value = 'ESP32_RELAY_POWER';
    recipe.power_metadata = 'ESP32_RELAY_POWER';
    esp32Log('✅ ESP32 impostata come hardware ricetta. Ora puoi avviare test con I/O ESP32.', 'pass');
    addLog(document.getElementById('run-log'), '✅ ESP32 LIVE: modbus_serial pronto per ricette.', 'pass');
  }
}

async function esp32ControlInfo() {
  if (!api) return;
  try {
    const info = await guardedUi('Info ESP32', () => api.getEsp32Info(), { timeoutMs: 3500, logTo: document.getElementById('esp32-control-log'), fallback: null });
    if (info) {
      document.getElementById('esp32-control-fw').textContent = `FW: ${info.fw || info.version || 'n/d'}`;
      esp32Log(`Info: ${escapeHtml(JSON.stringify(info))}`, 'info');
    }
  } catch(e) { esp32Log(`❌ Info ESP32: ${escapeHtml(e.message || e)}`, 'fail'); }
}

async function esp32ControlRefreshStatus() {
  try {
    const statuses = api ? await withTimeout(api.getHardwareStatuses(), 2500, 'stato hardware') : [];
    latestHardwareStatuses = Array.isArray(statuses) ? statuses : [];
    const esp = latestHardwareStatuses.find(x => x.name === 'modbus_serial' || x.name === 'ESP32' || String(x.name||'').toLowerCase().includes('esp32'));
    document.getElementById('esp32-control-conn').textContent = `Stato: ${esp?.status || 'n/d'}${esp?.mock ? ' MOCK' : ''}`;
    document.getElementById('esp32-control-port').textContent = `Porta: ${document.getElementById('esp32-control-com')?.value || document.getElementById('cfg-esp-com')?.value || 'n/d'}`;
  } catch {}
}

async function esp32ReadOne(type, channel) {
  if (!api) return;
  try {
    let value;
    if (type === 'DI') value = await guardedUi(`Lettura DI${channel}`, () => api.readDigitalInput(channel), { timeoutMs: 2200, logTo: document.getElementById('esp32-control-log'), fallback: null });
    else if (type === 'DO') value = await guardedUi(`Lettura DO${channel}`, () => api.readDigitalOutput(channel), { timeoutMs: 2200, logTo: document.getElementById('esp32-control-log'), fallback: null });
    else value = await guardedUi(`Lettura AI${channel}`, () => api.readAnalogInput(channel), { timeoutMs: 2200, logTo: document.getElementById('esp32-control-log'), fallback: null });
    if (value !== null) updateEsp32ControlChip(type, channel, value);
    return value;
  } catch(e) { esp32Log(`❌ ${type}${channel}: ${escapeHtml(e.message || e)}`, 'fail'); return null; }
}

async function esp32SetDo(channel, state) {
  if (!api) return { ok:false, error:'api non disponibile' };
  channel = Number(channel);
  if (!isEsp32SafeChannel('DO', channel)) {
    const msg = `GPIO${channel} non valido o disabilitato per uscita digitale`;
    esp32Log(`⏭️ ${escapeHtml(msg)}`, 'warn');
    return { ok:false, skipped:true, error:msg };
  }
  try {
    const res = await guardedUi(`Set DO${channel} ${state?'HIGH':'LOW'}`, () => api.setDigitalOutput(channel, state), { timeoutMs: 3000, logTo: document.getElementById('esp32-control-log'), fallback: {ok:false, error:'timeout comando'} });
    if (!res || res.ok === false) {
      const err = res?.error || 'comando non confermato';
      esp32Log(`❌ Set DO${channel} ${state?'HIGH':'LOW'}: ${escapeHtml(err)}`, 'fail');
      return { ok:false, error:err };
    }
    updateEsp32ControlChip('DO', channel, state);
    esp32Log(`✅ DO${channel} ${state?'HIGH':'LOW'}`, 'pass');
    setTimeout(() => esp32ReadOne('DO', channel), 120);
    return { ok:true };
  } catch(e) {
    esp32Log(`❌ Set DO${channel}: ${escapeHtml(e.message || e)}`, 'fail');
    return { ok:false, error:e.message || String(e) };
  }
}

async function esp32ControlPollOnce() {
  if (esp32ControlBusy) return;
  esp32ControlBusy = true;
  try {
    const di = getEsp32Channels('DI', { onlySafe:true }).slice(0, 16);
    const doCh = getEsp32Channels('DO', { onlySafe:true }).slice(0, 16);
    const ai = getEsp32Channels('AI', { onlySafe:true }).slice(0, 8);
    for (const ch of [...doCh, ...di, ...ai]) {
      if (!document.getElementById('esp32-live-enable')?.checked) break;
      await esp32ReadOne(String(ch.io_type).toUpperCase(), Number(ch.channel));
      await new Promise(r => setTimeout(r, 20));
    }
  } finally { esp32ControlBusy = false; }
}

function toggleEsp32ControlLive(enabled) {
  if (esp32ControlLiveTimer) { clearInterval(esp32ControlLiveTimer); esp32ControlLiveTimer = null; }
  if (!enabled) { esp32Log('Live ESP32 fermato.', 'warn'); return; }
  const rate = Math.max(250, Number(document.getElementById('esp32-live-rate')?.value || 500));
  esp32Log(`Live ESP32 avviato ogni ${rate} ms.`, 'info');
  esp32ControlPollOnce();
  esp32ControlLiveTimer = setInterval(esp32ControlPollOnce, rate);
}

async function esp32EmergencyLow() {
  if (esp32ControlBusy) { esp32Log('⏳ Attendi: operazione ESP32 già in corso.', 'warn'); return; }
  const live = document.getElementById('esp32-live-enable');
  const liveWasOn = !!live?.checked;
  if (liveWasOn) { live.checked = false; toggleEsp32ControlLive(false); }
  esp32ControlBusy = true;
  try {
    const channels = getEsp32Channels('DO', { onlySafe:true }).slice(0, 32);
    esp32Log(`⛔ Tutte DO LOW: ${channels.length} GPIO validi. GPIO riservati/non validi saltati.`, 'warn');
    let ok = 0, fail = 0;
    for (const ch of channels) {
      const res = await esp32SetDo(Number(ch.channel), false);
      if (res?.ok) ok++; else fail++;
      await new Promise(r => setTimeout(r, 25));
    }
    esp32Log(`✅ Tutte DO LOW completato: ${ok} OK${fail ? ', '+fail+' errori' : ''}.`, fail ? 'warn' : 'pass');
  } finally {
    esp32ControlBusy = false;
    if (liveWasOn && live) { live.checked = true; toggleEsp32ControlLive(true); }
  }
}

function canExitProductionTestRole(role, level) {
  const r = String(role || '').toLowerCase();
  return Number(level || 0) >= 40 || ['admin','administrator','sviluppatore','developer','engineer','ingegnere','tecnico','technician'].some(x => r.includes(x));
}


function stepStatusLabel(status) {
  if (status === 'pass') return 'PASS';
  if (status === 'fail') return 'FAIL';
  if (status === 'running') return 'IN ESECUZIONE';
  return 'DA FARE';
}
function renderProductionSequenceLog() {
  const box = document.getElementById('prod-sequence-log');
  if (!box) return;
  const steps = Array.isArray(recipe?.steps) ? recipe.steps : [];
  if (!steps.length) { box.innerHTML = '<div class="detail-line">Nessuno step nella ricetta selezionata.</div>'; return; }
  box.innerHTML = steps.map((st, idx) => {
    const status = stepStatusMap[st.step_id] || 'todo';
    const label = stepStatusLabel(status);
    return `<div class="prod-seq-row ${status}">
      <div>#${idx + 1}</div>
      <div><b>${escapeHtml(st.label || st.type || 'Step')}</b><div class="detail-line">${escapeHtml(st.type || '')}${st.enabled === false ? ' · DISABILITATO' : ''}</div></div>
      <div class="prod-status-pill ${status}">${label}</div>
    </div>`;
  }).join('');
}
async function loadRecipeMetaForFilter317(name) {
  let r = null;
  try { if (api?.loadRecipe) { const res = await api.loadRecipe(name); if (res?.ok) r = res.recipe; } } catch {}
  if (!r) { try { r = JSON.parse(localStorage.getItem('recipe_' + name) || 'null'); } catch {} }
  return r || { recipe_name: name };
}
async function filterRecipeNamesByClient317(names, filter) {
  if (!filter) return names;
  const out = [];
  for (const n of names) { const meta = await loadRecipeMetaForFilter317(n); if (recipeMatchesClientFilter(meta, filter)) out.push(n); }
  return out;
}

async function refreshProductionRecipes() {
  const sel = document.getElementById('prod-recipe-select');
  if (!sel) return;
  let names = [];
  try { if (api?.listRecipes) names = await api.listRecipes(); } catch {}
  const localNames = Object.keys(localStorage).filter(k => k.startsWith('recipe_')).map(k => k.replace('recipe_', ''));
  names = Array.from(new Set([...(Array.isArray(names) ? names : []), ...localNames])).filter(Boolean).sort();
  names = await filterRecipeNamesByClient317(names, document.getElementById('prod-client-filter')?.value || '');
  productionRecipesCache = names;
  const current = recipe?.recipe_name || '';
  sel.innerHTML = names.map(n => `<option value="${escapeHtml(n)}" ${n===current?'selected':''}>${escapeHtml(n)}</option>`).join('') || '<option value="">Nessuna ricetta salvata</option>';
  if (!current && names[0]) { sel.value = names[0]; await loadProductionRecipeSelection(); }
}

async function refreshProductionRecipeVersions() {
  const sel = document.getElementById('prod-recipe-version-select');
  const name = document.getElementById('prod-recipe-select')?.value || recipe?.recipe_name || '';
  if (!sel) return;
  if (!api?.listRecipeVersions || !name) { sel.innerHTML = '<option value="">ultima</option>'; return; }
  try {
    const versions = await api.listRecipeVersions(name);
    sel.innerHTML = versions && versions.length
      ? '<option value="">ultima</option>' + versions.map(v => `<option value="${v.version}">v${v.version} — ${new Date(v.created_at).toLocaleString('it-IT')}</option>`).join('')
      : '<option value="">ultima</option>';
  } catch { sel.innerHTML = '<option value="">ultima</option>'; }
}

async function loadProductionRecipeRevisionSelection() {
  try { if (api?.safePl303Off) await api.safePl303Off('CAMBIO_REVISIONE_TEST_MODE'); } catch {}
  const name = document.getElementById('prod-recipe-select')?.value || '';
  const version = Number(document.getElementById('prod-recipe-version-select')?.value || 0);
  if (!name) return;
  if (!version) { await loadProductionRecipeSelection(); return; }
  try {
    const res = api?.loadRecipeVersion ? await api.loadRecipeVersion(name, version) : null;
    if (!res?.ok) throw new Error(res?.error || 'Versione non trovata');
    recipe = res.recipe;
    recipe.steps = Array.isArray(recipe.steps) ? recipe.steps : [];
    renumberRecipeSteps();
    syncLoadedRecipeToUi(name);
    addLog(document.getElementById('run-log'), `🕘 Ricetta caricata: <b>${escapeHtml(name)}</b> v${version}`, 'info');
  } catch(e) { addLog(document.getElementById('run-log'), `❌ Versione ricetta: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

function syncLoadedRecipeToUi(name) {
  document.getElementById('recipe-name-inp').value = recipe.recipe_name || name;
  if (document.getElementById('recipe-name-page')) document.getElementById('recipe-name-page').value = recipe.recipe_name || name;
  if (document.getElementById('recipe-client-page')) document.getElementById('recipe-client-page').value = recipe.client_name || recipe.customer || '';
  if (document.getElementById('recipe-customer-logo-page')) document.getElementById('recipe-customer-logo-page').value = recipe.customer_logo || recipe.client_logo || '';
  setPowerSourceValue(recipe.power_metadata || 'MANUAL_POWER');
  if (document.getElementById('recipe-enabled')) document.getElementById('recipe-enabled').checked = recipe.enabled !== false;
  if (document.getElementById('recipe-enabled-page')) document.getElementById('recipe-enabled-page').checked = recipe.enabled !== false;
  stepStatusMap = {};
  renderSteps();
  renderProductionSequenceLog();
  updateProductionTestMode();
  renderRecipePrecheckOperations();
}

async function loadProductionRecipeSelection() {
  try { if (api?.safePl303Off) await api.safePl303Off('CAMBIO_RICETTA_TEST_MODE'); } catch {}
  const name = document.getElementById('prod-recipe-select')?.value || '';
  if (!name) return;
  let loaded = null;
  try { if (api?.loadRecipe) { const res = await api.loadRecipe(name); if (res?.ok) loaded = res.recipe; } } catch {}
  if (!loaded) { try { const raw = localStorage.getItem('recipe_' + name); if (raw) loaded = JSON.parse(raw); } catch {} }
  if (!loaded) { addLog(document.getElementById('run-log'), `❌ Ricetta non caricata: ${escapeHtml(name)}`, 'fail'); return; }
  recipe = loaded;
  recipe.steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  renumberRecipeSteps();
  await refreshProductionRecipeVersions();
  syncLoadedRecipeToUi(name);
  setTimeout(() => autoConnectProductionInstruments(false), 150);
  // AT-MEC_HM_2.29: apri il wizard solo se non e gia aperto; non deve resettare lo step corrente.
  if (productionTestMode) setTimeout(() => {
    const m = document.getElementById('startup-wizard-modal');
    if (m && !m.classList.contains('show')) openStartupWizard(true);
  }, 220);
  addLog(document.getElementById('run-log'), `📂 Ricetta test mode caricata: <b>${escapeHtml(recipe.recipe_name || name)}</b>`, 'info');
}
function canUseProductionDebug() {
  return canExitProductionTestRole(currentUser?.role, currentUser?.level);
}
async function toggleDebugModeFromProduction(enabled) {
  if (!canUseProductionDebug()) {
    const cb = document.getElementById('prod-debug-flag'); if (cb) cb.checked = false;
    addLog(document.getElementById('run-log'), 'Permesso negato: debug consentito solo ad Admin, Sviluppatore, Engineer o Tecnico.', 'fail');
    return;
  }
  try {
    const res = api?.setDebugMode ? await api.setDebugMode(!!enabled) : { ok:false, error:'API non disponibile' };
    addLog(document.getElementById('run-log'), res?.ok ? `🐞 Debug step-by-step ${enabled ? 'attivato' : 'disattivato'}.` : `❌ Debug: ${escapeHtml(res?.error || 'errore')}`, res?.ok ? 'info' : 'fail');
  } catch(e) { addLog(document.getElementById('run-log'), `❌ Debug: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}
async function nextDebugStep() {
  if (!canUseProductionDebug()) return;
  try { await api?.nextStep?.(); } catch(e) { addLog(document.getElementById('run-log'), `❌ Next step: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}
async function autoConnectProductionInstruments(showLog=false) {
  if (!api) return;
  try {
    const cfg = await api.getAppSettings?.() || {};
    excludedInstruments = Array.isArray(cfg.excludedInstruments) ? cfg.excludedInstruments : [];
    const required = new Set(getRequiredInstrumentsForRecipe());

    const configs = [];
    if (required.has('modbus_serial') && !excludedInstruments.includes('modbus_serial')) {
      let port = cfg.esp32Port || document.getElementById('esp32-control-com')?.value || document.getElementById('cfg-esp-com')?.value || '';
      if (!port || port === 'mock') {
        await esp32ControlScanPorts(false);
        port = serialPortsCache.find(p => p.likelyEsp32)?.path || serialPortsCache[0]?.path || 'mock';
      }
      configs.push({ name: 'modbus_serial', conn: port, baud: Number(cfg.esp32Baud || 115200) });
    }
    if (required.has('Keysight_34461A') && !excludedInstruments.includes('Keysight_34461A')) { const km = cfg.keysightMode || 'ETH'; const kr = cfg.keysightIp || '127.0.0.1'; configs.push({ name: 'Keysight_34461A', conn: km === 'USB_COM' ? 'usb://' + kr : km === 'USB_VISA' ? 'visa://' + kr : kr, baud: Number(cfg.keysightPort || (km === 'ETH' ? 5025 : 9600)) }); }
    if (required.has('AimTTi_PL303') && !excludedInstruments.includes('AimTTi_PL303')) configs.push({ name: 'AimTTi_PL303', conn: ((cfg.pl303Mode === 'ETHERNET') ? (cfg.pl303Host || cfg.ttiHost || 'mock') : (cfg.pl303Com || cfg.ttiPort || 'mock')), baud: Number((cfg.pl303Mode === 'ETHERNET') ? (cfg.pl303Port || 9221) : (cfg.pl303Baud || cfg.ttiBaud || 9600)) });
    if (configs.length) {
      const statuses = await guardedUi('Auto collegamento strumenti necessari', () => api.reconnectHardware(configs), { timeoutMs: Math.max(4500, configs.length * 3200), logTo: document.getElementById('run-log'), fallback: [] });
      latestHardwareStatuses = Array.isArray(statuses) ? statuses : latestHardwareStatuses;
    } else {
      try { latestHardwareStatuses = await api.getHardwareStatuses(); } catch {}
    }
    updateHwBadges(latestHardwareStatuses);
    renderProductionHardwareList();
    if (showLog) addLog(document.getElementById('run-log'), '🔌 Auto collegamento strumenti necessari completato.', 'info');
  } catch(e) { addLog(document.getElementById('run-log'), `❌ Auto collegamento strumenti: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

function renderProductionHardwareList() {
  const box = document.getElementById('prod-hardware-list');
  if (!box) return;
  const expected = getRequiredInstrumentsForRecipe();
  const byName = new Map((latestHardwareStatuses || []).map(s => [s.name, s]));
  if (!expected.length) { box.innerHTML = '<div class="hint">Questa ricetta non richiede strumenti automatici. Verifica eventuali operazioni manuali prima di START.</div>'; return; }
  box.innerHTML = expected.map(name => {
    const st = byName.get(name) || { name, status:'NON RILEVATO', mock:true };
    const excluded = excludedInstruments.includes(name);
    const live = isHardwareLiveStatus(st);
    const displayName = getInstrumentDisplayName(name);
    const conn = st.conn || st.port || st.host || st.connection || '-';
    return `<div class="prod-hw-row">
      <div><b>${escapeHtml(displayName)}</b><div class="detail-line">${excluded ? 'ESCLUSO' : (live ? 'LIVE' : 'NON LIVE')}</div></div>
      <div class="detail-line">${escapeHtml(String(conn))}</div>
      <span class="state-led ${live ? 'high' : 'low'}">${excluded ? 'SKIP' : (live ? 'LIVE' : 'ERR')}</span>
      <button class="btn btn-ghost btn-xs" onclick="toggleInstrumentExcluded('${escapeHtml(name)}')">${excluded ? 'Includi' : 'Escludi'}</button>
    </div>`;
  }).join('');
}
async function toggleInstrumentExcluded(name) {
  const idx = excludedInstruments.indexOf(name);
  if (idx >= 0) excludedInstruments.splice(idx, 1); else excludedInstruments.push(name);
  try { await api?.saveAppSettings?.({ excludedInstruments }); } catch {}
  renderProductionHardwareList();
  addLog(document.getElementById('run-log'), `${idx >= 0 ? 'Incluso' : 'Escluso'} strumento: <b>${escapeHtml(name)}</b>`, 'info');
}


function setProductionFinalStatus(status) {
  const b = document.getElementById('prod-status-banner');
  if (!b) return;
  const st = String(status || 'todo').toLowerCase();
  const cls = st.includes('pass') ? 'pass' : st.includes('fail') ? 'fail' : (st.includes('running') || st.includes('run')) ? 'running' : 'todo';
  b.className = 'prod-status-banner ' + cls;
  b.textContent = cls === 'pass' ? 'PASS' : cls === 'fail' ? 'FAIL' : cls === 'running' ? 'IN ESECUZIONE' : 'DA FARE';
}


function formatDurationMs(ms) {
  ms = Math.max(0, Number(ms || 0));
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  return h > 0 ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function estimateRecipeDurationMs() {
  try {
    return (recipe?.steps || []).filter(s => s.enabled !== false).reduce((sum, s) => {
      let t = Number(s.timeout || 0);
      if (String(s.type || '') === 'Delay') t = Math.max(t, Number(s.value || 0));
      if (String(s.type || '') === 'ManualMeasurement') t += Number(s.stable_time_ms || 0);
      if (String(s.type || '') === 'DigitalOutputSet' && s.output_mode === 'timed') t += Number(s.timeout || s.value || 0);
      if (String(s.type || '') === 'DigitalOutputSet' && s.output_mode === 'pulse') {
        const hz = Math.max(0.1, Number(s.frequency_hz || 1));
        const count = Math.max(1, Number(s.pulse_count || 1));
        t += Math.round((count / hz) * 1000);
      }
      return sum + Math.max(250, t || 500);
    }, 0);
  } catch { return 0; }
}
function setProductionTimingState(stateText) {
  const normalized = String(stateText || 'READY').toUpperCase();
  const stateEl = document.getElementById('prod-execution-state');
  if (stateEl) {
    stateEl.textContent = normalized;
    stateEl.classList.toggle('running-blink', normalized.includes('RUN') || normalized.includes('ESECUZ'));
  }
  const cell = document.getElementById('prod-state-cell');
  if (cell) {
    cell.className = 'prod-time-cell ' + (normalized.includes('PASS') ? 'pass' : normalized.includes('FAIL') ? 'fail' : normalized.includes('STOP') ? 'stop' : normalized.includes('RUN') || normalized.includes('ESECUZ') ? 'running' : '');
  }
}
function startProductionTimer() {
  testRunStartTs = Date.now();
  if (testElapsedTimer) clearInterval(testElapsedTimer);
  testElapsedTimer = setInterval(updateProductionTiming, 1000);
  updateProductionTiming();
}
function stopProductionTimer() {
  if (testElapsedTimer) { clearInterval(testElapsedTimer); testElapsedTimer = null; }
  updateProductionTiming();
}
function updateProductionTiming() {
  const est = document.getElementById('prod-estimated-time');
  if (est) est.textContent = formatDurationMs(estimateRecipeDurationMs());
  const real = document.getElementById('prod-real-time');
  if (real) real.textContent = testRunStartTs ? formatDurationMs(Date.now() - testRunStartTs) : '00:00';
}

function updateProductionTestMode() {
  const total = recipe?.steps?.length || 0;
  let pass = 0, fail = 0, running = 0;
  for (const st of Object.values(stepStatusMap || {})) {
    if (st === 'pass') pass++;
    else if (st === 'fail') fail++;
    else if (st === 'running') running++;
  }
  const doneRaw = Math.min(total, pass + fail);
  const finalFailState = !!productionForceComplete || String(currentRunState || '').toUpperCase().includes('FAIL') || String(currentRunState || '').toUpperCase().includes('FAULT');
  const done = finalFailState && fail > 0 ? total : doneRaw;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const cur = recipe?.steps?.find(s => s.step_id === activeStepId);
  const runningState = currentRunState === 'RUNNING' || running > 0;
  const setText = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  setText('prod-recipe-name', recipe?.recipe_name || 'Nessuna ricetta selezionata');
  setText('prod-serial', `Commessa: ${getLotNumber() || '-'} · SN scheda: ${getSerialDutRaw() || (isSerialRequired() ? '-' : 'NON RICHIESTO')}`);
  setText('prod-state', 'Stato: ' + (currentRunState || 'READY'));
  setProductionTimingState(currentRunState || 'READY');
  updateProductionTiming();
  setText('prod-progress-percent', pct + '%');
  setText('prod-kpi-total', String(total));
  setText('prod-kpi-pass', String(pass));
  setText('prod-kpi-fail', String(fail));
  setText('prod-kpi-todo', String(Math.max(0, total - done - running)));
  setText('prod-current-step', cur ? `#${cur.step_id} — ${cur.label || cur.type || 'Step'}` : (runningState ? 'In esecuzione...' : 'Da fare'));
  const fill=document.getElementById('prod-progress-fill'); if(fill) fill.style.width = pct + '%';
  const progressWrap = document.querySelector('.prod-progress-wrap');
  if (progressWrap) progressWrap.classList.toggle('final-fail', finalFailState && fail > 0);
  const badge=document.getElementById('prod-running-badge'); if(badge) badge.style.display = runningState ? 'inline-flex' : 'none';
  setProductionFinalStatus(fail > 0 || String(currentRunState || '').toUpperCase().includes('FAIL') || String(currentRunState || '').toUpperCase().includes('FAULT') ? 'fail' : (total > 0 && done === total && fail === 0 ? 'pass' : (runningState ? 'running' : 'todo')));
  const dbg=document.getElementById('prod-debug-box'); if(dbg) dbg.classList.toggle('show', canUseProductionDebug());
  renderProductionSequenceLog();
  renderProductionHardwareList();
  const clk=document.getElementById('prod-clock'); if(clk) clk.textContent = new Date().toLocaleString();
}

function enterProductionTestMode() {
  if (!requireLogin()) return;
  productionTestMode = true;
  document.body.classList.add('production-test-active');
  refreshProductionRecipes();
  updateProductionTestMode();
  if (!productionAutoConnectDone) {
    productionAutoConnectDone = true;
    setTimeout(() => autoConnectProductionInstruments(false), 250);
  }
}

function requestExitProductionTestMode() {
  if (canExitProductionTestRole(currentUser?.role, currentUser?.level)) {
    document.body.classList.remove('production-test-active');
    productionTestMode = false;
    return;
  }
  const st = document.getElementById('exit-test-status'); if (st) st.textContent = '';
  const pw = document.getElementById('exit-test-pass'); if (pw) pw.value = '';
  document.getElementById('exit-test-modal')?.classList.add('show');
}

async function verifyExitProductionTestMode() {
  const u = document.getElementById('exit-test-user')?.value?.trim() || '';
  const p = document.getElementById('exit-test-pass')?.value || '';
  const st = document.getElementById('exit-test-status');
  if (!u || !p) { if(st) st.textContent = 'Inserisci username e password.'; return; }
  try {
    const res = api ? await (api.verifyUserCredentials ? api.verifyUserCredentials(u, p) : api.userLogin(u, p)) : { ok:false, error:'API non disponibile' };
    if (!res?.ok) { if(st) st.textContent = '❌ ' + (res?.error || 'Credenziali non valide'); return; }
    if (!canExitProductionTestRole(res.role, res.level)) { if(st) st.textContent = `❌ Ruolo non autorizzato: ${res.role || 'N/D'}`; return; }
    document.getElementById('exit-test-modal')?.classList.remove('show');
    stopPl303Live();
    try { await safePl303Off('USCITA_TEST_MODE'); } catch {}
    document.body.classList.remove('production-test-active');
    productionTestMode = false;
    addLog(document.getElementById('sys-log'), `Uscita modalità test autorizzata da <b>${escapeHtml(res.operator || u)}</b> — PL303 CH1+CH2 OFF`, 'info');
  } catch(e) { if(st) st.textContent = '❌ Errore: ' + normalizeError(e); }
}

async function emergencyStopAll() {
  pl303EmergencyLock = true;
  stopPl303Live();
  stopWizardLive();
  const live = document.getElementById('esp32-live-enable');
  if (live) { live.checked = false; toggleEsp32ControlLive(false); }
  addLog(document.getElementById('run-log'), '🚨 EMERGENZA: stop test, tutte DO LOW e scollegamento strumenti...', 'fail');
  try {
    try { await safePl303Off('EMERGENZA_RENDERER_PRE'); } catch {}
    if (api?.emergencyStopAll) {
      const res = await guardedUi('EMERGENZA', () => api.emergencyStopAll(), { timeoutMs: 9000, logTo: document.getElementById('run-log'), fallback: { ok:false, error:'timeout emergenza' } });
      addLog(document.getElementById('run-log'), `🚨 Emergenza completata: ${res?.outputsLow ?? 0} DO LOW, ${res?.errors?.length || 0} errori. Strumenti scollegati.`, res?.errors?.length ? 'warn' : 'fail');
    } else {
      await guardedUi('STOP ricetta', () => api.stopTest(), { timeoutMs: 2500, logTo: document.getElementById('run-log') });
      await esp32EmergencyLow();
    }
  } catch(e) {
    addLog(document.getElementById('run-log'), `❌ Errore emergenza: ${escapeHtml(normalizeError(e))}`, 'fail');
  } finally {
    try { await safePl303Off('EMERGENZA_RENDERER_POST'); } catch {}
    forceRunIdleUi();
    updateProductionTestMode();
  }
}


/* AT-MEC_HM_4.16B: PL303 control estratto in js/modules/hardware/pl303-control.js */

function setSerialFromQrPanel(value) {
  const v = String(value || '').trim();
  ['serial-dut','prod-serial-input','serial-dut-dash','qr-manual-input-standalone'].forEach(id => { const el=document.getElementById(id); if (el && el.value !== v) el.value = v; });
  const prodTxt = document.getElementById('prod-serial'); if (prodTxt) prodTxt.textContent = `Commessa: ${getLotNumber() || '-'} · SN scheda: ${v || '-'}`;
  if (v) localStorage.setItem('atmec_last_serial', v);
}

async function scanSerialPorts() {
  const list = document.getElementById('serial-port-list');
  const sel = document.getElementById('cfg-esp-com');
  if (!api) { list.innerHTML = '<div class="detail-line">Disponibile solo in Electron.</div>'; return; }
  try {
    serialPortsCache = await api.scanSerialPorts();
    sel.innerHTML = '<option value="mock">mock</option>' + serialPortsCache.map(p => `<option value="${escapeHtml(p.path)}">${escapeHtml(p.friendlyName || p.path)}${p.likelyEsp32 ? ' ⭐ ESP32 probabile' : ''}</option>`).join('');
    const likely = serialPortsCache.find(p => p.likelyEsp32);
    if (likely) sel.value = likely.path;
    list.innerHTML = serialPortsCache.map(p => `<div class="port-card ${p.likelyEsp32?'likely':''}"><div><b>${escapeHtml(p.path)}</b><div class="detail-line">${escapeHtml(p.manufacturer || 'periferica seriale')} ${p.serialNumber ? '— SN '+escapeHtml(p.serialNumber) : ''}</div></div><button class="btn btn-ghost btn-xs" onclick="document.getElementById('cfg-esp-com').value='${escapeHtml(p.path)}'">Usa</button></div>`).join('') || '<div class="detail-line">Nessuna periferica seriale trovata.</div>';
  } catch(e) { list.innerHTML = '❌ ' + escapeHtml(e.message); }
}

async function testManualPowerStart() {
  const old = getPowerSourceValue();
  setPowerSourceValue('MANUAL_POWER');
  addLog(document.getElementById('sys-log'), '🧪 Alimentazione manuale selezionata: il test non viene bloccato dal PL303.', 'info');
  setPowerSourceValue(old);
}


async function saveLogoBackgroundMode() {
  const mode = document.getElementById('logo-bg-mode')?.value || 'transparent';
  document.body.classList.toggle('logo-white-bg', mode === 'white');
  if (!api?.saveAppSettings) return;
  if (!userCanManageBranding()) { addLog(document.getElementById('sys-log'), 'Permesso negato: serve manage_branding per modificare lo sfondo loghi.', 'fail'); return; }
  try {
    await api.saveAppSettings({ logoBackgroundMode: mode });
    addLog(document.getElementById('sys-log'), `Sfondo loghi impostato: <b>${mode === 'white' ? 'bianco' : 'trasparente'}</b>`, 'info');
  } catch(e) { addLog(document.getElementById('sys-log'), `❌ Errore sfondo loghi: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

function applyLogoBackgroundMode(mode) {
  const selected = mode === 'white' ? 'white' : 'transparent';
  document.body.classList.toggle('logo-white-bg', selected === 'white');
  const sel = document.getElementById('logo-bg-mode');
  if (sel) sel.value = selected;
}


async function saveLogoBgKind(kind, mode) {
  if (!api?.saveAppSettings) return;
  if (!userCanManageBranding()) { addLog(document.getElementById('sys-log'), 'Permesso negato: serve manage_branding per modificare lo sfondo loghi.', 'fail'); return; }
  const cfg = await api.getAppSettings();
  const logoBgModes = { ...(cfg.logoBgModes || {}), [kind]: mode === 'white' ? 'white' : 'transparent' };
  await api.saveAppSettings({ logoBgModes });
  await loadAppSettings();
}
function applyLogoBgToElement(id, mode) {
  const el = document.getElementById(id); if (!el) return;
  el.classList.toggle('logo-white-local', mode === 'white');
  el.classList.toggle('logo-transparent-local', mode !== 'white');
}
function setLogoModeSelect(kind, mode) {
  const sel = document.querySelector(`.logo-mode-select[data-logo-kind="${kind}"]`);
  if (sel) sel.value = mode === 'white' ? 'white' : 'transparent';
}

async function selectLogo(kind) {
  if (!api) return;
  if (!userCanManageBranding()) { addLog(document.getElementById('sys-log'), 'Permesso negato: serve manage_branding per modificare i loghi.', 'fail'); return; }
  try {
    const res = await api.selectLogoFile(kind);
    if (res.ok) { await loadAppSettings(); addLog(document.getElementById('sys-log'), `Logo ${escapeHtml(kind)} salvato`, 'info'); }
  } catch(e) { addLog(document.getElementById('sys-log'), `❌ Errore logo: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}


async function resetDefaultLogos() {
  if (!api) return;
  if (!userCanManageBranding()) { addLog(document.getElementById('sys-log'), 'Permesso negato: serve manage_branding per ripristinare i loghi.', 'fail'); return; }
  try {
    const res = await api.resetDefaultLogos();
    if (res?.ok) { await loadAppSettings(); addLog(document.getElementById('sys-log'), 'Loghi default M/MEC/MIRZA ripristinati.', 'pass'); }
  } catch(e) { addLog(document.getElementById('sys-log'), `❌ Errore reset loghi: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

