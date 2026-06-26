
// AT-MEC_HM 4.24B - Repository & Distribution Sync
(function(){
  var VERSION='AT-MEC_HM_4.24B_FIX6_RECIPE_SOURCE_FUNCTION_FIX';
  var STORE='atmec_424a_repository_center';
  var AUDIT='atmec_424a_repository_audit';
  var STATIONS='atmec_424b_distribution_stations';
  var currentKind='recipes';
  var selectedId=null;
  var LABELS={recipes:'Repository Ricette',firmware:'Repository Firmware',labels:'Repository Label',audio:'Repository Audio',layouts:'Repository Layout',stations:'Station Manager / Distribution Sync',audit:'Audit Repository'};
  function $(id){return document.getElementById(id)}
  function now(){return new Date().toISOString()}
  function toast(m,t){if(window.toast) window.toast(m,t||'info'); else console.log('[4.24B]',m)}
  function esc(s){return String(s==null?'':s).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function read(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch(e){return {}}}
  function write(db){localStorage.setItem(STORE,JSON.stringify(db))}
  function readAudit(){try{return JSON.parse(localStorage.getItem(AUDIT)||'[]')}catch(e){return []}}
  function writeAudit(a){localStorage.setItem(AUDIT,JSON.stringify(a.slice(-1000)))}
  function readStations(){try{return JSON.parse(localStorage.getItem(STATIONS)||'[]')}catch(e){return []}}
  function writeStations(a){localStorage.setItem(STATIONS,JSON.stringify(a))}
  function user(){try{return (window.currentUser&&window.currentUser.username)||localStorage.getItem('atmec_current_user')||'Admin'}catch(e){return 'Admin'}}
  function audit(action,kind,item){var a=readAudit();a.push({ts:now(),user:user(),action:action,kind:kind,name:item&&item.name||'',revision:item&&item.revision||'',status:item&&item.status||'',station:item&&item.station||''});writeAudit(a)}
  function ensure(){var db=read();['recipes','firmware','labels','audio','layouts'].forEach(function(k){if(!Array.isArray(db[k])) db[k]=[]});write(db);return db}
  function download(name,obj){var blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}
  function setText(id,v){var el=$(id);if(el)el.textContent=v}
  function renderKpi(db){var all=[].concat(db.recipes||[],db.firmware||[],db.labels||[],db.audio||[],db.layouts||[]);setText('repo424a-kpi-total',all.length);setText('repo424a-kpi-published',all.filter(function(x){return x.status==='Published'}).length);setText('repo424a-kpi-draft',all.filter(function(x){return x.status==='Draft'}).length);setText('repo424a-kpi-archived',all.filter(function(x){return x.status==='Archived'}).length)}
  function renderButtons(){document.querySelectorAll('[data-repo-kind]').forEach(function(b){var active=b.getAttribute('data-repo-kind')===currentKind;b.classList.toggle('btn-primary',active);b.classList.toggle('btn-ghost',!active)})}
  function mergeItem(db,kind,item,source){
    db[kind]=db[kind]||[];
    var name=(item.name||item.filename||item.id||'').trim(); if(!name) return false;
    var path=item.path||item.file||'';
    var revision=item.revision||item.version||'REV_A';
    var exists=db[kind].find(function(x){return (x.path&&x.path===path)||(x.name===name&&x.revision===revision)});
    if(exists){ exists.path=exists.path||path; exists.source=exists.source||source; exists.updatedAt=now(); return false; }
    db[kind].push({id:'repo_'+kind+'_'+Date.now()+'_'+Math.random().toString(16).slice(2),name:name,revision:revision,status:item.status||'Draft',author:item.author||'Auto Discovery',notes:(item.notes||('Rilevato automaticamente da '+source)),path:path,source:source,createdAt:now(),updatedAt:now()});
    return true;
  }

  function normRecipeName(s){
    s=String(s==null?'':s).trim();
    if(!s) return '';
    s=s.replace(/^recipe_/,'').replace(/\.json$/i,'').replace(/\.recipe$/i,'');
    return s.trim();
  }
  function recipeNameFromAny(x){
    if(!x) return '';
    if(typeof x==='string') return normRecipeName(x);
    if(typeof x!=='object') return '';
    return normRecipeName(x.name||x.recipeName||x.recipe_name||x.title||x.label||x.id||x.filename||x.fileName||x.path||x.recipe||x.codice||x.code||'');
  }
  function recipeRevFromAny(x){
    if(!x || typeof x!=='object') return 'REV_A';
    return String(x.revision||x.rev||x.version||x.recipeRevision||x.recipe_revision||x.latestVersion||x.fwRevision||'REV_A').trim()||'REV_A';
  }
  function addRecipeName(db,name,revision,source,notes){
    name=normRecipeName(name);
    if(!name || name==='--' || name==='Seleziona' || name==='Seleziona ricetta') return 0;
    revision=String(revision||'REV_A').trim()||'REV_A';
    var item={name:name,revision:revision,status:'Draft',author:'Auto Discovery',notes:notes||('Rilevata da '+source),path:'',source:source||'auto'};
    return mergeItem(db,'recipes',item,source||'auto')?1:0;
  }
  function discoverFromVisibleRecipeSelectors(db){
    var added=0;
    try{
      var selectors=[];
      document.querySelectorAll('select').forEach(function(sel){
        var id=(sel.id||'').toLowerCase();
        var name=(sel.name||'').toLowerCase();
        var cls=(sel.className||'').toString().toLowerCase();
        var txt='';
        try{ txt=(sel.closest('.form-group,.card,.panel,.section,div')||sel.parentElement||{}).textContent||''; }catch(e){}
        var hay=(id+' '+name+' '+cls+' '+txt).toLowerCase();
        if(hay.indexOf('ricett')>=0 || hay.indexOf('recipe')>=0 || hay.indexOf('test-esecuzione')>=0 || hay.indexOf('test mode')>=0){ selectors.push(sel); }
      });
      selectors.forEach(function(sel){
        Array.from(sel.options||[]).forEach(function(opt){
          var v=(opt.value||opt.textContent||'').trim();
          var t=(opt.textContent||opt.value||'').trim();
          var name=normRecipeName(v && v!=='__none__' && v!=='null' ? v : t);
          if(!name || /^selez/i.test(name) || /^--/.test(name)) return;
          added+=addRecipeName(db,name,'ultima','Test Mode selector','Rilevata dal selettore ricette visibile in Test Mode/Test Esecuzione');
        });
      });
    }catch(e){ console.warn('[4.24B_FIX6] visible recipe selector discovery failed',e); }
    return added;
  }

  function discoverFromLocalStorage(db){
    var added=0;
    function addRecipeObj(obj,key){
      var nm=recipeNameFromAny(obj) || String(key||'').replace(/^recipe_/,'');
      var rv=recipeRevFromAny(obj);
      added+=addRecipeName(db,nm,rv,'localStorage '+key,'Rilevata da localStorage key '+key);
    }
    function scanArray(v,kind,source,key){
      if(!Array.isArray(v)) return;
      v.forEach(function(x){
        if(x&&typeof x==='object'){
          var nm=x.name||x.title||x.recipeName||x.recipe_name||x.templateName||x.filename||x.id;
          var rv=x.revision||x.version||x.rev||x.latestVersion||'REV_A';
          if(kind==='recipes') added+=addRecipeName(db,nm,rv,source,'Rilevata da '+source+' '+key);
          else added+=mergeItem(db,kind,{name:nm,revision:rv,status:x.status||'Draft',notes:'Rilevato da '+source+' '+key},source)?1:0;
        } else if(kind==='recipes' && typeof x==='string') {
          added+=addRecipeName(db,x,'ultima',source,'Rilevata da '+source+' '+key);
        }
      });
    }
    for(var i=0;i<localStorage.length;i++){
      var key=localStorage.key(i)||''; var raw=localStorage.getItem(key)||'';
      if(!raw || raw.length>2000000) continue;
      var lk=key.toLowerCase();
      var obj=null; try{obj=JSON.parse(raw)}catch(e){}
      if(key.indexOf('recipe_')===0){
        if(obj && typeof obj==='object') addRecipeObj(obj,key);
        else added+=addRecipeName(db,key.replace(/^recipe_/,''),'ultima','localStorage recipe_*','Rilevata da chiave localStorage '+key);
        continue;
      }
      if(!obj) continue;
      if(lk.indexOf('recipe')>=0){
        if(Array.isArray(obj)) scanArray(obj,'recipes','localStorage',key);
        else {
          if(recipeNameFromAny(obj)) addRecipeObj(obj,key);
          scanArray(obj.recipes||obj.items||obj.recipeList||obj.versions||obj.recipe_versions,'recipes','localStorage',key);
        }
      }
      if(lk.indexOf('label')>=0 || lk.indexOf('template')>=0) scanArray(Array.isArray(obj)?obj:(obj.labels||obj.templates||obj.items||[]),'labels','localStorage',key);
      if(lk.indexOf('firmware')>=0 || lk.indexOf('fw')>=0) scanArray(Array.isArray(obj)?obj:(obj.firmware||obj.items||[]),'firmware','localStorage',key);
      if(lk.indexOf('audio')>=0 || lk.indexOf('voice')>=0) scanArray(Array.isArray(obj)?obj:(obj.audio||obj.items||[]),'audio','localStorage',key);
      if(lk.indexOf('layout')>=0) scanArray(Array.isArray(obj)?obj:(obj.layouts||obj.items||[]),'layouts','localStorage',key);
    }
    return added;
  }
  async function discoverFromApiRecipes(db){
    var added=0;
    try{
      var list=[];
      if(window.api && typeof window.api.listRecipes==='function'){
        var res=await window.api.listRecipes();
        list=Array.isArray(res)?res:[];
      }
      for(var i=0;i<list.length;i++){
        var r=list[i];
        var name=recipeNameFromAny(r);
        if(!name) continue;
        var rev=recipeRevFromAny(r);
        try{
          if(window.api && typeof window.api.listRecipeVersions==='function'){
            var versions=await window.api.listRecipeVersions(name);
            if(Array.isArray(versions) && versions.length){
              versions.forEach(function(v){
                added+=addRecipeName(db,name,recipeRevFromAny(v),'api.listRecipeVersions','Rilevata da api.listRecipeVersions(), stessa famiglia ricetta del Test Mode');
              });
              continue;
            }
          }
        }catch(e){}
        added+=addRecipeName(db,name,rev,'api.listRecipes','Rilevata dalla stessa sorgente usata da Test Mode / api.listRecipes()');
      }
    }catch(e){console.warn('[4.24B_FIX6] api.listRecipes discovery failed',e)}
    return added;
  }
  async function discoverFromManifest(db){
    var added=0;
    try{
      var res=await fetch('config/repository_manifest_424b.json?ts='+Date.now());
      if(!res.ok){ console.info('[4.24B_FIX6] manifest discovery non disponibile, uso fallback localStorage/demo.'); return 0; }
      var m=await res.json();
      ['recipes','firmware','labels','audio','layouts'].forEach(function(kind){(m[kind]||[]).forEach(function(x){if(mergeItem(db,kind,x,'project manifest')) added++;})});
    }catch(e){console.warn('[4.24B] manifest discovery failed',e)}
    return added;
  }
  function renderStations(){
    var body=$('repo424a-table-body'); if(!body) return;
    var stations=readStations();
    if(!stations.length){stations=[{id:'ATE-01',name:'ATE-01',mode:'Manuale',lastSync:'Mai',status:'Non sincronizzata',recipes:'n/d',firmware:'n/d',labels:'n/d',audio:'n/d',layouts:'n/d'}];writeStations(stations)}
    body.innerHTML=stations.map(function(s){var bad=s.status&&s.status.indexOf('Mismatch')>=0;return '<tr><td><b>'+esc(s.name||s.id)+'</b><div class="hint">Modalità: '+esc(s.mode||'Manuale')+'</div></td><td>'+esc(s.recipes||'n/d')+'</td><td><span class="repo424a-status '+(bad?'Archived':'Published')+'">'+esc(s.status||'n/d')+'</span></td><td>'+esc(s.firmware||'n/d')+'</td><td>'+esc(s.lastSync||'Mai')+'</td><td><button class="btn btn-ghost btn-xs" onclick="repo424BSyncStation(\''+esc(s.id)+'\')">Sincronizza</button> <button class="btn btn-ghost btn-xs" onclick="repo424BForceMismatch(\''+esc(s.id)+'\')">Forza mismatch</button> <button class="btn btn-ghost btn-xs" onclick="repo424BRollbackStation(\''+esc(s.id)+'\')">Rollback</button></td></tr>'}).join('');
  }
  function currentPublishedVersions(){var db=ensure(), out={};['recipes','firmware','labels','audio','layouts'].forEach(function(k){var p=(db[k]||[]).filter(function(x){return x.status==='Published'});out[k]=p.map(function(x){return x.name+' '+x.revision}).join(', ')||'n/d'});return out}
  function hasAnyItems(db){return ['recipes','firmware','labels','audio','layouts'].some(function(k){return (db[k]||[]).length>0;})}
  function renderTable(){
    var db=ensure(); renderKpi(db); renderButtons();
    var title=$('repo424a-table-title'); if(title) title.textContent=LABELS[currentKind]||'Repository';
    var editor=$('repo424a-editor'); if(editor && (currentKind==='audit'||currentKind==='stations')) editor.style.display='none';
    var body=$('repo424a-table-body'); if(!body)return;
    if(currentKind==='stations'){renderStations();return}
    if(currentKind==='audit'){
      var a=readAudit().slice().reverse();
      body.innerHTML=a.map(function(x){return '<tr><td>'+esc(x.action)+'</td><td>'+esc(x.kind)+' / '+esc(x.revision)+'</td><td><span class="repo424a-status '+esc(x.status)+'">'+esc(x.status)+'</span></td><td>'+esc(x.user)+'</td><td>'+esc(new Date(x.ts).toLocaleString())+'</td><td>'+esc((x.station?x.station+' - ':'')+x.name)+'</td></tr>'}).join('') || '<tr><td colspan="6" class="hint">Nessuna operazione registrata.</td></tr>';return;
    }
    var rows=(db[currentKind]||[]).slice().sort(function(a,b){return (b.updatedAt||'').localeCompare(a.updatedAt||'')});
    body.innerHTML=rows.map(function(x){return '<tr><td><b>'+esc(x.name)+'</b><div class="hint">'+esc(x.notes||'')+(x.path?'<br>'+esc(x.path):'')+'</div></td><td>'+esc(x.revision)+'</td><td><span class="repo424a-status '+esc(x.status)+'">'+esc(x.status)+'</span></td><td>'+esc(x.author)+'</td><td>'+esc(new Date(x.updatedAt||x.createdAt).toLocaleString())+'</td><td><button class="btn btn-ghost btn-xs" onclick="repo424AEditItem(\''+esc(x.id)+'\')">Modifica</button> <button class="btn btn-ghost btn-xs" onclick="repo424ASetStatus(\''+esc(x.id)+'\',\'Published\')">Pubblica</button> <button class="btn btn-ghost btn-xs" onclick="repo424ASetStatus(\''+esc(x.id)+'\',\'Archived\')">Archivia</button></td></tr>'}).join('') || '<tr><td colspan="6"><div class="repo424a-empty-state"><b>Nessun elemento trovato in '+esc(LABELS[currentKind]||currentKind)+'.</b><br>Premi “Aggiorna Repository da file”. Se resta vuoto, verifica che esistano file nelle cartelle recipes/, firmware/, assets/audio/ o nei moduli Label/Layout.</div></td></tr>';
  }
  function formItem(){return {id:selectedId||('repo_'+Date.now()+'_'+Math.random().toString(16).slice(2)),name:($('repo424a-name')||{}).value||'',revision:($('repo424a-revision')||{}).value||'REV_A',author:($('repo424a-author')||{}).value||user(),status:($('repo424a-status')||{}).value||'Draft',notes:($('repo424a-notes')||{}).value||'',createdAt:now(),updatedAt:now()}}
  function fill(x){selectedId=x&&x.id||null;if($('repo424a-name'))$('repo424a-name').value=x&&x.name||'';if($('repo424a-revision'))$('repo424a-revision').value=x&&x.revision||'REV_A';if($('repo424a-author'))$('repo424a-author').value=x&&x.author||user();if($('repo424a-status'))$('repo424a-status').value=x&&x.status||'Draft';if($('repo424a-notes'))$('repo424a-notes').value=x&&x.notes||''}
  window.showRepositoryCenter424A=function(){if(window.showTab) window.showTab('repository-center-424a-tab',null);setTimeout(async function(){var db=ensure(); if(!hasAnyItems(db)){await window.repo424BAutoDiscover(true);} else {renderTable();}},80)};
  window.repo424ASelectKind=async function(k){currentKind=k;selectedId=null;fill(null);var ed=$('repo424a-editor'); if(ed) ed.style.display='none'; var db=ensure(); if(k==='recipes' && !(db.recipes||[]).length){ await window.repo424BAutoDiscover(true); } renderTable()};
  window.repo424AClearForm=function(){selectedId=null;fill(null)};
  window.repo424ASaveItem=function(){if(currentKind==='audit'||currentKind==='stations')return;var item=formItem();if(!item.name.trim()){toast('Inserire nome elemento repository','warn');return}var db=ensure();var list=db[currentKind]||[];var old=list.find(function(x){return x.id===item.id});if(old){item.createdAt=old.createdAt||item.createdAt;item.path=old.path;item.source=old.source;list=list.map(function(x){return x.id===item.id?item:x});audit('UPDATE',currentKind,item)}else{list.push(item);audit('CREATE',currentKind,item)}db[currentKind]=list;write(db);selectedId=item.id;toast('Elemento repository salvato','pass');renderTable()};
  window.repo424AEditItem=function(id){var db=ensure();var x=(db[currentKind]||[]).find(function(i){return i.id===id});if(x){fill(x);var ed=$('repo424a-editor'); if(ed) ed.style.display='block';toast('Elemento caricato in modifica','info')}};
  window.repo424ASetStatus=function(id,status){var db=ensure();var list=db[currentKind]||[];var item=null;list.forEach(function(x){if(x.id===id){x.status=status;x.updatedAt=now();item=x}});db[currentKind]=list;write(db);if(item)audit(status==='Published'?'PUBLISH':'ARCHIVE',currentKind,item);toast('Stato aggiornato: '+status,'pass');renderTable()};
  window.repo424APublishSelected=function(){if(selectedId) repo424ASetStatus(selectedId,'Published'); else toast('Seleziona o salva un elemento prima','warn')};
  window.repo424AArchiveSelected=function(){if(selectedId) repo424ASetStatus(selectedId,'Archived'); else toast('Seleziona o salva un elemento prima','warn')};

  window.repo424AToggleManualEditor=function(){
    var ed=$('repo424a-editor');
    if(!ed) return;
    if(currentKind==='audit'||currentKind==='stations'){
      toast('Inserimento manuale non disponibile in questa sezione','warn');
      return;
    }
    ed.style.display=(ed.style.display==='none'||!ed.style.display)?'block':'none';
  };

  window.repo424AExportJson=function(){download('AT_MEC_HM_4_24B_FIX5_REPOSITORY_'+Date.now()+'.json',{release:VERSION,exportedAt:now(),repository:ensure(),stations:readStations(),audit:readAudit()});audit('EXPORT','repository',{name:'Repository JSON',revision:'4.24B_FIX6',status:'Published'});renderTable()};
  window.repo424AReset=function(){if(!confirm('Vuoi svuotare il Repository locale?'))return;localStorage.removeItem(STORE);audit('RESET','repository',{name:'Repository locale',revision:'4.24B_FIX6',status:'Draft'});ensure();fill(null);renderTable()};
  window.repo424ASeedDemo=function(){var db=ensure();if(!db.recipes.length)db.recipes.push({id:'demo_recipe_1',name:'TEST_MLX_ATE_001',revision:'REV_C',status:'Published',author:user(),notes:'Ricetta demo pubblicata',createdAt:now(),updatedAt:now()});if(!db.firmware.length)db.firmware.push({id:'demo_fw_1',name:'FW_2.15.0',revision:'2.15.0',status:'Published',author:user(),notes:'Firmware demo',createdAt:now(),updatedAt:now()});if(!db.labels.length)db.labels.push({id:'demo_label_1',name:'MLX_STD_QR_DM',revision:'REV_A',status:'Published',author:user(),notes:'Template label demo',createdAt:now(),updatedAt:now()});if(!db.audio.length)db.audio.push({id:'demo_audio_1',name:'PASS.wav',revision:'REV_A',status:'Draft',author:user(),notes:'Audio demo evento PASS',createdAt:now(),updatedAt:now()});if(!db.layouts.length)db.layouts.push({id:'demo_layout_1',name:'Production Layout',revision:'REV_A',status:'Draft',author:user(),notes:'Layout demo produzione',createdAt:now(),updatedAt:now()});write(db);audit('SEED','repository',{name:'Demo Repository 4.24B',revision:'4.24B_FIX6',status:'Published'});toast('Demo repository creata','pass');renderTable()};
  window.repo424BAutoDiscover=async function(silent){var db=ensure();var a=0;a+=discoverFromVisibleRecipeSelectors(db);a+=await discoverFromApiRecipes(db);a+=discoverFromLocalStorage(db);a+=await discoverFromManifest(db);write(db);audit('AUTO_DISCOVERY','repository',{name:'Auto Discovery Repository',revision:'4.24B_FIX6',status:'Published'});if(!silent) toast('Auto Discovery completato: '+a+' elementi nuovi','pass');renderTable()};
  window.repo424BAddStation=function(){
    var a=readStations();
    var idx=a.length+1;
    var name='ATE-'+String(idx).padStart(2,'0');
    while(a.some(function(s){return s.id===name || s.name===name;})){
      idx++;
      name='ATE-'+String(idx).padStart(2,'0');
    }
    a.push({id:name,name:name,mode:'Manuale',lastSync:'Mai',status:'Non sincronizzata',recipes:'n/d',firmware:'n/d',labels:'n/d',audio:'n/d',layouts:'n/d'});
    writeStations(a);
    audit('ADD_STATION','stations',{name:name,station:name,status:'Draft'});
    currentKind='stations';
    toast('Postazione aggiunta: '+name,'pass');
    renderTable();
  };
  window.repo424BSyncStation=function(id){var v=currentPublishedVersions();var a=readStations().map(function(s){if(s.id===id){s.recipes=v.recipes;s.firmware=v.firmware;s.labels=v.labels;s.audio=v.audio;s.layouts=v.layouts;s.lastSync=new Date().toLocaleString();s.status='Allineata';audit('SYNC','stations',{name:'Sync risorse pubblicate',station:id,status:'Published',revision:'4.24B_FIX6'})}return s});writeStations(a);toast('Postazione sincronizzata: '+id,'pass');renderTable()};
  window.repo424BSyncAll=function(){var a=readStations();if(!a.length){repo424BAddStation();a=readStations()}a.forEach(function(s){repo424BSyncStation(s.id)});currentKind='stations';renderTable()};
  window.repo424BForceMismatch=function(id){var a=readStations().map(function(s){if(s.id===id){s.recipes='REV_VECCHIA / NON ALLINEATA';s.status='Mismatch Ricette';audit('MISMATCH_TEST','stations',{name:'Mismatch forzato',station:id,status:'Archived',revision:'OLD'})}return s});writeStations(a);toast('Mismatch forzato per test: '+id,'warn');renderTable()};
  window.repo424BRollbackStation=function(id){var a=readStations().map(function(s){if(s.id===id){s.status='Rollback eseguito';s.lastSync=new Date().toLocaleString();audit('ROLLBACK','stations',{name:'Rollback base',station:id,status:'Published',revision:'PREVIOUS'})}return s});writeStations(a);toast('Rollback base registrato: '+id,'pass');renderTable()};
  document.addEventListener('DOMContentLoaded',function(){setTimeout(async function(){ensure(); if(document.getElementById('repository-center-424a-tab')){var db=ensure(); if(!hasAnyItems(db)) await window.repo424BAutoDiscover(true); renderTable();}},500)});
})();
