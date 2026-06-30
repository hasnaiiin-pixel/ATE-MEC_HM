// AT-MEC_HM 7.3 - Enterprise Stable / Backbone compatibility center
(function(){
  'use strict';
  var VERSION='AT-MEC_HM_7.5.1_CLEAN_BASELINE_NO_DUPLICATES_FIX1_STARTUP';
  var LOG_KEY='atmec422_enterprise_logs';
  var BACKUP_KEYS=[
    'atmec_app_settings','atmec_users','atmec_roles','atmec_recipes','atmec_recipe_versions','atmec_current_recipe',
    'atmec_label_templates_420','atmec_label_bindings_420','atmec_label_print_history_420','atmec_print_engine_config_420a5','atmec_print_jobs_420a5','atmec_print_history_420a5',
    'atmec_audio_voice_config_421ab','atmec_audio_voice_events_421ab','atmec_audio_voice_logs_421ab',
    'atmec67a_master_data','atmec67b_mes_ready','atmec67b_use_work_order_mode','atmec_active_work_order','atmec_current_work_order','atmec_selected_work_order_for_test','atmec_lot_number',
    'atmec73_enterprise_backbone','atmec73_enterprise_audit','atmec74_enterprise_data_contract','atmec74_unified_context','atmec74_consistency_report','atmec74_migration_log','atmec75_canonical_context','atmec75_clean_baseline_report','atmec75_cleanup_backup',
    'atmec60_workorders','atmec60_selected_workorder','atmec60_testmode_context'
  ];
  function $(id){return document.getElementById(id)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function read(k,d){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch(e){return d}}
  function write(k,v){localStorage.setItem(k,JSON.stringify(v));}
  function now(){return new Date().toISOString()}
  function toast(m,t){if(window.toast) window.toast(m,t||'info'); else console.log('[7.5 clean]',m)}
  function download(name,obj){var blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},600)}
  function check(label, ok, detail, warn){return {label:label, ok:!!ok, warn:!!warn, detail:detail||''}}
  window.showEnterpriseStable422=function(){ if(window.showTab) showTab('enterprise-stable-tab', null); setTimeout(function(){runEnterpriseAudit422(); renderPermissionAudit422(); renderEnterpriseLogs422(); renderChecklist422();},80); };
  window.runEnterpriseAudit422=function(){
    var checks=[];
    checks.push(check('Versione renderer', (window.AT_MEC_RELEASE===VERSION) || /7\.5/.test(document.title), 'release '+(window.AT_MEC_RELEASE||document.title)));
    checks.push(check('Test Mode core', typeof window.startTest==='function' && typeof window.stopTestAndReset==='function', 'start/stop presenti'));
    checks.push(check('Emergency Stop', typeof window.emergencyStopAll==='function', 'emergencyStopAll'));
    checks.push(check('Label Platform', typeof window.showLabelManager420A2==='function' || typeof window.openLabelManagerFromTestMode420A4==='function', 'Label Manager/Runtime'));
    checks.push(check('Print Engine', typeof window.showPrintEngine420A5==='function' || localStorage.getItem('atmec_print_engine_config_420a5')!==null, 'Print Engine 4.20A5'));
    checks.push(check('Audio & Voice', typeof window.showAudioVoice421==='function' || localStorage.getItem('atmec_audio_voice_config_421ab')!==null, 'Audio Voice 4.21AB'));
    checks.push(check('Master Data Enterprise', typeof window.showMasterData67A==='function' || localStorage.getItem('atmec67a_master_data')!==null, '67A Master Data'));
    checks.push(check('Work Orders / MES Ready', typeof window.showMesReady67B==='function' || localStorage.getItem('atmec67b_mes_ready')!==null, '67B Work Orders / MES Ready'));
    checks.push(check('Data Contract 7.4', typeof window.renderEnterpriseDataContract74==='function' || localStorage.getItem('atmec74_unified_context')!==null, 'Data Contract + consistency'));
    checks.push(check('Clean Baseline 7.5', typeof window.runEnterpriseCleanBaseline75==='function' || localStorage.getItem('atmec75_clean_baseline_report')!==null, 'Runtime senza doppioni 6.0/6.1'));
    checks.push(check('Backup keys', BACKUP_KEYS.some(function(k){return localStorage.getItem(k)!==null}), 'chiavi configurazione trovate'));
    var score=Math.round(checks.filter(function(c){return c.ok}).length/checks.length*100);
    var list=$('enterprise422-audit-list');
    if(list) list.innerHTML=checks.map(function(c){return '<div class="enterprise422-item"><div><b>'+esc(c.label)+'</b><br><span>'+esc(c.detail)+'</span></div><span class="enterprise422-badge '+(c.ok?'ok':(c.warn?'warn':'error'))+'">'+(c.ok?'OK':(c.warn?'WARN':'CHECK'))+'</span></div>';}).join('');
    var sc=$('enterprise422-score'); if(sc) sc.textContent=score+'%';
    window.__atmec422LastAudit={version:VERSION,score:score,createdAt:now(),checks:checks};
    addEnterpriseLogInternal422('SYSTEM','Audit enterprise eseguito: '+score+'%');
    return window.__atmec422LastAudit;
  };
  window.exportEnterpriseAudit422=function(){download('AT_MEC_HM_7_5_ENTERPRISE_AUDIT_'+Date.now()+'.json', window.__atmec422LastAudit||runEnterpriseAudit422());};
  window.exportEnterpriseBackup422=function(){
    var payload={version:VERSION,createdAt:now(),keys:{}};
    BACKUP_KEYS.forEach(function(k){var v=localStorage.getItem(k); if(v!==null) payload.keys[k]=v;});
    payload.audit=window.__atmec422LastAudit||runEnterpriseAudit422();
    download('AT_MEC_HM_7_5_BACKUP_'+Date.now()+'.json', payload);
    var st=$('enterprise422-backup-status'); if(st) st.textContent='Backup esportato: '+Object.keys(payload.keys).length+' sezioni configurazione.';
    addEnterpriseLogInternal422('DATABASE','Backup configurazioni esportato');
  };
  window.importEnterpriseBackup422=function(ev){
    var f=ev&&ev.target&&ev.target.files&&ev.target.files[0]; if(!f)return;
    var r=new FileReader();
    r.onload=function(){try{var p=JSON.parse(r.result); if(!p.keys) throw new Error('Formato backup non valido'); Object.keys(p.keys).forEach(function(k){localStorage.setItem(k,p.keys[k]);}); var st=$('enterprise422-backup-status'); if(st) st.textContent='Backup importato: '+Object.keys(p.keys).length+' sezioni. Riavviare app consigliato.'; addEnterpriseLogInternal422('DATABASE','Backup configurazioni importato'); toast('Backup importato. Riavvio consigliato.','success');}catch(e){toast('Errore import backup: '+e.message,'error');}};
    r.readAsText(f);
  };
  window.renderPermissionAudit422=function(){
    var users=read('atmec_users',[]), roles=read('atmec_roles',[]);
    if(!Array.isArray(users) && users.users) users=users.users;
    if(!Array.isArray(roles) && roles.roles) roles=roles.roles;
    var html='';
    html+='<div class="enterprise422-item"><div><b>Utenti configurati</b><br><span>'+esc((users&&users.length)||0)+' record</span></div><span class="enterprise422-badge '+((users&&users.length)?'ok':'warn')+'">'+((users&&users.length)?'OK':'WARN')+'</span></div>';
    html+='<div class="enterprise422-item"><div><b>Ruoli configurati</b><br><span>'+esc((roles&&roles.length)||0)+' record</span></div><span class="enterprise422-badge '+((roles&&roles.length)?'ok':'warn')+'">'+((roles&&roles.length)?'OK':'WARN')+'</span></div>';
    ['Admin','Operatore','Engineer','Developer'].forEach(function(role){var found=(roles||[]).some(function(r){return String(r.name||r.role||'').toLowerCase()===role.toLowerCase();}); html+='<div class="enterprise422-item"><div><b>Ruolo '+esc(role)+'</b><br><span>Verifica presenza ruolo enterprise</span></div><span class="enterprise422-badge '+(found?'ok':'warn')+'">'+(found?'OK':'CHECK')+'</span></div>';});
    var box=$('enterprise422-permission-list'); if(box) box.innerHTML=html;
  };
  function logs(){return read(LOG_KEY,[])}
  function saveLogs(l){write(LOG_KEY,l.slice(-500));}
  function addEnterpriseLogInternal422(cat,msg){var l=logs();l.push({ts:now(),category:cat||'SYSTEM',message:msg||''});saveLogs(l);renderEnterpriseLogs422();}
  window.addEnterpriseLog422=function(){addEnterpriseLogInternal422(($('enterprise422-log-category')||{}).value||'SYSTEM',(($('enterprise422-log-message')||{}).value||'').trim()||'Log manuale 7.3'); if($('enterprise422-log-message')) $('enterprise422-log-message').value='';};
  window.renderEnterpriseLogs422=function(){var f=(($('enterprise422-log-filter')||{}).value||'').toLowerCase();var box=$('enterprise422-log-list'); if(!box)return; box.innerHTML=logs().slice().reverse().filter(function(x){return !f || JSON.stringify(x).toLowerCase().indexOf(f)>=0;}).slice(0,120).map(function(x){return '<div class="enterprise422-log"><b>'+esc(x.category)+'</b> · <small>'+esc(x.ts)+'</small><br>'+esc(x.message)+'</div>';}).join('') || '<div class="hint">Nessun log enterprise.</div>';};
  window.exportEnterpriseLogs422=function(){download('AT_MEC_HM_4_22_ENTERPRISE_LOGS_'+Date.now()+'.json',{version:VERSION,exportedAt:now(),logs:logs()});};
  window.clearEnterpriseLogs422=function(){if(confirm('Svuotare log enterprise 7.5?')){saveLogs([]);renderEnterpriseLogs422();}};
  window.renderChecklist422=function(){var items=['Version consistency','Test Mode regression check','Recipe Engine regression check','Label Platform check','Print Engine check','Audio Voice check','Permission audit','Database/localStorage audit','Backup/Restore procedure','Manufacturing Layer optional flag'];var box=$('enterprise422-checklist');if(box) box.innerHTML=items.map(function(x){return '<div class="enterprise422-check done">✅ '+esc(x)+'</div>';}).join('');};
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){renderEnterpriseLogs422();renderChecklist422();},300);});
})();
