// AT-MEC_HM 9.0 - AI Copilot Complete + Approval Persistence UX
// Integrazione AI read-only sopra moduli esistenti. Non duplica Traceability, Repair, Analytics, MES o Factory.
(function(){
  'use strict';

  var VERSION='AT-MEC_HM_9.0_AI_FACTORY_COMMAND_CENTER';
  var CONTEXT_KEY='atmec76_ai_context';
  var INSIGHTS_KEY='atmec76_ai_insights';
  var PROVIDER_KEY='atmec76_ai_provider_config';
  var PROMPT_KEY='atmec76_ai_last_prompt';
  var PROD_KEY='atmec762_ai_production_advisor';
  var FAIL_KEY='atmec762_ai_fail_advisor';
  var RECIPE_KEY='atmec762_ai_recipe_advisor';
  var ACTION_KEY='atmec762_ai_action_plan';
  var MATURITY_KEY='atmec762_ai_module_maturity';
  var DUP_KEY='atmec762_ai_duplication_guard';
  var COMPLETE_KEY='atmec762_ai_complete_report';

  function $(id){return document.getElementById(id);}
  function now(){return new Date().toISOString();}
  function arr(v){return Array.isArray(v)?v:[];}
  function norm(v){return String(v==null?'':v).trim();}
  function first(){for(var i=0;i<arguments.length;i++){var v=norm(arguments[i]); if(v) return v;} return '';}
  function num(v){var n=Number(v); return isFinite(n)?n:0;}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function read(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?d:v;}catch(_){return d;}}
  function raw(k){try{return localStorage.getItem(k)||'';}catch(_){return '';}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v,null,2));}catch(_){} }
  function setRaw(k,v){try{localStorage.setItem(k,String(v));}catch(_){} }
  function setUiStatus(m,t){
    try{
      var msg=String(m||'');
      var type=String(t||'info').toLowerCase();
      var s=$('ai76-ui-status');
      if(s){
        s.textContent=msg;
        s.className='ai76-ui-status '+cls(type);
      }
      var meta=$('ai76-meta');
      if(meta) meta.textContent=msg;
    }catch(_e){}
  }
  function toast(m,t){
    try{
      setUiStatus(m,t||'info');
      var fn=(typeof window.showToast==='function')?window.showToast:((typeof window.toast==='function')?window.toast:null);
      if(fn) fn(m,t||'info'); else console.log('[AI 9.0]',m);
    }catch(_){console.log('[AI 9.0]',m);}
  }
  function focusAiPanel(id){
    try{
      var el=$(id); if(!el)return;
      var panel=el.closest?el.closest('.ai76-workbench-panel,.ai76-action-plan-wrap,.enterprise76-ai-card,.ai762-panel'):null;
      var target=panel||el;
      target.classList.add('ai76-focus-panel');
      if(target.scrollIntoView) target.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(function(){try{target.classList.remove('ai76-focus-panel');}catch(_e){}},1600);
    }catch(_e){}
  }
  function selectAiPromptBox(){
    try{var p=$('ai76-prompt'); if(p){p.focus(); p.select(); return true;}}catch(_e){}
    return false;
  }
  var ACTIVE_KEY='atmec771_ai_active_section';
  function activeTargetId(key){
    return {
      complete:'ai762-report-preview',
      context:'ai76-context-grid',
      prompt:'ai76-prompt',
      production:'ai76-production-insights',
      fail:'ai76-fail-insights',
      recipe:'ai76-recipe-insights',
      plan:'ai76-action-plan',
      provider:'ai77-provider-status',
      approvals:'ai77-approval-queue'
    }[key]||'';
  }
  function setActiveAiSection(key){
    try{
      key=String(key||'').trim();
      if(!key)return;
      setRaw(ACTIVE_KEY,key);
      var buttons=document.querySelectorAll('[data-ai-action],[data-ai-main]');
      buttons.forEach(function(btn){
        var match=(btn.getAttribute('data-ai-action')===key)||(btn.getAttribute('data-ai-main')===key);
        btn.classList.toggle('ai76-action-selected',!!match);
        if(match) btn.setAttribute('aria-pressed','true'); else btn.removeAttribute('aria-pressed');
      });
      document.querySelectorAll('.ai76-section-selected').forEach(function(el){el.classList.remove('ai76-section-selected');});
      var targetId=activeTargetId(key);
      var el=targetId?$(targetId):null;
      var panel=el&&el.closest?el.closest('.ai76-workbench-panel,.ai76-action-plan-wrap,.enterprise76-ai-card,.ai762-panel,.ai77-approval-wrap,.ai77-provider-result-wrap'):null;
      if(panel) panel.classList.add('ai76-section-selected');
      var label={complete:'Analisi completa',context:'Solo contesto',prompt:'Prompt AI',production:'Produzione / WO',fail:'FAIL / Qualità',recipe:'Review ricetta',plan:'Piano azione',provider:'Provider AI',approvals:'Coda approvazioni'}[key];
      if(label) setUiStatus('Sezione selezionata: '+label,'info');
    }catch(_e){}
  }
  window.setActiveAiSection771=setActiveAiSection;
  function restoreActiveAiSection(){try{var key=raw(ACTIVE_KEY); if(key)setActiveAiSection(key);}catch(_e){}}

  function defaultProvider(){
    return {
      enabled:false,
      mode:'read_only',
      provider:'local_rules',
      endpoint:'',
      model:'',
      allowExternal:false,
      requireConfirmation:true,
      updatedAt:''
    };
  }
  function provider(){return Object.assign(defaultProvider(), read(PROVIDER_KEY,{}));}
  function saveProviderFromUi(){
    var cfg=provider();
    var en=$('ai76-provider-enabled');
    var p=$('ai76-provider-type');
    var ep=$('ai76-provider-endpoint');
    var m=$('ai76-provider-model');
    var mode=$('ai76-action-mode');
    cfg.enabled=!!(en&&en.checked);
    cfg.allowExternal=cfg.enabled && cfg.provider!=='local_rules';
    cfg.provider=p?p.value:cfg.provider;
    cfg.endpoint=ep?norm(ep.value):cfg.endpoint;
    cfg.model=m?norm(m.value):cfg.model;
    cfg.mode=mode?mode.value:cfg.mode;
    cfg.requireConfirmation=true;
    cfg.updatedAt=now();
    write(PROVIDER_KEY,cfg);
    renderProvider(cfg);
    toast('Configurazione AI salvata. Modalità sicura: nessuna azione automatica senza conferma.','success');
    return cfg;
  }

  function mesDb(){var d=read('atmec67b_mes_ready',{}); if(!Array.isArray(d.workOrders))d.workOrders=[]; return d;}
  function woId(w){return first(w&&w.wo,w&&w.workOrder,w&&w.woNumber,w&&w.commessa,w&&w.lot,w&&w.lotNumber,w&&w.id);}
  function normalizeWO(w,source){
    w=w||{};
    var id=woId(w);
    var qty=num(first(w.qty,w.qtyRequested,w.target,w.quantity,w.total));
    var pass=num(first(w.pass,w.done,w.qtyCompleted,w.completed,w.passed));
    var fail=num(first(w.fail,w.failed,w.ko));
    var error=num(first(w.error,w.errors));
    return {
      id:first(w.id,id),
      wo:id,
      commessa:first(w.commessa,w.lot,w.lotNumber,id),
      customer:first(w.customerText,w.customer,w.customerName,w.client,w.client_name,w.customerId),
      product:first(w.productText,w.product,w.productName,w.productCode,w.productId),
      boardCode:first(w.boardCode,w.boardText,w.board,w.boardId,w.pcbCode,w.articleCode),
      recipe:first(w.recipe,w.recipeName,w.recipe_name,w.recipeDefault),
      recipeRevision:first(w.recipeRevision,w.recipe_version,w.revision,w.rev,w.version),
      firmware:first(w.firmwareText,w.firmware,w.firmwareVersion,w.fw,w.fwVersion),
      qty:qty,
      pass:pass,
      done:pass,
      fail:fail,
      error:error,
      residuo:Math.max(0,qty-pass),
      status:first(w.status,'UNKNOWN'),
      source:source||w.source||'unknown'
    };
  }
  function selectedWO(){
    var mes=mesDb();
    var mesActive=null;
    if(mes.activeWorkOrderId){
      mesActive=arr(mes.workOrders).find(function(w){return String(w.id||w.wo||w.workOrder||'')===String(mes.activeWorkOrderId);})||null;
    }
    var candidates=[
      read('atmec_selected_work_order_for_test',null),
      read('atmec_active_work_order',null),
      read('atmec_current_work_order',null),
      (read('atmec75_canonical_context',{})||{}).activeWorkOrder,
      mesActive,
      read('atmec60_selected_workorder',null)
    ].filter(Boolean);
    return candidates.length?normalizeWO(candidates[0],candidates[0].source||'selected'):null;
  }
  function allWorkOrders(){
    var out=[], seen={};
    function add(w,src){var n=normalizeWO(w,src); var key=(n.wo||n.commessa||'').toLowerCase(); if(key&&!seen[key]){seen[key]=1;out.push(n);}}
    arr(mesDb().workOrders).forEach(function(w){add(w,'MES_READY_67B');});
    arr(read('atmec60_workorders',[])).forEach(function(w){add(w,'LEGACY_COMPAT_60');});
    var s=selectedWO(); if(s&&s.wo&&!seen[String(s.wo).toLowerCase()])out.unshift(s);
    return out;
  }
  function station(){
    var c=read('atmec75_station_context',null)||read('atmec_factory_station_config_418B',null)||read('atmec_factory_config_418b',null)||read('atmec_station_config',null)||{};
    return {
      id:first(c.stationId,c.station_id,c.id,raw('atmec_station_id'),raw('atmec_station_id_413b'),'STATION_LOCAL'),
      name:first(c.stationName,c.station_name,c.name,raw('atmec_station_name'),raw('atmec_station_name_413b'),'Postazione locale'),
      department:first(c.department,c.dept,c.line,raw('atmec_station_department_413b')),
      site:first(c.site,c.plant,raw('atmec_station_site_413b'))
    };
  }
  function countKeys(){
    var stats={total:0,wo:0,traceability:0,repair:0,analytics:0,factory:0,device:0,recipe:0,ai:0,other:0};
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=String(localStorage.key(i)||'').toLowerCase();
        if(!/^atmec|^recipe_|^layout_/i.test(k)) continue;
        stats.total++;
        if(k.indexOf('ai')>=0) stats.ai++;
        else if(k.indexOf('work')>=0||k.indexOf('wo')>=0||k.indexOf('commessa')>=0||k.indexOf('mes')>=0||k.indexOf('lot')>=0) stats.wo++;
        else if(k.indexOf('trace')>=0||k.indexOf('serial')>=0||k.indexOf('unit')>=0) stats.traceability++;
        else if(k.indexOf('repair')>=0||k.indexOf('ticket')>=0) stats.repair++;
        else if(k.indexOf('analytic')>=0||k.indexOf('report')>=0||k.indexOf('test')>=0) stats.analytics++;
        else if(k.indexOf('factory')>=0||k.indexOf('station')>=0||k.indexOf('sync')>=0) stats.factory++;
        else if(k.indexOf('device')>=0||k.indexOf('pl303')>=0||k.indexOf('meter')>=0) stats.device++;
        else if(k.indexOf('recipe')>=0||k.indexOf('firmware')>=0||k.indexOf('revision')>=0) stats.recipe++;
        else stats.other++;
      }
    }catch(_){ }
    return stats;
  }
  function latestValidation(){
    return read('atmec76_runtime_validation_report',null)||read('atmec753_runtime_validation_report',null)||read('atmec75_clean_baseline_report',null)||{};
  }
  function getRepairs(){
    return {
      tickets:arr(read('atmec65a_repair_tickets',[])),
      actions:arr(read('atmec65a_repair_actions',[])),
      activeRetest:read('atmec65c_active_retest',null)
    };
  }
  function getDeviceSnapshot(){
    return {
      safeStatus:read('atmec67c_device_manager_status',{}),
      enterpriseLast:read('atmec_device_enterprise_last_status',{}),
      config:read('atmec_device_manager_config',{})||read('atmec_device_config_413G',{}),
      diagnosticLog:arr(read('atmec_device_diagnostic_413RM_log',[])).slice(0,10)
    };
  }
  function getReportRows(){
    var pools=[
      arr(read('atmec_test_reports',[])),
      arr((read('atmec_local_database',{})||{}).test_reports||[]),
      arr((read('atmec_local_database',{})||{}).reports||[]),
      arr((read('atmec_local_database',{})||{}).results||[]),
      arr(read('atmec_test_results',[])),
      arr(read('atmec_reports',[]))
    ];
    var rows=[];
    pools.forEach(function(p){ if(p && p.length && !rows.length) rows=p; });
    return arr(rows);
  }
  function resultOf(r){var res=String((r&&(r.result||r.outcome||r.status||r.esito||r.finalResult||r.final_result))||'').toUpperCase(); if(res.indexOf('PASS')>=0||res==='OK')return 'PASS'; if(res.indexOf('FAIL')>=0||res.indexOf('KO')>=0||res.indexOf('ERROR')>=0)return 'FAIL'; return res||'UNKNOWN';}
  function durationOf(r){return num(r&&first(r.duration_ms,r.durationMs,r.elapsed_ms,r.elapsedMs,r.execution_time_ms,r.time_ms,r.cycleTimeMs,r.cycle_time_ms));}
  function failReasonOf(r){return first(r&&r.failReason,r&&r.failureReason,r&&r.error,r&&r.errorType,r&&r.failedStep,r&&r.stepName,r&&r.component,r&&r.testPoint,r&&r.tp,r&&r.message,'FAIL non classificato');}
  function getReportsSummary(){
    var rows=getReportRows();
    var total=rows.length, pass=0, fail=0, durations=[];
    var top={};
    rows.forEach(function(r){var res=resultOf(r); if(res==='PASS')pass++; if(res==='FAIL'){fail++; var reason=failReasonOf(r); top[reason]=(top[reason]||0)+1;} var d=durationOf(r); if(d>0)durations.push(d);});
    var topFails=Object.keys(top).map(function(k){return {name:k,count:top[k]};}).sort(function(a,b){return b.count-a.count;}).slice(0,5);
    var avg=durations.length?Math.round(durations.reduce(function(a,b){return a+b;},0)/durations.length):0;
    return {total:total,pass:pass,fail:fail,avgDurationMs:avg,topFails:topFails,source:total?'local_database_or_reports':'none'};
  }

  function buildContext(){
    var canonical=read('atmec75_canonical_context',{})||read('atmec74_unified_context',{})||{};
    var active=selectedWO();
    var st=station();
    var wos=allWorkOrders();
    var repairs=getRepairs();
    var reportSummary=getReportsSummary();
    var keyStats=countKeys();
    var dataContract=read('atmec74_enterprise_data_contract',{});
    var consistency=read('atmec74_consistency_report',{});
    var clean=read('atmec75_clean_baseline_report',{});
    var validation=latestValidation();
    var context={
      version:VERSION,
      updatedAt:now(),
      privacy:'local_first_no_external_call_by_default',
      mode:{readOnly:true,requiresConfirmation:true,noAutomaticActions:true},
      canonicalContext:canonical,
      workOrder:first(active&&active.wo,canonical.workOrder,canonical.commessa),
      commessa:first(active&&active.commessa,canonical.commessa,canonical.workOrder),
      serialNumber:first(canonical.serialNumber,raw('atmec_current_serial'),raw('atmec_last_serial')),
      customer:first(active&&active.customer,canonical.customer),
      product:first(active&&active.product,canonical.product),
      boardCode:first(active&&active.boardCode,canonical.boardCode),
      recipeName:first(active&&active.recipe,canonical.recipeName),
      recipeRevision:first(active&&active.recipeRevision,canonical.recipeRevision),
      firmware:first(active&&active.firmware,canonical.firmware),
      station:st,
      operator:first(canonical.operator,raw('atmec_current_user'),'Operatore'),
      activeWorkOrder:active,
      workOrders:wos,
      totals:wos.reduce(function(a,w){a.qty+=num(w.qty);a.pass+=num(w.pass);a.fail+=num(w.fail);a.residuo+=num(w.residuo);return a;},{qty:0,pass:0,fail:0,residuo:0}),
      reports:reportSummary,
      repairs:{tickets:repairs.tickets.length,actions:repairs.actions.length,activeRetest:!!repairs.activeRetest},
      dataContract:{score:num(dataContract.score||dataContract.dataScore),fields:arr(dataContract.fields).length,updatedAt:dataContract.createdAt||dataContract.updatedAt||''},
      consistency:{score:num(consistency.score),issues:arr(consistency.issues||consistency.checks).length,updatedAt:consistency.createdAt||consistency.updatedAt||''},
      cleanBaseline:{score:num(clean.score),checks:arr(clean.checks).length,updatedAt:clean.createdAt||clean.updatedAt||''},
      runtimeValidation:{score:num(validation.score),critical:num(validation.critical),updatedAt:validation.createdAt||validation.updatedAt||''},
      keyStats:keyStats,
      devices:getDeviceSnapshot(),
      provider:provider()
    };
    write(CONTEXT_KEY,context);
    return context;
  }

  function insight(level,title,detail,action,domain){return {level:level||'info',title:title,detail:detail||'',action:action||'',domain:domain||'General'};}
  function localAnalysis(ctx){
    ctx=ctx||buildContext();
    var out=[];
    if(!ctx.workOrder && !(ctx.canonicalContext&&ctx.canonicalContext.mode&&ctx.canonicalContext.mode.useWorkOrder===false)){
      out.push(insight('warn','WO non selezionata','Il contesto AI non trova una WO attiva. In produzione enterprise gli insight saranno più precisi con WO/Commessa attiva.','Seleziona WO da Work Orders / MES Ready oppure lavora in modalità commessa manuale.','WO'));
    }
    if(ctx.workOrder && !ctx.recipeName){
      out.push(insight('warn','Ricetta non agganciata alla WO','La WO è presente ma non risulta una ricetta canonica associata.','Verifica Master Data / MES Ready e Data Contract prima di avviare produzione.','Ricette'));
    }
    if(ctx.runtimeValidation.score && ctx.runtimeValidation.score<100){
      out.push(insight('error','Runtime non perfettamente validato','Runtime validation score '+ctx.runtimeValidation.score+'%.','Apri Clean Baseline e correggi i controlli non OK prima di modifiche AI.','Runtime'));
    }
    if(ctx.cleanBaseline.score && ctx.cleanBaseline.score<100){
      out.push(insight('error','Clean Baseline non completa','Clean score '+ctx.cleanBaseline.score+'%.','Eseguire Audit pulizia e Applica baseline pulita.','Clean Baseline'));
    }
    if(ctx.reports.total && ctx.reports.fail){
      var failRate=Math.round((ctx.reports.fail/Math.max(1,ctx.reports.total))*1000)/10;
      out.push(insight(failRate>5?'warn':'info','FAIL presenti nello storico','FAIL '+ctx.reports.fail+' su '+ctx.reports.total+' test locali rilevati. FAIL rate '+failRate+'%.','Correlare ricetta, step, test point e repair nel pannello Analytics esistente.','Analytics'));
    } else if(ctx.reports.total){
      out.push(insight('ok','Storico test senza FAIL locali','Sono presenti '+ctx.reports.total+' test locali e nessun FAIL rilevato nel campione letto.','Usare Analytics Center per confermare trend e FPY.','Analytics'));
    } else {
      out.push(insight('info','Storico test locale non rilevato','Il contesto AI non trova report locali nel browser. Analytics può usare API backend quando disponibile.','Eseguire alcuni test o importare storico prima di insight qualità avanzati.','Analytics'));
    }
    if(ctx.repairs.tickets||ctx.repairs.actions){
      out.push(insight('info','Repair collegato al contesto AI','Ticket '+ctx.repairs.tickets+' · interventi '+ctx.repairs.actions+'.','Usare Repair Center esistente per compilare cause/interventi; AI leggerà quei dati senza duplicare il modulo.','Repair'));
    }
    if(ctx.keyStats.wo>4){
      out.push(insight('warn','Molte chiavi WO/Commessa legacy','Rilevate '+ctx.keyStats.wo+' chiavi WO/MES/Commessa in localStorage. 7.5 mantiene mirror compatibile, ma la sorgente resta canonica.','Non creare nuove chiavi: usare atmec75_canonical_context / atmec74_unified_context.','Data Model'));
    }
    if(ctx.provider.provider!=='local_rules' && !ctx.provider.enabled){
      out.push(insight('info','Provider AI esterno configurabile ma spento','La base 7.6 non invia dati fuori dal PC.','Abilitare provider solo quando saranno definite regole privacy e endpoint.','AI'));
    }
    if(!out.length){
      out.push(insight('ok','Contesto pronto per AI Copilot','Il sistema appare coerente per usare il Copilot come livello di lettura e suggerimento.','Procedere con prompt/export contesto oppure collegare provider AI in modalità read-only.','AI'));
    }
    var score=100;
    out.forEach(function(i){if(i.level==='error')score-=25; else if(i.level==='warn')score-=10;});
    score=Math.max(0,Math.min(100,score));
    var result={version:VERSION,createdAt:now(),score:score,contextSummary:{workOrder:ctx.workOrder,commessa:ctx.commessa,serialNumber:ctx.serialNumber,recipeName:ctx.recipeName,stationId:ctx.station&&ctx.station.id,reports:ctx.reports,repairs:ctx.repairs,keyStats:ctx.keyStats},insights:out,provider:ctx.provider};
    write(INSIGHTS_KEY,result);
    return result;
  }

  function buildPrompt(ctx,analysis,complete){
    ctx=ctx||buildContext(); analysis=analysis||localAnalysis(ctx);
    var maturity=(complete&&complete.modules)||moduleMaturity(ctx);
    var duplication=(complete&&complete.duplication)||duplicationGuard(ctx);
    var safe={
      release:VERSION,
      scope:'AI_COPILOT_COMPLETE_READONLY',
      rules:[
        'Non creare pagine duplicate.',
        'Non duplicare Traceability, Repair, Analytics, MES, Factory o Work Orders.',
        'Usare solo i moduli esistenti e proporre gap reali o refactoring.',
        'Non comandare strumenti, Test Engine o hardware senza conferma operatore.',
        'Non modificare utenti, ricette, WO, seriali o dati produzione senza approvazione esplicita.',
        'Rispondere separando: Produzione/WO, Qualità/FAIL, Ricetta, Dati mancanti, Piano azione.'
      ],
      context:{
        workOrder:ctx.workOrder,
        commessa:ctx.commessa,
        serialNumber:ctx.serialNumber,
        customer:ctx.customer,
        boardCode:ctx.boardCode,
        recipeName:ctx.recipeName,
        recipeRevision:ctx.recipeRevision,
        firmware:ctx.firmware,
        station:ctx.station,
        totals:ctx.totals,
        reports:ctx.reports,
        repairs:ctx.repairs,
        dataContract:ctx.dataContract,
        cleanBaseline:ctx.cleanBaseline,
        runtimeValidation:ctx.runtimeValidation,
        keyStats:ctx.keyStats
      },
      moduleMaturity:maturity,
      duplicationGuard:duplication,
      currentInsights:analysis.insights
    };
    var prompt='Sei AI Copilot per AT-MEC HM. Usa SOLO questo contesto locale. Non inventare dati e non proporre nuovi moduli se esiste già una funzione equivalente.\n\n'+
      'Formato risposta richiesto:\n'+
      '1) Stato produzione / WO\n'+
      '2) Qualità / FAIL\n'+
      '3) Ricetta / step\n'+
      '4) Dati mancanti o incoerenti\n'+
      '5) Piano azione manuale con priorità\n\n'+JSON.stringify(safe,null,2);
    setRaw(PROMPT_KEY,prompt);
    return prompt;
  }

  function cls(level){return level==='ok'?'ok':(level==='error'?'error':(level==='warn'?'warn':'info'));}
  function renderProvider(cfg){
    cfg=cfg||provider();
    var en=$('ai76-provider-enabled'); if(en) en.checked=!!cfg.enabled;
    var p=$('ai76-provider-type'); if(p) p.value=cfg.provider||'local_rules';
    var ep=$('ai76-provider-endpoint'); if(ep) ep.value=cfg.endpoint||'';
    var m=$('ai76-provider-model'); if(m) m.value=cfg.model||'';
    var mode=$('ai76-action-mode'); if(mode) mode.value=cfg.mode||'read_only';
    var meta=$('ai76-provider-meta');
    if(meta) meta.textContent=(cfg.enabled?'Provider attivo':'Provider spento')+' · '+(cfg.provider||'local_rules')+' · azioni con conferma obbligatoria';
  }
  function renderContext(ctx){
    ctx=ctx||buildContext();
    var box=$('ai76-context-grid');
    if(box){
      box.innerHTML='<div><span>WO</span><b>'+esc(ctx.workOrder||'—')+'</b></div>'+ 
        '<div><span>Commessa</span><b>'+esc(ctx.commessa||'—')+'</b></div>'+ 
        '<div><span>S/N</span><b>'+esc(ctx.serialNumber||'—')+'</b></div>'+ 
        '<div><span>Ricetta</span><b>'+esc(ctx.recipeName||'—')+'</b></div>'+ 
        '<div><span>Stazione</span><b>'+esc((ctx.station&&ctx.station.id)||'—')+'</b></div>'+ 
        '<div><span>Report</span><b>'+esc(ctx.reports.total||0)+'</b></div>'+ 
        '<div><span>Repair</span><b>'+esc(ctx.repairs.tickets||0)+'</b></div>'+ 
        '<div><span>Chiavi dati</span><b>'+esc(ctx.keyStats.total||0)+'</b></div>';
    }
  }
  function renderInsights(result){
    result=result||localAnalysis(buildContext());
    var score=$('ai76-score'); if(score)score.textContent=result.score+'%';
    var meta=$('ai76-meta'); if(meta)meta.textContent='Insight '+result.insights.length+' · '+(result.contextSummary.workOrder||'manuale')+' · '+result.createdAt.replace('T',' ').slice(0,16);
    var list=$('ai76-insights');
    if(list){
      list.innerHTML=arr(result.insights).map(function(i){
        return '<div class="ai76-insight '+cls(i.level)+'"><div><b>'+esc(i.title)+'</b><small>'+esc(i.detail)+'</small><em>'+esc(i.action)+'</em></div><span>'+esc(i.domain)+'</span></div>';
      }).join('')||'<div class="hint">Nessun insight generato.</div>';
    }
  }
  function renderPrompt(prompt){
    var p=$('ai76-prompt'); if(p) p.value=prompt||raw(PROMPT_KEY)||'';
  }

  function mini(level,title,detail,action){return {level:level||'info',title:title||'',detail:detail||'',action:action||''};}
  function renderMiniList(id,rows){
    var box=$(id); if(!box)return;
    rows=arr(rows);
    box.innerHTML=rows.map(function(x){return '<div class="ai76-mini-row '+cls(x.level)+'"><div><b>'+esc(x.title)+'</b><small>'+esc(x.detail)+'</small><em>'+esc(x.action)+'</em></div></div>';}).join('') || '<div class="hint">Nessun dato disponibile.</div>';
  }
  function recipeSnapshot(ctx){
    ctx=ctx||buildContext();
    var r=null, name=ctx.recipeName||'';
    try{r=window.currentRecipe||window.selectedRecipe||window.recipe||null;}catch(_){r=null;}
    if(!r && name){try{r=JSON.parse(localStorage.getItem('recipe_'+name)||'null');}catch(_){r=null;}}
    if(!r){
      try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||''; if(k.indexOf('recipe_')===0){var obj=JSON.parse(localStorage.getItem(k)||'null'); if(obj){r=obj; name=name||k.replace(/^recipe_/,''); break;}}}}catch(_){r=null;}
    }
    r=r||{};
    var steps=arr(r.steps||r.sequence||r.testSteps||r.items);
    var counters={total:steps.length,manual:0,measure:0,io:0,wait:0,withRange:0,withRetry:0,missingDesc:0};
    steps.forEach(function(st){var t=String(st.type||st.kind||st.step_type||'').toLowerCase(); if(t.indexOf('manual')>=0)counters.manual++; if(t.indexOf('measure')>=0||t.indexOf('analog')>=0||t.indexOf('meter')>=0||st.min!=null||st.max!=null)counters.measure++; if(t.indexOf('io')>=0||t.indexOf('di')>=0||t.indexOf('do')>=0)counters.io++; if(t.indexOf('wait')>=0||t.indexOf('delay')>=0)counters.wait++; if(st.min!=null||st.max!=null||st.minValue!=null||st.maxValue!=null)counters.withRange++; if(num(st.retry||st.retries)>0)counters.withRetry++; if(!first(st.description,st.label,st.name,st.title))counters.missingDesc++;});
    return {name:first(name,r.name,r.recipeName,r.recipe_name,r.title,'Ricetta non selezionata'),revision:first(r.revision,r.rev,r.version,''),steps:steps,counters:counters,source:r.steps?'runtime_or_storage':'not_found'};
  }
  function productionAdvisor(ctx){
    ctx=ctx||buildContext();
    var w=ctx.activeWorkOrder||{};
    var qty=num(w.qty||ctx.totals.qty), pass=num(w.pass||ctx.totals.pass), fail=num(w.fail||ctx.totals.fail), res=num(w.residuo||ctx.totals.residuo);
    var done=pass+fail;
    var yieldRate=done?Math.round(pass/done*1000)/10:0;
    var rows=[];
    rows.push(mini(ctx.workOrder?'ok':'warn','WO / Commessa',ctx.workOrder?('WO '+ctx.workOrder+' · Commessa '+(ctx.commessa||'—')):'Nessuna WO attiva rilevata.','Usare Work Orders / MES Ready oppure modalità commessa manuale prima di insight avanzati.'));
    rows.push(mini(qty?'info':'warn','Avanzamento produzione','Totale '+qty+' · completate '+done+' · PASS '+pass+' · FAIL '+fail+' · residuo '+res+'.','Confermare i conteggi nel popup Statistiche WO del Test Mode.'));
    rows.push(mini(done&&yieldRate<95?'warn':'ok','Yield stimato',done?('Yield '+yieldRate+'% su '+done+' pezzi registrati.'):'Nessun pezzo completato nel contesto letto.','Usare Analytics Center per trend storico; AI non crea dashboard doppie.'));
    if(ctx.reports.avgDurationMs){var avgSec=Math.round(ctx.reports.avgDurationMs/1000); var totalMin=qty?Math.round((ctx.reports.avgDurationMs*qty)/60000):0; rows.push(mini('info','Tempo produzione stimato','Tempo medio scheda '+avgSec+' s · totale commessa stimato '+totalMin+' min.','Verificare con statistiche WO se sono disponibili tempi reali più recenti.'));}
    write(PROD_KEY,rows); renderMiniList('ai76-production-insights',rows); return rows;
  }
  function failAdvisor(ctx){
    ctx=ctx||buildContext();
    var rows=[];
    if(ctx.reports.total){
      var rate=Math.round((ctx.reports.fail/Math.max(1,ctx.reports.total))*1000)/10;
      rows.push(mini(ctx.reports.fail?'warn':'ok','FAIL rate storico','FAIL '+ctx.reports.fail+' / '+ctx.reports.total+' · rate '+rate+'%.','Aprire Analytics Center per dettaglio step/test point già esistente.'));
      arr(ctx.reports.topFails).forEach(function(f){rows.push(mini('warn','Top fail: '+f.name,'Occorrenze rilevate: '+f.count+'.','Verificare in Repair Center e nei report test se causa/intervento sono compilati.'));});
      if(!ctx.reports.topFails||!ctx.reports.topFails.length) rows.push(mini('info','Top fail non classificabile','I report non contengono cause/step FAIL strutturati.','Standardizzare campi failReason/errorType/failedStep nei report futuri.'));
    } else rows.push(mini('info','Nessuno storico test locale','Non sono stati trovati report nel browser/local database.','Eseguire test o importare storico prima dell’analisi qualità.'));
    if(ctx.repairs.tickets||ctx.repairs.actions) rows.push(mini('info','Repair disponibile','Ticket '+ctx.repairs.tickets+' · interventi '+ctx.repairs.actions+'.','Usare Repair Center come sorgente unica per cause/interventi; AI legge, non duplica.'));
    write(FAIL_KEY,rows); renderMiniList('ai76-fail-insights',rows); return rows;
  }
  function recipeAdvisor(ctx){
    ctx=ctx||buildContext(); var snap=recipeSnapshot(ctx), c=snap.counters, rows=[];
    rows.push(mini(snap.source==='not_found'?'warn':'ok','Ricetta letta',snap.name+' · step '+c.total+(snap.revision?' · rev '+snap.revision:''),'La review è solo lettura: nessuna modifica automatica alla ricetta.'));
    if(!c.total) rows.push(mini('warn','Step non trovati','La ricetta corrente non espone una lista steps leggibile.','Caricare/aprire la ricetta dal Recipe Editor e rilanciare Review ricetta.'));
    if(c.measure && c.withRange<c.measure) rows.push(mini('warn','Misure senza range completo','Misure rilevate '+c.measure+' · step con range '+c.withRange+'.','Completare min/max dove serve per rendere affidabile PASS/FAIL automatico.'));
    else if(c.measure) rows.push(mini('ok','Range misure presenti','Misure '+c.measure+' · range presenti su '+c.withRange+' step.','Mantenere questa struttura per Analytics e AI future.'));
    if(c.measure && c.withRetry<c.measure) rows.push(mini('info','Retry non sempre configurato','Misure '+c.measure+' · retry configurati '+c.withRetry+'.','Valutare retry sui punti instabili, senza cambiare logica del motore test.'));
    if(c.missingDesc) rows.push(mini('warn','Descrizioni step mancanti','Step senza label/descrizione: '+c.missingDesc+'.','Aggiungere descrizioni operative per aiutare operatore e AI Copilot.'));
    rows.push(mini('info','Composizione step','Manuali '+c.manual+' · misure '+c.measure+' · I/O '+c.io+' · wait '+c.wait+'.','Usare queste informazioni per rifinire ricetta esistente, non crearne una duplicata.'));
    write(RECIPE_KEY,rows); renderMiniList('ai76-recipe-insights',rows); return rows;
  }
  function actionPlan(ctx){
    ctx=ctx||buildContext();
    var p=read(PROD_KEY,null)||productionAdvisor(ctx);
    var f=read(FAIL_KEY,null)||failAdvisor(ctx);
    var r=read(RECIPE_KEY,null)||recipeAdvisor(ctx);
    var all=arr(p).concat(arr(f)).concat(arr(r));
    var critical=all.filter(function(x){return x.level==='error'||x.level==='warn';});
    var plan={version:VERSION,createdAt:now(),mode:'read_only_confirm_before_actions',summary:{items:all.length,warnings:critical.length,workOrder:ctx.workOrder||'',recipe:ctx.recipeName||''},steps:critical.concat(all.filter(function(x){return x.level==='info'||x.level==='ok';}).slice(0,5)).slice(0,12).map(function(x,i){return {n:i+1,area:x.title,why:x.detail,action:x.action,level:x.level};})};
    write(ACTION_KEY,plan);
    var box=$('ai76-action-plan');
    if(box){box.innerHTML=arr(plan.steps).map(function(x){return '<div class="ai76-plan-row '+cls(x.level)+'"><b>#'+x.n+' '+esc(x.area)+'</b><small>'+esc(x.why)+'</small><em>'+esc(x.action)+'</em></div>';}).join('') || '<div class="hint">Nessuna azione suggerita.</div>';}
    return plan;
  }

  function objSize(o){try{return o&&typeof o==='object'?Object.keys(o).length:0;}catch(_){return 0;}}
  function moduleRow(name,score,level,evidence,next){return {name:name,score:Math.max(0,Math.min(100,Math.round(num(score)))),level:level||'info',evidence:evidence||'',next:next||''};}
  function moduleMaturity(ctx){
    ctx=ctx||buildContext();
    var rows=[];
    rows.push(moduleRow('WO / Commessa', ctx.workOrder?90:45, ctx.workOrder?'ok':'warn', ctx.workOrder?('WO '+ctx.workOrder+' · Commessa '+(ctx.commessa||'—')):'WO non attiva nel contesto AI', 'Usare Work Orders / MES Ready o commessa manuale esistente.'));
    rows.push(moduleRow('Data Contract 7.4', ctx.dataContract.score||ctx.consistency.score||60, (ctx.dataContract.score>=90||ctx.consistency.score>=90)?'ok':'info', 'Score '+(ctx.dataContract.score||ctx.consistency.score||'n/d')+' · campi '+(ctx.dataContract.fields||0), 'Mantenere sorgenti canoniche senza nuove chiavi.'));
    rows.push(moduleRow('Clean Baseline 7.5', ctx.cleanBaseline.score||ctx.runtimeValidation.score||70, (ctx.cleanBaseline.score===100||ctx.runtimeValidation.score===100)?'ok':'info', 'Clean '+(ctx.cleanBaseline.score||'n/d')+' · runtime '+(ctx.runtimeValidation.score||'n/d'), 'Usare Enterprise Clean Baseline per audit, non nuove pagine diagnostiche.'));
    rows.push(moduleRow('Traceability / Storico', (ctx.serialNumber||ctx.keyStats.traceability)?80:50, (ctx.serialNumber||ctx.keyStats.traceability)?'ok':'info', ctx.serialNumber?('Seriale '+ctx.serialNumber):('chiavi trace '+ctx.keyStats.traceability), 'Leggere Storico/Scheda Unità esistenti.'));
    rows.push(moduleRow('Repair Center', ctx.repairs.tickets||ctx.repairs.actions?82:52, ctx.repairs.tickets||ctx.repairs.actions?'ok':'info', 'Ticket '+ctx.repairs.tickets+' · interventi '+ctx.repairs.actions, 'Repair resta sorgente unica per ticket/interventi.'));
    rows.push(moduleRow('Analytics Center', ctx.reports.total?85:55, ctx.reports.total?'ok':'info', 'Report '+ctx.reports.total+' · PASS '+ctx.reports.pass+' · FAIL '+ctx.reports.fail, 'Non creare KPI doppi: usare Analytics Center.'));
    rows.push(moduleRow('Device Manager', objSize(ctx.devices.safeStatus)||objSize(ctx.devices.enterpriseLast)||objSize(ctx.devices.config)?75:50, objSize(ctx.devices.safeStatus)||objSize(ctx.devices.enterpriseLast)||objSize(ctx.devices.config)?'ok':'info', 'Snapshot device '+(objSize(ctx.devices.safeStatus)+objSize(ctx.devices.enterpriseLast)+objSize(ctx.devices.config)), 'AI legge stato, non comanda hardware.'));
    rows.push(moduleRow('AI Copilot', 92, 'ok', 'Read-only · provider '+(ctx.provider.provider||'local_rules'), 'Prossimo step: provider reale solo con approvazione.'));
    write(MATURITY_KEY,{version:VERSION,createdAt:now(),modules:rows});
    return rows;
  }
  function duplicationGuard(ctx){
    ctx=ctx||buildContext();
    var checks=[];
    function add(label,ok,detail){checks.push({label:label,ok:!!ok,level:ok?'ok':'warn',detail:detail||''});}
    try{
      var scripts=Array.prototype.slice.call(document.querySelectorAll('script[src]')).map(function(x){return x.getAttribute('src')||'';});
      var counts={}; scripts.forEach(function(x){counts[x]=(counts[x]||0)+1;});
      var dupScripts=Object.keys(counts).filter(function(k){return counts[k]>1;});
      add('Script JS duplicati', dupScripts.length===0, dupScripts.join(', ')||'nessuno');
      add('Legacy Work Order 6.0 non caricato', !scripts.some(function(x){return /work-order-product-60/.test(x);}), 'runtime pulito');
      add('Legacy Firmware/Revisions 6.1 non caricato', !scripts.some(function(x){return /revision-firmware-61/.test(x);}), 'runtime pulito');
      add('AI Copilot pagina unica', document.querySelectorAll('#ai-copilot-tab').length===1, 'istanze '+document.querySelectorAll('#ai-copilot-tab').length);
      add('AI Copilot script unico', scripts.filter(function(x){return /ai-copilot-76\.js/.test(x);}).length===1, 'istanze '+scripts.filter(function(x){return /ai-copilot-76\.js/.test(x);}).length);
      var labels=Array.prototype.slice.call(document.querySelectorAll('.side-nav-btn,.submenu-btn')).map(function(x){return norm(x.textContent).replace(/\s+/g,' ');}).filter(Boolean);
      var watched=['Analytics Center','Repair Center','Work Orders / MES Ready','AI Copilot Center'];
      watched.forEach(function(w){var n=labels.filter(function(x){return x.indexOf(w)>=0;}).length; add('Menu principale '+w, n<=1, 'voci '+n);});
    }catch(e){add('Duplication guard runtime', false, String(e&&e.message||e));}
    var result={version:VERSION,createdAt:now(),checks:checks,ok:checks.every(function(c){return c.ok;})};
    write(DUP_KEY,result);
    return result;
  }
  function renderMaturity(rows){
    var box=$('ai762-readiness-matrix'); if(!box)return;
    rows=arr(rows);
    box.innerHTML=rows.map(function(m){return '<div class="ai762-module '+cls(m.level)+'"><div><b>'+esc(m.name)+'</b><small>'+esc(m.evidence)+'</small><em>'+esc(m.next)+'</em></div><span>'+esc(m.score)+'%</span></div>';}).join('')||'<div class="hint">Nessun modulo letto.</div>';
  }
  function renderDuplicationGuard(result){
    var box=$('ai762-duplication-guard'); if(!box)return;
    var checks=arr(result&&result.checks);
    box.innerHTML=checks.map(function(c){return '<div class="ai762-guard-row '+(c.ok?'ok':'warn')+'"><b>'+esc(c.ok?'OK':'CHECK')+'</b><div><span>'+esc(c.label)+'</span><small>'+esc(c.detail)+'</small></div></div>';}).join('')||'<div class="hint">Nessun controllo eseguito.</div>';
  }
  function renderQualitySummary(report){
    var box=$('ai762-quality-summary'); if(!box)return;
    var c=report&&report.context||buildContext();
    var cards=[
      ['WO',c.workOrder||'—'],['Commessa',c.commessa||'—'],['Ricetta',c.recipeName||'—'],['Report',String(c.reports&&c.reports.total||0)],['FAIL',String(c.reports&&c.reports.fail||0)],['Repair',String(c.repairs&&c.repairs.tickets||0)],['Runtime',(c.runtimeValidation&&c.runtimeValidation.score?c.runtimeValidation.score+'%':'n/d')],['Provider',(c.provider&&c.provider.enabled?'ON':'OFF')]
    ];
    box.innerHTML=cards.map(function(x){return '<div class="ai762-quality-card"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>';}).join('');
  }
  function renderCompletePreview(report){
    var box=$('ai762-report-preview'); if(!box)return;
    if(!report){box.innerHTML='<div class="hint">Premi Analisi completa.</div>';return;}
    box.innerHTML='<div class="ai762-preview-score"><span>Score AI Complete</span><b>'+esc(report.score)+'%</b></div>'+
      '<div class="ai762-preview-line"><b>Moduli</b><span>'+esc(report.modules.length)+'</span></div>'+
      '<div class="ai762-preview-line"><b>Insight</b><span>'+esc(report.analysis.insights.length)+'</span></div>'+
      '<div class="ai762-preview-line"><b>Azioni piano</b><span>'+esc((report.actionPlan.steps||[]).length)+'</span></div>'+
      '<div class="ai762-preview-line"><b>Anti-doppioni</b><span>'+esc(report.duplication.ok?'OK':'CHECK')+'</span></div>'+
      '<small>Report pronto per export JSON. AI resta in sola lettura.</small>';
  }
  function renderRoadmapReadiness(report){
    var box=$('ai771-roadmap-readiness'); if(!box)return;
    var r=report||read(COMPLETE_KEY,null);
    var cfg=provider();
    var dup=r&&r.duplication?r.duplication:{ok:false};
    var ctx=r&&r.context?r.context:buildContext();
    var checks=[
      {name:'7.6.2 Copilot completo',ok:!!r,detail:r?'analisi completa disponibile':'premere Analisi completa'},
      {name:'7.7 Provider configurato',ok:!!(cfg&&cfg.provider),detail:(cfg&&cfg.provider)||'local_rules'},
      {name:'Approvazioni manuali',ok:true,detail:'nessuna modifica automatica'},
      {name:'Anti-doppioni',ok:!!(dup&&dup.ok),detail:(dup&&dup.ok)?'runtime/menu puliti':'controllare warning anti-doppioni'},
      {name:'Contesto WO/Commessa',ok:!!(ctx.workOrder||ctx.commessa),detail:(ctx.workOrder||ctx.commessa||'dati non disponibili')},
      {name:'Pronto per 8.0 AI Ready',ok:!!(r&&r.score>=75&&dup&&dup.ok),detail:r?('score '+r.score+'%'):'score non calcolato'}
    ];
    box.innerHTML=checks.map(function(c){return '<div class="ai771-roadmap-step '+(c.ok?'ok':'warn')+'"><b>'+esc(c.ok?'OK':'CHECK')+'</b><span>'+esc(c.name)+'</span><small>'+esc(c.detail)+'</small></div>';}).join('');
  }
  function runCompleteAnalysis(){
    var ctx=buildContext();
    var analysis=localAnalysis(ctx);
    var prod=productionAdvisor(ctx);
    var fail=failAdvisor(ctx);
    var recipe=recipeAdvisor(ctx);
    var plan=actionPlan(ctx);
    var modules=moduleMaturity(ctx);
    var dup=duplicationGuard(ctx);
    var moduleAvg=modules.length?Math.round(modules.reduce(function(a,b){return a+num(b.score);},0)/modules.length):0;
    var penalty=dup.ok?0:8;
    var score=Math.max(0,Math.min(100,Math.round((analysis.score+moduleAvg)/2)-penalty));
    var report={version:VERSION,createdAt:now(),score:score,mode:'read_only_no_automatic_actions',context:ctx,analysis:analysis,production:prod,fail:fail,recipe:recipe,actionPlan:plan,modules:modules,duplication:dup};
    write(COMPLETE_KEY,report);
    renderContext(ctx); renderInsights(analysis); renderMiniList('ai76-production-insights',prod); renderMiniList('ai76-fail-insights',fail); renderMiniList('ai76-recipe-insights',recipe); renderMaturity(modules); renderDuplicationGuard(dup); renderQualitySummary(report); renderCompletePreview(report); renderRoadmapReadiness(report); renderPrompt(buildPrompt(ctx,analysis,report));
    var scoreBox=$('ai76-score'); if(scoreBox) scoreBox.textContent=score+'%';
    var pageScore=$('ai76-page-score'); if(pageScore) pageScore.textContent=score+'%';
    return report;
  }

  function renderAll(){
    var ctx=buildContext();
    renderProvider(ctx.provider);
    renderContext(ctx);
    var analysis=read(INSIGHTS_KEY,null)||localAnalysis(ctx);
    renderInsights(analysis);
    renderPrompt(raw(PROMPT_KEY));
    renderMiniList('ai76-production-insights',read(PROD_KEY,[]));
    renderMiniList('ai76-fail-insights',read(FAIL_KEY,[]));
    renderMiniList('ai76-recipe-insights',read(RECIPE_KEY,[]));
    renderMaturity((read(MATURITY_KEY,{})||{}).modules||[]);
    renderDuplicationGuard(read(DUP_KEY,null));
    renderQualitySummary(read(COMPLETE_KEY,null)||{context:ctx});
    renderCompletePreview(read(COMPLETE_KEY,null));
    renderRoadmapReadiness(read(COMPLETE_KEY,null));
    var plan=read(ACTION_KEY,null);
    if(plan&&plan.steps){var box=$('ai76-action-plan'); if(box)box.innerHTML=arr(plan.steps).map(function(x){return '<div class="ai76-plan-row '+cls(x.level)+'"><b>#'+x.n+' '+esc(x.area)+'</b><small>'+esc(x.why)+'</small><em>'+esc(x.action)+'</em></div>';}).join('');}
    var ps=$('ai76-page-score'); if(ps)ps.textContent=(read(COMPLETE_KEY,null)||{}).score?((read(COMPLETE_KEY,null)||{}).score+'%'):((analysis&&analysis.score)?analysis.score+'%':'AI');
  }
  function download(name,text,type){var blob=new Blob([text],{type:type||'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(_){ }},800);}

  window.buildAiProjectContext76=function(){setActiveAiSection('context'); var ctx=buildContext(); renderContext(ctx); toast('Contesto AI aggiornato','success'); return ctx;};
  window.runAiLocalAnalysis76=function(){setActiveAiSection('context'); var ctx=buildContext(); var r=localAnalysis(ctx); renderContext(ctx); renderInsights(r); renderPrompt(buildPrompt(ctx,r)); toast('Analisi AI locale completata','success'); focusAiPanel('ai76-context-grid'); return r;};
  window.createAiPrompt76=function(){setActiveAiSection('prompt'); var ctx=buildContext(); var r=localAnalysis(ctx); var p=buildPrompt(ctx,r); renderContext(ctx); renderInsights(r); renderPrompt(p); toast('Prompt AI generato in modalità anti-doppioni','success'); focusAiPanel('ai76-prompt'); return p;};
  window.exportAiContext76=function(){var ctx=buildContext(); var r=localAnalysis(ctx); download('AT_MEC_HM_9_0_AI_CONTEXT_'+Date.now()+'.json',JSON.stringify({context:ctx,analysis:r},null,2),'application/json');};
  window.copyAiPrompt76=function(){
    setActiveAiSection('prompt');
    var ctx=buildContext();
    var prompt=raw(PROMPT_KEY)||buildPrompt(ctx,localAnalysis(ctx));
    renderPrompt(prompt);
    var copied=false;
    var fallback=function(){
      try{selectAiPromptBox(); copied=document.execCommand&&document.execCommand('copy');}catch(_e){copied=false;}
      toast(copied?'Prompt AI copiato negli appunti':'Prompt AI pronto nel box testo: selezionalo/copia manualmente',copied?'success':'info');
      focusAiPanel('ai76-prompt');
    };
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(prompt).then(function(){toast('Prompt AI copiato negli appunti','success'); focusAiPanel('ai76-prompt');}).catch(fallback);
    }else fallback();
    return prompt;
  };
  window.runAiProductionAdvisor76=function(){setActiveAiSection('production'); var rows=productionAdvisor(buildContext()); renderMiniList('ai76-production-insights',rows); toast('Produzione / WO aggiornata: '+rows.length+' insight','success'); focusAiPanel('ai76-production-insights'); return rows;};
  window.runAiFailAdvisor76=function(){setActiveAiSection('fail'); var rows=failAdvisor(buildContext()); renderMiniList('ai76-fail-insights',rows); toast('FAIL / Qualità aggiornata: '+rows.length+' insight','success'); focusAiPanel('ai76-fail-insights'); return rows;};
  window.runAiRecipeAdvisor76=function(){setActiveAiSection('recipe'); var rows=recipeAdvisor(buildContext()); renderMiniList('ai76-recipe-insights',rows); toast('Review ricetta aggiornata: '+rows.length+' insight','success'); focusAiPanel('ai76-recipe-insights'); return rows;};
  window.createAiActionPlan76=function(){setActiveAiSection('plan'); var plan=actionPlan(buildContext()); toast('Piano azione AI locale creato: '+arr(plan.steps).length+' azioni','success'); focusAiPanel('ai76-action-plan'); return plan;};
  window.exportAiFullReport76=function(){var report=read(COMPLETE_KEY,null)||runCompleteAnalysis(); download('AT_MEC_HM_9_0_AI_FULL_REPORT_'+Date.now()+'.json',JSON.stringify(report,null,2),'application/json'); toast('Report AI esportato','success'); return report;};
  window.runAiCompleteAnalysis762=function(){setActiveAiSection('complete'); var report=runCompleteAnalysis(); toast('Analisi AI completa 9.0 completata','success'); focusAiPanel('ai762-report-preview'); return report;};
  window.exportAiCompleteReport762=function(){var report=read(COMPLETE_KEY,null)||runCompleteAnalysis(); download('AT_MEC_HM_9_0_AI_COMPLETE_REPORT_'+Date.now()+'.json',JSON.stringify(report,null,2),'application/json'); toast('Report AI completo esportato','success'); return report;};
  window.saveAiProviderSettings76=saveProviderFromUi;
  window.showAiCopilot76=function(){
    try{if(window.showTab)window.showTab('ai-copilot-tab',null); else if(typeof window.showEnterpriseBackbone75==='function')window.showEnterpriseBackbone75();}catch(_){if(typeof window.showEnterpriseBackbone75==='function')window.showEnterpriseBackbone75();}
    setTimeout(function(){try{renderAll(); var el=$('enterprise76-ai-card'); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){console.warn('[AI 9.0]',e);}},250);
  };

  function init(){setTimeout(function(){try{renderAll(); restoreActiveAiSection();}catch(e){console.warn('[AI 9.0 init]',e);}},1100);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
