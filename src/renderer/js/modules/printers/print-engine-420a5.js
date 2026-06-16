/* AT-MEC_HM_4.20A5_PRINT_ENGINE
 * Layer industriale separato per Printer Manager, Print Queue, Print History e diagnostica.
 * Non modifica Label Designer: usa lo storico e le impostazioni già presenti quando disponibili.
 */
(function(){
  'use strict';
  var LS_SETTINGS='atmec_print420a5_settings';
  var LS_PRINTERS='atmec_print420a5_printers';
  var LS_QUEUE='atmec_print420a5_queue';
  var LS_HISTORY='atmec_print420a5_history';
  var DEFAULT_SETTINGS={enabled:false,simulate:true,autoPass:true,autoFail:false,autoError:false,defaultPrinter:'',format:'50x30 mm',orientation:'portrait',delay:0,copiesPass:1,copiesFail:1,copiesError:1};
  function $(id){ return document.getElementById(id); }
  function now(){ return new Date().toISOString(); }
  function loadJson(k,def){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):def; }catch(_e){ return def; } }
  function saveJson(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(_e){} }
  function uid(prefix){ return (prefix||'JOB')+'-'+Date.now().toString(36)+'-'+Math.random().toString(16).slice(2,6).toUpperCase(); }
  function esc(v){ return String(v==null?'':v).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function setStatus(msg,type){ var e=$('print420-status'); if(e){ e.textContent=msg; e.className='print420-status '+(type||''); } try{ console.info('[PRINT 4.20A5]',msg); }catch(_e){} }
  function getSettings(){ return Object.assign({},DEFAULT_SETTINGS,loadJson(LS_SETTINGS,{})); }
  function getPrinters(){ return loadJson(LS_PRINTERS,[]); }
  function getQueue(){ return loadJson(LS_QUEUE,[]); }
  function getHistory(){ return loadJson(LS_HISTORY,[]); }
  function putQueue(q){ saveJson(LS_QUEUE,q||[]); }
  function putHistory(h){ saveJson(LS_HISTORY,h||[]); }
  function normalizePrinter(p,i){
    var name=p && (p.name||p.displayName||p.deviceName) || ('Stampante '+(i+1));
    return { id:p.id||name, name:name, driver:p.driver||p.description||p.status||'Windows Driver', type:p.type||((/pdf/i.test(name))?'Virtuale':'Windows'), port:p.port||p.options?.printerLocation||'', online:p.online!==false, isDefault:!!(p.isDefault||p.default), lastSeen:now() };
  }
  async function discoverPrinters(){
    var list=[];
    try{
      if(window.api && typeof window.api.getInstalledPrinters420A5==='function'){
        var res=await window.api.getInstalledPrinters420A5();
        if(Array.isArray(res)) list=res.map(normalizePrinter);
        else if(res && Array.isArray(res.printers)) list=res.printers.map(normalizePrinter);
      }
    }catch(err){ console.warn('[PRINT 4.20A5] discover IPC fallback:',err); }
    if(!list.length){
      var previous=getPrinters();
      list=previous.length?previous:[
        {id:'Microsoft Print to PDF',name:'Microsoft Print to PDF',driver:'Windows PDF',type:'Virtuale',port:'PORTPROMPT:',online:true,isDefault:true,lastSeen:now()},
        {id:'Zebra ZD421 USB',name:'Zebra ZD421 USB',driver:'ZPL Ready',type:'Zebra/ZPL',port:'USB001',online:false,isDefault:false,lastSeen:now()},
        {id:'TSC TE210 USB',name:'TSC TE210 USB',driver:'TSPL Ready',type:'TSC/TSPL',port:'USB002',online:false,isDefault:false,lastSeen:now()}
      ];
    }
    if(!list.some(function(p){return p.isDefault;})) list[0].isDefault=true;
    saveJson(LS_PRINTERS,list);
    var st=getSettings(); if(!st.defaultPrinter && list[0]){ st.defaultPrinter=list.find(function(p){return p.isDefault;})?.name || list[0].name; saveJson(LS_SETTINGS,st); }
    return list;
  }
  function fillSettings(){
    var st=getSettings();
    var map={
      'print420-enabled':!!st.enabled,'print420-simulate':!!st.simulate,'print420-auto-pass':!!st.autoPass,'print420-auto-fail':!!st.autoFail,'print420-auto-error':!!st.autoError
    };
    Object.keys(map).forEach(function(id){ var e=$(id); if(e) e.checked=map[id]; });
    var vals={'print420-label-format':st.format,'print420-orientation':st.orientation,'print420-delay':st.delay,'print420-copies-pass':st.copiesPass,'print420-copies-fail':st.copiesFail,'print420-copies-error':st.copiesError};
    Object.keys(vals).forEach(function(id){ var e=$(id); if(e) e.value=vals[id]; });
  }
  function renderPrinters(){
    var list=getPrinters(); var sel=$('print420-default-printer');
    if(sel){
      sel.innerHTML=list.map(function(p){return '<option value="'+esc(p.name)+'">'+esc(p.name)+(p.isDefault?' · default':'')+'</option>';}).join('');
      var st=getSettings(); if(st.defaultPrinter) sel.value=st.defaultPrinter;
    }
    var box=$('print420-printer-list'); if(!box) return;
    if(!list.length){ box.innerHTML='<div class="print420-empty">Nessuna stampante rilevata. Usa Aggiorna stampanti.</div>'; return; }
    box.innerHTML=list.map(function(p){
      return '<div class="print420-printer-row"><div>'+(p.online?'🟢':'🔴')+'</div><div><b>'+esc(p.name)+'</b><br><span>'+esc(p.type)+' · '+esc(p.driver)+' · '+esc(p.port||'porta n/d')+'</span></div><div><span class="print420-badge '+(p.online?'ok':'err')+'">'+(p.online?'ONLINE':'OFFLINE')+'</span> '+(p.isDefault?'<span class="print420-badge ok">DEFAULT</span>':'<button class="btn btn-ghost btn-xs" onclick="setDefaultPrinter420A5(\''+esc(p.name)+'\')">Default</button>')+'</div></div>';
    }).join('');
    updateDiagnostics();
  }
  function updateDiagnostics(){
    var st=getSettings(), list=getPrinters(), def=list.find(function(p){return p.name===st.defaultPrinter;}) || list.find(function(p){return p.isDefault;});
    var d=$('print420-diag-default'); if(d){ d.className='print420-diag '+(def?'ok':'warn'); d.querySelector('b').textContent=def?def.name:'Non impostata'; }
    var m=$('print420-diag-mode'); if(m){ m.className='print420-diag '+(st.simulate?'info':'ok'); m.querySelector('b').textContent=st.simulate?'Simulazione':'Stampa reale'; }
    var drv=$('print420-diag-driver'); if(drv){ drv.className='print420-diag '+(def&&def.driver?'ok':'warn'); drv.querySelector('b').textContent=def&&def.driver?'Disponibile':'Da verificare'; }
  }
  function renderQueue(){
    var box=$('print420-queue'); if(!box) return; var q=getQueue();
    if(!q.length){ box.innerHTML='<div class="print420-empty">Coda vuota.</div>'; return; }
    box.innerHTML=q.slice().reverse().map(function(j){ return rowHtml(j,true); }).join('');
  }
  function renderHistory(){
    var box=$('print420-history'); if(!box) return; var h=getHistory(); var f=($('print420-history-filter')?.value||'').toLowerCase();
    if(f) h=h.filter(function(j){ return JSON.stringify(j).toLowerCase().indexOf(f)>=0; });
    if(!h.length){ box.innerHTML='<div class="print420-empty">Nessuno storico stampa.</div>'; return; }
    box.innerHTML=h.slice(-80).reverse().map(function(j){ return rowHtml(j,false); }).join('');
  }
  function rowHtml(j,queue){
    var status=String(j.status||'PENDING').toUpperCase(); var cls=status==='COMPLETED'?'ok':status==='ERROR'?'err':status==='PRINTING'?'warn':'';
    return '<div class="print420-job-row"><div><b>'+esc((j.createdAt||j.timestamp||'').slice(11,19))+'</b><br><small>'+esc((j.createdAt||j.timestamp||'').slice(0,10))+'</small></div><div><b>'+esc(j.serial||j.seriale||'SN —')+'</b><br><small>'+esc(j.workOrder||j.commessa||'WO —')+' · '+esc(j.lot||j.lotto||'LOT —')+' · '+esc(j.template||'Template')+'</small></div><div class="hide-sm">'+esc(j.printer||'Printer')+'</div><div><span class="print420-badge '+cls+'">'+esc(status)+'</span></div><div>'+(queue?'<button class="btn btn-ghost btn-xs" onclick="cancelPrintJob420A5(\''+esc(j.id)+'\')">Annulla</button>':'<button class="btn btn-primary btn-xs" onclick="reprintHistoryJob420A5(\''+esc(j.id)+'\')">Ristampa</button>')+'</div></div>';
  }
  function renderAll(){ fillSettings(); renderPrinters(); renderQueue(); renderHistory(); }
  function readContextFromTestMode(result){
    var serial=$('prod-serial-input')?.value || $('serial-dut')?.value || '';
    var lot=$('prod-lot-number')?.value || $('lot-number')?.value || '';
    var recipe=$('prod-recipe-name')?.textContent || $('recipe-name')?.textContent || 'Ricetta corrente';
    var operator=window.currentUser?.username || $('op-name')?.value || 'Operatore';
    return {serial:serial||'TEST-SN',workOrder:lot||'COMMESSA-DEMO',lot:lot||'LOT-DEMO',recipe:recipe,revision:'ultima',firmware:'n/d',operator:operator,station:'AT-MEC-STATION',result:result||'TEST',template:'Template associato'};
  }
  function enqueuePrintJob(ctx,opts){
    opts=opts||{}; var st=getSettings(); var result=String(ctx.result||opts.result||'PASS').toLowerCase();
    var copies=Number(result==='fail'?st.copiesFail:result==='error'?st.copiesError:st.copiesPass)||1;
    var job={id:uid('PRINT'),createdAt:now(),serial:ctx.serial||ctx.seriale||'',workOrder:ctx.workOrder||ctx.commessa||'',lot:ctx.lot||ctx.lotto||'',recipe:ctx.recipe||'',revision:ctx.revision||'',firmware:ctx.firmware||'',operator:ctx.operator||'',station:ctx.station||'',result:(ctx.result||'PASS'),template:ctx.template||ctx.labelTemplate||'Template associato',printer:st.defaultPrinter||'Stampante default',copies:opts.copies||copies,status:'PENDING',errorMessage:''};
    var q=getQueue(); q.push(job); putQueue(q); renderQueue(); setStatus('Job accodato: '+job.serial+' → '+job.printer); return job;
  }
  async function processQueue(){
    var st=getSettings(); var q=getQueue(); var h=getHistory(); var changed=false;
    for(var i=0;i<q.length;i++){
      var j=q[i]; if(j.status!=='PENDING') continue; changed=true; j.status='PRINTING'; renderQueue();
      if(!st.enabled){ j.status='COMPLETED'; j.errorMessage='Stampante OFF: salvato storico senza stampa'; }
      else if(st.simulate){ j.status='COMPLETED'; j.errorMessage='Simulazione stampa completata'; }
      else {
        try{
          if(window.api && typeof window.api.printLabelJob420A5==='function'){
            var res=await window.api.printLabelJob420A5(j); if(res && res.ok===false) throw new Error(res.error||'Errore stampa');
            j.status='COMPLETED';
          } else { j.status='ERROR'; j.errorMessage='Adapter stampa reale non disponibile: attiva Simula stampa o installa adapter.'; }
        }catch(err){ j.status='ERROR'; j.errorMessage=err && err.message ? err.message : String(err); }
      }
      if(j.status==='COMPLETED') h.push(Object.assign({timestamp:now()},j));
    }
    putQueue(q); putHistory(h); renderQueue(); renderHistory(); setStatus(changed?'Coda elaborata.':'Nessun job pending.');
  }
  window.showPrintEngine420A5=function(){ if(typeof window.showTab==='function') window.showTab('print-engine-tab',null); setTimeout(function(){ window.initPrintEngine420A5(); },60); };
  window.initPrintEngine420A5=async function(){ await discoverPrinters(); renderAll(); setStatus('Print Engine 4.20A5 inizializzato.'); };
  window.refreshPrinters420A5=async function(){ await discoverPrinters(); renderAll(); setStatus('Elenco stampanti aggiornato.'); };
  window.savePrintSettings420A5=function(){ var st=getSettings(); st.enabled=!!$('print420-enabled')?.checked; st.simulate=!!$('print420-simulate')?.checked; st.autoPass=!!$('print420-auto-pass')?.checked; st.autoFail=!!$('print420-auto-fail')?.checked; st.autoError=!!$('print420-auto-error')?.checked; st.defaultPrinter=$('print420-default-printer')?.value||st.defaultPrinter; st.format=$('print420-label-format')?.value||st.format; st.orientation=$('print420-orientation')?.value||st.orientation; st.delay=Number($('print420-delay')?.value||0); st.copiesPass=Number($('print420-copies-pass')?.value||1); st.copiesFail=Number($('print420-copies-fail')?.value||1); st.copiesError=Number($('print420-copies-error')?.value||1); saveJson(LS_SETTINGS,st); updateDiagnostics(); setStatus('Configurazione stampa salvata.'); };
  window.setDefaultPrinter420A5=function(name){ var list=getPrinters(); list.forEach(function(p){ p.isDefault=p.name===name; }); saveJson(LS_PRINTERS,list); var st=getSettings(); st.defaultPrinter=name; saveJson(LS_SETTINGS,st); renderAll(); setStatus('Stampante predefinita: '+name); };
  window.createTestPrintJob420A5=function(){ enqueuePrintJob(readContextFromTestMode('TEST'),{copies:1}); };
  window.processPrintQueue420A5=processQueue;
  window.cancelPrintJob420A5=function(id){ var q=getQueue().map(function(j){ if(j.id===id && j.status==='PENDING') j.status='CANCELLED'; return j; }); putQueue(q); renderQueue(); setStatus('Job annullato.'); };
  window.clearCompletedPrintJobs420A5=function(){ putQueue(getQueue().filter(function(j){ return !['COMPLETED','CANCELLED'].includes(j.status); })); renderQueue(); };
  window.renderPrintHistory420A5=renderHistory;
  window.reprintHistoryJob420A5=function(id){ var h=getHistory(); var src=h.find(function(j){return j.id===id;}); if(src){ enqueuePrintJob(Object.assign({},src,{result:src.result||'REPRINT'})); } };
  window.exportPrintHistory420A5=function(){ var data=JSON.stringify(getHistory(),null,2); try{ navigator.clipboard.writeText(data); setStatus('Storico copie negli appunti.'); }catch(_e){ console.log(data); setStatus('Storico scritto in console.'); } };
  window.enqueuePrintJob420A5=enqueuePrintJob;
  window.printLastTestLabel420A5=function(result){ var st=getSettings(); var r=String(result||'PASS').toLowerCase(); if(!st.enabled){ enqueuePrintJob(readContextFromTestMode(result),{}); processQueue(); return; } if((r==='pass'&&!st.autoPass)||(r==='fail'&&!st.autoFail)||(r==='error'&&!st.autoError)) return; enqueuePrintJob(readContextFromTestMode(result),{}); setTimeout(processQueue, Math.max(0,Number(st.delay)||0)*1000); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ setTimeout(window.initPrintEngine420A5,300); }); else setTimeout(window.initPrintEngine420A5,300);
})();
