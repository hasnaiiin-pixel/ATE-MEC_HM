/* VEXON 10.1.12 - Stable Action Unique Panel + Fast Start Fix.
   Base: VEXON 10.1.9 Stable Measurement Operator Speed + AutoStart Fix.
   Scopo: misura stabilizzata automatica, popup Action pulito e passaggio veloce.
   - Nome step/misura attesa in evidenza.
   - Misura multimetro live grande sopra.
   - Nessun passaggio a pannello manuale separato: fallback manuale integrato sotto nello stesso popup.
   - Riprova multimetro funzionante e sempre vicino alla misura/manuale.
   - Popup chiuso subito a fine test.
   - Aggiornamento DOM a campi, senza ridisegno completo. */
(function(){
  'use strict';
  var VERSION='10.1.12_STABLE_ACTION_UNIQUE_FAST_START_FIX';
  var active=null;
  var lastStableStepId=null;
  var hideTimer=null;
  var failMode=false;
  var lastRetryTs=0;
  var rafPending=false;
  var pendingData=null;
  var lastText=new WeakMap();
  var lastRunCompletedTs=0;
  var manualMode=false;
  var manualSubmitting=false;
  var manualFocusRequested=false;
  var lastManualValue='';
  var lastManualRequestId=null;
  var lastManualRequestStepId=null;
  var manualSubmitSeq=0;
  var manualClearTimer=null;

  function $(id){return document.getElementById(id);} 
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function num(v){var n=parseFloat(String(v==null?'':v).replace(',','.').replace(/[^0-9+\-.Ee]/g,'')); return Number.isFinite(n)?n:null;}
  function fmtMs(ms){ms=Number(ms)||0; if(ms>=1000) return (ms/1000).toFixed(1).replace('.0','')+' s'; return Math.round(ms)+' ms';}
  function pct(v,max){v=Number(v)||0; max=Number(max)||0; if(max<=0)return 0; return Math.max(0,Math.min(100,(v/max)*100));}
  function fmtNumber(v){var n=num(v); if(n==null) return String(v==null?'--':v); return (Math.round(n*100000)/100000).toString();}
  function fmtValue(v,unit){
    if(v===undefined||v===null||v==='') return '--';
    var t=String(v).trim();
    if(/OVERLOAD|OVLD|OLOAD|NON VALIDO|TIMEOUT|ERROR|ERRORE|N\/D|--/i.test(t)) return t.toUpperCase();
    return (fmtNumber(v)+(unit?' '+unit:'')).trim();
  }
  function isStablePayload(d){
    if(!d) return false;
    var txt=String(d.message||'')+' '+String(d.status||'')+' '+String(d.label||'')+' '+String(d.description||'');
    return d.type==='StableMeasurement' || d.live_popup || d.stable_required_ms!==undefined || d.stable_time_ms!==undefined || d.retry_requested || /stabilizz|riprova misura|overload|fuori range|ok stabile|misura live|valore non valido/i.test(txt);
  }
  function setText(el,v){
    if(!el) return;
    v=(v===undefined||v===null||v==='')?'--':String(v);
    if(lastText.get(el)!==v){el.textContent=v; lastText.set(el,v);} 
  }
  function setClass(el,classes){ if(el && el.className!==classes) el.className=classes; }
  function field(box,name){return box&&box.querySelector('[data-vx="'+name+'"]');}

  function popupHtml(){return ''+
    '<div class="vx1018-card">'+
      '<div class="vx1018-top">'+
        '<div class="vx1018-title-block"><span>MISURA</span><b data-vx="stepName">--</b></div>'+ 
        '<strong data-vx="state" class="vx1018-pill">LIVE</strong>'+ 
      '</div>'+ 
      '<div class="vx1018-expected big"><span>MISURA ATTESA</span><b data-vx="expectedMain">--</b><small data-vx="expectedRange">--</small></div>'+ 
      '<div class="vx1018-meter"><small>MISURA MULTIMETRO LIVE</small><div data-vx="value" class="vx1018-value">--</div></div>'+ 
      '<div class="vx1018-tol">'+
        '<div class="vx1018-scale"><i data-vx="marker"></i></div>'+ 
        '<div class="vx1018-labels"><span data-vx="min">MIN --</span><b data-vx="target">TARGET --</b><span data-vx="max">MAX --</span></div>'+ 
      '</div>'+ 
      '<div class="vx1018-bottom">'+
        '<div><span>Stabilità</span><b data-vx="stableText">--</b></div>'+ 
        '<button type="button" class="btn btn-warn vx1018-retry" data-vx-action="retry">↻ RIPROVA MULTIMETRO</button>'+ 
      '</div>'+ 
      '<div class="vx1018-bar"><i data-vx="stableFill"></i></div>'+ 
      '<div data-vx="manualBox" class="vx1018-manual" style="display:none">'+
        '<label>FALLBACK MANUALE</label>'+ 
        '<div class="vx1018-manual-row"><input data-vx="manualInput" inputmode="decimal" placeholder="Valore manuale"><button type="button" class="btn btn-success" data-vx-action="manualSubmit">Conferma</button><button type="button" class="btn btn-warn" data-vx-action="retryManual">↻ Riprova multimetro</button></div>'+ 
      '</div>'+ 
      '<div data-vx="note" class="vx1018-note">Automatico: appena la misura è OK e stabile il test prosegue.</div>'+ 
    '</div>';}

  function ensurePopup(){
    var pop=$('vx1018-live-popup');
    if(!pop){
      pop=document.createElement('div');
      pop.id='vx1018-live-popup';
      pop.className='vx1018-live-popup idle';
      pop.innerHTML=popupHtml();
      document.body.appendChild(pop);
      var btn=pop.querySelector('[data-vx-action="retry"]');
      if(btn){btn.addEventListener('click',retryStableMeasurement1018);}
      var submit=pop.querySelector('[data-vx-action="manualSubmit"]');
      if(submit){
        // 10.1.10: conferma immediata anche se il focus è ancora dentro l'input.
        // pointerdown evita il caso Electron in cui il primo click fa solo perdere focus al campo.
        submit.addEventListener('pointerdown',function(ev){ submitManualFallback1018(ev); });
        submit.addEventListener('click',function(ev){ submitManualFallback1018(ev); });
      }
      var retryManual=pop.querySelector('[data-vx-action="retryManual"]');
      if(retryManual){retryManual.addEventListener('click',retryStableMeasurement1018);}
      var inp=pop.querySelector('[data-vx="manualInput"]');
      if(inp){
        inp.setAttribute('autocomplete','off');
        inp.addEventListener('input',function(){ lastManualValue=String(inp.value||''); });
        inp.addEventListener('change',function(){ lastManualValue=String(inp.value||''); });
        inp.addEventListener('compositionend',function(){ lastManualValue=String(inp.value||''); });
        inp.addEventListener('keydown',function(ev){ if(ev.key==='Enter'){ev.preventDefault(); submitManualFallback1018(ev);} });
      }
    }
    return pop;
  }

  function expectedMainText(d){
    var unit=d.unit||'';
    return d.target!==undefined?fmtValue(d.target,unit):'--';
  }
  function expectedRangeText(d){
    var unit=d.unit||'';
    var min=d.min!==undefined?fmtValue(d.min,unit):'-∞';
    var max=d.max!==undefined?fmtValue(d.max,unit):'+∞';
    return 'Range: '+min+' ÷ '+max;
  }

  function normalize(data){
    data=data||{};
    if(data.type==='StableMeasurement' && data.step_id!=null) lastStableStepId=data.step_id;
    if(isStablePayload(data) && data.step_id!=null) lastStableStepId=data.step_id;
    var merged=Object.assign({}, active||{}, data||{});
    active=merged;
    var unit=merged.unit || (($('prod-live-unit')||{}).textContent||'').replace('--','').trim();
    var val=merged.value!==undefined?merged.value:(merged.measured!==undefined?merged.measured:(($('prod-live-measure-value')||{}).textContent||'--'));
    var device=merged.instrument || merged.device_display || merged.measurement_device || merged.device || 'Keysight 34461A';
    if(String(device).toLowerCase()==='keysight_34461a') device='Keysight 34461A';
    var min=merged.min!==undefined?merged.min:merged.expected_min;
    var max=merged.max!==undefined?merged.max:merged.expected_max;
    var target=merged.target!==undefined?merged.target:merged.nominal;
    var stableElapsed=Number(merged.stable_elapsed_ms)||0;
    var stableReq=Number(merged.stable_required_ms||merged.stable_time_ms)||0;
    var status=merged.status || (stableReq?'LETTURA LIVE':'RUNNING');
    var stepName=merged.label || merged.step_label || merged.description || ('Step #'+(merged.step_id||lastStableStepId||'--'));
    return {raw:merged,unit:unit,val:val,min:min,max:max,target:target,stableElapsed:stableElapsed,stableReq:stableReq,status:status,device:device,stepName:stepName};
  }

  function updateMarker(pop,d){
    var el=field(pop,'marker'); if(!el) return;
    var v=num(d.val), mi=num(d.min), ma=num(d.max), t=num(d.target), pos=50;
    if(v!=null && mi!=null && ma!=null && ma>mi) pos=((v-mi)/(ma-mi))*100;
    else if(v!=null && t!=null && t!==0) pos=50+((v-t)/Math.max(Math.abs(t),1))*35;
    pos=Math.max(0,Math.min(100,pos));
    var left=pos.toFixed(1)+'%';
    if(el.style.left!==left) el.style.left=left;
  }
  function classForStatus(status){
    var s=String(status||'').toUpperCase();
    if(/OK STABILE|PASS/.test(s)) return 'vx1018-live-popup ok';
    if(/OVERLOAD|NON VALIDO|FUORI|FAIL|ERRORE|NON DISPONIBILE|TIMEOUT/.test(s)) return 'vx1018-live-popup bad';
    if(/RIPROVA/.test(s)) return 'vx1018-live-popup retry';
    if(/STABILIZZ|LETTURA|RUNNING|OK/.test(s)) return 'vx1018-live-popup wait';
    return 'vx1018-live-popup idle';
  }

  function renderNow(data){
    if(Date.now()-lastRunCompletedTs<300 && !(data&&data.forceShow)) return;
    var pop=ensurePopup();
    var d=normalize(data);
    var statusText=String(d.status||'')+' '+String((data&&data.message)||'')+' '+String((data&&data.label)||'');
    if(/FAIL|TIMEOUT|INSERIMENTO MANUALE|NON DISPONIBILE|ERRORE MANUALE/i.test(statusText)) { failMode=true; manualMode=true; }
    setClass(pop,classForStatus(d.status));
    document.body.classList.add('vexon-stable-live-active');
    document.body.classList.toggle('vexon-stable-live-fail', failMode || /FAIL|NON DISPONIBILE|ERRORE|TIMEOUT/i.test(String(d.status||'')));
    setText(field(pop,'stepName'),d.stepName);
    setText(field(pop,'state'),d.status);
    setText(field(pop,'expectedMain'),expectedMainText(d));
    setText(field(pop,'expectedRange'),expectedRangeText(d));
    setText(field(pop,'value'),fmtValue(d.val,d.unit));
    setText(field(pop,'min'),'MIN '+(d.min!==undefined?fmtValue(d.min,d.unit):'-∞'));
    setText(field(pop,'max'),'MAX '+(d.max!==undefined?fmtValue(d.max,d.unit):'+∞'));
    setText(field(pop,'target'),'TARGET '+(d.target!==undefined?fmtValue(d.target,d.unit):'--'));
    setText(field(pop,'stableText'),fmtMs(d.stableElapsed)+' / '+fmtMs(d.stableReq));
    var fill=field(pop,'stableFill'); if(fill){var w=pct(d.stableElapsed,d.stableReq).toFixed(1)+'%'; if(fill.style.width!==w) fill.style.width=w;}
    updateMarker(pop,d);
    var btn=pop.querySelector('[data-vx-action="retry"]');
    if(btn){btn.disabled=false; setText(btn,(Date.now()-lastRetryTs<650)?'↻ RESET INVIATO':'↻ RIPROVA MULTIMETRO');}
    var manual=field(pop,'manualBox');
    var showManual=manualMode || failMode || /FAIL|TIMEOUT|INSERIMENTO MANUALE|NON DISPONIBILE|ERRORE MANUALE/i.test(String(d.status||''));
    if(manual) manual.style.display=showManual?'block':'none';
    var input=field(pop,'manualInput');
    if(input && showManual){
      if(lastManualValue && input.value!==lastManualValue) input.value=lastManualValue;
      if(manualFocusRequested){
        manualFocusRequested=false;
        setTimeout(function(){ try{ input.focus(); input.select&&input.select(); }catch(_e){} },40);
      }
    }
    var manualBtn=pop.querySelector('[data-vx-action="manualSubmit"]');
    if(manualBtn){ manualBtn.disabled=!!manualSubmitting; setText(manualBtn, manualSubmitting?'CONFERMO...':'Conferma'); }
    setText(field(pop,'note'), showManual?'Inserisci il valore e premi Conferma: resta tutto nello stesso popup.':'Automatico: appena OK e stabile passa avanti.');
  }

  function scheduleRender(data){
    pendingData=Object.assign({}, pendingData||{}, data||{});
    if(rafPending) return;
    rafPending=true;
    requestAnimationFrame(function(){rafPending=false; var d=pendingData||{}; pendingData=null; renderNow(d);});
  }
  function showStable(data){
    clearTimeout(hideTimer); hideTimer=null;
    var txt=String((data&&data.status)||'')+' '+String((data&&data.message)||'')+' '+String((data&&data.fallback_reason)||'');
    if(/FAIL|TIMEOUT|INSERIMENTO MANUALE|NON DISPONIBILE|ERRORE MANUALE/i.test(txt)){ failMode=true; manualMode=true; }
    else if(!manualMode){ failMode=false; }
    ensurePopup().style.display='block';
    scheduleRender(data||{});
  }
  function hideStableNow(){
    clearTimeout(hideTimer); hideTimer=null;
    var pop=$('vx1018-live-popup'); if(pop) pop.style.display='none';
    var old=$('vx1017-live-popup'); if(old) old.style.display='none';
    var older=$('atmec1016-action-dock'); if(older) older.style.display='none';
    document.body.classList.remove('vexon-stable-live-active','vexon-stable-live-fail');
    active=null; lastStableStepId=null; window.__vexon10112StableStepId=null; failMode=false; manualMode=false; manualSubmitting=false; manualFocusRequested=false; lastManualValue=''; pendingData=null;
  }
  function hideStableSoon(delay){
    clearTimeout(hideTimer);
    hideTimer=setTimeout(hideStableNow, delay==null?120:delay);
  }

  // 10.1.12: usa un solo pannello Action per StableMeasurement.
  // Quando il runtime apre anche il pannello legacy manual-step/fault-panel, lo chiudiamo subito
  // per evitare il secondo riquadro a destra "Misura multimetro fallita — ...".
  function hideLegacyStableAction10112(reason){
    try{
      var modal=$('manual-step-modal');
      if(modal){
        modal.classList.remove('show','atmec66d-side-action-panel');
        modal.setAttribute('aria-hidden','true');
      }
      var fail=$('fault-panel');
      if(fail) fail.classList.remove('show');
      var decision=$('fail-decision-modal');
      if(decision) decision.classList.remove('show');
      var strip=$('atmec66d-action-strip');
      if(strip) strip.remove();
      window.__atmec10112LegacyActionSuppressedAt=Date.now();
      window.__atmec10112LegacyActionSuppressedReason=reason||'';
    }catch(_e){}
  }
  window.hideLegacyStableAction10112=hideLegacyStableAction10112;

  function clearManualFallbackInputs10111(reason){
    clearTimeout(manualClearTimer);
    var pop=$('vx1018-live-popup');
    var input=field(pop,'manualInput');
    if(input){ input.value=''; input.removeAttribute('value'); }
    var ids=['manual-step-value','atmec66e-manual-value','manual-value','operator-measure-value'];
    ids.forEach(function(id){
      var el=$(id);
      if(el && 'value' in el){
        el.value='';
        try{ el.removeAttribute('value'); }catch(_e){}
        try{ el.dispatchEvent(new Event('input',{bubbles:true})); }catch(_e){}
        try{ el.dispatchEvent(new Event('change',{bubbles:true})); }catch(_e){}
      }
    });
    lastManualValue='';
    manualMode=false;
    manualSubmitting=false;
    manualFocusRequested=false;
    if(reason && window.console) console.debug('[VEXON 10.1.11] Manual fallback input pulito:', reason);
  }
  function clearManualFallbackInputsSoon10111(reason,delay){
    clearTimeout(manualClearTimer);
    manualClearTimer=setTimeout(function(){ clearManualFallbackInputs10111(reason); }, delay==null?180:delay);
  }
  function writeManualValueEverywhere10111(value){
    var ids=['manual-step-value','atmec66e-manual-value','manual-value','operator-measure-value'];
    ids.forEach(function(id){
      var el=$(id);
      if(el && 'value' in el){
        el.value=value;
        try{ el.setAttribute('value',value); }catch(_e){}
        try{ el.dispatchEvent(new Event('input',{bubbles:true})); }catch(_e){}
        try{ el.dispatchEvent(new Event('change',{bubbles:true})); }catch(_e){}
        try{ el.dispatchEvent(new Event('blur',{bubbles:true})); }catch(_e){}
      }
    });
  }
  async function directManualStepResponse10111(value){
    var requestId=lastManualRequestId;
    if(requestId && window.api && typeof window.api.manualStepResponse==='function'){
      return await window.api.manualStepResponse(requestId,{ok:true,manual_value:value,manual_input_forced:true,source:'stable_live_popup_10111'});
    }
    if(typeof window.respondManualValueOnly==='function'){
      return await window.respondManualValueOnly();
    }
    var btn=$('manual-step-value-btn');
    if(btn){ btn.click(); return {ok:true,legacyClick:true}; }
    return {ok:false,error:'Nessuna richiesta manuale attiva'};
  }

  async function retryStableMeasurement1018(){
    manualMode=false;
    manualSubmitting=false;
    manualFocusRequested=false;
    clearManualFallbackInputs10111('riprova multimetro');
    var pop=ensurePopup(); var btn=pop.querySelector('[data-vx-action="retry"]');
    try{
      if(btn){btn.disabled=true; setText(btn,'↻ RESET...');}
      var res=window.api && window.api.retryCurrentMeasurement ? await window.api.retryCurrentMeasurement() : {ok:false,error:'Funzione retry non disponibile nel preload'};
      lastRetryTs=Date.now();
      if(!res || !res.ok){
        scheduleRender({type:'StableMeasurement',step_id:lastStableStepId,status:'ERRORE RIPROVA',message:res&&res.error?res.error:'Riprova non disponibile',retry_requested:true,stable_elapsed_ms:0});
      } else {
        scheduleRender({type:'StableMeasurement',step_id:res.step_id||lastStableStepId,status:'RIPROVA MISURA',retry_requested:true,stable_elapsed_ms:0,timeout_elapsed_ms:0});
      }
    }catch(e){
      scheduleRender({type:'StableMeasurement',step_id:lastStableStepId,status:'ERRORE RIPROVA',message:(e&&e.message)||String(e),retry_requested:true,stable_elapsed_ms:0});
    }finally{
      setTimeout(function(){var b=ensurePopup().querySelector('[data-vx-action="retry"]'); if(b){b.disabled=false; setText(b,'↻ RIPROVA MULTIMETRO');}},160);
    }
  }
  window.retryStableMeasurement1018=retryStableMeasurement1018;
  window.retryStableMeasurement1017=retryStableMeasurement1018;
  window.retryStableMeasurement1012=retryStableMeasurement1018;

  async function submitManualFallback1018(ev){
    if(ev){
      try{ ev.preventDefault(); ev.stopPropagation(); }catch(_e){}
    }
    if(manualSubmitting) return;
    var seq=++manualSubmitSeq;
    var pop=ensurePopup();
    var input=field(pop,'manualInput');
    var value=String((input&&input.value)||lastManualValue||'').trim();
    lastManualValue=value;
    if(!value){
      manualMode=true; failMode=true; manualFocusRequested=true;
      if(input){ try{ input.focus(); }catch(_e){} }
      scheduleRender({type:'StableMeasurement',step_id:lastStableStepId,status:'INSERIMENTO MANUALE',message:'Inserisci un valore prima di confermare'});
      return;
    }

    // 10.1.11: scrive il valore in tutti i campi legacy compatibili, poi risponde direttamente
    // alla richiesta manuale attiva. Non dipende più dal blur o da un secondo click del bottone nascosto.
    writeManualValueEverywhere10111(value);
    manualSubmitting=true;
    manualMode=true;
    failMode=true;
    var submit=pop.querySelector('[data-vx-action="manualSubmit"]');
    if(submit){ submit.disabled=true; setText(submit,'CONFERMO...'); }
    scheduleRender({type:'StableMeasurement',step_id:lastStableStepId,status:'CONFERMA MANUALE',message:'Valore manuale inviato',manual_value:value});
    try{
      var res=await directManualStepResponse10111(value);
      if(res && res.ok===false){ throw new Error(res.error || 'Risposta manuale non accettata'); }
      // La risposta è stata inviata: lasciamo avanzare il motore e poi svuotiamo la cella operatore.
      clearManualFallbackInputsSoon10111('conferma manuale inviata',220);
    }catch(e){
      if(seq!==manualSubmitSeq) return;
      manualSubmitting=false;
      manualMode=true; failMode=true; manualFocusRequested=true;
      if(submit){ submit.disabled=false; setText(submit,'Conferma'); }
      scheduleRender({type:'StableMeasurement',step_id:lastStableStepId,status:'ERRORE MANUALE',message:(e&&e.message)||String(e)});
      return;
    }
  }




  // 10.1.9 - Auto-start opzionale da prima misura valida.
  function getRecipe1019(){ try{return window.recipe || (typeof recipe!=='undefined' ? recipe : null);}catch(_e){return window.recipe||null;} }
  function firstStableStep1019(){ var r=getRecipe1019(); var steps=(r&&Array.isArray(r.steps))?r.steps:[]; return steps.find(function(st){return st && st.enabled!==false && st.type==='StableMeasurement';}) || null; }
  function within1019(v,st){ var n=num(v); if(n==null||!st) return false; var mi=(st.min!==undefined&&st.min!=='')?Number(st.min):-Infinity; var ma=(st.max!==undefined&&st.max!=='')?Number(st.max):Infinity; return n>=mi && n<=ma; }
  function readLiveValue1019(){ var ids=['prod-live-measure-value','multimeter-live-value','dm-meter-live-value','device-meter-live-value']; for(var i=0;i<ids.length;i++){ var el=$(ids[i]); var t=String((el&&el.textContent)||'').trim(); if(t && t!=='--' && t!=='—') return t; } return ''; }
  function ensureAutoStartToggle1019(){
    var start=$('btn-start'); if(!start || $('vexon1019-auto-start-wrap')) return;
    var wrap=document.createElement('label'); wrap.id='vexon1019-auto-start-wrap'; wrap.className='vexon1019-autostart';
    var checked=localStorage.getItem('vexon1019_auto_start_first_measure')==='1';
    wrap.innerHTML='<input type="checkbox" id="vexon1019-auto-start" ' +(checked?'checked':'')+'> Auto-start prima misura';
    start.insertAdjacentElement('afterend',wrap);
    var cb=$('vexon1019-auto-start'); if(cb) cb.addEventListener('change',function(){localStorage.setItem('vexon1019_auto_start_first_measure',this.checked?'1':'0');});
  }
  var autoStartCandidateTs=0, autoStartBusy=false;
  function autoStartLoop1019(){
    ensureAutoStartToggle1019();
    if(autoStartBusy) return;
    var cb=$('vexon1019-auto-start'); if(!cb||!cb.checked) { autoStartCandidateTs=0; return; }
    if(document.body.classList.contains('vexon-stable-live-active')) return;
    var st=firstStableStep1019(); if(!st) { autoStartCandidateTs=0; return; }
    var val=readLiveValue1019(); if(!within1019(val,st)){ autoStartCandidateTs=0; return; }
    var now=Date.now(); if(!autoStartCandidateTs) { autoStartCandidateTs=now; return; }
    if(now-autoStartCandidateTs<300) return;
    if(typeof window.startTest!=='function') return;
    autoStartBusy=true; autoStartCandidateTs=0;
    try{ window.startTest(); }catch(e){ console.warn('[VEXON 10.1.9] Auto-start fallito',e); }
    setTimeout(function(){autoStartBusy=false;},1500);
  }

  function install(){
    var p=ensurePopup(); p.style.display='none';
    try{ var old=$('atmec1016-action-dock'); if(old) old.style.display='none'; }catch(_e){}
    try{ var old17=$('vx1017-live-popup'); if(old17) old17.style.display='none'; }catch(_e){}
    if(!window.api || !window.api.on || window.__vx1018StableHooks) return;
    window.__vx1018StableHooks=true;
    window.api.on('step-started',function(d){
      if(d && d.type==='StableMeasurement'){
        lastRunCompletedTs=0;
        lastStableStepId=d.step_id; window.__vexon10112StableStepId=d.step_id; active={}; hideLegacyStableAction10112('step-started'); showStable(Object.assign({status:'LETTURA LIVE',stable_elapsed_ms:0,timeout_elapsed_ms:0,forceShow:true},d||{}));
      } else if(lastStableStepId){ hideStableSoon(80); }
    });
    window.api.on('step-detail',function(d){ if(isStablePayload(d||{})) showStable(d||{}); });
    window.api.on('step-passed',function(d){
      if(lastStableStepId && Number(d&&d.step_id)===Number(lastStableStepId)){
        showStable(Object.assign({},active||{},d||{},{type:'StableMeasurement',status:'OK STABILE',stable_elapsed_ms:(active&&active.stable_required_ms)||0}));
        clearManualFallbackInputsSoon10111('step passato',120);
        hideStableSoon(850);
      }
    });
    window.api.on('step-failed',function(d){
      if(lastStableStepId && Number(d&&d.step_id)===Number(lastStableStepId)){
        hideLegacyStableAction10112('step-failed');
        clearManualFallbackInputsSoon10111('step fallito',120);
        failMode=true; showStable(Object.assign({},active||{},d||{},{type:'StableMeasurement',status:'FAIL'}));
      }
    });
    window.api.on('manual-step-request',function(d){
      lastManualRequestId=(d&&d.requestId)!=null?d.requestId:lastManualRequestId;
      lastManualRequestStepId=(d&&d.step_id)!=null?d.step_id:lastManualRequestStepId;
      if(lastStableStepId){
        hideLegacyStableAction10112('manual-step-request');
        failMode=true; manualMode=true; manualSubmitting=false; manualFocusRequested=true; lastManualValue='';
        var input=field(ensurePopup(),'manualInput'); if(input){ input.value=''; input.removeAttribute('value'); }
        showStable(Object.assign({},active||{},d||{},{type:'StableMeasurement',status:'FAIL / INSERIMENTO MANUALE',forceShow:true}));
      }
    });
    window.api.on('run-completed',function(){ lastRunCompletedTs=Date.now(); clearManualFallbackInputs10111('run completata'); hideStableNow(); });
    window.api.on('state-changed',function(s){ var v=String(s||'').toUpperCase(); if(/READY|IDLE|FAULT|STOP/.test(v)) { lastRunCompletedTs=Date.now(); clearManualFallbackInputs10111('state '+v); hideStableNow(); } });
    if(!window.__vx1019AutoStartTimer){ window.__vx1019AutoStartTimer=setInterval(autoStartLoop1019,150); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install); else install();
  setTimeout(install,500);
  window.__VEXON_ACTION_MEASUREMENT_10112__=VERSION;
  window.__VEXON_ACTION_MEASUREMENT_10111__=VERSION;
  window.__VEXON_ACTION_MEASUREMENT_10110__=VERSION;
  window.__VEXON_ACTION_MEASUREMENT_1019__=VERSION;
  window.__VEXON_ACTION_MEASUREMENT_1018__=VERSION;
})();
