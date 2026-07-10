// AT-MEC_HM_9.5.2 - AI Menu Simplified + Chat Provider UX + Test Mode cleanup hooks
// Safe UI layer only. No runtime data changes, no hardware commands, no recipe/WO modifications.
(function(){
  'use strict';
  var VERSION='AT-MEC_HM_9.5.2_TESTMODE_AI_MENU_CHAT_CLEANUP';
  var CONFIG_KEY='atmec77_ai_provider_config';
  var API_KEY_SESSION='atmec77_ai_provider_api_key_session';
  function $(id){return document.getElementById(id);} 
  function read(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(_){return d;}}
  function hasKey(){try{return !!sessionStorage.getItem(API_KEY_SESSION);}catch(_){return false;}}
  function toast(msg,type){
    try{
      var s=$('ai76-ui-status'); if(s){s.textContent=msg; s.className='ai76-ui-status '+(type||'info');}
      var fn=window.showToast||window.toast; if(typeof fn==='function') fn(msg,type||'info'); else console.log('[AI 9.5.2]',msg);
    }catch(_e){console.log('[AI 9.5.2]',msg);}
  }
  function cfg(){
    var c=read(CONFIG_KEY,{})||{};
    return {
      enabled:!!c.enabled,
      provider:c.provider||c.type||'local_rules',
      endpoint:c.endpoint||'',
      model:c.model||'',
      hasApiKey:!!c.hasApiKey||hasKey(),
      approvalRequired:true
    };
  }
  function providerText(c){
    c=c||cfg();
    if(!c.enabled || c.provider==='local_rules') return {cls:'local',text:'Modalità AI: locale/offline · nessun dato inviato fuori dal PC.'};
    var missing=[]; if(!c.endpoint) missing.push('endpoint'); if(c.provider!=='custom_rest' && !c.hasApiKey) missing.push('API key sessione');
    if(missing.length) return {cls:'error',text:'Provider AI configurato ma incompleto: manca '+missing.join(' / ')+'. La chat userà fallback locale.'};
    return {cls:'provider',text:'Provider AI attivo: '+c.provider+' · invio contesto solo con conferma · nessuna azione automatica.'};
  }
  function updateProviderUx(){
    var c=cfg(); var p=providerText(c);
    ['ai952-chat-provider-banner','ai952-provider-pill'].forEach(function(id){
      var el=$(id); if(!el)return;
      el.textContent=p.text;
      el.className=(id==='ai952-provider-pill'?'ai952-provider-pill ':'ai952-chat-provider-banner ')+p.cls;
    });
    var meta=$('ai76-provider-meta'); if(meta) meta.textContent=(c.enabled?'Provider attivo':'Provider spento')+' · '+c.provider+' · approvazione manuale obbligatoria';
    var st=$('ai77-provider-status'); if(st && !/testato|errore|risposta/i.test(st.textContent||'')) st.textContent=p.text;
    return p;
  }
  function scrollTo(id){
    try{
      var el=$(id); if(el&&el.scrollIntoView) el.scrollIntoView({behavior:'smooth',block:'start'});
      document.querySelectorAll('.ai76-section-selected').forEach(function(x){x.classList.remove('ai76-section-selected');});
      if(el) el.classList.add('ai76-section-selected');
    }catch(_e){}
  }
  function base(){
    try{ if(typeof window.showAiCopilot76==='function') window.showAiCopilot76(); else if(window.showTab) window.showTab('ai-copilot-tab',null); }catch(_e){}
    setTimeout(updateProviderUx,180);
  }
  window.showAiChat952=function(){
    base();
    setTimeout(function(){
      updateProviderUx();
      if(typeof window.showAiLiveChat93==='function') window.showAiLiveChat93();
      scrollTo('ai93-live-chat');
      var q=$('ai93-question'); if(q) q.focus();
      toast('Chat AI selezionata. Modalità provider visibile sopra la chat.','info');
    },260);
  };
  window.showAiCommandCenter952=function(){
    base();
    setTimeout(function(){
      if(typeof window.showAiFactoryCommand90==='function') window.showAiFactoryCommand90();
      else scrollTo('ai90-command-center');
      toast('Command Center AI selezionato: include 9.0, supervisione 9.2 e analisi completa.','info');
    },260);
  };
  window.showAiActions952=function(){
    base();
    setTimeout(function(){
      if(typeof window.showAiActionQueue91==='function') window.showAiActionQueue91();
      else scrollTo('ai91-action-queue');
      toast('Azioni AI selezionate: coda manuale, nessuna modifica automatica.','info');
    },260);
  };
  window.showAiSettings952=function(){
    base();
    setTimeout(function(){
      updateProviderUx();
      scrollTo('ai952-settings-provider');
      toast('Impostazioni AI selezionate: provider, approvazioni, AI Ready e hardening.','info');
    },260);
  };
  window.testAiProviderFromChat952=function(){
    updateProviderUx();
    if(typeof window.testAiProvider77==='function'){
      try{window.testAiProvider77();}catch(e){toast('Errore test provider: '+(e&&e.message?e.message:e),'warn');}
    }else{
      toast('Test provider non disponibile in questa build.','warn');
    }
  };

  // Disable duplicate top device state strip from older Test Mode modern layer.
  window.atmec952DisableTopInstrumentBar=function(){
    try{var bar=$('atmec66e-instrument-bar'); if(bar) bar.remove();}catch(_e){}
  };
  document.addEventListener('DOMContentLoaded',function(){
    updateProviderUx();
    setTimeout(updateProviderUx,800);
    setInterval(function(){updateProviderUx(); window.atmec952DisableTopInstrumentBar();},3000);
  });
  window.addEventListener('storage',updateProviderUx);
  window.AT_MEC_HM_952_AI_MENU_CHAT_UX={version:VERSION,updateProviderUx:updateProviderUx};
})();
