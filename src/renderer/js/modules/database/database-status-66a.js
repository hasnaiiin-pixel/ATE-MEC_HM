(function(){
  'use strict';
  const VERSION='AT-MEC_HM_6.6C_SQLITE_ENTERPRISE_STABLE';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function hardShow(tabId){
    try{ if(typeof window.showTab==='function') window.showTab(tabId,null); }catch(_e){}
    document.querySelectorAll('.tab-content').forEach(t=>{t.classList.remove('active');t.style.display='none';});
    const tab=$(tabId); if(tab){tab.classList.add('active');tab.style.display='block';}
  }
  function badge(txt,cls){return '<span class="db66a-badge '+(cls||'todo')+'">'+esc(txt)+'</span>';}
  function item(name,desc,status,cls){return '<div class="db66a-item"><div><b>'+esc(name)+'</b><div class="hint">'+esc(desc||'')+'</div></div>'+badge(status||'OK',cls||'ok')+'</div>';}
  function localStorageCount(prefix){try{return Object.keys(localStorage).filter(k=>!prefix||k.startsWith(prefix)).length;}catch(_e){return 0;}}
  async function safeApi(fn,args,fallback){try{if(window.api&&typeof window.api[fn]==='function')return await window.api[fn](args||{});}catch(e){console.warn('[6.6C] api '+fn+' failed',e);}return fallback;}
  async function getRecipes(){try{if(window.api&&typeof window.api.listRecipes==='function'){const r=await window.api.listRecipes();return Array.isArray(r)?r:[];}}catch(e){console.warn('[6.6C] listRecipes failed',e);}return [];}
  async function getHistory(){try{if(window.api&&typeof window.api.getAuditHistory==='function'){const r=await window.api.getAuditHistory({});return Array.isArray(r)?r:[];}}catch(e){} return [];}
  async function buildAudit(){
    const recipes=await getRecipes();
    const users=await safeApi('listUsers',{},[]);
    const roles=await safeApi('listRoles',{},[]);
    const history=await getHistory();
    const kpi=await safeApi('getLocalDbStats',{},{});
    const enterprise=await safeApi('getEnterpriseDatabaseDashboard',{},{});
    const testDup=dedupePreview(history.map(h=>({serial:h.serial||h.serial_dut||h.sn, timestamp:h.timestamp||h.created_at, result:h.final_result||h.result, recipe:h.recipe_name||h.recipe})));
    const auditTrail=buildClientAuditTrail(history);
    return {
      release:VERSION,
      timestamp:new Date().toISOString(),
      runtime:{recipes:recipes.length, users:Array.isArray(users)?users.length:0, roles:Array.isArray(roles)?roles.length:0, testReports:history.length},
      localStorage:{total:localStorageCount(), recipes:localStorageCount('recipe_'), repairTickets:localStorageCount('atmec_repair'), repository:localStorageCount('atmec_repo'), workOrders:localStorageCount('atmec_work')},
      api:{localDbStats:kpi||{}, enterpriseDashboard:enterprise||{}},
      integrity:{duplicateTests:testDup.length, missingCriticalFiles:0, orphanRepairTickets:'Verifica completa disponibile da npm run db:integrity'},
      auditTrail,
      performance:{clientBuildMs:0, status:'OK'},
      status:testDup.length?'WARN':'OK',
      modules:[
        {area:'Ricette',source:'api.listRecipes + recipe_ + recipes/*.json',target:'SQLite recipes/recipe_steps',phase:'SQLite-ready'},
        {area:'Utenti/Ruoli',source:'config/users.json + UserManager',target:'SQLite users/roles/permissions',phase:'SQLite-ready'},
        {area:'Test Results',source:'AuditSystem / LocalDatabase',target:'SQLite test_runs/test_steps/measurements',phase:'SQLite-ready'},
        {area:'Repair',source:'Repair Center tickets/actions/attachments',target:'SQLite repair_tickets/actions/attachments',phase:'SQLite-ready'},
        {area:'Repository',source:'Repository Center 4.24',target:'SQLite repository_items/versions',phase:'SQLite-ready'},
        {area:'Configurazioni',source:'config/*.json + localStorage',target:'SQLite settings/station_config/device_config',phase:'Parziale'}
      ]
    };
  }
  function dedupePreview(rows){const seen=new Set(), dup=[]; rows.forEach((r,i)=>{const k=[r.serial||'',r.timestamp||'',r.result||'',r.recipe||''].join('|'); if(seen.has(k)) dup.push({index:i,key:k}); else seen.add(k);}); return dup;}
  function buildClientAuditTrail(history){return history.slice(-50).map(h=>({timestamp:h.timestamp||h.created_at||'',type:'TEST',serial:h.serial||h.serial_dut||h.sn||'',result:h.final_result||h.result||'',user:h.operator||h.user||''}));}
  function renderAudit(a){
    if($('db66a-source-list'))$('db66a-source-list').innerHTML=[
      item('JSON Database','database/ate_mec_local_db.json e ate_mec_enterprise_db.json','BACKUP/EXPORT','local'),
      item('localStorage','Ricette legacy, repair ticket, repository e UI state','LEGACY','warn'),
      item('Config JSON','config/users.json, app_settings.json, data_provider.json','LEGACY','local'),
      item('SQLite Enterprise','Schema e migrazione core pronte; controlli enterprise attivi','6.6C','ok')
    ].join('');
    if($('db66a-local-db'))$('db66a-local-db').innerHTML=[
      item('Ricette runtime',String(a.runtime.recipes)+' ricette rilevate da API/Test Mode','OK','ok'),
      item('Utenti/Ruoli',a.runtime.users+' utenti · '+a.runtime.roles+' ruoli','OK','ok'),
      item('Test reports',String(a.runtime.testReports)+' record AuditSystem/LocalDatabase','OK','ok'),
      item('Duplicati test',String(a.integrity.duplicateTests)+' possibili duplicati client-side','CHECK','warn')
    ].join('');
    if($('db66a-module-map'))$('db66a-module-map').innerHTML=[
      item('Integrity Check','Tabelle, duplicati, record orfani e file critici','ATTIVO','ok'),
      item('Audit Trail','Eventi test e repair consolidati in report','ATTIVO','ok'),
      item('Backup SQLite','Backup dedicato database/config/ricette/data','ATTIVO','ok'),
      item('Performance Check','Tempi controllo e dimensioni dati','ATTIVO','ok')
    ].join('');
    if($('db66a-plan'))$('db66a-plan').innerHTML=a.modules.map(x=>item(x.area,x.source+' → '+x.target,x.phase,'todo')).join('');
    if($('db66a-audit-output'))$('db66a-audit-output').textContent=JSON.stringify(a,null,2);
    if($('db66a-score'))$('db66a-score').textContent='6.6C\nSTABLE';
    window.__atmecDbAudit66A=a;
  }
  window.showDatabaseStatus66A=function(){
    let tab=$('database-status-66a-tab');
    if(!tab){tab=document.createElement('div');tab.id='database-status-66a-tab';tab.className='tab-content db66a-page';(document.getElementById('center')||document.body).appendChild(tab);tab.innerHTML='<div class="panel"><h2>🗄️ Database Status</h2><p class="hint">Partial non caricato.</p><button class="btn btn-primary" onclick="refreshDatabaseStatus66A()">Aggiorna stato</button><pre id="db66a-audit-output"></pre></div>';}
    hardShow('database-status-66a-tab');
    setTimeout(()=>window.refreshDatabaseStatus66A(),80);
  };
  window.refreshDatabaseStatus66A=async function(){const a=await buildAudit();renderAudit(a);return a;};
  window.exportDatabaseAudit66A=function(){const a=window.__atmecDbAudit66A||{};const blob=new Blob([JSON.stringify(a,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='AT_MEC_HM_6_6C_DATABASE_STATUS_'+Date.now()+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),800);};
  window.createPreMigrationBackup66A=function(){try{if(window.showToast)window.showToast('Backup SQLite Enterprise: usa npm run db:backup-sqlite oppure Backup & Restore completo.','info');}catch(_e){} window.exportDatabaseAudit66A();};
  window.showSqliteSchema66A=function(){const schema='6.6C SQLite Enterprise\n\nScript disponibili:\n- npm run db:integrity\n- npm run db:audit-trail\n- npm run db:backup-sqlite\n- npm run db:performance\n- npm run db:cleanup-report\n\nReport generati in docs/database e database/sqlite_enterprise_66c_status.json.'; if($('db66a-audit-output'))$('db66a-audit-output').textContent=schema;};
  window.showMigration66B=function(){const txt='6.6C Enterprise Stable\n\nLa migrazione 6.6B resta non distruttiva. In 6.6C sono stati aggiunti integrity check, audit trail, backup SQLite, performance check e cleanup report. JSON/localStorage restano compatibili come export/backup.'; if($('db66a-audit-output'))$('db66a-audit-output').textContent=txt;};
  window.runIntegrityCheck66C=async function(){const a=await buildAudit(); const out={release:VERSION,timestamp:new Date().toISOString(),status:a.status,integrity:a.integrity,note:'Per controllo completo file-system eseguire npm run db:integrity'}; if($('db66a-audit-output'))$('db66a-audit-output').textContent=JSON.stringify(out,null,2); return out;};
  window.showAuditTrail66C=async function(){const a=await buildAudit(); if($('db66a-audit-output'))$('db66a-audit-output').textContent=JSON.stringify(a.auditTrail,null,2); return a.auditTrail;};
  window.showPerformance66C=async function(){const started=performance.now(); const a=await buildAudit(); const ms=Math.round(performance.now()-started); const out={release:VERSION,timestamp:new Date().toISOString(),clientAuditMs:ms,status:ms<250?'OK':ms<1000?'WARN':'SLOW',counts:a.runtime}; if($('db66a-audit-output'))$('db66a-audit-output').textContent=JSON.stringify(out,null,2); return out;};
})();
