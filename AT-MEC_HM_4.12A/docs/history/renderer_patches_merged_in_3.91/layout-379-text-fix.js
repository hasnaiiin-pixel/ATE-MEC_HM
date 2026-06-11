(function(){
  'use strict';
  var KEY='atmec.layout379.texts';
  var targetEl=null;
  var targetId='';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }
  function isEditor(el){ return !!(el && el.closest && (el.closest('#atmec-layout-373-panel') || el.closest('#atmec-inspector-358-bar') || el.closest('#atmec-inspector-358-pop') || el.closest('#atmec-layout-manager-362-panel') || el.id==='atmec-layout-373-panel')); }
  function role(el){ return (el && el.getAttribute && (el.getAttribute('data-atmec-auto-id') || el.getAttribute('data-ui-id') || el.getAttribute('data-layout-id') || el.id)) || ''; }
  function badId(id){ return /atmec-(layout|inspector|apply|text|close|current|status|search|tree|alias|copy|paste|save|refresh|prop|gap|dist|set-ref|clear-ref)/i.test(String(id||'')); }
  function findReal(start){
    if(!start || isEditor(start)) return null;
    if(start.closest){
      return start.closest('button,input,textarea,select,a,[data-atmec-auto-id],[data-ui-id],[data-layout-id],.kpi-card,.dashboard-card,.recipe-step-card,.recipe-step-block,.module-card,.prod-action-btn,.prod-result-cell,.prod-info-cell,.card,.panel,label,span,p,h1,h2,h3,h4,td,th') || start;
    }
    return start;
  }
  function findById(id){
    if(!id) return null;
    var sels=['[data-atmec-auto-id]','[data-ui-id]','[data-layout-id]'];
    for(var si=0;si<sels.length;si++){
      var all=document.querySelectorAll(sels[si]);
      for(var i=0;i<all.length;i++){ if(role(all[i])===id) return all[i]; }
    }
    try{ return document.getElementById(id) || null; }catch(_e){ return null; }
  }
  function txt(el){
    if(!el) return '';
    var tag=(el.tagName||'').toLowerCase();
    if(tag==='input' || tag==='textarea') return el.value || '';
    if(tag==='select') return el.options && el.selectedIndex>=0 ? el.options[el.selectedIndex].text : '';
    return (el.textContent || '').trim();
  }
  function status(msg){ var s=document.getElementById('atmec-status-373'); if(s) s.textContent=msg; try{console.log('[AT-MEC 3.79 TEXT]',msg);}catch(_e){} }
  function setTarget(el){
    if(!el || isEditor(el)) return;
    var id=role(el);
    if(!id || badId(id)) return;
    targetEl=el; targetId=id;
    var c=document.getElementById('atmec-current-373'); if(c) c.textContent=targetId;
    var info=document.getElementById('atmec-target-info-379'); if(info) info.textContent='Target testo: '+targetId;
    var ta=document.getElementById('atmec-text-373'); if(ta && document.activeElement!==ta) ta.value=txt(targetEl);
  }
  function applyValue(el,value){
    var tag=(el.tagName||'').toLowerCase();
    if(tag==='input' || tag==='textarea'){
      el.value=value; el.setAttribute('value',value);
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    }
    if(tag==='select') return false;
    el.textContent=value;
    el.setAttribute('data-atmec-custom-text','1');
    return true;
  }
  function load(){ try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_e){return {};} }
  function save(m){ try{localStorage.setItem(KEY,JSON.stringify(m||{}));}catch(_e){} }
  function applySaved(){
    var m=load();
    Object.keys(m).forEach(function(id){ var el=findById(id); if(el) applyValue(el,String(m[id])); });
  }
  function applyTextDirect(){
    var el=(targetEl && targetEl.isConnected)?targetEl:findById(targetId);
    var ta=document.getElementById('atmec-text-373');
    var value=ta?String(ta.value||''):'';
    if(!el || !targetId || isEditor(el)){ status('Prima clicca un elemento reale, poi modifica il testo'); return false; }
    if(!applyValue(el,value)){ status('Questo tipo elemento non supporta modifica testo'); return false; }
    var m=load(); m[targetId]=value; save(m);
    try{ el.classList.add('atmec-379-target-flash'); setTimeout(function(){el.classList.remove('atmec-379-target-flash');},900); }catch(_e){}
    status('Testo applicato su: '+targetId);
    var c=document.getElementById('atmec-current-373'); if(c) c.textContent=targetId;
    return false;
  }
  function ensurePanel(){
    var panel=document.getElementById('atmec-layout-373-panel'); if(!panel) return;
    if(!document.getElementById('atmec-target-info-379')){
      var d=document.createElement('div'); d.id='atmec-target-info-379'; d.className='atmec-379-target-info'; d.textContent='Target testo: nessuno';
      var b=panel.querySelector('.b373') || panel; b.insertBefore(d,b.firstChild);
    }
    ['atmec-apply-text-373','atmec-apply-text-376'].forEach(function(id){
      var old=document.getElementById(id);
      if(old && !old.getAttribute('data-atmec-379-fixed')){
        var n=old.cloneNode(true); n.textContent='Applica testo al target'; n.setAttribute('data-atmec-379-fixed','1');
        n.onclick=function(e){ if(e){e.preventDefault();e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();} return applyTextDirect(); };
        old.parentNode.replaceChild(n,old);
      }
    });
  }
  ready(function(){
    applySaved();
    setInterval(function(){ ensurePanel(); applySaved(); },700);
    document.addEventListener('mousedown',function(e){ var real=findReal(e.target); if(real) setTarget(real); },true);
    document.addEventListener('click',function(e){
      if(e.target && e.target.closest && e.target.closest('#atmec-apply-text-373,#atmec-apply-text-376')){
        e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); applyTextDirect(); return false;
      }
      var real=findReal(e.target); if(real) setTarget(real);
    },true);
  });
  window.atMecTextEditor379={setTarget:setTarget,apply:applyTextDirect,applySaved:applySaved,current:function(){return targetId;}};
})();
