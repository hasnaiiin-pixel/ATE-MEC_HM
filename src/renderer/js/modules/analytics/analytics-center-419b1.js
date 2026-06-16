(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }
  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>'"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]); });
  }
  function pct(pass,total){ return total ? Math.round((Number(pass||0)/Number(total||0))*1000)/10 : 0; }
  function set(id, val){ var el=$(id); if(el) el.textContent = val; }
  function getApi(){ return window.api || window.electronAPI || null; }

  function filters419(){
    return {
      period: $('an419-period')?.value || 'today',
      recipe: $('an419-recipe')?.value || '',
      operator: $('an419-operator')?.value || '',
      station: $('an419-station')?.value || ''
    };
  }

  function dbFilters419(){
    var f = filters419();
    var now = new Date();
    var dateFrom = '';
    if(f.period === 'today') dateFrom = now.toISOString().slice(0,10);
    if(f.period === '7d') { var d = new Date(now); d.setDate(d.getDate()-6); dateFrom = d.toISOString().slice(0,10); }
    if(f.period === '30d') { var m = new Date(now); m.setDate(m.getDate()-29); dateFrom = m.toISOString().slice(0,10); }
    return { lot:'', serial:'', operator:f.operator, recipe:f.recipe, result:'ALL', dateFrom:dateFrom, dateTo:'' };
  }

  function listItem(title, meta, right, cls){
    return '<div class="analytics419-row '+(cls||'')+'"><div><b>'+esc(title)+'</b><small>'+esc(meta||'')+'</small></div><strong>'+esc(right||'')+'</strong></div>';
  }

  function renderRecipeAnalytics(st){
    var box = $('an419-recipes'); if(!box) return;
    var by = st?.byRecipe || {};
    var rows = Object.keys(by).map(function(name){
      var r = by[name] || {}; var total=Number(r.total||0); var pass=Number(r.pass||0); var fail=Number(r.fail||0);
      return { name:name, total:total, pass:pass, fail:fail, y:pct(pass,total) };
    }).sort(function(a,b){ return b.total-a.total; }).slice(0,8);
    box.innerHTML = rows.length ? rows.map(function(r){
      return listItem(r.name, 'Test '+r.total+' · PASS '+r.pass+' · FAIL '+r.fail, r.y+'%', r.fail ? 'warn' : 'ok');
    }).join('') : '<div class="hint">Nessuna statistica ricetta disponibile.</div>';
  }

  function renderOperatorAnalytics(st){
    var box = $('an419-operators'); if(!box) return;
    var latest = st?.latestReport || null;
    var op = latest?.operator || latest?.username || latest?.collaboratore || 'Admin / Collaboratore';
    var total = Number(st?.total||0); var pass=Number(st?.pass||0); var fail=Number(st?.fail||0);
    var html = '';
    html += listItem(op, 'Periodo selezionato · dati aggregati disponibili', 'FPY '+pct(pass,total)+'%', fail ? 'warn' : 'ok');
    html += listItem('Totale operatori', 'Dettaglio per collaboratore disponibile con tracciabilità avanzata', total ? '1+' : '0', '');
    box.innerHTML = html;
  }

  function renderDevices(ent){
    var box = $('an419-devices'); if(!box) return;
    var c = ent?.counts || {};
    var events = Number(c.device_events || 0);
    var devices = Number(c.devices || 0);
    var html = '';
    html += listItem('Device configurati', 'ESP32, PL303, Multimetro, Scanner', devices || 'N/D', devices ? 'ok' : '');
    html += listItem('Eventi device', 'Log diagnostica / offline / reconnect', events, events ? 'warn' : 'ok');
    html += listItem('Database device', ent?.sqliteActive ? 'SQLite attivo' : 'JSON Enterprise', ent?.schemaVersion || '4.17B', '');
    box.innerHTML = html;
  }

  function renderRepairs(st, ent){
    var box = $('an419-repairs-list'); if(!box) return;
    var repairs = Number(st?.repairCount || ent?.counts?.repairs || 0);
    var html = '';
    html += listItem('Riparazioni totali', 'Interventi registrati', repairs, repairs ? 'warn' : 'ok');
    html += listItem('Cause frequenti', 'Disponibile quando repair center contiene cause codificate', repairs ? 'Da analizzare' : 'N/D', '');
    html += listItem('MTTR', 'Tempo medio riparazione, fase Analytics Enterprise', 'Prossimo step', '');
    box.innerHTML = html;
  }

  function renderFactory(st, ent){
    var box = $('an419-factory'); if(!box) return;
    var cfg = null;
    try { cfg = JSON.parse(localStorage.getItem('atmec_factory_station_config_418B') || localStorage.getItem('atmec_station_config') || 'null'); } catch(_e){}
    var stationId = cfg?.stationId || cfg?.station_id || localStorage.getItem('atmec_station_id') || 'STATION_LOCAL';
    var stationName = cfg?.stationName || cfg?.station_name || localStorage.getItem('atmec_station_name') || 'Postazione locale';
    var total = Number(st?.total || 0); var pass=Number(st?.pass||0);
    box.innerHTML = [
      listItem(stationId, stationName, total ? 'FPY '+pct(pass,total)+'%' : 'Ready', 'ok'),
      listItem('Sync queue', 'Eventi in attesa sincronizzazione', ent?.counts?.sync_queue || 'N/D', ''),
      listItem('Factory mode', 'Multi-postazione predisposta', 'Local-first', '')
    ].join('');
  }

  function renderTrend(st){
    var box = $('an419-trend'); if(!box) return;
    var trend = st?.dailyTrend || [];
    if(!trend.length){ box.innerHTML = '<div class="hint">Nessun trend disponibile. Esegui alcuni test per alimentare lo storico.</div>'; return; }
    var max = Math.max(1, ...trend.map(function(d){ return Number(d.total||0); }));
    box.innerHTML = trend.slice(-10).map(function(d){
      var w = Math.max(4, Math.round((Number(d.total||0)/max)*100));
      return '<div class="analytics419-bar-row"><span>'+esc(d.day)+'</span><div><i style="width:'+w+'%"></i></div><b>'+esc(d.total||0)+'</b></div>';
    }).join('');
  }

  function renderAi(st){
    var box = $('an419-ai'); if(!box) return;
    var total=Number(st?.total||0), fail=Number(st?.fail||0), repair=Number(st?.repairCount||0);
    var msg = 'AI pronta per futura integrazione: quando collegata potrà spiegare cause FAIL, trend qualità e azioni correttive.';
    if(total && fail){ msg = 'Insight preliminare: sono presenti '+fail+' FAIL su '+total+' test. Prossimo step AI: correlare ricetta, step fallito, device e storico riparazioni.'; }
    else if(total){ msg = 'Insight preliminare: produzione registrata con '+total+' test e nessun FAIL nel periodo filtrato.'; }
    if(repair){ msg += ' Riparazioni registrate: '+repair+'.'; }
    box.textContent = msg;
  }


  function fmtPct(v){ return (Math.round(Number(v||0)*10)/10) + '%'; }
  function safeNum(v){ return Number.isFinite(Number(v)) ? Number(v) : 0; }

  function computeEnterprise419B2(st, ent){
    var total = safeNum(st?.total), pass = safeNum(st?.pass), fail = safeNum(st?.fail), repairs = safeNum(st?.repairCount || ent?.counts?.repairs);
    var fpy = pct(pass,total);
    var retest = total ? Math.round(((repairs || Math.max(0, fail - repairs)) / total) * 1000) / 10 : 0;
    var availability = 98;
    try {
      var syncPending = safeNum(ent?.counts?.sync_queue);
      if(syncPending > 10) availability -= 5;
      if(syncPending > 50) availability -= 10;
    } catch(_e){}
    var oee = Math.max(0, Math.min(100, Math.round((availability * (fpy || 0) / 100) * 10) / 10));
    return { total:total, pass:pass, fail:fail, repairs:repairs, fpy:fpy, yield:fpy, retest:retest, oee:oee };
  }

  function renderEnterpriseKpis419B2(st, ent){
    var e = computeEnterprise419B2(st, ent);
    set('an419-oee', fmtPct(e.oee));
    set('an419-yield', fmtPct(e.yield));
    set('an419-retest', fmtPct(e.retest));
    set('an419-mttr', e.repairs ? 'Da repair' : 'N/D');
    set('an419-mtbf', e.fail ? 'Da trend' : 'N/D');
  }

  function renderTopDefects419B2(st, ent){
    var box = $('an419-top-defects'); if(!box) return;
    var fail = safeNum(st?.fail), repair = safeNum(st?.repairCount || ent?.counts?.repairs);
    var rows = [];
    if(fail) rows.push(listItem('FAIL di collaudo', 'Analisi per step/ricetta disponibile con storico dettagliato', fail, 'warn'));
    if(repair) rows.push(listItem('Riparazioni registrate', 'Cause e componenti da codificare nel Repair Center', repair, 'warn'));
    rows.push(listItem('Misure fuori tolleranza', 'Disponibile con runtime measurement logging', fail ? 'Da verificare' : 'Nessuna anomalia', fail ? 'warn' : 'ok'));
    box.innerHTML = rows.join('');
  }

  function renderCriticalRecipes419B2(st){
    var box = $('an419-critical-recipes'); if(!box) return;
    var by = st?.byRecipe || {};
    var rows = Object.keys(by).map(function(name){
      var r=by[name]||{}; var total=safeNum(r.total), pass=safeNum(r.pass), fail=safeNum(r.fail);
      return {name:name,total:total,fail:fail,rate: total ? Math.round((fail/total)*1000)/10 : 0};
    }).sort(function(a,b){ return b.rate-a.rate || b.total-a.total; }).slice(0,5);
    box.innerHTML = rows.length ? rows.map(function(r){ return listItem(r.name, 'Test '+r.total+' · FAIL '+r.fail, r.rate+'%', r.fail ? 'warn' : 'ok'); }).join('') : '<div class="hint">Nessuna ricetta critica nel periodo selezionato.</div>';
  }

  function renderHeatmap419B2(st){
    var box = $('an419-heatmap'); if(!box) return;
    var trend = st?.dailyTrend || [];
    if(!trend.length){ box.innerHTML = '<div class="hint">Nessuna heatmap disponibile. Esegui test in più giorni per popolare il trend.</div>'; return; }
    box.innerHTML = '<div class="analytics419-heatmap-grid">' + trend.slice(-14).map(function(d){
      var fail=safeNum(d.fail), total=safeNum(d.total), rate=total?Math.round((fail/total)*100):0;
      var cls = rate > 20 ? 'hot' : rate > 5 ? 'warm' : 'cool';
      return '<div class="analytics419-heatmap-cell '+cls+'"><b>'+esc(d.day||'—')+'</b><span>'+rate+'% FAIL</span></div>';
    }).join('') + '</div>';
  }

  function loadAnalyticsEnterprise419B2(){
    return loadAnalyticsCenter419B2();
  }

  async function loadAnalyticsCenter419B2(){
    var api = getApi();
    var st = null, ent = null;
    try{
      if(api?.getLocalDbStats) st = await api.getLocalDbStats(dbFilters419());
    }catch(e){ console.warn('[AT-MEC 4.19B2] getLocalDbStats failed', e); }
    try{
      if(api?.getEnterpriseDatabaseDashboard) ent = await api.getEnterpriseDatabaseDashboard();
    }catch(e){ console.warn('[AT-MEC 4.19B2] getEnterpriseDatabaseDashboard failed', e); }
    st = st || { total:0, pass:0, fail:0, yieldRate:0, fpyRate:0, repairCount:0, avgTestTimeSec:0, byRecipe:{}, dailyTrend:[] };
    set('an419-total', st.total || 0);
    set('an419-pass', st.pass || 0);
    set('an419-fail', st.fail || 0);
    set('an419-fpy', (st.fpyRate || st.yieldRate || 0) + '%');
    set('an419-avg', (st.avgTestTimeSec || 0) + 's');
    set('an419-repairs', st.repairCount || ent?.counts?.repairs || 0);
    renderOperatorAnalytics(st);
    renderRecipeAnalytics(st);
    renderDevices(ent);
    renderRepairs(st, ent);
    renderFactory(st, ent);
    renderTrend(st);
    renderAi(st);
    renderEnterpriseKpis419B2(st, ent);
    renderTopDefects419B2(st, ent);
    renderCriticalRecipes419B2(st);
    renderHeatmap419B2(st);
  }

  function clearAnalyticsFilters419B2(){
    ['an419-recipe','an419-operator','an419-station'].forEach(function(id){ var el=$(id); if(el) el.value=''; });
    var p=$('an419-period'); if(p) p.value='today';
    loadAnalyticsCenter419B2();
  }

  window.loadAnalyticsCenter419B2 = loadAnalyticsCenter419B2;
  window.loadAnalyticsCenter419B1 = loadAnalyticsCenter419B2;
  window.loadAnalyticsEnterprise419B2 = loadAnalyticsEnterprise419B2;
  window.clearAnalyticsFilters419B2 = clearAnalyticsFilters419B2;
  window.clearAnalyticsFilters419B1 = clearAnalyticsFilters419B2;

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){ if(document.getElementById('analytics-center-tab')?.classList.contains('active')) loadAnalyticsCenter419B2(); }, 600);
  });
})();
