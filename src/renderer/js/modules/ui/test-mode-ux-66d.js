/* AT-MEC_HM 6.6D - Test Mode UX Preview
   Safe non-invasive visual layer: manual measurement side panel, tolerance live preview and retest badge protection. */
(function(){
  'use strict';
  const VERSION='6.6D_TEST_MODE_UX_PREVIEW';
  const $=(id)=>document.getElementById(id);
  function log(msg,data){try{console.log('[TEST UX 6.6D]',msg,data||'');}catch(_e){}}
  function text(el){return String((el&&el.textContent)||'');}
  function stableLiveActive66d(){return !!(document.body&&document.body.classList&&document.body.classList.contains('vexon-stable-live-active'));}
  function unifiedStablePopupVisible10112(){const p=$('vx1018-live-popup'); return stableLiveActive66d() || !!(p && p.style.display!=='none');}
  function parseNum(v){const n=parseFloat(String(v||'').replace(',','.').replace(/[^0-9+\-.]/g,'')); return Number.isFinite(n)?n:null;}
  function readLimits(){
    const info=[text($('manual-step-measure-info')),text($('manual-step-limits'))].join(' ');
    let min=null,max=null,target=null,tol=null;
    let m=info.match(/min\s*[:=]?\s*(-?\d+(?:[\.,]\d+)?)/i); if(m)min=parseNum(m[1]);
    m=info.match(/max\s*[:=]?\s*(-?\d+(?:[\.,]\d+)?)/i); if(m)max=parseNum(m[1]);
    m=info.match(/target\s*[:=]?\s*(-?\d+(?:[\.,]\d+)?)/i); if(m)target=parseNum(m[1]);
    m=info.match(/tolleranza\s*[:=]?\s*(?:±|\+\/\-)?\s*(-?\d+(?:[\.,]\d+)?)/i); if(m)tol=Math.abs(parseNum(m[1]));
    if((min==null||max==null)&&target!=null&&tol!=null){min=target-tol;max=target+tol;}
    return {min,max,target,tol,raw:info};
  }
  function ensureToleranceCard(){
    const input=$('manual-step-value'); if(!input)return null;
    let card=$('atmec66d-tolerance-card');
    if(!card){
      card=document.createElement('div'); card.id='atmec66d-tolerance-card'; card.className='atmec66d-tolerance-card wait';
      card.innerHTML='<div><strong>Valutazione misura</strong><br><span>Inserisci un valore per verificare la tolleranza.</span></div><b>IN ATTESA</b>';
      input.insertAdjacentElement('afterend',card);
    }
    return card;
  }
  function updateTolerance(){
    if(stableLiveActive66d()) return;
    const input=$('manual-step-value'); const card=ensureToleranceCard(); if(!input||!card)return;
    const v=parseNum(input.value); const lim=readLimits();
    if(v==null){card.className='atmec66d-tolerance-card wait'; card.innerHTML='<div><strong>Valutazione misura</strong><br><span>Inserisci un valore per verificare la tolleranza.</span></div><b>IN ATTESA</b>'; return;}
    let ok=true, label='VALORE REGISTRATO', detail='Limiti non rilevati: il sistema applicherà le regole dello step.';
    if(lim.min!=null||lim.max!=null){ok=(lim.min==null||v>=lim.min)&&(lim.max==null||v<=lim.max); label=ok?'DENTRO TOLLERANZA':'FUORI TOLLERANZA'; detail='Valore '+v+(lim.min!=null?' · Min '+lim.min:'')+(lim.max!=null?' · Max '+lim.max:'');}
    card.className='atmec66d-tolerance-card '+(ok?'pass':'fail');
    card.innerHTML='<div><strong>'+(ok?'🟢 ':'🔴 ')+label+'</strong><br><span>'+detail+'</span></div><b>'+String(v)+'</b>';
  }
  function installInputHook(){
    const input=$('manual-step-value'); if(!input||input.__atmec66d)return; input.__atmec66d=true;
    input.addEventListener('input',updateTolerance); input.addEventListener('change',updateTolerance);
  }
  function decorateManualPanel(){
    if(unifiedStablePopupVisible10112()) return;
    const modal=$('manual-step-modal'); if(!modal)return;
    modal.classList.add('atmec66d-side-action-panel');
    installInputHook(); ensureToleranceCard(); updateTolerance();
    const alert=$('manual-step-alert');
    if(alert && !alert.__atmec66d){ alert.__atmec66d=true; const note=document.createElement('div'); note.className='atmec66d-no-layout-shift-note'; note.textContent='Pannello laterale: non modifica il layout Test Mode e non sposta il campo seriale.'; alert.insertAdjacentElement('afterend',note); }
    const title=$('manual-step-title');
    const fallback=/fallita|multimetro|offline|non risponde/i.test([text(title),text(alert)].join(' '));
    window.atmec66dShowActionHint(fallback?'Multimetro / Misura manuale':'Step manuale','Azione richiesta: usa Riprova, Reconnect/strumento o misura manuale senza uscire dal Test Mode.');
  }
  window.atmec66dShowActionHint=function(title,msg){
    try{
      if(unifiedStablePopupVisible10112()) return;
      let wrap=$('atmec66d-action-strip'); if(!wrap){wrap=document.createElement('div'); wrap.id='atmec66d-action-strip'; wrap.className='atmec66d-action-strip'; document.body.appendChild(wrap);} 
      wrap.innerHTML='<div class="atmec66d-action-strip-card"><h4>⚠ '+String(title||'Azione richiesta')+'</h4><p>'+String(msg||'')+'</p></div>';
      clearTimeout(window.__atmec66dHintTimer); window.__atmec66dHintTimer=setTimeout(()=>{try{wrap.remove();}catch(_e){}},3600);
    }catch(_e){}
  };
  function installObserver(){
    const modal=$('manual-step-modal'); if(!modal)return;
    if(modal.__atmec66dObserved)return; modal.__atmec66dObserved=true;
    const obs=new MutationObserver(()=>{ if(modal.classList.contains('show')) setTimeout(decorateManualPanel,30); });
    obs.observe(modal,{attributes:true,attributeFilter:['class']});
  }
  function protectRetestBadges(){
    try{
      const cssId='atmec66d-runtime-badge-protect'; if($(cssId))return;
      const s=document.createElement('style'); s.id=cssId; s.textContent='#repair65c7-testmode-ticket-badge{position:fixed!important;right:20px!important;bottom:22px!important;left:auto!important;top:auto!important;z-index:2147482500!important}'; document.head.appendChild(s);
    }catch(_e){}
  }
  function init(){installObserver(); installInputHook(); protectRetestBadges(); log('inizializzato');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
