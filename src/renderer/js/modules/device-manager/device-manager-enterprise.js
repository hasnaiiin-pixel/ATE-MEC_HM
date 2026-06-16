/* AT-MEC_HM_4.16A_APP_JS_SPLIT - extracted from legacy app.js.
 * Compatibility mode: classic script, shares window/global scope with app.js.
 */

/* AT-MEC_HM_4.13R_C - Device Manager Heartbeat Watch SAFE
 * Evoluzione sicura della 4.13R_B: aggiunge solo valutazione heartbeat/watchdog lato UI.
 * Nessuna modifica a backend, login, ruoli, permessi, Test Mode o ricette.
 */
(function(){
  const LOG_KEY='atmec_dm_audit_log_413rb';
  const LAST_KEY='atmec_dm_last_status_413rb';
  const AUTO_KEY='atmec_dm_auto_refresh_413rb';
  let dmAutoTimer=null;
  const $dm=(id)=>document.getElementById(id);
  const esc=(v)=>String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]||m));
  const HEARTBEAT_WARN_MS=15000;
  const HEARTBEAT_OFFLINE_MS=45000;
  function parseDeviceTime(v){
    if(v===undefined||v===null||v==='') return null;
    if(typeof v==='number'){ return v>100000000000? v : (Date.now()-Math.max(0,v)*1000); }
    const str=String(v).trim();
    if(/^\d+$/.test(str)){ const n=Number(str); return n>100000000000? n : (Date.now()-Math.max(0,n)*1000); }
    const t=Date.parse(str); return Number.isFinite(t)?t:null;
  }
  function heartbeatInfo(r){
    const raw=r?.lastHeartbeat||r?.heartbeat||r?.updatedAt||r?.timestamp||r?.lastSeen||r?.lastUpdate||r?.ts;
    const t=parseDeviceTime(raw);
    if(!t) return {raw:raw||'-',ageMs:null,label:'non disponibile',cls:'unknown'};
    const age=Date.now()-t;
    if(age<0) return {raw,label:'sincronizzazione oraria',ageMs:age,cls:'unknown'};
    const sec=Math.round(age/1000);
    const label=sec<60?`${sec}s fa`:`${Math.round(sec/60)} min fa`;
    if(age>HEARTBEAT_OFFLINE_MS) return {raw,ageMs:age,label,cls:'offline'};
    if(age>HEARTBEAT_WARN_MS) return {raw,ageMs:age,label,cls:'warning'};
    return {raw,ageMs:age,label,cls:'online'};
  }
  function dmReadLog(){ try{return JSON.parse(localStorage.getItem(LOG_KEY)||'[]')}catch{return[]} }
  function dmWriteLog(rows){ try{localStorage.setItem(LOG_KEY,JSON.stringify(rows.slice(-80)))}catch{} }
  function dmLog(msg,type='info'){ const rows=dmReadLog(); rows.push({ts:Date.now(),type,msg}); dmWriteLog(rows); }
  function deviceMeta(name){
    const n=String(name||'').toLowerCase();
    if(n.includes('esp')||n.includes('modbus')||n.includes('serial')) return {key:'esp32',title:'ESP32-S3 Controller',icon:'🧩',area:'I/O digitale · USB JSON',driver:'Esp32SerialProvider',order:1,required:true};
    if(n.includes('pl303')||n.includes('aimtti')||n.includes('tti')) return {key:'pl303',title:'PL303 Alimentatore',icon:'⚡',area:'Power supply CH1/CH2',driver:'AimTTi PL303',order:2,required:false};
    if(n.includes('34461')||n.includes('keysight')||n.includes('dmm')||n.includes('multimet')) return {key:'dmm',title:'Multimetro',icon:'📟',area:'Misure SCPI/VISA',driver:'Keysight 34461A',order:3,required:false};
    if(n.includes('qr')||n.includes('scanner')) return {key:'scanner',title:'Scanner QR',icon:'▣',area:'Seriale / HID',driver:'QR Scanner',order:4,required:false};
    return {key:n||'generic',title:name||'Dispositivo',icon:'◌',area:'Dispositivo configurato',driver:'Generic HAL',order:99,required:false};
  }
  function statusOf(r){
    const raw=String(r?.status||r?.state||r?.mode||'').toLowerCase();
    const hb=heartbeatInfo(r);
    if(r?.excluded || raw.includes('excluded') || raw.includes('esclus')) return {label:'ESCLUSO',cls:'excluded',dot:'⚪'};
    if(raw.includes('non configurato') || raw.includes('not configured')) return {label:'NON CONFIGURATO',cls:'excluded',dot:'⚪'};
    if(raw.includes('error') || raw.includes('errore') || r?.error) return {label:'ERRORE',cls:'error',dot:'🔴'};
    if((r?.connected===true || r?.online===true || r?.live===true || raw.includes('online') || raw.includes('connected') || raw.includes('conness')) && hb.cls==='offline') return {label:'HEARTBEAT KO',cls:'offline',dot:'🔴'};
    if((r?.connected===true || r?.online===true || r?.live===true || raw.includes('online') || raw.includes('connected') || raw.includes('conness')) && hb.cls==='warning') return {label:'HEARTBEAT LENTO',cls:'warning',dot:'🟠'};
    if(r?.connected===true || r?.online===true || r?.live===true || raw.includes('online') || raw.includes('connected') || raw.includes('conness')) return {label:'ONLINE',cls:'online',dot:'🟢'};
    if(r?.mock || r?.simulated || raw.includes('mock') || raw.includes('simul')) return {label:'SIMULATO',cls:'mock',dot:'🟡'};
    if(raw.includes('warning') || raw.includes('timeout')) return {label:'ATTENZIONE',cls:'warning',dot:'🟠'};
    return {label:'OFFLINE',cls:'offline',dot:'🔴'};
  }
  function mergeDefaults(rows){
    rows=Array.isArray(rows)?rows:[];
    const normalized=[]; const seen=new Set();
    for(const r of rows){
      if(!r) continue;
      const name=r.name||r.device||r.id||r.label;
      const meta=deviceMeta(name);
      const key=meta.key+'|'+String(name||'').toLowerCase();
      if(seen.has(key)) continue; seen.add(key);
      normalized.push({...r,name:name||meta.key,_meta:meta,_source:r._source||'HAL'});
    }
    const defaults=[
      {name:'modbus_serial', mock:true, status:'non configurato', _source:'default'},
      {name:'AimTTi_PL303', mock:true, status:'non configurato', _source:'default'},
      {name:'Keysight_34461A', mock:true, status:'non configurato', _source:'default'},
      {name:'QR_Scanner', status:'non configurato', excluded:true, _source:'default'}
    ];
    for(const d of defaults){ const m=deviceMeta(d.name); if(!normalized.some(x=>x._meta?.key===m.key)) normalized.push({...d,_meta:m}); }
    return normalized.sort((a,b)=>(a._meta?.order||99)-(b._meta?.order||99));
  }
  async function readRows(){
    let rows=[]; let source='default';
    try{ if(window.api?.getProfessionalDevices){ rows=await window.api.getProfessionalDevices(); if(Array.isArray(rows)&&rows.length) source='getProfessionalDevices'; } }catch(e){ dmLog('Lettura getProfessionalDevices non disponibile: '+(e?.message||e),'warn'); }
    if(!Array.isArray(rows)||!rows.length){ try{ if(window.api?.getHardwareStatuses){ rows=await window.api.getHardwareStatuses(); if(Array.isArray(rows)&&rows.length) source='getHardwareStatuses'; } }catch(e){ dmLog('Lettura getHardwareStatuses non disponibile: '+(e?.message||e),'warn'); } }
    rows=Array.isArray(rows)?rows.map(r=>({...r,_source:source})):[];
    const merged=mergeDefaults(rows); detectStatusChanges(merged); return {rows:merged,source};
  }
  function detectStatusChanges(rows){
    let previous={}; try{ previous=JSON.parse(localStorage.getItem(LAST_KEY)||'{}'); }catch{}
    const next={};
    for(const r of rows){ const meta=r._meta||deviceMeta(r.name); const st=statusOf(r).label; next[meta.key]=st; if(previous[meta.key]&&previous[meta.key]!==st){ dmLog(`${meta.title}: ${previous[meta.key]} → ${st}`, st==='ONLINE'?'info':(st==='ERRORE'||st==='OFFLINE'?'error':'warn')); } }
    try{ localStorage.setItem(LAST_KEY,JSON.stringify(next)); }catch{}
  }
  function statCards(rows){
    const counts={total:rows.length,online:0,mock:0,offline:0,watch:0,requiredOk:0,requiredTotal:0};
    rows.forEach(r=>{ const s=statusOf(r).cls; const hb=heartbeatInfo(r); if(s==='online') counts.online++; else if(s==='mock') counts.mock++; else if(s!=='excluded') counts.offline++; if(hb.cls==='warning'||hb.cls==='offline') counts.watch++; const m=r._meta||deviceMeta(r.name); if(m.required){counts.requiredTotal++; if(s==='online'||s==='mock') counts.requiredOk++;} });
    return `<div class="dm-audit-kpis"><div><b>${counts.total}</b><span>Dispositivi</span></div><div><b>${counts.online}</b><span>Online</span></div><div><b>${counts.mock}</b><span>Simulati</span></div><div><b>${counts.offline}</b><span>Offline/Errori</span></div><div><b>${counts.watch}</b><span>Watchdog</span></div><div><b>${counts.requiredOk}/${counts.requiredTotal}</b><span>Obbligatori OK</span></div></div>`;
  }
  function deviceCard(r){
    const meta=r._meta||deviceMeta(r.name); const s=statusOf(r); const conn=r.connectionString||r.conn||r.port||r.resource||r.address||r.path||'-'; const mode=r.mock?'Mock/Simulazione':(r.live||r.connected||r.online?'Live':'Non collegato'); const hb=heartbeatInfo(r); const fw=r.firmware||r.version||r.fw||'-'; const err=r.error||r.lastError||''; const src=r._source||'HAL';
    return `<article class="dm-audit-card ${s.cls}"><div class="dm-audit-card-head"><div class="dm-audit-icon">${meta.icon}</div><div><h4>${esc(meta.title)}</h4><p>${esc(meta.area)}</p></div><span class="dm-audit-status ${s.cls}">${s.dot} ${s.label}</span></div><div class="dm-heartbeat-bar ${hb.cls}"><span>Watchdog heartbeat</span><b>${esc(hb.label)}</b></div><div class="dm-audit-details"><div><span>Nome logico</span><b>${esc(r.name||'-')}</b></div><div><span>Porta/Risorsa</span><b>${esc(conn)}</b></div><div><span>Driver</span><b>${esc(meta.driver)}</b></div><div><span>Modalità</span><b>${esc(mode)}</b></div><div><span>Firmware</span><b>${esc(fw)}</b></div><div><span>Origine dati</span><b>${esc(src)}</b></div><div><span>Ultimo dato</span><b>${esc(hb.raw||'-')}</b></div><div><span>Uso ricetta</span><b>${meta.required?'Obbligatorio':'Opzionale'}</b></div></div>${err?`<div class="dm-audit-error">${esc(err)}</div>`:''}</article>`;
  }
  function logView(){ const rows=dmReadLog().slice(-30).reverse(); if(!rows.length) return '<div class="dm-audit-empty">Nessun evento locale registrato in questa sessione.</div>'; return rows.map(r=>`<div class="dm-audit-log-row ${esc(r.type||'info')}"><span>${new Date(r.ts).toLocaleTimeString('it-IT')}</span><b>${esc(r.msg)}</b></div>`).join(''); }
  function watchdogView(rows){
    return rows.map(r=>{ const m=r._meta||deviceMeta(r.name); const hb=heartbeatInfo(r); const cls=hb.cls==='online'?'online':(hb.cls==='warning'?'warning':(hb.cls==='offline'?'offline':'excluded')); return `<div class="dm-watch-row ${cls}"><span>${m.icon} ${esc(m.title)}</span><b>${esc(hb.label)}</b></div>`; }).join('');
  }
  function autoEnabled(){ return localStorage.getItem(AUTO_KEY)==='1'; }
  function setAutoEnabled(v){ localStorage.setItem(AUTO_KEY,v?'1':'0'); }
  function stopAuto(){ if(dmAutoTimer){ clearInterval(dmAutoTimer); dmAutoTimer=null; } }
  function startAuto(){ stopAuto(); if(autoEnabled()){ dmAutoTimer=setInterval(()=>{ const host=$dm('device-manager-page'); if(host && host.classList.contains('device-manager-413rb')) render(false); },5000); } }
  async function render(writeEvent=true){
    const host=$dm('device-manager-page'); if(!host) return; host.className='device-manager-413ra device-manager-413rb device-manager-413rc'; const result=await readRows(); const rows=result.rows; const now=new Date(); if(writeEvent) dmLog('Refresh stato dispositivi da '+result.source);
    host.innerHTML=`<section class="dm-audit-hero"><div><div class="dm-audit-eyebrow">AT-MEC Device Manager · Heartbeat Watch Safe</div><h2>Centro dispositivi</h2><p>Vista live con watchdog heartbeat non bloccante. Nessuna modifica a backend, login, ruoli, permessi, Test Mode o ricette.</p></div><div class="dm-audit-actions"><button class="btn btn-primary btn-sm" onclick="renderDeviceManagerPage413G()">↻ Aggiorna</button><button class="btn btn-ghost btn-sm" onclick="dmAuditDetect413RA()">🔍 Rileva risorse</button><button class="btn btn-ghost btn-sm" onclick="dmAuditToggleAuto413RB()">${autoEnabled()?'⏸ Stop auto':'▶ Auto 5s'}</button></div></section>${statCards(rows)}<div class="dm-audit-live-strip"><span>Origine dati: <b>${esc(result.source)}</b></span><span>Ultimo refresh: <b>${now.toLocaleTimeString('it-IT')}</b></span><span>Auto refresh: <b>${autoEnabled()?'attivo ogni 5s':'disattivo'}</b></span><span>Watchdog: <b>warning ${HEARTBEAT_WARN_MS/1000}s · offline ${HEARTBEAT_OFFLINE_MS/1000}s</b></span></div><div class="dm-audit-panel dm-watch-panel"><div class="dm-audit-section-title"><h3>Watchdog heartbeat</h3><span>controllo non bloccante</span></div><div class="dm-watch-grid">${watchdogView(rows)}</div></div><div class="dm-audit-layout"><section class="dm-audit-panel dm-audit-main"><div class="dm-audit-section-title"><h3>Stato dispositivi</h3><span>lettura live sicura</span></div><div class="dm-audit-grid">${rows.map(deviceCard).join('')}</div></section><aside class="dm-audit-panel"><div class="dm-audit-section-title"><h3>Test Gate visivo</h3><span>nessun blocco test</span></div><div class="dm-audit-gate">${rows.map(r=>{const m=r._meta||deviceMeta(r.name);const s=statusOf(r);return `<div><span>${m.icon} ${esc(m.title)}</span><b class="${s.cls}">${s.label}</b></div>`}).join('')}</div><div class="dm-audit-note">Questa fase mostra lo stato letto dal backend esistente ma non forza ancora blocchi, reconnect o Emergency OFF. Le funzioni operative restano nelle pagine già stabili.</div></aside></div><section class="dm-audit-panel"><div class="dm-audit-section-title"><h3>Eventi Device Manager</h3><span>cambi stato e scansioni locali</span></div><div id="dm-audit-log" class="dm-audit-log">${logView()}</div></section>`; startAuto();
  }
  window.dmAuditDetect413RA=async function(){ try{ let msg=[]; if(window.api?.scanSerialPorts){ const p=await window.api.scanSerialPorts(); msg.push('COM '+(Array.isArray(p)?p.length:0)); } if(window.api?.scanVisaResources){ const v=await window.api.scanVisaResources(); msg.push('VISA '+(Array.isArray(v)?v.length:0)); } dmLog('Rilevamento risorse completato: '+(msg.join(' · ')||'nessuna API di scan esposta')); }catch(e){ dmLog('Errore rilevamento risorse: '+(e?.message||e),'error'); } await render(false); };
  window.dmAuditToggleAuto413RB=function(){ setAutoEnabled(!autoEnabled()); dmLog('Auto refresh '+(autoEnabled()?'attivato':'disattivato')); render(false); };
  window.renderDeviceManagerPage413RA=render; window.renderDeviceManagerPage413RB=render; window.renderDeviceManagerPage413RC=render; window.renderDeviceManagerPage413G=render; window.renderDeviceManagerPage326=render; window.renderDeviceManagerPage=render;
})();

