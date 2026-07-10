// AT-MEC HM 4.20A4 - Label Industrial Integration, Recipe Binding & Test Mode Workflow
(function(){
  'use strict';
  var STORAGE_KEY = 'atmec_label_manager_420A2_templates';
  var CONFIG_KEY = 'atmec_label_manager_420A3_config';
  var BINDINGS_KEY = 'atmec_label_manager_420A3_recipe_bindings';
  var PRINT_LOG_KEY = 'atmec_label_print_log_420A3';
  var selectedId = null;
  var dragState = null;

  function $(id){ return document.getElementById(id); }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function uid(){ return 'el_' + Math.random().toString(36).slice(2,9); }
  function num(v, fallback){ var n = Number(v); return Number.isFinite(n) ? n : fallback; }
  function getElVal(id, fallback){ var el=$(id); return el && el.value !== '' ? el.value : fallback; }
  function setElVal(id, value){ var el=$(id); if(el && value !== undefined && value !== null) el.value = value; }

  function getStation(){
    try{
      var cfg = JSON.parse(localStorage.getItem('atmec_factory_station_config_418B') || localStorage.getItem('atmec_station_config') || '{}');
      return cfg.stationName || cfg.station_name || localStorage.getItem('atmec_station_name') || 'Postazione locale';
    }catch(e){ return localStorage.getItem('atmec_station_name') || 'Postazione locale'; }
  }
  function getStationId(){
    try{
      var cfg = JSON.parse(localStorage.getItem('atmec_factory_station_config_418B') || localStorage.getItem('atmec_station_config') || '{}');
      return cfg.stationId || cfg.station_id || localStorage.getItem('atmec_station_id') || 'STATION_LOCAL';
    }catch(e){ return localStorage.getItem('atmec_station_id') || 'STATION_LOCAL'; }
  }
  function currentUser(){
    try{ return (window.currentUser && (window.currentUser.username || window.currentUser.name)) || localStorage.getItem('atmec_current_user') || 'Admin'; }
    catch(e){ return 'Admin'; }
  }
  function getRuntimeFields(){
    return {
      SERIALE:getElVal('label420-serial','SN12345'),
      SN:getElVal('label420-serial','SN12345'),
      COMMESSA:getElVal('label420-workorder','COMM001'),
      WO:getElVal('label420-workorder','COMM001'),
      LOTTO:getElVal('label420-lot','LOT001'),
      LOT:getElVal('label420-lot','LOT001'),
      RICETTA:getElVal('label420-recipe','TEST_24V'),
      RECIPE:getElVal('label420-recipe','TEST_24V'),
      REVISIONE:getElVal('label420-recipe-rev','REV A'),
      REV:getElVal('label420-recipe-rev','REV A'),
      CLIENTE:getElVal('label420-customer','Cliente'),
      CUSTOMER:getElVal('label420-customer','Cliente'),
      ESITO:getTemplate(),
      RESULT:getTemplate(),
      FIRMWARE:getElVal('label420-fw','FW 1.0'),
      FW:getElVal('label420-fw','FW 1.0'),
      OPERATORE:currentUser(),
      OPERATOR:currentUser(),
      STAZIONE:getStation(),
      STATION:getStation(),
      STATION_ID:getStationId(),
      DATA_ORA:new Date().toLocaleString(),
      REPORT_ID:getElVal('label420-report','RPT-0001'),
      QR_PAYLOAD:getElVal('label420-qr-payload','SN=${SERIALE};LOT=${LOTTO};WO=${COMMESSA};RESULT=${ESITO}'),
      DATAMATRIX_PAYLOAD:getElVal('label420-dm-payload','SN=${SERIALE};LOT=${LOTTO};WO=${COMMESSA};RESULT=${ESITO}')
    };
  }
  function resolveText(text){
    var map = getRuntimeFields();
    return String(text || '').replace(/\$\{([^}]+)\}/g, function(_m,k){ return map[String(k).trim().toUpperCase()] ?? ''; });
  }
  function getTemplate(){ return getElVal('label420-template','PASS'); }
  function getTemplateClass(t){
    if(t === 'FAIL') return 'fail'; if(t === 'ERROR') return 'fail'; if(t === 'REPAIR') return 'repair'; if(t === 'LOTTO') return 'lotto'; if(t === 'CAMPIONE') return 'campione'; return 'pass';
  }
  function formatSize(fmt){
    if(fmt === '50x25') return {w:50,h:25};
    if(fmt === '50x30') return {w:50,h:30};
    if(fmt === '60x40') return {w:60,h:40};
    if(fmt === '80x50') return {w:80,h:50};
    if(fmt === '100x50') return {w:100,h:50};
    if(fmt === 'custom'){
      var w=num(getElVal('label420-custom-w',60),60); var h=num(getElVal('label420-custom-h',40),40);
      return {w:Math.max(20, Math.min(200,w)), h:Math.max(10, Math.min(150,h))};
    }
    return {w:60,h:40};
  }
  function currentFormat(){ return getElVal('label420-format','60x40'); }
  function pxPerMm(){
    var canvas = $('label420-preview');
    var size = formatSize(currentFormat());
    var rect = canvas ? canvas.getBoundingClientRect() : {width:360};
    return Math.max(1, rect.width / size.w);
  }
  function defaultElements(template){
    var t = template || 'PASS';
    var status = t;
    return [
      {id:uid(),type:'text',text:'MIRZA / AT-MEC HM',x:4,y:3,w:30,h:5,font:3,align:'left'},
      {id:uid(),type:'text',text:status,x:42,y:3,w:14,h:5,font:3,align:'center',tag:'status'},
      {id:uid(),type:'field',text:'${SERIALE}',x:4,y:10,w:36,h:8,font:7,align:'left'},
      {id:uid(),type:'field',text:'LOT ${LOTTO} · ${COMMESSA}',x:4,y:19,w:36,h:4,font:2.5,align:'left'},
      {id:uid(),type:'field',text:'Ricetta: ${RICETTA} Rev ${REVISIONE}',x:4,y:24,w:34,h:4,font:2.4,align:'left'},
      {id:uid(),type:'field',text:'Stazione: ${STATION_ID}',x:4,y:29,w:34,h:4,font:2.4,align:'left'},
      {id:uid(),type:'qr',text:'${QR_PAYLOAD}',x:44,y:14,w:12,h:12,font:2,align:'center'},
      {id:uid(),type:'datamatrix',text:'${DATAMATRIX_PAYLOAD}',x:44,y:28,w:10,h:10,font:2,align:'center'},
      {id:uid(),type:'barcode',text:'${SERIALE}',x:4,y:34,w:35,h:4,font:2,align:'center'}
    ];
  }
  function loadTemplates(){
    try{
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      ['PASS','FAIL','ERROR','REPAIR','LOTTO','CAMPIONE'].forEach(function(t){ if(!saved[t]) saved[t] = {elements:defaultElements(t)}; });
      return saved;
    }catch(e){
      var o={}; ['PASS','FAIL','ERROR','REPAIR','LOTTO','CAMPIONE'].forEach(function(t){ o[t]={elements:defaultElements(t)}; }); return o;
    }
  }
  function saveTemplates(data){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }catch(e){} }
  function getCurrentElements(){ var data = loadTemplates(); var t = getTemplate(); return data[t] && data[t].elements ? data[t].elements : defaultElements(t); }
  function setCurrentElements(elements){ var data = loadTemplates(); var t = getTemplate(); data[t] = data[t] || {}; data[t].elements = elements; saveTemplates(data); }

  function renderElement(el){
    var p = pxPerMm();
    var div = document.createElement('div');
    div.className = 'label420-design-el type-' + esc(el.type) + (el.id === selectedId ? ' selected' : '');
    div.dataset.id = el.id;
    div.style.left = (el.x * p) + 'px'; div.style.top = (el.y * p) + 'px';
    div.style.width = (el.w * p) + 'px'; div.style.height = (el.h * p) + 'px';
    div.style.fontSize = Math.max(8, el.font * p * .72) + 'px'; div.style.textAlign = el.align || 'left';
    var content = resolveText(el.text || '');
    if(el.type === 'qr') div.innerHTML = '<div class="label420-codebox">QR</div><small>'+esc(content).slice(0,38)+'</small>';
    else if(el.type === 'datamatrix') div.innerHTML = '<div class="label420-codebox matrix">DM</div><small>'+esc(content).slice(0,38)+'</small>';
    else if(el.type === 'barcode') div.innerHTML = '<div class="label420-barcode">|||| ||| || |||| |</div><small>'+esc(content).slice(0,40)+'</small>';
    else if(el.type === 'logo') div.innerHTML = '<div class="label420-logo-mini">MEC</div>';
    else div.innerHTML = esc(content);
    div.addEventListener('mousedown', function(ev){ startDrag(ev, el.id); });
    div.addEventListener('click', function(ev){ ev.stopPropagation(); selectElement(el.id); });
    return div;
  }
  function renderPreview(){
    var canvas = $('label420-preview'); if(!canvas) return;
    var template = getTemplate(); var fmt = currentFormat(); var size = formatSize(fmt);
    var cls = getTemplateClass(template);
    canvas.className = 'label420-preview label420-designer-canvas ' + cls + (getElVal('label420-grid','on') === 'off' ? ' no-grid' : '');
    canvas.dataset.format = fmt;
    canvas.style.width = Math.round(size.w * 6) + 'px';
    canvas.style.height = Math.round(size.h * 6) + 'px';
    canvas.innerHTML = '';
    getCurrentElements().forEach(function(el){ canvas.appendChild(renderElement(el)); });
    var info = $('label420-format-info'); if(info) info.textContent = size.w + ' × ' + size.h + ' mm';
    updateInspector(); renderLists(); saveConfig(false);
  }
  function selectElement(id){ selectedId = id; renderPreview(); updateInspector(); }
  function selectedElement(){ return getCurrentElements().find(function(e){return e.id === selectedId;}); }
  function updateInspector(){
    var el = selectedElement();
    var empty = $('label420-inspector-empty'), form = $('label420-inspector-form'), info = $('label420-selected-info');
    if(!el){ if(empty) empty.style.display='block'; if(form) form.style.display='none'; if(info) info.textContent='Nessun elemento selezionato'; return; }
    if(empty) empty.style.display='none'; if(form) form.style.display='block'; if(info) info.textContent = el.type + ' · ' + el.id;
    setElVal('label420-prop-text', el.text); setElVal('label420-prop-x', el.x); setElVal('label420-prop-y', el.y); setElVal('label420-prop-w', el.w); setElVal('label420-prop-h', el.h); setElVal('label420-prop-font', el.font); setElVal('label420-prop-align', el.align || 'left');
  }
  function updateSelectedLabelElement420A2(){
    var els = getCurrentElements(); var el = els.find(function(e){return e.id === selectedId;}); if(!el) return;
    el.text = getElVal('label420-prop-text', el.text);
    el.x = num(getElVal('label420-prop-x', el.x), el.x); el.y = num(getElVal('label420-prop-y', el.y), el.y);
    el.w = Math.max(2, num(getElVal('label420-prop-w', el.w), el.w)); el.h = Math.max(2, num(getElVal('label420-prop-h', el.h), el.h));
    el.font = Math.max(1, num(getElVal('label420-prop-font', el.font), el.font)); el.align = getElVal('label420-prop-align', el.align || 'left');
    setCurrentElements(els); renderPreview();
  }
  function startDrag(ev, id){
    ev.preventDefault(); ev.stopPropagation(); selectElement(id);
    var el = selectedElement(); if(!el) return;
    dragState = {id:id,startX:ev.clientX,startY:ev.clientY,origX:el.x,origY:el.y};
    document.addEventListener('mousemove', onDrag); document.addEventListener('mouseup', stopDrag);
  }
  function onDrag(ev){
    if(!dragState) return;
    var p = pxPerMm(); var dx = (ev.clientX - dragState.startX) / p; var dy = (ev.clientY - dragState.startY) / p;
    var els = getCurrentElements(); var el = els.find(function(e){return e.id === dragState.id;}); if(!el) return;
    var size = formatSize(currentFormat());
    el.x = Math.max(0, Math.min(size.w - el.w, Math.round(dragState.origX + dx)));
    el.y = Math.max(0, Math.min(size.h - el.h, Math.round(dragState.origY + dy)));
    setCurrentElements(els); renderPreview();
  }
  function stopDrag(){ dragState=null; document.removeEventListener('mousemove', onDrag); document.removeEventListener('mouseup', stopDrag); }
  function addLabelElement420A2(type){
    var textMap = {text:'Nuovo testo',field:'${SERIALE}',logo:'MEC',qr:'SN=${SERIALE}',barcode:'${SERIALE}',datamatrix:'SN=${SERIALE};LOT=${LOTTO}'};
    var sizeMap = {logo:[14,8],qr:[12,12],barcode:[30,5],datamatrix:[12,12]}; var s=sizeMap[type] || [24,5];
    var els = getCurrentElements(); var el = {id:uid(),type:type,text:textMap[type] || 'Elemento',x:5,y:5,w:s[0],h:s[1],font:type==='text'?3:2.4,align:type==='text'?'left':'center'};
    els.push(el); setCurrentElements(els); selectedId=el.id; renderPreview();
  }
  function duplicateLabelElement420A2(){ var el=selectedElement(); if(!el) return; var els=getCurrentElements(); var n=clone(el); n.id=uid(); n.x+=3; n.y+=3; els.push(n); setCurrentElements(els); selectedId=n.id; renderPreview(); }
  function deleteLabelElement420A2(){ if(!selectedId) return; setCurrentElements(getCurrentElements().filter(function(e){return e.id!==selectedId;})); selectedId=null; renderPreview(); }
  function switchLabelTemplate420A2(){ selectedId=null; loadLabelManager420A2(); }
  function applyLabelFormat420A2(){ renderPreview(); }
  function applyLabelGrid420A2(){ renderPreview(); }

  function renderLists(){
    var templates = $('label420-template-list');
    if(templates){ templates.innerHTML = ['PASS','FAIL','ERROR','REPAIR','LOTTO','CAMPIONE'].map(function(t){return '<div class="label420-row"><b>'+t+'</b><span>Template designer</span></div>';}).join(''); }
    var fields = $('label420-fields-list');
    if(fields){ fields.innerHTML = ['${SERIALE}','${COMMESSA}','${LOTTO}','${CLIENTE}','${OPERATORE}','${RICETTA}','${REVISIONE}','${FIRMWARE}','${STATION_ID}','${STAZIONE}','${ESITO}','${DATA_ORA}','${REPORT_ID}','${QR_PAYLOAD}','${DATAMATRIX_PAYLOAD}'].map(function(f){return '<div class="label420-row"><b>'+f+'</b><span>Dinamico</span></div>';}).join(''); }
    var ps = $('label420-print-status');
    if(ps){ ps.innerHTML = '<div class="label420-row ok"><b>Windows Printer</b><span>Predisposto</span></div><div class="label420-row ok"><b>Template ricetta</b><span>Binding attivo</span></div><div class="label420-row ok"><b>Auto PASS/FAIL/ERRORE</b><span>Configurabile</span></div><div class="label420-row"><b>Zebra / ZPL</b><span>Driver futuro</span></div><div class="label420-row ok"><b>Log stampe</b><span>Locale</span></div>'; }
  }
  function saveConfig(showToast){
    var cfg = {template:getTemplate(),printer:getElVal('label420-printer','windows-default'),format:currentFormat(),grid:getElVal('label420-grid','on'),autoPass:!!($('label420-auto-pass')&&$('label420-auto-pass').checked),autoFail:!!($('label420-auto-fail')&&$('label420-auto-fail').checked),autoError:!!($('label420-auto-error')&&$('label420-auto-error').checked),qrPayload:getElVal('label420-qr-payload',''),dmPayload:getElVal('label420-dm-payload',''),savedAt:new Date().toISOString()};
    try{ localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); localStorage.setItem('atmec_label_manager_420A1', JSON.stringify(cfg)); }catch(e){}
    if(showToast){ if(window.showToast) window.showToast('Configurazione e template etichette salvati','success'); else console.log('[AT-MEC 4.20A2] Label config saved', cfg); }
  }
  function loadConfig(){
    try{
      var cfg = JSON.parse(localStorage.getItem(CONFIG_KEY) || localStorage.getItem('atmec_label_manager_420A1') || '{}');
      setElVal('label420-template', cfg.template); setElVal('label420-printer', cfg.printer); setElVal('label420-format', cfg.format); setElVal('label420-grid', cfg.grid);
      var ap=$('label420-auto-pass'); if(ap) ap.checked=!!cfg.autoPass; var af=$('label420-auto-fail'); if(af) af.checked=!!cfg.autoFail; var ae=$('label420-auto-error'); if(ae) ae.checked=!!cfg.autoError; setElVal('label420-qr-payload', cfg.qrPayload); setElVal('label420-dm-payload', cfg.dmPayload);
    }catch(e){}
  }
  function saveLabelTemplate420A2(){ saveConfig(true); }
  function printLabelPreview420A2(){ logPrint420A3({kind:'TEST_PRINT',template:getTemplate(),serial:getElVal('label420-serial','SN12345'),workorder:getElVal('label420-workorder','COMM001'),reason:'stampa prova'}); if(window.showToast) window.showToast('Stampa prova registrata. Driver reale Windows/Zebra nella prossima fase Print Engine.','info'); console.log('[AT-MEC 4.20A3] Print preview requested'); }

  function safeParse(v, fallback){ try{return JSON.parse(v||'');}catch(e){return fallback;} }
  function recipeNameOf(r){ return r?.name || r?.recipeName || r?.title || r?.id || r?.code || 'Ricetta senza nome'; }
  function recipeRevOf(r){ return r?.revision || r?.rev || r?.version || r?.recipeVersion || r?.lastRevision || 'ultima'; }
  function collectRecipes420A3(){
    var out=[];
    function add(x){ if(!x) return; if(Array.isArray(x)) x.forEach(add); else if(typeof x==='object') out.push(x); }
    try{ add(window.recipes); add(window.recipeList); add(window.availableRecipes); add(window.allRecipes); add(window.currentRecipe); }catch(e){}
    ['atmec_recipes','recipes','recipeList','atmec_recipe_library','atmec_recipe_versions','atmec_current_recipe'].forEach(function(k){ try{ add(safeParse(localStorage.getItem(k), null)); }catch(e){} });
    try{ var db=safeParse(localStorage.getItem('atmec_enterprise_database_cache'), null); add(db?.recipes); add(db?.recipe_versions); }catch(e){}
    var seen={};
    return out.filter(function(r){ var n=recipeNameOf(r); var key=n+'|'+recipeRevOf(r); if(seen[key]) return false; seen[key]=true; return true; });
  }
  function loadRecipeListForLabels420A3(){
    var sel=$('label420-recipe-select'); if(!sel) return;
    var list=collectRecipes420A3();
    if(!list.length){ sel.innerHTML='<option value="">Nessuna ricetta trovata - usa campi manuali</option>'; setRuntimeStatus420A3('Nessuna ricetta trovata nel runtime. Puoi usare i dati manuali o caricare una ricetta in Recipe Editor.'); return; }
    window.__label420_recipes=list;
    sel.innerHTML='<option value="">Seleziona ricetta...</option>'+list.map(function(r,i){return '<option value="'+i+'">'+esc(recipeNameOf(r))+' · Rev '+esc(recipeRevOf(r))+'</option>';}).join('');
    setRuntimeStatus420A3('Caricate '+list.length+' ricette disponibili per binding etichetta.');
  }
  function selectRecipeForLabel420A3(){
    var list=window.__label420_recipes||collectRecipes420A3(); var idx=Number(getElVal('label420-recipe-select','-1')); var r=list[idx];
    if(!r) return;
    setElVal('label420-recipe', recipeNameOf(r)); setElVal('label420-recipe-rev', recipeRevOf(r));
    setElVal('label420-customer', r.customer || r.client || r.cliente || r.customerName || getElVal('label420-customer',''));
    var revSel=$('label420-revision-select');
    if(revSel){
      var revs=[]; if(Array.isArray(r.revisions)) revs=r.revisions; else if(Array.isArray(r.versions)) revs=r.versions; else revs=[recipeRevOf(r)];
      revSel.innerHTML=revs.map(function(v){ var rv=typeof v==='object'?recipeRevOf(v):v; return '<option value="'+esc(rv)+'">'+esc(rv)+'</option>'; }).join('') || '<option>ultima</option>';
    }
    applyRecipeBinding420A3(recipeNameOf(r)); renderPreview();
  }
  function selectRecipeRevision420A3(){ setElVal('label420-recipe-rev', getElVal('label420-revision-select','ultima')); renderPreview(); }
  function loadBindings420A3(){ return safeParse(localStorage.getItem(BINDINGS_KEY), {}) || {}; }
  function saveBindings420A3(b){ try{ localStorage.setItem(BINDINGS_KEY, JSON.stringify(b)); }catch(e){} }
  function bindTemplateToRecipe420A3(){
    var recipe=getElVal('label420-recipe',''); if(!recipe){ if(window.showToast) window.showToast('Seleziona o inserisci una ricetta prima del binding.','warning'); return; }
    var b=loadBindings420A3(); b[recipe]=b[recipe]||{}; b[recipe][getTemplate()]={template:getTemplate(),revision:getElVal('label420-recipe-rev','ultima'),printer:getElVal('label420-printer','windows-default'),updatedAt:new Date().toISOString()}; saveBindings420A3(b); saveConfig(false);
    setRuntimeStatus420A3('Template '+getTemplate()+' legato alla ricetta '+recipe+' rev '+getElVal('label420-recipe-rev','ultima')+'.'); if(window.showToast) window.showToast('Template legato alla ricetta','success');
  }
  function applyRecipeBinding420A3(recipe){ var b=loadBindings420A3(); if(recipe && b[recipe]){ var m=b[recipe][getTemplate()] || b[recipe].PASS || b[recipe].FAIL; if(m?.printer) setElVal('label420-printer', m.printer); } }
  function applyLabelPayloads420A3(showToast){
    var els=getCurrentElements(); var changed=false; var qr=getElVal('label420-qr-payload',''); var dm=getElVal('label420-dm-payload','');
    els.forEach(function(e){ if(e.type==='qr' && qr){ e.text='${QR_PAYLOAD}'; changed=true; } if(e.type==='datamatrix' && dm){ e.text='${DATAMATRIX_PAYLOAD}'; changed=true; } });
    if(changed) setCurrentElements(els); saveConfig(false); renderPreview(); if(showToast && window.showToast) window.showToast('Payload QR/DataMatrix applicato ai codici','success');
  }
  function logPrint420A3(row){
    var list=safeParse(localStorage.getItem(PRINT_LOG_KEY), []) || [];
    list.push(Object.assign({at:new Date().toISOString(),user:currentUser(),station:getStationId(),recipe:getElVal('label420-recipe',''),revision:getElVal('label420-recipe-rev','')}, row||{}));
    try{ localStorage.setItem(PRINT_LOG_KEY, JSON.stringify(list.slice(-500))); }catch(e){}
  }
  function setRuntimeStatus420A3(msg){ var el=$('label420-runtime-status'); if(el) el.textContent=msg; }
  function findLastTest420A3(serial, workorder){
    var sources=[];
    ['atmec_test_reports','test_reports','atmec_reports','atmec_serial_history','serial_history'].forEach(function(k){ var v=safeParse(localStorage.getItem(k), null); if(Array.isArray(v)) sources=sources.concat(v); });
    try{ if(Array.isArray(window.testReports)) sources=sources.concat(window.testReports); if(Array.isArray(window.serialHistory)) sources=sources.concat(window.serialHistory); }catch(e){}
    serial=String(serial||'').toLowerCase(); workorder=String(workorder||'').toLowerCase();
    return sources.reverse().find(function(r){ var sn=String(r.serial||r.serialNumber||r.sn||'').toLowerCase(); var wo=String(r.workOrder||r.commessa||r.lot||r.lotto||r.lotNumber||'').toLowerCase(); return (!serial || sn.includes(serial)) && (!workorder || wo.includes(workorder)); });
  }
  function fillFromTest420A3(r){ if(!r) return; setElVal('label420-serial', r.serial||r.serialNumber||r.sn||''); setElVal('label420-workorder', r.workOrder||r.commessa||r.lotNumber||''); setElVal('label420-lot', r.lot||r.lotto||r.lotNumber||''); setElVal('label420-recipe', r.recipe||r.recipeName||''); setElVal('label420-recipe-rev', r.recipeRevision||r.revision||r.rev||''); setElVal('label420-report', r.reportId||r.id||''); var res=String(r.result||r.final_result||r.status||'').toUpperCase(); if(res.includes('FAIL')) setElVal('label420-template','FAIL'); else if(res.includes('ERR')) setElVal('label420-template','ERROR'); else if(res.includes('PASS')) setElVal('label420-template','PASS'); renderPreview(); }
  function loadLastTestForReprint420A3(){ var r=findLastTest420A3(getElVal('label420-reprint-serial',''), getElVal('label420-reprint-workorder','')); if(r){ fillFromTest420A3(r); setRuntimeStatus420A3('Ultimo test recuperato per ristampa.'); } else setRuntimeStatus420A3('Nessun test trovato: compila i dati manualmente e stampa.'); }
  function reprintLabel420A3(){ var tpl=getElVal('label420-reprint-template', getTemplate()); setElVal('label420-template', tpl); var sn=getElVal('label420-reprint-serial', getElVal('label420-serial','')); if(sn) setElVal('label420-serial', sn); var wo=getElVal('label420-reprint-workorder', getElVal('label420-workorder','')); if(wo) setElVal('label420-workorder', wo); renderPreview(); logPrint420A3({kind:'REPRINT',template:tpl,serial:getElVal('label420-serial',''),workorder:getElVal('label420-workorder',''),reason:getElVal('label420-reprint-reason','')}); setRuntimeStatus420A3('Ristampa registrata per seriale '+getElVal('label420-serial','')+'.'); if(window.showToast) window.showToast('Ristampa registrata','success'); }
  function openPrinterManager420A3(){ setRuntimeStatus420A3('Gestione stampanti: usa Windows per installare nuove stampanti. Qui puoi selezionare la stampante predefinita o predisporre Zebra/Brother/Dymo.'); if(window.showToast) window.showToast('Gestione stampanti predisposta: installazione driver da Windows.','info'); }
  function label420PrintFromTestResult(result){
    var r=result||{}; var res=String(r.result||r.final_result||r.status||r.esito||'').toUpperCase(); var cfg=safeParse(localStorage.getItem(CONFIG_KEY), {})||{};
    var tpl=res.includes('FAIL')?'FAIL':(res.includes('ERR')||res.includes('ERROR')?'ERROR':'PASS');
    if((tpl==='PASS'&&!cfg.autoPass)||(tpl==='FAIL'&&!cfg.autoFail)||(tpl==='ERROR'&&!cfg.autoError)) return {ok:false,skipped:true,reason:'auto print off',template:tpl};
    setElVal('label420-template', tpl); fillFromTest420A3(r); logPrint420A3({kind:'AUTO_TEST',template:tpl,serial:getElVal('label420-serial',''),workorder:getElVal('label420-workorder',''),reason:'test mode '+tpl});
    return {ok:true,template:tpl};
  }

  function loadLabelManager420A2(){ if($('label420-recipe-select') && !$('label420-recipe-select').dataset.loaded){ $('label420-recipe-select').dataset.loaded='1'; loadRecipeListForLabels420A3(); } renderPreview(); }
  function showLabelManager420A2(){
    if(typeof window.showTab === 'function') window.showTab('label-manager-tab', null);
    else { document.querySelectorAll('.tab-content').forEach(function(x){ x.style.display='none'; x.classList.remove('active'); }); var e=$('label-manager-tab'); if(e){ e.style.display='block'; e.classList.add('active'); } }
    loadConfig(); setTimeout(loadLabelManager420A2, 80);
  }
  // Backward compatible aliases from 4.20A1
  window.showLabelManager420A2 = showLabelManager420A2; window.loadLabelManager420A2 = loadLabelManager420A2;
  window.saveLabelTemplate420A2 = saveLabelTemplate420A2; window.printLabelPreview420A2 = printLabelPreview420A2;
  window.addLabelElement420A2 = addLabelElement420A2; window.duplicateLabelElement420A2 = duplicateLabelElement420A2; window.deleteLabelElement420A2 = deleteLabelElement420A2;
  window.updateSelectedLabelElement420A2 = updateSelectedLabelElement420A2; window.switchLabelTemplate420A2 = switchLabelTemplate420A2; window.applyLabelFormat420A2 = applyLabelFormat420A2; window.applyLabelGrid420A2 = applyLabelGrid420A2;
  window.showLabelManager420A1 = showLabelManager420A2; window.loadLabelManager420A1 = loadLabelManager420A2; window.saveLabelConfig420A1 = saveLabelTemplate420A2; window.printLabelPreview420A1 = printLabelPreview420A2;
  window.loadRecipeListForLabels420A3=loadRecipeListForLabels420A3; window.selectRecipeForLabel420A3=selectRecipeForLabel420A3; window.selectRecipeRevision420A3=selectRecipeRevision420A3; window.bindTemplateToRecipe420A3=bindTemplateToRecipe420A3; window.applyLabelPayloads420A3=applyLabelPayloads420A3; window.loadLastTestForReprint420A3=loadLastTestForReprint420A3; window.reprintLabel420A3=reprintLabel420A3; window.openPrinterManager420A3=openPrinterManager420A3; window.label420PrintFromTestResult=label420PrintFromTestResult;
  document.addEventListener('DOMContentLoaded', function(){ loadConfig(); renderLists(); renderPreview(); var c=$('label420-preview'); if(c) c.addEventListener('click', function(){ selectedId=null; renderPreview(); }); });
})();


