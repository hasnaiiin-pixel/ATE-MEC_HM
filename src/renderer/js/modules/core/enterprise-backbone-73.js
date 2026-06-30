// AT-MEC_HM 7.3 - Enterprise Backbone Unified
// Consolida i moduli esistenti senza duplicare Traceability, MES, Factory o Analytics.
(function(){
  'use strict';
  var VERSION='AT-MEC_HM_7.6_AI_COPILOT_FOUNDATION_CLEAN';
  var BACKBONE_KEY='atmec73_enterprise_backbone';
  var AUDIT_KEY='atmec73_enterprise_audit';
  function $(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function read(k,f){try{var v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?f:v;}catch(_){return f;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v,null,2));}catch(_){}}
  function val(k){try{return localStorage.getItem(k)||'';}catch(_){return '';}}
  function arr(v){return Array.isArray(v)?v:[];}
  function now(){return new Date().toISOString();}
  function toast(m,t){try{window.showToast?window.showToast(m,t||'info'):console.log('[7.3]',m);}catch(_){}}

  function mesDb(){var d=read('atmec67b_mes_ready',{}); if(!Array.isArray(d.workOrders))d.workOrders=[]; if(!Array.isArray(d.audit))d.audit=[]; return d;}
  function legacyWorkOrders(){return arr(read('atmec60_workorders',[]));}
  function selectedWO(){
    var d=mesDb();
    var candidates=[
      read('atmec_selected_work_order_for_test',null),
      read('atmec_active_work_order',null),
      read('atmec_current_work_order',null),
      d.activeWorkOrderId?(d.workOrders||[]).find(function(w){return w.id===d.activeWorkOrderId;}):null,
      read('atmec60_selected_workorder',null)
    ].filter(Boolean);
    return candidates[0]||null;
  }
  function woId(w){return String((w&&(w.wo||w.workOrder||w.woNumber||w.commessa||w.id))||'').trim();}
  function woQty(w){return Number((w&&(w.qty||w.qtyRequested||w.target||w.quantity))||0)||0;}
  function woDone(w){return Number((w&&(w.done||w.qtyCompleted||w.pass||w.completed))||0)||0;}
  function woFail(w){return Number((w&&(w.fail||w.failed))||0)||0;}
  function woError(w){return Number((w&&(w.error||w.errors))||0)||0;}
  function normWO(w){
    w=w||{};
    var qty=woQty(w), done=woDone(w), fail=woFail(w), error=woError(w);
    return {
      id:String(w.id||woId(w)||'').trim(),
      wo:woId(w),
      customer:w.customerText||w.customer||w.customerName||w.customerId||'',
      product:w.productText||w.product||w.productName||w.productId||'',
      board:w.boardCode||w.boardText||w.board||w.boardId||'',
      recipe:w.recipe||w.recipe_name||w.recipeName||'',
      firmware:w.firmwareText||w.firmware||w.firmwareVersion||w.firmwareId||'',
      qty:qty, done:done, fail:fail, error:error,
      left:Math.max(0,qty-done),
      status:w.status||'',
      source:w.source||''
    };
  }
  function allWorkOrders(){
    var out=[], seen={};
    arr(mesDb().workOrders).forEach(function(w){var n=normWO(Object.assign({source:'MES_READY_67B'},w)); if(n.wo&&!seen[n.wo]){seen[n.wo]=1;out.push(n);}});
    legacyWorkOrders().forEach(function(w){var n=normWO(Object.assign({source:'WORK_ORDER_60'},w)); if(n.wo&&!seen[n.wo]){seen[n.wo]=1;out.push(n);}});
    var s=normWO(Object.assign({source:'TEST_MODE_SELECTED'},selectedWO()||{}));
    if(s.wo&&!seen[s.wo]) out.unshift(s);
    return out;
  }
  function countLocalReports(){
    var pools=[
      read('atmec_test_reports',[]),
      (read('atmec_local_database',{}).test_reports||[]),
      (read('atmec_local_database',{}).reports||[]),
      (window.auditCache||[]),
      (window.testReports||[])
    ];
    for(var i=0;i<pools.length;i++){if(Array.isArray(pools[i])&&pools[i].length)return pools[i].length;}
    return 0;
  }
  function moduleChecks(){
    var api=window.api||{};
    var d=mesDb();
    var checks=[
      {key:'testmode',label:'Test Mode operativo',ok:!!($('production-test-mode')&&typeof window.startTest==='function'),detail:'Interfaccia operatore, F1, WO/Commessa e statistiche WO'},
      {key:'wo',label:'WO / Commessa',ok:arr(d.workOrders).length>0||!!selectedWO(),warn:arr(d.workOrders).length===0&&!selectedWO(),detail:arr(d.workOrders).length+' WO MES Ready · selezionata '+(woId(selectedWO())||'nessuna')},
      {key:'traceability',label:'Traceability / Genealogia',ok:typeof window.loadTraceabilitySerialHistory==='function'||typeof api.getSerialHistory==='function',detail:'Storico seriale, scheda unità e timeline già presenti'},
      {key:'repair',label:'Repair Center',ok:typeof window.showRepairCenter65A==='function'||typeof api.addRepairRecord==='function',detail:'Ticket, interventi, dossier e retest presenti'},
      {key:'production',label:'Production Execution',ok:typeof window.refreshProductionExecution63A==='function',detail:'Runtime WO, supervisor dashboard e multi station monitor'},
      {key:'factory',label:'Factory Enterprise',ok:typeof window.loadFactoryEnterprise418B==='function',detail:'Postazione, sync queue, device monitor e health score'},
      {key:'analytics',label:'Analytics Enterprise',ok:typeof window.loadAnalyticsCenter419B2==='function',detail:'FPY, trend, top fail, componenti, test point e heatmap'},
      {key:'mes',label:'MES Connector',ok:!!(d.connector&&d.connector.provider),warn:!(d.connector&&d.connector.server),detail:(d.connector&&d.connector.provider?d.connector.provider:'non configurato')+' · server '+((d.connector&&d.connector.server)||'non configurato')},
      {key:'database',label:'Database Enterprise',ok:typeof api.getEnterpriseDatabaseDashboard==='function'||!!val('atmec67b_mes_ready'),detail:'JSON/SQLite-ready + storico locale'},
      {key:'sync',label:'Data Provider / Sync',ok:typeof api.getSyncQueuePreview==='function'||!!val('atmec_factory_config_418b'),warn:!val('atmec_factory_config_418b'),detail:'Local-first, queue e server opzionale'}
    ];
    return checks;
  }
  function dataIssues(){
    var issues=[];
    var keys=['atmec67b_mes_ready','atmec_active_work_order','atmec_selected_work_order_for_test','atmec_current_work_order','atmec60_workorders','atmec60_selected_workorder','atmec75_canonical_context'];
    var existing=keys.filter(function(k){return !!val(k);});
    if(existing.length>3) issues.push({level:'warn',title:'Chiavi WO multiple',detail:'Presenti '+existing.join(', ')+'; 7.5 mantiene un contesto canonico e usa gli alias solo come mirror compatibile.'});
    if(!selectedWO()) issues.push({level:'warn',title:'Nessuna WO attiva',detail:'Test Mode può lavorare manuale, ma produzione enterprise richiede una WO attiva.'});
    if(!val('atmec_factory_config_418b')) issues.push({level:'warn',title:'Factory station non salvata',detail:'Salva configurazione postazione in Factory Enterprise per una tracciabilità completa.'});
    if(!countLocalReports()) issues.push({level:'warn',title:'Storico test non rilevato nel browser',detail:'Analytics userà API backend quando disponibile; in localStorage non ci sono report.'});
    var d=mesDb();
    if(!(d.connector&&d.connector.server)) issues.push({level:'info',title:'MES ancora ready/local-first',detail:'Connettore configurabile presente, server reale non impostato.'});
    if(!issues.length) issues.push({level:'ok',title:'Backbone coerente',detail:'Nessun blocco enterprise evidente nelle chiavi locali.'});
    return issues;
  }
  function buildContext(){
    var wos=allWorkOrders();
    var active=normWO(selectedWO()||{});
    var totals=wos.reduce(function(a,w){a.qty+=w.qty;a.done+=w.done;a.fail+=w.fail;a.error+=w.error;a.left+=w.left;return a;},{qty:0,done:0,fail:0,error:0,left:0});
    var checks=moduleChecks();
    var ok=checks.filter(function(c){return c.ok;}).length;
    var score=Math.round((ok/checks.length)*100);
    return {
      version:VERSION,
      updatedAt:now(),
      score:score,
      activeWorkOrder:active.wo?active:null,
      workOrders:wos,
      totals:totals,
      modules:checks,
      issues:dataIssues(),
      nextActions:[
        'Usare questo backbone come sorgente di audit prima di aggiungere nuovi moduli.',
        'Evitare duplicati Traceability/MES/Factory/Analytics: potenziare le pagine esistenti.',
        'Completare MES reale solo quando sono disponibili endpoint/SQL/Access cliente.',
        'Rendere MTTR/MTBF reali partendo dai dati Repair gia presenti.'
      ]
    };
  }
  function badge(c){return c.ok?'ok':(c.warn?'warn':'error');}
  function renderList(ctx){
    return ctx.modules.map(function(c){
      return '<div class="enterprise73-row"><div><b>'+esc(c.label)+'</b><small>'+esc(c.detail)+'</small></div><span class="enterprise422-badge '+badge(c)+'">'+(c.ok?'READY':(c.warn?'LOCAL':'CHECK'))+'</span></div>';
    }).join('');
  }
  function renderIssues(ctx){
    return ctx.issues.map(function(i){
      var cls=i.level==='ok'?'ok':(i.level==='info'?'info':'warn');
      return '<div class="enterprise73-issue '+cls+'"><b>'+esc(i.title)+'</b><span>'+esc(i.detail)+'</span></div>';
    }).join('');
  }
  function renderWorkOrders(ctx){
    var rows=ctx.workOrders.slice(0,10);
    if(!rows.length) return '<div class="hint">Nessuna WO rilevata.</div>';
    return '<table class="enterprise73-table"><thead><tr><th>WO</th><th>Cliente</th><th>Scheda</th><th>Ricetta</th><th>TOT</th><th>PASS</th><th>FAIL</th><th>RES</th><th>Fonte</th></tr></thead><tbody>'+
      rows.map(function(w){return '<tr><td><b>'+esc(w.wo)+'</b></td><td>'+esc(w.customer||'-')+'</td><td>'+esc(w.board||'-')+'</td><td>'+esc(w.recipe||'-')+'</td><td>'+w.qty+'</td><td>'+w.done+'</td><td>'+w.fail+'</td><td>'+w.left+'</td><td>'+esc(w.source||'-')+'</td></tr>';}).join('')+
      '</tbody></table>';
  }
  function syncContext(ctx){
    ctx=ctx||buildContext();
    write(BACKBONE_KEY,ctx);
    write(AUDIT_KEY,{version:VERSION,updatedAt:ctx.updatedAt,score:ctx.score,modules:ctx.modules,issues:ctx.issues});
    if(ctx.activeWorkOrder&&ctx.activeWorkOrder.wo){
      var wo=ctx.activeWorkOrder;
      var compat={
        id:wo.id||wo.wo,
        wo:wo.wo,
        workOrder:wo.wo,
        commessa:wo.wo,
        customerText:wo.customer,
        productText:wo.product,
        boardCode:wo.board,
        recipe:wo.recipe,
        firmwareText:wo.firmware,
        qty:wo.qty,
        done:wo.done,
        fail:wo.fail,
        error:wo.error,
        status:wo.status||'Running',
        source:'AT-MEC_HM_7.5_BACKBONE'
      };
      write('atmec_current_work_order',compat);
      write('atmec_active_work_order',compat);
    }
    return ctx;
  }
  function render(ctx){
    ctx=ctx||syncContext(buildContext());
    var score=$('enterprise73-score'); if(score) score.textContent=ctx.score+'%';
    var active=$('enterprise73-active-wo');
    if(active){
      active.innerHTML=ctx.activeWorkOrder?('<b>'+esc(ctx.activeWorkOrder.wo)+'</b><span>'+esc(ctx.activeWorkOrder.customer||'Cliente n/d')+' · '+esc(ctx.activeWorkOrder.board||'Scheda n/d')+' · '+esc(ctx.activeWorkOrder.recipe||'Ricetta n/d')+'</span>'):'<b>Nessuna WO attiva</b><span>Seleziona una WO in Test Mode o MES Ready.</span>';
    }
    var kpi=$('enterprise73-kpis');
    if(kpi){
      kpi.innerHTML='<div><span>WO</span><b>'+ctx.workOrders.length+'</b></div><div><span>Previsti</span><b>'+ctx.totals.qty+'</b></div><div><span>PASS</span><b>'+ctx.totals.done+'</b></div><div><span>FAIL</span><b>'+ctx.totals.fail+'</b></div><div><span>Residuo</span><b>'+ctx.totals.left+'</b></div><div><span>Moduli ready</span><b>'+ctx.modules.filter(function(m){return m.ok;}).length+'/'+ctx.modules.length+'</b></div>';
    }
    var m=$('enterprise73-modules'); if(m) m.innerHTML=renderList(ctx);
    var i=$('enterprise73-issues'); if(i) i.innerHTML=renderIssues(ctx);
    var w=$('enterprise73-wo-table'); if(w) w.innerHTML=renderWorkOrders(ctx);
    var stamp=$('enterprise73-stamp'); if(stamp) stamp.textContent='Ultimo refresh: '+new Date(ctx.updatedAt).toLocaleString('it-IT');
  }
  function download(name,text,type){
    var blob=new Blob([text],{type:type||'application/json'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);},800);
  }
  window.renderEnterpriseBackbone73=function(){render(syncContext(buildContext())); toast('Enterprise Backbone 7.5 aggiornato','success');};
  window.showEnterpriseBackbone73=function(){
    if(window.showTab) window.showTab('enterprise-stable-tab',null);
    setTimeout(function(){
      try{if(typeof window.runEnterpriseAudit422==='function') window.runEnterpriseAudit422();}catch(_){}
      try{if(typeof window.renderPermissionAudit422==='function') window.renderPermissionAudit422();}catch(_){}
      render(syncContext(buildContext()));
    },120);
  };
  window.exportEnterpriseBackbone73=function(){
    var ctx=syncContext(buildContext());
    download('AT_MEC_HM_7_5_ENTERPRISE_BACKBONE_'+Date.now()+'.json',JSON.stringify(ctx,null,2),'application/json');
  };
  window.syncEnterpriseBackbone73=function(){
    var ctx=syncContext(buildContext());
    render(ctx);
    toast('Contesto unificato 7.3 salvato','success');
  };
  function init(){setTimeout(function(){if($('enterprise73-modules')) render(syncContext(buildContext()));},1000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
