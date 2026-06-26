/* AT-MEC_HM_6.7B_FIX2D_WO_LOAD_AND_ACTION_INPUT_FIX
   Test Mode: compact selectable active Work Order list.
   No giant WO cards in Test Mode. START/F1 uses selected WO or opens compact selector. */
(function(){
  'use strict';
  var VERSION='6.7O_TEST_MODE_SWITCH_ALIGNMENT_FIX';
  var KEY='atmec67b_mes_ready';
  var ACTIVE_KEY='atmec_active_work_order';
  var CURRENT_KEY='atmec_current_work_order';
  var SELECTED_KEY='atmec_selected_work_order_for_test';
  var USE_WO_KEY='atmec67b_use_work_order_mode';
  function $(id){return document.getElementById(id);} 
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function read(k,f){try{var v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?f:v;}catch(_){return f;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(_){} }
  function db(){var d=read(KEY,{}); if(!Array.isArray(d.workOrders))d.workOrders=[]; if(!Array.isArray(d.audit))d.audit=[]; return d;}
  function saveDb(d){write(KEY,d);} 
  function md(){var d=read('atmec67a_master_data',{}); ['customers','products','boards','revisions','firmware'].forEach(function(k){if(!Array.isArray(d[k]))d[k]=[];}); return d;}
  function findMd(k,id){return (md()[k]||[]).find(function(x){return x.id===id;})||{};}
  function user(){return (window.currentUser&&window.currentUser.username)||localStorage.getItem('atmec_current_user')||'Admin';}
  function audit(action,obj){var d=db(); d.audit.unshift({id:'AUD_'+Date.now(),action:action,wo:obj&&obj.wo,user:user(),at:new Date().toISOString(),details:obj&&obj.details}); d.audit=d.audit.slice(0,300); saveDb(d);} 
  function toast(m,t){try{window.showToast?window.showToast(m,t||'info'):console.log('[6.7B_FIX2C]',m);}catch(_){} }
  function statusOpen(w){var s=String(w&&w.status||'Running').toUpperCase(); return ['RUNNING','PLANNED','HOLD','OPEN','RELEASED','ATTIVA','ACTIVE'].indexOf(s)>-1;}
  function getOpenWOs(){return (db().workOrders||[]).filter(statusOpen);}
  function getUseWO(){var v=localStorage.getItem(USE_WO_KEY); return v==null?true:v!=='false';}
  function setUseWO(v){localStorage.setItem(USE_WO_KEY, v?'true':'false'); if(v){var w=getSelectedWO(); if(w) applyWO(w,{silent:true,noRender:true});} renderPanel();}
  function getSelectedWO(){
    var d=db();
    var sel=read(SELECTED_KEY,null);
    if(sel&&sel.id){var live=(d.workOrders||[]).find(function(x){return x.id===sel.id;}); if(live&&statusOpen(live)) return live;}
    if(d.activeWorkOrderId){var act=(d.workOrders||[]).find(function(x){return x.id===d.activeWorkOrderId;}); if(act&&statusOpen(act)) return act;}
    return null;
  }
  function setSelectedWO(w){
    if(!w) return null;
    var d=db();
    var idx=(d.workOrders||[]).findIndex(function(x){return x.id===w.id;});
    if(idx>=0){
      d.workOrders[idx].status=d.workOrders[idx].status||'Running';
      d.workOrders[idx].updatedAt=new Date().toISOString();
      w=d.workOrders[idx];
    }
    d.activeWorkOrderId=w.id; // compatibilità Work Orders/MES Ready
    saveDb(d); write(ACTIVE_KEY,w); write(SELECTED_KEY,w); audit('SELECT_WO_FOR_TEST',w);
    try{window.mes67Render&&window.mes67Render();}catch(_){}
    renderPanel();
    toast('WO selezionata: '+(w.wo||w.id),'success');
    return w;
  }
  function woLot(w){return w?(w.wo||w.id||''):'';} // In Test Mode il campo Commessa deve essere il numero WO, non il lotto
  function woRecipe(w){return w?String(w.recipe||'').trim():'';}
  function counters(w){var qty=Number(w&&w.qty||0), done=Number(w&&w.done||0), fail=Number(w&&w.fail||0), error=Number(w&&w.error||0); return {qty:qty,done:done,fail:fail,error:error,left:Math.max(0,qty-done),yield:(done+fail)?Math.round(1000*done/(done+fail))/10:0};}
  function avgCycle(w){var v=w&&(w.avgCycleSec||w.averageCycleSec||w.cycleTimeSec||w.avg_time_sec); return Number(v||0)>0?Number(v):null;}
  function parseTime(v){var t=v?new Date(v).getTime():0; return Number.isFinite(t)?t:0;}
  function elapsedSec(w){var start=parseTime(w&&((w.startedAt)||(w.startAt)||(w.createdAt)||(w.lastStartAt))); var end=parseTime(w&&((w.completedAt)||(w.closedAt)||(w.finishedAt))); if(!start)return null; return Math.max(0,Math.round(((end||Date.now())-start)/1000));}
  function fmtDuration(sec){if(sec==null||!Number.isFinite(sec))return '--'; sec=Math.max(0,Math.round(sec)); var h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60; if(h)return h+'h '+String(m).padStart(2,'0')+'m'; if(m)return m+'m '+String(s).padStart(2,'0')+'s'; return s+'s';}
  function estimatedTotalSec(w,k){var avg=avgCycle(w); if(avg&&k.qty)return avg*k.qty; var elapsed=elapsedSec(w); var produced=(k.done+k.fail+k.error); if(elapsed&&produced&&k.qty)return Math.round((elapsed/produced)*k.qty); return null;}
  function topFails(w){
    var raw=(w&&w.topFails)||(w&&w.failReasons)||(w&&w.defects)||[];
    if(!Array.isArray(raw)) return [];
    return raw.map(function(x){return typeof x==='string'?{label:x,count:1}:{label:x.label||x.reason||x.step||'Fail',count:Number(x.count||x.qty||1)};}).slice(0,5);
  }
  function woLabel(w){
    if(!w) return '';
    var c=findMd('customers',w.customerId), p=findMd('products',w.productId), b=findMd('boards',w.boardId), f=findMd('firmware',w.firmwareId);
    return [w.wo||w.id,c.name||w.customerText||'Cliente n/d',p.code||p.name||w.productText||'Prodotto n/d',b.code||'',(f.name||'FW')+' '+(f.version||''),w.recipe||'Ricetta n/d'].filter(Boolean).join(' · ');
  }
  function selectedSummary(w){
    if(!w) return 'NESSUNA WO SELEZIONATA';
    var c=findMd('customers',w.customerId), p=findMd('products',w.productId);
    return (w.wo||w.id)+' | '+(c.name||w.customerText||'Cliente n/d')+' | '+(p.code||p.name||w.productText||'Prodotto n/d');
  }
  function setValue(ids,v){ids.forEach(function(id){var el=$(id); if(!el) return; if('value' in el && el.value!==v){el.value=v; try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(_){}} else if(!('value' in el)){el.textContent=v;}});}
  function setRecipeSelectors(recipe){
    if(!recipe) return;
    ['prod-recipe-select','dash-recipe-select','recipe-select','test-recipe-select'].forEach(function(id){
      var sel=$(id); if(!sel) return;
      var exists=[].some.call(sel.options||[],function(o){return String(o.value||o.textContent||'')===recipe;});
      if(!exists){var o=document.createElement('option'); o.value=recipe; o.textContent=recipe+' (WO)'; sel.appendChild(o);} 
      sel.value=recipe; try{sel.dispatchEvent(new Event('change',{bubbles:true}));}catch(_){ }
    });
  }
  function setText(ids,v){ids.forEach(function(id){var el=$(id); if(el) el.textContent=v;});}
  async function applyWO(w, opts){
    opts=opts||{}; if(!w) return false;
    setSelectedWO(w);
    var woNumber=woLot(w);
    // Commessa = numero WO. Non usiamo il lotto nella test board.
    setValue(['prod-lot-number','lot-number','lot-number-dash','prod-workorder-input','workorder-input','label420-workorder'],woNumber);
    setValue(['label420-lot'], '');
    setText(['atmec67b-test-commessa','atmec67b-test-wo'],woNumber);
    try{ if(typeof window.setLotNumber==='function') window.setLotNumber(woNumber); }catch(_){ }
    try{ if(typeof window.syncLotNumberInputs==='function') window.syncLotNumberInputs('prod'); }catch(_){ }
    var recipe=woRecipe(w);
    if(recipe){
      try{ if(typeof window.refreshProductionRecipes==='function') await window.refreshProductionRecipes(); }catch(_){ }
      try{ if(typeof window.refreshDashboardRecipes==='function') await window.refreshDashboardRecipes(); }catch(_){ }
      setRecipeSelectors(recipe);
      try{ if(typeof window.loadProductionRecipeSelection==='function') await window.loadProductionRecipeSelection(); }catch(e){console.warn('[6.7B_FIX2D] caricamento ricetta WO non riuscito',e);}
      try{ if(typeof window.loadDashboardRecipeSelection==='function') await window.loadDashboardRecipeSelection(); }catch(_){ }
    }
    write(CURRENT_KEY,Object.assign({},w,{workOrder:w.wo||w.id,commessa:w.wo||w.id,lot:'',lastAppliedAt:new Date().toISOString()}));
    if(!opts.noRender) renderPanel();
    if(!opts.silent) toast('WO caricata: '+(w.wo||w.id),'success');
    return true;
  }
  function ensurePanel(){
    var p=$('atmec67b-wo-test-panel'); if(p) return p;
    var host=document.querySelector('.prod-status-line') || $('prod-status-banner') || $('prod-recipe-name');
    if(!host || !host.parentNode) return null;
    p=document.createElement('div'); p.id='atmec67b-wo-test-panel'; p.className='atmec67b-wo-test-panel atmec67b-fix2c-compact-selector';
    host.parentNode.insertBefore(p,host.nextSibling); return p;
  }
  function ensureWoSummaryHost(){
    var chip=$('atmec67g-wo-kpi-chip');
    var btn=$('atmec67g-wo-stats-btn');
    if(chip&&btn) return {chip:chip,btn:btn};
    var kpi=$('atmec66e-session-kpi');
    if(!kpi) return {chip:chip,btn:btn};
    var box=document.createElement('div');
    box.className='atmec67j-wo-summary';
    box.innerHTML='<span class="atmec67j-wo-summary-title">Riepilogo WO</span><button class="btn btn-ghost btn-sm" id="atmec67g-wo-stats-btn" onclick="openWorkOrderStats67G()" disabled>Statistiche</button><span id="atmec67g-wo-kpi-chip" class="prod-op-chip atmec67i-wo-kpi free"><span class="wo-mini total"><small>TOT</small><b>--</b></span><span class="wo-mini pass"><small>PASS</small><b>--</b></span><span class="wo-mini fail"><small>FAIL</small><b>--</b></span><span class="wo-mini left"><small>RES</small><b>--</b></span></span>';
    kpi.appendChild(box);
    return {chip:$('atmec67g-wo-kpi-chip'),btn:$('atmec67g-wo-stats-btn')};
  }
  function renderMiniKpi(w){var k=counters(w); return '<div class="atmec67b-wo-kpis-compact"><span>PREVISTI <b>'+k.qty+'</b></span><span>PASS <b>'+k.done+'</b></span><span>FAIL <b>'+k.fail+'</b></span><span>RESIDUO <b>'+k.left+'</b></span><span>YIELD <b>'+k.yield+'%</b></span></div>';}
  function renderOperatorBar(list,useWO,sel){
    var cb=$('atmec67b-use-wo-prod');
    var chip=$('atmec67b-selected-wo-chip');
    var openBtn=$('atmec67b-wo-open-btn');
    var woHost=ensureWoSummaryHost();
    var statsBtn=woHost.btn;
    var kpiChip=woHost.chip;
    var lot=$('prod-lot-number');
    if(cb) cb.checked=!!useWO;
    if(openBtn) openBtn.disabled=!useWO;
    if(statsBtn) statsBtn.disabled=!useWO || !sel;
    if(chip){
      chip.textContent=useWO?(sel?(sel.wo||sel.id||'WO selezionata'):'Seleziona WO'):'Commessa manuale';
      chip.className='prod-op-chip '+(useWO?(sel?'ok':'warn'):'free');
      if(sel) chip.title=woLabel(sel);
      else chip.removeAttribute('title');
    }
    if(kpiChip){
      if(useWO&&sel){
        var k=counters(sel);
        kpiChip.innerHTML='<span class="wo-mini total"><small>TOT</small><b>'+k.qty+'</b></span><span class="wo-mini pass"><small>PASS</small><b>'+k.done+'</b></span><span class="wo-mini fail"><small>FAIL</small><b>'+k.fail+'</b></span><span class="wo-mini left"><small>RES</small><b>'+k.left+'</b></span>';
        kpiChip.className='prod-op-chip atmec67i-wo-kpi ok';
      }else{
        kpiChip.innerHTML='<span class="wo-mini total"><small>TOT</small><b>--</b></span><span class="wo-mini pass"><small>PASS</small><b>--</b></span><span class="wo-mini fail"><small>FAIL</small><b>--</b></span><span class="wo-mini left"><small>RES</small><b>--</b></span>';
        kpiChip.className='prod-op-chip atmec67i-wo-kpi '+(useWO?'warn':'free');
      }
    }
    if(lot){
      if(useWO){
        var woNumber=sel?woLot(sel):'';
        if(woNumber && lot.value!==woNumber) lot.value=woNumber;
        lot.readOnly=true;
        lot.classList.add('atmec67f-wo-locked');
        lot.placeholder=sel?'Bloccata da WO':'Seleziona WO';
      }else{
        lot.readOnly=false;
        lot.classList.remove('atmec67f-wo-locked');
        lot.placeholder='Commessa manuale';
      }
    }
    lockRecipeControls(useWO);
  }
  function lockRecipeControls(locked){
    ['prod-client-filter','prod-recipe-select','prod-recipe-version-select'].forEach(function(id){
      var el=$(id); if(!el) return;
      el.disabled=!!locked;
      el.classList.toggle('atmec67h-wo-recipe-locked',!!locked);
      el.title=locked?'Bloccato: dati ricetta presi dalla WO':'';
    });
    document.querySelectorAll('.prod-recipe-compact-row .btn').forEach(function(btn){
      btn.disabled=!!locked;
      btn.classList.toggle('atmec67h-wo-recipe-locked',!!locked);
      btn.title=locked?'Bloccato: disattiva Usa WO/Commessa per cambiare manualmente':'';
    });
  }
  function renderPanel(){
    var list=getOpenWOs(); var useWO=getUseWO(); var sel=useWO?getSelectedWO():null;
    renderOperatorBar(list,useWO,sel);
    if($('prod-operator-bar')){
      var legacy=$('atmec67b-wo-test-panel'); if(legacy) legacy.style.display='none';
      return;
    }
    var p=ensurePanel(); if(!p) return;
    var k=sel?counters(sel):null;
    if(!useWO){p.innerHTML='<div class="atmec67b-wo-empty"><label class="atmec67b-mode"><input id="atmec67b-use-wo" type="checkbox"> USA WORK ORDER</label><b>MODALITÀ LIBERA</b> · Test Mode storico senza WO</div>'; var cb0=$('atmec67b-use-wo'); if(cb0) cb0.onchange=function(){setUseWO(cb0.checked);}; return;}
    if(!list.length){p.innerHTML='<div class="atmec67b-wo-empty"><label class="atmec67b-mode"><input id="atmec67b-use-wo" type="checkbox" checked> USA WORK ORDER</label>WO ATTIVE: nessuna · Test Mode libero</div>'; var cb1=$('atmec67b-use-wo'); if(cb1) cb1.onchange=function(){setUseWO(cb1.checked);}; return;}
    p.innerHTML='<div class="atmec67b-wo-compact-row"><label class="atmec67b-mode"><input id="atmec67b-use-wo" type="checkbox" checked> USA WORK ORDER</label><div class="atmec67b-wo-select-block"><label>WORK ORDER</label><select id="atmec67b-wo-select"><option value="">Seleziona WO attiva...</option>'+list.map(function(w){return '<option value="'+esc(w.id)+'" '+(sel&&sel.id===w.id?'selected':'')+'>'+esc(selectedSummary(w))+'</option>';}).join('')+'</select></div><input id="atmec67b-wo-filter" class="atmec67b-wo-filter" placeholder="Cerca WO..."/><button type="button" class="btn btn-ghost btn-xs" id="atmec67b-wo-change-btn">CAMBIA WO</button></div>'+
      (sel?'<div class="atmec67b-wo-current"><div><b>'+esc(sel.wo||sel.id)+'</b><small>'+esc(woLabel(sel))+'</small></div>'+renderMiniKpi(sel)+'</div>':'<div class="atmec67b-wo-selected-line warn"><b>NESSUNA WO SELEZIONATA</b> · seleziona una WO o premi START per scegliere.</div>');
    var cb=$('atmec67b-use-wo'); if(cb) cb.onchange=function(){setUseWO(cb.checked);};
    var select=$('atmec67b-wo-select'); if(select){select.onchange=function(){var w=list.find(function(x){return x.id===select.value;}); if(w) applyWO(w);};}
    var filter=$('atmec67b-wo-filter'); if(filter){filter.oninput=function(){filterSelectOptions(filter.value||'', list, sel);};}
    var ch=$('atmec67b-wo-change-btn'); if(ch){ch.onclick=async function(){var w=await chooseWO(list); if(w) await applyWO(w);};}
  }
  function filterSelectOptions(q, list, sel){
    var select=$('atmec67b-wo-select'); if(!select) return;
    q=String(q||'').toLowerCase();
    var shown=list.filter(function(w){return !q || woLabel(w).toLowerCase().indexOf(q)>-1 || String(w.wo||w.id).toLowerCase().indexOf(q)>-1;});
    select.innerHTML='<option value="">Seleziona WO attiva...</option>'+shown.map(function(w){return '<option value="'+esc(w.id)+'" '+(sel&&sel.id===w.id?'selected':'')+'>'+esc(selectedSummary(w))+'</option>';}).join('');
  }
  function chooseWO(list){
    return new Promise(function(resolve){
      var old=$('atmec67b-wo-selector'); if(old) old.remove();
      var div=document.createElement('div'); div.id='atmec67b-wo-selector'; div.className='atmec67b-wo-selector-backdrop';
      div.innerHTML='<div class="atmec67b-wo-selector-card" role="dialog" aria-modal="true"><div class="atmec67b-wo-selector-head"><b>SELEZIONA WO / COMMESSA</b><button type="button" class="btn btn-ghost btn-sm" id="atmec67b-wo-cancel-x">✕</button></div><input id="atmec67b-wo-modal-search" class="atmec67b-wo-modal-search" placeholder="Cerca cliente, commessa, codice scheda, prodotto o ricetta..."><div class="atmec67b-wo-selector-list" id="atmec67b-wo-selector-list"></div><div class="atmec67b-wo-selector-actions"><button type="button" class="btn btn-ghost" id="atmec67b-wo-skip">ANNULLA</button></div></div>';
      document.body.appendChild(div);
      var listBox=$('atmec67b-wo-selector-list');
      function draw(q){q=String(q||'').toLowerCase(); var rows=list.filter(function(w){return !q || woLabel(w).toLowerCase().indexOf(q)>-1 || String(w.wo||w.id).toLowerCase().indexOf(q)>-1 || String(w.boardCode||w.boardText||w.productText||'').toLowerCase().indexOf(q)>-1;}); listBox.innerHTML=rows.map(function(w){var k=counters(w); return '<button type="button" class="atmec67b-wo-choice" data-id="'+esc(w.id)+'"><b>'+esc(w.wo||w.id)+'</b><small>'+esc(woLabel(w))+'</small><span>RESIDUO '+k.left+'</span></button>';}).join('')||'<div class="hint">Nessuna WO trovata.</div>'; listBox.querySelectorAll('.atmec67b-wo-choice').forEach(function(b){b.onclick=function(){var id=this.getAttribute('data-id'); close(list.find(function(x){return x.id===id;})||null);};});}
      function close(w){try{div.remove();}catch(_){ } resolve(w||null);}
      draw(''); var search=$('atmec67b-wo-modal-search'); if(search){search.oninput=function(){draw(search.value);}; setTimeout(function(){try{search.focus();}catch(_){ }},50);}
      $('atmec67b-wo-cancel-x').onclick=function(){close(null);}; $('atmec67b-wo-skip').onclick=function(){close(null);};
      div.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault(); close(null);}},true);
    });
  }
  async function woBeforeStart(){
    var w=getSelectedWO();
    if(!getUseWO()) return null;
    if(w){await applyWO(w,{silent:true}); return w;}
    var list=getOpenWOs();
    if(list.length>0){w=await chooseWO(list); if(!getUseWO()) return null;
    if(w){await applyWO(w,{silent:true}); return w;}}
    renderPanel();
    return null;
  }
  function installStartHook(){
    if(window.__atmec67bFix2cStartHook) return;
    if(typeof window.startTest!=='function') return;
    var prev=window.startTest;
    window.__atmec67bFix2cStartHook=true;
    window.startTest=async function(){
      try{await woBeforeStart();}catch(e){console.warn('[6.7B_FIX2C] WO selection skipped',e);}
      return prev.apply(this,arguments);
    };
  }
  function increment(result){
    var d=db(); var sel=getSelectedWO(); if(!sel) return;
    var w=(d.workOrders||[]).find(function(x){return x.id===sel.id;}); if(!w) return;
    var r=String(result||'').toUpperCase();
    if(r==='PASS') w.done=Number(w.done||0)+1; else if(r==='FAIL') w.fail=Number(w.fail||0)+1; else if(['ERROR','ABORT','EMERGENZA'].indexOf(r)>-1) w.error=Number(w.error||0)+1;
    if(w.qty && Number(w.done||0)>=Number(w.qty||0)) w.status='Completed';
    w.updatedAt=new Date().toISOString(); saveDb(d); write(ACTIVE_KEY,w); write(SELECTED_KEY,w); audit('WO_TEST_RESULT_'+r,w); renderPanel(); try{window.mes67Render&&window.mes67Render();}catch(_){ }
  }
  function installResultHook(){
    if(window.__atmec67bFix2cResultHook) return; window.__atmec67bFix2cResultHook=true;
    try{ if(window.api&&api.on){ api.on('run-completed',function(data){ increment(data&&data.success?'PASS':'FAIL'); }); } }catch(_){ }
  }

  function installActionInputFix(){
    function patch(){
      var ids=['manual-step-value','atmec66e-manual-value','manual-value','operator-measure-value'];
      ids.forEach(function(id){var input=$(id); if(!input) return; try{input.type='text';}catch(_){} input.removeAttribute('pattern'); input.setAttribute('inputmode','decimal'); input.autocomplete='off'; input.style.pointerEvents='auto'; input.style.userSelect='text';});
    }
    patch(); setInterval(patch,1200);
  }

  window.applyActiveWorkOrderToTestMode67B=applyWO;
  window.renderActiveWorkOrderTestMode67B=renderPanel;
  window.chooseWorkOrderForStart67B=woBeforeStart;
  window.getSelectedWorkOrderForTest67B=getSelectedWO;
  window.getUseWorkOrderMode67B=getUseWO;
  window.setUseWorkOrderMode67B=setUseWO;
  window.openWorkOrderSelector67B=async function(){
    if(!getUseWO()){toast('Attiva Usa WO/Commessa per selezionare una WO.','warn'); return;}
    var list=getOpenWOs();
    if(!list.length){toast('Nessuna WO attiva disponibile.','warn'); renderPanel(); return;}
    var w=await chooseWO(list);
    if(w) await applyWO(w);
  };
  window.openWorkOrderStats67G=function(){
    var sel=getSelectedWO();
    if(!getUseWO()){toast('Statistiche WO disponibili solo con Usa WO/Commessa attivo.','warn'); return;}
    if(!sel){toast('Seleziona una WO prima di aprire le statistiche.','warn'); return;}
    var old=$('atmec67g-wo-stats-modal'); if(old) old.remove();
    var k=counters(sel), avg=avgCycle(sel), elapsed=elapsedSec(sel), estTotal=estimatedTotalSec(sel,k), fails=topFails(sel);
    var total=Math.max(1,k.done+k.fail+k.error+k.left);
    var passDeg=Math.round((k.done/total)*360), failDeg=Math.round((k.fail/total)*360), errDeg=Math.round((k.error/total)*360);
    var top=fails.length?fails.map(function(f){return '<div class="atmec67g-topfail-row"><b>'+esc(f.label)+'</b><span>'+esc(f.count)+'</span></div>';}).join(''):'<div class="atmec67g-empty">Nessun top fail registrato su questa WO.</div>';
    var modal=document.createElement('div');
    modal.id='atmec67g-wo-stats-modal';
    modal.className='atmec67g-wo-stats-backdrop';
    modal.innerHTML='<div class="atmec67g-wo-stats-card" role="dialog" aria-modal="true">'+
      '<div class="atmec67g-stats-head"><div><b>STATISTICHE WO</b><span>'+esc(sel.wo||sel.id)+' · '+esc(woLabel(sel))+'</span></div><button class="btn btn-ghost btn-sm" id="atmec67g-stats-close">Chiudi</button></div>'+
      '<div class="atmec67g-stats-grid">'+
        '<div class="atmec67g-stat"><label>Previste</label><b>'+k.qty+'</b></div>'+
        '<div class="atmec67g-stat pass"><label>PASS</label><b>'+k.done+'</b></div>'+
        '<div class="atmec67g-stat fail"><label>FAIL</label><b>'+k.fail+'</b></div>'+
        '<div class="atmec67g-stat"><label>Residuo</label><b>'+k.left+'</b></div>'+
        '<div class="atmec67g-stat"><label>Yield</label><b>'+k.yield+'%</b></div>'+
        '<div class="atmec67g-stat"><label>Tempo medio</label><b>'+(avg?Math.round(avg)+' s':'--')+'</b></div>'+
        '<div class="atmec67g-stat"><label>Tempo impiegato</label><b>'+fmtDuration(elapsed)+'</b></div>'+
        '<div class="atmec67g-stat"><label>Tempo totale stimato</label><b>'+fmtDuration(estTotal)+'</b></div>'+
      '</div>'+
      '<div class="atmec67g-chart-row">'+
        '<div class="atmec67g-donut" style="--pass:'+passDeg+'deg;--fail:'+failDeg+'deg;--err:'+errDeg+'deg"><span>'+k.yield+'%</span></div>'+
        '<div class="atmec67g-bars"><div><span>PASS</span><i style="width:'+Math.min(100,Math.round((k.done/Math.max(1,k.qty))*100))+'%"></i><b>'+k.done+'</b></div><div class="fail"><span>FAIL</span><i style="width:'+Math.min(100,Math.round((k.fail/Math.max(1,k.qty))*100))+'%"></i><b>'+k.fail+'</b></div><div class="left"><span>RESIDUO</span><i style="width:'+Math.min(100,Math.round((k.left/Math.max(1,k.qty))*100))+'%"></i><b>'+k.left+'</b></div></div>'+
      '</div>'+
      '<div class="atmec67g-topfail"><h4>Top fail</h4>'+top+'</div>'+
    '</div>';
    document.body.appendChild(modal);
    $('atmec67g-stats-close').onclick=function(){modal.remove();};
    modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
    modal.addEventListener('keydown',function(e){if(e.key==='Escape')modal.remove();},true);
    setTimeout(function(){try{$('atmec67g-stats-close').focus();}catch(_){ }},50);
  };
  function init(){
    installStartHook(); installResultHook();
    setTimeout(renderPanel,900);
    setInterval(function(){installStartHook();},2000);
    installActionInputFix(); console.log('[6.7F] WO Commessa Operator Bar inizializzato');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