/* AT-MEC_HM_4.13R_D - Device Manager Reconnect SAFE
 * Evoluzione sicura della 4.13R_C: aggiunge reconnect manuale e auto-reconnect opzionale lato UI.
 * Usa solo API già esistenti (reconnectHardware/getProfessionalDevices/getHardwareStatuses).
 * Nessuna modifica a backend, login, ruoli, permessi, profilo, Test Mode, ricette o report.
 */
(function(){
  'use strict';
  const LOG_KEY='atmec_dm_audit_log_413rb';
  const LAST_KEY='atmec_dm_last_status_413rb';
  const AUTO_REFRESH_KEY='atmec_dm_auto_refresh_413rb';
  const DM_CFG_KEY='atmec.device_manager_413g.config';
  const AUTO_RECONNECT_KEY='atmec_dm_auto_reconnect_413rd';
  let dmAutoTimer=null;
  let dmReconnectTimer=null;
  let reconnectBusy=false;
  const HEARTBEAT_WARN_MS=15000;
  const HEARTBEAT_OFFLINE_MS=45000;
  const $dm=(id)=>document.getElementById(id);
  const esc=(v)=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]||m));
  function parseDeviceTime(v){
    if(v===undefined||v===null||v==='') return null;
    if(typeof v==='number'){ return v>100000000000? v : (Date.now()-Math.max(0,v)*1000); }
    const str=String(v).trim();
    if(/^\d+$/.test(str)){ const n=Number(str); return n>100000000000? n : (Date.now()-Math.max(0,n)*1000); }
    const t=Date.parse(str); return Number.isFinite(t)?t:null;
  }
  function heartbeatInfo(r){
    const raw=r?.lastHeartbeat||r?.heartbeat||r?.updatedAt||r?.timestamp||r?.lastSeen||r?.lastUpdate||r?.ts;
    const t=parseDeviceTime(raw);
    if(!t) return {raw:raw||'-',ageMs:null,label:'non disponibile',cls:'unknown'};
    const age=Date.now()-t;
    if(age<0) return {raw,label:'sincronizzazione oraria',ageMs:age,cls:'unknown'};
    const sec=Math.round(age/1000);
    const label=sec<60?`${sec}s fa`:`${Math.round(sec/60)} min fa`;
    if(age>HEARTBEAT_OFFLINE_MS) return {raw,ageMs:age,label,cls:'offline'};
    if(age>HEARTBEAT_WARN_MS) return {raw,ageMs:age,label,cls:'warning'};
    return {raw,ageMs:age,label,cls:'online'};
  }
  function dmReadLog(){ try{return JSON.parse(localStorage.getItem(LOG_KEY)||'[]')}catch{return[]} }
  function dmWriteLog(rows){ try{localStorage.setItem(LOG_KEY,JSON.stringify(rows.slice(-100)))}catch{} }
  function dmLog(msg,type='info'){ const rows=dmReadLog(); rows.push({ts:Date.now(),type,msg}); dmWriteLog(rows); }
  function dmReadCfg(){
    let cfg={}; try{cfg=JSON.parse(localStorage.getItem(DM_CFG_KEY)||'{}')||{};}catch{cfg={};}
    return Object.assign({esp32Port:'',esp32Baud:115200,pl303Port:'',pl303Baud:9600,keysightResource:'',timeoutMs:3500},cfg);
  }
  function deviceMeta(name){
    const n=String(name||'').toLowerCase();
    if(n.includes('esp')||n.includes('modbus')||n.includes('serial')) return {key:'esp32',title:'ESP32-S3 Controller',icon:'🧩',area:'I/O digitale · USB JSON',driver:'Esp32SerialProvider',order:1,required:true,logical:'modbus_serial'};
    if(n.includes('pl303')||n.includes('aimtti')||n.includes('tti')) return {key:'pl303',title:'PL303 Alimentatore',icon:'⚡',area:'Power supply CH1/CH2',driver:'AimTTi PL303',order:2,required:false,logical:'AimTTi_PL303'};
    if(n.includes('34461')||n.includes('keysight')||n.includes('dmm')||n.includes('multimet')) return {key:'dmm',title:'Multimetro',icon:'📟',area:'Misure SCPI/VISA',driver:'Keysight 34461A',order:3,required:false,logical:'Keysight_34461A'};
    if(n.includes('qr')||n.includes('scanner')) return {key:'scanner',title:'Scanner QR',icon:'▣',area:'Seriale / HID',driver:'QR Scanner',order:4,required:false,logical:'QR_Scanner'};
    return {key:n||'generic',title:name||'Dispositivo',icon:'◌',area:'Dispositivo configurato',driver:'Generic HAL',order:99,required:false,logical:name||'generic'};
  }
  function reconnectConfigForKey(key){
    const cfg=dmReadCfg();
    if(key==='esp32') return cfg.esp32Port ? {name:'modbus_serial',conn:cfg.esp32Port,baud:Number(cfg.esp32Baud||115200)} : null;
    if(key==='pl303') return cfg.pl303Port ? {name:'AimTTi_PL303',conn:cfg.pl303Port,baud:Number(cfg.pl303Baud||9600)} : null;
    if(key==='dmm') return cfg.keysightResource ? {name:'Keysight_34461A',conn:cfg.keysightResource,baud:9600} : null;
    return null;
  }
  function buildReconnectConfigs(rows, onlyKey=null){
    const keys=onlyKey?[onlyKey]:['esp32','pl303','dmm'];
    const configs=[];
    for(const key of keys){ const c=reconnectConfigForKey(key); if(c) configs.push(c); }
    return configs;
  }
  function statusOf(r){
    const raw=String(r?.status||r?.state||r?.mode||'').toLowerCase();
    const hb=heartbeatInfo(r);
    if(r?.excluded || raw.includes('excluded') || raw.includes('esclus')) return {label:'ESCLUSO',cls:'excluded',dot:'⚪'};
    if(raw.includes('non configurato') || raw.includes('not configured')) return {label:'NON CONFIGURATO',cls:'excluded',dot:'⚪'};
    if(raw.includes('error') || raw.includes('errore') || r?.error) return {label:'ERRORE',cls:'error',dot:'🔴'};
    if((r?.connected===true || r?.online===true || r?.live===true || raw.includes('online') || raw.includes('connected') || raw.includes('conness')) && hb.cls==='offline') return {label:'HEARTBEAT KO',cls:'offline',dot:'🔴'};
    if((r?.connected===true || r?.online===true || r?.live===true || raw.includes('online') || raw.includes('connected') || raw.includes('conness')) && hb.cls==='warning') return {label:'HEARTBEAT LENTO',cls:'warning',dot:'🟠'};
    if(r?.connected===true || r?.online===true || r?.live===true || raw.includes('online') || raw.includes('connected') || raw.includes('conness')) return {label:'ONLINE',cls:'online',dot:'🟢'};
    if(r?.mock || r?.simulated || raw.includes('mock') || raw.includes('simul')) return {label:'SIMULATO',cls:'mock',dot:'🟡'};
    if(raw.includes('warning') || raw.includes('timeout')) return {label:'ATTENZIONE',cls:'warning',dot:'🟠'};
    return {label:'OFFLINE',cls:'offline',dot:'🔴'};
  }
  function mergeDefaults(rows){
    rows=Array.isArray(rows)?rows:[];
    const normalized=[]; const seen=new Set();
    for(const r of rows){ if(!r) continue; const name=r.name||r.device||r.id||r.label; const meta=deviceMeta(name); const key=meta.key+'|'+String(name||'').toLowerCase(); if(seen.has(key)) continue; seen.add(key); normalized.push({...r,name:name||meta.logical,_meta:meta,_source:r._source||'HAL'}); }
    const defaults=[
      {name:'modbus_serial', mock:true, status:'non configurato', _source:'default'},
      {name:'AimTTi_PL303', mock:true, status:'non configurato', _source:'default'},
      {name:'Keysight_34461A', mock:true, status:'non configurato', _source:'default'},
      {name:'QR_Scanner', status:'non configurato', excluded:true, _source:'default'}
    ];
    for(const d of defaults){ const m=deviceMeta(d.name); if(!normalized.some(x=>x._meta?.key===m.key)) normalized.push({...d,_meta:m}); }
    return normalized.sort((a,b)=>(a._meta?.order||99)-(b._meta?.order||99));
  }
  async function readRows(){
    let rows=[]; let source='default';
    try{ if(window.api?.getProfessionalDevices){ rows=await window.api.getProfessionalDevices(); if(Array.isArray(rows)&&rows.length) source='getProfessionalDevices'; } }catch(e){ dmLog('Lettura getProfessionalDevices non disponibile: '+(e?.message||e),'warn'); }
    if(!Array.isArray(rows)||!rows.length){ try{ if(window.api?.getHardwareStatuses){ rows=await window.api.getHardwareStatuses(); if(Array.isArray(rows)&&rows.length) source='getHardwareStatuses'; } }catch(e){ dmLog('Lettura getHardwareStatuses non disponibile: '+(e?.message||e),'warn'); } }
    rows=Array.isArray(rows)?rows.map(r=>({...r,_source:source})):[];
    const merged=mergeDefaults(rows); detectStatusChanges(merged); return {rows:merged,source};
  }
  function detectStatusChanges(rows){
    let previous={}; try{ previous=JSON.parse(localStorage.getItem(LAST_KEY)||'{}'); }catch{}
    const next={};
    for(const r of rows){ const meta=r._meta||deviceMeta(r.name); const st=statusOf(r).label; next[meta.key]=st; if(previous[meta.key]&&previous[meta.key]!==st){ dmLog(`${meta.title}: ${previous[meta.key]} → ${st}`, st==='ONLINE'?'info':(st==='ERRORE'||st==='OFFLINE'?'error':'warn')); } }
    try{ localStorage.setItem(LAST_KEY,JSON.stringify(next)); }catch{}
  }
  function statCards(rows){
    const counts={total:rows.length,online:0,mock:0,offline:0,watch:0,requiredOk:0,requiredTotal:0};
    rows.forEach(r=>{ const s=statusOf(r).cls; const hb=heartbeatInfo(r); if(s==='online') counts.online++; else if(s==='mock') counts.mock++; else if(s!=='excluded') counts.offline++; if(hb.cls==='warning'||hb.cls==='offline') counts.watch++; const m=r._meta||deviceMeta(r.name); if(m.required){counts.requiredTotal++; if(s==='online'||s==='mock') counts.requiredOk++;} });
    return `<div class="dm-audit-kpis"><div><b>${counts.total}</b><span>Dispositivi</span></div><div><b>${counts.online}</b><span>Online</span></div><div><b>${counts.mock}</b><span>Simulati</span></div><div><b>${counts.offline}</b><span>Offline/Errori</span></div><div><b>${counts.watch}</b><span>Watchdog</span></div><div><b>${counts.requiredOk}/${counts.requiredTotal}</b><span>Obbligatori OK</span></div></div>`;
  }
  function deviceCard(r){
    const meta=r._meta||deviceMeta(r.name); const s=statusOf(r); const conn=r.connectionString||r.conn||r.port||r.resource||r.address||r.path||'-'; const mode=r.mock?'Mock/Simulazione':(r.live||r.connected||r.online?'Live':'Non collegato'); const hb=heartbeatInfo(r); const fw=r.firmware||r.version||r.fw||'-'; const err=r.error||r.lastError||''; const src=r._source||'HAL'; const cfg=reconnectConfigForKey(meta.key);
    return `<article class="dm-audit-card ${s.cls}"><div class="dm-audit-card-head"><div class="dm-audit-icon">${meta.icon}</div><div><h4>${esc(meta.title)}</h4><p>${esc(meta.area)}</p></div><span class="dm-audit-status ${s.cls}">${s.dot} ${s.label}</span></div><div class="dm-heartbeat-bar ${hb.cls}"><span>Watchdog heartbeat</span><b>${esc(hb.label)}</b></div><div class="dm-audit-details"><div><span>Nome logico</span><b>${esc(r.name||'-')}</b></div><div><span>Porta/Risorsa</span><b>${esc(conn)}</b></div><div><span>Driver</span><b>${esc(meta.driver)}</b></div><div><span>Modalità</span><b>${esc(mode)}</b></div><div><span>Firmware</span><b>${esc(fw)}</b></div><div><span>Origine dati</span><b>${esc(src)}</b></div><div><span>Ultimo dato</span><b>${esc(hb.raw||'-')}</b></div><div><span>Reconnect</span><b>${cfg?esc(cfg.conn):'Non configurato'}</b></div></div><div class="dm-reconnect-actions"><button class="btn btn-ghost btn-sm" onclick="dm413rdReconnectOne('${esc(meta.key)}')" ${cfg?'':'disabled'}>↻ Reconnect</button><button class="btn btn-ghost btn-sm" onclick="dm413rdPing('${esc(r.name||meta.logical)}')">Ping</button></div>${err?`<div class="dm-audit-error">${esc(err)}</div>`:''}</article>`;
  }
  function logView(){ const rows=dmReadLog().slice(-35).reverse(); if(!rows.length) return '<div class="dm-audit-empty">Nessun evento locale registrato in questa sessione.</div>'; return rows.map(r=>`<div class="dm-audit-log-row ${esc(r.type||'info')}"><span>${new Date(r.ts).toLocaleTimeString('it-IT')}</span><b>${esc(r.msg)}</b></div>`).join(''); }
  function watchdogView(rows){ return rows.map(r=>{ const m=r._meta||deviceMeta(r.name); const hb=heartbeatInfo(r); const cls=hb.cls==='online'?'online':(hb.cls==='warning'?'warning':(hb.cls==='offline'?'offline':'excluded')); return `<div class="dm-watch-row ${cls}"><span>${m.icon} ${esc(m.title)}</span><b>${esc(hb.label)}</b></div>`; }).join(''); }
  function reconnectPanel(rows){
    const cfg=dmReadCfg();
    const statusLine=[
      `ESP32: ${cfg.esp32Port||'non configurato'}`,
      `PL303: ${cfg.pl303Port||'non configurato'}`,
      `DMM: ${cfg.keysightResource||'non configurato'}`
    ].join(' · ');
    return `<div class="dm-reconnect-panel"><div class="dm-audit-section-title"><h3>Reconnect assistito</h3><span>manuale / opzionale</span></div><p>${esc(statusLine)}</p><div class="dm-reconnect-toolbar"><button class="btn btn-primary btn-sm" onclick="dm413rdReconnectAll()">↻ Riconnetti configurati</button><button class="btn btn-ghost btn-sm" onclick="dm413rdToggleAutoReconnect()">${autoReconnectEnabled()?'⏸ Stop auto reconnect':'▶ Auto reconnect 15s'}</button><button class="btn btn-ghost btn-sm" onclick="dm413rdSavePortsFromLegacy()">💾 Allinea configurazione</button></div><div class="dm-audit-note">Auto reconnect è disattivato di default e usa solo porte già configurate. Non modifica login, ruoli, permessi, Test Mode o ricette.</div></div>`;
  }
  function autoRefreshEnabled(){ return localStorage.getItem(AUTO_REFRESH_KEY)==='1'; }
  function setAutoRefresh(v){ localStorage.setItem(AUTO_REFRESH_KEY,v?'1':'0'); }
  function autoReconnectEnabled(){ return localStorage.getItem(AUTO_RECONNECT_KEY)==='1'; }
  function setAutoReconnect(v){ localStorage.setItem(AUTO_RECONNECT_KEY,v?'1':'0'); }
  function stopAuto(){ if(dmAutoTimer){ clearInterval(dmAutoTimer); dmAutoTimer=null; } if(dmReconnectTimer){ clearInterval(dmReconnectTimer); dmReconnectTimer=null; } }
  function startAuto(){
    stopAuto();
    if(autoRefreshEnabled()){ dmAutoTimer=setInterval(()=>{ const host=$dm('device-manager-page'); if(host && host.classList.contains('device-manager-413rd')) render(false); },5000); }
    if(autoReconnectEnabled()){ dmReconnectTimer=setInterval(()=>{ dm413rdAutoReconnectTick(); },15000); }
  }
  async function performReconnect(configs,label){
    if(reconnectBusy) { dmLog('Reconnect già in corso, richiesta ignorata.','warn'); return; }
    if(!configs.length){ dmLog('Nessun dispositivo configurato per reconnect. Imposta porte nella pagina Hardware/Device Manager.','warn'); return; }
    reconnectBusy=true;
    try{
      dmLog(`${label}: avvio reconnect ${configs.map(c=>c.name+'@'+c.conn).join(', ')}`);
      if(!window.api?.reconnectHardware) throw new Error('API reconnectHardware non disponibile');
      const res=await window.api.reconnectHardware(configs);
      dmLog(`${label}: comando completato`);
      return res;
    }catch(e){ dmLog(`${label}: errore ${e?.message||e}`,'error'); }
    finally{ reconnectBusy=false; await render(false); }
  }
  async function render(writeEvent=true){
    const host=$dm('device-manager-page'); if(!host) return; host.className='device-manager-413ra device-manager-413rb device-manager-413rc device-manager-413rd'; const result=await readRows(); const rows=result.rows; const now=new Date(); if(writeEvent) dmLog('Refresh stato dispositivi da '+result.source);
    host.innerHTML=`<section class="dm-audit-hero"><div><div class="dm-audit-eyebrow">AT-MEC Device Manager · Reconnect Safe</div><h2>Centro dispositivi</h2><p>Vista live, watchdog heartbeat e reconnect assistito usando le API hardware già esistenti. Nessuna modifica a backend, login, ruoli, permessi, Test Mode o ricette.</p></div><div class="dm-audit-actions"><button class="btn btn-primary btn-sm" onclick="renderDeviceManagerPage413G()">↻ Aggiorna</button><button class="btn btn-ghost btn-sm" onclick="dmAuditDetect413RA()">🔍 Rileva risorse</button><button class="btn btn-ghost btn-sm" onclick="dmAuditToggleAuto413RB()">${autoRefreshEnabled()?'⏸ Stop auto':'▶ Auto 5s'}</button></div></section>${statCards(rows)}<div class="dm-audit-live-strip"><span>Origine dati: <b>${esc(result.source)}</b></span><span>Ultimo refresh: <b>${now.toLocaleTimeString('it-IT')}</b></span><span>Auto refresh: <b>${autoRefreshEnabled()?'attivo ogni 5s':'disattivo'}</b></span><span>Auto reconnect: <b>${autoReconnectEnabled()?'attivo ogni 15s':'disattivo'}</b></span><span>Watchdog: <b>warning ${HEARTBEAT_WARN_MS/1000}s · offline ${HEARTBEAT_OFFLINE_MS/1000}s</b></span></div><div class="dm-audit-panel dm-watch-panel"><div class="dm-audit-section-title"><h3>Watchdog heartbeat</h3><span>controllo non bloccante</span></div><div class="dm-watch-grid">${watchdogView(rows)}</div></div><div class="dm-audit-panel">${reconnectPanel(rows)}</div><div class="dm-audit-layout"><section class="dm-audit-panel dm-audit-main"><div class="dm-audit-section-title"><h3>Stato dispositivi</h3><span>lettura live sicura</span></div><div class="dm-audit-grid">${rows.map(deviceCard).join('')}</div></section><aside class="dm-audit-panel"><div class="dm-audit-section-title"><h3>Test Gate visivo</h3><span>nessun blocco test</span></div><div class="dm-audit-gate">${rows.map(r=>{const m=r._meta||deviceMeta(r.name);const s=statusOf(r);return `<div><span>${m.icon} ${esc(m.title)}</span><b class="${s.cls}">${s.label}</b></div>`}).join('')}</div><div class="dm-audit-note">Questa fase non forza blocchi Test Mode. Il reconnect è manuale oppure opzionale e lavora solo su configurazioni già salvate.</div></aside></div><section class="dm-audit-panel"><div class="dm-audit-section-title"><h3>Eventi Device Manager</h3><span>cambi stato, heartbeat e reconnect</span></div><div id="dm-audit-log" class="dm-audit-log">${logView()}</div></section>`; startAuto();
  }
  window.dmAuditDetect413RA=async function(){ try{ let msg=[]; if(window.api?.scanSerialPorts){ const p=await window.api.scanSerialPorts(); msg.push('COM '+(Array.isArray(p)?p.length:0)); } if(window.api?.scanVisaResources){ const v=await window.api.scanVisaResources(); msg.push('VISA '+(Array.isArray(v)?v.length:0)); } dmLog('Rilevamento risorse completato: '+(msg.join(' · ')||'nessuna API di scan esposta')); }catch(e){ dmLog('Errore rilevamento risorse: '+(e?.message||e),'error'); } await render(false); };
  window.dmAuditToggleAuto413RB=function(){ setAutoRefresh(!autoRefreshEnabled()); dmLog('Auto refresh '+(autoRefreshEnabled()?'attivato':'disattivato')); render(false); };
  window.dm413rdReconnectOne=async function(key){ const configs=buildReconnectConfigs([],key); await performReconnect(configs,'Reconnect '+key); };
  window.dm413rdReconnectAll=async function(){ const configs=buildReconnectConfigs([]); await performReconnect(configs,'Reconnect globale'); };
  window.dm413rdToggleAutoReconnect=function(){ setAutoReconnect(!autoReconnectEnabled()); dmLog('Auto reconnect '+(autoReconnectEnabled()?'attivato':'disattivato')); render(false); };
  window.dm413rdAutoReconnectTick=async function(){
    if(reconnectBusy) return;
    const result=await readRows();
    const targets=[];
    for(const r of result.rows){ const m=r._meta||deviceMeta(r.name); const s=statusOf(r); if(['offline','error'].includes(s.cls)){ const c=reconnectConfigForKey(m.key); if(c) targets.push(c); } }
    if(targets.length) await performReconnect(targets,'Auto reconnect');
  };
  window.dm413rdPing=async function(name){ try{ const result=await readRows(); const r=result.rows.find(x=>String(x.name)===String(name)); const s=statusOf(r); dmLog('Ping '+name+': '+s.label+' '+(r?.connectionString||r?.conn||r?.port||'')); }catch(e){ dmLog('Ping errore '+name+': '+(e?.message||e),'error'); } await render(false); };
  window.dm413rdSavePortsFromLegacy=function(){
    // Mantiene il formato già usato dalle vecchie pagine Device Manager. Non scrive file, solo localStorage UI.
    const cfg=dmReadCfg();
    try{ localStorage.setItem(DM_CFG_KEY,JSON.stringify(cfg,null,2)); dmLog('Configurazione reconnect riallineata in localStorage.'); }catch(e){ dmLog('Errore salvataggio configurazione reconnect: '+(e?.message||e),'error'); }
    render(false);
  };
  window.renderDeviceManagerPage413RA=render; window.renderDeviceManagerPage413RB=render; window.renderDeviceManagerPage413RC=render; window.renderDeviceManagerPage413RD=render; window.renderDeviceManagerPage413G=render; window.renderDeviceManagerPage326=render; window.renderDeviceManagerPage=render;
})();