// AT-MEC HM 4.20A4 - Industrial label integration layer
(function(){
  'use strict';
  var A4_BIND_KEY='atmec_label_recipe_profile_420A4';
  var A4_PAYLOAD_KEY='atmec_label_payload_builder_420A4';
  var A4_PRINT_LOG_KEY='atmec_label_print_log_420A4';
  var A3_CONFIG_KEY='atmec_label_manager_420A3_config';
  var A2_TEMPLATE_KEY='atmec_label_manager_420A2_templates';
  var payloadFields=[
    ['SERIALE','Seriale'],['COMMESSA','Commessa'],['LOTTO','Lotto'],['CLIENTE','Cliente'],['RICETTA','Ricetta'],['REVISIONE','Revisione'],['FIRMWARE','Firmware'],['OPERATORE','Operatore'],['STATION_ID','Stazione ID'],['STAZIONE','Nome stazione'],['ESITO','Esito'],['DATA_ORA','Data/Ora'],['REPORT_ID','Report ID']
  ];
  function $(id){return document.getElementById(id);} 
  function esc(v){return String(v??'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function safeParse(v,f){try{return JSON.parse(v||'');}catch(e){return f;}}
  function getVal(id,fb){var el=$(id);return el&&el.value!==''?el.value:fb;}
  function setVal(id,v){var el=$(id);if(el&&v!==undefined&&v!==null)el.value=v;}
  function isChecked(id){var el=$(id);return !!(el&&el.checked);} function setChecked(id,v){var el=$(id);if(el)el.checked=!!v;}
  function currentUser(){try{return (window.currentUser&&(window.currentUser.username||window.currentUser.name))||localStorage.getItem('atmec_current_user')||'Admin';}catch(e){return 'Admin';}}
  function stationCfg(){return safeParse(localStorage.getItem('atmec_factory_station_config_418B')||localStorage.getItem('atmec_station_config'),{})||{};}
  function stationId(){var c=stationCfg();return c.stationId||c.station_id||localStorage.getItem('atmec_station_id')||'STATION_LOCAL';}
  function stationName(){var c=stationCfg();return c.stationName||c.station_name||localStorage.getItem('atmec_station_name')||'Postazione locale';}
  function recipeObjName(r){return r?.recipe_name||r?.name||r?.recipeName||r?.title||r?.code||r?.id||'Ricetta senza nome';}
  function recipeObjRev(r){return r?.version||r?.revision||r?.rev||r?.recipeVersion||r?.lastRevision||'ultima';}
  function recipeObjFw(r){return r?.firmware||r?.fw||r?.fw_version||r?.firmwareVersion||r?.variables?.FW_VERSION||r?.variables?.FIRMWARE||'';}
  function recipeObjClient(r){return r?.client||r?.cliente||r?.customer||r?.customerName||r?.variables?.CLIENTE||r?.variables?.CUSTOMER||localStorage.getItem('atmec_last_recipe_client')||'';}
  function recipeObjProduct(r){return r?.product||r?.prodotto||r?.productName||r?.partNumber||r?.part_number||localStorage.getItem('atmec_last_recipe_product')||'';}
  function getCurrentRecipeObject(){try{return window.recipe||recipe||null;}catch(e){return window.recipe||null;}}
  function collectRecipes420A4(){
    var out=[]; var seen={};
    function add(r){
      if(!r) return;
      if(Array.isArray(r)){r.forEach(add);return;}
      if(typeof r==='object'){
        if(r.recipe_name||r.name||r.recipeName||r.title||r.steps||r.version||r.revision){
          var key=recipeObjName(r)+'|'+recipeObjRev(r); if(!seen[key]){seen[key]=1;out.push(r);} return;
        }
        Object.keys(r).forEach(function(k){var v=r[k]; if(v&&typeof v==='object'){ if(!v.recipe_name&&!v.name&&!v.recipeName) v=Object.assign({recipe_name:k},v); add(v); }});
      }
    }
    try{ add(window.recipes); add(window.recipeList); add(window.availableRecipes); add(window.allRecipes); add(getCurrentRecipeObject()); }catch(e){}
    try{ Object.keys(localStorage).forEach(function(k){ if(k.indexOf('recipe_')===0){ var r=safeParse(localStorage.getItem(k),null); if(r){ if(!r.recipe_name) r.recipe_name=k.replace(/^recipe_/,''); add(r); } }}); }catch(e){}
    ['atmec_recipes','recipes','recipeList','atmec_recipe_library','atmec_recipe_versions','atmec_current_recipe'].forEach(function(k){try{add(safeParse(localStorage.getItem(k),null));}catch(e){}});
    try{var db=safeParse(localStorage.getItem('atmec_enterprise_database_cache'),null); add(db?.recipes); add(db?.recipe_versions); add(db?.recipeVersions);}catch(e){}
    return out;
  }
  async function loadRecipeListForLabels420A4(){
    var sel=$('label420-recipe-select'); if(!sel) return;
    var list=collectRecipes420A4();
    try{ if(window.api&&window.api.listRecipes){ var names=await window.api.listRecipes(); if(Array.isArray(names)){ names.forEach(function(n){ if(!list.some(function(r){return recipeObjName(r)===n;})) list.push({recipe_name:n, version:'ultima', source:'api'}); }); } } }catch(e){}
    window.__label420_recipes=list;
    if(!list.length){ sel.innerHTML='<option value="">Nessuna ricetta trovata - carica/salva una ricetta</option>'; setStatus('Nessuna ricetta trovata. Apri Recipe Editor, carica o salva una ricetta, poi torna qui.'); return; }
    sel.innerHTML='<option value="">Seleziona ricetta...</option>'+list.map(function(r,i){return '<option value="'+i+'">'+esc(recipeObjName(r))+' · Rev '+esc(recipeObjRev(r))+'</option>';}).join('');
    setStatus('Caricate '+list.length+' ricette reali. Seleziona una ricetta per importare parametri, revisione e firmware.');
  }
  async function selectRecipeForLabel420A4(){
    var list=window.__label420_recipes||collectRecipes420A4(); var idx=Number(getVal('label420-recipe-select','-1')); var r=list[idx];
    if(!r) return;
    try{ if(r.source==='api'&&window.api&&window.api.loadRecipe){ var rr=await window.api.loadRecipe(recipeObjName(r)); if(rr&&rr.ok&&rr.recipe) r=rr.recipe; } }catch(e){}
    setVal('label420-recipe',recipeObjName(r)); setVal('label420-recipe-rev',recipeObjRev(r)); setVal('label420-customer',recipeObjClient(r)); setVal('label420-fw',recipeObjFw(r));
    if(recipeObjProduct(r)) localStorage.setItem('atmec_last_recipe_product',recipeObjProduct(r));
    var revSel=$('label420-revision-select'); if(revSel){ var revs=[]; if(Array.isArray(r.revisions)) revs=r.revisions; else if(Array.isArray(r.versions)) revs=r.versions; else revs=[recipeObjRev(r)]; revSel.innerHTML=revs.map(function(v){var rv=typeof v==='object'?recipeObjRev(v):v;return '<option value="'+esc(rv)+'">'+esc(rv)+'</option>';}).join(''); }
    loadBindingIntoUi(recipeObjName(r)); buildLabelPayload420A4(false); if(window.loadLabelManager420A2) window.loadLabelManager420A2();
  }
  function loadBindingIntoUi(recipeName){ var all=safeParse(localStorage.getItem(A4_BIND_KEY),{})||{}; var b=all[recipeName]||{}; if(!b) return; setVal('label420-bind-pass',b.passTemplate||'PASS'); setVal('label420-bind-fail',b.failTemplate||'FAIL'); setVal('label420-bind-error',b.errorTemplate||'ERROR'); setVal('label420-bind-repair',b.repairTemplate||'REPAIR'); setChecked('label420-auto-pass',!!b.autoPass); setChecked('label420-auto-fail',!!b.autoFail); setChecked('label420-auto-error',!!b.autoError); setChecked('label420-confirm-before-print',!!b.confirmBeforePrint); if(b.format) setVal('label420-format',b.format); if(b.printer) setVal('label420-printer',b.printer); }
  function currentBindingFromUi(){return {passTemplate:getVal('label420-bind-pass','PASS'),failTemplate:getVal('label420-bind-fail','FAIL'),errorTemplate:getVal('label420-bind-error','ERROR'),repairTemplate:getVal('label420-bind-repair','REPAIR'),autoPass:isChecked('label420-auto-pass'),autoFail:isChecked('label420-auto-fail'),autoError:isChecked('label420-auto-error'),confirmBeforePrint:isChecked('label420-confirm-before-print'),testModeIntegration:isChecked('label420-enable-testmode-integration'),saveHistory:isChecked('label420-save-print-history'),printer:getVal('label420-printer','windows-default'),format:getVal('label420-format','60x40'),revision:getVal('label420-recipe-rev','ultima'),updatedAt:new Date().toISOString()};}
  function bindTemplateToRecipe420A4(){ var name=getVal('label420-recipe',''); if(!name){ if(window.showToast)window.showToast('Seleziona una ricetta prima del binding.','warning'); return; } var all=safeParse(localStorage.getItem(A4_BIND_KEY),{})||{}; all[name]=currentBindingFromUi(); localStorage.setItem(A4_BIND_KEY,JSON.stringify(all)); if(window.saveLabelTemplate420A2) window.saveLabelTemplate420A2(); setStatus('Binding industriale salvato per '+name+': PASS/FAIL/ERRORE e auto-stampa configurati.'); if(window.showToast)window.showToast('Binding etichetta salvato sulla ricetta','success'); }
  function renderPayloadBuilder420A4(){ var box=$('label420-payload-fields'); if(!box) return; var saved=safeParse(localStorage.getItem(A4_PAYLOAD_KEY),{})||{}; var selected=saved.fields||['SERIALE','COMMESSA','LOTTO','RICETTA','REVISIONE','ESITO','STATION_ID']; box.innerHTML=payloadFields.map(function(f){return '<label class="label420-field-chip"><input type="checkbox" data-label420-field="'+f[0]+'" '+(selected.indexOf(f[0])>=0?'checked':'')+' onchange="buildLabelPayload420A4()"><span>'+f[1]+'</span><small>${'+f[0]+'}</small></label>';}).join(''); setVal('label420-payload-sep', saved.sep||';'); setVal('label420-payload-prefix', saved.prefix||''); setVal('label420-payload-symbol', saved.symbol||''); setVal('label420-payload-mode', saved.mode||'keyvalue'); }
  function buildLabelPayload420A4(showToast){ var fields=[].slice.call(document.querySelectorAll('[data-label420-field]:checked')).map(function(x){return x.getAttribute('data-label420-field');}); if(!fields.length) fields=['SERIALE']; var sep=getVal('label420-payload-sep',';'); var prefix=getVal('label420-payload-prefix',''); var symbol=getVal('label420-payload-symbol',''); var mode=getVal('label420-payload-mode','keyvalue'); var parts=fields.map(function(k){ if(mode==='values') return '${'+k+'}'; if(mode==='compact') return k.slice(0,3)+symbol+'${'+k+'}'; return k+'='+symbol+'${'+k+'}'; }); if(prefix) parts.unshift(prefix); var payload=parts.join(sep); setVal('label420-qr-payload',payload); setVal('label420-dm-payload',payload); localStorage.setItem(A4_PAYLOAD_KEY,JSON.stringify({fields:fields,sep:sep,prefix:prefix,symbol:symbol,mode:mode})); if(window.applyLabelPayloads420A3) window.applyLabelPayloads420A3(false); if(showToast&&window.showToast) window.showToast('Payload QR/DataMatrix generato da campi selezionati','success'); }
  function togglePayloadAdvanced420A4(){ document.querySelectorAll('.label420-payload-output').forEach(function(x){x.classList.toggle('show');}); }
  function exportLabelTemplate420A4(){ var data={version:'4.20A4',templates:safeParse(localStorage.getItem(A2_TEMPLATE_KEY),{})||{},bindings:safeParse(localStorage.getItem(A4_BIND_KEY),{})||{},payload:safeParse(localStorage.getItem(A4_PAYLOAD_KEY),{})||{},exportedAt:new Date().toISOString()}; var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='AT-MEC_LABEL_TEMPLATE_'+Date.now()+'.label.json'; a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);},500); }
  function importLabelTemplate420A4(){ var inp=document.createElement('input'); inp.type='file'; inp.accept='.json,.label,.label.json'; inp.onchange=function(){ var f=inp.files&&inp.files[0]; if(!f)return; var r=new FileReader(); r.onload=function(){ try{ var data=JSON.parse(r.result); if(data.templates) localStorage.setItem(A2_TEMPLATE_KEY,JSON.stringify(data.templates)); if(data.bindings) localStorage.setItem(A4_BIND_KEY,JSON.stringify(data.bindings)); if(data.payload) localStorage.setItem(A4_PAYLOAD_KEY,JSON.stringify(data.payload)); if(window.showToast)window.showToast('Template etichette importato','success'); if(window.loadLabelManager420A2) window.loadLabelManager420A2(); }catch(e){ alert('File template non valido.'); } }; r.readAsText(f);}; inp.click(); }
  function runtimeMapFromResult(r){ r=r||{}; var rec=getCurrentRecipeObject()||{}; return {serial:r.serial||r.serial_dut||r.serialNumber||r.sn||getVal('serial-dut',getVal('prod-serial-input',getVal('label420-serial',''))), workorder:r.workOrder||r.commessa||r.lotNumber||getVal('lot-number',getVal('prod-lot-input',getVal('label420-workorder',''))), lot:r.lot||r.lotto||r.lotNumber||getVal('lot-number',getVal('prod-lot-input',getVal('label420-lot',''))), recipe:r.recipe||r.recipeName||r.recipe_name||recipeObjName(rec)||getVal('label420-recipe',''), revision:r.recipeRevision||r.revision||r.rev||recipeObjRev(rec)||getVal('label420-recipe-rev',''), firmware:r.firmware||r.fw||recipeObjFw(rec)||getVal('label420-fw',''), customer:r.customer||r.client||recipeObjClient(rec)||getVal('label420-customer',''), reportId:r.reportId||r.report_id||r.id||getVal('label420-report',''), operator:r.operator||currentUser(), stationId:stationId(), stationName:stationName()}; }
  function logPrint420A4(row){ if(!row)return; var list=safeParse(localStorage.getItem(A4_PRINT_LOG_KEY),[])||[]; list.push(Object.assign({at:new Date().toISOString(),user:currentUser(),station:stationId()},row)); localStorage.setItem(A4_PRINT_LOG_KEY,JSON.stringify(list.slice(-1000))); localStorage.setItem('atmec_label_print_log_420A3',JSON.stringify(list.slice(-500))); }
  function setStatus(msg){ var el=$('label420-runtime-status'); if(el) el.textContent=msg; }
  function label420PrintFromTestResult420A4(result){ var map=runtimeMapFromResult(result); var res=String(result?.result||result?.final_result||result?.status||result?.esito||(result?.success===false?'FAIL':'PASS')).toUpperCase(); var outcome=res.includes('FAIL')?'FAIL':(res.includes('ERR')||res.includes('ERROR')?'ERROR':'PASS'); var all=safeParse(localStorage.getItem(A4_BIND_KEY),{})||{}; var binding=all[map.recipe]||{}; if(binding.testModeIntegration===false) return {ok:false,skipped:true,reason:'integration off'}; var tpl=outcome==='PASS'?(binding.passTemplate||'PASS'):outcome==='FAIL'?(binding.failTemplate||'FAIL'):(binding.errorTemplate||'ERROR'); var enabled=outcome==='PASS'?!!binding.autoPass:outcome==='FAIL'?!!binding.autoFail:!!binding.autoError; if(!enabled){return {ok:false,skipped:true,reason:'auto print off',template:tpl,recipe:map.recipe};} if(binding.confirmBeforePrint&& !confirm('Stampare etichetta '+tpl+' per '+map.serial+'?')) return {ok:false,skipped:true,reason:'user cancel'}; setVal('label420-template',tpl); setVal('label420-serial',map.serial); setVal('label420-workorder',map.workorder); setVal('label420-lot',map.lot); setVal('label420-recipe',map.recipe); setVal('label420-recipe-rev',map.revision); setVal('label420-fw',map.firmware); setVal('label420-customer',map.customer); setVal('label420-report',map.reportId); if(window.loadLabelManager420A2) window.loadLabelManager420A2(); logPrint420A4({kind:'AUTO_TEST',outcome:outcome,template:tpl,serial:map.serial,workorder:map.workorder,lot:map.lot,recipe:map.recipe,revision:map.revision,printer:binding.printer||getVal('label420-printer','windows-default'),reportId:map.reportId}); if(window.showToast) window.showToast('Auto-stampa etichetta '+tpl+' registrata per '+map.serial,'success'); return {ok:true,template:tpl,outcome:outcome,recipe:map.recipe}; }
  function openLabelManagerForCurrentRecipe420A4(){ var r=getCurrentRecipeObject()||{}; if(window.showLabelManager420A1) window.showLabelManager420A1(); setTimeout(function(){ setVal('label420-recipe',recipeObjName(r)); setVal('label420-recipe-rev',recipeObjRev(r)); setVal('label420-fw',recipeObjFw(r)); setVal('label420-customer',recipeObjClient(r)); loadBindingIntoUi(recipeObjName(r)); buildLabelPayload420A4(false); if(window.loadLabelManager420A2) window.loadLabelManager420A2(); },120); }
  function loadLabelRecipeBindingIntoRecipe420A4(){ var r=getCurrentRecipeObject()||{}; var name=recipeObjName(r); var all=safeParse(localStorage.getItem(A4_BIND_KEY),{})||{}; var b=all[name]; var box=$('recipe-label-binding-summary'); if(box) box.innerHTML=b?('PASS '+esc(b.passTemplate||'PASS')+' · FAIL '+esc(b.failTemplate||'FAIL')+' · ERROR '+esc(b.errorTemplate||'ERROR')+' · Auto PASS '+(b.autoPass?'ON':'OFF')+' · Auto FAIL '+(b.autoFail?'ON':'OFF')):'Nessun binding salvato per '+esc(name)+'.'; }
  function saveLabelRecipeBindingFromRecipe420A4(){ openLabelManagerForCurrentRecipe420A4(); setTimeout(function(){ bindTemplateToRecipe420A4(); loadLabelRecipeBindingIntoRecipe420A4(); },200); }
  // expose A4 APIs and override A3 weak spots
  window.loadRecipeListForLabels420A4=loadRecipeListForLabels420A4;
  window.selectRecipeForLabel420A4=selectRecipeForLabel420A4;
  window.bindTemplateToRecipe420A4=bindTemplateToRecipe420A4;
  window.buildLabelPayload420A4=buildLabelPayload420A4;
  window.togglePayloadAdvanced420A4=togglePayloadAdvanced420A4;
  window.exportLabelTemplate420A4=exportLabelTemplate420A4;
  window.importLabelTemplate420A4=importLabelTemplate420A4;
  window.label420PrintFromTestResult=label420PrintFromTestResult420A4;
  window.label420PrintFromTestResult420A4=label420PrintFromTestResult420A4;
  window.openLabelManagerForCurrentRecipe420A4=openLabelManagerForCurrentRecipe420A4;
  window.loadLabelRecipeBindingIntoRecipe420A4=loadLabelRecipeBindingIntoRecipe420A4;
  window.saveLabelRecipeBindingFromRecipe420A4=saveLabelRecipeBindingFromRecipe420A4;
  window.loadRecipeListForLabels420A3=loadRecipeListForLabels420A4;
  window.selectRecipeForLabel420A3=selectRecipeForLabel420A4;
  window.bindTemplateToRecipe420A3=bindTemplateToRecipe420A4;
  document.addEventListener('DOMContentLoaded',function(){renderPayloadBuilder420A4(); setTimeout(function(){buildLabelPayload420A4(false); loadRecipeListForLabels420A4();},250);});
})();

