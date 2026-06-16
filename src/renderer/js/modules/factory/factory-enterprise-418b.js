/* AT-MEC_HM_4.18B_FACTORY_ENTERPRISE_FIX6 - station identity propagated to DataProvider/report */
(function(){
  'use strict';
  var STORAGE_KEY = 'atmec_factory_config_418b';
  var lastFactoryHistory = [];
  function $(id){ return document.getElementById(id); }
  function esc(v){ try { if (typeof escapeHtml === 'function') return escapeHtml(String(v ?? '')); } catch(_e){} return String(v ?? '').replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]); }); }
  function nowText(){ try { return new Date().toLocaleString('it-IT'); } catch(_e){ return String(new Date()); } }
  function setText(id, value){ var el=$(id); if(el) el.textContent = value; }
  function setHtml(id, value){ var el=$(id); if(el) el.innerHTML = value; }
  function safeJsonParse(v, fallback){ try { return JSON.parse(v); } catch(_e){ return fallback; } }
  function getApi(){ return window.api || null; }
  function defaultConfig(){ return { stationId:'STATION_A', stationName:'ATE Banco 01', line:'Linea Collaudo', plant:'MIRZA LAB', server:'', syncMode:'local', updatedAt:new Date().toISOString() }; }
  function loadConfig(){ return Object.assign(defaultConfig(), safeJsonParse(localStorage.getItem(STORAGE_KEY) || '', null) || {}); }

  function canWriteDataProviderStation418B(){
    try {
      var u = window.atmecCurrentUser412K || (typeof currentUser !== 'undefined' ? currentUser : null) || null;
      if (!u) return false;
      var role = String(u.role || '').toLowerCase();
      var level = Number(u.level || 0);
      if (role.includes('admin') || level >= 90) return true;
      var perms = Array.isArray(u.permissions) ? u.permissions.map(function(p){ return p === 'manage_archive' ? 'manage_data' : p; }) : [];
      return perms.indexOf('manage_data') >= 0 || perms.indexOf('config_hardware') >= 0;
    } catch(_e) { return false; }
  }

  function normalizedStationConfig418B(cfg){
    cfg = cfg || loadConfig();
    var stationId = (cfg.stationId || cfg.id || localStorage.getItem('atmec_station_id_413b') || 'STATION_A').trim();
    var stationName = (cfg.stationName || cfg.name || localStorage.getItem('atmec_station_name_413b') || 'ATE Banco 01').trim();
    var line = (cfg.line || cfg.department || localStorage.getItem('atmec_station_department_413b') || 'Linea Collaudo').trim();
    var plant = (cfg.plant || cfg.site || localStorage.getItem('atmec_station_site_413b') || 'MIRZA LAB').trim();
    return Object.assign({}, cfg, { stationId:stationId, stationName:stationName, line:line, plant:plant });
  }

  async function syncFactoryStationToDataProvider418B(cfg){
    cfg = normalizedStationConfig418B(cfg);
    var api = getApi();
    if (!api || typeof api.saveDataProviderConfig !== 'function') return { ok:false, skipped:true, reason:'API data provider non disponibile' };
    // Evita chiamate backend rumorose prima del login o per utenti senza permessi.
    // La UI/topbar/report locale resta aggiornata tramite localStorage; il DataProvider viene aggiornato solo da utenti autorizzati.
    if (!canWriteDataProviderStation418B()) return { ok:false, skipped:true, permissionSkipped:true, reason:'Aggiornamento backend saltato: utente senza permesso manage_data/config_hardware' };
    try {
      var current = {};
      try { if (typeof api.getDataProviderStatus === 'function') current = await api.getDataProviderStatus(); } catch(_e){}
      var server = current && current.server ? current.server : undefined;
      var sync = current && current.sync ? current.sync : undefined;
      var payload = {
        station: {
          id: cfg.stationId,
          name: cfg.stationName,
          department: cfg.line,
          site: cfg.plant,
          autoSyncEnabled: !!(current && current.station && current.station.autoSyncEnabled),
          autoSyncIntervalSec: Number((current && current.station && current.station.autoSyncIntervalSec) || 60)
        }
      };
      if (server) payload.server = server;
      if (sync) payload.sync = sync;
      var res = await api.saveDataProviderConfig(payload);
      if (res && res.ok === false) {
        var msg = String(res.error || res.message || '');
        if (/Permessi insufficienti/i.test(msg)) return { ok:false, skipped:true, permissionSkipped:true, reason:msg };
        console.warn('[AT-MEC] DataProvider station update rejected:', res.error || res.message || res);
      }
      return res || { ok:true };
    } catch(e){
      console.warn('[AT-MEC] DataProvider station update failed:', e && e.message ? e.message : e);
      return { ok:false, error:e && e.message ? e.message : String(e) };
    }
  }

  function syncFactoryStationToGlobal418B(cfg){
    cfg = normalizedStationConfig418B(cfg);
    var stationId = cfg.stationId;
    var stationName = cfg.stationName;
    var line = cfg.line;
    var plant = cfg.plant;

    try {
      localStorage.setItem('atmec_factory_config_418b', JSON.stringify(cfg, null, 2));
      localStorage.setItem('atmec_station_id_413b', stationId);
      localStorage.setItem('atmec_station_name_413b', stationName);
      localStorage.setItem('atmec_station_department_413b', line);
      localStorage.setItem('atmec_station_site_413b', plant);
      // Chiavi storiche usate da report, topbar e moduli 4.12/4.13: devono restare tutte allineate.
      localStorage.setItem('atmec_factory_station_id', stationId);
      localStorage.setItem('atmec_factory_station_name', stationName);
      localStorage.setItem('atmec_station_id', stationId);
      localStorage.setItem('atmec_station_name', stationName);
      localStorage.setItem('station_id', stationId);
      localStorage.setItem('station_name', stationName);
    } catch(_e){}

    var map = {
      'da412h-station-id': stationId,
      'da412h-station-name': stationName,
      'da412i-station-department': line,
      'da412i-station-site': plant,
      'da412h-station-status': stationId,
      'top-station-id-413b': stationId,
      'top-station-name-413b': stationName
    };
    Object.keys(map).forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      if ('value' in el) el.value = map[id] || '';
      else el.textContent = map[id] || 'N/D';
    });

    // Aggiorna subito UI e report settings locali. La persistenza backend viene fatta asincrona sotto.
    try { if (typeof window.updateTopBar413C === 'function') window.updateTopBar413C(); } catch(_e){}
    try { if (typeof window.updateTopBar413B === 'function') window.updateTopBar413B(); } catch(_e){}
    try { document.dispatchEvent(new CustomEvent('atmec:station-config-updated', { detail: { stationId:stationId, stationName:stationName, line:line, plant:plant } })); } catch(_e){}
    try { syncFactoryStationToDataProvider418B(cfg); } catch(_e){}
  }

  function fillConfigForm(cfg){
    cfg = cfg || loadConfig();
    if ($('factory-station-id-418b')) $('factory-station-id-418b').value = cfg.stationId || '';
    if ($('factory-station-name-418b')) $('factory-station-name-418b').value = cfg.stationName || '';
    if ($('factory-line-418b')) $('factory-line-418b').value = cfg.line || '';
    if ($('factory-plant-418b')) $('factory-plant-418b').value = cfg.plant || '';
    if ($('factory-server-418b')) $('factory-server-418b').value = cfg.server || '';
    if ($('factory-sync-mode-418b')) $('factory-sync-mode-418b').value = cfg.syncMode || 'local';
    setText('factory-config-status-418b', 'Configurazione caricata: ' + (cfg.stationId || '—') + ' · ' + (cfg.stationName || '—'));
  }
  function readConfigForm(){
    return {
      stationId: ($('factory-station-id-418b')?.value || 'STATION_A').trim(),
      stationName: ($('factory-station-name-418b')?.value || 'ATE Banco 01').trim(),
      line: ($('factory-line-418b')?.value || '').trim(),
      plant: ($('factory-plant-418b')?.value || '').trim(),
      server: ($('factory-server-418b')?.value || '').trim(),
      syncMode: ($('factory-sync-mode-418b')?.value || 'local'),
      updatedAt: new Date().toISOString()
    };
  }
  async function saveFactoryStation418B(){
    var cfg = readConfigForm();
    syncFactoryStationToGlobal418B(cfg);
    var backend = await syncFactoryStationToDataProvider418B(cfg);
    var msg = '✅ Configurazione salvata: ' + cfg.stationId + ' · ' + nowText();
    if (backend && backend.ok === false && !backend.permissionSkipped) msg += ' · UI aggiornata, backend non aggiornato: ' + (backend.error || backend.message || 'permessi/API');
    else if (backend && backend.permissionSkipped) msg += ' · UI aggiornata, backend aggiornabile con permesso Database/Hardware';
    else msg += ' · Report e documenti aggiornati';
    setText('factory-config-status-418b', msg);
    try { if (typeof addLog === 'function') addLog(document.getElementById('sys-log'), 'Factory station salvata: ' + esc(cfg.stationId), backend && backend.ok === false ? 'warn' : 'pass'); } catch(_e){}
    loadFactoryEnterprise418B();
  }
  function normalizeArrayResponse(res, keys){
    if (Array.isArray(res)) return res;
    if (!res || typeof res !== 'object') return [];
    for (var i=0;i<keys.length;i++){ if (Array.isArray(res[keys[i]])) return res[keys[i]]; }
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.rows)) return res.rows;
    if (Array.isArray(res.data)) return res.data;
    return [];
  }
  async function getSafeStats(){
    var api = getApi();
    if (!api) return {};
    try { if (api.getEnterpriseDatabaseDashboard) { var ent = await api.getEnterpriseDatabaseDashboard(); if (ent && ent.ok === false) return {}; if (ent && typeof ent === 'object') return ent; } } catch(_e){}
    try { if (api.getLocalDbStats) { var stats = await api.getLocalDbStats({}); if (stats && stats.ok === false) return {}; return stats || {}; } } catch(_e){}
    return {};
  }
  async function getSafeSyncQueue(){
    var api = getApi();
    if (!api || !api.getSyncQueuePreview) return [];
    try { var res = await api.getSyncQueuePreview(50); return normalizeArrayResponse(res, ['queue','items','rows','entries']); } catch(_e){ return []; }
  }
  async function getSafeDevices(){
    var api = getApi(), list = [];
    try { if (api && api.getProfessionalDevices) list = normalizeArrayResponse(await api.getProfessionalDevices(), ['devices','items','rows']); } catch(_e){}
    if (!list.length) {
      try {
        if (api && api.getHardwareStatuses) {
          var hw = await api.getHardwareStatuses();
          if (hw && typeof hw === 'object') list = Object.keys(hw).map(function(k){ return Object.assign({ id:k, name:k }, hw[k] || {}); });
        }
      } catch(_e){}
    }
    return list;
  }
  function computeFactoryNumbers(stats, queue, devices){
    var totalTests = Number(stats.totalTests || stats.tests || stats.testReports || stats.reports || 0);
    var pass = Number(stats.pass || stats.PASS || stats.passed || 0);
    var fail = Number(stats.fail || stats.FAIL || stats.failed || 0);
    var fpy = totalTests > 0 ? Math.round((pass / totalTests) * 100) : null;
    var pending = queue.filter(function(q){ return String(q.status || q.state || '').toUpperCase() !== 'SYNCED'; }).length;
    var onlineDevices = devices.filter(function(d){ var s = String(d.status || d.state || d.health || '').toUpperCase(); return s.includes('ONLINE') || s.includes('LIVE') || d.live === true || d.connected === true; }).length;
    var deviceScore = devices.length ? Math.round((onlineDevices / devices.length) * 100) : 100;
    var syncScore = pending === 0 ? 100 : Math.max(20, 100 - pending * 10);
    var fpyScore = fpy == null ? 85 : fpy;
    var health = Math.round((deviceScore * 0.35) + (syncScore * 0.25) + (fpyScore * 0.40));
    return { totalTests:totalTests, pass:pass, fail:fail, fpy:fpy, pending:pending, onlineDevices:onlineDevices, deviceScore:deviceScore, syncScore:syncScore, health:health };
  }
  function renderStationMonitor(cfg, nums){
    setHtml('factory-station-monitor-418b',
      '<div class="factory418b-station-card"><div class="factory418b-status-dot ok"></div><div><b>' + esc(cfg.stationId) + '</b><div class="hint">' + esc(cfg.stationName) + ' · ' + esc(cfg.line || 'Linea non definita') + '</div></div><span class="pill pass">ONLINE</span></div>' +
      '<div class="factory418b-metric-row"><span>Sito</span><b>' + esc(cfg.plant || '—') + '</b></div>' +
      '<div class="factory418b-metric-row"><span>Modalità sync</span><b>' + esc(cfg.syncMode || 'local') + '</b></div>' +
      '<div class="factory418b-metric-row"><span>Ultimo aggiornamento</span><b>' + esc(nowText()) + '</b></div>' +
      '<div class="factory418b-metric-row"><span>Health postazione</span><b>' + esc(nums.health) + '%</b></div>'
    );
  }
  function renderDeviceMonitor(devices){
    if (!devices.length) { setHtml('factory-device-monitor-418b','<div class="hint">Nessun dispositivo disponibile dalle API hardware. Apri Device Manager per aggiornare lo stato.</div>'); return; }
    var html = '<div class="factory418b-table"><div class="factory418b-row head"><span>Dispositivo</span><span>Stato</span><span>Porta/Driver</span></div>';
    devices.slice(0,12).forEach(function(d){
      var name = d.name || d.device || d.id || d.type || 'Device';
      var status = d.status || d.state || (d.live || d.connected ? 'ONLINE' : 'OFFLINE');
      var cls = String(status).toUpperCase().includes('ONLINE') || d.live || d.connected ? 'pass' : 'warn';
      var port = d.connectionString || d.port || d.com || d.driver || d.transport || '—';
      html += '<div class="factory418b-row"><span>' + esc(name) + '</span><span class="pill ' + cls + '">' + esc(status) + '</span><span>' + esc(port) + '</span></div>';
    });
    html += '</div>'; setHtml('factory-device-monitor-418b', html);
  }
  function renderSyncQueue(queue){
    if (!queue.length) { setHtml('factory-sync-queue-418b','<div class="hint">Coda sync vuota o non disponibile.</div>'); return; }
    var html = '<div class="factory418b-table"><div class="factory418b-row head"><span>Tipo</span><span>Stato</span><span>Data</span></div>';
    queue.slice(0,12).forEach(function(q){
      var type = q.type || q.entity || q.kind || 'SYNC_ITEM';
      var status = q.status || q.state || 'PENDING';
      var cls = String(status).toUpperCase().includes('SYNCED') ? 'pass' : (String(status).toUpperCase().includes('FAIL') ? 'fail' : 'warn');
      var dt = q.createdAt || q.updatedAt || q.timestamp || '';
      html += '<div class="factory418b-row"><span>' + esc(type) + '</span><span class="pill ' + cls + '">' + esc(status) + '</span><span>' + esc(dt) + '</span></div>';
    });
    html += '</div>'; setHtml('factory-sync-queue-418b', html);
  }
  function renderGlobalHistory(stats){
    var rows = [], candidates = ['recentTests','tests','testReports','serialHistory','repairs','recentRepairs'];
    candidates.forEach(function(k){ (Array.isArray(stats[k]) ? stats[k] : []).slice(0,20).forEach(function(x){ rows.push(Object.assign({ __source:k }, x)); }); });
    lastFactoryHistory = rows; renderFilteredHistory(rows);
  }
  function renderFilteredHistory(rows){
    var filter = (($('factory-history-filter-418b') || {}).value || '').toLowerCase().trim();
    var view = rows.filter(function(r){ return !filter || JSON.stringify(r).toLowerCase().includes(filter); }).slice(0,20);
    if (!view.length) { setHtml('factory-global-history-418b','<div class="hint">Nessun evento globale disponibile. I dati appariranno dopo test, sync o repair registrati.</div>'); return; }
    var html = '<div class="factory418b-table"><div class="factory418b-row head"><span>Fonte</span><span>Seriale/Ricetta</span><span>Esito</span></div>';
    view.forEach(function(r){
      var serial = r.serial || r.serialDut || r.sn || r.recipe || r.recipeName || '—';
      var result = r.result || r.status || r.outcome || '—';
      var cls = String(result).toUpperCase().includes('PASS') ? 'pass' : (String(result).toUpperCase().includes('FAIL') ? 'fail' : 'warn');
      html += '<div class="factory418b-row"><span>' + esc(r.__source || 'event') + '</span><span>' + esc(serial) + '</span><span class="pill ' + cls + '">' + esc(result) + '</span></div>';
    });
    html += '</div>'; setHtml('factory-global-history-418b', html);
  }
  function filterFactoryHistory418B(){ renderFilteredHistory(lastFactoryHistory || []); }
  function renderHealth(nums, cfg){
    setText('factory-kpi-stations-418b','1'); setText('factory-kpi-online-418b','1');
    setText('factory-kpi-fpy-418b', nums.fpy == null ? '—' : (nums.fpy + '%'));
    setText('factory-kpi-throughput-418b', String(nums.totalTests || 0));
    setText('factory-kpi-sync-418b', String(nums.pending || 0));
    setText('factory-kpi-health-418b', nums.health + '%');
    var healthClass = nums.health >= 85 ? 'pass' : (nums.health >= 60 ? 'warn' : 'fail');
    setHtml('factory-health-detail-418b',
      '<div class="factory418b-health-card"><div class="factory418b-health-score ' + healthClass + '">' + esc(nums.health) + '%</div><div><b>Factory Health Score</b><div class="hint">Calcolato da dispositivi online, coda sync e FPY locale.</div>' +
      '<div class="factory418b-metric-row"><span>Device score</span><b>' + esc(nums.deviceScore) + '%</b></div>' +
      '<div class="factory418b-metric-row"><span>Sync score</span><b>' + esc(nums.syncScore) + '%</b></div>' +
      '<div class="factory418b-metric-row"><span>Server</span><b>' + esc(cfg.server || 'non configurato') + '</b></div></div></div>'
    );
  }
  async function loadFactoryEnterprise418B(){
    var cfg = loadConfig(); fillConfigForm(cfg); syncFactoryStationToGlobal418B(cfg);
    setHtml('factory-station-monitor-418b','Aggiornamento in corso...');
    setHtml('factory-device-monitor-418b','Aggiornamento in corso...');
    setHtml('factory-sync-queue-418b','Aggiornamento in corso...');
    setHtml('factory-health-detail-418b','Aggiornamento in corso...');
    var stats = await getSafeStats();
    var queue = await getSafeSyncQueue();
    var devices = await getSafeDevices();
    var nums = computeFactoryNumbers(stats || {}, queue || [], devices || []);
    renderStationMonitor(cfg, nums); renderDeviceMonitor(devices || []); renderSyncQueue(queue || []); renderGlobalHistory(stats || {}); renderHealth(nums, cfg);
    try { if (typeof addLog === 'function') addLog(document.getElementById('sys-log'), 'Factory Enterprise aggiornato', 'info'); } catch(_e){}
    return { ok:true, stats:stats, queue:queue, devices:devices, health:nums.health };
  }
  window.loadFactoryEnterprise418B = loadFactoryEnterprise418B;
  window.refreshFactoryEnterprise418B = loadFactoryEnterprise418B;
  window.saveFactoryStation418B = saveFactoryStation418B;
  window.syncFactoryStationToGlobal418B = syncFactoryStationToGlobal418B;
  window.syncFactoryStationToDataProvider418B = syncFactoryStationToDataProvider418B;
  window.saveFactoryStation418A = saveFactoryStation418B;
  window.filterFactoryHistory418B = filterFactoryHistory418B;
  document.addEventListener('DOMContentLoaded', function(){ try { var cfg=loadConfig(); fillConfigForm(cfg); syncFactoryStationToGlobal418B(cfg); } catch(_e){} });
})();