/* AT-MEC_HM_4.13R_E - Device Test Gate SAFE
   Scopo: aggiunge una valutazione pre-test SOLO VISIVA e NON BLOCCANTE.
   Non modifica backend, login, utenti, ruoli, permessi, Test Mode, ricette o report.
*/
(function(){
  if(window.__atmecDeviceGate413RE) return; window.__atmecDeviceGate413RE=true;
  const GATE_CFG_KEY='atmec_device_gate_413re';
  function esc(v){ return String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function $dm(id){ return document.getElementById(id); }
  function defaultGate(){ return {esp32:true, pl303:true, dmm:false, scanner:false}; }
  function readGate(){ try{ return {...defaultGate(), ...(JSON.parse(localStorage.getItem(GATE_CFG_KEY)||'{}')||{})}; }catch{ return defaultGate(); } }
  function writeGate(cfg){ try{ localStorage.setItem(GATE_CFG_KEY, JSON.stringify({...defaultGate(),...cfg}, null, 2)); }catch{} }
  function meta(name){ const n=String(name||'').toLowerCase(); if(n.includes('pl303')||n.includes('aimtti')) return {key:'pl303',title:'PL303 Alimentatore',icon:'⚡'}; if(n.includes('34461')||n.includes('keysight')||n.includes('dmm')||n.includes('multimet')) return {key:'dmm',title:'Multimetro',icon:'📏'}; if(n.includes('qr')||n.includes('scanner')) return {key:'scanner',title:'Scanner QR',icon:'▦'}; return {key:'esp32',title:'ESP32-S3 I/O',icon:'🔌'}; }
  function st(r){ const raw=String(r?.status||r?.state||r?.mode||'').toLowerCase(); if(r?.excluded||raw.includes('esclus')) return {ok:false,label:'ESCLUSO',cls:'excluded'}; if(r?.error||raw.includes('error')||raw.includes('errore')) return {ok:false,label:'ERRORE',cls:'error'}; if(r?.connected===true||r?.online===true||r?.live===true||raw.includes('online')||raw.includes('connected')||raw.includes('conness')) return {ok:true,label:'ONLINE',cls:'online'}; if(r?.mock||r?.simulated||raw.includes('mock')||raw.includes('simul')) return {ok:true,label:'SIMULATO',cls:'mock'}; if(raw.includes('warning')||raw.includes('timeout')) return {ok:false,label:'ATTENZIONE',cls:'warning'}; if(raw.includes('non configurato')||raw.includes('not configured')) return {ok:false,label:'NON CONFIGURATO',cls:'excluded'}; return {ok:false,label:'OFFLINE',cls:'offline'}; }
  async function readRowsSafe(){
    try{
      if(typeof window.__atmecDeviceRows413RD==='function') return await window.__atmecDeviceRows413RD();
    }catch(_e){}
    let rows=[]; let source='fallback';
    try{ if(window.api?.getProfessionalDevices){ const r=await window.api.getProfessionalDevices(); if(Array.isArray(r)){ rows=r; source='getProfessionalDevices'; } } }catch(_e){}
    if(!rows.length){ try{ if(window.api?.getHardwareStatuses){ const r=await window.api.getHardwareStatuses(); if(Array.isArray(r)){ rows=r; source='getHardwareStatuses'; } } }catch(_e){} }
    return {rows:Array.isArray(rows)?rows:[], source};
  }
  function normalize(rows){
    const cfg=readGate(); const map={};
    for(const r of (Array.isArray(rows)?rows:[])){ const m=meta(r?.name||r?.device||r?.id||r?.label); const s=st(r); if(!map[m.key] || (s.ok && !map[m.key].status.ok)) map[m.key]={...m,row:r,status:s}; }
    const defs=[['esp32','ESP32-S3 I/O','🔌'],['pl303','PL303 Alimentatore','⚡'],['dmm','Multimetro','📏'],['scanner','Scanner QR','▦']];
    return defs.map(([key,title,icon])=> map[key] || {key,title,icon,row:null,status:{ok:false,label:'NON RILEVATO',cls:'offline'},required:!!cfg[key]}).map(x=>({...x,required:!!cfg[x.key]}));
  }
  function evaluate(rows){ const devs=normalize(rows); const required=devs.filter(d=>d.required); const missing=required.filter(d=>!d.status.ok); return {devs, required, missing, ready:missing.length===0}; }
  function badge(s){ return `<span class="dm-gate-status ${esc(s.cls)}">${esc(s.label)}</span>`; }
  function renderGatePanel(rows){
    const e=evaluate(rows); const cfg=readGate();
    const cards=e.devs.map(d=>`<div class="dm-gate-row ${d.required?'required':'optional'} ${d.status.cls}"><div class="dm-gate-name"><b>${d.icon} ${esc(d.title)}</b><small>${d.required?'Obbligatorio per test':'Opzionale'}</small></div><div class="dm-gate-mode"><label><input type="checkbox" ${d.required?'checked':''} onchange="dm413reSetRequired('${d.key}',this.checked)"> Richiesto</label></div>${badge(d.status)}</div>`).join('');
    const summary=e.ready ? `<div class="dm-gate-summary ok"><b>✅ Pronto per il test</b><span>Tutti i dispositivi richiesti risultano disponibili o simulati.</span></div>` : `<div class="dm-gate-summary ko"><b>⚠ Pre-check non conforme</b><span>Mancano: ${esc(e.missing.map(x=>x.title).join(', '))}</span></div>`;
    return `<div class="dm-audit-panel dm-testgate-panel"><div class="dm-audit-section-title"><h3>Pre-check Test Mode</h3><span>valutazione sicura non bloccante</span></div>${summary}<div class="dm-gate-list">${cards}</div><div class="dm-gate-toolbar"><button class="btn btn-primary btn-sm" onclick="dm413reRunPrecheck()">Controlla adesso</button><button class="btn btn-ghost btn-sm" onclick="dm413reResetGate()">Ripristina default</button></div><div class="dm-audit-note">In questa revisione il gate è volutamente solo informativo: non blocca avvio test e non cambia ricette, permessi o backend. Dopo conferma potrà diventare gate operativo.</div></div>`;
  }
  async function patchRender(){
    const host=$dm('device-manager-page'); if(!host) return;
    const result=await readRowsSafe(); const html=renderGatePanel(result.rows);
    const old=host.querySelector('.dm-testgate-panel'); if(old) old.remove();
    const layout=host.querySelector('.dm-audit-layout');
    if(layout) layout.insertAdjacentHTML('beforebegin', html); else host.insertAdjacentHTML('beforeend', html);
  }
  async function baseRender(){
    if(typeof window.renderDeviceManagerPage413RD==='function') await window.renderDeviceManagerPage413RD();
    else if(typeof window.renderDeviceManagerPage413G==='function') await window.renderDeviceManagerPage413G();
  }
  window.dm413reSetRequired=function(key,val){ const cfg=readGate(); cfg[key]=!!val; writeGate(cfg); patchRender(); };
  window.dm413reResetGate=function(){ writeGate(defaultGate()); patchRender(); };
  window.dm413reRunPrecheck=async function(){ await baseRender(); await patchRender(); const result=await readRowsSafe(); const e=evaluate(result.rows); try{ if(typeof window.dm413rdPing==='function') console.log('[AT-MEC 4.13R_E] Pre-check', e); }catch{} return e; };
  window.dm413reEvaluate=async function(){ const result=await readRowsSafe(); return evaluate(result.rows); };
  const previousRender=window.renderDeviceManagerPage;
  async function render413RE(){ try{ if(typeof previousRender==='function') await previousRender(); }catch(e){ console.warn('[AT-MEC 4.13R_E] render precedente fallito',e); } await patchRender(); }
  window.renderDeviceManagerPage413RE=render413RE;
  window.renderDeviceManagerPage413G=render413RE;
  window.renderDeviceManagerPage326=render413RE;
  window.renderDeviceManagerPage=render413RE;
})();

/* AT-MEC_HM_4.13R_H - Device Emergency Actions VISIBLE SAFE
   Scopo: aggiunge pannello Emergency OFF nel Device Manager usando solo API già esistenti.
   Non modifica backend, login, utenti, ruoli, permessi, profilo, Test Mode, ricette o report.
*/
(function(){
  if(window.__atmecDeviceEmergency413RG) return; window.__atmecDeviceEmergency413RG=true;
  function esc(v){ return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m])); }
  function host(){ return document.getElementById('device-manager-page'); }
  function now(){ return new Date().toLocaleTimeString('it-IT'); }
  function log(msg,type='warn'){
    try{ if(typeof window.dm413rdPing==='function') console.log('[AT-MEC 4.13R_G]', msg); }catch{}
    try{
      const box=document.getElementById('dm-audit-log');
      if(box) box.insertAdjacentHTML('afterbegin', `<div class="dm-audit-log-row ${esc(type)}"><span>${now()}</span><b>${esc(msg)}</b></div>`);
    }catch{}
  }
  function ensureCss(){
    if(document.getElementById('atmec-dm-emergency-413rg-css')) return;
    const style=document.createElement('style'); style.id='atmec-dm-emergency-413rg-css';
    style.textContent=`
      .dm-emergency-panel{border:1px solid rgba(239,68,68,.28);background:linear-gradient(135deg,rgba(127,29,29,.20),rgba(15,23,42,.92));}
      .dm-emergency-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px;}
      .dm-emergency-head h3{margin:0;color:#fee2e2;font-size:18px;letter-spacing:.02em;}
      .dm-emergency-head p{margin:5px 0 0;color:#fecaca;font-size:12px;line-height:1.45;}
      .dm-emergency-badge{font-size:11px;font-weight:800;letter-spacing:.08em;padding:6px 10px;border-radius:999px;background:rgba(239,68,68,.16);border:1px solid rgba(248,113,113,.34);color:#fecaca;white-space:nowrap;}
      .dm-emergency-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px;}
      .dm-emergency-step{border:1px solid rgba(255,255,255,.10);background:rgba(15,23,42,.50);border-radius:14px;padding:10px 12px;min-height:64px;}
      .dm-emergency-step b{display:block;color:#fff;font-size:13px;margin-bottom:4px;}
      .dm-emergency-step span{display:block;color:#cbd5e1;font-size:12px;line-height:1.35;}
      .dm-emergency-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;}
      .dm-emergency-actions .btn-danger{box-shadow:0 10px 24px rgba(220,38,38,.18);}
      .dm-emergency-note{margin-top:10px;color:#fca5a5;font-size:12px;line-height:1.45;}
      @media(max-width:900px){.dm-emergency-grid{grid-template-columns:1fr}.dm-emergency-head{flex-direction:column}.dm-emergency-badge{align-self:flex-start}}
    `;
    document.head.appendChild(style);
  }
  function panel(){
    return `<section class="dm-audit-panel dm-emergency-panel" id="dm-emergency-panel-413rg">
      <div class="dm-emergency-head"><div><h3>Emergency OFF assistito</h3><p>Comando manuale per mettere in sicurezza gli strumenti dalla pagina Device Manager. Usa solo funzioni già presenti e non cambia la logica Test Mode.</p></div><div class="dm-emergency-badge">AZIONE MANUALE</div></div>
      <div class="dm-emergency-grid">
        <div class="dm-emergency-step"><b>1 · PL303 OFF</b><span>Richiama safe off CH1/CH2 se API disponibile.</span></div>
        <div class="dm-emergency-step"><b>2 · ESP32 DO LOW</b><span>Porta le uscite digitali principali a LOW.</span></div>
        <div class="dm-emergency-step"><b>3 · Log evento</b><span>Registra l'azione nel log locale Device Manager.</span></div>
      </div>
      <div class="dm-emergency-actions"><button class="btn btn-danger btn-sm" onclick="dm413rgEmergencyOff()">⛔ Esegui Emergency OFF</button><button class="btn btn-ghost btn-sm" onclick="dm413rgPl303OffOnly()">Solo PL303 OFF</button><button class="btn btn-ghost btn-sm" onclick="dm413rgEsp32LowOnly()">Solo ESP32 LOW</button></div>
      <div class="dm-emergency-note">Nota: questa revisione è SAFE. Non introduce blocchi automatici, non modifica backend e non tocca login, ruoli, permessi, ricette o report.</div>
    </section>`;
  }
  function patch(){
    ensureCss(); const h=host(); if(!h) return;
    const old=document.getElementById('dm-emergency-panel-413rg'); if(old) old.remove();
    const gate=h.querySelector('.dm-testgate-panel');
    if(gate) gate.insertAdjacentHTML('afterend', panel());
    else {
      const layout=h.querySelector('.dm-audit-layout');
      if(layout) layout.insertAdjacentHTML('beforebegin', panel()); else h.insertAdjacentHTML('beforeend', panel());
    }
  }
  async function pl303Off(){
    if(typeof window.safePl303Off==='function') return await window.safePl303Off('DEVICE_MANAGER_413R_G_EMERGENCY');
    if(window.api?.safePl303Off) return await window.api.safePl303Off('DEVICE_MANAGER_413R_G_EMERGENCY');
    throw new Error('safePl303Off non disponibile');
  }
  async function esp32Low(){
    if(!window.api?.setDigitalOutput) throw new Error('setDigitalOutput non disponibile');
    for(let i=1;i<=24;i++){ try{ await window.api.setDigitalOutput(i,false); }catch(_){} }
    return {ok:true};
  }
  window.dm413rgPl303OffOnly=async function(){ try{ log('PL303 OFF richiesto.'); await pl303Off(); log('PL303 OFF completato.','info'); }catch(e){ log('Errore PL303 OFF: '+(e?.message||e),'error'); } };
  window.dm413rgEsp32LowOnly=async function(){ try{ log('ESP32 ALL DO LOW richiesto.'); await esp32Low(); log('ESP32 ALL DO LOW completato.','info'); }catch(e){ log('Errore ESP32 LOW: '+(e?.message||e),'error'); } };
  window.dm413rgEmergencyOff=async function(){
    log('Emergency OFF assistito avviato.');
    await window.dm413rgPl303OffOnly();
    await window.dm413rgEsp32LowOnly();
    log('Emergency OFF assistito terminato.','info');
    try{ if(typeof window.renderDeviceManagerPage413G==='function') await window.renderDeviceManagerPage413G(); }catch{}
    setTimeout(patch,100);
  };
  const prev=window.renderDeviceManagerPage;
  async function render413RG(){ try{ if(typeof prev==='function') await prev(); }catch(e){ console.warn('[AT-MEC 4.13R_H] render precedente fallito',e); } patch(); }

  // IMPORTANTE 4.13R_H:
  // il menu HTML stabile richiama ancora renderDeviceManagerPage413RA() direttamente.
  // La 4.13R_G agganciava solo renderDeviceManagerPage/renderDeviceManagerPage413G,
  // quindi il pannello Emergency non compariva quando si entrava dal menu reale.
  // Qui agganciamo TUTTE le alias storiche del Device Manager alla stessa render stabile.
  window.renderDeviceManagerPage413RA=render413RG;
  window.renderDeviceManagerPage413RB=render413RG;
  window.renderDeviceManagerPage413RC=render413RG;
  window.renderDeviceManagerPage413RD=render413RG;
  window.renderDeviceManagerPage413RE=render413RG;
  window.renderDeviceManagerPage413RG=render413RG;
  window.renderDeviceManagerPage413G=render413RG;
  window.renderDeviceManagerPage326=render413RG;
  window.renderDeviceManagerPage=render413RG;

  // Fallback difensivo: se una funzione legacy ridisegna la pagina dopo il nostro render,
  // re-inseriamo il pannello senza toccare backend/login/permessi.
  try{
    const mo=new MutationObserver(()=>{ const h=host(); if(h && !document.getElementById('dm-emergency-panel-413rg')) setTimeout(patch,50); });
    window.addEventListener('DOMContentLoaded',()=>{ const h=host(); if(h) mo.observe(h,{childList:true,subtree:false}); });
    const h=host(); if(h) mo.observe(h,{childList:true,subtree:false});
  }catch{}
})();