// AT-MEC HM 4.20A4 FIX1 - Test Mode label panel, printer master flag, auto-print gate
(function(){
  'use strict';
  var SETTINGS_KEY = 'atmec_label_printer_runtime_420A4_FIX1';
  var BINDINGS_KEY = 'atmec_label_recipe_profile_420A4';
  var PRINT_LOG_KEY = 'atmec_label_print_log_420A4';
  var LAST_LABEL_KEY = 'atmec_label_last_test_label_420A4';
  var oldPrint = window.label420PrintFromTestResult420A4 || window.label420PrintFromTestResult;

  function $(id){ return document.getElementById(id); }
  function val(id, fallback){ var el=$(id); return el && el.value !== '' ? el.value : (fallback || ''); }
  function setVal(id, v){ var el=$(id); if(el && v !== undefined && v !== null) el.value = v; }
  function setChecked(id, v){ var el=$(id); if(el) el.checked = !!v; }
  function isChecked(id){ var el=$(id); return !!(el && el.checked); }
  function parse(k, f){ try { return JSON.parse(localStorage.getItem(k) || ''); } catch(e){ return f; } }
  function save(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function toast(msg, type){ if(window.showToast) window.showToast(msg, type || 'info'); else console.log('[AT-MEC Label]', msg); }
  function getOldCfg(){ return parse('atmec_label_manager_420A3_config', {}) || parse('atmec_label_manager_420A1', {}) || {}; }
  function getSettings(){
    var old = getOldCfg();
    var s = parse(SETTINGS_KEY, null);
    if(!s){
      s = { printerEnabled:false, autoPass:!!old.autoPass, autoFail:!!old.autoFail, autoError:!!old.autoError, simulatePrint:false, updatedAt:new Date().toISOString() };
      save(SETTINGS_KEY, s);
    }
    return Object.assign({printerEnabled:false, autoPass:false, autoFail:false, autoError:false, simulatePrint:false}, s);
  }
  function setSettings(patch){ var s=Object.assign(getSettings(), patch || {}, {updatedAt:new Date().toISOString()}); save(SETTINGS_KEY, s); syncPrinterUi420A4(); return s; }
  function currentUser(){ try { return (window.currentUser && (window.currentUser.username || window.currentUser.name)) || localStorage.getItem('atmec_current_user') || 'Admin'; } catch(e){ return 'Admin'; } }
  function getStationObj(){ try { return parse('atmec_factory_station_config_418B', {}) || parse('atmec_station_config', {}) || {}; } catch(e){ return {}; } }
  function stationId(){ var c=getStationObj(); return c.stationId || c.station_id || localStorage.getItem('atmec_station_id') || 'STATION_LOCAL'; }
  function stationName(){ var c=getStationObj(); return c.stationName || c.station_name || localStorage.getItem('atmec_station_name') || 'Postazione locale'; }
  function getRecipeObj(){ try { return window.recipe || window.currentRecipe || recipe || null; } catch(e){ return window.recipe || window.currentRecipe || null; } }
  function recipeName(r){ return r && (r.recipe_name || r.name || r.recipeName || r.title || r.id || r.code) || val('label420-recipe',''); }
  function recipeRev(r){ return r && (r.version || r.revision || r.rev || r.recipeVersion || r.lastRevision) || val('label420-recipe-rev',''); }
  function recipeFw(r){ return r && (r.firmware || r.fw || (r.variables && (r.variables.FIRMWARE || r.variables.FW)) || r.firmwareVersion) || val('label420-fw',''); }
  function recipeClient(r){ return r && (r.client || r.cliente || r.customer || r.customerName || (r.variables && (r.variables.CLIENTE || r.variables.CUSTOMER))) || val('label420-customer',''); }
  function getLot(){ try { if(typeof window.getLotNumber === 'function') return window.getLotNumber() || ''; } catch(e){} return val('lot-number-dash', val('lot-number', val('prod-lot-input', val('label420-workorder','')))); }
  function getSerial(){ try { if(typeof window.getSerialDutRaw === 'function') return window.getSerialDutRaw() || ''; } catch(e){} return val('serial-dut-dash', val('serial-dut', val('prod-serial-input', val('label420-serial','')))); }
  function getContext(result){
    result = result || {};
    var r = getRecipeObj() || {};
    var outcome = String(result.result || result.final_result || result.status || result.esito || '').toUpperCase();
    if(!outcome) outcome = 'WAITING';
    if(outcome.includes('ERR')) outcome = 'ERROR'; else if(outcome.includes('FAIL')) outcome = 'FAIL'; else if(outcome.includes('PASS')) outcome = 'PASS'; else if(outcome !== 'WAITING') outcome = 'PASS';
    return {
      serial: result.serial || result.serial_dut || result.serialNumber || result.sn || getSerial() || '—',
      workorder: result.workOrder || result.commessa || result.lot_number || result.lotNumber || getLot() || '—',
      lot: result.lot || result.lotto || result.lot_number || result.lotNumber || getLot() || '—',
      recipe: result.recipe || result.recipeName || result.recipe_name || recipeName(r) || val('label420-recipe','—'),
      revision: result.recipeRevision || result.recipe_version || result.revision || result.rev || recipeRev(r) || val('label420-recipe-rev','—'),
      firmware: result.firmware || result.fw || recipeFw(r) || val('label420-fw',''),
      customer: result.customer || result.client || recipeClient(r) || val('label420-customer',''),
      reportId: result.reportId || result.report_id || result.id || val('label420-report',''),
      operator: result.operator || currentUser(),
      stationId: stationId(),
      stationName: stationName(),
      outcome: outcome
    };
  }
  function bindingForRecipe(recipe){ var all=parse(BINDINGS_KEY,{}) || {}; return all[recipe] || {}; }
  function templateForOutcome(binding, outcome){ if(outcome==='FAIL') return binding.failTemplate || 'FAIL'; if(outcome==='ERROR') return binding.errorTemplate || 'ERROR'; if(outcome==='REPAIR') return binding.repairTemplate || 'REPAIR'; return binding.passTemplate || 'PASS'; }
  function autoForOutcome(settings, binding, outcome){
    var hasBinding = binding && Object.keys(binding).length > 0;
    if(hasBinding){
      if(outcome==='FAIL') return !!binding.autoFail;
      if(outcome==='ERROR') return !!binding.autoError;
      return !!binding.autoPass;
    }
    if(outcome==='FAIL') return !!settings.autoFail;
    if(outcome==='ERROR') return !!settings.autoError;
    return !!settings.autoPass;
  }
  function logPrint(row){
    var list=parse(PRINT_LOG_KEY, []) || [];
    list.push(Object.assign({at:new Date().toISOString(), user:currentUser(), station:stationId()}, row || {}));
    save(PRINT_LOG_KEY, list.slice(-1000));
    save('atmec_label_print_log_420A3', list.slice(-500));
  }
  function miniHtml(ctx){
    var cls = (ctx.outcome || 'WAITING').toLowerCase();
    return '<div class="tm-label-brand420">AT-MEC HM</div>'+
      '<div class="tm-label-sn420">SN: '+esc(ctx.serial || '—')+'</div>'+
      '<div class="tm-label-meta420">WO: '+esc(ctx.workorder || '—')+' · LOT: '+esc(ctx.lot || '—')+'</div>'+
      '<div class="tm-label-meta420">Ricetta: '+esc(ctx.recipe || '—')+' Rev '+esc(ctx.revision || '—')+'</div>'+
      '<div class="tm-label-result420 '+cls+'">'+esc(ctx.outcome === 'WAITING' ? 'IN ATTESA' : ctx.outcome)+'</div>'+
      '<div class="tm-label-qr420">QR</div>';
  }
  function syncPrinterUi420A4(){
    var s=getSettings();
    setChecked('label420-printer-enabled', s.printerEnabled);
    setChecked('label420-simulate-print', s.simulatePrint);
    setChecked('tm-label-printer-enabled420', s.printerEnabled);
    setChecked('tm-label-simulate420', s.simulatePrint);
    setChecked('tm-label-auto-pass420', s.autoPass);
    setChecked('tm-label-auto-fail420', s.autoFail);
    setChecked('tm-label-auto-error420', s.autoError);
    var st=$('tm-label-status420');
    if(st) st.textContent = s.printerEnabled ? (s.simulatePrint ? '🟡 Stampante attiva in simulazione' : '🟢 Stampante attiva') : '🔴 Stampante disabilitata';
    var btn=$('tm-label-reprint420'); if(btn) btn.disabled = !s.printerEnabled;
    var last=parse(LAST_LABEL_KEY,null); var lastEl=$('tm-label-last420');
    if(lastEl) lastEl.textContent = last ? ('Ultima etichetta: '+(last.serial||'—')+' · '+(last.outcome||'—')+' · '+(last.template||'—')) : 'Ultima stampa: —';
  }

  function ensureProductionTestModeLabelPanel420A4Fix2(){
    try{
      var prod=document.getElementById('production-test-mode');
      if(!prod) return;
      if(prod.querySelector('#tm-label-panel420')) return;
      var actions=prod.querySelector('.prod-primary-actions-inline');
      if(!actions) return;
      var wrap=document.createElement('div');
      wrap.innerHTML='<div class="tm-label-panel420 prod-label-panel420" id="tm-label-panel420">'+
        '<div class="tm-label-head420"><div><b>🏷️ Mini preview etichetta</b><span id="tm-label-status420">Stampante non configurata</span></div><button class="btn btn-ghost btn-xs" onclick="openLabelManagerFromTestMode420A4()">👁️ Label Manager</button></div>'+
        '<div class="tm-label-body420"><div id="tm-label-preview420" class="tm-label-preview420 waiting"><div class="tm-label-brand420">AT-MEC HM</div><div class="tm-label-sn420">SN: —</div><div class="tm-label-meta420">WO: — · LOT: —</div><div class="tm-label-result420">IN ATTESA</div><div class="tm-label-qr420">QR</div></div>'+
        '<div class="tm-label-controls420"><label><input type="checkbox" id="tm-label-printer-enabled420" onchange="setLabelPrinterEnabled420A4(this.checked)"> Abilita stampante</label><label><input type="checkbox" id="tm-label-auto-pass420" onchange="setLabelAutoFlag420A4(\'pass\',this.checked)"> Auto PASS</label><label><input type="checkbox" id="tm-label-auto-fail420" onchange="setLabelAutoFlag420A4(\'fail\',this.checked)"> Auto FAIL</label><label><input type="checkbox" id="tm-label-auto-error420" onchange="setLabelAutoFlag420A4(\'error\',this.checked)"> Auto ERROR</label><label><input type="checkbox" id="tm-label-simulate420" onchange="setLabelSimulatePrint420A4(this.checked)"> Simula stampa</label><button id="tm-label-reprint420" class="btn btn-primary btn-sm" onclick="reprintLastTestLabelFromTestMode420A4()" disabled>🖨️ Ristampa ultima etichetta</button><small id="tm-label-last420">Ultima stampa: —</small></div></div></div>';
      actions.insertAdjacentElement('afterend', wrap.firstElementChild);
    }catch(e){ console.warn('[AT-MEC Label] impossibile agganciare mini preview Test Mode', e); }
  }

  function refreshTestModeLabelPanel420A4(result){
    ensureProductionTestModeLabelPanel420A4Fix2();
    var ctx=getContext(result || {});
    var preview=$('tm-label-preview420');
    if(preview){ preview.className='tm-label-preview420 '+String(ctx.outcome||'WAITING').toLowerCase(); preview.innerHTML=miniHtml(ctx); }
    syncPrinterUi420A4();
    return ctx;
  }
  function applyContextToLabelManager(ctx, template){
    if(!ctx) return;
    setVal('label420-template', template || ctx.outcome || 'PASS');
    setVal('label420-serial', ctx.serial === '—' ? '' : ctx.serial);
    setVal('label420-workorder', ctx.workorder === '—' ? '' : ctx.workorder);
    setVal('label420-lot', ctx.lot === '—' ? '' : ctx.lot);
    setVal('label420-recipe', ctx.recipe === '—' ? '' : ctx.recipe);
    setVal('label420-recipe-rev', ctx.revision === '—' ? '' : ctx.revision);
    setVal('label420-fw', ctx.firmware || '');
    setVal('label420-customer', ctx.customer || '');
    setVal('label420-report', ctx.reportId || '');
    if(window.loadLabelManager420A2) window.loadLabelManager420A2();
  }
  function printFromTestResult420A4Fix1(result){
    var s=getSettings();
    var ctx=getContext(result || {});
    var binding=bindingForRecipe(ctx.recipe);
    if(binding.testModeIntegration === false){ refreshTestModeLabelPanel420A4(ctx); return {ok:false, skipped:true, reason:'collegamento Test Mode disattivato'}; }
    var tpl=templateForOutcome(binding, ctx.outcome);
    // 10.1.8 guard: non stampare etichetta simulata se seriale/WO non sono ancora valorizzati.
    if((!ctx.serial || ctx.serial==='—') && (!ctx.workorder || ctx.workorder==='—')){ refreshTestModeLabelPanel420A4(ctx); return {ok:false, skipped:true, reason:'seriale/WO non valorizzati', template:tpl}; }
    var auto=autoForOutcome(s, binding, ctx.outcome);
    applyContextToLabelManager(ctx, tpl);
    var row={kind:'AUTO_TEST',outcome:ctx.outcome,template:tpl,serial:ctx.serial,workorder:ctx.workorder,lot:ctx.lot,recipe:ctx.recipe,revision:ctx.revision,printer:val('label420-printer','windows-default'),reportId:ctx.reportId,simulated:!!s.simulatePrint};
    save(LAST_LABEL_KEY, row);
    refreshTestModeLabelPanel420A4(ctx);
    if(!s.printerEnabled){ logPrint(Object.assign({},row,{printed:false,skipped:true,reason:'printer disabled'})); return {ok:false, skipped:true, reason:'stampante disabilitata', template:tpl, generated:true}; }
    if(!auto){ logPrint(Object.assign({},row,{printed:false,skipped:true,reason:'auto print off'})); return {ok:false, skipped:true, reason:'auto stampa '+ctx.outcome+' disattivata', template:tpl, generated:true}; }
    if(binding.confirmBeforePrint && !confirm('Stampare etichetta '+tpl+' per '+ctx.serial+'?')){ logPrint(Object.assign({},row,{printed:false,skipped:true,reason:'user cancel'})); return {ok:false, skipped:true, reason:'annullata da operatore', template:tpl}; }
    logPrint(Object.assign({},row,{printed:!s.simulatePrint, simulated:!!s.simulatePrint}));
    toast(s.simulatePrint ? ('Simulazione stampa etichetta '+tpl+' per '+ctx.serial) : ('Stampa etichetta '+tpl+' registrata per '+ctx.serial), 'success');
    return {ok:true, template:tpl, outcome:ctx.outcome, recipe:ctx.recipe, simulated:!!s.simulatePrint};
  }
  function setLabelPrinterEnabled420A4(v){ setSettings({printerEnabled:!!v}); refreshTestModeLabelPanel420A4(); if(window.saveLabelTemplate420A2) { try{ window.saveLabelTemplate420A2(); }catch(e){} } }
  function setLabelSimulatePrint420A4(v){ setSettings({simulatePrint:!!v}); refreshTestModeLabelPanel420A4(); }
  function setLabelAutoFlag420A4(kind, v){
    var p={}; if(kind==='pass') p.autoPass=!!v; if(kind==='fail') p.autoFail=!!v; if(kind==='error') p.autoError=!!v; setSettings(p);
    setChecked('label420-auto-pass', getSettings().autoPass); setChecked('label420-auto-fail', getSettings().autoFail); setChecked('label420-auto-error', getSettings().autoError);
    if(window.saveLabelTemplate420A2) { try{ window.saveLabelTemplate420A2(); }catch(e){} }
  }
  function openLabelManagerFromTestMode420A4(){ if(window.showLabelManager420A1) window.showLabelManager420A1(); setTimeout(function(){ applyContextToLabelManager(getContext({}), getContext({}).outcome==='WAITING'?'PASS':getContext({}).outcome); },150); }
  function reprintLastTestLabelFromTestMode420A4(){
    var s=getSettings(); if(!s.printerEnabled){ toast('Stampante disabilitata: abilita la stampante per ristampare.', 'warning'); return; }
    var last=parse(LAST_LABEL_KEY,null); if(!last){ toast('Nessuna etichetta precedente da ristampare.', 'warning'); return; }
    logPrint(Object.assign({}, last, {kind:'REPRINT_TESTMODE', reprinted:true, simulated:!!s.simulatePrint, reason:'ristampa da Test Mode'}));
    toast(s.simulatePrint ? 'Ristampa simulata registrata.' : 'Ristampa ultima etichetta registrata.', 'success');
    syncPrinterUi420A4();
  }

  function installTestModeLabelHooks420A4Fix2(){
    try{
      if(!window.__atmecLabel420A4Fix2Hooks){
        window.__atmecLabel420A4Fix2Hooks=true;
        var oldEnter=window.enterProductionTestMode;
        if(typeof oldEnter==='function'){
          window.enterProductionTestMode=function(){
            var ret=oldEnter.apply(this, arguments);
            setTimeout(function(){ ensureProductionTestModeLabelPanel420A4Fix2(); refreshTestModeLabelPanel420A4(); },120);
            return ret;
          };
          try{ enterProductionTestMode=window.enterProductionTestMode; }catch(_e){}
        }
        ['prod-lot-number','prod-serial-input','lot-number-dash','serial-dut-dash'].forEach(function(id){
          var el=document.getElementById(id);
          if(el && !el.__label420Hook){ el.__label420Hook=true; el.addEventListener('input', function(){ setTimeout(function(){ refreshTestModeLabelPanel420A4(); },20); }); }
        });
      }
    }catch(e){ console.warn('[AT-MEC Label] hooks Test Mode non installati', e); }
  }

  window.getLabelPrinterSettings420A4 = getSettings;
  window.setLabelPrinterEnabled420A4 = setLabelPrinterEnabled420A4;
  window.setLabelSimulatePrint420A4 = setLabelSimulatePrint420A4;
  window.setLabelAutoFlag420A4 = setLabelAutoFlag420A4;
  window.refreshTestModeLabelPanel420A4 = refreshTestModeLabelPanel420A4;
  window.openLabelManagerFromTestMode420A4 = openLabelManagerFromTestMode420A4;
  window.reprintLastTestLabelFromTestMode420A4 = reprintLastTestLabelFromTestMode420A4;
  window.label420PrintFromTestResult = printFromTestResult420A4Fix1;
  window.label420PrintFromTestResult420A4 = printFromTestResult420A4Fix1;
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(function(){ installTestModeLabelHooks420A4Fix2(); ensureProductionTestModeLabelPanel420A4Fix2(); syncPrinterUi420A4(); refreshTestModeLabelPanel420A4(); },400); });
  setTimeout(function(){ installTestModeLabelHooks420A4Fix2(); ensureProductionTestModeLabelPanel420A4Fix2(); refreshTestModeLabelPanel420A4(); },1200);
})();
