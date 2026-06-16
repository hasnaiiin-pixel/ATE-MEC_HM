/* AT-MEC_HM_4.16A_APP_JS_SPLIT - extracted from legacy app.js.
 * Compatibility mode: classic script, shares window/global scope with app.js.
 */

/* AT-MEC_HM_4.13O - Device Manager unificato */
(function(){
  'use strict';
  const DM_CFG_KEY='atmec.device_manager_413g.config';
  const DM_LOG_KEY='atmec.device_manager_413g.log';
  function dm413gNow(){ try{return new Date().toLocaleTimeString();}catch(_){return '';} }
  function dm413gEsc(v){ return (typeof escapeHtml==='function') ? escapeHtml(v) : String(v??'').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function dm413gReadCfg(){
    let cfg={};
    try{ cfg=JSON.parse(localStorage.getItem(DM_CFG_KEY)||'{}')||{}; }catch(_){ cfg={}; }
    return Object.assign({esp32Port:'',esp32Baud:115200,pl303Port:'',pl303Baud:9600,keysightResource:'',keysightMode:'USB_VISA',timeoutMs:3500,autoReconnect:false,excludeEsp32:false,excludePl303:false,excludeMeter:false}, cfg);
  }
  function dm413gSaveCfg(cfg){ try{ localStorage.setItem(DM_CFG_KEY, JSON.stringify(cfg||{},null,2)); }catch(_){} }
  function dm413gLog(msg, type='info'){
    const line=`[${dm413gNow()}] ${msg}`;
    let rows=[]; try{rows=JSON.parse(localStorage.getItem(DM_LOG_KEY)||'[]')||[]}catch(_){rows=[]}
    rows.push({line,type,ts:Date.now()}); rows=rows.slice(-250);
    try{localStorage.setItem(DM_LOG_KEY, JSON.stringify(rows));}catch(_){}
    const box=document.getElementById('dm413g-log'); if(box){ box.textContent=rows.map(r=>r.line).join('\n'); box.scrollTop=box.scrollHeight; }
  }
  function dm413gStatusOf(r){
    if(!r) return {txt:'OFFLINE', cls:'offline'};
    if(r.error) return {txt:'ERRORE', cls:'error'};
    if(r.mock) return {txt:'MOCK', cls:'mock'};
    if(r.live || r.connected || r.connected !== false) return {txt:'LIVE', cls:'live'};
    return {txt:'OFFLINE', cls:'offline'};
  }
  function dm413gNormalizeRows(rows){
    rows=Array.isArray(rows)?rows:[];
    const byName={}; rows.forEach(r=>{ if(r&&r.name) byName[r.name]=r; });
    const defaults=[
      {name:'modbus_serial', label:'ESP32-S3 USB JSON', group:'I/O digitale'},
      {name:'AimTTi_PL303', label:'Alimentatore PL303', group:'Alimentazione'},
      {name:'Keysight_34461A', label:'Keysight Multimetro', group:'Misure'},
      {name:'server_sync', label:'Server Sync', group:'Data Provider'},
      {name:'vision_camera', label:'Vision Camera', group:'Futuro'}
    ];
    return defaults.map(d=>Object.assign({}, d, byName[d.name]||{}));
  }
  async function dm413gGetRows(){
    let rows=[];
    try{ rows = api?.getProfessionalDevices ? await api.getProfessionalDevices() : []; }catch(e){ dm413gLog('Errore getProfessionalDevices: '+(e?.message||e),'fail'); }
    if(!rows || !rows.length){ try{ rows = api?.getHardwareStatuses ? await api.getHardwareStatuses() : []; }catch(e){} }
    return dm413gNormalizeRows(rows);
  }
  async function dm413gRefresh(){
    const host=document.getElementById('device-manager-page'); if(!host) return;
    const cfg=dm413gReadCfg();
    let rows=await dm413gGetRows();
    const online=rows.filter(r=>dm413gStatusOf(r).txt==='LIVE').length;
    const mock=rows.filter(r=>dm413gStatusOf(r).txt==='MOCK').length;
    const err=rows.filter(r=>['ERRORE','OFFLINE'].includes(dm413gStatusOf(r).txt)).length;
    const list=rows.map(r=>{
      const st=dm413gStatusOf(r);
      const conn=r.connectionString || r.conn || r.port || r.status || '-';
      const heartbeat=r.lastHeartbeat || r.heartbeat || r.updatedAt || '-';
      return `<div class="dm413g-device-card"><div><div class="dm413g-device-name">${dm413gEsc(r.label||friendlyDeviceLabel?.(r.name)||r.name)}</div><div class="dm413g-device-meta">${dm413gEsc(r.group||'Strumento')} · ${dm413gEsc(r.name||'')}</div></div><span class="dm413g-badge dm413g-${st.cls}">${st.txt}</span><div class="dm413g-device-meta">Porta/Risorsa: <b>${dm413gEsc(conn)}</b><br>Heartbeat: ${dm413gEsc(heartbeat)}</div><div class="dm413g-mini-actions"><button class="btn btn-ghost btn-sm" onclick="dm413gPing('${dm413gEsc(r.name||'')}')">Ping</button><button class="btn btn-ghost btn-sm" onclick="dm413gReconnectOne('${dm413gEsc(r.name||'')}')">Reconnect</button></div></div>`;
    }).join('');
    host.innerHTML=`
      <div class="dm413g-header"><div><div class="dm413g-title">🧠 Device Manager Unificato</div><div class="dm413g-sub">Stato strumenti, configurazione porte, diagnostica e sicurezza hardware.</div></div><div class="dm413g-actions"><button class="btn btn-primary btn-sm" onclick="dm413gDetect()">🔍 Rileva strumenti</button><button class="btn btn-ghost btn-sm" onclick="dm413gReconnectAll()">🔄 Riconnetti tutti</button><button class="btn btn-ghost btn-sm" onclick="dm413gResetConnections()">🧹 Reset connessioni</button><button class="btn btn-danger btn-sm dm413g-danger" onclick="dm413gEmergencyOff()">⚠ Emergency OFF</button></div></div>
      <div class="dm413g-kpi-grid"><div class="dm413g-kpi"><b>${rows.length}</b><span>Dispositivi</span></div><div class="dm413g-kpi"><b>${online}</b><span>Online</span></div><div class="dm413g-kpi"><b>${mock}</b><span>Mock</span></div><div class="dm413g-kpi"><b>${err}</b><span>Offline/Errori</span></div></div>
      <div class="dm413g-grid"><div class="dm413g-panel"><h4>Stato dispositivi</h4><div class="dm413g-device-list">${list}</div></div><div class="dm413g-panel"><h4>Configurazione porte</h4><div class="dm413g-form"><div class="dm413g-two"><label>COM ESP32<input id="dm413g-esp32-port" value="${dm413gEsc(cfg.esp32Port)}" placeholder="COM5"></label><label>Baud ESP32<input id="dm413g-esp32-baud" type="number" value="${dm413gEsc(cfg.esp32Baud)}"></label></div><div class="dm413g-two"><label>COM PL303<input id="dm413g-pl303-port" value="${dm413gEsc(cfg.pl303Port)}" placeholder="COM4"></label><label>Baud PL303<input id="dm413g-pl303-baud" type="number" value="${dm413gEsc(cfg.pl303Baud)}"></label></div><label>Risorsa Multimetro / VISA<input id="dm413g-meter-resource" value="${dm413gEsc(cfg.keysightResource)}" placeholder="visa://USB0::..."></label><div class="dm413g-two"><label>Timeout ms<input id="dm413g-timeout" type="number" value="${dm413gEsc(cfg.timeoutMs)}"></label><label>Auto reconnect<select id="dm413g-autoreconnect"><option value="false" ${!cfg.autoReconnect?'selected':''}>OFF</option><option value="true" ${cfg.autoReconnect?'selected':''}>ON</option></select></label></div><button class="btn btn-primary" onclick="dm413gSaveConfig()">💾 Salva configurazione</button><div class="dm413g-safety"><button class="btn btn-danger dm413g-danger" onclick="dm413gPl303Off()">PL303 CH1+CH2 OFF</button><button class="btn btn-danger dm413g-danger" onclick="dm413gEsp32AllLow()">ESP32 ALL DO LOW</button></div></div></div></div>
      <div class="dm413g-panel"><h4>Log Device</h4><div id="dm413g-log" class="dm413g-log"></div></div>`;
    const logBox=document.getElementById('dm413g-log');
    if(logBox){ let logs=[]; try{logs=JSON.parse(localStorage.getItem(DM_LOG_KEY)||'[]')||[]}catch(_){logs=[]} logBox.textContent=logs.map(r=>r.line).join('\n'); logBox.scrollTop=logBox.scrollHeight; }
  }
  window.renderDeviceManagerPage413G=async function(){ await dm413gRefresh(); };
  window.renderDeviceManagerPage326=window.renderDeviceManagerPage413G;
  window.dm413gSaveConfig=async function(){
    const cfg={esp32Port:document.getElementById('dm413g-esp32-port')?.value||'',esp32Baud:Number(document.getElementById('dm413g-esp32-baud')?.value||115200),pl303Port:document.getElementById('dm413g-pl303-port')?.value||'',pl303Baud:Number(document.getElementById('dm413g-pl303-baud')?.value||9600),keysightResource:document.getElementById('dm413g-meter-resource')?.value||'',timeoutMs:Number(document.getElementById('dm413g-timeout')?.value||3500),autoReconnect:document.getElementById('dm413g-autoreconnect')?.value==='true'};
    dm413gSaveCfg(cfg);
    try{ await api?.saveAppSettings?.({esp32Port:cfg.esp32Port,esp32Baud:cfg.esp32Baud,pl303Com:cfg.pl303Port,pl303Baud:cfg.pl303Baud,ttiPort:cfg.pl303Port,ttiBaud:cfg.pl303Baud,keysightMode:'USB_VISA',keysightIp:cfg.keysightResource,keysightPort:9600}); }catch(e){}
    dm413gLog('Configurazione device salvata.'); await dm413gRefresh();
  };
  window.dm413gDetect=async function(){ try{ const ports=await api?.scanSerialPorts?.(); const visas=await api?.scanVisaResources?.(); dm413gLog('Rilevamento completato: COM='+(ports?.length||0)+' VISA='+(visas?.length||0)); }catch(e){ dm413gLog('Errore rilevamento: '+(e?.message||e),'fail'); } await dm413gRefresh(); };
  window.dm413gReconnectAll=async function(){ const cfg=dm413gReadCfg(); const configs=[]; if(cfg.esp32Port) configs.push({name:'modbus_serial',conn:cfg.esp32Port,baud:cfg.esp32Baud}); if(cfg.pl303Port) configs.push({name:'AimTTi_PL303',conn:cfg.pl303Port,baud:cfg.pl303Baud}); if(cfg.keysightResource) configs.push({name:'Keysight_34461A',conn:cfg.keysightResource,baud:9600}); try{ if(configs.length) await api?.reconnectHardware?.(configs); else await autoConnectProductionInstruments?.(false); dm413gLog('Riconnessione dispositivi completata.'); }catch(e){ dm413gLog('Errore reconnect: '+(e?.message||e),'fail'); } await dm413gRefresh(); };
  window.dm413gReconnectOne=async function(name){ const cfg=dm413gReadCfg(); const map={modbus_serial:{name:'modbus_serial',conn:cfg.esp32Port,baud:cfg.esp32Baud},AimTTi_PL303:{name:'AimTTi_PL303',conn:cfg.pl303Port,baud:cfg.pl303Baud},Keysight_34461A:{name:'Keysight_34461A',conn:cfg.keysightResource,baud:9600}}; try{ if(map[name]?.conn) await api?.reconnectHardware?.([map[name]]); else dm413gLog('Nessuna porta configurata per '+name,'fail'); }catch(e){ dm413gLog('Errore reconnect '+name+': '+(e?.message||e),'fail'); } await dm413gRefresh(); };
  window.dm413gPing=async function(name){ try{ const rows=await dm413gGetRows(); const r=rows.find(x=>x.name===name); const st=dm413gStatusOf(r); dm413gLog('Ping '+name+': '+st.txt+' '+(r?.connectionString||'')); }catch(e){ dm413gLog('Ping errore '+name+': '+(e?.message||e),'fail'); } };
  window.dm413gResetConnections=async function(){ dm413gLog('Reset connessioni richiesto: uso reconnect configurazione salvata.'); await window.dm413gReconnectAll(); };
  window.dm413gEmergencyOff=async function(){ try{ if(typeof emergencyStopAll==='function') await emergencyStopAll(); else await api?.emergencyStopAll?.(); dm413gLog('Emergency OFF inviato.','fail'); }catch(e){ dm413gLog('Errore Emergency OFF: '+(e?.message||e),'fail'); } await dm413gRefresh(); };
  window.dm413gPl303Off=async function(){ try{ if(typeof safePl303Off==='function') await safePl303Off('DEVICE_MANAGER_413G'); else await api?.safePl303Off?.('DEVICE_MANAGER_413G'); dm413gLog('PL303 CH1+CH2 OFF eseguito.'); }catch(e){ dm413gLog('Errore PL303 OFF: '+(e?.message||e),'fail'); } };
  window.dm413gEsp32AllLow=async function(){ try{ for(let i=1;i<=24;i++){ try{ await api?.setDigitalOutput?.(i,false); }catch(_){} } dm413gLog('ESP32 ALL DO LOW inviato su DO1..DO24.'); }catch(e){ dm413gLog('Errore ALL DO LOW: '+(e?.message||e),'fail'); } };
})();