/* AT-MEC_HM_4.13R_L - Device Configuration Center SAFE
   Scopo: aggiunge un centro configurazione dispositivi dentro Device Manager.
   SAFE: salva solo in localStorage UI, non modifica backend, login, utenti, ruoli, permessi, profilo, Test Mode, ricette o report.
*/
(function(){
  if(window.__atmecDeviceConfigCenter413RL) return; window.__atmecDeviceConfigCenter413RL = true;
  const KEY='atmec_device_config_center_413RL';
  const DEFAULTS={
    esp32:{enabled:true,required:false,port:'',baud:'115200',timeout:'2000',mode:'auto'},
    pl303:{enabled:true,required:false,port:'',baud:'9600',timeout:'2500',mode:'auto'},
    multimeter:{enabled:true,required:false,resource:'',baud:'9600',timeout:'2500',mode:'auto'},
    scanner:{enabled:false,required:false,port:'',baud:'9600',timeout:'1500',mode:'manual'}
  };
  function esc(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));}
  function clone(o){try{return JSON.parse(JSON.stringify(o));}catch{return {};}}
  function cfg(){
    try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}'); return Object.assign(clone(DEFAULTS), raw, {
      esp32:Object.assign({},DEFAULTS.esp32,raw.esp32||{}), pl303:Object.assign({},DEFAULTS.pl303,raw.pl303||{}),
      multimeter:Object.assign({},DEFAULTS.multimeter,raw.multimeter||{}), scanner:Object.assign({},DEFAULTS.scanner,raw.scanner||{})
    });}catch{return clone(DEFAULTS);}
  }
  function saveConfig(c){localStorage.setItem(KEY, JSON.stringify(c)); try{window.__atmecDeviceConfigCenter413RLConfig=c;}catch{} }
  function host(){return document.getElementById('device-manager-page');}
  function now(){return new Date().toLocaleTimeString('it-IT');}
  function log(msg,type='info'){
    try{const box=document.getElementById('dm-audit-log'); if(box) box.insertAdjacentHTML('afterbegin',`<div class="dm-audit-log-row ${esc(type)}"><span>${now()}</span><b>${esc(msg)}</b></div>`);}catch{}
  }
  function ensureCss(){
    if(document.getElementById('atmec-dm-config-413rl-css')) return;
    const s=document.createElement('style'); s.id='atmec-dm-config-413rl-css';
    s.textContent=`
      .dm-config-center{border:1px solid rgba(59,130,246,.22);background:linear-gradient(135deg,rgba(30,41,59,.92),rgba(15,23,42,.96));}
      .dm-config-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;}
      .dm-config-head h3{margin:0;color:#e0f2fe;font-size:18px}.dm-config-head p{margin:4px 0 0;color:#94a3b8;font-size:12px;line-height:1.4}
      .dm-config-badge{font-size:11px;font-weight:800;letter-spacing:.08em;padding:6px 10px;border-radius:999px;background:rgba(59,130,246,.14);border:1px solid rgba(96,165,250,.28);color:#bfdbfe;white-space:nowrap;}
      .dm-config-table{display:grid;gap:8px}.dm-config-row{display:grid;grid-template-columns:1.05fr .8fr .8fr .7fr .7fr .75fr;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:9px 10px;background:rgba(15,23,42,.55)}
      .dm-config-row.dm-config-labels{background:transparent;border:0;color:#94a3b8;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:0 10px;}
      .dm-config-title b{display:block;color:#f8fafc;font-size:13px}.dm-config-title span{display:block;color:#94a3b8;font-size:11px;margin-top:2px}
      .dm-config-row input,.dm-config-row select{width:100%;background:rgba(2,6,23,.68);border:1px solid rgba(148,163,184,.22);border-radius:10px;color:#e5e7eb;padding:7px 8px;font-size:12px;outline:none;}
      .dm-config-check{display:flex;gap:8px;align-items:center;color:#cbd5e1;font-size:12px}.dm-config-check input{width:auto}.dm-config-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.dm-config-note{margin-top:9px;color:#94a3b8;font-size:12px;line-height:1.45}
      @media(max-width:1100px){.dm-config-row{grid-template-columns:1fr 1fr}.dm-config-row.dm-config-labels{display:none}}
    `; document.head.appendChild(s);
  }
  function row(key,title,subtitle,c){
    const isMeter=key==='multimeter';
    return `<div class="dm-config-row" data-dev="${key}"><div class="dm-config-title"><b>${title}</b><span>${subtitle}</span></div><input id="dm413rl-${key}-addr" placeholder="${isMeter?'USB0::... / VISA':'COM4'}" value="${esc(isMeter?(c.resource||''):(c.port||''))}"><input id="dm413rl-${key}-baud" value="${esc(c.baud||'')}" placeholder="baud"><input id="dm413rl-${key}-timeout" value="${esc(c.timeout||'')}" placeholder="ms"><select id="dm413rl-${key}-mode"><option value="auto" ${c.mode==='auto'?'selected':''}>Auto</option><option value="manual" ${c.mode==='manual'?'selected':''}>Manuale</option><option value="mock" ${c.mode==='mock'?'selected':''}>Simulato</option><option value="excluded" ${c.mode==='excluded'?'selected':''}>Escluso</option></select><div><label class="dm-config-check"><input id="dm413rl-${key}-enabled" type="checkbox" ${c.enabled!==false?'checked':''}> Abilitato</label><label class="dm-config-check"><input id="dm413rl-${key}-required" type="checkbox" ${c.required?'checked':''}> Obbligatorio</label></div></div>`;
  }
  function panel(){ const c=cfg(); return `<section class="dm-audit-panel dm-config-center" id="dm-config-center-413rl"><div class="dm-config-head"><div><h3>Centro configurazione dispositivi</h3><p>Configurazione ordinata di COM/VISA, baudrate, timeout e priorità. In questa revisione è SAFE: non blocca Test Mode e non modifica backend.</p></div><div class="dm-config-badge">CONFIG UI SAFE</div></div><div class="dm-config-table"><div class="dm-config-row dm-config-labels"><div>Dispositivo</div><div>Porta / Risorsa</div><div>Baud</div><div>Timeout</div><div>Modalità</div><div>Uso</div></div>${row('esp32','ESP32-S3','USB JSON / modbus_serial',c.esp32)}${row('pl303','PL303','Alimentatore AimTTi',c.pl303)}${row('multimeter','Multimetro','Keysight / DMM / VISA',c.multimeter)}${row('scanner','Scanner QR','Seriale / HID',c.scanner)}</div><div class="dm-config-actions"><button class="btn btn-primary btn-sm" onclick="dm413rlSaveDeviceConfig()">💾 Salva configurazione</button><button class="btn btn-ghost btn-sm" onclick="dm413rlDetectAndSuggest()">🔍 Suggerisci da rilevamento</button><button class="btn btn-ghost btn-sm" onclick="dm413rlResetDeviceConfig()">↺ Reset default</button></div><div class="dm-config-note">Nota: il campo “Obbligatorio” è preparatorio per il mapping ricette. Il gate operativo continua a usare i dispositivi richiesti dalla ricetta, per evitare falsi blocchi come quello ESP32 già corretto.</div></section>`; }
  function patch(){ ensureCss(); const h=host(); if(!h) return; const old=document.getElementById('dm-config-center-413rl'); if(old) old.remove(); const em=document.getElementById('dm-emergency-panel-413rg'); if(em) em.insertAdjacentHTML('afterend',panel()); else { const live=h.querySelector('.dm-audit-live-strip'); if(live) live.insertAdjacentHTML('afterend',panel()); else h.insertAdjacentHTML('beforeend',panel()); } }
  window.dm413rlSaveDeviceConfig=function(){ const c=cfg(); ['esp32','pl303','multimeter','scanner'].forEach(k=>{ const addr=document.getElementById(`dm413rl-${k}-addr`)?.value?.trim()||''; if(k==='multimeter') c[k].resource=addr; else c[k].port=addr; c[k].baud=document.getElementById(`dm413rl-${k}-baud`)?.value?.trim()||c[k].baud; c[k].timeout=document.getElementById(`dm413rl-${k}-timeout`)?.value?.trim()||c[k].timeout; c[k].mode=document.getElementById(`dm413rl-${k}-mode`)?.value||c[k].mode; c[k].enabled=!!document.getElementById(`dm413rl-${k}-enabled`)?.checked; c[k].required=!!document.getElementById(`dm413rl-${k}-required`)?.checked; }); saveConfig(c); log('Configurazione dispositivi salvata localmente.','info'); };
  window.dm413rlResetDeviceConfig=function(){ saveConfig(clone(DEFAULTS)); log('Configurazione dispositivi ripristinata ai default.','warn'); patch(); };
  window.dm413rlDetectAndSuggest=async function(){ try{ const c=cfg(); if(window.api?.scanSerialPorts){ const ports=await window.api.scanSerialPorts(); const list=Array.isArray(ports)?ports:[]; const esp=list.find(p=>p.likelyEsp32)||list.find(p=>String(p.friendlyName||p.manufacturer||'').toLowerCase().includes('usb'))||list[0]; if(esp&&!c.esp32.port)c.esp32.port=esp.path||esp.comName||''; const pl=list.find(p=>String(p.friendlyName||p.manufacturer||'').toLowerCase().includes('serial'))||list[1]; if(pl&&!c.pl303.port)c.pl303.port=pl.path||pl.comName||''; } if(window.api?.scanVisaResources){ const visa=await window.api.scanVisaResources(); if(Array.isArray(visa)&&visa[0]&&!c.multimeter.resource)c.multimeter.resource=String(visa[0].resourceName||visa[0].name||visa[0]); } saveConfig(c); log('Suggerimenti configurazione aggiornati da scan risorse.','info'); patch(); }catch(e){ log('Errore suggerimento configurazione: '+(e?.message||e),'error'); } };
  const prev=window.renderDeviceManagerPage;
  async function render413RL(){ try{ if(typeof prev==='function') await prev(); }catch(e){ console.warn('[AT-MEC 4.13R_L] render precedente fallito',e); } patch(); }
  window.renderDeviceManagerPage413RL=render413RL; window.renderDeviceManagerPage413RA=render413RL; window.renderDeviceManagerPage413RB=render413RL; window.renderDeviceManagerPage413RC=render413RL; window.renderDeviceManagerPage413RD=render413RL; window.renderDeviceManagerPage413RE=render413RL; window.renderDeviceManagerPage413RG=render413RL; window.renderDeviceManagerPage413G=render413RL; window.renderDeviceManagerPage326=render413RL; window.renderDeviceManagerPage=render413RL;
})();


