(function(){
  'use strict';
  var STORE_KEY='atmec.layout367.v1';
  var enabled=false, gridOn=false, snapOn=false;
  var selected=null, selectedId='', selectedSet=[];
  var referenceEl=null, referenceId='';
  var dragging=null, popDrag=null, copiedSize=null;
  var layout={}, undoStack=[], redoStack=[];
  var PX_PER_MM=3.7895275591;
  var targetSelector='button,input,select,textarea,a,label,[data-ui-id],.prod-action-btn,.prod-result-cell,.prod-info-cell,.kpi-card,.recipe-step-card,.recipe-step-block,.module-card,.card,.panel,.row,.col,div,span,h1,h2,h3,h4,p,b,strong';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  function skipUi(el){ return !!(el && el.closest && (el.closest('#atmec-inspector-358-bar') || el.closest('#atmec-inspector-358-pop') || el.closest('#atmec-layout-373-panel') || el.closest('#atmec-layout-manager-362-panel') || el.classList.contains('atmec-layout-handle-358') || el.id==='atmec-inspector-358-grid')); }
  function textOf(el){ return String((el && (el.innerText||el.textContent||el.value||el.placeholder||el.id||el.name))||'').replace(/\s+/g,' ').trim().slice(0,42); }
  function slug(s){ return String(s||'element').toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'').slice(0,52) || 'element'; }
  function pageName(el){ var p=el.closest('[id$="-tab"], .page, section, main, #login-gate, #app-shell, body'); if(!p) return 'page.unknown'; if(p.id) return 'page.'+slug(p.id); var cls=String(p.className||'').split(/\s+/).filter(Boolean)[0]||p.tagName; return 'page.'+slug(cls); }
  function baseRole(el){
    if(el.dataset && el.dataset.uiId) return el.dataset.uiId;
    if(el.id) return '#'+el.id;
    var tag=(el.tagName||'el').toLowerCase();
    if(tag==='button') return 'button.'+slug(textOf(el)||'button');
    if(tag==='input') return 'input.'+slug(el.getAttribute('placeholder')||el.name||el.type||'input');
    if(tag==='select') return 'select.'+slug(el.name||el.id||'select');
    if(tag==='textarea') return 'textarea.'+slug(el.placeholder||el.name||'textarea');
    if(el.classList && el.classList.length) return tag+'.'+Array.from(el.classList).slice(0,2).map(slug).filter(Boolean).join('.');
    return tag+'.'+slug(textOf(el)||tag);
  }
  function ensureAutoIds(){
    var counts={};
    Array.prototype.forEach.call(document.querySelectorAll(targetSelector),function(el){
      if(skipUi(el)) return;
      if(!el.dataset.atmecUid){ try{ el.dataset.atmecUid='u'+Math.random().toString(36).slice(2,9); }catch(_e){} }
      var root=pageName(el)+'.'+baseRole(el);
      counts[root]=(counts[root]||0)+1;
      var suffix=(counts[root]>1?'.'+counts[root]:'')+'.'+(el.dataset.atmecUid||'uid');
      try{ if(!el.dataset.uiId) el.dataset.atmecAutoId=root+suffix; else el.dataset.atmecAutoId=el.dataset.uiId+'.'+(el.dataset.atmecUid||'uid'); }catch(_e){}
    });
  }
  function roleName(el){ return (el && el.dataset && (el.dataset.atmecAutoId || el.dataset.uiId)) || 'element.unknown'; }
  function esc(v){ return String(v||'').replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }
  function n(v,d){ v=Number(v); return isFinite(v)?v:d; }
  function gridSize(){ var s=document.getElementById('atmec-grid-size-358'); return n(s&&s.value,20)||20; }
  function snap(v){ if(!snapOn) return Math.round(v); var g=gridSize(); return Math.round(v/g)*g; }
  function pxToMm(px){ return Math.round((Number(px)||0)/PX_PER_MM*10)/10; }
  function mmToPx(mm){ return Math.round((Number(mm)||0)*PX_PER_MM); }
  function loadLayout(){ try{ layout=JSON.parse(localStorage.getItem(STORE_KEY)||'{}')||{}; }catch(_e){ layout={}; } }
  function saveLayout(){ try{ localStorage.setItem(STORE_KEY,JSON.stringify(layout)); }catch(_e){} }
  function item(id){ layout[id]=layout[id]||{tx:0,ty:0}; return layout[id]; }
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
  function resetElement(el){ if(!el) return; ['transform','width','height','min-width','max-width','min-height','max-height','flex','align-self','z-index'].forEach(function(k){el.style.removeProperty(k);}); }
  function applyItem(el,id){
    var it=layout[id]; if(!el || !it) return;
    isolateSingleElement(el);
    el.style.setProperty('transform','translate('+Math.round(n(it.tx,0))+'px,'+Math.round(n(it.ty,0))+'px)','important');
    if(it.w) { el.style.setProperty('width',Math.round(it.w)+'px','important'); el.style.setProperty('min-width',Math.round(it.w)+'px','important'); el.style.setProperty('max-width',Math.round(it.w)+'px','important'); }
    if(it.h) { el.style.setProperty('height',Math.round(it.h)+'px','important'); el.style.setProperty('min-height',Math.round(it.h)+'px','important'); el.style.setProperty('max-height',Math.round(it.h)+'px','important'); }
    if(it.z) el.style.setProperty('z-index',String(it.z),'important');
    if(it.hidden) el.style.setProperty('display','none','important');
  }
  function applyAll(){ ensureAutoIds(); Array.prototype.forEach.call(document.querySelectorAll(targetSelector),function(el){ var id=roleName(el); if(layout[id]) applyItem(el,id); }); }
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
  function openPop(el,e){
    var pop=document.getElementById('atmec-inspector-358-pop'); if(!pop) return;
    var r=el.getBoundingClientRect(), it=item(roleName(el)); var w=Math.round(it.w||r.width), h=Math.round(it.h||r.height);
    pop.innerHTML='<div class="head"><span>Layout elemento</span><button id="atmec-pop-close-358" type="button">×</button></div><div class="body"><code>'+esc(roleName(el))+'</code><div class="muted">Giallo = selezionati. Verde = riferimento persistente. CTRL+click seleziona più elementi.</div><div class="grid2"><label>X px<input id="atmec-prop-x-358" type="number" value="'+Math.round(r.left)+'"></label><label>Y px<input id="atmec-prop-y-358" type="number" value="'+Math.round(r.top)+'"></label><label>W px<input id="atmec-prop-w-358" type="number" value="'+w+'"></label><label>H px<input id="atmec-prop-h-358" type="number" value="'+h+'"></label><label>W mm<input id="atmec-prop-wmm-358" type="number" step="0.1" value="'+pxToMm(w)+'"></label><label>H mm<input id="atmec-prop-hmm-358" type="number" step="0.1" value="'+pxToMm(h)+'"></label></div><div class="actions"><button class="primary" id="atmec-apply-xywh-358" type="button">Applica numeri</button><button id="atmec-show-handles-358" type="button">Mostra handle</button><button id="atmec-set-ref-367" type="button">Imposta riferimento</button><button id="atmec-clear-ref-372" type="button">Cancella riferimento</button><button id="atmec-align-left-372" type="button">X sinistra</button><button id="atmec-align-cx-372" type="button">X centro</button><button id="atmec-align-right-372" type="button">X destra</button><button id="atmec-align-top-372" type="button">Y alto</button><button id="atmec-align-cy-372" type="button">Y centro</button><button id="atmec-align-bottom-372" type="button">Y basso</button><button id="atmec-copy-w-ref-367" type="button">W rif.</button><button id="atmec-copy-h-ref-367" type="button">H rif.</button><button id="atmec-copy-wh-ref-367" type="button">W+H rif.</button></div><div class="grid2"><label>Spazio X px<input id="atmec-gap-x-372" type="number" value="20"></label><label>Spazio Y px<input id="atmec-gap-y-372" type="number" value="20"></label></div><div class="actions"><button id="atmec-dist-x-372" type="button">Distribuisci X</button><button id="atmec-dist-y-372" type="button">Distribuisci Y</button><button id="atmec-copy-size-358" type="button">Copia dim.</button><button id="atmec-paste-size-358" type="button">Incolla dim.</button><button id="atmec-save-layout-358" type="button">Salva</button><button class="danger" id="atmec-reset-one-358" type="button">Reset elemento</button><button class="danger" id="atmec-reset-all-358" type="button">Reset tutto</button></div><div class="muted" id="atmec-pop-status-358">Riferimento: '+esc(referenceId||'nessuno')+'</div></div>';
    if(!pop.dataset.userMoved){ var x=Math.min(window.innerWidth-410,Math.max(8,(e&&e.clientX?e.clientX:r.left)+12)), y=Math.min(window.innerHeight-270,Math.max(44,(e&&e.clientY?e.clientY:r.top)+12)); pop.style.left=x+'px'; pop.style.top=y+'px'; }
    pop.style.display='block'; bindPop();
  }
  function updateInputs(){ if(!selected) return; var r=selected.getBoundingClientRect(), it=item(selectedId); [['x',Math.round(r.left)],['y',Math.round(r.top)],['w',Math.round(it.w||r.width)],['h',Math.round(it.h||r.height)],['wmm',pxToMm(it.w||r.width)],['hmm',pxToMm(it.h||r.height)]].forEach(function(a){var el=document.getElementById('atmec-prop-'+a[0]+'-358'); if(el) el.value=a[1];}); }
  function applyNumeric(){ if(!selected || !selectedId) return; pushUndo(); var r=selected.getBoundingClientRect(), it=item(selectedId); var last=window.__atmecLastPropInput358||''; var x=n(document.getElementById('atmec-prop-x-358')&&document.getElementById('atmec-prop-x-358').value,r.left); var y=n(document.getElementById('atmec-prop-y-358')&&document.getElementById('atmec-prop-y-358').value,r.top); var w=n(document.getElementById('atmec-prop-w-358')&&document.getElementById('atmec-prop-w-358').value,it.w||r.width); var h=n(document.getElementById('atmec-prop-h-358')&&document.getElementById('atmec-prop-h-358').value,it.h||r.height); if(last==='wmm') w=mmToPx(document.getElementById('atmec-prop-wmm-358').value); if(last==='hmm') h=mmToPx(document.getElementById('atmec-prop-hmm-358').value); it.tx=n(it.tx,0)+(snap(x)-r.left); it.ty=n(it.ty,0)+(snap(y)-r.top); it.w=Math.max(10,snap(w)); it.h=Math.max(10,snap(h)); applyItem(selected,selectedId); saveLayout(); updateInputs(); updateHandles(); popStatus('Applicato a SOLO: '+selectedId+'  W='+it.w+' H='+it.h); }
  function setReference(){ if(!selected) return; if(referenceEl) referenceEl.classList.remove('atmec-layout-ref-367'); referenceEl=selected; referenceId=selectedId; referenceEl.classList.add('atmec-layout-ref-367'); updateBar(); popStatus('Riferimento impostato: '+referenceId); }
  function clearReference(){ if(referenceEl) referenceEl.classList.remove('atmec-layout-ref-367'); referenceEl=null; referenceId=''; updateBar(); popStatus('Riferimento cancellato'); }
  function applyToTargets(fn){ if(!referenceEl){ popStatus('Prima seleziona un elemento e premi Imposta riferimento'); return; } var targets=targetsForApply().filter(function(x){return x.el && x.el!==referenceEl;}); if(!targets.length){ popStatus('Seleziona uno o più elementi da allineare con CTRL+click'); return; } pushUndo(); targets.forEach(function(x){ fn(x.el,x.id); applyItem(x.el,x.id); }); saveLayout(); updateHandles(); if(selected) openPop(selected,null); popStatus('Applicato a '+targets.length+' elementi'); }
  function alignToRef(kind){ if(!referenceEl) return popStatus('Manca riferimento'); var rr=referenceEl.getBoundingClientRect(); applyToTargets(function(el,id){ var r=el.getBoundingClientRect(); if(kind==='left') setAbsLeft(el,id,rr.left); if(kind==='cx') setAbsLeft(el,id,rr.left+rr.width/2-r.width/2); if(kind==='right') setAbsLeft(el,id,rr.right-r.width); if(kind==='top') setAbsTop(el,id,rr.top); if(kind==='cy') setAbsTop(el,id,rr.top+rr.height/2-r.height/2); if(kind==='bottom') setAbsTop(el,id,rr.bottom-r.height); }); }
  function copyRefSize(what){ if(!referenceEl) return popStatus('Manca riferimento'); var rr=referenceEl.getBoundingClientRect(); applyToTargets(function(el,id){ var it=item(id); if(what==='w'||what==='wh') it.w=Math.max(10,Math.round(rr.width)); if(what==='h'||what==='wh') it.h=Math.max(10,Math.round(rr.height)); }); }
  function distribute(axis){ var targets=targetsForApply().filter(function(x){return x.el;}); if(targets.length<2) return popStatus('Seleziona almeno 2 elementi con CTRL+click'); var gap=n(document.getElementById(axis==='x'?'atmec-gap-x-372':'atmec-gap-y-372')&&document.getElementById(axis==='x'?'atmec-gap-x-372':'atmec-gap-y-372').value,20); pushUndo(); var arr=targets.map(function(x){ var r=x.el.getBoundingClientRect(); return {el:x.el,id:x.id,r:r}; }).sort(function(a,b){ return axis==='x' ? a.r.left-b.r.left : a.r.top-b.r.top; }); var pos=axis==='x'?arr[0].r.left:arr[0].r.top; arr.forEach(function(x,i){ if(i>0){ if(axis==='x') setAbsLeft(x.el,x.id,pos); else setAbsTop(x.el,x.id,pos); } applyItem(x.el,x.id); var nr=x.el.getBoundingClientRect(); pos += (axis==='x'?nr.width:nr.height) + gap; }); saveLayout(); updateHandles(); if(selected) openPop(selected,null); popStatus('Distribuiti '+arr.length+' elementi con spazio '+gap+' px'); }
  function bindPop(){
    var c=document.getElementById('atmec-pop-close-358'); if(c) c.onclick=function(){document.getElementById('atmec-inspector-358-pop').style.display='none';};
    var a=document.getElementById('atmec-apply-xywh-358'); if(a) a.onclick=applyNumeric;
    var sh=document.getElementById('atmec-show-handles-358'); if(sh) sh.onclick=updateHandles;
    var sr=document.getElementById('atmec-set-ref-367'); if(sr) sr.onclick=setReference;
    var cr=document.getElementById('atmec-clear-ref-372'); if(cr) cr.onclick=clearReference;
    [['atmec-align-left-372','left'],['atmec-align-cx-372','cx'],['atmec-align-right-372','right'],['atmec-align-top-372','top'],['atmec-align-cy-372','cy'],['atmec-align-bottom-372','bottom']].forEach(function(p){var b=document.getElementById(p[0]); if(b)b.onclick=function(){alignToRef(p[1]);};});
    var cw=document.getElementById('atmec-copy-w-ref-367'); if(cw) cw.onclick=function(){copyRefSize('w');}; var ch=document.getElementById('atmec-copy-h-ref-367'); if(ch) ch.onclick=function(){copyRefSize('h');}; var cwh=document.getElementById('atmec-copy-wh-ref-367'); if(cwh) cwh.onclick=function(){copyRefSize('wh');};
    var dx=document.getElementById('atmec-dist-x-372'); if(dx) dx.onclick=function(){distribute('x');}; var dy=document.getElementById('atmec-dist-y-372'); if(dy) dy.onclick=function(){distribute('y');};
    var sv=document.getElementById('atmec-save-layout-358'); if(sv) sv.onclick=function(){saveLayout();popStatus('Layout salvato');};
    var rs=document.getElementById('atmec-reset-one-358'); if(rs) rs.onclick=function(){ if(!selectedId)return; pushUndo(); delete layout[selectedId]; resetElement(selected); saveLayout(); updateHandles(); openPop(selected,null);};
    var ra=document.getElementById('atmec-reset-all-358'); if(ra) ra.onclick=function(){layout={};saveLayout();location.reload();};
    var cs=document.getElementById('atmec-copy-size-358'); if(cs) cs.onclick=function(){ if(!selected)return; var r=selected.getBoundingClientRect(), it=item(selectedId); copiedSize={w:n(it.w,r.width),h:n(it.h,r.height)}; popStatus('Dimensioni copiate');};
    var ps=document.getElementById('atmec-paste-size-358'); if(ps) ps.onclick=function(){ if(!selected||!copiedSize)return; pushUndo(); var it=item(selectedId); it.w=copiedSize.w; it.h=copiedSize.h; applyItem(selected,selectedId); saveLayout(); updateInputs(); updateHandles();};
    ['x','y','w','h','wmm','hmm'].forEach(function(k){ var inp=document.getElementById('atmec-prop-'+k+'-358'); if(inp){ inp.oninput=function(){window.__atmecLastPropInput358=k;}; inp.onkeydown=function(e){window.__atmecLastPropInput358=k;if(e.key==='Enter')applyNumeric();}; }});
  }
  function updateHandles(){ var mh=document.getElementById('atmec-move-handle-358'), rh=document.getElementById('atmec-resize-handle-358'); if(!enabled||!selected||!mh||!rh){hideHandles();return;} var r=selected.getBoundingClientRect(); mh.style.display='block'; rh.style.display='flex'; mh.style.left=Math.max(4,Math.min(window.innerWidth-72,r.left))+'px'; mh.style.top=Math.max(40,r.top-32)+'px'; rh.style.left=Math.max(4,Math.min(window.innerWidth-28,r.right-10))+'px'; rh.style.top=Math.max(44,Math.min(window.innerHeight-28,r.bottom-10))+'px'; }
  function hideHandles(){ var mh=document.getElementById('atmec-move-handle-358'), rh=document.getElementById('atmec-resize-handle-358'); if(mh)mh.style.display='none'; if(rh)rh.style.display='none'; }
  function beginDrag(kind,e){ if(!enabled||!selected||!selectedId)return; e.preventDefault(); e.stopPropagation(); pushUndo(); var r=selected.getBoundingClientRect(), it=item(selectedId); dragging={kind:kind,sx:e.clientX,sy:e.clientY,tx:n(it.tx,0),ty:n(it.ty,0),w:n(it.w,r.width),h:n(it.h,r.height)}; document.addEventListener('mousemove',onDrag,true); document.addEventListener('mouseup',endDrag,true); }
  function onDrag(e){ if(!dragging||!selected)return; e.preventDefault(); var dx=e.clientX-dragging.sx, dy=e.clientY-dragging.sy, it=item(selectedId); if(dragging.kind==='move'){it.tx=snap(dragging.tx+dx);it.ty=snap(dragging.ty+dy);} else {it.w=Math.max(10,snap(dragging.w+dx));it.h=Math.max(10,snap(dragging.h+dy));} applyItem(selected,selectedId); updateInputs(); updateHandles(); }
  function endDrag(){ if(!dragging)return; dragging=null; saveLayout(); updateHandles(); openPop(selected,null); document.removeEventListener('mousemove',onDrag,true); document.removeEventListener('mouseup',endDrag,true); }
  function beginPopDrag(e){ var pop=document.getElementById('atmec-inspector-358-pop'); if(!pop|| (e.target&&e.target.tagName==='BUTTON')) return; var r=pop.getBoundingClientRect(); pop.dataset.userMoved='1'; popDrag={sx:e.clientX,sy:e.clientY,l:r.left,t:r.top}; document.addEventListener('mousemove',onPopDrag,true); document.addEventListener('mouseup',endPopDrag,true); }
  function onPopDrag(e){ if(!popDrag)return; var pop=document.getElementById('atmec-inspector-358-pop'); pop.style.left=Math.max(4,Math.min(window.innerWidth-80,popDrag.l+e.clientX-popDrag.sx))+'px'; pop.style.top=Math.max(40,Math.min(window.innerHeight-40,popDrag.t+e.clientY-popDrag.sy))+'px'; }
  function endPopDrag(){ popDrag=null; document.removeEventListener('mousemove',onPopDrag,true); document.removeEventListener('mouseup',endPopDrag,true); }
  function setEnabled(v){ enabled=!!v; document.body.classList.toggle('atmec-layout-edit-on',enabled); if(!enabled){ clearSel(); clearReference(); var p=document.getElementById('atmec-inspector-358-pop');if(p)p.style.display='none'; } updateBar(); }
  function setGrid(v){ gridOn=!!v; document.body.classList.toggle('atmec-layout-grid-on',gridOn); var b=document.getElementById('atmec-grid-toggle-358'); if(b){b.textContent=gridOn?'Griglia ON':'Griglia OFF';b.classList.toggle('on',gridOn);} }
  function setSnap(v){ snapOn=!!v; var b=document.getElementById('atmec-snap-toggle-358'); if(b){b.textContent=snapOn?'Snap ON':'Snap OFF';b.classList.toggle('on',snapOn);} }
  function bestTarget(e){ var el=e.target; if(!el||skipUi(el)) return null; if(el.closest){ var best=el.closest('button,input,select,textarea,a,[data-ui-id],.prod-action-btn,.prod-result-cell,.prod-info-cell,.kpi-card,.recipe-step-card,.recipe-step-block,.module-card,.card,.panel'); if(best && !skipUi(best)) return best; } return el; }
  function clickHandler(e){ if(!enabled)return; var el=bestTarget(e); if(!el)return; e.preventDefault(); e.stopPropagation(); select(el,e); }
  function makeUi(){ if(document.getElementById('atmec-inspector-358-bar')) return; var grid=document.createElement('div'); grid.id='atmec-inspector-358-grid'; document.body.appendChild(grid); var bar=document.createElement('div'); bar.id='atmec-inspector-358-bar'; bar.innerHTML='<button id="atmec-inspector-358-toggle" type="button">Layout OFF</button><button id="atmec-grid-toggle-358" type="button">Griglia OFF</button><button id="atmec-snap-toggle-358" type="button">Snap OFF</button><select id="atmec-grid-size-358"><option value="5">5px</option><option value="10">10px</option><option value="20" selected>20px</option><option value="50">50px</option></select><button id="atmec-undo-358" type="button">↶</button><button id="atmec-redo-358" type="button">↷</button><button id="atmec-inspector-358-copy" type="button" disabled>Copia ID</button><span class="idbox" id="atmec-inspector-358-current">clicca un elemento</span>'; document.body.appendChild(bar); var pop=document.createElement('div'); pop.id='atmec-inspector-358-pop'; document.body.appendChild(pop); var mh=document.createElement('div'); mh.id='atmec-move-handle-358'; mh.className='atmec-layout-handle-358'; mh.textContent='Sposta'; document.body.appendChild(mh); var rh=document.createElement('div'); rh.id='atmec-resize-handle-358'; rh.className='atmec-layout-handle-358'; rh.textContent='↘'; document.body.appendChild(rh); document.getElementById('atmec-inspector-358-toggle').onclick=function(){setEnabled(!enabled);}; document.getElementById('atmec-grid-toggle-358').onclick=function(){setGrid(!gridOn);}; document.getElementById('atmec-snap-toggle-358').onclick=function(){setSnap(!snapOn);}; document.getElementById('atmec-grid-size-358').onchange=function(){var g=gridSize();grid.style.backgroundSize=g+'px '+g+'px';}; document.getElementById('atmec-undo-358').onclick=undo; document.getElementById('atmec-redo-358').onclick=redo; document.getElementById('atmec-inspector-358-copy').onclick=function(){if(selectedId)try{navigator.clipboard.writeText(selectedId);}catch(_e){}}; mh.addEventListener('mousedown',function(e){beginDrag('move',e);},true); rh.addEventListener('mousedown',function(e){beginDrag('resize',e);},true); pop.addEventListener('mousedown',function(e){if(e.target&&e.target.closest&&e.target.closest('.head'))beginPopDrag(e);},true); updateBar(); }
  ready(function(){ loadLayout(); ensureAutoIds(); makeUi(); applyAll(); document.addEventListener('click',clickHandler,true); window.addEventListener('resize',updateHandles); window.addEventListener('scroll',updateHandles,true); setEnabled(false); setGrid(false); setSnap(false); });
  window.atMecLayoutInspector358={enable:function(){setEnabled(true);},disable:function(){setEnabled(false);},toggle:function(){setEnabled(!enabled);},current:function(){return selectedId;},reference:function(){return referenceId;},reset:function(){layout={};saveLayout();location.reload();},undo:undo,redo:redo,layout:function(){return layout;}};
})();
