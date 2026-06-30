// AT-MEC_HM 7.4 - Enterprise Data Contract + Consistency Layer
// Versione unica 7.4A + 7.4B/7.5: data model contract, audit coerenza e migrazione sicura non distruttiva.
(function(){
  'use strict';
  var VERSION='AT-MEC_HM_7.6_AI_COPILOT_FOUNDATION_CLEAN';
  var CONTRACT_KEY='atmec74_enterprise_data_contract';
  var CONTEXT_KEY='atmec74_unified_context';
  var REPORT_KEY='atmec74_consistency_report';
  var MIGRATION_LOG_KEY='atmec74_migration_log';
  var MIGRATION_BACKUP_KEY='atmec74_last_migration_backup';

  function $(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function norm(s){return String(s==null?'':s).trim();}
  function low(s){return norm(s).toLowerCase();}
  function now(){return new Date().toISOString();}
  function arr(v){return Array.isArray(v)?v:[];}
  function read(k,f){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?f:v;}catch(_){return f;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v,null,2));}catch(_){}}
  function raw(k){try{return localStorage.getItem(k)||'';}catch(_){return '';}}
  function toast(m,t){try{window.showToast?window.showToast(m,t||'info'):console.log('[7.5 data-contract]',m);}catch(_){}}
  function dom(id){var e=$(id); if(!e) return ''; if(e.tagName==='SELECT'){var opt=(e.options&&e.selectedIndex>=0)?e.options[e.selectedIndex]:null; return norm(e.value||(opt&&opt.textContent)||'');} return norm(e.value||e.textContent||'');}
  function first(){for(var i=0;i<arguments.length;i++){var v=norm(arguments[i]); if(v) return v;} return '';}
  function num(v){var n=Number(v); return isFinite(n)?n:0;}
  function boolStorage(key,def){var v=raw(key); if(v==='1'||v==='true'||v==='on') return true; if(v==='0'||v==='false'||v==='off') return false; return !!def;}

  var CONTRACT_FIELDS=[
    {field:'workOrder',label:'WO',required:true,domain:'Produzione',aliases:['wo','workOrder','woNumber','commessa','lot','lotNumber','lot_number','id']},
    {field:'commessa',label:'Commessa',required:true,domain:'Produzione',aliases:['commessa','lot','lotNumber','lot_number','workOrder','wo']},
    {field:'serialNumber',label:'Serial Number',required:true,domain:'Unità',aliases:['serial','serialNumber','serial_dut','sn','dutSerial']},
    {field:'customer',label:'Cliente',required:false,domain:'Anagrafica',aliases:['customer','customerName','customerText','client','client_name','customerId']},
    {field:'product',label:'Prodotto',required:false,domain:'Anagrafica',aliases:['product','productName','productText','productCode','productId']},
    {field:'boardCode',label:'Codice scheda',required:false,domain:'Anagrafica',aliases:['board','boardCode','boardText','boardId','pcb','pcbCode','articleCode']},
    {field:'recipeName',label:'Ricetta',required:true,domain:'Ricetta',aliases:['recipe','recipeName','recipe_name','recipeDefault']},
    {field:'recipeRevision',label:'Rev. ricetta',required:false,domain:'Ricetta',aliases:['recipeRevision','recipe_version','revision','rev','version']},
    {field:'firmware',label:'Firmware',required:false,domain:'Firmware',aliases:['firmware','firmwareText','firmwareVersion','fw','fwVersion']},
    {field:'operator',label:'Operatore',required:false,domain:'Produzione',aliases:['operator','operatorName','user','username']},
    {field:'stationId',label:'Stazione',required:false,domain:'Factory',aliases:['stationId','station_id','station']},
    {field:'testOutcome',label:'Esito test',required:false,domain:'Qualità',aliases:['result','final_result','outcome','status','testOutcome']},
    {field:'repairTicket',label:'Ticket Repair',required:false,domain:'Repair',aliases:['ticket','ticketId','repairTicket','repair_id']}
  ];

  function scanKeys(){
    var keys=[];
    try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i); if(/^atmec|^recipe_|^layout_/i.test(k||'')) keys.push(k);}}catch(_){ }
    keys.sort();
    return keys;
  }
  function classifyKey(k){
    var x=low(k);
    if(x.indexOf('work')>=0||x.indexOf('wo')>=0||x.indexOf('commessa')>=0||x.indexOf('lot')>=0||x.indexOf('mes')>=0) return 'WO/MES';
    if(x.indexOf('serial')>=0||x.indexOf('trace')>=0||x.indexOf('unit')>=0) return 'Traceability';
    if(x.indexOf('repair')>=0||x.indexOf('ticket')>=0) return 'Repair';
    if(x.indexOf('analytics')>=0||x.indexOf('report')>=0||x.indexOf('test')>=0) return 'Analytics/Test';
    if(x.indexOf('factory')>=0||x.indexOf('station')>=0||x.indexOf('sync')>=0) return 'Factory/Sync';
    if(x.indexOf('recipe')>=0||x.indexOf('firmware')>=0||x.indexOf('revision')>=0) return 'Recipe/FW';
    return 'Altro';
  }
  function keyStats(){
    var stats={}, keys=scanKeys();
    keys.forEach(function(k){var c=classifyKey(k); stats[c]=(stats[c]||0)+1;});
    return {keys:keys,stats:stats,total:keys.length};
  }

  function getMesDb(){var d=read('atmec67b_mes_ready',{}); if(!Array.isArray(d.workOrders))d.workOrders=[]; return d;}
  function woId(w){return first(w&&w.wo,w&&w.workOrder,w&&w.woNumber,w&&w.commessa,w&&w.lot,w&&w.lotNumber,w&&w.id);}
  function selectedWO(){
    var mes=getMesDb();
    var activeFromMes=null;
    if(mes.activeWorkOrderId) activeFromMes=arr(mes.workOrders).filter(function(w){return String(w.id||w.wo||'')===String(mes.activeWorkOrderId);})[0]||null;
    var candidates=[
      read('atmec_selected_work_order_for_test',null),
      read('atmec_active_work_order',null),
      read('atmec_current_work_order',null),
      activeFromMes,
      read('atmec60_selected_workorder',null),
      read('atmec60_testmode_context',{}).workOrder
    ].filter(Boolean);
    return candidates[0]||null;
  }
  function allWOObjects(){
    var out=[];
    arr(getMesDb().workOrders).forEach(function(w){out.push({source:'atmec67b_mes_ready.workOrders',obj:w});});
    arr(read('atmec60_workorders',[])).forEach(function(w){out.push({source:'atmec60_workorders',obj:w});});
    ['atmec_selected_work_order_for_test','atmec_active_work_order','atmec_current_work_order','atmec60_selected_workorder'].forEach(function(k){var v=read(k,null); if(v) out.push({source:k,obj:v});});
    var c=read('atmec60_testmode_context',null); if(c&&c.workOrder) out.push({source:'atmec60_testmode_context.workOrder',obj:c.workOrder});
    return out;
  }
  function normalizeWO(w,source){
    w=w||{};
    var id=woId(w);
    var qty=num(first(w.qty,w.qtyRequested,w.target,w.quantity,w.total));
    var done=num(first(w.done,w.qtyCompleted,w.pass,w.completed,w.passed));
    var fail=num(first(w.fail,w.failed,w.ko));
    var error=num(first(w.error,w.errors));
    return {
      id:first(w.id,id), wo:id, commessa:first(w.commessa,w.lot,w.lotNumber,id),
      customer:first(w.customerText,w.customer,w.customerName,w.client,w.client_name,w.customerId),
      product:first(w.productText,w.product,w.productName,w.productCode,w.productId),
      boardCode:first(w.boardCode,w.boardText,w.board,w.boardId,w.pcbCode,w.articleCode),
      recipeName:first(w.recipe,w.recipeName,w.recipe_name,w.recipeDefault),
      recipeRevision:first(w.recipeRevision,w.recipe_version,w.revision,w.rev,w.version),
      firmware:first(w.firmwareText,w.firmware,w.firmwareVersion,w.fw,w.fwVersion),
      qty:qty, pass:done, fail:fail, error:error, residuo:Math.max(0,qty-done), status:first(w.status,'UNKNOWN'), source:source||w.source||''
    };
  }
  function currentUser(){
    return first(raw('atmec_current_user'),raw('currentUser'),(window.currentUser&&window.currentUser.username)||(window.currentUser&&window.currentUser.name),'Operatore');
  }
  function stationConfig(){
    var c=read('atmec_factory_station_config_418B',null)||read('atmec_factory_config_418b',null)||{};
    return {stationId:first(c.stationId,c.station_id,c.id,raw('atmec_station_id'),raw('atmec_station_id_413b'),'STATION_LOCAL'),stationName:first(c.stationName,c.station_name,c.name,raw('atmec_station_name'),raw('atmec_station_name_413b'),'Postazione locale')};
  }
  function currentRecipeObj(){
    try{if(window.recipe) return window.recipe;}catch(_){ }
    var name=first(dom('prod-recipe-select'),dom('dash-recipe-select'),dom('recipe-list'));
    if(name) return read('recipe_'+name,{});
    return {};
  }
  function buildUnifiedContext(){
    var active=normalizeWO(selectedWO(),'selected');
    var recipeObj=currentRecipeObj()||{};
    var st=stationConfig();
    var woMode=boolStorage('atmec67b_use_work_order_mode',true);
    var serialRequired=boolStorage('atmec_serial_required',true);
    var serial=first(dom('prod-serial-input'),dom('serial-dut'),dom('serial-dut-dash'),dom('qr-manual-input-standalone'),raw('atmec_current_serial'),raw('atmec_last_serial'));
    var lot=first(dom('prod-lot-number'),dom('lot-number-dash'),dom('lot-number'),raw('atmec_lot_number'),active.commessa,active.wo);
    var recipeName=first(active.recipeName,dom('prod-recipe-select'),dom('dash-recipe-select'),recipeObj.recipe_name,recipeObj.name);
    var recipeRev=first(active.recipeRevision,dom('prod-recipe-version-select'),recipeObj.version,recipeObj.revision);
    var customer=first(active.customer,dom('prod-client-filter'),dom('dash-client-filter'),recipeObj.client_name,recipeObj.customer);
    var ctx={
      version:VERSION,
      updatedAt:now(),
      mode:{useWorkOrder:woMode,serialRequired:serialRequired,sampleTestRequired:boolStorage('atmec_sample_test_required',false)},
      workOrder:first(active.wo,lot),
      commessa:first(active.commessa,lot,active.wo),
      serialNumber:serial,
      customer:customer,
      product:first(active.product,recipeObj.product,recipeObj.productName),
      boardCode:first(active.boardCode,recipeObj.boardCode,recipeObj.board,recipeObj.pcbCode),
      recipeName:recipeName,
      recipeRevision:recipeRev,
      firmware:first(active.firmware,recipeObj.firmware,recipeObj.fw,recipeObj.firmwareVersion),
      operator:currentUser(),
      stationId:st.stationId,
      stationName:st.stationName,
      activeWorkOrder:active.wo?active:null,
      sourcePriority:['WO selezionata','Test Mode DOM','Ricetta runtime','localStorage legacy','Factory config'],
      raw:{lotNumber:lot,prodSerial:dom('prod-serial-input'),prodRecipe:dom('prod-recipe-select')}
    };
    return ctx;
  }
  function contractCoverage(ctx){
    var rows=CONTRACT_FIELDS.map(function(f){var v=norm(ctx[f.field]);return {field:f.field,label:f.label,domain:f.domain,required:f.required,value:v,status:v?'OK':(f.required?'MISSING':'OPTIONAL'),aliases:f.aliases};});
    var required=rows.filter(function(r){return r.required;});
    var okReq=required.filter(function(r){return r.value;}).length;
    var allOk=rows.filter(function(r){return r.value||!r.required;}).length;
    return {rows:rows,requiredOk:okReq,requiredTotal:required.length,score:Math.round((allOk/Math.max(1,rows.length))*100)};
  }
  function valueSources(){
    var out={workOrder:[],commessa:[],serialNumber:[],recipeName:[],customer:[]};
    function push(field,val,src){val=norm(val); if(val) out[field].push({value:val,source:src});}
    var active=normalizeWO(selectedWO(),'selected');
    push('workOrder',active.wo,'WO selezionata'); push('commessa',active.commessa,'WO selezionata'); push('recipeName',active.recipeName,'WO selezionata'); push('customer',active.customer,'WO selezionata');
    push('workOrder',dom('prod-lot-number'),'#prod-lot-number'); push('commessa',dom('prod-lot-number'),'#prod-lot-number');
    push('workOrder',raw('atmec_lot_number'),'atmec_lot_number'); push('commessa',raw('atmec_lot_number'),'atmec_lot_number');
    push('serialNumber',dom('prod-serial-input'),'#prod-serial-input'); push('serialNumber',dom('serial-dut'),'#serial-dut'); push('serialNumber',dom('serial-dut-dash'),'#serial-dut-dash');
    push('recipeName',dom('prod-recipe-select'),'#prod-recipe-select'); push('recipeName',dom('dash-recipe-select'),'#dash-recipe-select');
    push('customer',dom('prod-client-filter'),'#prod-client-filter'); push('customer',dom('dash-client-filter'),'#dash-client-filter');
    return out;
  }
  function uniqueValues(items){
    var seen={}, out=[];
    arr(items).forEach(function(i){var k=low(i.value); if(k&&!seen[k]){seen[k]=1;out.push(i.value);}});
    return out;
  }
  function consistencyReport(ctx){
    ctx=ctx||buildUnifiedContext();
    var issues=[];
    function add(level,title,detail,fix){issues.push({level:level,title:title,detail:detail,fix:fix||''});}
    var cov=contractCoverage(ctx);
    cov.rows.forEach(function(r){if(r.required&&!r.value)add('error','Campo obbligatorio mancante',r.label+' non valorizzato nel contesto unificato.','Compila/scan dati in Test Mode oppure seleziona una WO valida.');});
    if(ctx.mode.useWorkOrder&&!ctx.activeWorkOrder)add('error','Modalità WO attiva senza WO selezionata','Il flag Usa WO/Commessa è attivo, ma non è stata trovata una WO attiva.','Seleziona WO dal popup oppure disattiva la modalità WO.');
    if(ctx.mode.serialRequired&&!ctx.serialNumber)add('warn','Serial Number obbligatorio vuoto','Il flag Serial Number obbligatorio è attivo, ma il seriale è vuoto.','Inserisci o scansiona il Serial Number prima del test.');
    var src=valueSources();
    Object.keys(src).forEach(function(field){
      var vals=uniqueValues(src[field]);
      if(vals.length>1){add('warn','Valori diversi per '+field,vals.join(' / ')+' rilevati in sorgenti diverse.','Usa Normalizzazione sicura 7.4B/7.5 per salvare il contesto canonico senza cancellare i dati vecchi.');}
    });
    var all=allWOObjects(), seen={};
    all.forEach(function(x){var id=low(woId(x.obj)); if(!id)return; if(!seen[id])seen[id]=[]; seen[id].push(x.source);});
    Object.keys(seen).forEach(function(id){if(seen[id].length>1)add('info','WO presente in più sorgenti','WO '+id+' trovata in '+seen[id].join(', ')+'.','È normale durante la transizione; 7.5 mantiene una sorgente canonica e mirror compatibili.');});
    var keys=keyStats();
    if(keys.total>80)add('info','Molte chiavi localStorage enterprise','Rilevate '+keys.total+' chiavi AT-MEC/recipe/layout.','Il Data Contract evita di creare altri nomi chiave non governati.');
    if(!raw('atmec73_enterprise_backbone'))add('warn','Backbone 7.3 non sincronizzato','Manca atmec73_enterprise_backbone.','Premi prima Sincronizza contesto nel Backbone 7.3 o usa Aggiorna Data Contract.');
    if(!issues.length)add('ok','Dati coerenti','Nessuna inconsistenza critica trovata nel layer locale.','');
    var errors=issues.filter(function(i){return i.level==='error';}).length;
    var warns=issues.filter(function(i){return i.level==='warn';}).length;
    var score=Math.max(0,Math.min(100,cov.score-(errors*18)-(warns*7)));
    return {version:VERSION,checkedAt:now(),score:score,coverage:cov,issues:issues,keyStats:keys,context:ctx};
  }
  function buildContract(){
    var ctx=buildUnifiedContext();
    var report=consistencyReport(ctx);
    var payload={version:VERSION,createdAt:now(),contractFields:CONTRACT_FIELDS,context:ctx,coverage:report.coverage,report:report,notes:['7.4/7.5 definisce il Data Contract enterprise unico.','7.4B/7.5 controlla coerenza e normalizza in modo non distruttivo.','Non vengono cancellate chiavi legacy.']};
    write(CONTRACT_KEY,payload); write(CONTEXT_KEY,ctx); write(REPORT_KEY,report);
    return payload;
  }
  function safeMigration(){
    var payload=buildContract();
    var ctx=payload.context;
    var keys=['atmec_current_work_order','atmec_active_work_order','atmec_selected_work_order_for_test','atmec_lot_number','atmec73_enterprise_backbone',CONTEXT_KEY,REPORT_KEY];
    var backup={version:VERSION,createdAt:now(),keys:{}};
    keys.forEach(function(k){backup.keys[k]=raw(k);});
    write(MIGRATION_BACKUP_KEY,backup);
    write(CONTEXT_KEY,ctx);
    if(ctx.commessa) try{localStorage.setItem('atmec_lot_number',ctx.commessa);}catch(_){ }
    if(ctx.workOrder){
      var compat={
        id:ctx.activeWorkOrder&&ctx.activeWorkOrder.id||ctx.workOrder,
        wo:ctx.workOrder,
        workOrder:ctx.workOrder,
        commessa:ctx.commessa||ctx.workOrder,
        customerText:ctx.customer,
        productText:ctx.product,
        boardCode:ctx.boardCode,
        recipe:ctx.recipeName,
        recipeRevision:ctx.recipeRevision,
        firmwareText:ctx.firmware,
        qty:ctx.activeWorkOrder&&ctx.activeWorkOrder.qty||0,
        done:ctx.activeWorkOrder&&ctx.activeWorkOrder.pass||0,
        fail:ctx.activeWorkOrder&&ctx.activeWorkOrder.fail||0,
        error:ctx.activeWorkOrder&&ctx.activeWorkOrder.error||0,
        status:ctx.activeWorkOrder&&ctx.activeWorkOrder.status||'Running',
        source:'AT-MEC_HM_7.6_AI_COPILOT_FOUNDATION_CLEAN'
      };
      write('atmec_current_work_order',compat); write('atmec_active_work_order',compat); write('atmec_selected_work_order_for_test',compat);
    }
    var log=arr(read(MIGRATION_LOG_KEY,[]));
    log.unshift({version:VERSION,at:now(),action:'safe-normalization',workOrder:ctx.workOrder,commessa:ctx.commessa,serialPreview:ctx.serialNumber?'SET':'EMPTY',note:'Normalizzazione non distruttiva: backup salvato in '+MIGRATION_BACKUP_KEY});
    write(MIGRATION_LOG_KEY,log.slice(0,40));
    var report=consistencyReport(buildUnifiedContext()); write(REPORT_KEY,report);
    return {payload:payload,report:report,backup:backup};
  }

  function statusClass(level){return level==='ok'?'ok':(level==='error'?'error':(level==='warn'?'warn':'info'));}
  function renderFields(cov){
    return cov.rows.map(function(r){
      var cls=r.value?'ok':(r.required?'error':'info');
      return '<div class="enterprise74-field '+cls+'"><div><b>'+esc(r.label)+'</b><small>'+esc(r.domain)+' · '+esc(r.field)+'</small></div><span>'+esc(r.value||'—')+'</span></div>';
    }).join('');
  }
  function renderIssues(report){
    return report.issues.map(function(i){
      return '<div class="enterprise74-issue '+statusClass(i.level)+'"><b>'+esc(i.title)+'</b><span>'+esc(i.detail)+'</span>'+(i.fix?'<small>'+esc(i.fix)+'</small>':'')+'</div>';
    }).join('');
  }
  function renderKeyMap(stats){
    var cats=Object.keys(stats.stats).sort();
    if(!cats.length) return '<div class="hint">Nessuna chiave AT-MEC rilevata.</div>';
    return '<div class="enterprise74-keygrid">'+cats.map(function(c){return '<div><span>'+esc(c)+'</span><b>'+stats.stats[c]+'</b></div>';}).join('')+'</div><details class="enterprise74-keydetails"><summary>Mostra chiavi rilevate ('+stats.total+')</summary><div>'+stats.keys.slice(0,160).map(function(k){return '<code>'+esc(k)+'</code>';}).join('')+'</div></details>';
  }
  function renderContext(ctx){
    return '<div class="enterprise74-context-grid">'+
      '<div><span>WO</span><b>'+esc(ctx.workOrder||'—')+'</b></div>'+
      '<div><span>Commessa</span><b>'+esc(ctx.commessa||'—')+'</b></div>'+
      '<div><span>Serial Number</span><b>'+esc(ctx.serialNumber||'—')+'</b></div>'+
      '<div><span>Cliente</span><b>'+esc(ctx.customer||'—')+'</b></div>'+
      '<div><span>Scheda</span><b>'+esc(ctx.boardCode||'—')+'</b></div>'+
      '<div><span>Ricetta</span><b>'+esc(ctx.recipeName||'—')+'</b></div>'+
      '<div><span>Rev.</span><b>'+esc(ctx.recipeRevision||'—')+'</b></div>'+
      '<div><span>Firmware</span><b>'+esc(ctx.firmware||'—')+'</b></div>'+
      '<div><span>Stazione</span><b>'+esc(ctx.stationId||'—')+'</b></div>'+
    '</div>';
  }
  function render74(report){
    report=report||consistencyReport(buildUnifiedContext());
    var score=$('enterprise74-score'); if(score) score.textContent=report.score+'%';
    var meta=$('enterprise74-meta'); if(meta) meta.textContent='Req '+report.coverage.requiredOk+'/'+report.coverage.requiredTotal+' · chiavi '+report.keyStats.total+' · issue '+report.issues.length;
    var ctx=$('enterprise74-current-context'); if(ctx) ctx.innerHTML=renderContext(report.context);
    var fields=$('enterprise74-contract-fields'); if(fields) fields.innerHTML=renderFields(report.coverage);
    var issues=$('enterprise74-consistency-list'); if(issues) issues.innerHTML=renderIssues(report);
    var keys=$('enterprise74-key-map'); if(keys) keys.innerHTML=renderKeyMap(report.keyStats);
    var stamp=$('enterprise74-stamp'); if(stamp) stamp.textContent='Ultima verifica Data Contract: '+new Date(report.checkedAt||now()).toLocaleString('it-IT')+' · '+VERSION;
  }
  function download(name,text,type){
    var blob=new Blob([text],{type:type||'application/json'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
    setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(_){ }},800);
  }

  window.renderEnterpriseDataContract74=function(){var p=buildContract(); render74(p.report); toast('Data Contract 7.4/7.5 aggiornato','success'); return p;};
  window.runEnterpriseConsistency74=function(){var r=consistencyReport(buildUnifiedContext()); write(REPORT_KEY,r); render74(r); toast('Consistency check 7.5 completato','success'); return r;};
  window.applyEnterpriseSafeMigration74=function(){var r=safeMigration(); render74(r.report); toast('Normalizzazione sicura 7.4B/7.5 applicata','success'); return r;};
  window.exportEnterpriseDataContract74=function(){var p=buildContract(); download('AT_MEC_HM_7_5_DATA_CONTRACT_'+Date.now()+'.json',JSON.stringify(p,null,2),'application/json');};
  window.exportEnterpriseConsistency74=function(){var r=consistencyReport(buildUnifiedContext()); write(REPORT_KEY,r); download('AT_MEC_HM_7_5_CONSISTENCY_REPORT_'+Date.now()+'.json',JSON.stringify(r,null,2),'application/json');};
  window.showEnterpriseBackbone74=function(){
    if(typeof window.showEnterpriseBackbone73==='function') window.showEnterpriseBackbone73();
    else if(window.showTab) window.showTab('enterprise-stable-tab',null);
    setTimeout(function(){try{render74(consistencyReport(buildUnifiedContext()));}catch(e){console.error('[7.5 data-contract]',e);}},180);
  };
  function init(){setTimeout(function(){if($('enterprise74-contract-fields')) render74(consistencyReport(buildUnifiedContext()));},1200);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