/* AT-MEC_HM_4.13R_M - Device Diagnostic Center SAFE
   Scopo: aggiunge diagnostica manuale nel Device Manager usando solo API già esistenti.
   SAFE: test on-demand, non modifica backend, login, utenti, ruoli, permessi, profilo, Test Mode, ricette o report.
*/
(function(){
  if(window.__atmecDeviceDiagnostic413RM) return; window.__atmecDeviceDiagnostic413RM = true;
  const LOG_KEY='atmec_device_diagnostic_413RM_log';
  function esc(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));}
  function host(){return document.getElementById('device-manager-page');}
  function now(){return new Date().toLocaleTimeString('it-IT');}
  function readLog(){try{return JSON.parse(localStorage.getItem(LOG_KEY)||'[]')||[];}catch{return [];}}
  function saveLog(rows){try{localStorage.setItem(LOG_KEY,JSON.stringify((rows||[]).slice(0,80)));}catch{}}
  function pushLog(device,msg,result='info'){
    const row={ts:Date.now(),time:now(),device,msg,result}; const rows=[row,...readLog()].slice(0,80); saveLog(rows); renderLogOnly();
    try{const box=document.getElementById('dm-audit-log'); if(box) box.insertAdjacentHTML('afterbegin',`<div class="dm-audit-log-row ${esc(result)}"><span>${esc(row.time)}</span><b>${esc(device)} · ${esc(msg)}</b></div>`);}catch{}
    return row;
  }
  function setResult(key,status,msg,detail=''){
    const el=document.getElementById(`dm413rm-result-${key}`); if(!el) return;
    el.className=`dm-diag-result ${status}`;
    el.innerHTML=`<b>${status==='pass'?'PASS':status==='fail'?'FAIL':status==='warn'?'ATTENZIONE':'INFO'}</b><span>${esc(msg)}</span>${detail?`<small>${esc(detail)}</small>`:''}`;
  }
  function timeout(p,ms,label){return Promise.race([Promise.resolve(p),new Promise((_,rej)=>setTimeout(()=>rej(new Error((label||'operazione')+' timeout '+ms+'ms')),ms))]);}
  function ensureCss(){
    if(document.getElementById('atmec-dm-diagnostic-413rm-css')) return;
    const s=document.createElement('style'); s.id='atmec-dm-diagnostic-413rm-css';
    s.textContent=`
      .dm-diagnostic-center{border:1px solid rgba(34,197,94,.22);background:linear-gradient(135deg,rgba(15,23,42,.96),rgba(20,83,45,.16));}
      .dm-diag-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:12px}.dm-diag-head h3{margin:0;color:#dcfce7;font-size:18px}.dm-diag-head p{margin:4px 0 0;color:#94a3b8;font-size:12px;line-height:1.4}.dm-diag-badge{font-size:11px;font-weight:800;letter-spacing:.08em;padding:6px 10px;border-radius:999px;background:rgba(34,197,94,.12);border:1px solid rgba(74,222,128,.24);color:#bbf7d0;white-space:nowrap}
      .dm-diag-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.dm-diag-card{border:1px solid rgba(255,255,255,.09);background:rgba(15,23,42,.62);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:10px;min-height:210px}.dm-diag-card h4{margin:0;color:#f8fafc;font-size:14px}.dm-diag-card p{margin:0;color:#94a3b8;font-size:12px;line-height:1.35}.dm-diag-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:auto}.dm-diag-actions .btn{font-size:11px;padding:7px 9px}.dm-diag-result{border-radius:12px;border:1px solid rgba(148,163,184,.18);background:rgba(2,6,23,.48);padding:8px;min-height:54px}.dm-diag-result b{display:block;font-size:11px;letter-spacing:.06em;margin-bottom:3px}.dm-diag-result span{display:block;font-size:12px;color:#cbd5e1}.dm-diag-result small{display:block;margin-top:4px;color:#94a3b8;font-size:11px;word-break:break-word}.dm-diag-result.pass{border-color:rgba(34,197,94,.30);background:rgba(22,101,52,.14)}.dm-diag-result.pass b{color:#86efac}.dm-diag-result.fail{border-color:rgba(239,68,68,.32);background:rgba(127,29,29,.16)}.dm-diag-result.fail b{color:#fca5a5}.dm-diag-result.warn{border-color:rgba(245,158,11,.34);background:rgba(120,53,15,.16)}.dm-diag-result.warn b{color:#fcd34d}.dm-diag-result.info b{color:#bfdbfe}
      .dm-diag-log{margin-top:12px;border-top:1px solid rgba(255,255,255,.08);padding-top:10px;max-height:170px;overflow:auto}.dm-diag-log-row{display:grid;grid-template-columns:72px 120px 80px 1fr;gap:8px;align-items:center;font-size:12px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);color:#cbd5e1}.dm-diag-log-row .pass{color:#86efac}.dm-diag-log-row .fail{color:#fca5a5}.dm-diag-log-row .warn{color:#fcd34d}.dm-diag-note{margin-top:10px;color:#94a3b8;font-size:12px;line-height:1.45}
      @media(max-width:1200px){.dm-diag-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.dm-diag-grid{grid-template-columns:1fr}.dm-diag-log-row{grid-template-columns:62px 1fr}.dm-diag-log-row span:nth-child(3),.dm-diag-log-row b{display:none}}
    `; document.head.appendChild(s);
  }
  function logRows(){ const rows=readLog(); if(!rows.length) return '<div class="dm-audit-note">Nessuna diagnostica eseguita in questa sessione.</div>'; return rows.slice(0,20).map(r=>`<div class="dm-diag-log-row"><span>${esc(r.time)}</span><b>${esc(r.device)}</b><span class="${esc(r.result)}">${esc(String(r.result||'info').toUpperCase())}</span><span>${esc(r.msg)}</span></div>`).join(''); }
  function renderLogOnly(){const box=document.getElementById('dm413rm-diag-log'); if(box) box.innerHTML=logRows();}
  function panel(){return `<section class="dm-audit-panel dm-diagnostic-center" id="dm-diagnostic-center-413rm"><div class="dm-diag-head"><div><h3>Centro diagnostica dispositivi</h3><p>Test manuali e non bloccanti per verificare ESP32, PL303, Multimetro e Scanner senza cambiare il motore Test Mode.</p></div><div class="dm-diag-badge">DIAGNOSTIC SAFE</div></div><div class="dm-diag-grid">
    <div class="dm-diag-card"><h4>🔌 ESP32-S3</h4><p>Verifica info firmware/live e scansione porte USB candidate.</p><div id="dm413rm-result-esp32" class="dm-diag-result info"><b>INFO</b><span>Non testato</span></div><div class="dm-diag-actions"><button class="btn btn-primary btn-sm" onclick="dm413rmTestEsp32()">Test ESP32</button><button class="btn btn-ghost btn-sm" onclick="dm413rmScanSerial('esp32')">Scan COM</button></div></div>
    <div class="dm-diag-card"><h4>⚡ PL303</h4><p>Legge stato CH1 e permette OFF sicuro solo su richiesta manuale.</p><div id="dm413rm-result-pl303" class="dm-diag-result info"><b>INFO</b><span>Non testato</span></div><div class="dm-diag-actions"><button class="btn btn-primary btn-sm" onclick="dm413rmTestPl303()">Test stato</button><button class="btn btn-danger btn-sm" onclick="dm413rmPl303Off()">OFF sicuro</button></div></div>
    <div class="dm-diag-card"><h4>📏 Multimetro</h4><p>Verifica comunicazione SCPI/VISA con comando IDN e fallback misura tensione.</p><div id="dm413rm-result-dmm" class="dm-diag-result info"><b>INFO</b><span>Non testato</span></div><div class="dm-diag-actions"><button class="btn btn-primary btn-sm" onclick="dm413rmTestDmm()">Test DMM</button><button class="btn btn-ghost btn-sm" onclick="dm413rmScanVisa()">Scan VISA</button></div></div>
    <div class="dm-diag-card"><h4>▦ Scanner QR</h4><p>Controlla solo presenza porte seriali/HID candidate. Nessun blocco Test Mode.</p><div id="dm413rm-result-scanner" class="dm-diag-result info"><b>INFO</b><span>Non testato</span></div><div class="dm-diag-actions"><button class="btn btn-primary btn-sm" onclick="dm413rmTestScanner()">Test Scanner</button><button class="btn btn-ghost btn-sm" onclick="dm413rmClearDiagLog()">Pulisci log</button></div></div>
  </div><div class="dm-diag-log" id="dm413rm-diag-log">${logRows()}</div><div class="dm-diag-note">Diagnostica SAFE: i test sono manuali, registrano esito nel log locale e non modificano backend, login, ruoli, permessi, ricette o report.</div></section>`;}
  function patch(){ensureCss(); const h=host(); if(!h) return; const old=document.getElementById('dm-diagnostic-center-413rm'); if(old) old.remove(); const cfg=document.getElementById('dm-config-center-413rl'); if(cfg) cfg.insertAdjacentHTML('afterend',panel()); else { const em=document.getElementById('dm-emergency-panel-413rg'); if(em) em.insertAdjacentHTML('afterend',panel()); else h.insertAdjacentHTML('beforeend',panel()); }}
  window.dm413rmTestEsp32=async function(){ setResult('esp32','info','Test ESP32 in corso...'); try{ if(!window.api?.getEsp32Info) throw new Error('API getEsp32Info non disponibile'); const info=await timeout(window.api.getEsp32Info(),3500,'ESP32 info'); const ok=!!info && (info.ok!==false); const detail=info?JSON.stringify(info).slice(0,220):'nessuna risposta'; setResult('esp32',ok?'pass':'fail',ok?'ESP32 risponde':'ESP32 non live',detail); pushLog('ESP32',ok?'Test info PASS':'Test info FAIL',ok?'pass':'fail'); }catch(e){ setResult('esp32','fail','ESP32 non raggiungibile',e?.message||e); pushLog('ESP32','Errore test: '+(e?.message||e),'fail'); }};
  window.dm413rmScanSerial=async function(target='seriale'){ setResult(target==='esp32'?'esp32':'scanner','info','Scansione COM in corso...'); try{ if(!window.api?.scanSerialPorts) throw new Error('API scanSerialPorts non disponibile'); const rows=await timeout(window.api.scanSerialPorts(),5000,'scan COM'); const list=Array.isArray(rows)?rows:[]; const esp=list.filter(p=>p.likelyEsp32||String(p.friendlyName||p.manufacturer||p.path||'').toLowerCase().includes('usb')); const msg=`COM trovate: ${list.length}${esp.length?' · candidate ESP32: '+esp.length:''}`; setResult(target==='esp32'?'esp32':'scanner',list.length?'pass':'warn',msg,list.map(p=>p.path||p.comName||p.friendlyName||p).join(', ').slice(0,220)); pushLog(target==='esp32'?'ESP32':'Scanner',msg,list.length?'pass':'warn'); }catch(e){ setResult(target==='esp32'?'esp32':'scanner','fail','Errore scansione COM',e?.message||e); pushLog(target==='esp32'?'ESP32':'Scanner','Errore scan COM: '+(e?.message||e),'fail'); }};
  window.dm413rmTestPl303=async function(){ setResult('pl303','info','Lettura PL303 CH1 in corso...'); try{ if(!window.api?.queryPl303Status) throw new Error('API queryPl303Status non disponibile'); const r=await timeout(window.api.queryPl303Status(1),6500,'PL303 status'); const ok=!!r && r.ok!==false && !r.error; setResult('pl303',ok?'pass':'warn',ok?'PL303 risponde':'Risposta PL303 non conforme',JSON.stringify(r||{}).slice(0,220)); pushLog('PL303',ok?'Status CH1 PASS':'Status CH1 non conforme',ok?'pass':'warn'); }catch(e){ setResult('pl303','fail','PL303 non raggiungibile',e?.message||e); pushLog('PL303','Errore test: '+(e?.message||e),'fail'); }};
  window.dm413rmPl303Off=async function(){ setResult('pl303','warn','Invio OFF sicuro...'); try{ if(typeof window.safePl303Off==='function') await timeout(window.safePl303Off('DEVICE_DIAGNOSTIC_413RM'),7500,'PL303 OFF'); else if(window.api?.safePl303Off) await timeout(window.api.safePl303Off('DEVICE_DIAGNOSTIC_413RM'),7500,'PL303 OFF'); else throw new Error('safePl303Off non disponibile'); setResult('pl303','pass','OFF sicuro inviato','CH1+CH2 OFF richiesto manualmente'); pushLog('PL303','OFF sicuro inviato','pass'); }catch(e){ setResult('pl303','fail','OFF sicuro fallito',e?.message||e); pushLog('PL303','OFF sicuro fallito: '+(e?.message||e),'fail'); }};
  window.dm413rmTestDmm=async function(){ setResult('dmm','info','Query Multimetro in corso...'); try{ if(!window.api?.queryMultimeter) throw new Error('API queryMultimeter non disponibile'); let r; try{ r=await timeout(window.api.queryMultimeter('Keysight_34461A','*IDN?'),4500,'DMM *IDN?'); }catch(_e){ r=await timeout(window.api.queryMultimeter('Keysight_34461A','MEAS:VOLT:DC?'),4500,'DMM MEAS'); } const ok=r!==undefined && r!==null && String(r).trim()!==''; setResult('dmm',ok?'pass':'warn',ok?'Multimetro risponde':'Risposta vuota',String(typeof r==='object'?JSON.stringify(r):r).slice(0,220)); pushLog('Multimetro',ok?'Query PASS':'Query risposta vuota',ok?'pass':'warn'); }catch(e){ setResult('dmm','fail','Multimetro non raggiungibile',e?.message||e); pushLog('Multimetro','Errore test: '+(e?.message||e),'fail'); }};
  window.dm413rmScanVisa=async function(){ setResult('dmm','info','Scansione VISA in corso...'); try{ if(!window.api?.scanVisaResources) throw new Error('API scanVisaResources non disponibile'); const rows=await timeout(window.api.scanVisaResources(),9000,'scan VISA'); const list=Array.isArray(rows)?rows:[]; setResult('dmm',list.length?'pass':'warn',`Risorse VISA trovate: ${list.length}`,list.map(x=>x.resource||x.resourceName||x.name||x).join(', ').slice(0,220)); pushLog('Multimetro',`Scan VISA: ${list.length} risorse`,list.length?'pass':'warn'); }catch(e){ setResult('dmm','fail','Errore scan VISA',e?.message||e); pushLog('Multimetro','Errore scan VISA: '+(e?.message||e),'fail'); }};
  window.dm413rmTestScanner=async function(){ await window.dm413rmScanSerial('scanner'); };
  window.dm413rmClearDiagLog=function(){ saveLog([]); renderLogOnly(); pushLog('Sistema','Log diagnostica pulito','info'); };
  const prev=window.renderDeviceManagerPage;
  async function render413RM(){ try{ if(typeof prev==='function') await prev(); }catch(e){ console.warn('[AT-MEC 4.13R_M] render precedente fallito',e); } patch(); }
  window.renderDeviceManagerPage413RM=render413RM; window.renderDeviceManagerPage413RL=render413RM; window.renderDeviceManagerPage413RA=render413RM; window.renderDeviceManagerPage413RB=render413RM; window.renderDeviceManagerPage413RC=render413RM; window.renderDeviceManagerPage413RD=render413RM; window.renderDeviceManagerPage413RE=render413RM; window.renderDeviceManagerPage413RG=render413RM; window.renderDeviceManagerPage413G=render413RM; window.renderDeviceManagerPage326=render413RM; window.renderDeviceManagerPage=render413RM;
})();

