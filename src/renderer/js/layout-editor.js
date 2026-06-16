/* AT-MEC HM 4.1 - Layout Editor Professional Plus: trasformazioni, griglia, gruppi, livelli assoluti.
   Evoluzione da 4.01 stabile.
   Unifica le vecchie patch JS del Layout Editor mantenendo l'ordine originale di caricamento. */


// ===== layout-inspector-358.js =====
(function(){
  'use strict';
  var STORE_KEY='atmec.layout367.v1';
  var enabled=false, gridOn=false, snapOn=false;
  var selected=null, selectedId='', selectedSet=[];
  var referenceEl=null, referenceId='';
  var dragging=null, popDrag=null, copiedSize=null;
  var layout={}, undoStack=[], redoStack=[];
  var PX_PER_MM=3.7895275591;
  var targetSelector='button,input,select,textarea,a,label,span,p,h1,h2,h3,h4,h5,h6,b,strong,em,small,code,pre,td,th,li,div[class],section[class],article[class],header[class],footer[class],[data-ui-id],[data-layout-id],[data-atmec-auto-id],.prod-action-btn,.prod-result-cell,.prod-info-cell,.kpi-card,.dashboard-card,.recipe-step-card,.recipe-step-block,.module-card,.card,.panel,.log-list,.step-log,.test-result,.result-card,.result-box,.section-title,.metric-card,.status-card,.dashboard-start-row,.dashboard-actions,.prod-kpis,.prod-test-header,.prod-test-body,.instrument-card,.tools-card,.run-card,.test-card,.status-panel,.result-panel';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  function skipUi(el){ return !!(el && el.closest && (el.closest('#atmec-inspector-358-bar') || el.closest('#atmec-inspector-358-pop') || el.closest('#atmec-layout-373-panel') || el.closest('#atmec-layout-manager-362-panel') || el.classList.contains('atmec-layout-handle-358') || el.id==='atmec-inspector-358-grid')); }
  function isLoginArea(el){ return !!(el && el.closest && el.closest('#login-gate')); }
  function textOf(el){ return String((el && (el.innerText||el.textContent||el.value||el.placeholder||el.id||el.name))||'').replace(/\s+/g,' ').trim().slice(0,42); }
  function slug(s){ return String(s||'element').toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'').slice(0,52) || 'element'; }
  function pageName(el){ var p=el.closest('[id$="-tab"], .page, section, main, #login-gate, #app-shell, body'); if(!p) return 'page.unknown'; if(p.id) return 'page.'+slug(p.id); var cls=String(p.className||'').split(/\s+/).filter(Boolean)[0]||p.tagName; return 'page.'+slug(cls); }
  function stableDomPath(el){
    try{
      var parts=[], cur=el, stop=el && el.closest && el.closest('[id$="-tab"], .page, section, main, #login-gate, #app-shell');
      while(cur && cur!==document.body && cur!==document.documentElement && cur!==stop){
        var tag=(cur.tagName||'el').toLowerCase();
        var parent=cur.parentElement;
        if(!parent){ parts.unshift(tag); break; }
        var same=Array.prototype.filter.call(parent.children,function(x){ return (x.tagName||'').toLowerCase()===tag; });
        var idx=Math.max(1,same.indexOf(cur)+1);
        parts.unshift(tag+':'+idx);
        cur=parent;
      }
      return parts.join('.');
    }catch(_e){ return ''; }
  }
  function baseRole(el){
    if(el.dataset && el.dataset.layoutId) return 'layout.'+slug(el.dataset.layoutId);
    if(el.dataset && el.dataset.uiId) return 'ui.'+slug(el.dataset.uiId);
    if(el.id) return '#'+el.id;
    var tag=(el.tagName||'el').toLowerCase();
    if(el.name) return tag+'[name='+slug(el.name)+']';
    if(el.placeholder) return tag+'[ph='+slug(el.placeholder)+']';
    if(el.getAttribute && el.getAttribute('aria-label')) return tag+'[aria='+slug(el.getAttribute('aria-label'))+']';
    if(el.classList && el.classList.length) return tag+'.'+Array.from(el.classList).filter(function(c){return !/^atmec[-_]/i.test(c) && !/^selected$/i.test(c) && !/^active$/i.test(c);}).slice(0,2).map(slug).filter(Boolean).join('.');
    return tag+'[path='+slug(stableDomPath(el)||tag)+']';
  }
  function ensureAutoIds(){
    var counts={};
    Array.prototype.forEach.call(document.querySelectorAll(targetSelector),function(el){
      if(skipUi(el)) return;
      var root=pageName(el)+'.'+baseRole(el);
      counts[root]=(counts[root]||0)+1;
      var suffix=(counts[root]>1?'.'+counts[root]:'');
      try{ el.dataset.atmecAutoId=root+suffix; }catch(_e){}
    });
  }
  function roleName(el){ return (el && el.dataset && (el.dataset.layoutId || el.dataset.uiId || el.dataset.atmecAutoId)) || 'element.unknown'; }

  function esc(v){ return String(v||'').replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }
  function n(v,d){ v=Number(v); return isFinite(v)?v:d; }
  function gridSize(){ var s=document.getElementById('atmec-grid-size-358'); return n(s&&s.value,20)||20; }
  function snap(v){ if(!snapOn) return Math.round(v); var g=gridSize(); return Math.round(v/g)*g; }
  function pxToMm(px){ return Math.round((Number(px)||0)/PX_PER_MM*10)/10; }
  function mmToPx(mm){ return Math.round((Number(mm)||0)*PX_PER_MM); }
  function loadLayout(){ try{ layout=JSON.parse(localStorage.getItem(STORE_KEY)||'{}')||{}; }catch(_e){ layout={}; } }
  function saveLayout(){ 
    try{ 
      localStorage.setItem(STORE_KEY,JSON.stringify(layout)); 
      localStorage.setItem(STORE_KEY+'.savedAt',new Date().toISOString());
    }catch(_e){} 
  }
  function persistAndApplyLayout412LF(msg){
    try{ saveLayout(); applyAll(); updateHandles(); if(msg) popStatus(msg); }catch(_e){ saveLayout(); }
  }
  function item(id){ layout[id]=layout[id]||{tx:0,ty:0}; return layout[id]; }
  function isLocked(el,id){ try{ var it=layout[id||roleName(el)]||{}; return !!(it.locked || (el&&el.classList&&el.classList.contains('atmec-layout-locked-398'))); }catch(_e){ return false; } }
  function unlockedTargets(arr){ return (arr||[]).filter(function(x){ return x && x.el && x.id && !isLocked(x.el,x.id); }); }
  function lockTargets(lock){ var arr=targetsForApply(); if(!arr.length) return popStatus('Nessun elemento selezionato'); pushUndo(); arr.forEach(function(x){ var it=item(x.id); it.locked=!!lock; if(x.el){ x.el.classList.toggle('atmec-layout-locked-398',!!lock); } }); saveLayout(); mark(); updateBar(); openPop(selected,null); popStatus((lock?'Bloccati ':'Sbloccati ')+arr.length+' elemento/i'); }
  var copiedStyle398=null;
  function cssVal(el,k){ try{return window.getComputedStyle(el).getPropertyValue(k)||'';}catch(_e){return '';} }
  function copyStyle398(){ if(!selected) return popStatus('Nessun elemento selezionato'); var keys=['background-color','color','border-color','border-radius','font-size','font-weight','font-family','box-shadow','padding','margin']; copiedStyle398={}; keys.forEach(function(k){copiedStyle398[k]=cssVal(selected,k);}); popStatus('Stile copiato'); }
  function pasteStyle398(){ if(!copiedStyle398) return popStatus('Prima copia uno stile'); var arr=unlockedTargets(targetsForApply()); if(!arr.length) return popStatus('Nessun elemento modificabile selezionato'); pushUndo(); arr.forEach(function(x){ Object.keys(copiedStyle398).forEach(function(k){ if(copiedStyle398[k]) x.el.style.setProperty(k,copiedStyle398[k],'important'); }); }); saveLayout(); popStatus('Stile incollato su '+arr.length+' elemento/i'); }
  function currentZ398(el,id){
    var it=layout[id]||{};
    var z=n(it.z,NaN);
    if(isFinite(z)) return z;
    try{
      var cs=window.getComputedStyle(el);
      z=Number(cs && cs.zIndex);
      if(isFinite(z)) return z;
    }catch(_e){}
    return 0;
  }
  function forceLayerReady398(el,z){
    if(!el) return;
    try{
      var cs=window.getComputedStyle(el);
      if(!cs || cs.position==='static') el.style.setProperty('position','relative','important');
      el.style.setProperty('z-index',String(z),'important');
      el.style.setProperty('isolation','auto','important');
    }catch(_e){
      try{ el.style.setProperty('position','relative','important'); el.style.setProperty('z-index',String(z),'important'); }catch(__e){}
    }
  }
  function setLayer398(delta){
    var arr=unlockedTargets(targetsForApply());
    if(!arr.length) return popStatus('Nessun elemento modificabile selezionato');
    pushUndo();
    arr.forEach(function(x){
      var it=item(x.id);
      var base=currentZ398(x.el,x.id);
      var step=10;
      it.z=Math.max(0,base+(delta>0?step:-step));
      it.layered=true;
      forceLayerReady398(x.el,it.z);
      applyItem(x.el,x.id);
    });
    saveLayout();
    popStatus((delta>0?'Portato avanti':'Portato dietro')+' '+arr.length+' elemento/i');
  }

  function pushUndo(){ try{ undoStack.push(JSON.stringify(layout)); if(undoStack.length>50) undoStack.shift(); redoStack=[]; }catch(_e){} }
  function restore(t){ try{ layout=JSON.parse(t||'{}')||{}; saveLayout(); applyAll(); updateHandles(); if(selected) openPop(selected,null); }catch(_e){} }
  function undo(){ if(!undoStack.length) return; try{ redoStack.push(JSON.stringify(layout)); restore(undoStack.pop()); }catch(_e){} }
  function redo(){ if(!redoStack.length) return; try{ undoStack.push(JSON.stringify(layout)); restore(redoStack.pop()); }catch(_e){} }
  function isolateSingleElement(el){
    if(!el) return;
    el.style.setProperty('box-sizing','border-box','important');
    el.style.setProperty('flex','0 0 auto','important');
    el.style.setProperty('align-self','flex-start','important');
    if((el.tagName||'').toLowerCase()==='button'){
      el.style.setProperty('display','inline-flex','important');
      el.style.setProperty('align-items','center','important');
      el.style.setProperty('justify-content','center','important');
      el.style.setProperty('white-space','nowrap','important');
    }
  }
  function resetElement(el){ if(!el) return; ['transform','width','height','min-width','max-width','min-height','max-height','flex','align-self','z-index','font-size','font-family','font-weight','font-style','text-decoration','color','text-align','background','border','border-style','border-width','border-color','border-radius','opacity','box-shadow','text-shadow','padding','letter-spacing'].forEach(function(k){el.style.removeProperty(k);}); }
  function applyItem(el,id){
    var it=layout[id]; if(!el || !it) return;
    try{ el.classList.toggle('atmec-layout-locked-398',!!it.locked); if(it.groupId){el.dataset.atmecGroupId=it.groupId; el.classList.add('atmec-layout-grouped-410');}else{ if(el.dataset) delete el.dataset.atmecGroupId; el.classList.remove('atmec-layout-grouped-410'); } }catch(_e){}
    isolateSingleElement(el);
    var tr='translate('+Math.round(n(it.tx,0))+'px,'+Math.round(n(it.ty,0))+'px)';
    if(it.rotate) tr+=' rotate('+Math.round(n(it.rotate,0))+'deg)';
    if(it.flipX || it.flipY) tr+=' scale('+(it.flipX?-1:1)+','+(it.flipY?-1:1)+')';
    el.style.setProperty('transform',tr,'important');
    if(it.w) { el.style.setProperty('width',Math.round(it.w)+'px','important'); el.style.setProperty('min-width',Math.round(it.w)+'px','important'); el.style.setProperty('max-width',Math.round(it.w)+'px','important'); }
    if(it.h) { el.style.setProperty('height',Math.round(it.h)+'px','important'); el.style.setProperty('min-height',Math.round(it.h)+'px','important'); el.style.setProperty('max-height',Math.round(it.h)+'px','important'); }
    if(it.z || it.layered) { el.style.setProperty('position','relative','important'); el.style.setProperty('z-index',String(n(it.z,0)),'important'); }
    // AT-MEC 4.0 - Layout Editor Professional: testo, font, aspetto, effetti
    if(it.fontSize) el.style.setProperty('font-size', String(it.fontSize).replace(/[^0-9.]/g,'')+'px','important');
    if(it.fontFamily) el.style.setProperty('font-family', String(it.fontFamily),'important');
    if(it.fontWeight) el.style.setProperty('font-weight', String(it.fontWeight),'important');
    if(it.fontStyle) el.style.setProperty('font-style', String(it.fontStyle),'important');
    if(it.textDecoration) el.style.setProperty('text-decoration', String(it.textDecoration),'important');
    if(it.textColor) el.style.setProperty('color', String(it.textColor),'important');
    if(it.textAlign) el.style.setProperty('text-align', String(it.textAlign),'important');
    if(it.bgColor) el.style.setProperty('background', String(it.bgColor),'important');
    if(it.borderColor || it.borderWidth){ el.style.setProperty('border-style','solid','important'); if(it.borderWidth) el.style.setProperty('border-width', String(it.borderWidth).replace(/[^0-9.]/g,'')+'px','important'); if(it.borderColor) el.style.setProperty('border-color', String(it.borderColor),'important'); }
    if(it.borderRadius) el.style.setProperty('border-radius', String(it.borderRadius).replace(/[^0-9.]/g,'')+'px','important');
    if(it.opacity) el.style.setProperty('opacity', String(Math.max(0,Math.min(1,Number(it.opacity)))),'important');
    if(it.boxShadow) el.style.setProperty('box-shadow', String(it.boxShadow),'important');
    if(it.textShadow) el.style.setProperty('text-shadow', String(it.textShadow),'important');
    if(it.padding) el.style.setProperty('padding', String(it.padding).replace(/[^0-9.]/g,'')+'px','important');
    if(it.letterSpacing) el.style.setProperty('letter-spacing', String(it.letterSpacing).replace(/[^0-9.-]/g,'')+'px','important');
    if(it.hidden) el.style.setProperty('display','none','important');
  }
  function applyAll(){ ensureAutoIds(); Array.prototype.forEach.call(document.querySelectorAll(targetSelector),function(el){ if(isLoginArea(el)) return; var id=roleName(el); if(layout[id]) applyItem(el,id); }); }
  function clearSel(){ selectedSet.forEach(function(x){x.el.classList.remove('atmec-layout-selected-366','atmec-layout-multi-366');}); selectedSet=[]; selected=null; selectedId=''; hideHandles(); updateBar(); }
  function mark(){ selectedSet.forEach(function(x){ x.el.classList.remove('atmec-layout-selected-366','atmec-layout-multi-366'); x.el.classList.add(x.el===selected?'atmec-layout-selected-366':'atmec-layout-multi-366'); }); if(referenceEl) referenceEl.classList.add('atmec-layout-ref-367'); }
  function updateBar(){
    var b=document.getElementById('atmec-inspector-358-toggle'); if(b){ b.textContent=enabled?'Layout ON':'Layout OFF'; b.classList.toggle('on',enabled); }
    var c=document.getElementById('atmec-inspector-358-current'); if(c) c.textContent=(selectedId || 'clicca un elemento') + (referenceId?' | Rif: '+referenceId:'');
    var cp=document.getElementById('atmec-inspector-358-copy'); if(cp) cp.disabled=!selectedId;
  }
  function select(el,e){ if(!el || el===document.body || el===document.documentElement) return; ensureAutoIds(); var id=roleName(el); if(e && e.ctrlKey){ var i=selectedSet.findIndex(function(x){return x.el===el;}); if(i>=0) selectedSet.splice(i,1); else selectedSet.push({el:el,id:id}); selected=el; selectedId=id; } else { clearSel(); selectedSet=[{el:el,id:id}]; selected=el; selectedId=id; } mark(); openPop(el,e); hideHandles(); updateBar(); try{console.log('[AT-MEC UI ID]',selectedId,selected);}catch(_e){} }
  function popStatus(msg){ var s=document.getElementById('atmec-pop-status-358'); if(s) s.textContent=msg||''; }
  function targetsForApply(){ return selectedSet.length?selectedSet:(selected?[{el:selected,id:selectedId}]:[]); }
  function getBox(el){ return el.getBoundingClientRect(); }
  function setAbsLeft(el,id,targetLeft){ var r=getBox(el), it=item(id); it.tx=n(it.tx,0)+(snap(targetLeft)-r.left); }
  function setAbsTop(el,id,targetTop){ var r=getBox(el), it=item(id); it.ty=n(it.ty,0)+(snap(targetTop)-r.top); }
  function currentStyleValue(el,prop,fallback){ try{ var v=getComputedStyle(el).getPropertyValue(prop); return (v&&v.trim())||fallback||''; }catch(_e){ return fallback||''; } }
  function rgbToHex(v){ try{ var m=String(v||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i); if(!m) return ''; return '#'+[m[1],m[2],m[3]].map(function(x){x=Math.max(0,Math.min(255,parseInt(x,10)||0)).toString(16);return x.length<2?'0'+x:x;}).join(''); }catch(_e){ return ''; } }

  // AT-MEC 4.1 - Trasformazioni, griglia, gruppi e livelli assoluti
  function applyTransform410(){
    var targets=unlockedTargets(targetsForApply()).filter(function(x){return x.el;});
    if(!targets.length) return popStatus('Nessun elemento modificabile selezionato');
    pushUndo();
    var rotEl=document.getElementById('atmec-rotate-410');
    var rotate=Math.max(-360,Math.min(360,n(rotEl&&rotEl.value,0)));
    targets.forEach(function(t){ var it=item(t.id); it.rotate=rotate; applyItem(t.el,t.id); });
    saveLayout(); updateHandles(); popStatus('Rotazione applicata a '+targets.length+' elemento/i');
  }
  function toggleFlip410(axis){
    var targets=unlockedTargets(targetsForApply()).filter(function(x){return x.el;});
    if(!targets.length) return popStatus('Nessun elemento modificabile selezionato');
    pushUndo();
    targets.forEach(function(t){ var it=item(t.id); if(axis==='x') it.flipX=!it.flipX; else it.flipY=!it.flipY; applyItem(t.el,t.id); });
    saveLayout(); updateHandles(); popStatus((axis==='x'?'Flip X':'Flip Y')+' applicato a '+targets.length+' elemento/i');
  }
  function snapSelection410(){
    var targets=unlockedTargets(targetsForApply()).filter(function(x){return x.el;});
    if(!targets.length) return popStatus('Nessun elemento modificabile selezionato');
    pushUndo(); var g=gridSize();
    targets.forEach(function(t){ var r=t.el.getBoundingClientRect(), it=item(t.id); it.tx=n(it.tx,0)+(Math.round(r.left/g)*g-r.left); it.ty=n(it.ty,0)+(Math.round(r.top/g)*g-r.top); if(it.w) it.w=Math.max(10,Math.round(it.w/g)*g); if(it.h) it.h=Math.max(10,Math.round(it.h/g)*g); applyItem(t.el,t.id); });
    saveLayout(); updateHandles(); popStatus('Snap griglia applicato a '+targets.length+' elemento/i, passo '+g+' px');
  }
  function setLayerAbsolute410(mode){
    var targets=unlockedTargets(targetsForApply()).filter(function(x){return x.el;});
    if(!targets.length) return popStatus('Nessun elemento modificabile selezionato');
    pushUndo();
    var z = mode==='front' ? 9999 : 1;
    targets.forEach(function(t){ var it=item(t.id); it.z=z; it.layered=true; forceLayerReady398(t.el,z); applyItem(t.el,t.id); });
    saveLayout(); popStatus((mode==='front'?'Primo piano assoluto':'Sfondo assoluto')+' applicato a '+targets.length+' elemento/i');
  }
  function groupTargets410(){
    var targets=unlockedTargets(targetsForApply()).filter(function(x){return x.el;});
    if(targets.length<2) return popStatus('Seleziona almeno 2 elementi per raggruppare');
    pushUndo(); var gid='grp_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);
    targets.forEach(function(t){ var it=item(t.id); it.groupId=gid; try{t.el.dataset.atmecGroupId=gid; t.el.classList.add('atmec-layout-grouped-410');}catch(_e){} });
    saveLayout(); mark(); popStatus('Gruppo creato: '+targets.length+' elementi');
  }
  function ungroupTargets410(){
    var targets=unlockedTargets(targetsForApply()).filter(function(x){return x.el;});
    if(!targets.length) return popStatus('Nessun elemento selezionato');
    pushUndo();
    targets.forEach(function(t){ var gid=(item(t.id)||{}).groupId || (t.el.dataset&&t.el.dataset.atmecGroupId); if(!gid) return; Array.prototype.forEach.call(document.querySelectorAll('[data-atmec-group-id="'+gid+'"]'),function(el){ var id=roleName(el), it=item(id); delete it.groupId; try{ delete el.dataset.atmecGroupId; el.classList.remove('atmec-layout-grouped-410'); }catch(_e){} }); });
    saveLayout(); mark(); popStatus('Gruppo separato');
  }
  function selectGroup410(){
    if(!selected) return popStatus('Seleziona un elemento del gruppo');
    var gid=(item(selectedId)||{}).groupId || (selected.dataset&&selected.dataset.atmecGroupId);
    if(!gid) return popStatus('Elemento non raggruppato');
    var els=Array.prototype.slice.call(document.querySelectorAll('[data-atmec-group-id="'+gid+'"]')).filter(isVisibleTarget);
    if(!els.length) return popStatus('Gruppo vuoto');
    selectMany397(els,selected); popStatus('Gruppo selezionato: '+els.length+' elementi');
  }
  function injectProControls400(el){
    try{
      var body=document.querySelector('#atmec-inspector-358-pop .body'); if(!body || document.getElementById('atmec-pro-400')) return;
      var cs=getComputedStyle(el), id=roleName(el), it=item(id);
      var fontSize=parseInt(it.fontSize || cs.fontSize || '14',10)||14;
      var family=String(it.fontFamily || cs.fontFamily || 'Segoe UI').replace(/"/g,'').split(',')[0].trim();
      var tc=it.textColor || rgbToHex(cs.color) || '#111827';
      var bg=it.bgColor || rgbToHex(cs.backgroundColor) || '#ffffff';
      var bc=it.borderColor || rgbToHex(cs.borderColor) || '#d1d5db';
      var bw=parseInt(it.borderWidth || cs.borderWidth || '0',10)||0;
      var br=parseInt(it.borderRadius || cs.borderRadius || '0',10)||0;
      var op=(it.opacity || cs.opacity || '1');
      var pad=parseInt(it.padding || cs.paddingTop || '0',10)||0;
      var ls=parseFloat(it.letterSpacing || cs.letterSpacing || '0')||0;
      var html='';
      html+='<details id="atmec-pro-400" class="atmec-panel-section-401"><summary>✏️ Testo / Font / Effetti 4.1</summary>';
      html+='<div class="grid2">';
      html+='<label>Font size px<input id="atmec-font-size-400" type="number" min="6" max="160" value="'+fontSize+'"></label>';
      html+='<label>Font<select id="atmec-font-family-400"><option>Segoe UI</option><option>Arial</option><option>Roboto</option><option>Tahoma</option><option>Verdana</option><option>Calibri</option><option>Consolas</option><option>Courier New</option><option>Times New Roman</option></select></label>';
      html+='<label>Colore testo<input id="atmec-text-color-400" type="color" value="'+tc+'"></label>';
      html+='<label>Allinea testo<select id="atmec-text-align-400"><option value="">Default</option><option value="left">Sinistra</option><option value="center">Centro</option><option value="right">Destra</option><option value="justify">Giustifica</option></select></label>';
      html+='<label>Sfondo<input id="atmec-bg-color-400" type="color" value="'+bg+'"></label>';
      html+='<label>Opacità<input id="atmec-opacity-400" type="number" min="0" max="1" step="0.05" value="'+op+'"></label>';
      html+='<label>Bordo px<input id="atmec-border-width-400" type="number" min="0" max="30" value="'+bw+'"></label>';
      html+='<label>Colore bordo<input id="atmec-border-color-400" type="color" value="'+bc+'"></label>';
      html+='<label>Radius px<input id="atmec-radius-400" type="number" min="0" max="120" value="'+br+'"></label>';
      html+='<label>Padding px<input id="atmec-padding-400" type="number" min="0" max="80" value="'+pad+'"></label>';
      html+='<label>Spaziatura lettere<input id="atmec-letter-spacing-400" type="number" step="0.5" min="-10" max="30" value="'+ls+'"></label>';
      html+='</div>';
      html+='<div class="actions"><button id="atmec-bold-400" type="button">B</button><button id="atmec-italic-400" type="button"><i>I</i></button><button id="atmec-under-400" type="button"><u>U</u></button><button id="atmec-shadow-400" type="button">Ombra</button><button id="atmec-text-shadow-400" type="button">Ombra testo</button><button class="primary" id="atmec-apply-style-400" type="button">Applica stile 4.0</button><button id="atmec-reset-style-400" type="button">Reset stile</button></div>';
      html+='</details>';
      html+='<details id="atmec-pro-410" class="atmec-panel-section-401"><summary>🔄 Trasformazioni</summary>';
      html+='<div class="grid2"><label>Rotazione °<input id="atmec-rotate-410" type="number" min="-360" max="360" value="'+(parseInt(it.rotate||0,10)||0)+'"></label><label>Passo griglia<select id="atmec-grid-size-pro-410"><option value="5">5px</option><option value="10">10px</option><option value="20">20px</option><option value="50">50px</option></select></label></div>';
      html+='<div class="actions"><button id="atmec-apply-transform-410" type="button">Applica rotazione</button><button id="atmec-flip-x-410" type="button">Flip X</button><button id="atmec-flip-y-410" type="button">Flip Y</button><button id="atmec-snap-now-410" type="button">Snap ora</button><button id="atmec-front-abs-410" type="button">Primo piano</button><button id="atmec-back-abs-410" type="button">Sfondo</button><button id="atmec-group-410" type="button">Raggruppa</button><button id="atmec-select-group-410" type="button">Seleziona gruppo</button><button id="atmec-ungroup-410" type="button">Separa gruppo</button></div>';
      html+='</details>';
      html+='<details id="atmec-pro-420" class="atmec-panel-section-401"><summary>✨ Effetti</summary>';
      html+='<div class="grid2"><label>Opacità<input id="atmec-opacity-420" type="number" min="0" max="1" step="0.05" value="'+op+'"></label><label>Radius px<input id="atmec-radius-420" type="number" min="0" max="120" value="'+br+'"></label><label>Padding px<input id="atmec-padding-420" type="number" min="0" max="80" value="'+pad+'"></label><label>Spaziatura lettere<input id="atmec-letter-spacing-420" type="number" step="0.5" min="-10" max="30" value="'+ls+'"></label></div>';
      html+='<div class="actions"><button id="atmec-apply-effects-420" type="button">Applica effetti</button><button id="atmec-shadow-420" type="button">Ombra box</button><button id="atmec-text-shadow-420" type="button">Ombra testo</button><button id="atmec-reset-effects-420" type="button">Reset effetti</button></div>';
      html+='</details>';
      var wrap=document.createElement('div'); wrap.innerHTML=html;
      var status=document.getElementById('atmec-pop-status-358');
      while(wrap.firstChild){ body.insertBefore(wrap.firstChild,status||null); }
      var ff=document.getElementById('atmec-font-family-400'); if(ff){ Array.prototype.forEach.call(ff.options,function(o){ if(o.text===family) o.selected=true; }); }
      var ta=document.getElementById('atmec-text-align-400'); if(ta){ ta.value=it.textAlign||cs.textAlign||''; }
    }catch(_e){}
  }
  function applyEffects420(){
    var targets=unlockedTargets(targetsForApply()).filter(function(x){return x.el;});
    if(!targets.length) return popStatus('Nessun elemento modificabile selezionato');
    pushUndo();
    var op=document.getElementById('atmec-opacity-420'), br=document.getElementById('atmec-radius-420'), pad=document.getElementById('atmec-padding-420'), ls=document.getElementById('atmec-letter-spacing-420');
    targets.forEach(function(t){ var it=item(t.id);
      if(op) it.opacity=Math.max(0,Math.min(1,n(op.value,1)));
      if(br) it.borderRadius=Math.max(0,n(br.value,0));
      if(pad) it.padding=Math.max(0,n(pad.value,0));
      if(ls) it.letterSpacing=n(ls.value,0);
      applyItem(t.el,t.id);
    });
    saveLayout(); popStatus('Effetti applicati a '+targets.length+' elemento/i');
  }
  function resetEffects420(){
    var targets=unlockedTargets(targetsForApply()).filter(function(x){return x.el;});
    if(!targets.length) return popStatus('Nessun elemento modificabile selezionato');
    pushUndo();
    targets.forEach(function(t){ var it=item(t.id); ['opacity','boxShadow','textShadow','borderRadius','padding','letterSpacing'].forEach(function(k){ delete it[k]; }); applyItem(t.el,t.id); });
    saveLayout(); popStatus('Effetti resettati a '+targets.length+' elemento/i');
  }
  function applyProStyle400(){
    var targets=unlockedTargets(targetsForApply()).filter(function(x){return x.el;});
    if(!targets.length) return popStatus('Nessun elemento modificabile selezionato');
    pushUndo();
    var fs=document.getElementById('atmec-font-size-400'), ff=document.getElementById('atmec-font-family-400'), tc=document.getElementById('atmec-text-color-400'), ta=document.getElementById('atmec-text-align-400');
    var bg=document.getElementById('atmec-bg-color-400'), op=document.getElementById('atmec-opacity-400'), bw=document.getElementById('atmec-border-width-400'), bc=document.getElementById('atmec-border-color-400'), br=document.getElementById('atmec-radius-400'), pad=document.getElementById('atmec-padding-400'), ls=document.getElementById('atmec-letter-spacing-400');
    targets.forEach(function(t){ var it=item(t.id);
      if(fs) it.fontSize=Math.max(6,Math.min(160,n(fs.value,14)));
      if(ff) it.fontFamily=ff.value;
      if(tc) it.textColor=tc.value;
      if(ta) it.textAlign=ta.value;
      if(bg) it.bgColor=bg.value;
      if(op) it.opacity=Math.max(0,Math.min(1,n(op.value,1)));
      if(bw) it.borderWidth=Math.max(0,n(bw.value,0));
      if(bc) it.borderColor=bc.value;
      if(br) it.borderRadius=Math.max(0,n(br.value,0));
      if(pad) it.padding=Math.max(0,n(pad.value,0));
      if(ls) it.letterSpacing=n(ls.value,0);
      applyItem(t.el,t.id);
    });
    saveLayout(); popStatus('Stile 4.0 applicato a '+targets.length+' elemento/i');
  }
  function toggleProStyle400(prop,onVal,offVal){
    var targets=unlockedTargets(targetsForApply()).filter(function(x){return x.el;}); if(!targets.length) return; pushUndo();
    targets.forEach(function(t){ var it=item(t.id); var cur=it[prop] || currentStyleValue(t.el, prop==='fontWeight'?'font-weight':prop==='fontStyle'?'font-style':'text-decoration',''); it[prop]=(String(cur)===String(onVal)?offVal:onVal); applyItem(t.el,t.id); });
    saveLayout(); popStatus('Formato applicato a '+targets.length+' elemento/i');
  }
  function resetProStyle400(){
    var targets=unlockedTargets(targetsForApply()).filter(function(x){return x.el;}); if(!targets.length) return; pushUndo();
    var keys=['fontSize','fontFamily','fontWeight','fontStyle','textDecoration','textColor','textAlign','bgColor','borderColor','borderWidth','borderRadius','opacity','boxShadow','textShadow','padding','letterSpacing','rotate','flipX','flipY'];
    targets.forEach(function(t){ var it=item(t.id); keys.forEach(function(k){ delete it[k]; }); resetElement(t.el); applyItem(t.el,t.id); });
    saveLayout(); popStatus('Stile 4.0 resettato su '+targets.length+' elemento/i');
  }
  function openPop(el,e){
    var pop=document.getElementById('atmec-inspector-358-pop'); if(!pop) return;
    var r=el.getBoundingClientRect(), it=item(roleName(el)); var w=Math.round(it.w||r.width), h=Math.round(it.h||r.height);
    pop.innerHTML='<div class="head"><span>Layout elemento 4.1</span><button id="atmec-pop-close-358" type="button">×</button></div><div class="body"><code>'+esc(roleName(el))+'</code><div class="muted">Giallo = selezionato principale. Azzurro = multi-selezione. Verde = riferimento. Apri solo la sezione che ti serve.</div><details class="atmec-panel-section-401" open><summary>📐 Posizione / Dimensioni</summary><div class="grid2"><label>X px<input id="atmec-prop-x-358" type="number" value="'+Math.round(r.left)+'"></label><label>Y px<input id="atmec-prop-y-358" type="number" value="'+Math.round(r.top)+'"></label><label>W px<input id="atmec-prop-w-358" type="number" value="'+w+'"></label><label>H px<input id="atmec-prop-h-358" type="number" value="'+h+'"></label><label>W mm<input id="atmec-prop-wmm-358" type="number" step="0.1" value="'+pxToMm(w)+'"></label><label>H mm<input id="atmec-prop-hmm-358" type="number" step="0.1" value="'+pxToMm(h)+'"></label></div><div class="actions"><button class="primary" id="atmec-apply-xywh-358" type="button">Applica numeri</button><button id="atmec-show-handles-358" type="button">Mostra handle</button><button id="atmec-copy-size-358" type="button">Copia dim.</button><button id="atmec-paste-size-358" type="button">Incolla dim.</button></div></details><details class="atmec-panel-section-401"><summary>🎯 Allineamento / Distanze</summary><div class="actions"><button id="atmec-set-ref-367" type="button">Imposta riferimento</button><button id="atmec-clear-ref-372" type="button">Cancella riferimento</button><button id="atmec-clear-selected-3933" type="button">Deseleziona tutto</button><button id="atmec-align-left-372" type="button">X sinistra</button><button id="atmec-align-cx-372" type="button">X centro</button><button id="atmec-align-right-372" type="button">X destra</button><button id="atmec-align-top-372" type="button">Y alto</button><button id="atmec-align-cy-372" type="button">Y centro</button><button id="atmec-align-bottom-372" type="button">Y basso</button><button id="atmec-copy-w-ref-367" type="button">W rif.</button><button id="atmec-copy-h-ref-367" type="button">H rif.</button><button id="atmec-copy-wh-ref-367" type="button">W+H rif.</button></div><div class="grid2"><label>Spazio X px<input id="atmec-gap-x-372" type="number" value="20"></label><label>Spazio Y px<input id="atmec-gap-y-372" type="number" value="20"></label></div><div class="actions"><button id="atmec-dist-x-372" type="button">Distribuisci X</button><button id="atmec-dist-y-372" type="button">Distribuisci Y</button></div></details><details class="atmec-panel-section-401"><summary>🧱 Livelli / Blocco / Stile</summary><div class="actions"><button id="atmec-lock-398" type="button">Blocca</button><button id="atmec-unlock-398" type="button">Sblocca</button><button id="atmec-front-398" type="button">Porta avanti</button><button id="atmec-back-398" type="button">Porta dietro</button><button id="atmec-copy-style-398" type="button">Copia stile</button><button id="atmec-paste-style-398" type="button">Incolla stile</button><button id="atmec-save-layout-358" type="button">Salva</button><button class="danger" id="atmec-reset-one-358" type="button">Reset elemento</button><button class="danger" id="atmec-reset-all-358" type="button">Reset tutto</button></div></details><div class="muted" id="atmec-pop-status-358">Riferimento: '+esc(referenceId||'nessuno')+'</div></div>';
    injectProControls400(el);
    if(!pop.dataset.userMoved){ var x=Math.min(window.innerWidth-410,Math.max(8,(e&&e.clientX?e.clientX:r.left)+12)), y=Math.min(window.innerHeight-270,Math.max(44,(e&&e.clientY?e.clientY:r.top)+12)); pop.style.left=x+'px'; pop.style.top=y+'px'; }
    pop.style.display='block'; bindPop();
  }
  function updateInputs(){ if(!selected) return; var r=selected.getBoundingClientRect(), it=item(selectedId); [['x',Math.round(r.left)],['y',Math.round(r.top)],['w',Math.round(it.w||r.width)],['h',Math.round(it.h||r.height)],['wmm',pxToMm(it.w||r.width)],['hmm',pxToMm(it.h||r.height)]].forEach(function(a){var el=document.getElementById('atmec-prop-'+a[0]+'-358'); if(el) el.value=a[1];}); }
  function activeTargetsForSize(){
    var arr=selectedSet.length?selectedSet:(selected?[{el:selected,id:selectedId}]:[]);
    var seen={};
    return arr.filter(function(x){
      if(!x || !x.el || !x.id || !x.el.isConnected) return false;
      if(seen[x.id]) return false; seen[x.id]=1;
      if(isLocked(x.el,x.id)) return false;
      return true;
    });
  }
  function applyNumeric(){
    if(!selected || !selectedId) return;
    pushUndo();
    var r=selected.getBoundingClientRect();
    var last=window.__atmecLastPropInput358||'';
    var x=n(document.getElementById('atmec-prop-x-358')&&document.getElementById('atmec-prop-x-358').value,r.left);
    var y=n(document.getElementById('atmec-prop-y-358')&&document.getElementById('atmec-prop-y-358').value,r.top);
    var w=n(document.getElementById('atmec-prop-w-358')&&document.getElementById('atmec-prop-w-358').value,r.width);
    var h=n(document.getElementById('atmec-prop-h-358')&&document.getElementById('atmec-prop-h-358').value,r.height);
    if(last==='wmm') w=mmToPx(document.getElementById('atmec-prop-wmm-358').value);
    if(last==='hmm') h=mmToPx(document.getElementById('atmec-prop-hmm-358').value);
    w=Math.max(10,snap(w));
    h=Math.max(10,snap(h));
    var targets=activeTargetsForSize();
    if(!targets.length){ popStatus('Elementi bloccati o nessun target modificabile'); return; }
    targets.forEach(function(t){
      var rr=t.el.getBoundingClientRect();
      var it=item(t.id);
      if(t.el===selected){
        it.tx=n(it.tx,0)+(snap(x)-rr.left);
        it.ty=n(it.ty,0)+(snap(y)-rr.top);
      }
      it.w=w;
      it.h=h;
      applyItem(t.el,t.id);
    });
    saveLayout();
    updateInputs();
    updateHandles();
    popStatus('W/H applicati a '+targets.length+' elemento/i. X/Y solo al selezionato principale.');
  }
    function setReference(){ if(!selected) return; if(referenceEl) referenceEl.classList.remove('atmec-layout-ref-367'); referenceEl=selected; referenceId=selectedId; referenceEl.classList.add('atmec-layout-ref-367'); updateBar(); popStatus('Riferimento impostato: '+referenceId); }
  function clearReference(){ if(referenceEl) referenceEl.classList.remove('atmec-layout-ref-367'); referenceEl=null; referenceId=''; updateBar(); popStatus('Riferimento cancellato'); }
  function applyToTargets(fn){ if(!referenceEl){ popStatus('Prima seleziona un elemento e premi Imposta riferimento'); return; } var targets=unlockedTargets(targetsForApply()).filter(function(x){return x.el && x.el!==referenceEl;}); if(!targets.length){ popStatus('Seleziona uno o più elementi da allineare con CTRL+click'); return; } pushUndo(); targets.forEach(function(x){ fn(x.el,x.id); applyItem(x.el,x.id); }); saveLayout(); updateHandles(); if(selected) openPop(selected,null); popStatus('Applicato a '+targets.length+' elementi'); }
  function alignToRef(kind){ if(!referenceEl) return popStatus('Manca riferimento'); var rr=referenceEl.getBoundingClientRect(); applyToTargets(function(el,id){ var r=el.getBoundingClientRect(); if(kind==='left') setAbsLeft(el,id,rr.left); if(kind==='cx') setAbsLeft(el,id,rr.left+rr.width/2-r.width/2); if(kind==='right') setAbsLeft(el,id,rr.right-r.width); if(kind==='top') setAbsTop(el,id,rr.top); if(kind==='cy') setAbsTop(el,id,rr.top+rr.height/2-r.height/2); if(kind==='bottom') setAbsTop(el,id,rr.bottom-r.height); }); }
  function copyRefSize(what){ if(!referenceEl) return popStatus('Manca riferimento'); var rr=referenceEl.getBoundingClientRect(); applyToTargets(function(el,id){ var it=item(id); if(what==='w'||what==='wh') it.w=Math.max(10,Math.round(rr.width)); if(what==='h'||what==='wh') it.h=Math.max(10,Math.round(rr.height)); }); }
  function distribute(axis){ var targets=unlockedTargets(targetsForApply()).filter(function(x){return x.el;}); if(targets.length<2) return popStatus('Seleziona almeno 2 elementi con CTRL+click'); var gap=n(document.getElementById(axis==='x'?'atmec-gap-x-372':'atmec-gap-y-372')&&document.getElementById(axis==='x'?'atmec-gap-x-372':'atmec-gap-y-372').value,20); pushUndo(); var arr=targets.map(function(x){ var r=x.el.getBoundingClientRect(); return {el:x.el,id:x.id,r:r}; }).sort(function(a,b){ return axis==='x' ? a.r.left-b.r.left : a.r.top-b.r.top; }); var pos=axis==='x'?arr[0].r.left:arr[0].r.top; arr.forEach(function(x,i){ if(i>0){ if(axis==='x') setAbsLeft(x.el,x.id,pos); else setAbsTop(x.el,x.id,pos); } applyItem(x.el,x.id); var nr=x.el.getBoundingClientRect(); pos += (axis==='x'?nr.width:nr.height) + gap; }); saveLayout(); updateHandles(); if(selected) openPop(selected,null); popStatus('Distribuiti '+arr.length+' elementi con spazio '+gap+' px'); }
  function bindPop(){
    var c=document.getElementById('atmec-pop-close-358'); if(c) c.onclick=function(){document.getElementById('atmec-inspector-358-pop').style.display='none';};
    var a=document.getElementById('atmec-apply-xywh-358'); if(a) a.onclick=applyNumeric;
    var sh=document.getElementById('atmec-show-handles-358'); if(sh) sh.onclick=updateHandles;
    var sr=document.getElementById('atmec-set-ref-367'); if(sr) sr.onclick=setReference;
    var cr=document.getElementById('atmec-clear-ref-372'); if(cr) cr.onclick=clearReference; var cs3933=document.getElementById('atmec-clear-selected-3933'); if(cs3933) cs3933.onclick=function(){clearSel(); var p=document.getElementById('atmec-inspector-358-pop'); if(p)p.style.display='none';};
    [['atmec-align-left-372','left'],['atmec-align-cx-372','cx'],['atmec-align-right-372','right'],['atmec-align-top-372','top'],['atmec-align-cy-372','cy'],['atmec-align-bottom-372','bottom']].forEach(function(p){var b=document.getElementById(p[0]); if(b)b.onclick=function(){alignToRef(p[1]);};});
    var cw=document.getElementById('atmec-copy-w-ref-367'); if(cw) cw.onclick=function(){copyRefSize('w');}; var ch=document.getElementById('atmec-copy-h-ref-367'); if(ch) ch.onclick=function(){copyRefSize('h');}; var cwh=document.getElementById('atmec-copy-wh-ref-367'); if(cwh) cwh.onclick=function(){copyRefSize('wh');};
    var lb=document.getElementById('atmec-lock-398'); if(lb) lb.onclick=function(){lockTargets(true);}; var ub=document.getElementById('atmec-unlock-398'); if(ub) ub.onclick=function(){lockTargets(false);}; var fr=document.getElementById('atmec-front-398'); if(fr) fr.onclick=function(){setLayer398(1);}; var bk=document.getElementById('atmec-back-398'); if(bk) bk.onclick=function(){setLayer398(-1);};
    var dx=document.getElementById('atmec-dist-x-372'); if(dx) dx.onclick=function(){distribute('x');}; var dy=document.getElementById('atmec-dist-y-372'); if(dy) dy.onclick=function(){distribute('y');};
    var sv=document.getElementById('atmec-save-layout-358'); if(sv) sv.onclick=function(){persistAndApplyLayout412LF('Layout salvato');};
    var svb=document.getElementById('atmec-save-layout-bar-412lf'); if(svb) svb.onclick=function(){persistAndApplyLayout412LF('Layout salvato');};
    var asb=document.getElementById('atmec-autosave-layout-412lf'); if(asb){ var initOn=localStorage.getItem(STORE_KEY+'.autosave')==='1'; asb.textContent='Autosalva '+(initOn?'ON':'OFF'); asb.onclick=function(){ var on=localStorage.getItem(STORE_KEY+'.autosave')==='1'; on=!on; localStorage.setItem(STORE_KEY+'.autosave',on?'1':'0'); asb.textContent='Autosalva '+(on?'ON':'OFF'); popStatus('Autosalva '+(on?'attivo':'disattivo')+'. Consiglio: tienilo OFF durante login/testi.'); }; }
    var rs=document.getElementById('atmec-reset-one-358'); if(rs) rs.onclick=function(){ if(!selectedId)return; pushUndo(); delete layout[selectedId]; resetElement(selected); saveLayout(); updateHandles(); openPop(selected,null);};
    var ra=document.getElementById('atmec-reset-all-358'); if(ra) ra.onclick=function(){layout={};saveLayout();location.reload();};
    var cs=document.getElementById('atmec-copy-size-358'); if(cs) cs.onclick=function(){ if(!selected)return; var r=selected.getBoundingClientRect(), it=item(selectedId); copiedSize={w:n(it.w,r.width),h:n(it.h,r.height)}; popStatus('Dimensioni copiate');};
    var ps=document.getElementById('atmec-paste-size-358'); if(ps) ps.onclick=function(){ if(!selected||!copiedSize)return; pushUndo(); var it=item(selectedId); it.w=copiedSize.w; it.h=copiedSize.h; applyItem(selected,selectedId); saveLayout(); updateInputs(); updateHandles();};
    var cst=document.getElementById('atmec-copy-style-398'); if(cst) cst.onclick=copyStyle398; var pst=document.getElementById('atmec-paste-style-398'); if(pst) pst.onclick=pasteStyle398;
    var ap400=document.getElementById('atmec-apply-style-400'); if(ap400) ap400.onclick=applyProStyle400;
    var rb400=document.getElementById('atmec-reset-style-400'); if(rb400) rb400.onclick=resetProStyle400;
    var bo400=document.getElementById('atmec-bold-400'); if(bo400) bo400.onclick=function(){toggleProStyle400('fontWeight','700','400');};
    var it400=document.getElementById('atmec-italic-400'); if(it400) it400.onclick=function(){toggleProStyle400('fontStyle','italic','normal');};
    var un400=document.getElementById('atmec-under-400'); if(un400) un400.onclick=function(){toggleProStyle400('textDecoration','underline','none');};
    var sh400=document.getElementById('atmec-shadow-400'); if(sh400) sh400.onclick=function(){toggleProStyle400('boxShadow','0 8px 24px rgba(0,0,0,.25)','none');};
    var ts400=document.getElementById('atmec-text-shadow-400'); if(ts400) ts400.onclick=function(){toggleProStyle400('textShadow','0 2px 4px rgba(0,0,0,.35)','none');};
    var ap420=document.getElementById('atmec-apply-effects-420'); if(ap420) ap420.onclick=applyEffects420;
    var sh420=document.getElementById('atmec-shadow-420'); if(sh420) sh420.onclick=function(){toggleProStyle400('boxShadow','0 8px 24px rgba(0,0,0,.25)','none');};
    var ts420=document.getElementById('atmec-text-shadow-420'); if(ts420) ts420.onclick=function(){toggleProStyle400('textShadow','0 2px 4px rgba(0,0,0,.35)','none');};
    var re420=document.getElementById('atmec-reset-effects-420'); if(re420) re420.onclick=resetEffects420;
    var tr410=document.getElementById('atmec-apply-transform-410'); if(tr410) tr410.onclick=applyTransform410;
    var fx410=document.getElementById('atmec-flip-x-410'); if(fx410) fx410.onclick=function(){toggleFlip410('x');};
    var fy410=document.getElementById('atmec-flip-y-410'); if(fy410) fy410.onclick=function(){toggleFlip410('y');};
    var sn410=document.getElementById('atmec-snap-now-410'); if(sn410) sn410.onclick=snapSelection410;
    var fa410=document.getElementById('atmec-front-abs-410'); if(fa410) fa410.onclick=function(){setLayerAbsolute410('front');};
    var ba410=document.getElementById('atmec-back-abs-410'); if(ba410) ba410.onclick=function(){setLayerAbsolute410('back');};
    var gr410=document.getElementById('atmec-group-410'); if(gr410) gr410.onclick=groupTargets410;
    var sg410=document.getElementById('atmec-select-group-410'); if(sg410) sg410.onclick=selectGroup410;
    var ug410=document.getElementById('atmec-ungroup-410'); if(ug410) ug410.onclick=ungroupTargets410;
    var gsp410=document.getElementById('atmec-grid-size-pro-410'); if(gsp410){ gsp410.value=String(gridSize()); gsp410.onchange=function(){ var top=document.getElementById('atmec-grid-size-358'); if(top){ top.value=gsp410.value; top.dispatchEvent(new Event('change')); } }; }
    ['x','y','w','h','wmm','hmm'].forEach(function(k){ var inp=document.getElementById('atmec-prop-'+k+'-358'); if(inp){ inp.oninput=function(){window.__atmecLastPropInput358=k;}; inp.onkeydown=function(e){window.__atmecLastPropInput358=k;if(e.key==='Enter')applyNumeric();}; }});
  }
  function updateHandles(){ var mh=document.getElementById('atmec-move-handle-358'), rh=document.getElementById('atmec-resize-handle-358'); if(!enabled||!selected||!mh||!rh){hideHandles();return;} var r=selected.getBoundingClientRect(); mh.style.display='block'; rh.style.display='flex'; mh.style.left=Math.max(4,Math.min(window.innerWidth-72,r.left))+'px'; mh.style.top=Math.max(40,r.top-32)+'px'; rh.style.left=Math.max(4,Math.min(window.innerWidth-28,r.right-10))+'px'; rh.style.top=Math.max(44,Math.min(window.innerHeight-28,r.bottom-10))+'px'; }
  function hideHandles(){ var mh=document.getElementById('atmec-move-handle-358'), rh=document.getElementById('atmec-resize-handle-358'); if(mh)mh.style.display='none'; if(rh)rh.style.display='none'; }
  function beginDrag(kind,e){ if(!enabled||!selected||!selectedId)return; if(isLocked(selected,selectedId)){ popStatus('Elemento bloccato'); return; } e.preventDefault(); e.stopPropagation(); pushUndo(); var r=selected.getBoundingClientRect(), it=item(selectedId); dragging={kind:kind,sx:e.clientX,sy:e.clientY,tx:n(it.tx,0),ty:n(it.ty,0),w:n(it.w,r.width),h:n(it.h,r.height)}; document.addEventListener('mousemove',onDrag,true); document.addEventListener('mouseup',endDrag,true); }
  function onDrag(e){ if(!dragging||!selected)return; e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation(); var dx=e.clientX-dragging.sx, dy=e.clientY-dragging.sy, it=item(selectedId); if(dragging.kind==='move'){it.tx=snap(dragging.tx+dx);it.ty=snap(dragging.ty+dy);} else {it.w=Math.max(10,snap(dragging.w+dx));it.h=Math.max(10,snap(dragging.h+dy));} applyItem(selected,selectedId); updateInputs(); updateHandles(); }
  function endDrag(){ if(!dragging)return; dragging=null; try{document.body.classList.remove('atmec-layout-dragging-413e-fix1');}catch(_e){} saveLayout(); updateHandles(); document.removeEventListener('mousemove',onDrag,true); document.removeEventListener('mouseup',endDrag,true); }
  function beginPopDrag(e){ var pop=document.getElementById('atmec-inspector-358-pop'); if(!pop|| (e.target&&e.target.tagName==='BUTTON')) return; var r=pop.getBoundingClientRect(); pop.dataset.userMoved='1'; popDrag={sx:e.clientX,sy:e.clientY,l:r.left,t:r.top}; document.addEventListener('mousemove',onPopDrag,true); document.addEventListener('mouseup',endPopDrag,true); }
  function onPopDrag(e){ if(!popDrag)return; var pop=document.getElementById('atmec-inspector-358-pop'); pop.style.left=Math.max(4,Math.min(window.innerWidth-80,popDrag.l+e.clientX-popDrag.sx))+'px'; pop.style.top=Math.max(40,Math.min(window.innerHeight-40,popDrag.t+e.clientY-popDrag.sy))+'px'; }
  function endPopDrag(){ popDrag=null; document.removeEventListener('mousemove',onPopDrag,true); document.removeEventListener('mouseup',endPopDrag,true); }
  function setEnabled(v){ enabled=!!v; document.body.classList.toggle('atmec-layout-edit-on',enabled); if(!enabled){ clearSel(); clearReference(); var p=document.getElementById('atmec-inspector-358-pop');if(p)p.style.display='none'; } updateBar(); }
  function setGrid(v){ gridOn=!!v; document.body.classList.toggle('atmec-layout-grid-on',gridOn); var b=document.getElementById('atmec-grid-toggle-358'); if(b){b.textContent=gridOn?'Griglia ON':'Griglia OFF';b.classList.toggle('on',gridOn);} }
  function setSnap(v){ snapOn=!!v; var b=document.getElementById('atmec-snap-toggle-358'); if(b){b.textContent=snapOn?'Snap ON':'Snap OFF';b.classList.toggle('on',snapOn);} }
  function bestTarget(e){
    var el=e.target; if(!el||skipUi(el)||isLoginArea(el)) return null;
    if(el.closest){
      // 3.985: selezione base estesa. Click normale prende l'elemento finale editabile
      // (testi, code/pre, log, KPI, risultati); ALT+click prende il contenitore grande.
      var real=el.closest('button,input,select,textarea,a,label,span,p,h1,h2,h3,h4,h5,h6,b,strong,em,small,code,pre,td,th,li,[data-ui-id],[data-layout-id],[data-atmec-auto-id],.prod-action-btn,.prod-result-cell,.prod-info-cell,.kpi-card,.dashboard-card,.recipe-step-card,.recipe-step-block,.module-card,.card,.panel,.log-list,.step-log,.test-result,.result-card,.result-box,.section-title,.metric-card,.status-card');
      if(real && !skipUi(real)) return real;
      if(e.altKey){ var box=el.closest('.card,.panel,.dashboard-start-row,.row,.tab-content,div'); if(box && !skipUi(box)) return box; }
    }
    return null;
  }
  function clickHandler(e){ if(!enabled)return; var el=bestTarget(e); if(!el)return; e.preventDefault(); e.stopPropagation(); select(el,e); }

  // ===== AT-MEC HM 3.98 - Comandi rapidi Layout Editor =====
  var clipboard397=[];
  function isEditableField(el){
    if(!el) return false;
    var tag=(el.tagName||'').toLowerCase();
    return tag==='input' || tag==='textarea' || tag==='select' || !!el.isContentEditable;
  }
  function currentPageRoot(){
    var active=document.querySelector('.tab-content.active,[id$="-tab"].active,.page.active,main,#app-shell') || document.body;
    return active || document.body;
  }
  function isVisibleTarget(el){
    if(!el || skipUi(el) || el===document.body || el===document.documentElement) return false;
    var r=el.getBoundingClientRect();
    if(r.width<2 || r.height<2) return false;
    var cs=window.getComputedStyle ? window.getComputedStyle(el) : null;
    if(cs && (cs.display==='none' || cs.visibility==='hidden' || Number(cs.opacity)===0)) return false;
    return true;
  }
  function getSelectableInPage(){
    ensureAutoIds();
    var root=currentPageRoot();
    return Array.prototype.slice.call(root.querySelectorAll('button,input,select,textarea,a,[data-ui-id],.prod-action-btn,.prod-result-cell,.prod-info-cell,.kpi-card,.recipe-step-card,.recipe-step-block,.module-card'))
      .filter(isVisibleTarget)
      .slice(0,250);
  }
  function selectMany397(els,primary){
    clearSel();
    els=(els||[]).filter(isVisibleTarget);
    if(!els.length) return;
    ensureAutoIds();
    selectedSet=els.map(function(el){return {el:el,id:roleName(el)};});
    selected=primary && els.indexOf(primary)>=0 ? primary : els[0];
    selectedId=roleName(selected);
    mark();
    openPop(selected,null);
    hideHandles();
    updateBar();
  }
  function copySelected397(){
    var arr=targetsForApply().filter(function(x){return isVisibleTarget(x.el);});
    clipboard397=arr.map(function(x){
      var r=x.el.getBoundingClientRect();
      return {html:x.el.outerHTML, tag:(x.el.tagName||'').toLowerCase(), id:x.id, left:r.left, top:r.top, width:r.width, height:r.height, tx:n(item(x.id).tx,0), ty:n(item(x.id).ty,0)};
    });
    popStatus('Copiati '+clipboard397.length+' elementi');
  }
  function sanitizeClone397(el){
    if(!el) return el;
    try{ el.removeAttribute('id'); el.removeAttribute('data-ui-id'); el.removeAttribute('data-atmec-auto-id'); el.dataset.atmecUid='u'+Math.random().toString(36).slice(2,9); el.classList.remove('atmec-layout-selected-366','atmec-layout-multi-366','atmec-layout-ref-367'); }catch(_e){}
    Array.prototype.forEach.call(el.querySelectorAll('[id],[data-ui-id],[data-atmec-auto-id]'),function(ch){
      try{ ch.removeAttribute('id'); ch.removeAttribute('data-ui-id'); ch.removeAttribute('data-atmec-auto-id'); ch.dataset.atmecUid='u'+Math.random().toString(36).slice(2,9); ch.classList.remove('atmec-layout-selected-366','atmec-layout-multi-366','atmec-layout-ref-367'); }catch(_e){}
    });
    return el;
  }
  function pasteSelected397(){
    if(!clipboard397.length){ popStatus('Clipboard Layout vuota'); return; }
    pushUndo();
    var parent=(selected && selected.parentElement) || currentPageRoot() || document.body;
    var created=[];
    clipboard397.forEach(function(c,idx){
      var wrap=document.createElement('div'); wrap.innerHTML=c.html;
      var el=sanitizeClone397(wrap.firstElementChild);
      if(!el) return;
      parent.appendChild(el);
      ensureAutoIds();
      var id=roleName(el), it=item(id);
      it.tx=n(c.tx,0)+24;
      it.ty=n(c.ty,0)+24+(idx*4);
      it.w=Math.round(c.width);
      it.h=Math.round(c.height);
      applyItem(el,id);
      created.push(el);
    });
    saveLayout();
    selectMany397(created,created[0]);
    popStatus('Incollati '+created.length+' elementi');
  }
  function duplicateSelected397(){ copySelected397(); pasteSelected397(); }
  function deleteSelected397(){
    var arr=unlockedTargets(targetsForApply()).filter(function(x){return x.el && x.el.isConnected;});
    if(!arr.length) return;
    pushUndo();
    arr.forEach(function(x){ var it=item(x.id); it.hidden=true; applyItem(x.el,x.id); });
    saveLayout(); clearSel(); var p=document.getElementById('atmec-inspector-358-pop'); if(p)p.style.display='none';
    popStatus('Nascosti '+arr.length+' elementi. Usa CTRL+Z per annullare.');
  }
  function shortcutHandler397(e){
    if(!enabled) return;
    if(skipUi(e.target) || isEditableField(e.target)) return;
    var key=String(e.key||'').toLowerCase();
    if(e.ctrlKey && !e.shiftKey && key==='a'){
      e.preventDefault(); e.stopPropagation(); selectMany397(getSelectableInPage(),null); return;
    }
    if(e.ctrlKey && !e.shiftKey && key==='c'){
      e.preventDefault(); e.stopPropagation(); copySelected397(); return;
    }
    if(e.ctrlKey && !e.shiftKey && key==='v'){
      e.preventDefault(); e.stopPropagation(); pasteSelected397(); return;
    }
    if(e.ctrlKey && !e.shiftKey && key==='d'){
      e.preventDefault(); e.stopPropagation(); duplicateSelected397(); return;
    }
    if(e.ctrlKey && !e.shiftKey && key==='z'){
      e.preventDefault(); e.stopPropagation(); undo(); return;
    }
    if((e.ctrlKey && !e.shiftKey && key==='y') || (e.ctrlKey && e.shiftKey && key==='z')){
      e.preventDefault(); e.stopPropagation(); redo(); return;
    }
    if(key==='escape'){
      e.preventDefault(); e.stopPropagation(); clearSel(); var p=document.getElementById('atmec-inspector-358-pop'); if(p)p.style.display='none'; return;
    }
    if(key==='delete' || key==='backspace'){
      e.preventDefault(); e.stopPropagation(); deleteSelected397(); return;
    }
  }

  function makeUi(){ if(document.getElementById('atmec-inspector-358-bar')) return; var grid=document.createElement('div'); grid.id='atmec-inspector-358-grid'; document.body.appendChild(grid); var bar=document.createElement('div'); bar.id='atmec-inspector-358-bar'; bar.innerHTML='<button id="atmec-inspector-358-toggle" type="button">Layout OFF</button><button id="atmec-grid-toggle-358" type="button">Griglia OFF</button><button id="atmec-snap-toggle-358" type="button">Snap OFF</button><select id="atmec-grid-size-358"><option value="5">5px</option><option value="10">10px</option><option value="20" selected>20px</option><option value="50">50px</option></select><button id="atmec-undo-358" type="button">↶</button><button id="atmec-redo-358" type="button">↷</button><button class="primary" id="atmec-save-layout-bar-412lf" type="button">💾 Salva Layout</button><button id="atmec-autosave-layout-412lf" type="button">Autosalva OFF</button><button id="atmec-clear-selection-3933" type="button">Deseleziona</button><button id="atmec-inspector-358-copy" type="button" disabled>Copia ID</button><span class="idbox" id="atmec-inspector-358-current">clicca un elemento</span>'; document.body.appendChild(bar); var pop=document.createElement('div'); pop.id='atmec-inspector-358-pop'; document.body.appendChild(pop); var mh=document.createElement('div'); mh.id='atmec-move-handle-358'; mh.className='atmec-layout-handle-358'; mh.textContent='Sposta'; document.body.appendChild(mh); var rh=document.createElement('div'); rh.id='atmec-resize-handle-358'; rh.className='atmec-layout-handle-358'; rh.setAttribute('title','Ridimensiona elemento selezionato'); rh.innerHTML='<span aria-hidden="true">↘</span>'; document.body.appendChild(rh); document.getElementById('atmec-inspector-358-toggle').onclick=function(){setEnabled(!enabled);}; document.getElementById('atmec-grid-toggle-358').onclick=function(){setGrid(!gridOn);}; document.getElementById('atmec-snap-toggle-358').onclick=function(){setSnap(!snapOn);}; document.getElementById('atmec-grid-size-358').onchange=function(){var g=gridSize();grid.style.backgroundSize=g+'px '+g+'px';}; document.getElementById('atmec-undo-358').onclick=undo; document.getElementById('atmec-redo-358').onclick=redo; var clr=document.getElementById('atmec-clear-selection-3933'); if(clr) clr.onclick=function(){clearSel(); var p=document.getElementById('atmec-inspector-358-pop'); if(p)p.style.display='none';}; document.getElementById('atmec-inspector-358-copy').onclick=function(){if(selectedId)try{navigator.clipboard.writeText(selectedId);}catch(_e){}}; mh.addEventListener('mousedown',function(e){beginDrag('move',e);},true); rh.addEventListener('mousedown',function(e){beginDrag('resize',e);},true); pop.addEventListener('mousedown',function(e){if(e.target&&e.target.closest&&e.target.closest('.head'))beginPopDrag(e);},true); updateBar(); }
  ready(function(){ loadLayout(); ensureAutoIds(); makeUi(); applyAll(); document.addEventListener('click',clickHandler,true); document.addEventListener('keydown',shortcutHandler397,true); window.addEventListener('resize',updateHandles); window.addEventListener('scroll',updateHandles,true); setEnabled(false); setGrid(false); setSnap(false); try{ var n=0; setInterval(function(){ if(!enabled && !gridOn && !snapOn) return; if(++n%3===0){ ensureAutoIds(); applyAll(); } },2000); }catch(_e){} });
  window.atMecLayoutInspector358={enable:function(){setEnabled(true);},disable:function(){setEnabled(false);},toggle:function(){setEnabled(!enabled);},current:function(){return selectedId;},reference:function(){return referenceId;},reset:function(){layout={};saveLayout();location.reload();},undo:undo,redo:redo,layout:function(){return layout;},selected:function(){return targetsForApply().map(function(x){return x.id;});},copy:copySelected397,paste:pasteSelected397,duplicate:duplicateSelected397,selectAll:function(){selectMany397(getSelectableInPage(),null);},clear:clearSel,deleteSelected:deleteSelected397,lock:function(){lockTargets(true);},unlock:function(){lockTargets(false);},copyStyle:copyStyle398,pasteStyle:pasteStyle398,front:function(){setLayer398(1);},back:function(){setLayer398(-1);},rotate:applyTransform410,flipX:function(){toggleFlip410('x');},flipY:function(){toggleFlip410('y');},snapNow:snapSelection410,group:groupTargets410,ungroup:ungroupTargets410,selectGroup:selectGroup410,save:function(){persistAndApplyLayout412LF('Layout salvato');},apply:applyAll,setLayout:function(obj){layout=obj||{};saveLayout();applyAll();updateHandles();},getLayout:function(){return layout;}};
})();


