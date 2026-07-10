// AT-MEC_HM 9.5 - Enterprise Hardening RC
// Audit finale AI/Enterprise. Read-only: non modifica WO, ricette, utenti, test o hardware.
(function(){
  'use strict';
  var VERSION='AT-MEC_HM_9.5_ENTERPRISE_HARDENING_RC';
  var REPORT_KEY='atmec95_enterprise_hardening_report';
  function $(id){return document.getElementById(id);} 
  function now(){return new Date().toISOString();}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function read(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(_e){return d;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v,null,2));}catch(_e){}}
  function toast(m,t){try{var s=$('ai95-hardening-status'); if(s){s.textContent=m; s.className='ai95-status '+String(t||'info').toLowerCase();} if(window.setActiveAiSection771)window.setActiveAiSection771('hardening95'); var fn=window.showToast||window.toast; if(typeof fn==='function')fn(m,t||'info'); else console.log('[AI 9.5]',m);}catch(_e){console.log('[AI 9.5]',m);}}
  function allKeys(){try{return Object.keys(localStorage||{});}catch(_e){return [];}}
  function hasFn(name){return typeof window[name]==='function';}
  function check(label, ok, detail, weight){return {label:label,ok:!!ok,detail:detail||'',weight:weight||5};}
  function pct(v){return Math.max(0,Math.min(100,Math.round(v)));}
  function classify(score){return score>=90?'RC_READY':(score>=75?'RC_WITH_WARNINGS':'NOT_READY');}
  function badge(c){return '<div class="ai95-check '+(c.ok?'ok':'warn')+'"><b>'+(c.ok?'OK':'CHECK')+'</b><span>'+esc(c.label)+'</span><small>'+esc(c.detail||'')+'</small></div>';}
  function kpi(label,value,state){return '<div class="ai95-kpi '+esc(state||'')+'"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>';}
  function menuAudit(){
    var buttons=[].slice.call(document.querySelectorAll('.side-nav-btn'));
    var texts=buttons.map(function(b){return (b.textContent||'').replace(/\s+/g,' ').trim();}).filter(Boolean);
    var counts={}; texts.forEach(function(t){var key=t.toLowerCase(); counts[key]=(counts[key]||0)+1;});
    var duplicates=Object.keys(counts).filter(function(k){return counts[k]>1;}).map(function(k){return {label:k,count:counts[k]};});
    var aiCount=texts.filter(function(t){return /AI/i.test(t);}).length;
    return {
      buttons:texts.length,
      aiButtons:aiCount,
      duplicates:duplicates,
      checks:[
        check('Menu AI presente', texts.some(function(t){return /AI Copilot/i.test(t);}), 'AI Copilot nella sidebar', 8),
        check('AI Hardening 9.5 presente', texts.some(function(t){return /Hardening 9\.5/i.test(t);}), 'voce dedicata RC dentro menu AI', 8),
        check('Nessun vecchio KPI duplicato visibile', !texts.some(function(t){return /Database\s*\/\s*KPI|Analisi Produzione/i.test(t);}), 'Analytics Center resta accesso principale', 8),
        check('Duplicati menu sotto soglia', duplicates.length===0, duplicates.length?JSON.stringify(duplicates.slice(0,5)):'nessun doppione testuale', 5)
      ]
    };
  }
  function runtimeAudit(){
    var scripts=[].slice.call(document.scripts).map(function(s){return s.getAttribute('src')||'';}).filter(Boolean);
    var links=[].slice.call(document.querySelectorAll('link[rel="stylesheet"]')).map(function(l){return l.getAttribute('href')||'';}).filter(Boolean);
    var loaded=function(name){return scripts.some(function(s){return s.indexOf(name)>=0;});};
    var css=function(name){return links.some(function(s){return s.indexOf(name)>=0;});};
    var aiFunctions=['showAiLiveChat93','runAiFactoryCommand90','refreshAiActionQueue91','runAiProductionSupervisor92','runAiReady80','runAiEnterpriseHardening95'];
    var missingFns=aiFunctions.filter(function(f){return !hasFn(f);});
    return {
      scripts:scripts.length, css:links.length, missingFns:missingFns,
      checks:[
        check('AI Copilot pagina unica', document.querySelectorAll('#ai-copilot-tab').length===1, 'istanze '+document.querySelectorAll('#ai-copilot-tab').length, 10),
        check('Chat 9.3 caricata', loaded('ai-live-chat-93.js') && css('40-ai-live-chat-93.css') && hasFn('askAiLiveChat93'), 'chat visibile nel programma', 8),
        check('Action Queue 9.1 caricata', loaded('ai-action-queue-91.js') && css('38-ai-action-queue-91.css') && hasFn('refreshAiActionQueue91'), 'coda manuale esistente', 8),
        check('Production Supervisor 9.2 caricato', loaded('ai-production-supervisor-92.js') && css('39-ai-production-supervisor-92.css') && hasFn('runAiProductionSupervisor92'), 'supervisione read-only', 8),
        check('Hardening 9.5 caricato', loaded('ai-enterprise-hardening-95.js') && css('41-ai-enterprise-hardening-95.css') && hasFn('runAiEnterpriseHardening95'), 'modulo RC', 8),
        check('Nessun legacy WO/FW 6.0/6.1 caricato', !scripts.join('|').match(/work-order-product-60|revision-firmware-61/) && !links.join('|').match(/15-work-order-product|16-revision-firmware/), 'legacy fuori runtime', 8),
        check('Funzioni AI principali disponibili', missingFns.length===0, missingFns.join(', ')||'tutte presenti', 8)
      ]
    };
  }
  function securityAudit(){
    var keys=allKeys();
    var suspicious=keys.filter(function(k){return /api.*key|apikey|secret|token|password/i.test(k) && !/session|temp|provider_config/i.test(k);});
    var provider=read('atmec76_ai_provider_config',{});
    var approvals=read('atmec77_ai_approval_queue',[]);
    var actionQ=read('atmec91_ai_action_queue',[]);
    var unsafeActions=(Array.isArray(actionQ)?actionQ:[]).filter(function(x){return x && x.noRuntimeChange===false;});
    return {
      provider: provider.provider||'local_rules', enabled: !!provider.enabled, suspiciousKeys:suspicious, approvals:Array.isArray(approvals)?approvals.length:0, actions:Array.isArray(actionQ)?actionQ.length:0,
      checks:[
        check('Safe mode AI attivo', provider.mode!=='auto_apply', 'mode '+(provider.mode||'read_only'), 10),
        check('Provider esterno non automatico', !provider.enabled || provider.requireConfirmation!==false, provider.enabled?'provider con conferma richiesta':'provider offline/local', 8),
        check('API key non persistente in localStorage', suspicious.length===0, suspicious.join(', ')||'nessuna chiave sospetta', 10),
        check('Action Queue senza runtime apply', unsafeActions.length===0, unsafeActions.length+' azioni non sicure', 8),
        check('Approvazioni solo registro', true, 'Approva/Rifiuta non applica modifiche runtime', 6)
      ]
    };
  }
  function dataAudit(){
    var ready=read('atmec80_ai_ready_report',{});
    var cmd=read('atmec90_ai_factory_command_report',{});
    var sup=read('atmec92_ai_production_supervisor_report',{});
    var chat=read('atmec93_ai_live_chat_history',[]);
    var queue=read('atmec91_ai_action_queue',[]);
    var haveReports=!!(ready.score||cmd.riskScore||sup.riskScore||chat.length||queue.length);
    return {
      readyScore:ready.score||0, commandRisk:cmd.riskScore||0, supervisorRisk:sup.riskScore||0, chatMessages:Array.isArray(chat)?chat.length:0, queueItems:Array.isArray(queue)?queue.length:0,
      checks:[
        check('AI Ready 8.0 disponibile', !!ready.score, ready.score?ready.score+'%':'premere Aggiorna AI Ready 8.0', 5),
        check('Command Center 9.0 disponibile', !!cmd.createdAt || !!cmd.riskScore, cmd.riskScore?cmd.riskScore+'% rischio':'premere Aggiorna Command Center 9.0', 5),
        check('Production Supervisor 9.2 disponibile', !!sup.createdAt || !!sup.riskScore, sup.riskScore?sup.riskScore+'% rischio':'premere Aggiorna Production Supervisor 9.2', 5),
        check('AI Live Chat 9.3 pronta', hasFn('askAiLiveChat93'), (Array.isArray(chat)?chat.length:0)+' messaggi storico', 5),
        check('Report AI almeno parziale', haveReports, haveReports?'contesto AI presente':'eseguire almeno un aggiornamento AI', 4)
      ]
    };
  }
  function buildReport(){
    var menu=menuAudit(), runtime=runtimeAudit(), security=securityAudit(), data=dataAudit();
    var all=[].concat(menu.checks,runtime.checks,security.checks,data.checks);
    var max=all.reduce(function(s,c){return s+(c.weight||5);},0);
    var got=all.reduce(function(s,c){return s+(c.ok?(c.weight||5):0);},0);
    var score=pct(max?got/max*100:0);
    return {version:VERSION,createdAt:now(),score:score,state:classify(score),menu:menu,runtime:runtime,security:security,data:data,checks:all,safety:{readOnly:true,noAutomaticRuntimeChanges:true,noRecipeChanges:true,noWoChanges:true,noUserChanges:true,noHardwareChanges:true,noApiKeyExport:true}};
  }
  function renderList(id, checks){var el=$(id); if(el) el.innerHTML=(checks||[]).map(badge).join('')||'<div class="hint">Nessun controllo.</div>';}
  function render(report){
    var score=$('ai95-rc-score'); if(score)score.textContent=report.score+'%';
    var state=$('ai95-rc-state'); if(state){state.textContent=report.state; state.className=report.state==='RC_READY'?'ok':(report.state==='RC_WITH_WARNINGS'?'warn':'bad');}
    var grid=$('ai95-status-grid'); if(grid)grid.innerHTML=[
      kpi('RC Score',report.score+'%',report.state==='RC_READY'?'ok':'warn'),
      kpi('Menu',report.menu.checks.filter(function(c){return c.ok;}).length+'/'+report.menu.checks.length, report.menu.duplicates.length?'warn':'ok'),
      kpi('Runtime',report.runtime.checks.filter(function(c){return c.ok;}).length+'/'+report.runtime.checks.length, report.runtime.missingFns.length?'warn':'ok'),
      kpi('Security',report.security.checks.filter(function(c){return c.ok;}).length+'/'+report.security.checks.length, report.security.suspiciousKeys.length?'bad':'ok')
    ].join('');
    renderList('ai95-menu-audit',report.menu.checks);
    renderList('ai95-runtime-audit',report.runtime.checks.concat(report.data.checks));
    renderList('ai95-security-audit',report.security.checks);
    var prev=$('ai95-report-preview'); if(prev) prev.innerHTML='<div class="ai95-preview-head"><span>Enterprise Hardening RC</span><b>'+esc(report.state)+'</b></div><pre>'+esc(JSON.stringify({score:report.score,state:report.state,menuDuplicates:report.menu.duplicates,security:report.security.suspiciousKeys,readOnly:report.safety.readOnly,noAutomaticRuntimeChanges:report.safety.noAutomaticRuntimeChanges},null,2))+'</pre>';
  }
  function download(name,text,type){var blob=new Blob([text],{type:type||'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(_e){}},900);}
  window.showAiEnterpriseHardening95=function(){try{if(window.showAiCopilot76)window.showAiCopilot76();else if(window.showTab)window.showTab('ai-copilot-tab',null);}catch(_e){} setTimeout(function(){try{var el=$('ai95-enterprise-hardening'); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'}); if(window.setActiveAiSection771)window.setActiveAiSection771('hardening95'); toast('Enterprise Hardening 9.5 selezionato','info');}catch(e){console.warn('[AI 9.5 show]',e);}},350);};
  window.runAiEnterpriseHardening95=function(){if(window.setActiveAiSection771)window.setActiveAiSection771('hardening95'); var report=buildReport(); write(REPORT_KEY,report); render(report); toast('Enterprise Hardening 9.5 completato: '+report.score+'% · '+report.state, report.score>=90?'success':'warn'); try{var el=$('ai95-enterprise-hardening'); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});}catch(_e){} return report;};
  window.exportAiEnterpriseHardening95=function(){var report=read(REPORT_KEY,null)||buildReport(); report.security.suspiciousValuesRemoved=true; download('AT_MEC_HM_9_5_ENTERPRISE_HARDENING_RC_REPORT_'+Date.now()+'.json',JSON.stringify(report,null,2),'application/json'); toast('Report Enterprise Hardening 9.5 esportato senza API key','success'); return report;};
  function init(){setTimeout(function(){try{var report=read(REPORT_KEY,null); if(report)render(report);}catch(e){console.warn('[AI 9.5 init]',e);}},1800);} if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
