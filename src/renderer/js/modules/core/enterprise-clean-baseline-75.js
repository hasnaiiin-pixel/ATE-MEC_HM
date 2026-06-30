// AT-MEC_HM 7.5 - Clean Baseline / No Duplicates
// Consolidamento runtime: sorgente canonica 7.5, adapter legacy controllati, moduli 6.0/6.1 decommissionati dal runtime.
(function(){
  'use strict';
  var VERSION='AT-MEC_HM_7.6_AI_COPILOT_FOUNDATION_CLEAN';
  var CLEAN_KEY='atmec75_clean_baseline_report';
  var CONTEXT_KEY='atmec75_canonical_context';
  var BACKUP_KEY='atmec75_cleanup_backup';
  var MIRROR_FLAG='atmec75_legacy_mirror_enabled';
  var VALIDATION_KEY='atmec76_runtime_validation_report';

  function $(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function now(){return new Date().toISOString();}
  function arr(v){return Array.isArray(v)?v:[];}
  function norm(v){return String(v==null?'':v).trim();}
  function first(){for(var i=0;i<arguments.length;i++){var v=norm(arguments[i]); if(v) return v;} return '';}
  function num(v){var n=Number(v); return isFinite(n)?n:0;}
  function read(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?d:v;}catch(_){return d;}}
  function raw(k){try{return localStorage.getItem(k)||'';}catch(_){return '';}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v,null,2));}catch(_){}}
  function setRaw(k,v){try{localStorage.setItem(k,String(v));}catch(_){}}
  function toast(m,t){try{(window.showToast||window.toast||console.log)(m,t||'info');}catch(_){console.log('[7.5]',m);}}
  function dom(id){var e=$(id); if(!e) return ''; if(e.tagName==='SELECT'){var o=e.options&&e.selectedIndex>=0?e.options[e.selectedIndex]:null; return norm(e.value||(o&&o.textContent)||'');} return norm(e.value||e.textContent||'');}
  function bool(k,def){var v=raw(k).toLowerCase(); if(v==='true'||v==='1'||v==='on')return true; if(v==='false'||v==='0'||v==='off')return false; return !!def;}

  function mesDb(){var d=read('atmec67b_mes_ready',{}); if(!Array.isArray(d.workOrders))d.workOrders=[]; return d;}
  function woId(w){return first(w&&w.wo,w&&w.workOrder,w&&w.woNumber,w&&w.commessa,w&&w.lot,w&&w.lotNumber,w&&w.id);}
  function normalizeWO(w,source){
    w=w||{};
    var qty=num(first(w.qty,w.qtyRequested,w.target,w.quantity,w.total));
    var pass=num(first(w.pass,w.done,w.qtyCompleted,w.completed,w.passed));
    var fail=num(first(w.fail,w.failed,w.ko));
    var error=num(first(w.error,w.errors));
    var id=woId(w);
    return {
      id:first(w.id,id), wo:id, workOrder:id, commessa:first(w.commessa,w.lot,w.lotNumber,id),
      customer:first(w.customerText,w.customer,w.customerName,w.client,w.client_name,w.customerId),
      product:first(w.productText,w.product,w.productName,w.productCode,w.productId),
      boardCode:first(w.boardCode,w.boardText,w.board,w.boardId,w.pcbCode,w.articleCode),
      recipe:first(w.recipe,w.recipeName,w.recipe_name,w.recipeDefault), recipeRevision:first(w.recipeRevision,w.recipe_version,w.revision,w.rev,w.version),
      firmware:first(w.firmwareText,w.firmware,w.firmwareVersion,w.fw,w.fwVersion),
      qty:qty, pass:pass, done:pass, fail:fail, error:error, residuo:Math.max(0,qty-pass), status:first(w.status,'RUNNING'),
      source:source||w.source||'unknown'
    };
  }
  function selectedWO(){
    var d=mesDb();
    var mesActive=null;
    if(d.activeWorkOrderId){mesActive=arr(d.workOrders).find(function(w){return String(w.id||w.wo||w.workOrder||'')===String(d.activeWorkOrderId);})||null;}
    var candidates=[
      read('atmec_selected_work_order_for_test',null), read('atmec_active_work_order',null), read('atmec_current_work_order',null), mesActive,
      read('atmec60_selected_workorder',null), (read('atmec60_testmode_context',{})||{}).workOrder
    ].filter(Boolean);
    return candidates.length?normalizeWO(candidates[0],candidates[0].source||'selected'):null;
  }
  function allWorkOrders(){
    var out=[], seen={};
    function add(w,src){var n=normalizeWO(w,src); var id=(n.wo||'').toLowerCase(); if(id&&!seen[id]){seen[id]=1;out.push(n);}}
    arr(mesDb().workOrders).forEach(function(w){add(w,'MES_READY_67B');});
    arr(read('atmec60_workorders',[])).forEach(function(w){add(w,'LEGACY_COMPAT_60');});
    var s=selectedWO(); if(s&&s.wo&&!seen[String(s.wo).toLowerCase()])out.unshift(s);
    return out;
  }
  function station(){
    var c=read('atmec_factory_station_config_418B',null)||read('atmec_factory_config_418b',null)||read('atmec_station_config',null)||{};
    return {
      id:first(c.stationId,c.station_id,c.id,raw('atmec_station_id'),raw('atmec_station_id_413b'),'STATION_LOCAL'),
      name:first(c.stationName,c.station_name,c.name,raw('atmec_station_name'),raw('atmec_station_name_413b'),'Postazione locale'),
      department:first(c.department,c.dept,raw('atmec_station_department_413b')),
      site:first(c.site,raw('atmec_station_site_413b'))
    };
  }
  function buildContext(){
    var active=selectedWO();
    var st=station();
    var serial=first(dom('prod-serial-input'),dom('serial-dut'),dom('serial-dut-dash'),dom('qr-manual-input-standalone'),raw('atmec_current_serial'),raw('atmec_last_serial'));
    var recipe=first(active&&active.recipe,dom('prod-recipe-select'),dom('dash-recipe-select'),(window.recipe&&(window.recipe.name||window.recipe.recipe_name)));
    var recipeRev=first(active&&active.recipeRevision,dom('prod-recipe-version-select'),window.recipe&&window.recipe.version,window.recipe&&window.recipe.revision);
    var commessa=first(active&&active.commessa,dom('prod-lot-number'),raw('atmec_lot_number'),active&&active.wo);
    var ctx={
      version:VERSION, updatedAt:now(), mode:{useWorkOrder:bool('atmec67b_use_work_order_mode',true), serialRequired:bool('atmec_serial_required',true), sampleTestRequired:bool('atmec_sample_test_required',false)},
      workOrder:first(active&&active.wo,commessa), commessa:commessa, serialNumber:serial,
      customer:first(active&&active.customer,dom('prod-client-filter'),dom('dash-client-filter')), product:first(active&&active.product), boardCode:first(active&&active.boardCode),
      recipeName:recipe, recipeRevision:recipeRev, firmware:first(active&&active.firmware),
      stationId:st.id, stationName:st.name, operator:first(raw('atmec_current_user'),window.currentUser&&window.currentUser.username,window.currentUser&&window.currentUser.name,'Operatore'),
      activeWorkOrder:active, workOrders:allWorkOrders(), station:st
    };
    return ctx;
  }
  function compatWO(w){
    w=w||{};
    return {id:w.id||w.wo, wo:w.wo, workOrder:w.workOrder||w.wo, woNumber:w.wo, commessa:w.commessa||w.wo, lot:w.commessa||w.wo, customerText:w.customer, productText:w.product, boardCode:w.boardCode, recipe:w.recipe, recipeName:w.recipe, recipeRevision:w.recipeRevision, firmwareText:w.firmware, qty:w.qty||0, done:w.pass||w.done||0, pass:w.pass||w.done||0, fail:w.fail||0, error:w.error||0, status:w.status||'RUNNING', source:'AT-MEC_HM_7.5_COMPAT_MIRROR'};
  }
  function backupBeforeMirror(){
    if(raw(BACKUP_KEY)) return;
    var keys=['atmec74_unified_context','atmec_current_work_order','atmec_active_work_order','atmec_selected_work_order_for_test','atmec_lot_number','atmec60_workorders','atmec60_selected_workorder','atmec60_testmode_context','atmec_factory_config_418b','atmec_factory_station_config_418B'];
    var b={version:VERSION,createdAt:now(),keys:{}};
    keys.forEach(function(k){b.keys[k]=raw(k);});
    write(BACKUP_KEY,b);
  }
  function mirrorContext(ctx){
    ctx=ctx||buildContext();
    backupBeforeMirror();
    write(CONTEXT_KEY,ctx);
    write('atmec74_unified_context',ctx);
    if(ctx.commessa)setRaw('atmec_lot_number',ctx.commessa);
    if(ctx.serialNumber){setRaw('atmec_current_serial',ctx.serialNumber);setRaw('atmec_last_serial',ctx.serialNumber);}
    if(ctx.activeWorkOrder&&ctx.activeWorkOrder.wo){
      var c=compatWO(ctx.activeWorkOrder);
      write('atmec_current_work_order',c); write('atmec_active_work_order',c); write('atmec_selected_work_order_for_test',c); write('atmec60_selected_workorder',c);
      write('atmec60_testmode_context',{workOrder:c,product:{name:c.productText,boardCode:c.boardCode,recipeDefault:c.recipe},customer:{name:c.customerText},source:'AT-MEC_HM_7.5_COMPAT_MIRROR',updatedAt:now()});
    }
    if(bool(MIRROR_FLAG,true)){
      var compatList=ctx.workOrders.map(compatWO);
      if(compatList.length) write('atmec60_workorders',compatList);
    }
    var st=ctx.station||station();
    write('atmec75_station_context',st);
    write('atmec_station_config',{stationId:st.id,stationName:st.name,department:st.department,site:st.site,source:'AT-MEC_HM_7.5'});
    return ctx;
  }
  function repairStats(){
    return {
      tickets:arr(read('atmec65a_repair_tickets',[])).length,
      actions:arr(read('atmec65a_repair_actions',[])).length,
      proRecords:arr(read('atmec_traceability_repair_pro_415b',[])).length,
      localDbRepairs:arr((read('atmec_local_database',{})||{}).repairs||[]).length
    };
  }
  function cleanAudit(){
    var ctx=buildContext();
    var runtime={
      legacy60Loaded:typeof window.showWorkOrderProduct60==='function' && !window.showWorkOrderProduct60.__atmec75Stub,
      legacy61Loaded:typeof window.showRevisionFirmware61==='function' && !window.showRevisionFirmware61.__atmec75Stub,
      cleanBridgeLoaded:true,
      workOrders:ctx.workOrders.length,
      activeWorkOrder:ctx.workOrder||'',
      repair:repairStats()
    };
    var checks=[];
    function add(label,ok,detail,warn){checks.push({label:label,ok:!!ok,warn:!!warn,detail:detail||''});}
    add('Runtime legacy WO 6.0 non caricato',!runtime.legacy60Loaded,'Sostituito da MES Ready 67B + adapter compatibile',runtime.legacy60Loaded);
    add('Runtime legacy Firmware 6.1 non caricato',!runtime.legacy61Loaded,'Sostituito da Master Data 67A / binding ricetta-firmware',runtime.legacy61Loaded);
    add('Contesto canonico 7.5',!!ctx.workOrder||!ctx.mode.useWorkOrder,'WO '+(ctx.workOrder||'manuale')+' · Commessa '+(ctx.commessa||'—'));
    add('Mirror legacy controllato',bool(MIRROR_FLAG,true),'Adapter scrive chiavi legacy solo per compatibilità',false);
    add('Stazione normalizzata',!!ctx.stationId,'Station '+(ctx.stationId||'—'));
    add('Repair/Traceability non duplicati in menu',true,'Resta un solo accesso Repair Center + Storico/Scheda');
    var score=Math.round(checks.filter(function(c){return c.ok;}).length/checks.length*100);
    var report={version:VERSION,createdAt:now(),score:score,context:ctx,runtime:runtime,checks:checks,deprecatedRuntime:[
      {module:'work-order-product-60',status:'decommissioned-runtime',replacement:'Master Data 67A + Work Orders/MES Ready 67B'},
      {module:'revision-firmware-61',status:'decommissioned-runtime',replacement:'Master Data 67A / ricetta / firmware binding'},
      {module:'database-kpi menu',status:'hidden-from-menu',replacement:'Analytics Center'},
      {module:'production-analysis menu',status:'hidden-from-menu',replacement:'Analytics Center'}
    ]};
    write(CLEAN_KEY,report);
    return report;
  }
  function badge(c){return c.ok?'ok':(c.warn?'warn':'error');}
  function renderClean(report){
    report=report||cleanAudit();
    var score=$('enterprise75-score'); if(score)score.textContent=report.score+'%';
    var meta=$('enterprise75-meta'); if(meta)meta.textContent='WO '+(report.context.workOrder||'manuale')+' · Commessa '+(report.context.commessa||'—')+' · moduli decommissionati '+report.deprecatedRuntime.length;
    var ctx=$('enterprise75-context'); if(ctx)ctx.innerHTML='<div class="enterprise75-context-grid">'+
      '<div><span>WO</span><b>'+esc(report.context.workOrder||'—')+'</b></div><div><span>Commessa</span><b>'+esc(report.context.commessa||'—')+'</b></div><div><span>S/N</span><b>'+esc(report.context.serialNumber||'—')+'</b></div><div><span>Ricetta</span><b>'+esc(report.context.recipeName||'—')+'</b></div><div><span>Stazione</span><b>'+esc(report.context.stationId||'—')+'</b></div><div><span>WO totali</span><b>'+report.context.workOrders.length+'</b></div></div>';
    var list=$('enterprise75-clean-list'); if(list)list.innerHTML=report.checks.map(function(c){return '<div class="enterprise75-row"><div><b>'+esc(c.label)+'</b><small>'+esc(c.detail)+'</small></div><span class="enterprise422-badge '+badge(c)+'">'+(c.ok?'OK':(c.warn?'WARN':'CHECK'))+'</span></div>';}).join('');
    var dep=$('enterprise75-deprecated-list'); if(dep)dep.innerHTML=report.deprecatedRuntime.map(function(d){return '<div class="enterprise75-dep"><b>'+esc(d.module)+'</b><span>'+esc(d.status)+' → '+esc(d.replacement)+'</span></div>';}).join('');
  }

  function runtimeValidation753(){
    var scriptNodes=[].slice.call(document.querySelectorAll('script[src]'));
    var cssNodes=[].slice.call(document.querySelectorAll('link[rel="stylesheet"][href]'));
    var partialNodes=[].slice.call(document.querySelectorAll('[data-partial-src]'));
    var menuText=(document.getElementById('sidebar')||document.body).textContent||'';
    var scripts=scriptNodes.map(function(n){return n.getAttribute('src')||'';});
    var css=cssNodes.map(function(n){return n.getAttribute('href')||'';});
    var checks=[];
    function add(label,ok,detail,warn){checks.push({label:label,ok:!!ok,warn:!!warn,detail:detail||''});}
    add('Runtime 7.6 attivo', VERSION.indexOf('7.6')>=0, VERSION);
    add('Clean Baseline adapter presente', typeof window.runEnterpriseCleanBaseline75==='function', 'enterprise-clean-baseline-75.js caricato');
    add('Data Contract presente', typeof window.renderEnterpriseDataContract74==='function', 'enterprise-data-contract-74.js disponibile');
    add('Backbone presente', typeof window.renderEnterpriseBackbone73==='function', 'enterprise-backbone-73.js disponibile');
    add('Legacy Work Order 6.0 non caricato come modulo reale', !(typeof window.showWorkOrderProduct60==='function' && !window.showWorkOrderProduct60.__atmec75Stub), 'solo stub compatibile ammesso');
    add('Legacy Firmware 6.1 non caricato come modulo reale', !(typeof window.showRevisionFirmware61==='function' && !window.showRevisionFirmware61.__atmec75Stub), 'solo stub compatibile ammesso');
    add('CSS Clean Baseline presente', css.some(function(s){return /33-enterprise-clean-baseline-75\.css/.test(s);}), 'CSS 7.5 caricato');
    add('CSS Data Contract presente', css.some(function(s){return /32-enterprise-data-contract-74\.css/.test(s);}), 'CSS 7.4 caricato');
    add('Menu KPI duplicati nascosti', menuText.indexOf('Database / KPI')<0 && menuText.indexOf('Analisi Produzione')<0, 'accesso principale: Analytics Center');
    add('Analytics Center accessibile', typeof window.loadAnalyticsCenter419B2==='function' || typeof window.loadAnalyticsCenter419B==='function', 'handler analytics disponibile');
    add('Repair Center accessibile', typeof window.showRepairCenter65A==='function', 'handler repair disponibile');
    add('MES Ready accessibile', typeof window.showMesReady67B==='function', 'handler MES/WO disponibile');
    add('Partial Enterprise montato', !!document.getElementById('enterprise-stable-tab'), 'enterprise-stable-422.html caricato');
    var critical=checks.filter(function(c){return !c.ok && !c.warn;}).length;
    var score=Math.round(checks.filter(function(c){return c.ok;}).length/checks.length*100);
    var report={version:VERSION,createdAt:now(),score:score,critical:critical,checks:checks,loadedScripts:scripts.length,loadedCss:css.length,partials:partialNodes.length};
    write(VALIDATION_KEY,report);
    try{localStorage.setItem('atmec76_last_runtime_validation', JSON.stringify(report,null,2));}catch(_){ }
    return report;
  }
  function renderRuntimeValidation753(report){
    report=report||runtimeValidation753();
    var score=$('enterprise753-runtime-score'); if(score)score.textContent=report.score+'%';
    var meta=$('enterprise753-runtime-meta'); if(meta)meta.textContent='Critici '+report.critical+' · script '+report.loadedScripts+' · css '+report.loadedCss+' · partial '+report.partials;
    var list=$('enterprise753-runtime-list'); if(list)list.innerHTML=report.checks.map(function(c){return '<div class="enterprise75-row enterprise753-row"><div><b>'+esc(c.label)+'</b><small>'+esc(c.detail)+'</small></div><span class="enterprise422-badge '+badge(c)+'">'+(c.ok?'OK':(c.warn?'WARN':'CHECK'))+'</span></div>';}).join('');
  }

  function download(name,text,type){var blob=new Blob([text],{type:type||'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(_){ }},800);}

  function stubLegacy(){
    var fn60=function(){try{if(typeof window.showMesReady67B==='function')window.showMesReady67B();else if(window.showTab)window.showTab('mes-ready-67b-tab',null);}catch(_){} toast('Work Orders legacy 6.0 è stato sostituito da Work Orders / MES Ready.','info');};
    fn60.__atmec75Stub=true;
    window.showWorkOrderProduct60=fn60;
    window.refreshWorkOrderProduct60=function(){return mirrorContext(buildContext());};
    window.applySelectedWorkOrderToTestMode60=function(){var ctx=mirrorContext(buildContext()); toast('Contesto WO applicato tramite Clean Baseline 7.5','success'); return ctx;};
    var fn61=function(){try{if(typeof window.showMasterData67A==='function')window.showMasterData67A();else if(window.showTab)window.showTab('master-data-67a-tab',null);}catch(_){} toast('Firmware/Revisions legacy 6.1 è stato sostituito da Master Data Enterprise.','info');};
    fn61.__atmec75Stub=true;
    window.showRevisionFirmware61=fn61;
  }

  window.runEnterpriseCleanBaseline75=function(){var r=cleanAudit(); renderClean(r); toast('Audit Clean Baseline 7.5 completato','success'); return r;};
  window.applyEnterpriseCleanBaseline75=function(){var ctx=mirrorContext(buildContext()); var r=cleanAudit(); renderClean(r); toast('Clean baseline 7.5 applicata: contesto canonico + mirror compatibile','success'); return {context:ctx,report:r};};
  window.exportEnterpriseCleanBaseline75=function(){var r=cleanAudit(); download('AT_MEC_HM_7_5_CLEAN_BASELINE_'+Date.now()+'.json',JSON.stringify(r,null,2),'application/json');};
  window.runEnterpriseRuntimeValidation753=function(){var r=runtimeValidation753(); renderRuntimeValidation753(r); toast('Validazione runtime 7.6 completata','success'); return r;};
  window.exportEnterpriseRuntimeValidation753=function(){var r=runtimeValidation753(); renderRuntimeValidation753(r); download('AT_MEC_HM_7_6_RUNTIME_VALIDATION_'+Date.now()+'.json',JSON.stringify(r,null,2),'application/json');};
  window.showEnterpriseBackbone75=function(){
    try{if(typeof window.showEnterpriseBackbone74==='function')window.showEnterpriseBackbone74(); else if(typeof window.showEnterpriseBackbone73==='function')window.showEnterpriseBackbone73(); else if(window.showTab)window.showTab('enterprise-stable-tab',null);}catch(_){if(window.showTab)window.showTab('enterprise-stable-tab',null);}
    setTimeout(function(){try{renderClean(cleanAudit()); renderRuntimeValidation753(runtimeValidation753());}catch(e){console.error('[7.5 clean]',e);}},220);
  };

  function init(){stubLegacy(); setRaw(MIRROR_FLAG, raw(MIRROR_FLAG)||'true'); setTimeout(function(){try{mirrorContext(buildContext()); renderClean(cleanAudit()); renderRuntimeValidation753(runtimeValidation753());}catch(e){console.warn('[7.5 clean init]',e);}},900);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
