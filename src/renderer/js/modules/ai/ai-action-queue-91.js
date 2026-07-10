// AT-MEC_HM 9.1/9.3 - AI Action Queue Safe + Chat Suggestions
// Coda azioni manuale sopra AI Factory Command Center. Read-only: registra solo decisioni, non applica modifiche runtime.
(function(){
  'use strict';
  var VERSION='AT-MEC_HM_9.1_AI_ACTION_QUEUE_SAFE';
  var QUEUE_KEY='atmec91_ai_action_queue';
  var REPORT_KEY='atmec91_ai_action_queue_report';
  var HISTORY_KEY='atmec91_ai_action_history';

  function $(id){return document.getElementById(id);} 
  function now(){return new Date().toISOString();}
  function arr(v){return Array.isArray(v)?v:[];}
  function norm(v){return String(v==null?'':v).trim();}
  function num(v){var n=Number(v);return isFinite(n)?n:0;}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function read(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(_e){return d;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v,null,2));}catch(_e){}}
  function toast(m,t){
    try{
      var status=$('ai76-ui-status');
      if(status){status.textContent=m;status.className='ai76-ui-status '+String(t||'info');}
      var fn=(typeof window.showToast==='function')?window.showToast:((typeof window.toast==='function')?window.toast:null);
      if(fn)fn(m,t||'info');else console.log('[AI 9.1]',m);
    }catch(_e){console.log('[AI 9.1]',m);} 
  }
  function canonicalText(v){return norm(v).toLowerCase().replace(/\s+/g,' ');} 
  function hashText(s){var h=2166136261; s=String(s||''); for(var i=0;i<s.length;i++){h^=s.charCodeAt(i); h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);} return ('0000000'+(h>>>0).toString(16)).slice(-8).toUpperCase();}
  function actionSignature(x){return [x.source,x.area,x.title,x.action,x.priority].map(canonicalText).join('|');}
  function actionId(sig){return 'AI91-'+hashText(sig);}
  function priorityFromLevel(level){level=String(level||'').toLowerCase(); if(/critical|error|red|alta|high/.test(level))return 'HIGH'; if(/warn|yellow|media|check/.test(level))return 'MEDIUM'; return 'LOW';}
  function areaFromText(text){text=canonicalText(text); if(/wo|work order|commessa|mes/.test(text))return 'WO / Commessa'; if(/provider|api|key|esterno/.test(text))return 'Provider AI'; if(/approv/.test(text))return 'Approvazioni AI'; if(/ready|runtime|validation|baseline/.test(text))return 'Runtime / AI Ready'; if(/fail|errore|qualit|repair|ticket/.test(text))return 'Qualità / Repair'; if(/ricetta|recipe|step|range/.test(text))return 'Ricetta / Step'; if(/device|strument|hardware|multimetro|pl303|fixture/.test(text))return 'Hardware / Strumenti'; return 'AI Factory';}
  function baseItem(source,area,title,action,priority,detail){
    return {source:source||'AI',area:area||areaFromText(title+' '+action),title:title||action||'Azione AI',action:action||title||'Verificare manualmente',priority:priority||'LOW',detail:detail||'',manualOnly:true,noRuntimeChange:true};
  }
  function collectFromCommand90(){
    var report=read('atmec90_ai_factory_command_report',null);
    if(!report && typeof window.runAiFactoryCommand90==='function'){
      try{report=window.runAiFactoryCommand90();}catch(_e){report=read('atmec90_ai_factory_command_report',null);} 
    }
    var out=[];
    arr(report&&report.recommendedActions).forEach(function(a,i){out.push(baseItem('AI Factory Command 9.0',areaFromText(a),'Azione consigliata #'+(i+1),a,report&&report.status==='RED'?'HIGH':(report&&report.status==='YELLOW'?'MEDIUM':'LOW'),'Rischio Command Center '+(report&&report.riskScore!=null?report.riskScore+'%':'n/d')));});
    arr(report&&report.anomalies).forEach(function(a){
      var pr=priorityFromLevel(a.level);
      if(pr!=='LOW') out.push(baseItem('AI Factory Command 9.0',a.area||areaFromText(a.message),'Anomalia '+(a.level||'CHECK'),a.message,pr,'Derivata dal pannello anomalie 9.0'));
    });
    return out;
  }
  function collectFromActionPlan(){
    var plan=read('atmec762_ai_action_plan',null);
    if(!plan && typeof window.createAiActionPlan76==='function'){
      try{plan=window.createAiActionPlan76();}catch(_e){plan=read('atmec762_ai_action_plan',null);} 
    }
    var out=[];
    arr(plan&&plan.steps).forEach(function(x){out.push(baseItem('AI Workbench',x.area||areaFromText(x.action),'Workbench: '+(x.area||'azione'),x.action||x.why,priorityFromLevel(x.level),x.why||''));});
    return out;
  }
  function collectFromApprovals(){
    var q=read('atmec77_ai_approval_queue',[]);
    var out=[];
    arr(q).filter(function(x){return String(x.status||'PENDING')==='PENDING';}).slice(0,8).forEach(function(x){out.push(baseItem('Approvazioni AI 7.7','Approvazioni AI','Valutare suggerimento: '+(x.title||x.area||'AI'),x.action||'Valutare in coda approvazioni esistente',priorityFromLevel(x.risk),'Promemoria: questa voce rimane gestita dalla coda approvazioni esistente.'));});
    return out;
  }
  function collectFromChat93(){
    var q=read('atmec93_ai_chat_action_suggestions',[]);
    var out=[];
    arr(q).filter(function(x){return String(x.status||'PENDING')!=='REJECTED';}).slice(0,12).forEach(function(x){
      out.push(baseItem('AI Chat 9.3',x.area||'AI Chat',x.title||'Azione da risposta AI',x.action||x.detail||'Valutare risposta AI chat',x.priority||'MEDIUM',x.detail||'Creata da AI Live Chat 9.3. Nessuna modifica runtime automatica.'));
    });
    return out;
  }
  function dedupe(items){
    var by={};
    arr(items).forEach(function(x){var sig=actionSignature(x); if(!sig)return; if(!by[sig])by[sig]=x; else if(priorityRank(x.priority)>priorityRank(by[sig].priority))by[sig]=x;});
    return Object.keys(by).map(function(k){return by[k];});
  }
  function priorityRank(p){p=String(p||'LOW'); return p==='HIGH'?3:(p==='MEDIUM'?2:1);}
  function mergeState(base,existing){
    var bySig={}; arr(existing).forEach(function(x){var sig=x.signature||actionSignature(x); if(sig)bySig[sig]=x;});
    return dedupe(base).map(function(x){
      var sig=actionSignature(x), prev=bySig[sig]||null;
      return {id:(prev&&prev.id)||actionId(sig),signature:sig,createdAt:(prev&&prev.createdAt)||now(),updatedAt:now(),status:(prev&&prev.status)||'PENDING',source:x.source,area:x.area,title:x.title,action:x.action,priority:x.priority,detail:x.detail,manualOnly:true,noRuntimeChange:true,decidedAt:(prev&&prev.decidedAt)||'',closedAt:(prev&&prev.closedAt)||'',note:(prev&&prev.note)||''};
    }).sort(function(a,b){return priorityRank(b.priority)-priorityRank(a.priority) || String(a.area).localeCompare(String(b.area));});
  }
  function queue(){return arr(read(QUEUE_KEY,[]));}
  function history(){return arr(read(HISTORY_KEY,[]));}
  function saveQueue(q){write(QUEUE_KEY,arr(q)); render(q); return q;}
  function buildQueue(){
    try{if(typeof window.runAiFactoryCommand90==='function')window.runAiFactoryCommand90();}catch(_e){}
    var base=[].concat(collectFromCommand90(),collectFromActionPlan(),collectFromApprovals(),collectFromChat93());
    var q=mergeState(base,queue());
    saveQueue(q);
    var report=buildReport(q);
    write(REPORT_KEY,report);
    return q;
  }
  function buildReport(q){
    q=arr(q||queue());
    var counts={total:q.length,pending:0,approved:0,rejected:0,done:0,high:0,medium:0,low:0};
    q.forEach(function(x){var st=String(x.status||'PENDING'); if(st==='PENDING')counts.pending++; else if(st.indexOf('APPROVED')===0)counts.approved++; else if(st==='REJECTED')counts.rejected++; else if(st==='DONE_MANUAL')counts.done++; var p=String(x.priority||'LOW').toLowerCase(); counts[p]=(counts[p]||0)+1;});
    return {version:VERSION,createdAt:now(),mode:'MANUAL_ACTION_QUEUE_READ_ONLY',counts:counts,items:q,safety:{noAutomaticRuntimeChanges:true,noRecipeChanges:true,noWoChanges:true,noHardwareChanges:true,noUserChanges:true,manualApprovalOnly:true},history:history().slice(-50)};
  }
  function statusLabel(st){st=String(st||'PENDING'); if(st==='APPROVED_WAITING_MANUAL_EXECUTION')return 'APPROVATA'; if(st==='DONE_MANUAL')return 'COMPLETATA'; if(st==='REJECTED')return 'RIFIUTATA'; return 'DA VALUTARE';}
  function statusCls(st){st=String(st||'PENDING'); if(st.indexOf('APPROVED')===0)return 'approved'; if(st==='DONE_MANUAL')return 'done'; if(st==='REJECTED')return 'rejected'; return 'pending';}
  function renderSummary(q){
    var box=$('ai91-action-summary'); if(!box)return;
    var r=buildReport(q).counts;
    box.innerHTML=['Totale|'+r.total,'Da valutare|'+r.pending,'Approvate|'+r.approved,'Rifiutate|'+r.rejected,'Completate|'+r.done,'Priorità alta|'+r.high].map(function(x){var p=x.split('|');return '<div class="ai91-kpi"><span>'+esc(p[0])+'</span><b>'+esc(p[1])+'</b></div>';}).join('');
  }
  function renderList(q){
    var box=$('ai91-action-list'); if(!box)return; q=arr(q);
    if(!q.length){box.innerHTML='<div class="hint">Nessuna azione. Premi Aggiorna coda azioni 9.1 dopo Command Center/Analisi completa.</div>';return;}
    box.innerHTML=q.map(function(it,i){
      var st=String(it.status||'PENDING'), locked=st==='REJECTED'||st==='DONE_MANUAL';
      var approveDisabled=st!=='PENDING';
      var doneDisabled=st!=='APPROVED_WAITING_MANUAL_EXECUTION';
      return '<div class="ai91-action-item '+statusCls(st)+' priority-'+String(it.priority||'LOW').toLowerCase()+'">'
        +'<div class="ai91-action-index">#'+(i+1)+'</div>'
        +'<div class="ai91-action-body"><div class="ai91-action-title"><b>'+esc(it.area)+'</b><span>'+esc(it.title)+'</span></div><small>'+esc(it.action)+'</small><em>'+esc(it.source)+' · priorità '+esc(it.priority)+' · '+esc(statusLabel(st))+'</em>'+(it.detail?'<p>'+esc(it.detail)+'</p>':'')+(it.note?'<p class="ai91-note">'+esc(it.note)+'</p>':'')+'</div>'
        +'<div class="ai91-action-buttons"><span class="ai91-status '+statusCls(st)+'">'+esc(statusLabel(st))+'</span><button class="btn btn-success btn-sm" onclick="approveAiAction91(\''+esc(it.id)+'\')" '+(approveDisabled?'disabled':'')+'>Approva</button><button class="btn btn-ghost btn-sm" onclick="rejectAiAction91(\''+esc(it.id)+'\')" '+(locked?'disabled':'')+'>Rifiuta</button><button class="btn btn-primary btn-sm" onclick="completeAiAction91(\''+esc(it.id)+'\')" '+(doneDisabled?'disabled':'')+'>Completa manuale</button><button class="btn btn-ghost btn-sm" onclick="resetAiAction91(\''+esc(it.id)+'\')">Reset</button></div>'
        +'</div>';
    }).join('');
  }
  function renderPreview(q){var p=$('ai91-report-preview'); if(!p)return; var r=buildReport(q); p.innerHTML='<div class="ai91-preview-line"><b>Versione</b><span>'+esc(r.version)+'</span></div><div class="ai91-preview-line"><b>Modalità</b><span>'+esc(r.mode)+'</span></div><div class="ai91-preview-line"><b>Sicurezza</b><span>solo registro decisioni · no auto action</span></div><div class="ai91-preview-line"><b>Voci</b><span>'+esc(r.counts.total)+' totali · '+esc(r.counts.pending)+' da valutare</span></div>';}
  function render(q){q=arr(q||queue()); renderSummary(q); renderList(q); renderPreview(q);}
  function selectSection(){
    try{
      document.querySelectorAll('[data-ai-main],[data-ai-action]').forEach(function(btn){var m=btn.getAttribute('data-ai-main')==='action91';btn.classList.toggle('ai76-action-selected',m);if(m)btn.setAttribute('aria-pressed','true');else if(btn.getAttribute('data-ai-main'))btn.removeAttribute('aria-pressed');});
      document.querySelectorAll('.ai76-section-selected').forEach(function(el){el.classList.remove('ai76-section-selected');});
      var p=$('ai91-action-queue'); if(p)p.classList.add('ai76-section-selected');
    }catch(_e){}
  }
  function updateStatus(id,status,note){
    var q=queue().map(function(x){if(x.id===id){x.status=status; x.decidedAt=now(); if(status==='DONE_MANUAL')x.closedAt=now(); x.note=note||'';} return x;});
    var item=q.filter(function(x){return x.id===id;})[0]||{};
    var h=history(); h.push({at:now(),id:id,status:status,area:item.area||'',title:item.title||'',note:note||'',noRuntimeChange:true}); write(HISTORY_KEY,h.slice(-200)); saveQueue(q); write(REPORT_KEY,buildReport(q)); return item;
  }
  function download(name,text){var blob=new Blob([text],{type:'application/json'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(_e){}},800);}

  window.refreshAiActionQueue91=function(){selectSection(); var q=buildQueue(); selectSection(); render(q); toast('AI Action Queue aggiornata: '+q.length+' azioni · nessuna modifica applicata','success'); try{var el=$('ai91-action-queue'); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});}catch(_e){} return q;};
  window.approveAiAction91=function(id){selectSection(); updateStatus(id,'APPROVED_WAITING_MANUAL_EXECUTION','Approvata come attività manuale. Nessuna modifica runtime applicata.'); toast('Azione approvata come manuale. Nessuna modifica automatica.','success');};
  window.rejectAiAction91=function(id){selectSection(); updateStatus(id,'REJECTED','Rifiutata da operatore.'); toast('Azione AI rifiutata','info');};
  window.completeAiAction91=function(id){selectSection(); updateStatus(id,'DONE_MANUAL','Completata manualmente da operatore/tecnico.'); toast('Azione segnata completata manualmente','success');};
  window.resetAiAction91=function(id){selectSection(); updateStatus(id,'PENDING','Ripristinata da valutare.'); toast('Azione ripristinata in DA VALUTARE','info');};
  window.exportAiActionQueue91=function(){var report=buildReport(queue()); write(REPORT_KEY,report); download('AT_MEC_HM_9_1_AI_ACTION_QUEUE_REPORT_'+Date.now()+'.json',JSON.stringify(report,null,2)); toast('Report AI Action Queue esportato','success'); return report;};
  window.showAiActionQueue91=function(){try{if(typeof window.showAiCopilot76==='function')window.showAiCopilot76();else if(window.showTab)window.showTab('ai-copilot-tab',null);}catch(_e){} setTimeout(function(){selectSection(); render(queue()); try{var el=$('ai91-action-queue'); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});}catch(_e){}},360);};
  function init(){setTimeout(function(){try{render(queue());}catch(e){console.warn('[AI 9.1 init]',e);}},2100);} 
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
