// AT-MEC HM 4.1 - versione UI centralizzata
(function(){
  'use strict';
  var VERSION = '4.12B';
  function setText(sel, txt){ var el=document.querySelector(sel); if(el) el.textContent=txt; }
  function applyVersion(){
    document.title = 'ATE-MEC Suite v4.12B';
    setText('.login-title', 'ATE-MEC HM ' + VERSION);
    setText('#topbar .ver', 'Suite v4.12B');
    var logo = document.getElementById('app-title-logo');
    if(logo) logo.setAttribute('title','AT-MEC HM '+VERSION);
    try{ window.AT_MEC_VERSION = VERSION; }catch(_e){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyVersion);
  else applyVersion();
})();
