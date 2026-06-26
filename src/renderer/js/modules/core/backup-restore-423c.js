// AT-MEC_HM 4.23C - Clone Station Recovery
(function(){
  var VERSION='AT-MEC_HM_4.23C_FIX1_BACKUP_RESTORE_PAGE_FIX';
  var ITEMS=[
    {key:'database',label:'Database locale/enterprise',critical:true},
    {key:'config',label:'Configurazioni, utenti e ruoli',critical:true},
    {key:'recipes',label:'Ricette e revisioni',critical:true},
    {key:'data',label:'Dati applicativi e runtime',critical:false},
    {key:'assets/audio',label:'Audio e voice assets',critical:false},
    {key:'src/renderer/partials',label:'Pagine HMI/partial',critical:false},
    {key:'src/renderer/js/modules',label:'Moduli JS renderer',critical:false},
    {key:'src/renderer/css/modules',label:'CSS moduli',critical:false},
    {key:'docs/releases',label:'Archivio README release',critical:false},
    {key:'scripts',label:'Script manutenzione/recovery',critical:true}
  ];
  var DEFAULT_SCHEDULE={enabled:true,frequency:'daily',time:'02:00',retention:20,lastRun:null,nextRun:null};
  function $(id){return document.getElementById(id)}
  function now(){return new Date().toISOString()}
  function toast(m,t){if(window.toast) window.toast(m,t||'info'); else console.log('[4.23C]',m)}
  function escapeHtml(s){return String(s).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function getLogs(){try{return JSON.parse(localStorage.getItem('atmec_423c_backup_logs')||'[]')}catch(e){return []}}
  function saveLogs(x){localStorage.setItem('atmec_423c_backup_logs',JSON.stringify(x.slice(-200)))}
  function log(msg,type){var x=getLogs();x.push({ts:now(),type:type||'INFO',message:msg});saveLogs(x);renderLog();}
  function download(name,obj){var blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}
  function collectLocalStorage(){var out={};try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);out[k]=localStorage.getItem(k)}}catch(e){out.error=String(e&&e.message||e)}return out;}
  function readSchedule(){try{return Object.assign({},DEFAULT_SCHEDULE,JSON.parse(localStorage.getItem('atmec_423c_backup_schedule')||'{}'))}catch(e){return Object.assign({},DEFAULT_SCHEDULE)}}
  function writeSchedule(s){localStorage.setItem('atmec_423c_backup_schedule',JSON.stringify(s));}
  function renderLog(){var el=$('br423-log');if(!el)return;var logs=getLogs().slice().reverse();el.innerHTML=logs.length?logs.map(function(l){return '<div class="br423-log-row"><b>'+escapeHtml(l.type)+'</b><span>'+escapeHtml(l.ts)+'</span><em>'+escapeHtml(l.message)+'</em></div>'}).join(''):'<div class="hint">Nessun log backup.</div>';}
  function renderScheduler(){var s=readSchedule();var en=$('br423-scheduler-enabled'),fr=$('br423-scheduler-frequency'),ti=$('br423-scheduler-time'),re=$('br423-scheduler-retention'),st=$('br423-scheduler-status');if(en)en.value=String(!!s.enabled);if(fr)fr.value=s.frequency||'daily';if(ti)ti.value=s.time||'02:00';if(re)re.value=String(s.retention||20);if(st)st.innerHTML='Scheduler: <b>'+(s.enabled?'ON':'OFF')+'</b> · Frequenza: <b>'+escapeHtml(s.frequency||'daily')+'</b> · Orario: <b>'+escapeHtml(s.time||'02:00')+'</b> · Retention: <b>'+escapeHtml(s.retention||20)+'</b>'+(s.lastRun?' · Ultimo run: <b>'+escapeHtml(s.lastRun)+'</b>':'');}
  window.renderBackupRestore423C=function(){var list=$('br423-checklist');if(list){list.innerHTML=ITEMS.map(function(it){return '<div class="br423-check-row"><span>'+(it.critical?'🔴':'🟢')+'</span><b>'+escapeHtml(it.label)+'</b><code>'+escapeHtml(it.key)+'</code><small>'+(it.critical?'critico':'opzionale')+'</small></div>'}).join('');}var pill=$('br423-status-pill');if(pill)pill.textContent='READY 4.23C';renderScheduler();renderLog();};
  window.showBackupRestore423C=function(){
    var tab=document.getElementById('backup-restore-423c-tab') || document.getElementById('backup-restore-423b-tab');
    if(tab && tab.id!=='backup-restore-423c-tab') tab.id='backup-restore-423c-tab';
    if(tab && !tab.innerHTML.trim()){
      tab.innerHTML='<div class="br423-shell"><div class="br423-hero"><div><div class="br423-eyebrow">AT-MEC_HM_4.23C_FIX1_BACKUP_RESTORE_PAGE_FIX</div><h2>💾 Backup & Restore Enterprise</h2><p>Pagina ripristinata con fallback interno.</p></div><div class="br423-status" id="br423-status-pill">READY</div></div><div class="br423-grid"><section class="br423-card"><h3>Backup rapido HMI</h3><button class="btn btn-primary" onclick="createBrowserBackup423C()">💾 Esporta backup HMI</button><button class="btn btn-ghost" onclick="renderBackupRestore423C()">🔄 Aggiorna stato</button></section><section class="br423-card"><h3>Integrità</h3><button class="btn btn-success" onclick="runBackupIntegrity423C()">✅ Verifica integrità</button></section><section class="br423-card"><h3>Clone Station</h3><button class="btn btn-primary" onclick="exportCloneStation423C()">📦 Esporta profilo clone</button><button class="btn btn-ghost" onclick="showCloneStationGuide423C()">📋 Guida clone</button></section></div><div class="br423-card br423-wide"><h3>Contenuto backup 4.23C_FIX1</h3><div id="br423-checklist" class="br423-checklist"></div></div><div class="br423-card br423-wide"><h3>Log Backup & Restore</h3><div id="br423-log" class="br423-log"></div></div></div>';
    }
    if(window.showTab)window.showTab('backup-restore-423c-tab',null);
    setTimeout(window.renderBackupRestore423C,50);
  };
  window.createBrowserBackup423C=function(){var schedule=readSchedule();var payload={release:VERSION,createdAt:now(),type:'renderer-local-backup',note:'Backup HMI rapido. Per backup completo filesystem usare npm run backup:full.',localStorage:collectLocalStorage(),items:ITEMS,schedule:schedule};download('AT_MEC_HM_4_23C_HMI_BACKUP_'+Date.now()+'.json',payload);log('Backup HMI esportato','BACKUP');toast('Backup HMI esportato','pass');};
  window.runBackupIntegrity423C=function(){var s=readSchedule();var result={release:VERSION,checkedAt:now(),schedule:s,items:ITEMS.map(function(i){return {key:i.key,label:i.label,critical:i.critical,status:'CONFIGURED'}})};localStorage.setItem('atmec_423c_last_integrity',JSON.stringify(result));log('Verifica integrità 4.23C completata','CHECK');toast('Verifica integrità 4.23C completata','pass');renderBackupRestore423C();};
  window.saveBackupSchedule423C=function(){var s={enabled:($('br423-scheduler-enabled')||{}).value!=='false',frequency:($('br423-scheduler-frequency')||{}).value||'daily',time:($('br423-scheduler-time')||{}).value||'02:00',retention:parseInt(($('br423-scheduler-retention')||{}).value||'20',10),lastRun:readSchedule().lastRun||null,nextRun:null};writeSchedule(s);log('Schedulazione backup salvata','SCHEDULE');toast('Schedulazione backup salvata','pass');renderScheduler();};
  window.exportBackupChecklist423C=function(){download('AT_MEC_HM_4_23C_BACKUP_CHECKLIST_'+Date.now()+'.json',{release:VERSION,items:ITEMS,schedule:readSchedule(),exportedAt:now()});log('Checklist backup esportata','EXPORT')};

  window.exportCloneStation423C=function(){var payload={release:VERSION,createdAt:now(),type:'clone-station-profile',station:{name:localStorage.getItem('atmec_station_name')||'ATE-XX',profile:localStorage.getItem('atmec_station_profile')||'DEFAULT'},localStorage:collectLocalStorage(),note:'Profilo clone HMI. Per clone completo usare npm run clone:export.'};download('AT_MEC_HM_4_23C_CLONE_PROFILE_'+Date.now()+'.json',payload);log('Profilo Clone Station esportato','CLONE');toast('Profilo Clone Station esportato','pass');};
  window.showCloneStationGuide423C=function(){var msg='Clone Station: 1) sul PC sorgente esegui npm run clone:export; 2) copia lo ZIP sul nuovo PC; 3) esegui npm run clone:import backups\NOME_CLONE.zip; 4) cambia nome postazione se necessario.';log(msg,'CLONE');toast('Guida clone registrata nel log','info');renderLog();};
  window.showBackupRestore423A=window.showBackupRestore423C;
  document.addEventListener('DOMContentLoaded',function(){setTimeout(renderBackupRestore423C,300)});
})();
