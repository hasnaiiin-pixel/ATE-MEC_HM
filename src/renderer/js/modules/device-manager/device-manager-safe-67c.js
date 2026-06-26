/* AT-MEC_HM_6.7C_SAFE_DEVICE_MANAGER_ENTERPRISE
 * Safe hardware bridge based on stable 6.7B_FIX2D.
 * Goals: simple Device Manager UI, shared hardware status for Test Mode, no automatic simulation, no heavy watchdog.
 */
(function(){
  'use strict';
  const VERSION='6.7C_SAFE_DEVICE_MANAGER_ENTERPRISE';
  const CFG_KEY='atmec.device_manager_413g.config';
  const STATUS_KEY='atmec67c_device_status_shared';
  const LOG_KEY='atmec67c_device_log';
  const AUTO_KEYS=['atmec_dm_auto_refresh_413rb','atmec_dm_auto_reconnect_413rd','atmec67c_auto_watchdog'];
  const DEVICE_DEFS=[
    {key:'pl303', logical:'AimTTi_PL303', aliases:['aimtti_pl303','pl303','tti','alimentatore','power'], title:'Alimentatore PL303', icon:'⚡', cfgPort:'pl303Port', cfgBaud:'pl303Baud', baud:9600},
    {key:'meter', logical:'Keysight_34461A', aliases:['keysight_34461a','keysight','34461','multimetro','dmm'], title:'Multimetro', icon:'📟', cfgPort:'keysightResource', cfgBaud:'keysightBaud', baud:9600},
    {key:'esp32', logical:'modbus_serial', aliases:['modbus_serial','esp32','esp32-s3','controller'], title:'ESP32 / I/O', icon:'🧩', cfgPort:'esp32Port', cfgBaud:'esp32Baud', baud:115200},
    {key:'scanner', logical:'QR_Scanner', aliases:['qr_scanner','scanner','barcode'], title:'Scanner / QR', icon:'▣', cfgPort:'scannerPort', cfgBaud:'scannerBaud', baud:9600}
  ];
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]||m));
  function now(){return new Date().toLocaleTimeString('it-IT');}
  function readJson(k,f){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?f:v;}catch(_){return f;}}
  function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v,null,2));}catch(_){}}
  function cfg(){return Object.assign({esp32Port:'',esp32Baud:115200,pl303Port:'',pl303Baud:9600,keysightResource:'',keysightBaud:9600,scannerPort:'',scannerBaud:9600,timeoutMs:2500,manualSimulation:{}}, readJson(CFG_KEY,{}));}
  function saveCfg(c){writeJson(CFG_KEY,c||{});}
  async function syncCfgFromAppSettings(){
    if(!window.api?.getAppSettings) return;
    try{
      const s=await window.api.getAppSettings();
      if(!s) return;
      const c=cfg();
      const next=Object.assign({}, c, {
        esp32Port: s.esp32Port || c.esp32Port || '',
        esp32Baud: Number(s.esp32Baud || c.esp32Baud || 115200),
        pl303Port: (s.pl303Mode === 'ETHERNET' ? (s.pl303Host || c.pl303Port) : (s.pl303Com || s.ttiPort || c.pl303Port)) || '',
        pl303Baud: Number(s.pl303Mode === 'ETHERNET' ? (s.pl303Port || c.pl303Baud || 9221) : (s.pl303Baud || s.ttiBaud || c.pl303Baud || 9600)),
        keysightResource: s.keysightIp || c.keysightResource || '',
        keysightBaud: Number(s.keysightPort || c.keysightBaud || 9600)
      });
      saveCfg(next);
    }catch(_e){}
  }
  function log(msg,type='info'){
    const rows=readJson(LOG_KEY,[]); rows.unshift({ts:Date.now(),time:now(),type,msg}); writeJson(LOG_KEY,rows.slice(0,120));
    const box=$('dm67c-log'); if(box) box.innerHTML=rows.slice(0,80).map(r=>`<div class="dm67c-log-row ${esc(r.type)}"><span>${esc(r.time)}</span><b>${esc(r.msg)}</b></div>`).join('');
  }
  function nameText(r){return String((r&&(r.name||r.device||r.label||r.type||r.group||r.driver))||'').toLowerCase();}
  function defFor(name){const n=String(name||'').toLowerCase(); return DEVICE_DEFS.find(d=>d.aliases.some(a=>n.includes(a))) || null;}
  function defForRow(r){return defFor(nameText(r)) || defFor(r&&r.name) || null;}
  function normalizeRows(raw){
    let rows=[];
    if(Array.isArray(raw)) rows=raw;
    else if(raw && Array.isArray(raw.rows)) rows=raw.rows;
    else if(raw && Array.isArray(raw.statuses)) rows=raw.statuses;
    else if(raw && typeof raw==='object') rows=Object.entries(raw).map(([k,v])=>Object.assign({name:k}, (v&&typeof v==='object')?v:{status:v}));
    const byKey={};
    rows.forEach(r=>{const d=defForRow(r); if(d) byKey[d.key]=Object.assign({}, r, {_logical:d.logical, _key:d.key});});
    const c=cfg(); const shared=readJson(STATUS_KEY,{});
    DEVICE_DEFS.forEach(d=>{
      const existing=byKey[d.key] || shared[d.key] || {};
      const port=existing.port||existing.conn||existing.connectionString||existing.resource||c[d.cfgPort]||'';
      const manualSim=!!(c.manualSimulation&&c.manualSimulation[d.key]);
      byKey[d.key]=Object.assign({name:d.logical, label:d.title, port, baud:c[d.cfgBaud]||d.baud}, existing, {_logical:d.logical,_key:d.key,_title:d.title,_icon:d.icon,manualSimulation:manualSim});
    });
    return DEVICE_DEFS.map(d=>byKey[d.key]);
  }
  function live(r){
    if(!r) return false;
    if(r.manualSimulation || r.mock===true || String(r.status||'').toUpperCase().includes('SIM')) return false;
    if(r.live===true || r.connected===true || r.ok===true) return true;
    const s=String(r.status||r.state||'').toUpperCase();
    return ['ONLINE','LIVE','CONNECTED','OK'].includes(s);
  }
  function state(r){
    if(!r) return {label:'OFFLINE',cls:'offline'};
    if(r.manualSimulation) return {label:'SIMULATO MANUALE',cls:'sim'};
    if(live(r)) return {label:'ONLINE',cls:'online'};
    const s=String(r.status||r.state||'').toUpperCase();
    if(s.includes('RECONNECT')) return {label:'RECONNECTING',cls:'reconnecting'};
    if(r.error || s.includes('ERR')) return {label:'OFFLINE',cls:'offline'};
    return {label:'OFFLINE',cls:'offline'};
  }
  function persist(rows){
    const out={}; normalizeRows(rows).forEach(r=>{out[r._key]=Object.assign({}, r, {online:live(r), savedAt:new Date().toISOString()});});
    writeJson(STATUS_KEY,out); return out;
  }
  async function readHardware(){
    let raw=[];
    try{raw=await (window.api?.getHardwareStatuses?.()||[]);}catch(e){log('Lettura stato hardware non riuscita: '+(e?.message||e),'warn');}
    const rows=normalizeRows(raw); persist(rows); return rows;
  }
  function getConfigForKey(key){
    const c=cfg(); const d=DEVICE_DEFS.find(x=>x.key===key); if(!d) return null;
    const conn=c[d.cfgPort]||''; if(!conn) return null;
    return {name:d.logical, conn, baud:Number(c[d.cfgBaud]||d.baud)};
  }
  async function reconnectKey(key){
    const cfgOne=getConfigForKey(key);
    if(!cfgOne){log('Nessuna porta configurata per '+key,'warn'); return false;}
    try{
      log('Connessione '+key+' su '+cfgOne.conn+'...');
      const res=await window.api?.reconnectHardware?.([cfgOne]);
      const rows=Array.isArray(res)?res:(res&&res.statuses)||await readHardware();
      persist(rows);
      log('Connessione '+key+' completata.');
      return true;
    }catch(e){log('Connessione '+key+' fallita: '+(e?.message||e),'error'); return false;}
  }
  async function quickReconnectForRequired(logTo){
    const rows=await readHardware();
    const req=(typeof window.getRequiredInstrumentsForRecipe==='function'?window.getRequiredInstrumentsForRecipe():[])||[];
    const requiredKeys=[...new Set(req.map(n=>{const d=defFor(n); return d&&d.key;}).filter(Boolean))];
    for(const key of requiredKeys){
      const r=rows.find(x=>x._key===key);
      if(!live(r)){
        if(logTo && typeof window.addLog==='function') window.addLog(logTo,'ℹ️ Riconnessione rapida '+key+' da porta salvata...','info');
        await reconnectKey(key);
      }
    }
    return readHardware();
  }
  function statusByName(name){
    const d=defFor(name); const shared=readJson(STATUS_KEY,{}); let rows=[];
    try{rows=normalizeRows(window.latestHardwareStatuses||[]);}catch(_){rows=[];}
    const fromRows=d?rows.find(r=>r._key===d.key):rows.find(r=>String(r.name)===String(name)||String(r.device)===String(name));
    const fromShared=d?shared[d.key]:null;
    return fromRows || fromShared || null;
  }
  function installSharedStatusAPI(){
    window.normalizeHardwareRows67C=normalizeRows;
    window.persistHardwareStatuses67C=persist;
    window.getHardwareStatusByName=function(name){return statusByName(name);};
    window.isHardwareLiveStatus=function(st){return live(st);};
    window.validateRecipeHardwareBeforeStart=async function(){
      const required=new Set(((typeof window.getRequiredInstrumentsForRecipe==='function'?window.getRequiredInstrumentsForRecipe():[])||[]).filter(name=>!(window.isRecipeInstrumentExcluded?window.isRecipeInstrumentExcluded(name):(window.excludedInstruments||[]).includes(name))));
      if(!required.size) return {ok:true, missing:[]};
      window.latestHardwareStatuses=await quickReconnectForRequired(document.getElementById('run-log'));
      const missing=[...required].filter(name=>!(window.isRecipeInstrumentExcluded?window.isRecipeInstrumentExcluded(name):(window.excludedInstruments||[]).includes(name))&&!live(statusByName(name)));
      return {ok:missing.length===0, missing};
    };
    window.runPreTestSampleWizard=(async function(orig){
      return async function(){
        const flag=localStorage.getItem('atmec_sample_test_required')==='1';
        const cb=document.getElementById('sample-test-required-prod')||document.getElementById('sample-test-required-dash');
        if(!flag && !(cb&&cb.checked)) return true;
        return orig?orig():true;
      };
    })(window.runPreTestSampleWizard);
  }
  function setInput(id,val){const el=$(id); if(el) el.value=val||'';}
  async function renderDeviceManager(){
    const host=$('device-manager-page'); if(!host) return;
    await syncCfgFromAppSettings();
    readHardware().then(rows=>{
      const c=cfg();
      const cards=rows.map(r=>{const s=state(r); const d=DEVICE_DEFS.find(x=>x.key===r._key)||{}; const port=r.port||r.conn||r.connectionString||r.resource||c[d.cfgPort]||'—'; return `<div class="dm67c-device ${s.cls}"><div class="dm67c-device-main"><span class="dm67c-icon">${esc(d.icon||'◌')}</span><div><b>${esc(d.title||r.label||r.name)}</b><small>${esc(r.name||d.logical||'')}</small></div></div><span class="dm67c-state ${s.cls}">${esc(s.label)}</span><div class="dm67c-meta"><span>Porta/Risorsa</span><b>${esc(port)}</b></div><div class="dm67c-actions"><button class="btn btn-primary btn-sm" onclick="dm67cConnect('${esc(r._key)}')">Connetti</button><button class="btn btn-ghost btn-sm" onclick="dm67cCheck('${esc(r._key)}')">Controlla adesso</button><label><input type="checkbox" ${r.manualSimulation?'checked':''} onchange="dm67cSetSim('${esc(r._key)}',this.checked)"> Simulato</label></div></div>`;}).join('');
      host.className='dm67c-page';
      host.innerHTML=`<section class="dm67c-head"><div><h2>Device Manager Enterprise</h2><p>Gestione semplice e stabile dei dispositivi. Nessuna simulazione automatica.</p></div><div class="dm67c-head-actions"><button class="btn btn-primary" onclick="dm67cReconnectAll()">Riconnetti tutto</button><button class="btn btn-ghost" onclick="dm67cRefresh()">Aggiorna</button></div></section><section class="dm67c-config"><label>PL303 COM<input id="dm67c-pl303" value="${esc(c.pl303Port||'')}" placeholder="COM5"></label><label>Multimetro<input id="dm67c-meter" value="${esc(c.keysightResource||'')}" placeholder="USB0:: / COM"></label><label>ESP32 COM<input id="dm67c-esp32" value="${esc(c.esp32Port||'')}" placeholder="COM6"></label><button class="btn btn-success" onclick="dm67cSaveConfig()">Salva porte</button></section><section class="dm67c-list">${cards}</section><section class="dm67c-log"><h3>Log dispositivi</h3><div id="dm67c-log"></div></section>`;
      const logs=readJson(LOG_KEY,[]); const box=$('dm67c-log'); if(box) box.innerHTML=logs.slice(0,80).map(r=>`<div class="dm67c-log-row ${esc(r.type)}"><span>${esc(r.time)}</span><b>${esc(r.msg)}</b></div>`).join('');
    });
  }
  window.dm67cSaveConfig=async function(){
    const c=cfg(); c.pl303Port=String($('dm67c-pl303')?.value||'').trim(); c.keysightResource=String($('dm67c-meter')?.value||'').trim(); c.esp32Port=String($('dm67c-esp32')?.value||'').trim(); saveCfg(c);
    try{await window.api?.saveAppSettings?.({pl303Mode:'USB',pl303Com:c.pl303Port,ttiPort:c.pl303Port,pl303Baud:c.pl303Baud||9600,ttiBaud:c.pl303Baud||9600,esp32Port:c.esp32Port,esp32Baud:c.esp32Baud||115200,keysightMode:'USB_VISA',keysightIp:c.keysightResource,keysightPort:c.keysightBaud||9600});}catch(_e){}
    log('Porte salvate.'); renderDeviceManager();
  };
  window.dm67cConnect=async function(key){await reconnectKey(key); renderDeviceManager();};
  window.dm67cCheck=async function(key){const rows=await readHardware(); const r=rows.find(x=>x._key===key); const s=state(r); log('Controllo '+key+': '+s.label, live(r)?'success':'warn'); renderDeviceManager();};
  window.dm67cReconnectAll=async function(){for(const d of DEVICE_DEFS){await reconnectKey(d.key);} renderDeviceManager();};
  window.dm67cRefresh=renderDeviceManager;
  window.dm67cSetSim=function(key,on){const c=cfg(); c.manualSimulation=c.manualSimulation||{}; c.manualSimulation[key]=!!on; saveCfg(c); log((on?'Simulazione manuale ON: ':'Simulazione manuale OFF: ')+key,on?'warn':'info'); renderDeviceManager();};
  window.renderDeviceManagerPage=renderDeviceManager; window.renderDeviceManagerPage326=renderDeviceManager; window.renderDeviceManagerPage413G=renderDeviceManager; window.renderDeviceManagerPage413RA=renderDeviceManager; window.renderDeviceManagerPage413RB=renderDeviceManager; window.renderDeviceManagerPage413RC=renderDeviceManager;
  function init(){AUTO_KEYS.forEach(k=>localStorage.setItem(k,'0')); installSharedStatusAPI(); syncCfgFromAppSettings().finally(()=>setTimeout(()=>readHardware(),700)); console.log('[6.7C SAFE] Device Manager stabile inizializzato');}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