/* AT-MEC_HM_4.13R_N - Device Manager Integrated Diagnostic UI + Recipe Mapping SAFE
   Scopo: integra la rifinitura diagnostica nel prossimo passo Device Manager, senza micro-fix separato.
   SAFE: solo renderer/UI. Non modifica backend, login, utenti, ruoli, permessi, Test Mode engine, ricette o report.
*/
(function(){
  if(window.__atmecDeviceManager413RN) return; window.__atmecDeviceManager413RN = true;
  const MAP_KEY='atmec_device_recipe_mapping_413RN';
  function esc(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));}
  function now(){return new Date().toLocaleTimeString('it-IT');}
  function host(){return document.getElementById('device-manager-page');}
  function safeJson(v){try{return JSON.stringify(v,null,2);}catch{return String(v??'');}}
  function asText(v){return typeof v==='object' ? safeJson(v) : String(v??'');}
  function timeout(p,ms,label){return Promise.race([Promise.resolve(p),new Promise((_,rej)=>setTimeout(()=>rej(new Error((label||'operazione')+' timeout '+ms+'ms')),ms))]);}
  function readMap(){try{return JSON.parse(localStorage.getItem(MAP_KEY)||'{}')||{};}catch{return {};}}
  function saveMap(v){try{localStorage.setItem(MAP_KEY,JSON.stringify(v||{}));}catch{}}
  function ensureCss(){
    if(document.getElementById('atmec-dm-413rn-css')) return;
    const s=document.createElement('style'); s.id='atmec-dm-413rn-css';
    s.textContent=`
      .dm-pretty-result{border-radius:12px;border:1px solid rgba(148,163,184,.18);background:rgba(2,6,23,.50);padding:9px;min-height:54px}.dm-pretty-result.pass{border-color:rgba(34,197,94,.34);background:rgba(22,101,52,.14)}.dm-pretty-result.fail{border-color:rgba(239,68,68,.34);background:rgba(127,29,29,.16)}.dm-pretty-result.warn{border-color:rgba(245,158,11,.36);background:rgba(120,53,15,.16)}.dm-pretty-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}.dm-pretty-head b{font-size:12px;letter-spacing:.06em;color:#e5e7eb}.dm-pretty-pill{font-size:10px;font-weight:900;letter-spacing:.07em;border-radius:999px;padding:4px 8px}.dm-pretty-pill.pass{background:rgba(34,197,94,.16);color:#86efac;border:1px solid rgba(74,222,128,.28)}.dm-pretty-pill.fail{background:rgba(239,68,68,.16);color:#fca5a5;border:1px solid rgba(248,113,113,.28)}.dm-pretty-pill.warn{background:rgba(245,158,11,.16);color:#fde68a;border:1px solid rgba(251,191,36,.28)}.dm-pretty-rows{display:grid;gap:4px}.dm-pretty-row{display:grid;grid-template-columns:92px 1fr;gap:8px;font-size:11px;line-height:1.3}.dm-pretty-row span{color:#94a3b8}.dm-pretty-row strong{color:#e2e8f0;font-weight:700;word-break:break-word}.dm-pretty-raw{margin-top:7px}.dm-pretty-raw summary{cursor:pointer;color:#93c5fd;font-size:11px}.dm-pretty-raw pre{white-space:pre-wrap;word-break:break-word;max-height:130px;overflow:auto;background:rgba(15,23,42,.7);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px;color:#cbd5e1;font-size:10px}
      .dm-map-center{border:1px solid rgba(59,130,246,.24);background:linear-gradient(135deg,rgba(15,23,42,.96),rgba(30,64,175,.15));}.dm-map-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:12px}.dm-map-head h3{margin:0;color:#dbeafe;font-size:18px}.dm-map-head p{margin:4px 0 0;color:#94a3b8;font-size:12px;line-height:1.4}.dm-map-badge{font-size:11px;font-weight:900;letter-spacing:.08em;padding:6px 10px;border-radius:999px;background:rgba(59,130,246,.12);border:1px solid rgba(96,165,250,.25);color:#bfdbfe;white-space:nowrap}.dm-map-list{display:grid;gap:8px}.dm-map-row{display:grid;grid-template-columns:190px 1fr 170px;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.08);background:rgba(15,23,42,.52);border-radius:13px;padding:9px 10px}.dm-map-row b{color:#f8fafc;font-size:13px}.dm-map-row small{display:block;color:#94a3b8;font-size:11px;margin-top:2px}.dm-map-row .dm-map-desc{color:#cbd5e1;font-size:12px}.dm-map-row select{background:#0f172a;border:1px solid rgba(148,163,184,.24);border-radius:10px;color:#e5e7eb;padding:7px 8px;font-size:12px}.dm-map-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.dm-map-note{margin-top:8px;color:#94a3b8;font-size:12px;line-height:1.45}@media(max-width:960px){.dm-map-row{grid-template-columns:1fr}.dm-pretty-row{grid-template-columns:80px 1fr}}
    `; document.head.appendChild(s);
  }
  function resultEl(key){return document.getElementById('dm413rm-result-'+key);}
  function setPretty(key,status,title,rows,raw){
    const el=resultEl(key); if(!el) return;
    const pill=status==='pass'?'PASS':status==='fail'?'FAIL':status==='warn'?'ATTENZIONE':'INFO';
    const rowHtml=(rows||[]).filter(Boolean).map(([k,v])=>`<div class="dm-pretty-row"><span>${esc(k)}</span><strong>${esc(v||'-')}</strong></div>`).join('');
    el.className='dm-pretty-result '+status;
    el.innerHTML=`<div class="dm-pretty-head"><b>${esc(title)}</b><em class="dm-pretty-pill ${esc(status)}">${pill}</em></div><div class="dm-pretty-rows">${rowHtml}</div>${raw?`<details class="dm-pretty-raw"><summary>Dettaglio tecnico</summary><pre>${esc(asText(raw))}</pre></details>`:''}`;
  }
  function logDiag(device,msg,result){try{ if(typeof window.dm413rmClearDiagLog==='function'){} const key='atmec_device_diagnostic_413RM_log'; const rows=JSON.parse(localStorage.getItem(key)||'[]')||[]; rows.unshift({ts:Date.now(),time:now(),device,msg,result:result||'info'}); localStorage.setItem(key,JSON.stringify(rows.slice(0,80))); const box=document.getElementById('dm413rm-diag-log'); if(box && typeof window.renderDeviceManagerPage==='function'){ /* log visible after next render */ } }catch{} }
  function fwOf(info){return info?.firmware?.fw || info?.fw || info?.version || info?.firmwareVersion || '-';}
  function boardOf(info){return info?.firmware?.board || info?.board || info?.device || '-';}
  function okOf(info){return !!info && info.ok!==false && info.live!==false;}
  window.dm413rmTestEsp32=async function(){
    setPretty('esp32','warn','Test ESP32 in corso',[['Stato','Verifica info firmware/live...']],null);
    try{
      if(!window.api?.getEsp32Info) throw new Error('API getEsp32Info non disponibile');
      const info=await timeout(window.api.getEsp32Info(),3500,'ESP32 info');
      const ok=okOf(info);
      setPretty('esp32',ok?'pass':'fail',ok?'ESP32 ONLINE':'ESP32 non live',[
        ['Dispositivo', info?.device || boardOf(info) || 'ESP32-S3'],
        ['Stato', ok?'ONLINE':'NON LIVE'],
        ['Porta', info?.connectionString || info?.port || info?.com || '-'],
        ['Trasporto', String(info?.transport||'USB JSON').replace('modbus_serial logico → ','')],
        ['Firmware', fwOf(info)],
        ['Board', boardOf(info)],
        ['ID', info?.firmware?.id ?? info?.id ?? '-']
      ],info);
      logDiag('ESP32',ok?'Diagnostica ESP32 PASS':'Diagnostica ESP32 FAIL',ok?'pass':'fail');
    }catch(e){ setPretty('esp32','fail','ESP32 non raggiungibile',[['Errore',e?.message||e]],null); logDiag('ESP32','Errore test: '+(e?.message||e),'fail'); }
  };
  window.dm413rmTestPl303=async function(){
    setPretty('pl303','warn','Test PL303 in corso',[['Stato','Lettura CH1...']],null);
    try{
      if(!window.api?.queryPl303Status) throw new Error('API queryPl303Status non disponibile');
      const r=await timeout(window.api.queryPl303Status(1),6500,'PL303 status');
      const ok=!!r && r.ok!==false && !r.error;
      setPretty('pl303',ok?'pass':'warn',ok?'PL303 risponde':'Risposta PL303 non conforme',[
        ['Dispositivo','Aim-TTi PL303'],['Canale','CH1'],['Stato',ok?'COMUNICAZIONE OK':'NON CONFORME'],['Tensione',r?.voltage??r?.v??'-'],['Corrente',r?.current??r?.i??'-'],['Output',r?.output??r?.on??'-']
      ],r);
      logDiag('PL303',ok?'Diagnostica PL303 PASS':'Diagnostica PL303 non conforme',ok?'pass':'warn');
    }catch(e){ setPretty('pl303','fail','PL303 non raggiungibile',[['Errore',e?.message||e]],null); logDiag('PL303','Errore test: '+(e?.message||e),'fail'); }
  };
  window.dm413rmTestDmm=async function(){
    setPretty('dmm','warn','Test Multimetro in corso',[['Stato','Query SCPI/VISA...']],null);
    try{
      if(!window.api?.queryMultimeter) throw new Error('API queryMultimeter non disponibile');
      let r, cmd='*IDN?';
      try{ r=await timeout(window.api.queryMultimeter('Keysight_34461A','*IDN?'),4500,'DMM *IDN?'); }
      catch(_e){ cmd='MEAS:VOLT:DC?'; r=await timeout(window.api.queryMultimeter('Keysight_34461A','MEAS:VOLT:DC?'),4500,'DMM MEAS'); }
      const text=typeof r==='object'?safeJson(r):String(r??''); const ok=text.trim()!=='';
      setPretty('dmm',ok?'pass':'warn',ok?'Multimetro risponde':'Risposta vuota',[[ 'Dispositivo','Keysight 34461A / SCPI' ],['Comando',cmd],['Risposta',text.slice(0,90)]],r);
      logDiag('Multimetro',ok?'Diagnostica DMM PASS':'Diagnostica DMM risposta vuota',ok?'pass':'warn');
    }catch(e){ setPretty('dmm','fail','Multimetro non raggiungibile',[['Errore',e?.message||e]],null); logDiag('Multimetro','Errore test: '+(e?.message||e),'fail'); }
  };
  function recipeName(){try{return window.currentRecipe?.name || window.selectedRecipe?.name || document.getElementById('recipe-name')?.value || 'Ricetta corrente';}catch{return 'Ricetta corrente';}}
  function getDetectedReq(){try{ if(typeof window.getRequiredInstrumentsForRecipe==='function') return window.getRequiredInstrumentsForRecipe()||[]; }catch{} return [];}
  function labelOf(logical){ const n=String(logical||'').toLowerCase(); if(n.includes('modbus')||n.includes('esp')) return ['ESP32-S3','Controller I/O digitale USB JSON','esp32']; if(n.includes('pl303')||n.includes('tti')) return ['PL303','Alimentatore programmabile','pl303']; if(n.includes('34461')||n.includes('key')||n.includes('mult')) return ['Multimetro','Misure SCPI/VISA','multimeter']; if(n.includes('scanner')||n.includes('qr')) return ['Scanner QR','Identificazione seriale','scanner']; return [logical||'Dispositivo','Risorsa richiesta dalla ricetta','generic']; }
  function mappingPanel(){
    const req=getDetectedReq(); const map=readMap(); const unique=req.length?req:['modbus_serial','AimTTi_PL303','Keysight_34461A'];
    const rows=unique.map(logical=>{ const [title,desc,key]=labelOf(logical); const val=map[logical]||'auto'; return `<div class="dm-map-row"><div><b>${esc(title)}</b><small>${esc(logical)}</small></div><div class="dm-map-desc">${esc(desc)}</div><select onchange="dm413rnSetMapping('${esc(logical)}',this.value)"><option value="auto" ${val==='auto'?'selected':''}>Auto da ricetta</option><option value="required" ${val==='required'?'selected':''}>Obbligatorio</option><option value="optional" ${val==='optional'?'selected':''}>Opzionale</option><option value="excluded" ${val==='excluded'?'selected':''}>Escluso/manuale</option></select></div>`; }).join('');
    return `<section class="dm-audit-panel dm-map-center" id="dm-recipe-mapping-413rn"><div class="dm-map-head"><div><h3>Mapping dispositivi ricetta</h3><p>Riepilogo dei dispositivi richiesti dalla ricetta selezionata. Questa sezione prepara il collegamento avanzato ricetta → Device Manager senza modificare il motore Test Mode.</p></div><div class="dm-map-badge">RECIPE MAP SAFE</div></div><div class="dm-map-list"><div class="dm-map-row"><div><b>Ricetta</b><small>contesto attivo</small></div><div class="dm-map-desc">${esc(recipeName())}</div><select disabled><option>${req.length?'dispositivi rilevati: '+req.length:'nessuna richiesta specifica'}</option></select></div>${rows}</div><div class="dm-map-toolbar"><button class="btn btn-primary btn-sm" onclick="dm413rnRefreshMapping()">Aggiorna mapping</button><button class="btn btn-ghost btn-sm" onclick="dm413rnResetMapping()">Reset mapping locale</button></div><div class="dm-map-note">Nota: il gate operativo continua a usare la logica sicura della 4.13R_K. Il mapping locale serve per rendere visibile e preparare la configurazione avanzata dispositivi/ricette.</div></section>`;
  }
  function patchMapping(){ensureCss(); const h=host(); if(!h) return; const old=document.getElementById('dm-recipe-mapping-413rn'); if(old) old.remove(); const diag=document.getElementById('dm-diagnostic-center-413rm'); if(diag) diag.insertAdjacentHTML('afterend',mappingPanel()); else h.insertAdjacentHTML('beforeend',mappingPanel());}
  window.dm413rnSetMapping=function(logical,val){const m=readMap(); m[logical]=val; saveMap(m); try{console.log('[AT-MEC 4.13R_N] mapping',logical,val);}catch{}};
  window.dm413rnRefreshMapping=function(){patchMapping();};
  window.dm413rnResetMapping=function(){saveMap({}); patchMapping();};
  const prev=window.renderDeviceManagerPage;
  async function render413RN(){ try{ if(typeof prev==='function') await prev(); }catch(e){ console.warn('[AT-MEC 4.13R_N] render precedente fallito',e); } try{patchMapping();}catch(e){console.warn('[AT-MEC 4.13R_N] mapping patch fallita',e);} }
  window.renderDeviceManagerPage413RN=render413RN;
  window.renderDeviceManagerPage413RM=render413RN; window.renderDeviceManagerPage413RL=render413RN; window.renderDeviceManagerPage413RK=render413RN; window.renderDeviceManagerPage413RJ=render413RN; window.renderDeviceManagerPage413RI=render413RN; window.renderDeviceManagerPage413RH=render413RN; window.renderDeviceManagerPage413RG=render413RN; window.renderDeviceManagerPage413RA=render413RN; window.renderDeviceManagerPage413G=render413RN; window.renderDeviceManagerPage326=render413RN; window.renderDeviceManagerPage=render413RN;
})();

