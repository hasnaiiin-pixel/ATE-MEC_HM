/* AT-MEC_HM 6.6E_FIX1 - Compact Test Mode UI
   Visual-only UX layer: assisted manual measurement, live meter panel, instrument status, session KPI and modern log badges.
   Does not change Test Engine, Repair, SQLite, Repository or Hardware runtime. */
(function(){
  'use strict';
  const VERSION='7.5.1_CLEAN_BASELINE_NO_DUPLICATES_FIX1_STARTUP';
  const $=(id)=>document.getElementById(id);
  const q=(sel,root=document)=>root.querySelector(sel);
  function safe(fn, fallback){ try{return fn();}catch(_e){return fallback;} }
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function parseNum(v){const n=parseFloat(String(v||'').replace(',','.').replace(/[^0-9+\-.]/g,'')); return Number.isFinite(n)?n:null;}
  function txt(id){return String(($(id)?.textContent)||'').trim();}

  function readManualContext(){
    const title=txt('manual-step-title');
    const info=[txt('manual-step-measure-info'), txt('manual-step-limits')].join(' ');
    const stepMatch=title.match(/#(\d+)/); const stepId=stepMatch?stepMatch[1]:'—';
    let min=null,max=null,target=null,tol=null,unit='';
    let m=info.match(/Limiti:\s*(-?\d+(?:[\.,]\d+)?|[-+]∞)\s*[÷-]\s*(-?\d+(?:[\.,]\d+)?|[-+]∞)\s*([^\.\s]*)/i);
    if(m){min=parseNum(m[1]);max=parseNum(m[2]);unit=m[3]||'';}
    m=info.match(/target\s*[:=]?\s*(-?\d+(?:[\.,]\d+)?)/i); if(m) target=parseNum(m[1]);
    m=info.match(/tolleranza\s*[:=]?\s*(?:±|\+\/-)?\s*(-?\d+(?:[\.,]\d+)?)/i); if(m) tol=Math.abs(parseNum(m[1]));
    if((min==null||max==null)&&target!=null&&tol!=null){min=target-tol;max=target+tol;}
    if(target==null && min!=null && max!=null) target=(min+max)/2;
    if(tol==null && min!=null && max!=null) tol=Math.abs(max-min)/2;
    const live=readLiveMeter(unit);
    const name=title.replace(/^.*?—\s*/,'').replace(/#\d+.*/,'').trim() || 'Step manuale';
    return {title,name,stepId,info,min,max,target,tol,unit,live};
  }

  function readLiveMeter(unit){
    const candidates=['prod-live-measure-value','multimeter-live-value','dm-meter-live-value','device-meter-live-value'];
    let val='—';
    for(const id of candidates){ const el=$(id); const t=String(el?.textContent||'').trim(); if(t && t!=='--' && t!=='—'){val=t; break;} }
    const parsed=parseNum(val);
    const ts=txt('prod-live-ts') || new Date().toLocaleTimeString();
    const offline=/--|—|N\/D|offline/i.test(String(val));
    return {text:val, value:parsed, ts, offline, unit:unit||''};
  }

  function fmt(n, unit){ return n==null?'—':(Math.round(n*1000)/1000)+' '+(unit||''); }
  function evalValue(v, ctx){
    if(v==null) return {state:'wait',label:'IN ATTESA',delta:'—',percent:null};
    const ok=(ctx.min==null||v>=ctx.min)&&(ctx.max==null||v<=ctx.max);
    const delta=ctx.target==null?null:v-ctx.target;
    let percent=null;
    if(ctx.min!=null&&ctx.max!=null&&ctx.max!==ctx.min) percent=Math.max(0,Math.min(100,((v-ctx.min)/(ctx.max-ctx.min))*100));
    return {state:ok?'pass':'fail',label:ok?'DENTRO TOLLERANZA':'FUORI TOLLERANZA',delta,percent};
  }

  function ensureAssistedPanel(){
    const input=$('manual-step-value'); if(!input) return null;
    let panel=$('atmec66e-manual-assisted');
    if(!panel){
      panel=document.createElement('div'); panel.id='atmec66e-manual-assisted'; panel.className='atmec66e-manual-assisted';
      const target=q('#manual-step-modal .manual-input-panel');
      (target||input.parentNode).insertAdjacentElement('beforebegin', panel);
    }
    return panel;
  }

  function renderAssistedManual(){
    if(document.body && document.body.classList && document.body.classList.contains('vexon-stable-live-active')) return;
    const panel=ensureAssistedPanel(); const input=$('manual-step-value'); if(!panel||!input) return;
    const ctx=readManualContext(); const current=parseNum(input.value); const ev=evalValue(current,ctx);
    const liveState=ctx.live.offline?'offline':'online';
    const actionText=(txt('manual-step-instructions') || txt('manual-step-alert') || 'Esegui lo step richiesto, poi premi Riprova oppure inserisci la misura manuale.').replace(/\s+/g,' ').trim();
    const inputPanel=q('#manual-step-modal .manual-input-panel');
    ['atmec67e-measure-pass','atmec67e-measure-fail','atmec67e-measure-wait'].forEach(c=>{input.classList.remove(c); inputPanel?.classList.remove(c);});
    input.classList.add('atmec67e-measure-'+ev.state);
    inputPanel?.classList.add('atmec67e-measure-'+ev.state);
    panel.innerHTML=`
      <div class="atmec66e-assisted-head">
        <div><b>STEP #${esc(ctx.stepId)}</b><span>${esc(ctx.name)}</span></div>
        <span class="atmec66e-badge ${liveState}">${ctx.live.offline?'STRUMENTO OFFLINE':'STRUMENTO LIVE'}</span>
      </div>
      <div class="atmec67e-operator-action"><label>Cosa deve fare</label><strong>${esc(actionText)}</strong></div>
      <div class="atmec66e-range-wrap ${ev.state}">
        <div class="atmec67e-eval-head"><label>Valutazione misura</label><b>${esc(ev.label)}</b></div>
        <div class="atmec66e-range-labels"><span>Min ${esc(fmt(ctx.min,ctx.unit))}</span><b>Target ${esc(fmt(ctx.target,ctx.unit))}</b><span>Max ${esc(fmt(ctx.max,ctx.unit))}</span></div>
        <div class="atmec66e-range"><div class="atmec66e-range-ok"></div><div class="atmec66e-range-mid"></div><div class="atmec66e-pointer" style="left:${ev.percent==null?50:ev.percent}%"></div></div>
        <div class="atmec66e-result ${ev.state}"><b>${ev.state==='pass'?'DENTRO PARAMETRO':ev.state==='fail'?'FUORI RANGE':'IN ATTESA MISURA'}</b><span>${current==null?'Inserisci un valore per verificare.':'Scostamento: '+esc(ev.delta==null?'—':fmt(ev.delta,ctx.unit))}</span></div>
      </div>`;
  }

  function hookManualInput(){
    const input=$('manual-step-value'); if(!input||input.__atmec66e)return; input.__atmec66e=true;
    try{input.type='text';}catch(_e){}
    input.removeAttribute('pattern');
    input.setAttribute('inputmode','decimal');
    input.autocomplete='off';
    input.addEventListener('input',renderAssistedManual); input.addEventListener('change',renderAssistedManual);
    input.addEventListener('keydown',function(ev){
      if(ev.key==='Enter'){ ev.preventDefault(); const btn=document.getElementById('manual-step-value-btn'); if(btn) btn.click(); else if(typeof window.respondManualValueOnly==='function') window.respondManualValueOnly(); }
    });
  }

  function enhanceManualModal(){
    if(document.body && document.body.classList && document.body.classList.contains('vexon-stable-live-active')) return;
    const modal=$('manual-step-modal'); if(!modal) return;
    modal.classList.add('atmec66e-modern-modal');
    try{
      const a=$('manual-step-acquire-btn'); if(a) a.innerHTML='Riprova';
      const m=$('manual-step-value-btn'); if(m) m.innerHTML='Misura manuale';
      const alert=$('manual-step-alert'); if(alert) alert.textContent=String(alert.textContent||'MISURA NON DISPONIBILE').toUpperCase().replace('MISURA STEP','MISURA MANUALE');
    }catch(_e){}

    hookManualInput(); renderAssistedManual();
    clearInterval(window.__atmec66eManualLiveTimer);
    window.__atmec66eManualLiveTimer=setInterval(()=>{ if($('manual-step-modal')?.classList.contains('show')) renderAssistedManual(); else clearInterval(window.__atmec66eManualLiveTimer); }, 900);
  }

  function watchManualModal(){
    const modal=$('manual-step-modal'); if(!modal||modal.__atmec66eWatch)return; modal.__atmec66eWatch=true;
    const obs=new MutationObserver(()=>{ if(modal.classList.contains('show')) setTimeout(enhanceManualModal,40); });
    obs.observe(modal,{attributes:true,attributeFilter:['class']});
  }

  function ensureInstrumentBar(){
    // AT-MEC_HM 9.5.2: the top device-state strip is intentionally disabled.
    // Device status remains available in the dedicated Strumenti/Device Manager card, not in the operator WO/SN header.
    try{ const old=$('atmec66e-instrument-bar'); if(old) old.remove(); }catch(_e){}
    return;
  }
  function updateInstrumentBar(){
    ensureInstrumentBar();
    const bar=$('atmec66e-instrument-bar'); if(!bar) return;
    const text=document.body.innerText || '';
    Array.from(bar.children).forEach(card=>{
      const name=card.dataset.name||''; let ok=true;
      if(name==='Multimetro') ok=!/multimetro\s*(offline|errore|fallita|non risponde)/i.test(text);
      if(name==='PL303') ok=!/PL303\s*(offline|errore)/i.test(text);
      if(name==='ESP32') ok=!/ESP32\s*(offline|errore|disconnect)/i.test(text);
      card.classList.toggle('bad',!ok); card.querySelector('.dot').className='dot '+(ok?'ok':'bad'); card.querySelector('small').textContent=ok?'OK':'CHECK';
    });
  }

  const session={pass:0,fail:0,total:0,start:Date.now()};
  function ensureSessionKpi(){
    const root=$('production-test-mode'); if(!root || $('atmec66e-session-kpi')) return;
    const k=document.createElement('div'); k.id='atmec66e-session-kpi'; k.className='atmec66e-session-kpi';
    k.innerHTML='<div class="atmec66e-session-card"><b id="atmec66e-kpi-pass">0</b><span>PASS sessione</span></div><div class="atmec66e-session-card"><b id="atmec66e-kpi-fail">0</b><span>FAIL sessione</span></div><div class="atmec66e-session-card"><b id="atmec66e-kpi-yield">0%</b><span>Yield</span></div><div class="atmec66e-session-card"><b id="atmec66e-kpi-time">00:00</b><span>Tempo sessione</span></div><div class="atmec67j-wo-summary"><span class="atmec67j-wo-summary-title">Riepilogo WO</span><button class="btn btn-ghost btn-sm" id="atmec67g-wo-stats-btn" onclick="openWorkOrderStats67G()" disabled>Statistiche</button><span id="atmec67g-wo-kpi-chip" class="prod-op-chip atmec67i-wo-kpi free"><span class="wo-mini total"><small>TOT</small><b>--</b></span><span class="wo-mini pass"><small>PASS</small><b>--</b></span><span class="wo-mini fail"><small>FAIL</small><b>--</b></span><span class="wo-mini left"><small>RES</small><b>--</b></span></span></div>';
    q('.prod-test-body .prod-panel')?.insertAdjacentElement('afterbegin',k);
  }
  function refreshSessionKpi(){
    ensureSessionKpi();
    const p=parseInt(txt('prod-kpi-pass'))||session.pass; const f=parseInt(txt('prod-kpi-fail'))||session.fail; const t=p+f;
    $('atmec66e-kpi-pass') && ($('atmec66e-kpi-pass').textContent=p);
    $('atmec66e-kpi-fail') && ($('atmec66e-kpi-fail').textContent=f);
    $('atmec66e-kpi-yield') && ($('atmec66e-kpi-yield').textContent=t?Math.round((p/t)*100)+'%':'0%');
    const elapsed=Math.floor((Date.now()-session.start)/1000); const mm=String(Math.floor(elapsed/60)).padStart(2,'0'), ss=String(elapsed%60).padStart(2,'0');
    $('atmec66e-kpi-time') && ($('atmec66e-kpi-time').textContent=mm+':'+ss);
  }

  function modernizeStepCard(){
    const card=q('.prod-current-step'); if(!card||card.__atmec66e)return; card.__atmec66e=true; card.classList.add('atmec66e-step-card-pro');
    const head=document.createElement('div'); head.className='atmec66e-step-card-head'; head.innerHTML='<span>STEP ATTUALE</span><b id="atmec66e-step-status">LIVE</b>';
    card.insertAdjacentElement('afterbegin',head);
  }
  function updateStepStatus(){
    const banner=txt('prod-status-banner').toUpperCase(); const s=$('atmec66e-step-status'); if(!s)return;
    const val=/FAIL/.test(banner)?'FAIL':/PASS/.test(banner)?'PASS':/RUN|ESECU/.test(banner)?'RUN':'LIVE';
    s.textContent=val; s.className=val.toLowerCase();
  }

  function enhanceLog(){
    const log=$('prod-sequence-log'); if(!log) return;
    Array.from(log.children||[]).forEach(row=>{
      if(row.__atmec66e)return; row.__atmec66e=true; const t=row.textContent||'';
      let cls='info', label='INFO';
      if(/PASS/i.test(t)){cls='pass';label='PASS';}
      else if(/FAIL/i.test(t)){cls='fail';label='FAIL';}
      else if(/RETEST/i.test(t)){cls='retest';label='RETEST';}
      else if(/MANUALE|manual/i.test(t)){cls='manual';label='MANUALE';}
      row.classList.add('atmec66e-log-row',cls);
      if(!row.classList.contains('prod-seq-row')){
        const badge=document.createElement('span'); badge.className='atmec66e-log-badge '+cls; badge.textContent=label;
        row.insertAdjacentElement('afterbegin',badge);
      }
    });
  }
  function watchLog(){
    const log=$('prod-sequence-log'); if(!log||log.__atmec66eWatch)return; log.__atmec66eWatch=true;
    new MutationObserver(()=>enhanceLog()).observe(log,{childList:true,subtree:false});
  }


  async function populateActiveLoginUsers(force=false){
    const el=$('op-name'); if(!el || el.tagName!=='SELECT') return;
    if(el.__atmec66eUsers && !force) return; el.__atmec66eUsers=true;
    let users=[];
    try{
      if(window.api && typeof api.listLoginUsers==='function'){
        const raw=await api.listLoginUsers();
        users=Array.isArray(raw)?raw:[];
      }
    }catch(_e){}
    // Fallback 10.0.1: il login deve mostrare sempre gli utenti production iniziali anche prima del login Admin.
    const fallback=[{username:'Admin',displayName:'Admin',role:'Admin'},{username:'Tecnico',displayName:'Tecnico',role:'Tecnico'}];
    const base=(users&&users.length?users:fallback).filter(u=>u && u.enabled!==false);
    const seen=new Set();
    const list=[];
    [...base, ...fallback].forEach(u=>{
      const key=String(u.username||u.displayName||u||'').toLowerCase();
      if(!key || seen.has(key)) return;
      seen.add(key); list.push(u);
    });
    const prev=el.value;
    el.innerHTML=list.map(u=>{
      const value=esc(u.username||u.displayName||u);
      const role=u.role?` — ${esc(u.role)}`:'';
      return `<option value="${value}">${esc(u.displayName||u.username||u)}${role}</option>`;
    }).join('');
    if(prev && Array.from(el.options).some(o=>o.value===prev)) el.value=prev;
    else if(Array.from(el.options).some(o=>o.value==='Admin')) el.value='Admin';
  }

  function init(){
    try{document.body.classList.add('atmec66e-modern-testmode');}catch(_e){}
    watchManualModal(); ensureInstrumentBar(); ensureSessionKpi(); modernizeStepCard(); watchLog(); enhanceLog(); populateActiveLoginUsers();
    setInterval(()=>{updateInstrumentBar(); refreshSessionKpi(); updateStepStatus(); enhanceLog();},1200);
    window.populateActiveLoginUsers1001 = populateActiveLoginUsers;
    console.log('[TEST UX 10.0.1] Login users visible fix inizializzato');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
