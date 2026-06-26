/* AT-MEC_HM_6.6E_FIX1G - Start Workflow
   Adds F1=START and a non-invasive start gate when SN obbligatorio is enabled.
   Does not change Test Engine, recipe execution, flags or existing Test Mode layout. */
(function(){
  'use strict';
  const VERSION='6.7F_START_POPUP_WO_LOCK';
  const $=(id)=>document.getElementById(id);
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const val=(id)=>String($(id)?.value||'').trim();
  function isProdMode(){return document.body.classList.contains('production-test-active') && !$('login-gate')?.matches(':not(.hidden) body.locked *');}
  function serialRequired(){try{return typeof window.isSerialRequired==='function'?!!window.isSerialRequired():($('serial-required-prod')?.checked!==false);}catch(_e){return $('serial-required-prod')?.checked!==false;}}
  function syncSerial(v){['prod-serial-input','serial-dut','serial-dut-dash'].forEach(id=>{const el=$(id); if(el && el.value!==v) el.value=v;}); try{ if(typeof window.syncSerialInputs==='function') window.syncSerialInputs('prod'); }catch(_e){} }
  function syncLot(v){['prod-lot-number','lot-number','lot-number-dash'].forEach(id=>{const el=$(id); if(el && el.value!==v) el.value=v;}); try{ if(typeof window.setLotNumber==='function') window.setLotNumber(v); else if(typeof window.syncLotNumberInputs==='function') window.syncLotNumberInputs('prod'); }catch(_e){} }
  function lotValue(){return val('prod-lot-number')||val('lot-number-dash')||val('lot-number')||'';}
  function serialValue(){return val('prod-serial-input')||val('serial-dut')||val('serial-dut-dash')||'';}
  function activeWorkOrder(){try{return JSON.parse(localStorage.getItem('atmec_active_work_order')||'null')||null;}catch(_e){return null;}}
  function useWorkOrderMode(){try{return typeof window.getUseWorkOrderMode67B==='function'?!!window.getUseWorkOrderMode67B():localStorage.getItem('atmec67b_use_work_order_mode')!=='false';}catch(_e){return localStorage.getItem('atmec67b_use_work_order_mode')!=='false';}}
  function woLabel(w){if(!w)return ''; return [w.wo||w.id, w.customerText||'', w.productText||'', w.recipe||''].filter(Boolean).join(' · ');}
  function showOperatorWait(text){
    try{
      // FIX1G: attenzione operatore solo nel punto di azione, non nel banner/dashboard generale.
      const b=$('prod-status-banner');
      if(b){
        b.classList.remove('atmec66e-fix1e-operator-wait','operator-wait','waiting');
      }
      const action=$('atmec66d-action-strip');
      if(action){
        action.classList.add('atmec66e-fix1g-action-wait');
        action.setAttribute('data-operator-wait', text || 'IN ATTESA OPERATORE');
      }
    }catch(_e){}
  }
  function clearOperatorWait(){
    try{
      const b=$('prod-status-banner');
      if(b) b.classList.remove('atmec66e-fix1e-operator-wait','operator-wait','waiting');
      const action=$('atmec66d-action-strip');
      if(action){
        action.classList.remove('atmec66e-fix1e-action-wait','atmec66e-fix1g-action-wait');
        action.removeAttribute('data-operator-wait');
      }
    }catch(_e){}
  }
  function startGateModal(){
    return new Promise(resolve=>{
      const old=$('atmec66e-start-gate'); if(old) old.remove();
      const woMode=useWorkOrderMode();
      const awo=activeWorkOrder();
      const lot=woMode ? ((awo && (awo.wo || awo.id)) || '') : (lotValue() || '');
      const serial=serialValue(); const lastNote=localStorage.getItem('atmec_start_operator_note')||'';
      const overlay=document.createElement('div');
      overlay.id='atmec66e-start-gate';
      overlay.className='atmec66e-start-gate-backdrop';
      overlay.innerHTML=`<div class="atmec66e-start-gate-card atmec66e-start-gate-safe" role="dialog" aria-modal="true">
        <div class="atmec66e-start-gate-head"><div><b>▶ AVVIO TEST</b><span class="atmec66e-start-wait-pill">IN ATTESA OPERATORE</span><small>SN obbligatorio attivo: conferma dati produzione</small></div><button type="button" class="btn btn-ghost btn-sm" id="atmec66e-start-cancel-x">✕</button></div>
        <div class="atmec66e-start-wo">${woMode ? (awo ? 'WO ATTIVA: '+esc(woLabel(awo)) : 'WO/COMMESSA ATTIVO: seleziona una WO prima di avviare') : 'MODALITA COMMESSA MANUALE'}</div>
        <div class="atmec66e-start-grid atmec67h-start-grid">
          <label class="atmec67h-start-lot">COMMESSA<input id="atmec66e-start-lot" value="${esc(lot)}" placeholder="${woMode?'Bloccata da WO':'Commessa manuale'}" ${woMode?'readonly':''}></label>
          <label class="atmec67h-start-sn">S/N - INSERISCI O SCANSIONA<input id="atmec66e-start-sn" value="${esc(serial)}" placeholder="SERIAL NUMBER" autocomplete="off"></label>
          <label class="notes">NOTE OPERATORE<textarea id="atmec66e-start-note" placeholder="Note opzionali: campionatura, scheda riparata, verifica engineering...">${esc(lastNote)}</textarea></label>
        </div>
        <div id="atmec66e-start-error" class="atmec66e-start-error"></div>
        <div class="atmec66e-start-actions"><button type="button" class="btn btn-ghost" id="atmec66e-start-cancel">ANNULLA</button><button type="button" class="btn btn-success btn-3d" id="atmec66e-start-ok">START TEST</button></div>
        <div class="hint">Premi INVIO su seriale/note per avviare. ESC annulla.</div>
      </div>`;
      document.body.appendChild(overlay);
      showOperatorWait('IN ATTESA OPERATORE');
      const sn=$('atmec66e-start-sn'), lotEl=$('atmec66e-start-lot'), note=$('atmec66e-start-note'), err=$('atmec66e-start-error');
      const close=(out)=>{try{overlay.remove();}catch(_e){} clearOperatorWait(); resolve(out);};
      const ok=()=>{
        const s=String(sn.value||'').trim(); const l=String(lotEl.value||'').trim(); const n=String(note.value||'').trim();
        if(!s){err.textContent='Serial Number obbligatorio: inserisci o scansiona il seriale.'; sn.focus(); return;}
        if(woMode && !awo){err.textContent='Usa WO/Commessa attivo: seleziona una WO prima di avviare.'; return;}
        if(!l){err.textContent=woMode?'Commessa bloccata: seleziona una WO valida.':'Commessa obbligatoria: inserisci il riferimento produzione.'; if(!woMode) lotEl.focus(); return;}
        syncSerial(s); syncLot(l); window.__atmecStartOperatorNote=n; localStorage.setItem('atmec_start_operator_note',n); try{ if(awo){ localStorage.setItem('atmec_current_work_order', JSON.stringify(Object.assign({}, awo, {startSerial:s,startLot:l,startNote:n,lastStartAt:new Date().toISOString()}))); } }catch(_e){} close({ok:true,serial:s,lot:l,note:n,workOrder:awo});
      };
      $('atmec66e-start-ok').onclick=ok; $('atmec66e-start-cancel').onclick=()=>close({ok:false}); $('atmec66e-start-cancel-x').onclick=()=>close({ok:false});
      overlay.addEventListener('keydown',e=>{ if(e.key==='Escape'){e.preventDefault(); close({ok:false});} },true);
      [sn,lotEl,note].forEach(el=>el&&el.addEventListener('keydown',e=>{ if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); ok();} }));
      if(woMode && lotEl) lotEl.classList.add('atmec67f-wo-locked');
      setTimeout(()=>{sn.focus(); try{sn.select();}catch(_e){}},80);
    });
  }
  function installStartWrapper(){
    if(window.__atmec66eFix1eStartWrapper) return;
    const original=window.startTest;
    if(typeof original!=='function') return;
    window.__atmec66eFix1eStartWrapper=true;
    window.__atmec66eFix1eOriginalStart=original;
    window.startTest=async function(){
      if(serialRequired()){
        const gate=await startGateModal();
        if(!gate||!gate.ok) return;
      }
      return original.apply(this,arguments);
    };
  }
  function installF1(){
    if(window.__atmec66eFix1eF1) return; window.__atmec66eFix1eF1=true;
    document.addEventListener('keydown',function(e){
      if(e.key==='F1'){
        e.preventDefault();
        if(typeof window.startTest==='function') window.startTest();
      }
    },true);
  }
  function watchManualWait(){
    const modal=$('manual-step-modal'); if(!modal||modal.__atmec66eFix1eWait)return; modal.__atmec66eFix1eWait=true;
    const obs=new MutationObserver(()=>{ if(modal.classList.contains('show')) showOperatorWait('IN ATTESA OPERATORE'); else clearOperatorWait(); });
    obs.observe(modal,{attributes:true,attributeFilter:['class']});
  }
  function init(){installStartWrapper(); installF1(); watchManualWait(); setInterval(()=>{installStartWrapper(); watchManualWait();},1500); console.log('[TEST UX 6.7F] Start workflow WO lock inizializzato');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
