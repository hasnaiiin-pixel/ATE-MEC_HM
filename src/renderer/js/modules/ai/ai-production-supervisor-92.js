// AT-MEC_HM 9.2 - AI Production Supervisor Safe
// Supervisione produzione read-only sopra WO, Analytics, Repair, Factory, Device, AI Ready e Action Queue esistenti.
(function(){
  'use strict';
  var VERSION='AT-MEC_HM_9.2_AI_PRODUCTION_SUPERVISOR_SAFE';
  var REPORT_KEY='atmec92_ai_production_supervisor_report';

  function $(id){return document.getElementById(id);} 
  function now(){return new Date().toISOString();}
  function arr(v){return Array.isArray(v)?v:[];}
  function norm(v){return String(v==null?'':v).trim();}
  function num(v){var n=Number(v);return isFinite(n)?n:0;}
  function pct(n){n=Number(n);return isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):0;}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function read(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(_e){return d;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v,null,2));}catch(_e){}}
  function raw(k){try{return localStorage.getItem(k)||'';}catch(_e){return '';}}
  function first(){for(var i=0;i<arguments.length;i++){var v=arguments[i]; if(v&&typeof v==='object')return v; var s=norm(v); if(s)return s;} return '';}
  function toast(m,t){
    try{
      var status=$('ai76-ui-status');
      if(status){status.textContent=m;status.className='ai76-ui-status '+String(t||'info');}
      var fn=(typeof window.showToast==='function')?window.showToast:((typeof window.toast==='function')?window.toast:null);
      if(fn)fn(m,t||'info');else console.log('[AI 9.2]',m);
    }catch(_e){console.log('[AI 9.2]',m);}
  }
  function formatMin(min){
    min=Math.round(num(min));
    if(min<=0)return 'n/d';
    if(min<60)return min+' min';
    var h=Math.floor(min/60), m=min%60;
    return h+'h '+(m?m+'m':'');
  }
  function safeObject(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}
  function deepCountWords(value,pattern){
    var s='';
    try{s=JSON.stringify(value||{}).toLowerCase();}catch(_e){s=String(value||'').toLowerCase();}
    var m=s.match(pattern);
    return m?m.length:0;
  }
  function storageScan(){
    var out={keys:0,woKeys:0,analyticsKeys:0,repairKeys:0,traceKeys:0,factoryKeys:0,deviceKeys:0,recipeKeys:0,aiKeys:0,passLike:0,failLike:0,testRows:0};
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=String(localStorage.key(i)||'');
        var l=k.toLowerCase();
        if(!/^atmec|^recipe_|^layout_/.test(l)) continue;
        out.keys++;
        if(l.indexOf('wo')>=0||l.indexOf('work')>=0||l.indexOf('commessa')>=0||l.indexOf('mes')>=0) out.woKeys++;
        if(l.indexOf('analytic')>=0||l.indexOf('report')>=0||l.indexOf('kpi')>=0||l.indexOf('test')>=0) out.analyticsKeys++;
        if(l.indexOf('repair')>=0||l.indexOf('ticket')>=0) out.repairKeys++;
        if(l.indexOf('trace')>=0||l.indexOf('serial')>=0||l.indexOf('unit')>=0) out.traceKeys++;
        if(l.indexOf('factory')>=0||l.indexOf('station')>=0||l.indexOf('sync')>=0) out.factoryKeys++;
        if(l.indexOf('device')>=0||l.indexOf('pl303')>=0||l.indexOf('meter')>=0||l.indexOf('instrument')>=0) out.deviceKeys++;
        if(l.indexOf('recipe')>=0||l.indexOf('ricetta')>=0) out.recipeKeys++;
        if(l.indexOf('ai')>=0) out.aiKeys++;
        var v=raw(k).toLowerCase();
        out.failLike += (v.match(/\bfail\b|failed|ko|error|errore/g)||[]).length;
        out.passLike += (v.match(/\bpass\b|passed|ok/g)||[]).length;
        if(/test|result|history|serial/.test(l)) out.testRows += Math.min(50, deepCountWords(v,/\bpass\b|\bfail\b|passed|failed/g));
      }
    }catch(_e){}
    return out;
  }
  function collectWorkOrder(){
    var unified=safeObject(read('atmec74_unified_context',{}));
    var canonical=safeObject(read('atmec75_canonical_context',{}));
    var aiCtx=safeObject(read('atmec76_ai_context',{}));
    var candidates=[
      read('atmec_current_work_order',null),
      read('atmec_active_work_order',null),
      read('atmec_selected_work_order_for_test',null),
      unified.workOrder,
      canonical.workOrder,
      aiCtx.workOrder
    ];
    var obj=candidates.filter(function(x){return x&&typeof x==='object';})[0]||{};
    var text=candidates.filter(function(x){return typeof x==='string'&&x.trim();})[0]||'';
    var qty=num(first(obj.qty,obj.quantity,obj.total,obj.targetQty,obj.expectedQty,obj.totalQty,obj.qtyTarget));
    var pass=num(first(obj.pass,obj.passed,obj.donePass,obj.good,obj.ok));
    var fail=num(first(obj.fail,obj.failed,obj.error,obj.scrap,obj.ko));
    var done=num(first(obj.done,obj.completed,obj.produced,obj.count,obj.doneQty));
    if(!done && (pass||fail))done=pass+fail;
    if(!pass && done && fail && done>=fail)pass=done-fail;
    var residue=qty?Math.max(0,qty-done):0;
    return {
      raw:obj||text,
      code:first(obj.code,obj.wo,obj.id,obj.name,obj.number,text),
      commessa:first(obj.commessa,obj.lot,obj.lotNumber,obj.order,obj.code,read('atmec_lot_number',''),aiCtx.commessa),
      customer:first(obj.customer,obj.cliente,obj.client,aiCtx.cliente,canonical.customer,unified.customer),
      product:first(obj.product,obj.prodotto,obj.board,obj.codiceScheda,obj.item,aiCtx.product),
      recipe:first(obj.recipe,obj.recipeName,obj.ricetta,aiCtx.recipe,canonical.recipe),
      revision:first(obj.revision,obj.rev,obj.fwRevision,aiCtx.revision),
      qty:qty,pass:pass,fail:fail,done:done,residue:residue,
      yield:done?pct(pass/done*100):0,
      completion:qty?pct(done/qty*100):0
    };
  }
  function collectTiming(wo){
    var explicit=[read('atmec90_ai_factory_command_report',{}),read('atmec80_ai_ready_report',{}),read('atmec762_ai_complete_report',{})];
    var avg=0, elapsed=0;
    explicit.forEach(function(r){
      if(!r||typeof r!=='object')return;
      avg=avg||num(r.avgCycleMin)||num(r.avgCycleTimeMin)||num(r.averageCycleMin)||num(r.production&&r.production.avgCycleMin)||num(r.workOrder&&r.workOrder.avgCycleMin);
      elapsed=elapsed||num(r.elapsedMin)||num(r.production&&r.production.elapsedMin)||num(r.workOrder&&r.workOrder.elapsedMin);
    });
    if(!avg){
      // Default prudente per stima operativa quando non esistono tempi storici leggibili.
      avg = wo && wo.done ? 1.5 : 0;
    }
    var remaining=wo&&wo.residue&&avg?wo.residue*avg:0;
    var total=wo&&wo.qty&&avg?wo.qty*avg:0;
    return {avgCycleMin:avg,elapsedMin:elapsed,remainingMin:remaining,totalEstimatedMin:total,source:avg?'context_or_safe_estimate':'missing'};
  }
  function collectProvider(){
    var c=safeObject(read('atmec77_ai_provider_config',read('atmec76_ai_provider_config',{})));
    return {enabled:!!c.enabled,provider:c.provider||c.type||'local_rules',model:c.model||'',approvalRequired:c.approvalRequired!==false && c.requireConfirmation!==false,allowExternal:!!c.allowExternal,hasApiKey:!!c.hasApiKey};
  }
  function countQueue(){
    var q=arr(read('atmec91_ai_action_queue',[]));
    return {total:q.length,pending:q.filter(function(x){return String(x.status||'PENDING')==='PENDING';}).length,approved:q.filter(function(x){return String(x.status||'').indexOf('APPROVED')===0;}).length,rejected:q.filter(function(x){return String(x.status||'')==='REJECTED';}).length,done:q.filter(function(x){return String(x.status||'')==='DONE_MANUAL';}).length,high:q.filter(function(x){return String(x.priority||'').toUpperCase()==='HIGH';}).length};
  }
  function collectRuntime(){
    var r=safeObject(read('atmec90_runtime_validation',read('atmec80_runtime_validation',read('atmec77_runtime_validation',{}))));
    return {score:num(r.score),result:r.result||'',checks:arr(r.checks).length};
  }
  function collectAiReady(){var r=safeObject(read('atmec80_ai_ready_report',{})); return {score:num(r.score),status:r.status||'',createdAt:r.createdAt||'',safeMode:r.safeMode||{}};}
  function buildRisks(wo,timing,scan,queue,provider,aiReady,runtime){
    var risks=[];
    var failRate=(wo.done?wo.fail/wo.done*100:(scan.failLike&&scan.passLike?scan.failLike/(scan.failLike+scan.passLike)*100:0));
    var completionRisk=0;
    if(!wo.code&&!wo.commessa) completionRisk+=35;
    if(wo.qty && wo.completion<50) completionRisk+=15;
    if(!wo.qty) completionRisk+=12;
    risks.push({area:'Produzione / WO',score:pct(completionRisk),level:completionRisk>=35?'HIGH':(completionRisk>=15?'MEDIUM':'LOW'),message:(!wo.code&&!wo.commessa)?'WO/Commessa non leggibile dal contesto.':'Avanzamento WO '+(wo.completion||0)+'% · residuo '+(wo.residue||0)});
    var qualityRisk=0;
    if(failRate>=15)qualityRisk+=45; else if(failRate>=5)qualityRisk+=25; else if(failRate>0)qualityRisk+=10;
    if(scan.failLike>scan.passLike&&scan.failLike>0)qualityRisk+=12;
    risks.push({area:'Qualità / FAIL',score:pct(qualityRisk),level:qualityRisk>=35?'HIGH':(qualityRisk>=15?'MEDIUM':'LOW'),message:'Fail rate stimato '+Math.round(failRate)+'% · riferimenti FAIL locali '+scan.failLike});
    var timeRisk=0;
    if(wo.residue&&timing.remainingMin>120)timeRisk+=35; else if(wo.residue&&timing.remainingMin>45)timeRisk+=20;
    if(wo.qty&&!timing.avgCycleMin)timeRisk+=12;
    risks.push({area:'Tempo produzione',score:pct(timeRisk),level:timeRisk>=30?'HIGH':(timeRisk>=15?'MEDIUM':'LOW'),message:'Tempo residuo stimato '+formatMin(timing.remainingMin)+' · ciclo medio '+(timing.avgCycleMin?timing.avgCycleMin.toFixed(1)+' min':'n/d')});
    var dataRisk=0;
    if(!aiReady.score)dataRisk+=18; else if(aiReady.score<80)dataRisk+=20;
    if(runtime.score&&runtime.score<90)dataRisk+=15;
    if(!scan.analyticsKeys)dataRisk+=8;
    risks.push({area:'Dati / AI Ready',score:pct(dataRisk),level:dataRisk>=30?'HIGH':(dataRisk>=15?'MEDIUM':'LOW'),message:'AI Ready '+(aiReady.score||'n/d')+'% · Runtime '+(runtime.score||'n/d')+'%'});
    var opRisk=0;
    if(queue.pending>0)opRisk+=Math.min(40,queue.pending*8);
    if(queue.high>0)opRisk+=15;
    if(provider.allowExternal&&!provider.approvalRequired)opRisk+=35;
    risks.push({area:'Operatività / Azioni',score:pct(opRisk),level:opRisk>=35?'HIGH':(opRisk>=15?'MEDIUM':'LOW'),message:queue.pending+' azioni da valutare · '+queue.high+' priorità alta'});
    return risks;
  }
  function stateFromRisk(score){return score>=70?'RED':(score>=35?'YELLOW':'GREEN');}
  function clsState(state){return state==='GREEN'?'ok':(state==='YELLOW'?'warn':'bad');}
  function buildActions(wo,timing,risks,queue,scan){
    var out=[];
    function add(priority,area,text){out.push({priority:priority,area:area,action:text,manualOnly:true,noRuntimeChange:true});}
    if(!wo.code&&!wo.commessa)add('HIGH','WO','Selezionare o verificare WO/Commessa prima di usare supervisione produzione.');
    if(wo.qty&&wo.residue>0)add(timing.remainingMin>120?'HIGH':'MEDIUM','Produzione','Verificare avanzamento: residuo '+wo.residue+' schede, stima '+formatMin(timing.remainingMin)+'.');
    if(wo.done&&wo.fail>0)add((wo.fail/wo.done)>=0.15?'HIGH':'MEDIUM','Qualità','Analizzare top FAIL in Analytics e correlare con ricetta/fixture prima di proseguire lotto.');
    if(scan.deviceKeys===0)add('MEDIUM','Strumenti','Controllare stato Device Manager/strumenti: dati device non leggibili nel contesto locale.');
    if(queue.pending>0)add(queue.high>0?'HIGH':'MEDIUM','Action Queue','Valutare '+queue.pending+' azioni AI pendenti nella coda 9.1.');
    if(!out.length)add('LOW','Produzione','Nessuna criticità evidente: continuare produzione monitorando WO e AI Command Center.');
    return out.slice(0,8);
  }
  function buildReport(){
    var wo=collectWorkOrder();
    var timing=collectTiming(wo);
    var scan=storageScan();
    var queue=countQueue();
    var provider=collectProvider();
    var runtime=collectRuntime();
    var aiReady=collectAiReady();
    var risks=buildRisks(wo,timing,scan,queue,provider,aiReady,runtime);
    var globalRisk=pct(risks.reduce(function(s,r){return s+num(r.score);},0)/Math.max(1,risks.length));
    var state=stateFromRisk(globalRisk);
    var actions=buildActions(wo,timing,risks,queue,scan);
    var report={version:VERSION,createdAt:now(),mode:'READ_ONLY_PRODUCTION_SUPERVISOR',state:state,riskScore:globalRisk,workOrder:wo,timing:timing,quality:{failRate:wo.done?Math.round(wo.fail/wo.done*100):0,passLike:scan.passLike,failLike:scan.failLike},dataCoverage:scan,actionQueue:queue,provider:provider,runtime:runtime,aiReady:aiReady,risks:risks,recommendedActions:actions,safety:{noAutomaticRuntimeChanges:true,noRecipeChanges:true,noWoChanges:true,noHardwareChanges:true,noUserChanges:true,noRepairAutoOpen:true,apiKeyExported:false},note:'9.2 supervisiona produzione leggendo dati esistenti. Non crea nuove dashboard business e non applica azioni.'};
    write(REPORT_KEY,report);
    return report;
  }
  function renderKpis(r){
    var box=$('ai92-production-kpi'); if(!box)return;
    var w=r.workOrder,t=r.timing;
    var items=[['WO',w.code||w.commessa||'n/d'],['Totale',w.qty||'n/d'],['Prodotte',w.done||0],['Residuo',w.residue||0],['PASS',w.pass||0],['FAIL',w.fail||0],['Yield',w.yield? w.yield+'%':'n/d'],['Tempo residuo',formatMin(t.remainingMin)]];
    box.innerHTML=items.map(function(x){return '<div class="ai92-kpi"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>';}).join('');
  }
  function renderRisks(r){
    var box=$('ai92-risk-lanes'); if(!box)return;
    box.innerHTML=arr(r.risks).map(function(x){return '<div class="ai92-risk '+String(x.level||'LOW').toLowerCase()+'"><div><b>'+esc(x.area)+'</b><span>'+esc(x.level)+' · '+esc(x.score)+'%</span></div><p>'+esc(x.message)+'</p><i style="width:'+pct(x.score)+'%"></i></div>';}).join('');
  }
  function renderActions(r){
    var box=$('ai92-supervisor-actions'); if(!box)return;
    box.innerHTML=arr(r.recommendedActions).map(function(x,i){return '<div class="ai92-action '+String(x.priority||'LOW').toLowerCase()+'"><b>#'+(i+1)+' · '+esc(x.area)+'</b><span>'+esc(x.priority)+'</span><p>'+esc(x.action)+'</p></div>';}).join('');
  }
  function renderChecklist(r){
    var box=$('ai92-operator-checklist'); if(!box)return;
    var checks=[
      {ok:!!(r.workOrder.code||r.workOrder.commessa),label:'WO/Commessa leggibile'},
      {ok:!!r.workOrder.qty||!!r.workOrder.done,label:'Quantità produzione disponibili'},
      {ok:r.quality.failRate<15,label:'Fail rate sotto soglia alta'},
      {ok:r.actionQueue.pending===0,label:'Nessuna azione AI pendente'},
      {ok:r.provider.approvalRequired!==false,label:'Provider AI con approvazione manuale'},
      {ok:r.safety.noAutomaticRuntimeChanges,label:'Safe mode read-only attivo'}
    ];
    box.innerHTML=checks.map(function(c){return '<div class="ai92-check '+(c.ok?'ok':'warn')+'"><span>'+(c.ok?'✓':'!')+'</span><b>'+esc(c.label)+'</b></div>';}).join('');
  }
  function renderPreview(r){
    var box=$('ai92-report-preview'); if(!box)return;
    box.innerHTML='<div class="ai92-preview-line"><b>Stato supervisione</b><span>'+esc(r.state)+' · rischio '+esc(r.riskScore)+'%</span></div>'+
      '<div class="ai92-preview-line"><b>WO</b><span>'+esc(r.workOrder.code||r.workOrder.commessa||'n/d')+'</span></div>'+
      '<div class="ai92-preview-line"><b>Avanzamento</b><span>'+esc(r.workOrder.completion)+'% · residuo '+esc(r.workOrder.residue)+'</span></div>'+
      '<div class="ai92-preview-line"><b>Sicurezza</b><span>read-only · no auto action · API key esclusa</span></div>';
  }
  function render(r){
    r=r||read(REPORT_KEY,null)||buildReport();
    var score=$('ai92-supervisor-score'); if(score)score.textContent=r.riskScore+'%';
    var state=$('ai92-supervisor-state'); if(state){state.textContent=r.state;state.className='ai92-supervisor-state '+clsState(r.state);}
    renderKpis(r); renderRisks(r); renderActions(r); renderChecklist(r); renderPreview(r);
  }
  function selectSection(){
    try{
      document.querySelectorAll('[data-ai-main],[data-ai-action]').forEach(function(btn){var m=btn.getAttribute('data-ai-main')==='supervisor92';btn.classList.toggle('ai76-action-selected',m);if(m)btn.setAttribute('aria-pressed','true');else if(btn.getAttribute('data-ai-main'))btn.removeAttribute('aria-pressed');});
      document.querySelectorAll('.ai76-section-selected').forEach(function(el){el.classList.remove('ai76-section-selected');});
      var p=$('ai92-production-supervisor'); if(p)p.classList.add('ai76-section-selected');
    }catch(_e){}
  }
  function download(name,text){var blob=new Blob([text],{type:'application/json'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(_e){}},800);}

  window.runAiProductionSupervisor92=function(){
    selectSection();
    try{if(typeof window.runAiFactoryCommand90==='function')window.runAiFactoryCommand90();}catch(_e){}
    try{if(typeof window.refreshAiActionQueue91==='function')window.refreshAiActionQueue91();}catch(_e){}
    var r=buildReport(); render(r); selectSection();
    toast('AI Production Supervisor 9.2 aggiornato: rischio '+r.riskScore+'% · '+r.state,'success');
    try{var el=$('ai92-production-supervisor'); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});}catch(_e){}
    return r;
  };
  window.exportAiProductionSupervisor92=function(){var r=read(REPORT_KEY,null)||buildReport(); download('AT_MEC_HM_9_2_AI_PRODUCTION_SUPERVISOR_REPORT_'+Date.now()+'.json',JSON.stringify(r,null,2)); toast('Report AI Production Supervisor 9.2 esportato','success'); return r;};
  window.showAiProductionSupervisor92=function(){try{if(typeof window.showAiCopilot76==='function')window.showAiCopilot76();else if(window.showTab)window.showTab('ai-copilot-tab',null);}catch(_e){} setTimeout(function(){selectSection(); render(read(REPORT_KEY,null)||buildReport()); try{var el=$('ai92-production-supervisor'); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});}catch(_e){}},360);};
  function init(){setTimeout(function(){try{render(read(REPORT_KEY,null)||buildReport());}catch(e){console.warn('[AI 9.2 init]',e);}},2400);} 
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