// ===== layout-manager-362.js =====
(function(){
  'use strict';
  var BASE_KEY='atmec.layout367.v1';
  var PROFILE_KEY='atmec.layout362.profiles';
  var PANEL_ID='atmec-layout-manager-362-panel';
  var installed=false;
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }
  function parseJson(v,d){ try{return JSON.parse(v||'')||d;}catch(_e){return d;} }
  function getLayout(){ return parseJson(localStorage.getItem(BASE_KEY),'{}') || {}; }
  function setLayout(obj){ localStorage.setItem(BASE_KEY,JSON.stringify(obj||{})); }
  function isPlainObject(v){ return !!(v && typeof v==='object' && !Array.isArray(v)); }
  function getProfiles(){
    var raw = localStorage.getItem(PROFILE_KEY);
    var p = parseJson(raw,{});
    /* Correzione 3.67: in alcune versioni il valore salvato può essere la stringa '{}' invece di un oggetto. */
    if(typeof p === 'string') p = parseJson(p,{});
    if(!isPlainObject(p)) p = {};
    return p;
  }
  function setProfiles(obj){ localStorage.setItem(PROFILE_KEY,JSON.stringify(isPlainObject(obj)?obj:{})); }
  function nowName(){ var d=new Date(); function p(n){return String(n).padStart(2,'0');} return 'Layout_'+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'_'+p(d.getHours())+p(d.getMinutes()); }
  function status(msg){ var st=document.getElementById('atmec-lm-status-362'); if(st) st.textContent=msg||''; }
  function refreshSelect(){ var sel=document.getElementById('atmec-lm-select-362'); if(!sel) return; var profiles=getProfiles(); var cur=sel.value; sel.innerHTML=''; Object.keys(profiles).sort().forEach(function(k){ var o=document.createElement('option'); o.value=k; o.textContent=k; sel.appendChild(o); }); if(cur && profiles[cur]) sel.value=cur; }
  function download(name,text){ var blob=new Blob([text],{type:'application/json'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ try{URL.revokeObjectURL(a.href); a.remove();}catch(_e){} },1000); }
  function currentPrefix(){ var id=''; try{ id=window.atMecLayoutInspector358 && window.atMecLayoutInspector358.current ? window.atMecLayoutInspector358.current() : ''; }catch(_e){} if(id && id.indexOf('page.')===0){ var parts=id.split('.'); if(parts.length>=3) return parts.slice(0,3).join('.')+'.'; } var active=document.querySelector('[id$="-tab"]:not([hidden]), .page:not([hidden]), section:not([hidden])'); if(active && active.id) return 'page.'+String(active.id).toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'')+'.'; return ''; }
  function saveNamed(){ var name=(document.getElementById('atmec-lm-name-362')||{}).value || nowName(); name=String(name).trim(); if(!name){ status('nome layout mancante'); return; } var profiles=getProfiles(); profiles[name]={created:new Date().toISOString(),layout:getLayout()}; setProfiles(profiles); refreshSelect(); var sel=document.getElementById('atmec-lm-select-362'); if(sel) sel.value=name; status('salvato: '+name); }
  function loadNamed(){ var sel=document.getElementById('atmec-lm-select-362'); var name=sel&&sel.value; if(!name){ status('nessun layout selezionato'); return; } var profiles=getProfiles(); if(!profiles[name]){ status('layout non trovato'); return; } var lay=profiles[name].layout||{}; setLayout(lay); try{ if(window.atMecLayoutInspector358 && window.atMecLayoutInspector358.setLayout) window.atMecLayoutInspector358.setLayout(lay); }catch(_e){} status('layout caricato e applicato: '+name); }
  function deleteNamed(){ var sel=document.getElementById('atmec-lm-select-362'); var name=sel&&sel.value; if(!name) return; var profiles=getProfiles(); delete profiles[name]; setProfiles(profiles); refreshSelect(); status('eliminato: '+name); }
  function exportCurrent(){ download('at_mec_layout_corrente.json',JSON.stringify({type:'AT-MEC layout',version:'3.92',layout:getLayout()},null,2)); status('layout corrente esportato'); }
  function exportNamed(){ var sel=document.getElementById('atmec-lm-select-362'); var name=sel&&sel.value; var profiles=getProfiles(); if(!name || !profiles[name]){ exportCurrent(); return; } download(name.replace(/[^a-z0-9_\-]+/gi,'_')+'.json',JSON.stringify({type:'AT-MEC layout profile',version:'3.92',name:name,profile:profiles[name]},null,2)); status('layout esportato: '+name); }
  function importFile(file){ if(!file) return; var r=new FileReader(); r.onload=function(){ try{ var data=JSON.parse(String(r.result||'{}')); var layout=data.layout || (data.profile&&data.profile.layout) || data; if(typeof layout==='string') layout=parseJson(layout,{}); if(!isPlainObject(layout)) layout={}; var name=data.name || file.name.replace(/\.json$/i,'') || nowName(); var profiles=getProfiles(); profiles[name]={created:new Date().toISOString(),layout:layout}; setProfiles(profiles); setLayout(layout); try{ if(window.atMecLayoutInspector358 && window.atMecLayoutInspector358.setLayout) window.atMecLayoutInspector358.setLayout(layout); }catch(_e){} refreshSelect(); var sel=document.getElementById('atmec-lm-select-362'); if(sel) sel.value=name; status('importato e applicato come layout corrente: '+name); }catch(e){ status('errore import: '+(e&&e.message?e.message:e)); } }; r.readAsText(file); }
  function resetPage(){ var prefix=currentPrefix(); if(!prefix){ status('seleziona prima un elemento della pagina'); return; } var layout=getLayout(), n=0; Object.keys(layout).forEach(function(k){ if(k.indexOf(prefix)===0){ delete layout[k]; n++; } }); setLayout(layout); status('reset pagina: '+n+' elementi - riavvio'); setTimeout(function(){location.reload();},250); }
  function resetAll(){ setLayout({}); status('reset totale - riavvio'); setTimeout(function(){location.reload();},250); }
  function makePanel(){ if(document.getElementById(PANEL_ID)) return; var p=document.createElement('div'); p.id=PANEL_ID; p.innerHTML='<div class="lm-head"><span>💾 Layout Manager - Salvataggio stabile</span><button id="atmec-lm-close-362" type="button">×</button></div><div class="lm-body"><label>Nome layout<input id="atmec-lm-name-362" type="text" placeholder="es. TestMode_Mirza"></label><div class="row"><button class="primary" id="atmec-lm-save-362" type="button">Salva con nome</button><button id="atmec-lm-save-quick-362" type="button">Aggiorna selezionato</button></div><label>Layout salvati<select id="atmec-lm-select-362"></select></label><div class="row"><button id="atmec-lm-load-362" type="button">Carica</button><button class="danger" id="atmec-lm-delete-362" type="button">Elimina</button></div><div class="row"><button id="atmec-lm-export-current-362" type="button">Esporta corrente</button><button id="atmec-lm-export-profile-362" type="button">Esporta selezionato</button></div><div class="row"><button id="atmec-lm-import-362" type="button">Importa JSON</button><input id="atmec-lm-file-362" type="file" accept="application/json,.json" style="display:none"></div><div class="row"><button class="warn" id="atmec-lm-reset-page-362" type="button">Reset pagina</button><button class="danger" id="atmec-lm-reset-all-362" type="button">Reset tutto</button></div><div class="hint">Gestisce solo posizione/dimensione del layout. Non cambia colori, font, logica test o tema. Per reset pagina: seleziona prima un elemento della pagina.</div><div class="status" id="atmec-lm-status-362"></div></div>'; document.body.appendChild(p); refreshSelect(); p.querySelector('#atmec-lm-close-362').onclick=function(){p.style.display='none';}; p.querySelector('#atmec-lm-save-362').onclick=saveNamed; p.querySelector('#atmec-lm-save-quick-362').onclick=function(){ var sel=document.getElementById('atmec-lm-select-362'); var name=sel&&sel.value; if(name){ document.getElementById('atmec-lm-name-362').value=name; saveNamed(); } else saveNamed(); }; p.querySelector('#atmec-lm-load-362').onclick=loadNamed; p.querySelector('#atmec-lm-delete-362').onclick=deleteNamed; p.querySelector('#atmec-lm-export-current-362').onclick=exportCurrent; p.querySelector('#atmec-lm-export-profile-362').onclick=exportNamed; p.querySelector('#atmec-lm-import-362').onclick=function(){document.getElementById('atmec-lm-file-362').click();}; p.querySelector('#atmec-lm-file-362').onchange=function(e){importFile(e.target.files&&e.target.files[0]); e.target.value='';}; p.querySelector('#atmec-lm-reset-page-362').onclick=resetPage; p.querySelector('#atmec-lm-reset-all-362').onclick=resetAll; var drag=null; p.querySelector('.lm-head').addEventListener('mousedown',function(e){ if(e.target&&e.target.tagName==='BUTTON') return; var rr=p.getBoundingClientRect(); drag={dx:e.clientX-rr.left,dy:e.clientY-rr.top}; e.preventDefault(); },true); document.addEventListener('mousemove',function(e){ if(!drag) return; p.style.left=Math.max(0,Math.min(window.innerWidth-80,e.clientX-drag.dx))+'px'; p.style.top=Math.max(0,Math.min(window.innerHeight-40,e.clientY-drag.dy))+'px'; p.style.right='auto'; },true); document.addEventListener('mouseup',function(){drag=null;},true); }
  function installButton(){ if(installed) return; var bar=document.getElementById('atmec-inspector-358-bar'); if(!bar) return; installed=true; makePanel(); var btn=document.createElement('button'); btn.id='atmec-layout-manager-362-toggle'; btn.type='button'; btn.textContent='Layout Manager'; btn.onclick=function(){ var p=document.getElementById(PANEL_ID); if(!p) return; p.style.display=(p.style.display==='none'||!p.style.display)?'block':'none'; refreshSelect(); }; bar.insertBefore(btn, bar.firstChild ? bar.firstChild.nextSibling : null); }
  ready(function(){ var n=0; var t=setInterval(function(){ installButton(); if(installed || ++n>40) clearInterval(t); },250); });
  window.atMecLayoutManager362={open:function(){makePanel(); document.getElementById(PANEL_ID).style.display='block';},profiles:getProfiles,exportCurrent:exportCurrent};
})();


