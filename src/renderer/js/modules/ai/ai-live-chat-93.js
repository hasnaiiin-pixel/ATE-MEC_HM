// AT-MEC_HM 9.3 - AI Live Chat & Visible Messages
// Chat AI visibile dentro AI Copilot. Read-only: non modifica WO, ricette, utenti, test o hardware.
(function(){
  'use strict';
  var VERSION='AT-MEC_HM_9.3_AI_LIVE_CHAT_VISIBLE_MESSAGES';
  var CHAT_KEY='atmec93_ai_chat_history';
  var MSG_KEY='atmec93_ai_visible_messages';
  var LAST_KEY='atmec93_ai_last_answer';
  var ACTION_SUGGESTIONS_KEY='atmec93_ai_chat_action_suggestions';
  var CONTEXT_KEY='atmec93_ai_chat_context';
  var PROVIDER_CONFIG_KEY='atmec77_ai_provider_config';
  var LEGACY_PROVIDER_CONFIG_KEY='atmec76_ai_provider_config';
  var API_KEY_SESSION='atmec77_ai_provider_api_key_session';

  function $(id){return document.getElementById(id);}
  function now(){return new Date().toISOString();}
  function arr(v){return Array.isArray(v)?v:[];}
  function norm(v){return String(v==null?'':v).trim();}
  function num(v){var n=Number(v);return isFinite(n)?n:0;}
  function read(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(_e){return d;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v,null,2));}catch(_e){}}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function clip(s,n){s=norm(s);return s.length>n?s.slice(0,n-1)+'…':s;}
  function toast(m,t){
    try{
      var s=$('ai93-chat-status'); if(s){s.textContent=m; s.className='ai93-chat-status '+(t||'info');}
      var global=$('ai76-ui-status'); if(global){global.textContent=m; global.className='ai76-ui-status '+(t||'info');}
      var fn=(typeof window.showToast==='function')?window.showToast:((typeof window.toast==='function')?window.toast:null);
      if(fn) fn(m,t||'info'); else console.log('[AI 9.3]',m);
    }catch(_e){console.log('[AI 9.3]',m);}
  }
  function hashText(s){var h=2166136261; s=String(s||''); for(var i=0;i<s.length;i++){h^=s.charCodeAt(i); h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);} return ('0000000'+(h>>>0).toString(16)).slice(-8).toUpperCase();}
  function download(name,text,type){var blob=new Blob([text],{type:type||'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(_e){}},800);}

  function providerConfig(){
    var cfg=Object.assign({enabled:false,provider:'local_rules',endpoint:'',model:'',mode:'read_only',approvalRequired:true,allowExternal:false,hasApiKey:false}, read(PROVIDER_CONFIG_KEY,null)||read(LEGACY_PROVIDER_CONFIG_KEY,{})||{});
    cfg.allowExternal=!!cfg.enabled && cfg.provider!=='local_rules';
    cfg.hasApiKey=!!sessionStorage.getItem(API_KEY_SESSION) || !!cfg.hasApiKey;
    return cfg;
  }
  function endpointFor(cfg){
    var ep=norm(cfg.endpoint);
    if(cfg.provider==='openai_compatible' && ep && !/\/chat\/completions\/?$/i.test(ep)) ep=ep.replace(/\/+$/,'')+'/v1/chat/completions';
    return ep;
  }
  function providerPayload(cfg,prompt){
    if(cfg.provider==='openai_compatible'){
      return {model:cfg.model||'gpt',temperature:0.2,messages:[{role:'system',content:'Sei AI Copilot per AT-MEC HM. Rispondi in italiano, usa solo il contesto fornito, non inventare dati e non proporre modifiche automatiche. Le azioni devono essere manuali e approvate.'},{role:'user',content:prompt}]};
    }
    return {version:VERSION,model:cfg.model||'',prompt:prompt,rule:'manual_approval_required_no_runtime_change'};
  }
  function parseProviderResponse(cfg,data){
    try{if(cfg.provider==='openai_compatible' && data && data.choices && data.choices[0]) return data.choices[0].message&&data.choices[0].message.content || data.choices[0].text || JSON.stringify(data,null,2);}catch(_e){}
    if(data && typeof data==='object') return data.answer||data.response||data.text||data.content||JSON.stringify(data,null,2);
    return String(data==null?'':data);
  }

  function collectContext(refresh){
    if(refresh){
      try{if(typeof window.runAiProductionSupervisor92==='function')window.runAiProductionSupervisor92();}catch(_e){}
      try{if(typeof window.runAiFactoryCommand90==='function')window.runAiFactoryCommand90();}catch(_e){}
      try{if(typeof window.runAiReady80==='function')window.runAiReady80();}catch(_e){}
    }
    var ctx={
      version:VERSION,
      createdAt:now(),
      provider:providerConfig(),
      productionSupervisor:read('atmec92_ai_production_supervisor_report',null),
      commandCenter:read('atmec90_ai_factory_command_report',null),
      actionQueue:read('atmec91_ai_action_queue',[]),
      aiReady:read('atmec80_ai_ready_report',null),
      completeReport:read('atmec762_ai_complete_report',null),
      failAdvisor:read('atmec762_ai_fail_advisor',[]),
      recipeAdvisor:read('atmec762_ai_recipe_advisor',[]),
      actionPlan:read('atmec762_ai_action_plan',null),
      canonicalContext:read('atmec75_canonical_context',null)||read('atmec74_unified_context',null)||read('atmec76_ai_context',null),
      safety:{readOnly:true,noAutomaticRuntimeChanges:true,noRecipeChanges:true,noWoChanges:true,noHardwareChanges:true,noUserChanges:true,apiKeyExported:false}
    };
    write(CONTEXT_KEY,ctx);
    return ctx;
  }
  function summarizeContext(ctx){
    var sup=ctx.productionSupervisor||{};
    var wo=sup.workOrder||{};
    var queue=arr(ctx.actionQueue);
    var provider=ctx.provider||{};
    var ready=ctx.aiReady||{};
    return {
      wo:wo.code||wo.commessa||'n/d',
      qty:wo.qty||0,
      done:wo.done||0,
      pass:wo.pass||0,
      fail:wo.fail||0,
      residue:wo.residue||0,
      yield:wo.yield||0,
      productionState:sup.state||'CHECK',
      productionRisk:sup.riskScore==null?'--':sup.riskScore+'%',
      aiReady:ready.score==null?(ready.readinessScore==null?'--':ready.readinessScore+'%'):ready.score+'%',
      pendingActions:queue.filter(function(x){return String(x.status||'PENDING')==='PENDING';}).length,
      provider:provider.enabled?(provider.provider||'provider'):'local/offline'
    };
  }
  function renderContext(ctx){
    var box=$('ai93-context-summary'); if(!box)return;
    var s=summarizeContext(ctx||collectContext(false));
    var rows=[['WO',s.wo],['Prodotte',s.done+' / '+(s.qty||'n/d')],['PASS',s.pass],['FAIL',s.fail],['Residuo',s.residue],['Yield',s.yield?(s.yield+'%'):'n/d'],['Rischio produzione',s.productionRisk+' · '+s.productionState],['Azioni pendenti',s.pendingActions],['Provider',s.provider]];
    box.innerHTML=rows.map(function(r){return '<div class="ai93-context-line"><b>'+esc(r[0])+'</b><span>'+esc(r[1])+'</span></div>';}).join('');
  }
  function messageList(){return arr(read(MSG_KEY,[]));}
  function addVisibleMessage(text,level){
    var msgs=messageList();
    msgs.push({id:'MSG93-'+Date.now(),at:now(),level:level||'info',text:text});
    msgs=msgs.slice(-20);
    write(MSG_KEY,msgs);
    renderVisibleMessages(msgs);
  }
  function renderVisibleMessages(msgs){
    var box=$('ai93-visible-messages'); if(!box)return;
    msgs=arr(msgs||messageList());
    if(!msgs.length){box.innerHTML='<div class="hint">Nessun messaggio AI visibile.</div>';return;}
    box.innerHTML=msgs.slice(-8).reverse().map(function(m){return '<div class="ai93-visible-message '+esc(m.level||'info')+'"><b>'+esc(String(m.level||'INFO').toUpperCase())+'</b><span>'+esc(m.text)+'</span><small>'+esc((m.at||'').replace('T',' ').slice(0,19))+'</small></div>';}).join('');
  }
  function chat(){return arr(read(CHAT_KEY,[]));}
  function saveChat(items){items=arr(items).slice(-80);write(CHAT_KEY,items);renderChat(items);return items;}
  function addChat(role,text,meta){
    var h=chat();
    h.push(Object.assign({id:'CHAT93-'+Date.now()+'-'+Math.floor(Math.random()*999),at:now(),role:role,text:text},meta||{}));
    return saveChat(h);
  }
  function renderChat(items){
    var box=$('ai93-chat-history'); if(!box)return;
    items=arr(items||chat());
    if(!items.length){box.innerHTML='<div class="hint">Nessuna conversazione. Le risposte AI appariranno qui.</div>';return;}
    box.innerHTML=items.map(function(m){
      return '<div class="ai93-chat-message '+esc(m.role)+'"><div class="ai93-chat-avatar">'+(m.role==='user'?'TU':'AI')+'</div><div class="ai93-chat-bubble"><div class="ai93-chat-meta"><b>'+esc(m.role==='user'?'Operatore':'AI Copilot')+'</b><span>'+esc((m.at||'').replace('T',' ').slice(0,19))+(m.source?' · '+esc(m.source):'')+'</span></div><p>'+esc(m.text).replace(/\n/g,'<br>')+'</p></div></div>';
    }).join('');
    try{box.scrollTop=box.scrollHeight;}catch(_e){}
  }
  function selectedQuestion(defaultText){
    var q=$('ai93-question');
    var text=q?norm(q.value):'';
    return text||defaultText||'Analizza la produzione attuale e dimmi cosa controllare prima di proseguire.';
  }
  function buildPrompt(question,ctx){
    var safeCtx=JSON.parse(JSON.stringify(ctx||{}));
    try{if(safeCtx.provider)safeCtx.provider.hasApiKey=!!safeCtx.provider.hasApiKey; delete safeCtx.apiKey; delete safeCtx.key;}catch(_e){}
    return 'DOMANDA OPERATORE:\n'+question+'\n\nCONTESTO AT-MEC HM SAFE/READ-ONLY:\n'+JSON.stringify(safeCtx,null,2)+'\n\nREGOLE:\n- Rispondi in italiano.\n- Usa solo dati presenti nel contesto.\n- Non inventare seriali, WO o misure.\n- Non applicare modifiche automatiche.\n- Se suggerisci azioni, devono essere manuali e approvate.';
  }
  function localAnswer(question,ctx){
    var q=question.toLowerCase();
    var sup=ctx.productionSupervisor||{};
    var wo=sup.workOrder||{};
    var risks=arr(sup.risks);
    var actions=arr(sup.recommendedActions);
    var fails=arr(ctx.failAdvisor);
    var recipes=arr(ctx.recipeAdvisor);
    var queue=arr(ctx.actionQueue);
    var s=summarizeContext(ctx);
    var lines=[];
    lines.push('Analisi AI locale/read-only completata.');
    if(s.wo!=='n/d') lines.push('WO/Commessa attiva: '+s.wo+'. Avanzamento: '+s.done+' prodotti su '+(s.qty||'quantità non disponibile')+', residuo '+s.residue+', PASS '+s.pass+', FAIL '+s.fail+'.');
    else lines.push('Non vedo una WO/Commessa completa nel contesto AI. Prima di usare analisi avanzate conviene selezionare o sincronizzare la WO.');
    if(s.productionRisk!=='--') lines.push('Rischio produzione attuale: '+s.productionRisk+' ('+s.productionState+').');
    if(q.indexOf('fail')>=0 || q.indexOf('qual')>=0 || q.indexOf('erro')>=0){
      if(fails.length) lines.push('FAIL/Qualità: '+fails.slice(0,3).map(function(x){return x.title||x.action||x.detail||'controllo qualità';}).join(' · ')+'.');
      else lines.push('Non trovo un elenco FAIL dettagliato già calcolato. Puoi eseguire Analisi completa AI o aggiornare Analytics per arricchire il contesto.');
    }
    if(q.indexOf('ricett')>=0 || q.indexOf('step')>=0 || q.indexOf('range')>=0){
      if(recipes.length) lines.push('Review ricetta: '+recipes.slice(0,3).map(function(x){return x.title||x.action||x.detail||'controllo ricetta';}).join(' · ')+'.');
      else lines.push('Non trovo una review ricetta già disponibile. La ricetta non viene modificata: posso solo suggerire controlli manuali.');
    }
    if(risks.length) lines.push('Rischi principali: '+risks.slice(0,3).map(function(r){return (r.area||'Area')+' '+(r.level||'CHECK')+' - '+(r.message||'verifica richiesta');}).join(' | ')+'.');
    if(actions.length) lines.push('Azioni consigliate: '+actions.slice(0,3).map(function(a){return a.action||a.title||a.area;}).join(' | ')+'.');
    else if(queue.length) lines.push('Ci sono '+queue.length+' voci in AI Action Queue. Controlla quelle pendenti prima di proseguire.');
    lines.push('Non ho modificato WO, ricette, utenti, test o hardware. Eventuali attività devono essere approvate o create in Action Queue.');
    return lines.join('\n');
  }
  async function callProvider(question,ctx){
    var cfg=providerConfig();
    if(!cfg.enabled || cfg.provider==='local_rules') return {source:'local rules',text:localAnswer(question,ctx),offline:true};
    if(!norm(cfg.endpoint)) return {source:'local fallback',text:'Provider AI attivo ma endpoint mancante. Uso risposta locale.\n\n'+localAnswer(question,ctx),offline:true};
    if(!window.confirm('Inviare questa domanda e contesto safe al provider AI configurato?\n\nNessuna azione verrà applicata automaticamente.')) return {source:'local rules',text:localAnswer(question,ctx),offline:true};
    var headers={'Content-Type':'application/json'};
    var key=sessionStorage.getItem(API_KEY_SESSION)||'';
    if(key) headers.Authorization='Bearer '+key;
    var prompt=buildPrompt(question,ctx);
    var res=await fetch(endpointFor(cfg),{method:'POST',headers:headers,body:JSON.stringify(providerPayload(cfg,prompt))});
    var raw=await res.text();
    var data=null; try{data=JSON.parse(raw);}catch(_e){data=raw;}
    if(!res.ok) throw new Error('Provider HTTP '+res.status+' '+clip(typeof data==='string'?data:JSON.stringify(data),220));
    return {source:cfg.provider||'provider',text:parseProviderResponse(cfg,data),offline:false,status:res.status};
  }
  function selectSection(){
    try{
      document.querySelectorAll('[data-ai-main],[data-ai-action]').forEach(function(btn){
        var m=btn.getAttribute('data-ai-main')==='chat93';
        btn.classList.toggle('ai76-action-selected',m);
        if(m) btn.setAttribute('aria-pressed','true'); else if(btn.getAttribute('data-ai-main')) btn.removeAttribute('aria-pressed');
      });
      document.querySelectorAll('.ai76-section-selected').forEach(function(el){el.classList.remove('ai76-section-selected');});
      var p=$('ai93-live-chat'); if(p)p.classList.add('ai76-section-selected');
    }catch(_e){}
  }
  function showSection(){
    try{if(typeof window.showAiCopilot76==='function')window.showAiCopilot76();else if(window.showTab)window.showTab('ai-copilot-tab',null);}catch(_e){}
    setTimeout(function(){selectSection();renderChat();renderVisibleMessages();renderContext(collectContext(false));try{var el=$('ai93-live-chat'); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});}catch(_e){}},360);
  }
  function setThinking(on){var st=$('ai93-chat-status'); if(st){st.classList.toggle('thinking',!!on); if(on)st.textContent='AI sta preparando la risposta...';}}

  window.showAiLiveChat93=function(){showSection();toast('AI Live Chat 9.3 selezionata','info');};
  window.askAiLiveChat93=async function(){
    selectSection();
    var question=selectedQuestion();
    var qbox=$('ai93-question'); if(qbox)qbox.value='';
    var ctx=collectContext(false);
    renderContext(ctx);
    addChat('user',question,{source:'operatore'});
    setThinking(true);
    try{
      var ans=await callProvider(question,ctx);
      write(LAST_KEY,{at:now(),question:question,answer:ans.text,source:ans.source,offline:!!ans.offline});
      addChat('assistant',ans.text,{source:ans.source});
      addVisibleMessage(ans.offline?'Risposta AI locale generata.':'Risposta provider AI ricevuta.',ans.offline?'info':'success');
      toast('Risposta AI visibile generata','success');
      return ans.text;
    }catch(e){
      var fallback='Provider AI non disponibile: '+(e&&e.message?e.message:e)+'\n\nUso risposta locale sicura.\n\n'+localAnswer(question,ctx);
      write(LAST_KEY,{at:now(),question:question,answer:fallback,source:'fallback local',offline:true,error:String(e&&e.message||e)});
      addChat('assistant',fallback,{source:'fallback local'});
      addVisibleMessage('Provider non disponibile, usata risposta locale.', 'warn');
      toast('Provider AI non disponibile: risposta locale generata','warn');
      return fallback;
    }finally{setThinking(false);selectSection();}
  };
  window.analyzeWithAiLiveChat93=function(){
    selectSection();
    var ctx=collectContext(true);
    renderContext(ctx);
    var q=$('ai93-question'); if(q)q.value='Analizza la produzione attuale, evidenzia rischi principali e dimmi cosa controllare come operatore/tecnico.';
    addVisibleMessage('Contesto AI aggiornato da 9.2/9.0/8.0. Pronta analisi conversazionale.', 'info');
    return window.askAiLiveChat93();
  };
  window.copyAiLastAnswer93=function(){
    selectSection();
    var last=read(LAST_KEY,null);
    var txt=last&&last.answer?last.answer:'';
    if(!txt){toast('Nessuna risposta AI da copiare','warn');return '';}
    var fallback=function(){
      try{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);toast('Risposta AI copiata negli appunti','success');}catch(_e){toast('Risposta AI pronta nella chat: copia manualmente','info');}
    };
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function(){toast('Risposta AI copiata negli appunti','success');}).catch(fallback); else fallback();
    return txt;
  };
  window.createAiActionFromLastAnswer93=function(){
    selectSection();
    var last=read(LAST_KEY,null);
    if(!last||!norm(last.answer)){toast('Nessuna risposta AI da trasformare in azione','warn');return null;}
    var action='Valutare risposta AI chat: '+clip(last.answer.replace(/\s+/g,' '),180);
    var sig=['AI Chat 9.3','Chat AI','Azione da risposta AI',action].join('|').toLowerCase();
    var item={id:'AI93-ACTION-'+hashText(sig),signature:sig,createdAt:now(),updatedAt:now(),status:'PENDING',source:'AI Chat 9.3',area:'AI Chat',title:'Azione da risposta AI',action:action,priority:'MEDIUM',detail:'Creata manualmente dal pulsante Crea azione da risposta. Nessuna modifica runtime applicata.',manualOnly:true,noRuntimeChange:true};
    var list=arr(read(ACTION_SUGGESTIONS_KEY,[]));
    if(!list.some(function(x){return x.signature===item.signature;})) list.push(item);
    write(ACTION_SUGGESTIONS_KEY,list);
    try{if(typeof window.refreshAiActionQueue91==='function')window.refreshAiActionQueue91();}catch(_e){}
    addVisibleMessage('Azione proposta inviata alla AI Action Queue 9.1 come PENDING.', 'success');
    toast('Azione creata in coda AI 9.1. Nessuna modifica automatica.','success');
    return item;
  };
  window.exportAiChat93=function(){
    var data={version:VERSION,createdAt:now(),history:chat(),messages:messageList(),lastAnswer:read(LAST_KEY,null),context:read(CONTEXT_KEY,null),actionSuggestions:read(ACTION_SUGGESTIONS_KEY,[]),safety:{readOnly:true,noAutomaticRuntimeChanges:true,noRecipeChanges:true,noWoChanges:true,noHardwareChanges:true,apiKeyExported:false}};
    if(data.context&&data.context.provider)data.context.provider.hasApiKey=!!data.context.provider.hasApiKey;
    download('AT_MEC_HM_9_3_AI_LIVE_CHAT_REPORT_'+Date.now()+'.json',JSON.stringify(data,null,2),'application/json');
    toast('Chat AI 9.3 esportata senza API key','success');
    return data;
  };
  window.clearAiChat93=function(){
    if(!window.confirm('Pulire solo lo storico chat AI 9.3 visibile? Non verranno modificati dati produzione.'))return;
    write(CHAT_KEY,[]); write(MSG_KEY,[]); write(LAST_KEY,null); renderChat([]); renderVisibleMessages([]); toast('Storico chat AI pulito','success');
  };
  function init(){setTimeout(function(){try{renderChat();renderVisibleMessages();renderContext(collectContext(false));}catch(e){console.warn('[AI 9.3 init]',e);}},2600);} 
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