/* AT-MEC_HM_4.13R_O - Device Manager Enterprise Safe
   Scopo: consolidamento UI Device Manager con health score, storico eventi persistente,
   lock test visivo e backup configurazioni. SAFE: solo renderer/localStorage, nessun backend modificato.
*/
(function(){
  if(window.__atmecDeviceManager413RO) return; window.__atmecDeviceManager413RO = true;
  const HIST_KEY='atmec_device_enterprise_413RO_history';
  const LOCK_KEY='atmec_device_enterprise_413RO_lock';
  const BACKUP_KEY='atmec_device_enterprise_413RO_backup';
  function esc(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));}
  function host(){return document.getElementById('device-manager-page');}
  function now(){return new Date().toLocaleString('it-IT');}
  function readJson(k,d){try{return JSON.parse(localStorage.getItem(k)||'')??d;}catch{return d;}}
  function saveJson(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
  function addHist(device,msg,type){const rows=readJson(HIST_KEY,[]); rows.unshift({ts:Date.now(),time:now(),device:device||'Sistema',msg:msg||'',type:type||'info'}); saveJson(HIST_KEY,rows.slice(0,250));}
  function nameOf(r){return String(r?.name||r?.device||r?.id||r?.label||'device').toLowerCase();}
  function meta(r){const n=nameOf(r); if(n.includes('esp')||n.includes('modbus')) return {key:'esp32',title:'ESP32-S3',icon:'🧠'}; if(n.includes('pl303')||n.includes('tti')||n.includes('psu')) return {key:'pl303',title:'PL303',icon:'⚡'}; if(n.includes('34461')||n.includes('key')||n.includes('meter')||n.includes('mult')) return {key:'dmm',title:'Multimetro',icon:'📏'}; if(n.includes('scanner')||n.includes('qr')) return {key:'scanner',title:'Scanner',icon:'▣'}; return {key:n.replace(/[^a-z0-9]+/g,'_')||'device',title:r?.label||r?.name||'Dispositivo',icon:'◈'};}
  function status(r){const txt=String(r?.status||r?.state||'').toLowerCase(); if(r?.excluded||txt.includes('excluded')||txt.includes('esclus')) return {cls:'excluded',ok:false,label:'ESCLUSO'}; if(r?.mock||r?.simulated||txt.includes('mock')||txt.includes('simul')) return {cls:'mock',ok:true,label:'SIMULATO'}; if(r?.live===true||r?.connected===true||r?.online===true||txt.includes('online')||txt.includes('connected')) return {cls:'online',ok:true,label:'ONLINE'}; if(r?.error||txt.includes('error')||txt.includes('errore')) return {cls:'error',ok:false,label:'ERRORE'}; return {cls:'offline',ok:false,label:'OFFLINE'};}
  function heartbeatAge(r){const t=r?.lastSeen||r?.lastHeartbeat||r?.heartbeatAt||r?.updatedAt||r?.ts; const ms=typeof t==='number'?t:Date.parse(t||''); return Number.isFinite(ms)?Math.max(0,Date.now()-ms):null;}
  function health(r){const s=status(r); let score=s.cls==='online'?98:s.cls==='mock'?78:s.cls==='excluded'?55:s.cls==='error'?30:20; const age=heartbeatAge(r); if(age!==null){ if(age>45000) score-=35; else if(age>15000) score-=15; } if(r?.error||r?.lastError) score-=20; return Math.max(0,Math.min(100,score));}
  async function readRows(){
    let rows=[]; let source='UI locale';
    try{ if(window.api?.getProfessionalDevices){ const r=await window.api.getProfessionalDevices(); rows=Array.isArray(r)?r:(Array.isArray(r?.devices)?r.devices:[]); source='getProfessionalDevices'; } }catch(e){ addHist('Sistema','Errore lettura getProfessionalDevices: '+(e?.message||e),'warn'); }
    if(!rows.length){ try{ if(window.api?.getHardwareStatuses){ const r=await window.api.getHardwareStatuses(); rows=Array.isArray(r)?r:(Array.isArray(r?.devices)?r.devices:(Array.isArray(r?.statuses)?r.statuses:[])); source='getHardwareStatuses'; } }catch(e){ addHist('Sistema','Errore lettura getHardwareStatuses: '+(e?.message||e),'warn'); } }
    if(!rows.length){ rows=[{name:'ESP32-S3',status:'offline'},{name:'PL303',status:'offline'},{name:'Keysight 34461A',status:'offline'},{name:'Scanner QR',status:'excluded'}]; source='fallback UI'; }
    const seen=new Set(); rows=rows.map(r=>({...r,_meta:meta(r)})).filter(r=>{const k=r._meta.key;if(seen.has(k))return false;seen.add(k);return true;});
    return {rows,source};
  }
  function ensureCss(){ if(document.getElementById('atmec-dm-413ro-css')) return; const s=document.createElement('style'); s.id='atmec-dm-413ro-css'; s.textContent=`
    .dm-enterprise{margin-top:14px;border:1px solid rgba(34,211,238,.22);background:linear-gradient(135deg,rgba(2,6,23,.96),rgba(8,47,73,.26));border-radius:18px;padding:16px;box-shadow:0 18px 42px rgba(0,0,0,.20)}
    .dm-ent-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}.dm-ent-head h3{margin:0;color:#e0f2fe;font-size:19px}.dm-ent-head p{margin:4px 0 0;color:#94a3b8;font-size:12px;line-height:1.4}.dm-ent-badge{font-size:11px;font-weight:900;letter-spacing:.08em;border:1px solid rgba(34,211,238,.28);background:rgba(8,145,178,.12);color:#a5f3fc;border-radius:999px;padding:6px 10px;white-space:nowrap}
    .dm-ent-grid{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:10px}.dm-ent-kpi{border:1px solid rgba(255,255,255,.08);background:rgba(15,23,42,.58);border-radius:14px;padding:11px}.dm-ent-kpi span{display:block;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.06em}.dm-ent-kpi b{display:block;color:#f8fafc;font-size:24px;margin-top:4px}.dm-ent-kpi small{color:#64748b;font-size:11px}
    .dm-health-list{display:grid;gap:8px;margin-top:12px}.dm-health-row{display:grid;grid-template-columns:170px 1fr 90px 110px;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.08);background:rgba(15,23,42,.50);border-radius:13px;padding:9px 10px}.dm-health-row .name{font-weight:800;color:#f8fafc;font-size:13px}.dm-health-row .meta{color:#94a3b8;font-size:11px}.dm-health-bar{height:10px;background:rgba(148,163,184,.18);border-radius:999px;overflow:hidden}.dm-health-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#22c55e,#06b6d4)}.dm-health-fill.warn{background:linear-gradient(90deg,#f59e0b,#facc15)}.dm-health-fill.bad{background:linear-gradient(90deg,#ef4444,#f97316)}.dm-health-score{font-weight:900;color:#e2e8f0}.dm-lock-pill{border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900;border:1px solid rgba(255,255,255,.10);color:#cbd5e1;text-align:center}.dm-lock-pill.locked{background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.25);color:#fecaca}.dm-lock-pill.free{background:rgba(34,197,94,.12);border-color:rgba(74,222,128,.22);color:#bbf7d0}
    .dm-ent-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.dm-ent-history{margin-top:12px;max-height:170px;overflow:auto;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(15,23,42,.48)}.dm-ent-hrow{display:grid;grid-template-columns:145px 120px 80px 1fr;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.06);font-size:11px}.dm-ent-hrow:last-child{border-bottom:0}.dm-ent-hrow span{color:#94a3b8}.dm-ent-hrow b{color:#e2e8f0}.dm-ent-hrow em{font-style:normal;font-weight:900;color:#a5f3fc}.dm-ent-note{color:#94a3b8;font-size:12px;line-height:1.45;margin-top:10px}@media(max-width:980px){.dm-ent-grid{grid-template-columns:repeat(2,1fr)}.dm-health-row{grid-template-columns:1fr}.dm-ent-hrow{grid-template-columns:1fr}}
  `; document.head.appendChild(s); }
  function renderRows(rows){return rows.map(r=>{const m=r._meta||meta(r); const s=status(r); const h=health(r); const bar=h<45?'bad':h<75?'warn':''; const age=heartbeatAge(r); const hb=age==null?'heartbeat n/d':(Math.round(age/1000)+'s fa'); const lock=readJson(LOCK_KEY,{})[m.key]===true; return `<div class="dm-health-row"><div><div class="name">${m.icon} ${esc(m.title)}</div><div class="meta">${esc(s.label)} · ${esc(r.connectionString||r.port||r.resource||'-')} · ${esc(hb)}</div></div><div class="dm-health-bar"><div class="dm-health-fill ${bar}" style="width:${h}%"></div></div><div class="dm-health-score">${h}%</div><div class="dm-lock-pill ${lock?'locked':'free'}">${lock?'LOCK TEST':'LIBERO'}</div></div>`;}).join('');}
  function historyRows(){const rows=readJson(HIST_KEY,[]); if(!rows.length) return '<div class="dm-ent-note" style="padding:10px">Nessun evento enterprise registrato.</div>'; return rows.slice(0,30).map(r=>`<div class="dm-ent-hrow"><span>${esc(r.time)}</span><b>${esc(r.device)}</b><em>${esc(String(r.type||'info').toUpperCase())}</em><span>${esc(r.msg)}</span></div>`).join('');}
  function panel(rows,source){const online=rows.filter(r=>status(r).cls==='online').length; const mock=rows.filter(r=>status(r).cls==='mock').length; const bad=rows.filter(r=>!status(r).ok && status(r).cls!=='excluded').length; const avg=Math.round(rows.reduce((a,r)=>a+health(r),0)/Math.max(1,rows.length)); return `<section class="dm-enterprise" id="dm-enterprise-413ro"><div class="dm-ent-head"><div><h3>Device Manager Enterprise</h3><p>Health score, storico eventi, lock visivo durante test e backup configurazioni. Consolidamento solo UI/localStorage.</p></div><div class="dm-ent-badge">ENTERPRISE SAFE</div></div><div class="dm-ent-grid"><div class="dm-ent-kpi"><span>Health medio</span><b>${avg}%</b><small>calcolato su stato/heartbeat</small></div><div class="dm-ent-kpi"><span>Online</span><b>${online}</b><small>origine ${esc(source)}</small></div><div class="dm-ent-kpi"><span>Simulati</span><b>${mock}</b><small>ammessi nel gate safe</small></div><div class="dm-ent-kpi"><span>Anomalie</span><b>${bad}</b><small>offline/errori</small></div></div><div class="dm-health-list">${renderRows(rows)}</div><div class="dm-ent-actions"><button class="btn btn-primary btn-sm" onclick="dm413roRefresh()">Aggiorna health</button><button class="btn btn-ghost btn-sm" onclick="dm413roToggleTestLock()">Lock/Unlock test visivo</button><button class="btn btn-ghost btn-sm" onclick="dm413roBackupConfig()">Backup configurazioni</button><button class="btn btn-ghost btn-sm" onclick="dm413roClearHistory()">Pulisci storico</button></div><div class="dm-ent-history" id="dm-enterprise-history-413ro">${historyRows()}</div><div class="dm-ent-note">Nota: questa sezione non blocca realmente strumenti e non cambia backend. Il lock è indicatore operativo UI per preparare la fase enterprise definitiva.</div></section>`;}
  async function patch(){ensureCss(); const h=host(); if(!h) return; const old=document.getElementById('dm-enterprise-413ro'); if(old) old.remove(); const {rows,source}=await readRows(); const target=document.getElementById('dm-recipe-mapping-413rn') || document.getElementById('dm-diagnostic-center-413rm') || h.lastElementChild; if(target) target.insertAdjacentHTML('afterend',panel(rows,source)); else h.insertAdjacentHTML('beforeend',panel(rows,source));}
  window.dm413roRefresh=async function(){addHist('Sistema','Refresh health score eseguito','info'); await patch();};
  window.dm413roToggleTestLock=async function(){const {rows}=await readRows(); const lock=readJson(LOCK_KEY,{}); const anyUnlocked=rows.some(r=>lock[(r._meta||meta(r)).key]!==true); rows.forEach(r=>{lock[(r._meta||meta(r)).key]=anyUnlocked;}); saveJson(LOCK_KEY,lock); addHist('Sistema',anyUnlocked?'Lock visivo test attivato':'Lock visivo test disattivato',anyUnlocked?'warn':'info'); await patch();};
  window.dm413roBackupConfig=function(){const data={ts:Date.now(),time:now(),deviceConfig:readJson('atmec_device_config_center_413RL',{}),recipeMapping:readJson('atmec_device_recipe_mapping_413RN',{}),reconnectConfig:readJson('atmec_device_reconnect_413rd',{}),gateConfig:readJson('atmec_device_gate_413re',{})}; saveJson(BACKUP_KEY,data); addHist('Sistema','Backup configurazioni Device Manager salvato in locale','pass'); patch();};
  window.dm413roClearHistory=function(){saveJson(HIST_KEY,[]); addHist('Sistema','Storico enterprise pulito','info'); patch();};
  const prev=window.renderDeviceManagerPage;
  async function render413RO(){ try{ if(typeof prev==='function') await prev(); }catch(e){console.warn('[AT-MEC 4.13R_O] render precedente fallito',e);} try{ await patch(); }catch(e){console.warn('[AT-MEC 4.13R_O] patch enterprise fallita',e);} }
  window.renderDeviceManagerPage413RO=render413RO;
  window.renderDeviceManagerPage413RN=render413RO; window.renderDeviceManagerPage413RM=render413RO; window.renderDeviceManagerPage413RL=render413RO; window.renderDeviceManagerPage413RK=render413RO; window.renderDeviceManagerPage413RJ=render413RO; window.renderDeviceManagerPage413RI=render413RO; window.renderDeviceManagerPage413RH=render413RO; window.renderDeviceManagerPage413RG=render413RO; window.renderDeviceManagerPage413RA=render413RO; window.renderDeviceManagerPage413G=render413RO; window.renderDeviceManagerPage326=render413RO; window.renderDeviceManagerPage=render413RO;
})();


