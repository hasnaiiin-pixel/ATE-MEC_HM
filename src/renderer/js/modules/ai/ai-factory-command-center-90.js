// AT-MEC_HM 9.0 - AI Factory Command Center
// Vista AI centrale sopra moduli esistenti. Read-only: non crea nuovi moduli business e non modifica runtime.
(function(){
  'use strict';
  var VERSION='AT-MEC_HM_9.0_AI_FACTORY_COMMAND_CENTER';
  var REPORT_KEY='atmec90_ai_factory_command_report';

  function $(id){return document.getElementById(id);}
  function now(){return new Date().toISOString();}
  function arr(v){return Array.isArray(v)?v:[];}
  function norm(v){return String(v==null?'':v).trim();}
  function num(v){var n=Number(v);return isFinite(n)?n:0;}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function read(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(_e){return d;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v,null,2));}catch(_e){}}
  function raw(k){try{return localStorage.getItem(k)||'';}catch(_e){return '';}}
  function first(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v&&typeof v==='object')return v;var s=norm(v);if(s)return s;}return '';}
  function toast(m,t){
    try{
      var status=$('ai76-ui-status');
      if(status){status.textContent=m;status.className='ai76-ui-status '+String(t||'info');}
      var fn=(typeof window.showToast==='function')?window.showToast:((typeof window.toast==='function')?window.toast:null);
      if(fn)fn(m,t||'info');else console.log('[AI 9.0]',m);
    }catch(_e){console.log('[AI 9.0]',m);}
  }
  function storageStats(){
    var out={total:0,wo:0,analytics:0,repair:0,traceability:0,factory:0,device:0,ai:0,recipe:0,failLike:0,passLike:0};
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=String(localStorage.key(i)||'');
        var l=k.toLowerCase();
        if(!/^atmec|^recipe_|^layout_/.test(l)) continue;
        out.total++;
        var value=raw(k).toLowerCase();
        if(l.indexOf('wo')>=0||l.indexOf('work')>=0||l.indexOf('commessa')>=0||l.indexOf('mes')>=0) out.wo++;
        if(l.indexOf('analytic')>=0||l.indexOf('report')>=0||l.indexOf('kpi')>=0||l.indexOf('test')>=0) out.analytics++;
        if(l.indexOf('repair')>=0||l.indexOf('ticket')>=0) out.repair++;
        if(l.indexOf('trace')>=0||l.indexOf('serial')>=0||l.indexOf('unit')>=0) out.traceability++;
        if(l.indexOf('factory')>=0||l.indexOf('station')>=0||l.indexOf('sync')>=0) out.factory++;
        if(l.indexOf('device')>=0||l.indexOf('pl303')>=0||l.indexOf('meter')>=0||l.indexOf('instrument')>=0) out.device++;
        if(l.indexOf('ai')>=0) out.ai++;
        if(l.indexOf('recipe')>=0||l.indexOf('ricetta')>=0) out.recipe++;
        if(/\bfail\b|failed|ko|error|errore/.test(value)) out.failLike++;
        if(/\bpass\b|passed|ok/.test(value)) out.passLike++;
      }
    }catch(_e){}
    return out;
  }
  function collectWorkOrder(){
    var candidates=[
      read('atmec_current_work_order',null),
      read('atmec_active_work_order',null),
      read('atmec_selected_work_order_for_test',null),
      read('atmec74_unified_context',{}).workOrder,
      read('atmec75_canonical_context',{}).workOrder,
      read('atmec76_ai_context',{}).workOrder
    ];
    var obj=candidates.filter(function(x){return x&&typeof x==='object';})[0]||{};
    var text=candidates.filter(function(x){return typeof x==='string'&&x.trim();})[0]||'';
    return {
      raw:obj||text,
      code:first(obj.code,obj.wo,obj.id,obj.name,obj.number,text),
      commessa:first(obj.commessa,obj.lot,obj.lotNumber,obj.order,obj.code,read('atmec_lot_number',''),read('atmec76_ai_context',{}).commessa),
      customer:first(obj.customer,obj.cliente,obj.client,read('atmec76_ai_context',{}).cliente),
      product:first(obj.product,obj.prodotto,obj.board,obj.codiceScheda,obj.item),
      qty:num(first(obj.qty,obj.quantity,obj.total,obj.targetQty,obj.expectedQty)),
      pass:num(first(obj.pass,obj.passed,obj.donePass,obj.good)),
      fail:num(first(obj.fail,obj.failed,obj.error,obj.scrap)),
      done:num(first(obj.done,obj.completed,obj.produced,obj.count))
    };
  }
  function collectApprovals(){
    var q=arr(read('atmec77_ai_approval_queue',[]));
    return {
      total:q.length,
      pending:q.filter(function(x){return String(x.status||'PENDING')==='PENDING';}).length,
      approved:q.filter(function(x){return String(x.status||'').indexOf('APPROVED')===0;}).length,
      rejected:q.filter(function(x){return String(x.status||'')==='REJECTED';}).length
    };
  }
  function collectProvider(){
    var c=read('atmec77_ai_provider_config',read('atmec76_ai_provider_config',{}))||{};
    return {enabled:!!c.enabled,provider:c.provider||'local_rules',model:c.model||'',approvalRequired:c.approvalRequired!==false && c.requireConfirmation!==false,hasApiKey:!!c.hasApiKey,allowExternal:!!c.allowExternal};
  }
  function collectRuntime(){
    var r=read('atmec80_runtime_validation',read('atmec77_runtime_validation',read('atmec75_runtime_validation',{})))||{};
    return {score:num(r.score),result:r.result||'',checks:arr(r.checks).length};
  }
  function collectAiReady(){
    var r=read('atmec80_ai_ready_report',{})||{};
    return {score:num(r.score),status:r.status||'',safeMode:r.safeMode||{},createdAt:r.createdAt||''};
  }
  function moduleStatus(label,count,extra){
    return {label:label,count:count,status:count>0?'CONNECTED':'NO_DATA',detail:extra||''};
  }
  function buildReport(){
    var storage=storageStats();
    var wo=collectWorkOrder();
    var approvals=collectApprovals();
    var provider=collectProvider();
    var runtime=collectRuntime();
    var aiReady=collectAiReady();
    var complete=read('atmec762_ai_complete_report',{})||{};
    var risk=10;
    var anomalies=[];
    if(!wo.code && !wo.commessa){risk+=15;anomalies.push({level:'WARN',area:'WO',message:'Nessuna WO/Commessa attiva leggibile dal contesto AI.'});}
    if(aiReady.score && aiReady.score<80){risk+=15;anomalies.push({level:'WARN',area:'AI Ready',message:'AI Ready score sotto soglia enterprise: '+aiReady.score+'%.'});}
    if(!aiReady.score){risk+=10;anomalies.push({level:'CHECK',area:'AI Ready',message:'Eseguire prima Aggiorna AI Ready 8.0 per avere baseline completa.'});}
    if(runtime.score && runtime.score<90){risk+=12;anomalies.push({level:'WARN',area:'Runtime',message:'Runtime validation sotto soglia: '+runtime.score+'%.'});}
    if(approvals.pending>0){risk+=10;anomalies.push({level:'CHECK',area:'Approvazioni',message:'Ci sono '+approvals.pending+' suggerimenti AI ancora da valutare.'});}
    if(provider.allowExternal && !provider.approvalRequired){risk+=35;anomalies.push({level:'CRITICAL',area:'Provider',message:'Provider esterno senza approvazione manuale obbligatoria.'});}
    if(storage.failLike>storage.passLike && storage.failLike>0){risk+=8;anomalies.push({level:'CHECK',area:'Qualità',message:'Nei dati locali compaiono più riferimenti FAIL/errore rispetto a PASS/OK.'});}
    if(!storage.analytics){risk+=5;anomalies.push({level:'INFO',area:'Analytics',message:'Dati Analytics non ancora presenti nel contesto locale.'});}
    risk=Math.max(0,Math.min(100,Math.round(risk)));
    var status=risk>=70?'RED':(risk>=35?'YELLOW':'GREEN');
    var actions=[];
    if(!wo.code&&!wo.commessa) actions.push('Selezionare una WO oppure inserire Commessa manuale prima di usare analisi produzione AI.');
    if(!aiReady.score) actions.push('Aprire AI Ready 8.0 e premere Aggiorna AI Ready 8.0.');
    if(approvals.pending>0) actions.push('Valutare la coda approvazioni AI: approvare o rifiutare le voci pendenti.');
    if(provider.allowExternal) actions.push('Prima di usare provider esterno, verificare che API key non venga esportata e confermare manualmente ogni invio.');
    if(!actions.length) actions.push('Sistema AI pronto: continuare produzione e usare AI Factory Command Center come supervisore read-only.');
    var modules=[
      moduleStatus('WO / MES Ready',storage.wo,wo.code||wo.commessa||'nessuna WO attiva'),
      moduleStatus('Analytics Center',storage.analytics,storage.failLike+' fail-like / '+storage.passLike+' pass-like'),
      moduleStatus('Repair Center',storage.repair,'dati repair/ticket locali'),
      moduleStatus('Traceability',storage.traceability,'seriali/unità/storico'),
      moduleStatus('Factory / Station',storage.factory,'stazione/sync/factory'),
      moduleStatus('Device Manager',storage.device,'strumenti/device'),
      moduleStatus('Ricette',storage.recipe,'recipe/layout keys'),
      moduleStatus('AI Copilot',storage.ai,'AI Ready '+(aiReady.score||'n/d')+'%')
    ];
    var report={
      version:VERSION,
      createdAt:now(),
      mode:'READ_ONLY_COMMAND_CENTER',
      status:status,
      riskScore:risk,
      workOrder:wo,
      provider:provider,
      approvals:approvals,
      runtime:runtime,
      aiReady:aiReady,
      completeScore:num(complete.score),
      storage:storage,
      modules:modules,
      anomalies:anomalies,
      recommendedActions:actions,
      safety:{noAutomaticRuntimeChanges:true,noRecipeChanges:true,noWoChanges:true,noHardwareChanges:true,noUserChanges:true,approvalOnly:true,apiKeyExported:false},
      note:'9.0 legge moduli esistenti e genera supervisione AI. Non crea nuove dashboard business duplicate.'
    };
    write(REPORT_KEY,report);
    return report;
  }
  function clsStatus(s){return s==='GREEN'?'ok':(s==='YELLOW'?'warn':'bad');}
  function render(report){
    report=report||read(REPORT_KEY,null)||buildReport();
    var score=$('ai90-command-score'); if(score) score.textContent=report.riskScore+'%';
    var state=$('ai90-command-state'); if(state){state.textContent=report.status;state.className='ai90-command-state '+clsStatus(report.status);} 
    var grid=$('ai90-command-status-grid');
    if(grid){
      var rows=[
        ['Rischio',report.status+' · '+report.riskScore+'%'],
        ['WO',report.workOrder.code||report.workOrder.commessa||'n/d'],
        ['AI Ready',report.aiReady.score?report.aiReady.score+'%':'n/d'],
        ['Provider',report.provider.provider+(report.provider.enabled?' ON':' OFF')],
        ['Approvazioni','P '+report.approvals.pending+' · A '+report.approvals.approved+' · R '+report.approvals.rejected],
        ['Runtime',report.runtime.score?report.runtime.score+'%':'n/d']
      ];
      grid.innerHTML=rows.map(function(r){return '<div class="ai90-tile"><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>';}).join('');
    }
    var modules=$('ai90-module-feed');
    if(modules){modules.innerHTML=arr(report.modules).map(function(m){return '<div class="ai90-module-row '+(m.status==='CONNECTED'?'ok':'warn')+'"><b>'+esc(m.label)+'</b><span>'+esc(m.status)+'</span><small>'+esc(m.detail||m.count+' records')+'</small></div>';}).join('');}
    var an=$('ai90-anomaly-list');
    if(an){an.innerHTML=arr(report.anomalies).length?arr(report.anomalies).map(function(a){return '<div class="ai90-anomaly '+String(a.level||'INFO').toLowerCase()+'"><b>'+esc(a.level)+'</b><span>'+esc(a.area)+'</span><small>'+esc(a.message)+'</small></div>';}).join(''):'<div class="ai90-anomaly ok"><b>OK</b><span>Nessuna anomalia critica</span><small>Command Center in stato read-only stabile.</small></div>';}
    var act=$('ai90-action-list');
    if(act){act.innerHTML=arr(report.recommendedActions).map(function(a,i){return '<div class="ai90-action"><b>#'+(i+1)+'</b><span>'+esc(a)+'</span></div>';}).join('');}
    var prev=$('ai90-report-preview');
    if(prev){prev.innerHTML='<div class="ai90-preview-line"><b>Versione</b><span>'+esc(report.version)+'</span></div><div class="ai90-preview-line"><b>Modalità</b><span>'+esc(report.mode)+'</span></div><div class="ai90-preview-line"><b>Sicurezza</b><span>read-only · no auto-action · approval only</span></div><div class="ai90-preview-line"><b>Dati locali</b><span>'+esc(report.storage.total)+' chiavi AT-MEC/recipe/layout</span></div>';}
  }
  function selectCommand(){
    try{
      document.querySelectorAll('[data-ai-main],[data-ai-action]').forEach(function(btn){var m=btn.getAttribute('data-ai-main')==='command90';btn.classList.toggle('ai76-action-selected',m);if(m)btn.setAttribute('aria-pressed','true');else if(btn.getAttribute('data-ai-main'))btn.removeAttribute('aria-pressed');});
      document.querySelectorAll('.ai76-section-selected').forEach(function(el){el.classList.remove('ai76-section-selected');});
      var p=$('ai90-command-center');if(p)p.classList.add('ai76-section-selected');
    }catch(_e){}
  }
  function download(name,text){var blob=new Blob([text],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(_e){}},800);}
  window.runAiFactoryCommand90=function(){
    selectCommand();
    try{if(typeof window.runAiReady80==='function') window.runAiReady80();}catch(_e){}
    var report=buildReport();
    render(report);
    toast('AI Factory Command Center aggiornato: '+report.status+' · rischio '+report.riskScore+'%','success');
    try{var el=$('ai90-command-center');if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});}catch(_e){}
    return report;
  };
  window.exportAiFactoryCommandReport90=function(){var report=read(REPORT_KEY,null)||buildReport();download('AT_MEC_HM_9_0_AI_FACTORY_COMMAND_REPORT_'+Date.now()+'.json',JSON.stringify(report,null,2));toast('Report AI Factory Command Center esportato','success');return report;};
  window.showAiFactoryCommand90=function(){
    try{if(typeof window.showAiCopilot76==='function')window.showAiCopilot76();else if(window.showTab)window.showTab('ai-copilot-tab',null);}catch(_e){}
    setTimeout(function(){try{selectCommand();render(read(REPORT_KEY,null)||buildReport());var el=$('ai90-command-center');if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){console.warn('[AI 9.0 show]',e);}},360);
  };
  function init(){setTimeout(function(){try{render(read(REPORT_KEY,null)||buildReport());}catch(e){console.warn('[AI 9.0 init]',e);}},1800);} 
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