// ===== layout-373.js =====
(function(){
  'use strict';
  var TEXT_KEY='atmec.layout373.texts';
  var ALIAS_KEY='atmec.layout373.aliases';
  var LAYOUT_KEY='atmec.layout367.v1';
  var panelId='atmec-layout-373-panel';
  var copiedProps=null, installed=false;
  var toolTargetEl=null, toolTargetId='';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }
  function esc(v){ return String(v==null?'':v).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }
  function parse(key){ try{ var v=JSON.parse(localStorage.getItem(key)||'{}'); return v && typeof v==='object' && !Array.isArray(v) ? v : {}; }catch(_e){ return {}; } }
  function save(key,obj){ try{ localStorage.setItem(key,JSON.stringify(obj||{})); }catch(_e){} }
  function roleName(el){ return (el && el.dataset && (el.dataset.atmecAutoId || el.dataset.uiId)) || (el&&el.id?('#'+el.id):''); }
  function allTargets(){ return Array.prototype.slice.call(document.querySelectorAll('button,input,select,textarea,a,[data-ui-id],[data-atmec-auto-id],.prod-action-btn,.prod-result-cell,.prod-info-cell,.kpi-card,.recipe-step-card,.recipe-step-block,.module-card,.card,.panel,.tab-content,.section-title,label,span,p,h1,h2,h3,h4,td,th')).filter(function(el){ return el && el.isConnected && !el.closest('#login-gate') && !el.closest('#atmec-layout-373-panel') && !el.closest('#atmec-inspector-358-bar') && !el.closest('#atmec-layout-manager-362-panel') && !el.closest('#atmec-inspector-358-pop'); }); }
  function currentEl(){ var el=document.querySelector('.atmec-layout-selected-366') || null; if(el){ toolTargetEl=el; toolTargetId=roleName(el)||toolTargetId; return el; } return (toolTargetEl && toolTargetEl.isConnected) ? toolTargetEl : null; }
  function currentId(){ var el=currentEl(); var id=''; try{ id=window.atMecLayoutInspector358 && window.atMecLayoutInspector358.current ? window.atMecLayoutInspector358.current() : ''; }catch(_e){} id=id || roleName(el) || toolTargetId || ''; if(id && id!=='clicca un elemento' && id!=='nessun elemento selezionato'){ toolTargetId=id; } return toolTargetId || id || ''; }
  function selectElement(el){ if(!el) return; toolTargetEl=el; toolTargetId=roleName(el)||toolTargetId; try{ if(window.atMecLayoutInspector358 && window.atMecLayoutInspector358.enable) window.atMecLayoutInspector358.enable(); }catch(_e){} try{ el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window})); }catch(_e){} setTimeout(refresh,80); }
  function findById(id){ return allTargets().find(function(el){ return roleName(el)===id; }) || null; }
  function textOf(el){ if(!el) return ''; var tag=(el.tagName||'').toLowerCase(); if(tag==='input' || tag==='textarea') return el.value || el.getAttribute('placeholder') || ''; if(tag==='select') return el.options && el.selectedIndex>=0 ? el.options[el.selectedIndex].text : ''; return (el.innerText || el.textContent || '').trim().replace(/\s+/g,' ').slice(0,300); }
  function applySavedTexts(){ var map=parse(TEXT_KEY); Object.keys(map).forEach(function(id){ var el=findById(id); if(!el) return; var v=String(map[id]||''); var tag=(el.tagName||'').toLowerCase(); if(tag==='input' || tag==='textarea') el.value=v; else if(tag==='select'){} else el.textContent=v; }); }
  function applyText(){ var el=currentEl(), id=currentId(); if(!el||!id) return status('seleziona elemento'); var inp=document.getElementById('atmec-text-373'); var val=inp?inp.value:''; var tag=(el.tagName||'').toLowerCase(); if(tag==='input'||tag==='textarea'){ el.value=val; el.setAttribute('value',val); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); } else if(tag==='select') return status('select: modifica testo non applicabile'); else { el.textContent=val; el.setAttribute('data-atmec-custom-text','1'); } var map=parse(TEXT_KEY); map[id]=val; save(TEXT_KEY,map); toolTargetEl=el; toolTargetId=id; status('testo salvato per '+id); refresh(); }
  function saveAlias(){ var id=currentId(); if(!id) return status('seleziona elemento'); var a=(document.getElementById('atmec-alias-373')||{}).value||''; var map=parse(ALIAS_KEY); if(String(a).trim()) map[id]=String(a).trim(); else delete map[id]; save(ALIAS_KEY,map); status('alias aggiornato'); refresh(); }
  function copyProps(){ var id=currentId(), el=currentEl(); if(!id||!el) return status('seleziona elemento'); var lay=parse(LAYOUT_KEY); var r=el.getBoundingClientRect(); var it=lay[id]||{}; copiedProps={tx:it.tx||0,ty:it.ty||0,w:it.w||Math.round(r.width),h:it.h||Math.round(r.height)}; status('proprietà X/Y/W/H copiate'); }
  function pasteProps(){ var id=currentId(), el=currentEl(); if(!id||!el||!copiedProps) return status('seleziona elemento e copia proprietà prima'); var lay=parse(LAYOUT_KEY); lay[id]=Object.assign({},lay[id]||{},copiedProps); save(LAYOUT_KEY,lay); applyInlineLayout(el,lay[id]); status('proprietà incollate su '+id); }
  function applyInlineLayout(el,it){ if(!el||!it) return; el.style.setProperty('box-sizing','border-box','important'); el.style.setProperty('flex','0 0 auto','important'); el.style.setProperty('align-self','flex-start','important'); if(it.tx!=null||it.ty!=null) el.style.setProperty('transform','translate('+Math.round(Number(it.tx)||0)+'px,'+Math.round(Number(it.ty)||0)+'px)','important'); if(it.w){ el.style.setProperty('width',Math.round(it.w)+'px','important'); el.style.setProperty('min-width',Math.round(it.w)+'px','important'); el.style.setProperty('max-width',Math.round(it.w)+'px','important'); } if(it.h){ el.style.setProperty('height',Math.round(it.h)+'px','important'); el.style.setProperty('min-height',Math.round(it.h)+'px','important'); el.style.setProperty('max-height',Math.round(it.h)+'px','important'); } }
  function search(){ var q=((document.getElementById('atmec-search-373')||{}).value||'').toLowerCase().trim(); var box=document.getElementById('atmec-tree-373'); if(!box) return; buildTree(q); }
  function buildTree(filter){ var box=document.getElementById('atmec-tree-373'); if(!box) return; var aliases=parse(ALIAS_KEY); var list=allTargets().map(function(el){ var id=roleName(el); return {el:el,id:id,txt:textOf(el),alias:aliases[id]||''}; }).filter(function(x){ if(!x.id) return false; if(!filter) return true; var h=(x.id+' '+x.txt+' '+x.alias).toLowerCase(); return h.indexOf(filter)>=0; }).slice(0,300); box.innerHTML=''; if(!list.length){ box.innerHTML='<div class="muted">Nessun elemento trovato</div>'; return; } list.forEach(function(x){ var b=document.createElement('button'); b.type='button'; b.textContent=(x.alias?('★ '+x.alias+' — '):'')+x.id+(x.txt?'  ·  '+x.txt.slice(0,50):''); b.title=x.id; b.onclick=function(){ selectElement(x.el); flash(x.el); }; box.appendChild(b); }); }
  function flash(el){ document.querySelectorAll('.atmec-layout-found-373').forEach(function(e){e.classList.remove('atmec-layout-found-373');}); if(el){ el.classList.add('atmec-layout-found-373'); setTimeout(function(){try{el.classList.remove('atmec-layout-found-373');}catch(_e){}},1800); try{el.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});}catch(_e){} } }
  function status(msg){ var s=document.getElementById('atmec-status-373'); if(s) s.textContent=msg||''; }
  function refresh(){ var el=currentEl(), id=currentId(); var aliases=parse(ALIAS_KEY); var t=document.getElementById('atmec-current-373'); if(t) t.textContent=id?((aliases[id]?aliases[id]+' — ':'')+id):'nessun elemento selezionato'; var ti=document.getElementById('atmec-text-373'); if(ti && document.activeElement!==ti) ti.value=el?textOf(el):''; var ai=document.getElementById('atmec-alias-373'); if(ai && document.activeElement!==ai) ai.value=(id&&aliases[id])?aliases[id]:''; }
  function makePanel(){ if(document.getElementById(panelId)) return; var p=document.createElement('div'); p.id=panelId; p.innerHTML='<div class="h373"><span>🔎 Strumenti elemento 3.94</span><button id="atmec-close-373" type="button">×</button></div><div class="b373"><div class="muted">Aggiunge ricerca, albero pagina, alias e modifica testo. Non cambia colori o tema.</div><div><b>Selezionato:</b><br><code id="atmec-current-373">nessun elemento selezionato</code></div><details id="atmec-search-box-3933"><summary>🔎 Cerca elemento</summary><label>Cerca elemento<input id="atmec-search-373" type="text" placeholder="es. stop, pass, seriale"></label><div class="tree373" id="atmec-tree-373"></div></details><label>Testo elemento<textarea id="atmec-text-373"></textarea></label><div class="row"><button class="primary" id="atmec-apply-text-373" type="button">Applica testo</button><button id="atmec-copy-props-373" type="button">Copia X/Y/W/H</button><button id="atmec-paste-props-373" type="button">Incolla X/Y/W/H</button></div><label>Alias nel Layout Editor<input id="atmec-alias-373" type="text" placeholder="es. STOP PRINCIPALE"></label><div class="row"><button id="atmec-save-alias-373" type="button">Salva alias</button><button id="atmec-refresh-373" type="button">Aggiorna lista</button></div><div class="muted" id="atmec-status-373"></div></div>'; document.body.appendChild(p); p.querySelector('#atmec-close-373').onclick=function(){p.style.display='none';}; p.querySelector('#atmec-search-373').oninput=search; p.querySelector('#atmec-apply-text-373').onclick=applyText; p.querySelector('#atmec-save-alias-373').onclick=saveAlias; p.querySelector('#atmec-copy-props-373').onclick=copyProps; p.querySelector('#atmec-paste-props-373').onclick=pasteProps; p.querySelector('#atmec-refresh-373').onclick=function(){buildTree(((document.getElementById('atmec-search-373')||{}).value||'').toLowerCase());refresh();}; var drag=null; var head=p.querySelector('.h373'); function stopDrag(){drag=null; try{document.body.classList.remove('atmec-tools-373-dragging');}catch(_e){}} head.addEventListener('pointerdown',function(e){ if(e.target&&e.target.closest&&e.target.closest('button')) return; var r=p.getBoundingClientRect(); drag={dx:e.clientX-r.left,dy:e.clientY-r.top,pid:e.pointerId}; p.style.position='fixed'; p.style.right='auto'; p.style.bottom='auto'; p.style.left=r.left+'px'; p.style.top=r.top+'px'; try{head.setPointerCapture(e.pointerId);}catch(_e){} try{document.body.classList.add('atmec-tools-373-dragging');}catch(_e){} e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation(); },true); head.addEventListener('pointermove',function(e){ if(!drag) return; p.style.left=Math.max(0,Math.min(window.innerWidth-80,e.clientX-drag.dx))+'px'; p.style.top=Math.max(40,Math.min(window.innerHeight-40,e.clientY-drag.dy))+'px'; e.preventDefault(); e.stopPropagation(); },true); head.addEventListener('pointerup',function(e){ if(drag){ try{head.releasePointerCapture(drag.pid);}catch(_e){} } stopDrag(); if(e){e.preventDefault();e.stopPropagation();} },true); head.addEventListener('pointercancel',stopDrag,true); window.addEventListener('blur',stopDrag,true); buildTree(''); refresh(); }
  function installButton(){ var bar=document.getElementById('atmec-inspector-358-bar'); if(!bar || document.getElementById('atmec-layout-373-toggle')) return; makePanel(); var btn=document.createElement('button'); btn.id='atmec-layout-373-toggle'; btn.type='button'; btn.textContent='Strumenti elemento'; btn.onclick=function(){ var p=document.getElementById(panelId); if(!p) return; p.style.display=(p.style.display==='none'||!p.style.display)?'block':'none'; buildTree(((document.getElementById('atmec-search-373')||{}).value||'').toLowerCase()); refresh(); }; bar.appendChild(btn); }
  ready(function(){ applySavedTexts(); var n=0; var timer=setInterval(function(){ installButton(); if(++n>40 || document.getElementById('atmec-layout-373-toggle')) clearInterval(timer); },250); function remember(e){ var t=e&&e.target; if(!t || (t.closest&&t.closest('#atmec-layout-373-panel,#atmec-inspector-358-bar,#atmec-inspector-358-pop,#atmec-layout-manager-362-panel'))) return; var el=t.closest&&t.closest('button,input,select,textarea,a,[data-atmec-auto-id],[data-ui-id],[data-layout-id],.prod-action-btn,.prod-result-cell,.prod-info-cell,.kpi-card,.recipe-step-card,.recipe-step-block,.module-card,.card,.panel,label,span,p,h1,h2,h3,h4,td,th'); if(el){ toolTargetEl=el; toolTargetId=roleName(el)||toolTargetId; } } document.addEventListener('mousedown',remember,true); document.addEventListener('click',function(e){ remember(e); setTimeout(refresh,120); },true); });
  window.atMecLayoutTools373={open:function(){makePanel();document.getElementById(panelId).style.display='block';buildTree('');refresh();},search:search,refresh:refresh};
})();