(function ensureRecipeVariablesCss414A(){
  try {
    if (typeof document === 'undefined' || document.getElementById('atmec-recipe-vars-414a-css')) return;
    const st = document.createElement('style');
    st.id = 'atmec-recipe-vars-414a-css';
    st.textContent = `
      .recipe-vars-panel-414a{border:1px solid rgba(0,212,255,.18);background:linear-gradient(135deg,rgba(9,18,40,.96),rgba(13,27,58,.90));border-radius:18px;padding:16px;margin:0 0 16px 0;box-shadow:0 18px 45px rgba(0,0,0,.20)}
      .recipe-vars-head-414a{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:12px}.recipe-vars-head-414a h3{margin:0;color:#eaf6ff}.recipe-vars-head-414a p{margin:4px 0 0;color:#9fb2c8;font-size:13px}.recipe-vars-standard-414a{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}.recipe-var-chip-414a{display:inline-flex;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);border-radius:999px;padding:7px 10px;font-size:12px}.recipe-var-chip-414a b{color:#7de3ff}.recipe-var-chip-414a em{font-style:normal;color:#d8e7ff;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.recipe-vars-custom-414a{display:grid;gap:7px}.recipe-var-row-414a{display:grid;grid-template-columns:minmax(160px,220px) 1fr 42px;gap:8px;align-items:center}.recipe-var-row-414a.labels{color:#91a9c1;font-size:12px;text-transform:uppercase;letter-spacing:.05em}.recipe-var-row-414a input{width:100%;background:rgba(3,10,25,.80);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#eaf6ff;padding:9px 10px}.recipe-vars-actions-414a{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.recipe-vars-note-414a{margin-top:10px;color:#9fb2c8;font-size:12px}.recipe-vars-note-414a code{color:#fff;background:rgba(255,255,255,.08);border-radius:6px;padding:2px 6px}
    `;
    document.head.appendChild(st);
  } catch(_e) {}
})();
