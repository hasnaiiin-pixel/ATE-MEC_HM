// AT-MEC_HM 8.0 - AI Provider Approval Persistence UX
// Estensione sicura della pagina AI Copilot: provider configurabile e coda approvazioni manuali.
// Non duplica moduli business e non modifica ricette, WO, utenti, test o hardware.
(function(){
  'use strict';
  var VERSION='AT-MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE';
  var CONFIG_KEY='atmec77_ai_provider_config';
  var LEGACY_PROVIDER_KEY='atmec76_ai_provider_config';
  var API_KEY_SESSION='atmec77_ai_provider_api_key_session';
  var APPROVAL_KEY='atmec77_ai_approval_queue';
  var LAST_PROVIDER_KEY='atmec77_ai_provider_last_response';
  function $(id){return document.getElementById(id);}
  function now(){return new Date().toISOString();}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function norm(v){return String(v==null?'':v).trim();}
  function arr(v){return Array.isArray(v)?v:[];}
  function read(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?d:v;}catch(_){return d;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v,null,2));}catch(_){}}
  function raw(k){try{return localStorage.getItem(k)||'';}catch(_){return '';}}
  function toast(m,t){
    try{
      var s=$('ai76-ui-status'); if(s){s.textContent=m; s.className='ai76-ui-status '+(t||'info');}
      var ps=$('ai77-provider-status'); if(ps){ps.textContent=m; ps.className='ai77-provider-status '+(t||'info');}
      var fn=(typeof window.showToast==='function')?window.showToast:((typeof window.toast==='function')?window.toast:null);
      if(fn) fn(m,t||'info'); else console.log('[AI 8.0]',m);
    }catch(_e){console.log('[AI 8.0]',m);}
  }
  function defaultConfig(){return {enabled:false,provider:'local_rules',endpoint:'',model:'',mode:'read_only',allowExternal:false,approvalRequired:true,hasApiKey:false,updatedAt:''};}
  function getConfig(){
    var cfg=Object.assign(defaultConfig(), read(CONFIG_KEY,null)||read(LEGACY_PROVIDER_KEY,{})||{});
    cfg.approvalRequired=true;
    cfg.allowExternal=!!cfg.enabled && cfg.provider!=='local_rules';
    cfg.hasApiKey=!!sessionStorage.getItem(API_KEY_SESSION) || !!cfg.hasApiKey;
    return cfg;
  }
  function setResult(html,level){var box=$('ai77-provider-result'); if(box){box.innerHTML=html||'<div class="hint">Nessun risultato.</div>'; box.className='ai77-provider-result '+(level||'info');}}
  function renderConfig(cfg){
    cfg=cfg||getConfig();
    var en=$('ai76-provider-enabled'); if(en) en.checked=!!cfg.enabled;
    var p=$('ai76-provider-type'); if(p) p.value=cfg.provider||'local_rules';
    var ep=$('ai76-provider-endpoint'); if(ep) ep.value=cfg.endpoint||'';
    var m=$('ai76-provider-model'); if(m) m.value=cfg.model||'';
    var mode=$('ai76-action-mode'); if(mode) mode.value=cfg.mode||'read_only';
    var meta=$('ai76-provider-meta'); if(meta) meta.textContent=(cfg.enabled?'Provider attivo':'Provider spento')+' · '+(cfg.provider||'local_rules')+' · approvazione manuale obbligatoria';
    var status=$('ai77-provider-status'); if(status) status.textContent='Provider '+(cfg.enabled?'ON':'OFF')+' · '+(cfg.provider||'local_rules')+' · API key '+(cfg.hasApiKey?'presente in sessione':'non presente')+' · nessuna azione automatica';
  }
  function saveConfig(){
    var cfg=getConfig();
    var en=$('ai76-provider-enabled'), p=$('ai76-provider-type'), ep=$('ai76-provider-endpoint'), m=$('ai76-provider-model'), mode=$('ai76-action-mode'), key=$('ai77-provider-api-key');
    cfg.enabled=!!(en&&en.checked);
    cfg.provider=p?p.value:'local_rules';
    cfg.endpoint=ep?norm(ep.value):'';
    cfg.model=m?norm(m.value):'';
    cfg.mode=mode?mode.value:'read_only';
    cfg.approvalRequired=true;
    cfg.allowExternal=cfg.enabled && cfg.provider!=='local_rules';
    if(key&&norm(key.value)){try{sessionStorage.setItem(API_KEY_SESSION,norm(key.value)); cfg.hasApiKey=true; key.value=''; key.placeholder='API key presente solo in sessione';}catch(_e){cfg.hasApiKey=false;}}
    cfg.updatedAt=now();
    write(CONFIG_KEY,cfg);
    write(LEGACY_PROVIDER_KEY,{enabled:cfg.enabled,provider:cfg.provider,endpoint:cfg.endpoint,model:cfg.model,mode:cfg.mode,allowExternal:cfg.allowExternal,requireConfirmation:true,hasApiKey:cfg.hasApiKey,updatedAt:cfg.updatedAt});
    renderConfig(cfg);
    toast('Configurazione AI 7.7 salvata. Approvazione manuale obbligatoria.','success');
    return cfg;
  }
  function validation(cfg){
    cfg=cfg||getConfig();
    var checks=[];
    function add(label,ok,detail){checks.push({label:label,ok:!!ok,detail:detail||''});}
    add('Modalità sicura', cfg.approvalRequired===true, 'approvazione manuale sempre obbligatoria');
    add('Provider selezionato', !!cfg.provider, cfg.provider||'—');
    if(!cfg.enabled || cfg.provider==='local_rules'){
      add('Offline/local rules', true, 'nessun dato inviato fuori dal PC');
    }else{
      add('Endpoint presente', !!cfg.endpoint, cfg.endpoint||'mancante');
      add('Modello presente', cfg.provider==='custom_rest' || !!cfg.model, cfg.model||'mancante');
      add('API key sessione', cfg.provider==='custom_rest' || !!sessionStorage.getItem(API_KEY_SESSION) || !!cfg.hasApiKey, 'key non esportata nei report');
    }
    return {version:VERSION,createdAt:now(),ok:checks.every(function(c){return c.ok;}),checks:checks,config:{enabled:cfg.enabled,provider:cfg.provider,endpoint:cfg.endpoint,model:cfg.model,mode:cfg.mode,hasApiKey:cfg.hasApiKey,approvalRequired:true}};
  }
  function renderValidation(v){
    setResult('<div class="ai77-check-list">'+arr(v.checks).map(function(c){return '<div class="ai77-check '+(c.ok?'ok':'warn')+'"><b>'+esc(c.ok?'OK':'CHECK')+'</b><span>'+esc(c.label)+'</span><small>'+esc(c.detail)+'</small></div>';}).join('')+'</div>', v.ok?'success':'warn');
  }
  function endpointFor(cfg){
    var ep=norm(cfg.endpoint);
    if(cfg.provider==='openai_compatible' && ep && !/\/chat\/completions\/?$/i.test(ep)) ep=ep.replace(/\/+$/,'')+'/v1/chat/completions';
    return ep;
  }
  function providerPayload(cfg,prompt,isTest){
    if(cfg.provider==='openai_compatible') return {model:cfg.model||'gpt',temperature:0.2,messages:[{role:'system',content:'Sei AI Copilot per AT-MEC HM. Rispondi in modo tecnico, breve, senza inventare dati e senza proporre azioni automatiche.'},{role:'user',content:prompt}]};
    return {version:VERSION,model:cfg.model||'',prompt:prompt,test:!!isTest,rule:'manual_approval_required_no_runtime_change'};
  }
  function parseProviderResponse(cfg,data){
    try{ if(cfg.provider==='openai_compatible' && data && data.choices && data.choices[0]) return data.choices[0].message && data.choices[0].message.content || data.choices[0].text || JSON.stringify(data,null,2); }catch(_e){}
    if(data && typeof data==='object') return data.answer || data.response || data.text || data.content || JSON.stringify(data,null,2);
    return String(data==null?'':data);
  }
  async function callProvider(prompt,isTest){
    var cfg=saveConfig();
    var v=validation(cfg); renderValidation(v);
    if(!v.ok) throw new Error('Configurazione provider incompleta.');
    if(!cfg.enabled || cfg.provider==='local_rules') return {offline:true,text:'Provider in modalità local_rules/offline. Test configurazione OK: nessun dato inviato fuori dal PC.'};
    var msg=isTest?'Inviare un prompt tecnico di test al provider AI configurato?':'Inviare il prompt AI corrente al provider esterno?';
    if(!window.confirm(msg+'\n\nNessuna azione verrà applicata automaticamente.')) throw new Error('Invio annullato da operatore.');
    var key=sessionStorage.getItem(API_KEY_SESSION)||'';
    var headers={'Content-Type':'application/json'};
    if(key) headers.Authorization='Bearer '+key;
    var res=await fetch(endpointFor(cfg),{method:'POST',headers:headers,body:JSON.stringify(providerPayload(cfg,prompt,isTest))});
    var text=await res.text();
    var data=null; try{data=JSON.parse(text);}catch(_e){data=text;}
    if(!res.ok) throw new Error('HTTP '+res.status+' '+(typeof data==='string'?data:JSON.stringify(data)).slice(0,260));
    return {offline:false,text:parseProviderResponse(cfg,data),raw:data,status:res.status};
  }
  function currentPrompt(){
    var p=$('ai76-prompt'); var val=p?norm(p.value):'';
    if(!val && typeof window.createAiPrompt76==='function') val=window.createAiPrompt76()||'';
    return val || raw('atmec76_ai_last_prompt') || 'Esegui test provider AT-MEC HM senza dati produzione.';
  }
  function rowsFromStored(){
    var out=[];
    var plan=read('atmec762_ai_action_plan',{});
    arr(plan.steps).forEach(function(s){out.push({area:s.area||'Piano azione',title:s.area||'Azione AI',action:s.action||s.why||'',source:'action_plan',risk:s.level||'info'});});
    arr(read('atmec762_ai_recipe_advisor',[])).forEach(function(s){out.push({area:'Ricetta',title:s.title||'Review ricetta',action:s.action||s.detail||'',source:'recipe_advisor',risk:s.level||'info'});});
    arr(read('atmec762_ai_fail_advisor',[])).forEach(function(s){out.push({area:'Qualità',title:s.title||'FAIL / Qualità',action:s.action||s.detail||'',source:'fail_advisor',risk:s.level||'info'});});
    return out.filter(function(x){return norm(x.action)||norm(x.title);});
  }
  function canonicalText(v){return norm(v).toLowerCase().replace(/\s+/g,' ');}
  function approvalSignature(x){
    return [x.area,x.title,x.action,x.source,x.risk].map(canonicalText).join('|');
  }
  function hashText(s){
    var h=2166136261;
    for(var i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i); h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}
    return ('0000000'+(h>>>0).toString(16)).slice(-8).toUpperCase();
  }
  function approvalId(sig){return 'AI77-'+hashText(sig);}
  function mergeApprovalState(base,existing){
    var bySig={};
    arr(existing).forEach(function(item){
      var sig=item.signature||approvalSignature(item);
      if(sig) bySig[sig]=item;
    });
    return arr(base).map(function(x){
      var sig=approvalSignature(x);
      var prev=bySig[sig]||null;
      return {
        id:(prev&&prev.id)||approvalId(sig),
        signature:sig,
        createdAt:(prev&&prev.createdAt)||now(),
        updatedAt:now(),
        status:(prev&&prev.status)||'PENDING',
        area:x.area,
        title:x.title,
        action:x.action,
        source:x.source,
        risk:x.risk,
        manualOnly:true,
        noRuntimeChange:true,
        decidedAt:prev&&prev.decidedAt||'',
        note:prev&&prev.note||''
      };
    });
  }
  function queue(){return arr(read(APPROVAL_KEY,[]));}
  function saveQueue(q){write(APPROVAL_KEY,arr(q)); renderQueue(q); return q;}
  function renderQueue(q){
    q=arr(q||queue());
    var box=$('ai77-approval-queue'); if(!box)return;
    if(!q.length){box.innerHTML='<div class="hint">Nessuna richiesta. Premi Crea coda approvazioni dopo aver generato insight/piano azione.</div>';return;}
    box.innerHTML=q.map(function(it){
      var st=String(it.status||'PENDING');
      var locked=st!=='PENDING';
      var note=it.note?'<em class="ai77-decision-note">'+esc(it.note)+'</em>':'';
      return '<div class="ai77-approval-item '+esc(st.toLowerCase())+'"><div><b>'+esc(it.area)+' · '+esc(it.title)+'</b><small>'+esc(it.action)+'</small><em>Fonte: '+esc(it.source)+' · rischio: '+esc(it.risk)+' · stato: <strong>'+esc(st)+'</strong></em>'+note+'</div><div class="ai77-approval-actions"><span class="ai77-status-pill '+esc(st.toLowerCase())+'">'+esc(st.replace('_NO_RUNTIME_CHANGE',''))+'</span><button class="btn btn-success btn-sm" onclick="approveAiItem77(\''+esc(it.id)+'\')" '+(locked?'disabled':'')+'>Approva</button><button class="btn btn-ghost btn-sm" onclick="rejectAiItem77(\''+esc(it.id)+'\')" '+(locked?'disabled':'')+'>Rifiuta</button></div></div>';
    }).join('');
  }
  window.saveAiProviderSettings77=function(){try{if(window.setActiveAiSection771)window.setActiveAiSection771('provider');}catch(_e){} return saveConfig();};
  window.testAiProvider77=function(){
    try{if(window.setActiveAiSection771)window.setActiveAiSection771('provider');}catch(_e){}
    var prompt='Test connessione AI AT-MEC HM 7.7. Rispondi solo: PROVIDER_OK e una riga di conferma. Non usare dati produzione.';
    callProvider(prompt,true).then(function(r){
      write(LAST_PROVIDER_KEY,{version:VERSION,createdAt:now(),test:true,offline:!!r.offline,text:r.text,status:r.status||0});
      setResult('<div class="ai77-provider-answer"><b>Test provider completato</b><pre>'+esc(r.text)+'</pre></div>','success');
      toast('Test provider AI completato','success');
    }).catch(function(e){setResult('<div class="ai77-provider-answer error"><b>Test provider non riuscito</b><pre>'+esc(e.message||e)+'</pre></div>','error');toast('Test provider AI non riuscito','error');});
  };
  window.generateAiProviderAnswer77=function(){
    try{if(window.setActiveAiSection771)window.setActiveAiSection771('provider');}catch(_e){}
    var prompt=currentPrompt();
    callProvider(prompt,false).then(function(r){
      var payload={version:VERSION,createdAt:now(),test:false,offline:!!r.offline,text:r.text,status:r.status||0};
      write(LAST_PROVIDER_KEY,payload);
      setResult('<div class="ai77-provider-answer"><b>Risposta AI provider</b><pre>'+esc(r.text)+'</pre></div>','success');
      toast('Risposta AI provider generata. Nessuna azione applicata.','success');
    }).catch(function(e){setResult('<div class="ai77-provider-answer error"><b>Risposta provider non generata</b><pre>'+esc(e.message||e)+'</pre></div>','error');toast('Risposta provider non generata','error');});
  };
  window.buildAiApprovalQueue77=function(){
    try{if(window.setActiveAiSection771)window.setActiveAiSection771('approvals');}catch(_e){}
    if(typeof window.runAiCompleteAnalysis762==='function') { try{window.runAiCompleteAnalysis762(); if(window.setActiveAiSection771)window.setActiveAiSection771('approvals');}catch(_e){} }
    var base=rowsFromStored();
    var existing=queue();
    var q=mergeApprovalState(base,existing);
    if(!q.length && existing.length) q=existing;
    saveQueue(q);
    var kept=q.filter(function(x){return x.status&&x.status!=='PENDING';}).length;
    toast('Coda approvazioni AI aggiornata: '+q.length+' richieste · decisioni mantenute: '+kept,'success');
    try{var el=$('ai77-approval-queue'); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'center'});}catch(_e){}
    return q;
  };
  window.approveAiItem77=function(id){
    try{if(window.setActiveAiSection771)window.setActiveAiSection771('approvals');}catch(_e){}
    var q=queue().map(function(x){if(x.id===id && x.status==='PENDING'){x.status='APPROVED_NO_RUNTIME_CHANGE';x.decidedAt=now();x.note='Decisione registrata. Nessuna modifica automatica applicata.';}return x;});
    saveQueue(q); toast('Richiesta AI approvata solo come registro. Nessuna modifica applicata.','success');
  };
  window.rejectAiItem77=function(id){
    try{if(window.setActiveAiSection771)window.setActiveAiSection771('approvals');}catch(_e){}
    var q=queue().map(function(x){if(x.id===id && x.status==='PENDING'){x.status='REJECTED';x.decidedAt=now();x.note='Rifiutata da operatore.';}return x;});
    saveQueue(q); toast('Richiesta AI rifiutata','info');
  };
  window.exportAiApprovals77=function(){
    var data={version:VERSION,createdAt:now(),config:validation(getConfig()).config,queue:queue(),lastProvider:read(LAST_PROVIDER_KEY,null)};
    var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='AT_MEC_HM_8_0_AI_APPROVAL_QUEUE_'+Date.now()+'.json'; a.click(); setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(_e){}},800); toast('Coda approvazioni AI esportata','success');
  };
  window.showAiProviderApproval77=function(){
    try{if(window.setActiveAiSection771)window.setActiveAiSection771('provider');}catch(_e){}
    renderConfig(getConfig()); renderQueue();
    try{var el=$('ai77-provider-status')||$('ai77-approval-queue'); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'center'});}catch(_e){}
  };
  function init(){setTimeout(function(){try{renderConfig(getConfig()); renderQueue();}catch(e){console.warn('[AI 8.0 init]',e);}},1300);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
