(function(){
  'use strict';
  var TEXT_KEY='atmec.layout377.texts';
  var stableTargetId='';
  function isEditorUi(el){ return !!(el && el.closest && (el.closest('#atmec-layout-373-panel') || el.closest('#atmec-inspector-358-bar') || el.closest('#atmec-inspector-358-pop') || el.closest('#atmec-layout-manager-362-panel') || el.classList.contains('atmec-layout-handle-358'))); }
  function cleanIdText(t){ t=String(t||'').trim(); if(!t || t==='nessun elemento selezionato') return ''; if(t.indexOf(' — ')>=0) t=t.split(' — ').pop(); return t.trim(); }
  function isEditorId(id){ return /atmec-(layout|inspector|apply|text|close|current|status|search|tree|alias|copy|paste|save|refresh|prop|gap|dist|set-ref|clear-ref)/i.test(String(id||'')); }
  function rememberTargetFromEvent(e){
    try{
      var el=e && e.target;
      if(!el || isEditorUi(el)) return;
      if(el.closest){
        var real=el.closest('button,input,select,textarea,a,[data-atmec-auto-id],[data-ui-id],[data-layout-id],.prod-action-btn,.prod-result-cell,.prod-info-cell,.kpi-card,.recipe-step-card,.recipe-step-block,.module-card,.dashboard-card,.card,.panel');
        if(real && !isEditorUi(real)){
          var id=(real.getAttribute('data-atmec-auto-id')||real.getAttribute('data-ui-id')||real.getAttribute('data-layout-id')||real.id||'').trim();
          if(id && !isEditorId(id)) stableTargetId=id;
        }
      }
    }catch(_e){}
  }
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }
  function qByAttr(name,value){
    if(!value) return null;
    var all=document.querySelectorAll('['+name+']');
    for(var i=0;i<all.length;i++){ if(all[i].getAttribute(name)===value) return all[i]; }
    return null;
  }
  function findElement(id){
    if(!id) return null;
    return qByAttr('data-atmec-auto-id',id) || qByAttr('data-ui-id',id) || qByAttr('data-layout-id',id) || document.getElementById(id) || null;
  }
  function currentId(){
    var id='';
    try{ if(window.atMecLayoutInspector358 && typeof window.atMecLayoutInspector358.current==='function') id=window.atMecLayoutInspector358.current()||''; }catch(_e){}
    id=cleanIdText(id);
    if(id && !isEditorId(id)) { stableTargetId=id; return id; }
    var c=document.getElementById('atmec-current-373');
    id=cleanIdText(c?c.textContent:'');
    if(id && !isEditorId(id)) { stableTargetId=id; return id; }
    return stableTargetId||'';
  }
  function applyTextToElement(el,value){
    if(!el) return false;
    var tag=(el.tagName||'').toLowerCase();
    if(tag==='input' || tag==='textarea'){
      el.value=value;
      el.setAttribute('value',value);
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    }
    if(tag==='select') return false;
    el.textContent=value;
    return true;
  }
  function loadMap(){ try{return JSON.parse(localStorage.getItem(TEXT_KEY)||'{}')||{};}catch(_e){return {};} }
  function saveMap(m){ try{localStorage.setItem(TEXT_KEY,JSON.stringify(m||{}));}catch(_e){} }
  function applySaved(){
    var m=loadMap();
    Object.keys(m).forEach(function(id){ applyTextToElement(findElement(id), String(m[id])); });
  }
  function status(msg){ var s=document.getElementById('atmec-status-373'); if(s) s.textContent=msg||''; try{console.log('[AT-MEC 3.78]',msg);}catch(_e){} }
  function applyText(){
    var id=stableTargetId || currentId();
    id=cleanIdText(id);
    if(isEditorId(id)) id='';
    var el=findElement(id);
    var ta=document.getElementById('atmec-text-373');
    var value=ta?String(ta.value||''):'';
    if(!id || !el || isEditorUi(el)){ status('Nessun elemento reale selezionato'); return; }
    var ok=applyTextToElement(el,value);
    if(!ok){ status('Testo non applicabile a questo tipo elemento'); return; }
    var m=loadMap(); m[id]=value; saveMap(m);
    try{
      var cur=document.getElementById('atmec-current-373'); if(cur) cur.textContent=id;
      el.classList.add('atmec-376-flash'); setTimeout(function(){el.classList.remove('atmec-376-flash');},900);
    }catch(_e){}
    status('Testo applicato: '+id);
  }
  function closeTools(){
    var p=document.getElementById('atmec-layout-373-panel'); if(p) p.style.display='none';
    var pop=document.getElementById('atmec-inspector-358-pop'); if(pop) pop.style.display='none';
  }
  function addButtons(){
    var panel=document.getElementById('atmec-layout-373-panel'); if(!panel || document.getElementById('atmec-apply-text-376')) return;
    panel.addEventListener('mousedown',function(e){ e.stopPropagation(); },true);
    panel.addEventListener('click',function(e){ e.stopPropagation(); },true);
    var old=document.getElementById('atmec-apply-text-373');
    if(old){ old.textContent='Applica testo 3.78'; old.onclick=function(e){ if(e){e.preventDefault();e.stopPropagation();} applyText(); return false; }; }
    var row=document.createElement('div'); row.className='atmec-376-minirow';
    row.innerHTML='<button id="atmec-apply-text-376" type="button" class="primary">Forza testo DOM</button><button id="atmec-close-tools-376" type="button">Chiudi strumenti</button>';
    var body=panel.querySelector('.b373')||panel;
    body.appendChild(row);
    document.getElementById('atmec-apply-text-376').onclick=applyText;
    document.getElementById('atmec-close-tools-376').onclick=closeTools;
  }
  ready(function(){
    applySaved();
    var n=0, timer=setInterval(function(){ addButtons(); applySaved(); if(++n>30) clearInterval(timer); },300);
    document.addEventListener('click',rememberTargetFromEvent,true);
    document.addEventListener('mousedown',rememberTargetFromEvent,true);
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeTools(); },true);
  });
  window.atMecLayoutText376={apply:applyText,applySaved:applySaved,find:findElement,currentId:currentId};
})();
