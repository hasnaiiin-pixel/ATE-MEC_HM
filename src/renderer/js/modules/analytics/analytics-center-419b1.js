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
      lot: $('an419-lot')?.value || '',
      serial: $('an419-serial')?.value || '',
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
    return { lot:f.lot, serial:f.serial, operator:f.operator, recipe:f.recipe, result:'ALL', dateFrom:dateFrom, dateTo:'' };
  }

  function listItem(title, meta, right, cls){
    return '<div class="analytics419-row '+(cls||'')+'"><div><b>'+esc(title)+'</b><small>'+esc(meta||'')+'</small></div><strong>'+esc(right||'')+'</strong></div>';
  }

  function listFromCounts(boxId, rows, emptyText, metaFn, clsFn){
    var box = $(boxId); if(!box) return;
    rows = Array.isArray(rows) ? rows : [];
    box.innerHTML = rows.length ? rows.map(function(r, idx){
      var cls = clsFn ? clsFn(r, idx) : '';
      var meta = metaFn ? metaFn(r, idx) : ('Occorrenze ' + (r.count || 0));
      return listItem((idx + 1) + '. ' + (r.name || r.serial || 'N/D'), meta, r.count != null ? r.count : (r.yieldRate != null ? r.yieldRate + '%' : ''), cls);
    }).join('') : '<div class="hint">'+esc(emptyText || 'Nessun dato disponibile.')+'</div>';
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
    var by = st?.byOperator || {};
    var rows = Object.keys(by).map(function(name){
      var r = by[name] || {};
      return { name:name, total:safeNum(r.total), pass:safeNum(r.pass), fail:safeNum(r.fail), stopped:safeNum(r.stopped), y:pct(safeNum(r.pass), safeNum(r.total)) };
    }).sort(function(a,b){ return b.total-a.total; }).slice(0,8);
    box.innerHTML = rows.length ? rows.map(function(r){
      return listItem(r.name, 'Test '+r.total+' · PASS '+r.pass+' · FAIL '+r.fail+' · STOP '+r.stopped, r.y+'%', r.fail ? 'warn' : 'ok');
    }).join('') : '<div class="hint">Nessun dato collaboratore nel periodo selezionato.</div>';
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

  function renderPassFailQuality419B2(st){
    var passA = st?.passAnalysis || {};
    var failA = st?.failAnalysis || {};
    var passBox = $('an419-pass-analysis');
    if(passBox){
      var rows = [];
      rows.push(listItem('PASS totali', 'Schede conformi nel periodo selezionato', passA.totalPass || st?.pass || 0, 'ok'));
      rows.push(listItem('First Pass Yield seriali', 'Seriali passati al primo collaudo', (st?.fpyRate || 0) + '%', 'ok'));
      rows.push(listItem('Seriali unici', 'Schede distinte nel campione filtrato', st?.uniqueSerials || 0, ''));
      var passedChecks = Array.isArray(passA.topPassedChecks) ? passA.topPassedChecks.slice(0,4) : [];
      passedChecks.forEach(function(r){ rows.push(listItem(r.name, 'Controllo passato ricorrente', r.count, 'ok')); });
      passBox.innerHTML = rows.join('');
    }
    var failBox = $('an419-fail-analysis');
    if(failBox){
      var rowsF = [];
      rowsF.push(listItem('FAIL totali', 'Scarti reali nel periodo selezionato', failA.totalFail || st?.fail || 0, (failA.totalFail || st?.fail) ? 'warn' : 'ok'));
      rowsF.push(listItem('FAIL rate', 'Percentuale FAIL su test totali', (failA.failRate || 0) + '%', (failA.failRate || 0) > 5 ? 'warn' : 'ok'));
      rowsF.push(listItem('Seriali coinvolti', 'Seriali con almeno un FAIL', failA.affectedSerials || 0, (failA.affectedSerials || 0) ? 'warn' : 'ok'));
      rowsF.push(listItem('STOP / ABORT', 'Interruzioni operative non conteggiate come PASS', st?.stopped || 0, st?.stopped ? 'warn' : ''));
      failBox.innerHTML = rowsF.join('');
    }
  }

  function renderQualityTopTables419B2(st){
    listFromCounts('an419-top-components', st?.topComponents || st?.failAnalysis?.topComponents, 'Nessun componente critico. Per maggiore precisione compila il campo componente negli step ricetta.', function(r){
      return 'Occorrenze FAIL/riparazione · ' + (r.name === 'NON CODIFICATO' ? 'campo componente mancante' : 'componente rilevato');
    }, function(r){ return r.name === 'NON CODIFICATO' ? 'warn' : ''; });
    listFromCounts('an419-top-testpoints', st?.topTestPoints || st?.failAnalysis?.topTestPoints, 'Nessun Test Point critico nel periodo.', function(r){
      return 'Step/Test Point con FAIL ricorrente';
    }, function(){ return 'warn'; });
  }

  function renderMeasurements419B2(st){
    var rows = Array.isArray(st?.measurementDistribution) ? st.measurementDistribution : [];
    var box = $('an419-measurements'); if(!box) return;
    box.innerHTML = rows.length ? rows.slice(0,8).map(function(r){
      var meta = 'n=' + (r.count || 0) + ' · media ' + esc(r.avg) + (r.unit ? ' ' + esc(r.unit) : '') + ' · min/max ' + esc(r.min) + '/' + esc(r.max);
      if(r.below || r.above) meta += ' · fuori limite: -' + (r.below || 0) + ' / +' + (r.above || 0);
      return listItem(r.name || 'Misura', meta, (r.failRate || 0) + '% FAIL', r.failRate ? 'warn' : 'ok');
    }).join('') : '<div class="hint">Nessuna misura numerica disponibile. Le misure automatiche/manuali verranno analizzate appena presenti nello storico.</div>';
  }

  function renderSerialTimeline419B2(st){
    var box = $('an419-serial-timeline'); if(!box) return;
    var rows = Array.isArray(st?.serialTimelines) ? st.serialTimelines : [];
    if(!rows.length){ box.innerHTML = '<div class="hint">Nessuna timeline seriale disponibile.</div>'; return; }
    box.innerHTML = rows.slice(0,8).map(function(sn){
      var events = Array.isArray(sn.events) ? sn.events.slice(-5) : [];
      var chips = events.map(function(e){
        var cls = String(e.result||'').toUpperCase()==='PASS' ? 'ok' : (String(e.result||'').toUpperCase()==='REPAIR' ? 'repair' : 'fail');
        return '<div class="analytics419-time-event '+cls+'"><span>'+esc((e.timestamp||'').replace('T',' ').slice(0,16) || 'N/D')+'</span><b>'+esc(e.result || e.type || 'EVENTO')+'</b><small>'+esc(e.recipe || e.note || e.lot || '')+'</small></div>';
      }).join('');
      return '<div class="analytics419-time-card"><div class="analytics419-time-head"><div><b>'+esc(sn.serial)+'</b><small>Test '+esc(sn.totalTests||0)+' · PASS '+esc(sn.pass||0)+' · FAIL '+esc(sn.fail||0)+(sn.retest?' · RETEST':'')+'</small></div><strong class="'+(sn.latestResult==='PASS'?'ok':'fail')+'">'+esc(sn.latestResult||'N/D')+'</strong></div>'+chips+'</div>';
    }).join('');
  }

  function renderFailDetails419B2(st){
    var box = $('an419-fail-details'); if(!box) return;
    var rows = Array.isArray(st?.failAnalysis?.details) ? st.failAnalysis.details : [];
    box.innerHTML = rows.length ? rows.slice(0,12).map(function(r){
      var meta = (r.timestamp || '').replace('T',' ').slice(0,16) + ' · SN ' + (r.serial || 'N/D') + ' · ' + (r.recipe || 'N/D') + ' · TP ' + (r.testPoint || 'N/D');
      var range = r.measured != null ? 'Misura ' + r.measured + (r.unit || '') + ' [' + (r.min ?? '-') + ' / ' + (r.max ?? '-') + ']' : 'FAIL';
      return listItem(r.component || r.step || 'FAIL', meta, range, 'warn');
    }).join('') : '<div class="hint">Nessun dettaglio FAIL nel periodo selezionato.</div>';
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
    var rows = st?.failAnalysis?.topFailures || st?.topFailures || [];
    box.innerHTML = rows.length ? rows.slice(0,8).map(function(r){
      return listItem(r.name, 'Step / test con FAIL ricorrente', r.count, 'warn');
    }).join('') : '<div class="hint">Nessun FAIL nel periodo selezionato.</div>';
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
    set('an419-stopped', st.stopped || 0);
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
    renderPassFailQuality419B2(st);
    renderQualityTopTables419B2(st);
    renderMeasurements419B2(st);
    renderSerialTimeline419B2(st);
    renderFailDetails419B2(st);
    renderTopDefects419B2(st, ent);
    renderCriticalRecipes419B2(st);
    renderHeatmap419B2(st);
  }

  function clearAnalyticsFilters419B2(){
    ['an419-lot','an419-serial','an419-recipe','an419-operator','an419-station'].forEach(function(id){ var el=$(id); if(el) el.value=''; });
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
