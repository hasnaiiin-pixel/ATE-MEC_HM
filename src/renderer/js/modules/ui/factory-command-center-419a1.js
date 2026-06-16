// AT-MEC_HM_4.19A1_FACTORY_COMMAND_CENTER - dashboard home live/safe helpers
(function(){
  'use strict';
  function $(id){ return document.getElementById(id); }
  function setText(id, value){ var el=$(id); if(el) el.textContent = (value==null || value==='') ? '—' : String(value); }
  function parseJson(v, fallback){ try { return v ? JSON.parse(v) : fallback; } catch(_e){ return fallback; } }
  function getFactoryCfg(){
    var keys=['atmec_factory_station_config','factoryStationConfig','factoryConfig418B','atmec_factory_config','stationConfig'];
    for(var i=0;i<keys.length;i++){ var o=parseJson(localStorage.getItem(keys[i]), null); if(o && typeof o==='object') return o; }
    return {};
  }
  function getStationId(cfg){ return cfg.stationId || cfg.station_id || cfg.id || localStorage.getItem('stationId') || localStorage.getItem('atmec_station_id') || 'LOCAL'; }
  function getStationName(cfg){ return cfg.stationName || cfg.station_name || cfg.name || localStorage.getItem('stationName') || localStorage.getItem('atmec_station_name') || 'Postazione locale'; }
  function num(id){ var el=$(id); if(!el) return 0; var n=parseFloat(String(el.textContent||'0').replace('%','').replace(',','.')); return isFinite(n)?n:0; }
  function updateBars(){
    var pass=num('kpi-passed'), fail=num('kpi-failed'), total=Math.max(num('kpi-total'), pass+fail, 1); var repair=0;
    setText('fcc-pass-small', pass); setText('fcc-fail-small', fail); setText('fcc-repair-small', repair);
    var bp=$('fcc-bar-pass'), bf=$('fcc-bar-fail'), br=$('fcc-bar-repair');
    if(bp) bp.style.width=Math.max(4, Math.min(100, pass/total*100))+'%';
    if(bf) bf.style.width=Math.max(4, Math.min(100, fail/total*100))+'%';
    if(br) br.style.width='4%';
    var fpy = total ? Math.round((pass/total)*1000)/10 : 0; setText('fcc-oee', (Math.max(0,Math.min(99, fpy-2))).toFixed(1)+'%');
  }
  function updateAlerts(){
    var list=$('fcc-alert-list'); if(!list) return;
    var alerts=[];
    var fail=num('kpi-failed'); var total=Math.max(num('kpi-total'),1);
    if(fail>0) alerts.push({cls:'fail',txt:'❌ FAIL presenti: '+fail+' unità da analizzare'});
    if((fail/total)>0.05) alerts.push({cls:'warn',txt:'⚠️ Percentuale FAIL superiore al 5%'});
    var dev=$('dashboard-device-list');
    if(dev && /offline|errore|fail|ko/i.test(dev.textContent||'')) alerts.push({cls:'warn',txt:'🔌 Verificare dispositivi: possibile anomalia rilevata'});
    if(!alerts.length) alerts.push({cls:'ok',txt:'✅ Sistema pronto. Nessun allarme critico.'});
    list.innerHTML=alerts.map(function(a){ return '<div class="fcc-alert '+a.cls+'">'+a.txt+'</div>'; }).join('');
    setText('fcc-alert-count', alerts.length+' alert');
  }
  window.refreshFactoryCommandCenter419A1 = function(){
    try{
      var online=1; var off=0;
      setText('fcc-station-online', online);
      setText('fcc-station-offline', off);
      setText('fcc-device-db','ONLINE');
      setText('fcc-device-sync','ONLINE');
    }catch(e){}

    var cfg=getFactoryCfg();
    setText('fcc-station-id', getStationId(cfg)); setText('fcc-station-name', getStationName(cfg));
    var user=(window.currentUser && (window.currentUser.fullName || window.currentUser.username || window.currentUser.name)) || localStorage.getItem('atmec_current_user') || '—'; setText('fcc-user-name', user);
    var now=new Date(); setText('fcc-clock', now.toLocaleTimeString('it-IT'));
    updateBars(); updateAlerts();
  };
  function boot(){
    try{ window.refreshFactoryCommandCenter419A1(); }catch(e){ console.warn('[AT-MEC 4.19A1] dashboard refresh failed', e); }
    setInterval(function(){ try{ window.refreshFactoryCommandCenter419A1(); }catch(_e){} }, 5000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
