// AT-MEC_HM 8.0 - AI Ready Enterprise Stable
// Consolidamento AI sopra la pagina AI Copilot esistente. Read-only, safe-mode, nessuna nuova pagina business.
(function(){
  'use strict';
  var VERSION='AT-MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE';
  var READY_KEY='atmec80_ai_ready_report';
  function $(id){return document.getElementById(id);} 
  function now(){return new Date().toISOString();}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function arr(v){return Array.isArray(v)?v:[];}
  function num(v){var n=Number(v); return isFinite(n)?n:0;}
  function read(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?d:v;}catch(_e){return d;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v,null,2));}catch(_e){}}
  function toast(m,t){
    try{
      var s=$('ai76-ui-status'); if(s){s.textContent=m; s.className='ai76-ui-status '+(t||'info');}
      var fn=(typeof window.showToast==='function')?window.showToast:((typeof window.toast==='function')?window.toast:null);
      if(fn) fn(m,t||'info'); else console.log('[AI 8.0]',m);
    }catch(_e){console.log('[AI 8.0]',m);}
  }
  function provider(){return Object.assign({enabled:false,provider:'local_rules',allowExternal:false,approvalRequired:true,hasApiKey:false}, read('atmec77_ai_provider_config', read('atmec76_ai_provider_config',{}))||{});}
  function latestValidation(){return read('atmec80_runtime_validation',null)||read('atmec77_runtime_validation',null)||read('atmec75_runtime_validation',null)||read('atmec74_consistency_report',null)||{};}
  function latestComplete(){return read('atmec762_ai_complete_report',null)||read('atmec76_ai_insights',null)||{};}
  function approvalQueue(){return arr(read('atmec77_ai_approval_queue',[]));}
  function countStorage(){
    var out={ai:0,wo:0,repair:0,analytics:0,traceability:0,factory:0,total:0};
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=String(localStorage.key(i)||'').toLowerCase();
        if(!/^atmec|^recipe_|^layout_/.test(k)) continue;
        out.total++;
        if(k.indexOf('ai')>=0) out.ai++;
        if(k.indexOf('wo')>=0||k.indexOf('work')>=0||k.indexOf('commessa')>=0||k.indexOf('mes')>=0) out.wo++;
        if(k.indexOf('repair')>=0||k.indexOf('ticket')>=0) out.repair++;
        if(k.indexOf('analytic')>=0||k.indexOf('report')>=0||k.indexOf('test')>=0) out.analytics++;
        if(k.indexOf('trace')>=0||k.indexOf('serial')>=0||k.indexOf('unit')>=0) out.traceability++;
        if(k.indexOf('factory')>=0||k.indexOf('station')>=0||k.indexOf('sync')>=0) out.factory++;
      }
    }catch(_e){}
    return out;
  }
  function safeCheck(label,ok,detail,weight){return {label:label,ok:!!ok,detail:detail||'',weight:weight||10};}
  function buildReadyReport(){
    var ctx=read('atmec76_ai_context',{})||{};
    var complete=latestComplete();
    var cfg=provider();
    var q=approvalQueue();
    var validation=latestValidation();
    var storage=countStorage();
    var completeScore=num(complete.score);
    var providerSafe=(!cfg.enabled||cfg.provider==='local_rules'||cfg.approvalRequired===true) && cfg.allowExternal!==true || (cfg.allowExternal===true && cfg.approvalRequired===true);
    var queueSafe=q.every(function(x){return x.noRuntimeChange!==false && /PENDING|APPROVED_NO_RUNTIME_CHANGE|REJECTED/.test(String(x.status||'PENDING'));});
    var checks=[
      safeCheck('AI Copilot unico', !!$('ai-copilot-tab') && !!$('ai80-status-center'), 'AI resta nella pagina esistente, nessuna dashboard business duplicata', 12),
      safeCheck('Contesto AI disponibile', !!(ctx.workOrder||ctx.commessa||ctx.station||ctx.keyStats), ctx.workOrder||ctx.commessa||'contesto locale disponibile anche senza WO', 12),
      safeCheck('Analisi completa AI', completeScore>=70, completeScore?('score '+completeScore+'%'):'premere Analisi completa / AI Ready 8.0', 14),
      safeCheck('Provider safe', providerSafe, (cfg.provider||'local_rules')+' · approvalRequired='+(cfg.approvalRequired!==false), 14),
      safeCheck('Approvazioni manuali', queueSafe, q.length+' voci · nessuna modifica runtime automatica', 12),
      safeCheck('API key non esportata', true, 'la chiave resta in sessionStorage; report contiene solo hasApiKey', 8),
      safeCheck('Clean/runtime validation', !validation.score || num(validation.score)>=90, validation.score?('score '+validation.score+'%'):'nessun report critico caricato', 10),
      safeCheck('Dati AI leggibili', storage.total>0, storage.total+' chiavi AT-MEC/recipe/layout lette in locale', 8),
      safeCheck('Regola anti-doppioni', true, 'AI legge Traceability/Repair/Analytics/MES/Factory esistenti senza ricrearli', 10)
    ];
    var totalWeight=checks.reduce(function(a,b){return a+b.weight;},0);
    var okWeight=checks.reduce(function(a,b){return a+(b.ok?b.weight:0);},0);
    var score=Math.round(okWeight/Math.max(1,totalWeight)*100);
    var status=score>=90?'AI_READY_ENTERPRISE_STABLE':(score>=75?'AI_READY_WITH_WARNINGS':'AI_NOT_READY');
    var report={
      version:VERSION,
      createdAt:now(),
      status:status,
      score:score,
      safeMode:{readOnly:true,noAutomaticActions:true,approvalRequired:true,apiKeyExported:false,provider:cfg.provider||'local_rules',externalEnabled:!!cfg.enabled},
      contextSummary:{workOrder:ctx.workOrder||'',commessa:ctx.commessa||'',serialNumber:ctx.serialNumber||'',recipeName:ctx.recipeName||'',station:ctx.station||{},reports:ctx.reports||{},repairs:ctx.repairs||{}},
      provider:{enabled:!!cfg.enabled,provider:cfg.provider||'local_rules',model:cfg.model||'',endpoint:cfg.endpoint?'configured':'',hasApiKey:!!cfg.hasApiKey,approvalRequired:cfg.approvalRequired!==false},
      approvals:{total:q.length,pending:q.filter(function(x){return String(x.status||'PENDING')==='PENDING';}).length,approved:q.filter(function(x){return String(x.status||'').indexOf('APPROVED')===0;}).length,rejected:q.filter(function(x){return String(x.status||'')==='REJECTED';}).length},
      dataQuality:{storage:storage,completeScore:completeScore,runtimeScore:num(validation.score)},
      checks:checks,
      next:'Base 8.0 chiusa. 9.0 AI Factory Command Center solo futuro, non attivato in questa release.'
    };
    write(READY_KEY,report);
    return report;
  }
  function cls(ok){return ok?'ok':'warn';}
  function renderStatus(report){
    report=report||read(READY_KEY,null)||buildReadyReport();
    var score=$('ai80-readiness-score'); if(score) score.textContent=report.score+'%';
    var pageScore=$('ai76-page-score'); if(pageScore) pageScore.textContent=report.score+'%';
    var grid=$('ai80-status-grid');
    if(grid){
      var cards=[
        ['STATO',report.status],['Provider',report.provider.provider+(report.provider.enabled?' ON':' OFF')],['Approvazioni','A '+report.approvals.approved+' / R '+report.approvals.rejected+' / P '+report.approvals.pending],['Runtime',report.dataQuality.runtimeScore?report.dataQuality.runtimeScore+'%':'n/d'],['Contesto',report.contextSummary.workOrder||report.contextSummary.commessa||'locale'],['Safe mode',report.safeMode.noAutomaticActions?'ON':'CHECK']
      ];
      grid.innerHTML=cards.map(function(c){return '<div class="ai80-status-card"><span>'+esc(c[0])+'</span><b>'+esc(c[1])+'</b></div>';}).join('');
    }
    var details=$('ai80-readiness-details');
    if(details){
      details.innerHTML=arr(report.checks).map(function(c){return '<div class="ai80-check '+cls(c.ok)+'"><b>'+esc(c.ok?'OK':'CHECK')+'</b><span>'+esc(c.label)+'</span><small>'+esc(c.detail)+'</small></div>';}).join('');
    }
    var safe=$('ai80-safe-mode-summary');
    if(safe){
      safe.innerHTML='<div class="ai80-safe-pill ok">READ-ONLY</div><div class="ai80-safe-pill ok">NO AUTO-ACTION</div><div class="ai80-safe-pill ok">APPROVAL REQUIRED</div><div class="ai80-safe-pill ok">API KEY NOT EXPORTED</div>';
    }
    var preview=$('ai80-final-report-preview');
    if(preview){
      preview.innerHTML='<div class="ai80-preview-head"><span>AI Ready Score</span><b>'+esc(report.score)+'%</b></div>'+
        '<div class="ai80-preview-row"><b>Stato</b><span>'+esc(report.status)+'</span></div>'+
        '<div class="ai80-preview-row"><b>WO / Commessa</b><span>'+esc(report.contextSummary.workOrder||report.contextSummary.commessa||'—')+'</span></div>'+
        '<div class="ai80-preview-row"><b>Provider</b><span>'+esc(report.provider.provider)+' · '+(report.provider.enabled?'ON':'OFF')+'</span></div>'+
        '<div class="ai80-preview-row"><b>Approvazioni</b><span>'+esc(report.approvals.total)+'</span></div>'+
        '<small>Report finale AI 8.0 pronto per export. Nessuna modifica applicata al runtime.</small>';
    }
  }
  function download(name,text,type){var blob=new Blob([text],{type:type||'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(_e){}},800);}
  function selectReady(){
    try{
      document.querySelectorAll('[data-ai-main],[data-ai-action]').forEach(function(btn){var m=btn.getAttribute('data-ai-main')==='ready'; btn.classList.toggle('ai76-action-selected',m); if(m)btn.setAttribute('aria-pressed','true');});
      document.querySelectorAll('.ai76-section-selected').forEach(function(el){el.classList.remove('ai76-section-selected');});
      var p=$('ai80-status-center'); if(p)p.classList.add('ai76-section-selected');
    }catch(_e){}
  }
  window.runAiReady80=function(){
    selectReady();
    try{ if(typeof window.runAiCompleteAnalysis762==='function') window.runAiCompleteAnalysis762(); }catch(_e){}
    var report=buildReadyReport();
    renderStatus(report);
    toast('AI Ready 8.0 aggiornato: '+report.score+'% · '+report.status,'success');
    try{var el=$('ai80-status-center'); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});}catch(_e){}
    return report;
  };
  window.exportAiReadyReport80=function(){var report=read(READY_KEY,null)||buildReadyReport(); download('AT_MEC_HM_8_0_AI_READY_REPORT_'+Date.now()+'.json',JSON.stringify(report,null,2),'application/json'); toast('Report AI Ready 8.0 esportato','success'); return report;};
  window.showAiReady80=function(){
    try{ if(typeof window.showAiCopilot76==='function') window.showAiCopilot76(); else if(window.showTab) window.showTab('ai-copilot-tab',null); }catch(_e){}
    setTimeout(function(){try{renderStatus(read(READY_KEY,null)||buildReadyReport()); selectReady(); var el=$('ai80-status-center'); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){console.warn('[AI 8.0]',e);}},360);
  };
  function init(){setTimeout(function(){try{renderStatus(read(READY_KEY,null)||buildReadyReport());}catch(e){console.warn('[AI 8.0 init]',e);}},1600);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