// ===== layout-376-fix.js =====
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


// ===== layout-379-text-fix.js =====
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
  function status(msg){ var s=document.getElementById('atmec-status-373'); if(s) s.textContent=msg; try{console.log('[AT-MEC 3.92 TEXT]',msg);}catch(_e){} }
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
    // 4.13R-F: evita polling pesante su tutti gli elementi ogni 700 ms.
    // applySaved() resta eseguito all'avvio; il timer mantiene solo il pannello, molto più leggero.
    setInterval(function(){ ensurePanel(); },3000);
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



// ===== AT-MEC 3.934 final guard: handle icon + stable tools panel =====
(function(){
  'use strict';
  function fixHandle(){ var rh=document.getElementById('atmec-resize-handle-358'); if(rh){ rh.innerHTML='<span aria-hidden=\"true\">↘</span>'; rh.setAttribute('title','Ridimensiona elemento selezionato'); } }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fixHandle,{once:true}); else fixHandle();
  setInterval(fixHandle,1000);
})();


// ===== AT-MEC 3.94 - stable handle + event guard =====
(function(){
  'use strict';
  var HANDLE_ID='atmec-resize-handle-358';
  var MOVE_ID='atmec-move-handle-358';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }
  function hardenHandle(){
    var rh=document.getElementById(HANDLE_ID);
    if(!rh) return;
    // Handle must be a standalone overlay, never inherit selected button text.
    if(rh.parentElement!==document.body) document.body.appendChild(rh);
    rh.classList.add('atmec-resize-handle-394');
    rh.setAttribute('aria-label','Ridimensiona elemento selezionato');
    rh.setAttribute('title','Ridimensiona elemento selezionato');
    rh.textContent='';
    rh.style.setProperty('font-size','0','important');
    rh.style.setProperty('line-height','0','important');
    rh.style.setProperty('overflow','hidden','important');
    rh.style.setProperty('contain','layout paint style','important');
    rh.style.setProperty('isolation','isolate','important');
    rh.style.setProperty('pointer-events','auto','important');
    rh.style.setProperty('user-select','none','important');
    rh.style.setProperty('z-index','2147483646','important');
  }
  function protectHandleEvents(){
    var rh=document.getElementById(HANDLE_ID), mh=document.getElementById(MOVE_ID);
    [rh,mh].forEach(function(h){
      if(!h || h.getAttribute('data-atmec-394-event-guard')) return;
      h.setAttribute('data-atmec-394-event-guard','1');
      ['click','dblclick','mouseup'].forEach(function(type){
        h.addEventListener(type,function(e){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); },true);
      });
      h.addEventListener('mousedown',function(e){ e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); },true);
    });
  }
  function boot(){
    hardenHandle();
    protectHandleEvents();
    var mo=new MutationObserver(function(){ hardenHandle(); protectHandleEvents(); });
    try{ mo.observe(document.body,{childList:true,subtree:true,characterData:true}); }catch(_e){}
    setInterval(function(){ hardenHandle(); protectHandleEvents(); },350);
  }
  ready(boot);
  window.atMec394Handle={fix:hardenHandle,events:protectHandleEvents};
})();


// ===== AT-MEC HM 3.98 - Layout Editor stability marker =====
(function(){
  'use strict';
  window.AT_MEC_LAYOUT_EDITOR_VERSION = '4.0';
  window.AT_MEC_LAYOUT_EDITOR_RULES = Object.freeze({
    propertyEdit: 'single-or-explicit-multiselection',
    alignment: 'reference-or-selected-set',
    panel: 'movable-collapsible',
    resizeHandle: 'external-overlay',
    shortcuts: 'ctrl-a-copy-paste-duplicate-delete-undo-redo'
  });
})();





// ===== AT-MEC HM 4.0 - universal visible layer controller for buttons, cards, grids, panels =====
(function(){
  'use strict';
  var STORE_KEY='atmec.layout367.v1';
  var EDIT_CLASS='atmec-editable-3990';
  var BTN_FRONT='atmec-front-398';
  var BTN_BACK='atmec-back-398';
  var BASE_Z=1000;
  var STEP=50;
  var TOP_LIMIT=999999;
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }
  function cssEscape(v){ try{return CSS.escape(String(v));}catch(_e){ return String(v).replace(/"/g,'\\"'); } }
  function skip(el){ return !!(el && el.closest && el.closest('#atmec-inspector-358-bar,#atmec-inspector-358-pop,#atmec-layout-373-panel,#atmec-layout-manager-362-panel,.atmec-layout-handle-358,.atmec-resize-handle-394')); }
  function visible(el){
    if(!el || !el.isConnected || skip(el) || el===document.body || el===document.documentElement) return false;
    try{ var r=el.getBoundingClientRect(); var cs=getComputedStyle(el); return r.width>=3 && r.height>=3 && cs.display!=='none' && cs.visibility!=='hidden'; }catch(_e){ return false; }
  }
  function load(){ try{return JSON.parse(localStorage.getItem(STORE_KEY)||'{}')||{};}catch(_e){return {};} }
  function save(m){ try{localStorage.setItem(STORE_KEY,JSON.stringify(m||{}));}catch(_e){} }
  function slug(s){ return String(s||'element').toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'').slice(0,60)||'element'; }
  function classPart(el){ try{return String(el.className||'').split(/\s+/).filter(function(c){return c && !/^atmec/i.test(c) && !/^selected/i.test(c);}).slice(0,3).join('.');}catch(_e){return '';} }
  function ensureId(el){
    if(!el || !el.setAttribute) return '';
    var id=el.getAttribute('data-ui-id') || el.getAttribute('data-layout-id') || el.id || el.getAttribute('data-atmec-auto-id');
    if(id && id.indexOf('atmec.3990')<0){ try{ if(!el.getAttribute('data-atmec-auto-id')) el.setAttribute('data-atmec-auto-id',id); }catch(_e){} return id; }
    try{ if(!el.dataset.atmecUid) el.dataset.atmecUid='u'+Math.random().toString(36).slice(2,9); }catch(_e){}
    var tag=(el.tagName||'el').toLowerCase();
    var role=el.getAttribute('data-ui-id') || el.id || classPart(el) || String(el.textContent||el.value||tag).replace(/\s+/g,' ').trim().slice(0,34) || tag;
    var page=(el.closest&&el.closest('[id$="-tab"],.tab-content,.page,section,main,#app-shell,body'))||document.body;
    var pageName=page&&page.id?('page.'+slug(page.id)):'page.run.tab';
    id=pageName+'.'+tag+'.'+slug(role)+'.'+((el.dataset&&el.dataset.atmecUid)||Math.random().toString(36).slice(2,8));
    try{ el.dataset.atmecAutoId=id; }catch(_e){}
    return id;
  }
  function selectorList(){
    return [
      'button','input','textarea','select','a','label','span','p','h1','h2','h3','h4','h5','h6','b','strong','em','small','code','pre','td','th','li','img','svg','canvas',
      '[data-ui-id]','[data-layout-id]','[data-atmec-auto-id]',
      '.kpi-card','.kpi-val','.kpi-lbl','.dashboard-card','.dashboard-production-grid','.dashboard-start-row','.dashboard-actions','.brand-hero','.detail-line',
      '.module-card','.instrument-card','.tools-card','.run-card','.test-card','.recipe-step-card','.recipe-step-block',
      '.card','.panel','.box','.section','.section-title','.log-list','.step-log','.test-result','.result-card','.result-box',
      '.prod-result-cell','.prod-info-cell','.prod-kpis','.prod-test-header','.prod-test-body','.metric-card','.status-card','.dashboard-hw-row','.state-led',
      '[class*="card"]','[class*="panel"]','[class*="box"]','[class*="grid"]','[class*="row"]','[class*="log"]','[class*="result"]','[class*="title"]','[class*="label"]','[class*="value"]'
    ].join(',');
  }
  function activeRoot(){ return document.querySelector('.tab-content.active') || document.querySelector('#run-tab') || document.querySelector('main') || document.body; }
  function editableElements(){
    var root=activeRoot();
    var nodes=Array.prototype.slice.call(root.querySelectorAll(selectorList())).filter(visible);
    var seen={};
    return nodes.filter(function(el){ var id=ensureId(el); if(!id || seen[id]) return false; seen[id]=1; return true; });
  }
  function mark(){
    editableElements().forEach(function(el){ try{ el.classList.add(EDIT_CLASS); }catch(_e){} });
  }
  function selected(){
    var arr=Array.prototype.slice.call(document.querySelectorAll('.atmec-layout-selected-366,.atmec-layout-multi-366')).filter(visible);
    var seen={};
    return arr.filter(function(el){ var id=ensureId(el); if(!id || seen[id]) return false; seen[id]=1; return true; });
  }
  function chain(el){
    var out=[]; var root=activeRoot(); var cur=el;
    while(cur && cur!==document.body && cur!==document.documentElement){
      if(visible(cur) && !skip(cur)) out.push(cur);
      if(cur===root) break;
      cur=cur.parentElement;
    }
    return out;
  }
  function currentZ(el,map){
    var id=ensureId(el), it=(map&&map[id])||{};
    var z=Number(it.z3990 || it.z3989 || it.z);
    if(!isFinite(z)){ try{ z=parseInt(getComputedStyle(el).zIndex,10); }catch(_e){} }
    if(!isFinite(z) || z<1) z=BASE_Z;
    return Math.max(1,Math.min(TOP_LIMIT,Math.round(z)));
  }
  function forceStacking(el,z,map,role){
    if(!visible(el)) return;
    z=Math.max(1,Math.min(TOP_LIMIT,Math.round(Number(z)||BASE_Z)));
    var id=ensureId(el); if(!id) return;
    try{
      var cs=getComputedStyle(el);
      if(cs.position==='static') el.style.setProperty('position','relative','important');
      el.style.setProperty('z-index',String(z),'important');
      el.style.setProperty('isolation','auto','important');
      el.style.removeProperty('order');
      el.style.removeProperty('grid-row');
      el.style.removeProperty('grid-column');
      el.setAttribute('data-atmec-layer-root-3990',role||'layered');
      ['3984','3985','3986','3987','3988','3989'].forEach(function(v){ el.removeAttribute('data-atmec-layer-root-'+v); });
      el.classList.add(EDIT_CLASS);
    }catch(_e){}
    map[id]=map[id]||{};
    map[id].z3990=z;
    map[id].layer3990=true;
    map[id].layered=true;
    delete map[id].z3988; delete map[id].z3989;
  }
  function maxZ(map){
    var max=BASE_Z;
    editableElements().forEach(function(el){ max=Math.max(max,currentZ(el,map)); });
    return max;
  }
  function minZ(map){
    var min=Infinity;
    editableElements().forEach(function(el){ min=Math.min(min,currentZ(el,map)); });
    return isFinite(min)?min:BASE_Z;
  }
  function normalizeIfNeeded(map){
    var max=maxZ(map); if(max<TOP_LIMIT-10000) return;
    editableElements().forEach(function(el,idx){ forceStacking(el,BASE_Z+(idx*2),map,'normalized'); });
  }
  function raiseVisible(el,z,map){
    // Per card/riquadri dentro grid/flex, alza anche i contenitori padre fino alla pagina attiva.
    var c=chain(el);
    for(var i=c.length-1;i>=0;i--){ forceStacking(c[i],z+(c.length-i),map,i===0?'layered':'parent-front'); }
  }
  function lowerVisible(el,z,map){
    // Per andare dietro non usare mai valori negativi: abbassa elemento e catena a livello basso ma valido.
    var c=chain(el);
    for(var i=c.length-1;i>=0;i--){ forceStacking(c[i],Math.max(1,z+i),map,i===0?'layered':'parent-back'); }
  }
  function front(){
    var sel=selected();
    if(!sel.length){ console.warn('[AT-MEC 4.0] Nessun elemento selezionato per Porta avanti'); return; }
    var map=load(); normalizeIfNeeded(map);
    var z=maxZ(map)+STEP;
    sel.forEach(function(el,i){ raiseVisible(el,z+(i*STEP),map); });
    save(map);
    console.log('[AT-MEC 4.0] Porta avanti universale applicato a',sel.length,'elemento/i',sel.map(ensureId));
  }
  function back(){
    var sel=selected();
    if(!sel.length){ console.warn('[AT-MEC 4.0] Nessun elemento selezionato per Porta dietro'); return; }
    var map=load(); normalizeIfNeeded(map);
    var target=Math.max(1,minZ(map)-STEP);
    // Se siamo già a 1, alza tutti gli altri e lascia il selezionato basso.
    if(target<=1){
      editableElements().forEach(function(el,idx){ if(sel.indexOf(el)<0) forceStacking(el,BASE_Z+STEP+(idx*2),map,'background-normalized'); });
      target=1;
    }
    sel.forEach(function(el,i){ lowerVisible(el,target+i,map); });
    save(map);
    console.log('[AT-MEC 4.0] Porta dietro universale applicato a',sel.length,'elemento/i',sel.map(ensureId));
  }
  function applySaved(){
    var map=load();
    Object.keys(map||{}).forEach(function(id){
      var it=map[id]||{}; var z=Number(it.z3990 || it.z3989 || it.z);
      if(!isFinite(z) || z<1) return;
      var el=null;
      try{ el=document.querySelector('[data-atmec-auto-id="'+cssEscape(id)+'"],[data-ui-id="'+cssEscape(id)+'"],[data-layout-id="'+cssEscape(id)+'"]') || document.getElementById(id); }catch(_e){}
      if(el) forceStacking(el,z,map,'saved');
    });
  }
  function cleanupOld(){
    try{
      Array.prototype.forEach.call(document.querySelectorAll('[data-atmec-layer-root-3984],[data-atmec-layer-root-3985],[data-atmec-layer-root-3986],[data-atmec-layer-root-3987],[data-atmec-layer-root-3988],[data-atmec-layer-root-3989]'),function(el){
        ['3984','3985','3986','3987','3988','3989'].forEach(function(v){el.removeAttribute('data-atmec-layer-root-'+v);});
      });
      var map=load(), changed=false;
      Object.keys(map||{}).forEach(function(id){ var it=map[id]||{}; ['z3988','z3989','layer3988','layer3989','layer3984','layer3985','layer3986','layer3987','domLayer'].forEach(function(k){ if(k in it){ delete it[k]; changed=true; } }); });
      if(changed) save(map);
    }catch(_e){}
  }
  function bindButton(id,fn){
    var old=document.getElementById(id); if(!old) return;
    if(old.getAttribute('data-atmec-layer-3990')==='1') return;
    var clone=old.cloneNode(true);
    clone.setAttribute('data-atmec-layer-3990','1');
    ['data-atmec-layer-3988','data-atmec-layer-3989','data-atmec-layer-3987','data-atmec-layer-3986','data-atmec-layer-3985','data-atmec-layer-3984','data-atmec-3982-layer'].forEach(function(a){ clone.removeAttribute(a); });
    clone.onclick=null;
    clone.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation(); fn(); return false; },true);
    old.parentNode.replaceChild(clone,old);
  }
  function bind(){ bindButton(BTN_FRONT,front); bindButton(BTN_BACK,back); }
  function addCss(){
    if(document.getElementById('atmec-3990-css')) return;
    var st=document.createElement('style'); st.id='atmec-3990-css';
    st.textContent='body.atmec-layout-edit-on .atmec-editable-3990{outline-offset:2px} body:not(.atmec-layout-edit-on) .atmec-editable-3990{outline:none!important} #atmec-pro-400,#atmec-pro-410,#atmec-pro-420{margin-top:10px;border:1px solid rgba(148,163,184,.35);border-radius:10px;padding:8px;background:rgba(15,23,42,.04)} #atmec-pro-400 summary,#atmec-pro-410 summary,#atmec-pro-420 summary{cursor:pointer;font-weight:800;margin-bottom:8px} #atmec-pro-400 input,#atmec-pro-400 select,#atmec-pro-410 input,#atmec-pro-410 select,#atmec-pro-420 input,#atmec-pro-420 select{width:100%} body.atmec-layout-edit-on .atmec-layout-grouped-410{box-shadow:0 0 0 2px rgba(168,85,247,.55) inset!important}';
    document.head.appendChild(st);
  }
  function boot(){
    window.AT_MEC_LAYOUT_EDITOR_VERSION='4.0';
    addCss(); cleanupOld(); mark(); applySaved(); bind();
    setInterval(function(){ mark(); bind(); },700);
  }
  ready(boot);
  window.atMecLayer3990={front:front,back:back,selected:selected,mark:mark,apply:applySaved,cleanup:cleanupOld};
})();
