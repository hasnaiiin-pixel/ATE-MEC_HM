/* AT-MEC_HM_4.16D_CORE_MODULE_SPLIT
 * Traceability, repair, scheda unità e genealogia prodotto.
 * Estratto da app-legacy-core.js preservando ordine di esecuzione.
 */
function startFailFinalizeWatchdog336() {
  if (failFinalizeWatchdog336) clearInterval(failFinalizeWatchdog336);
  failFinalizeWatchdog336 = setInterval(() => {
    try {
      const failed = Object.values(stepStatusMap||{}).some(x=>x==='fail');
      const running = String(currentRunState||'').toUpperCase()==='RUNNING';
      const active = !!activeStepId;
      if (failed && running && !active) forceFinalizeFail336('watchdog anti-blocco percentuale');
    } catch(e) {}
  }, 2000);
}
startFailFinalizeWatchdog336();

if (api) {
  api.on('state-changed', (state) => {
    currentRunState = state;
    setStatePill(state);
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnStop = document.getElementById('btn-stop');
    if (state === 'RUNNING') { if (!testRunStartTs) startProductionTimer(); setProductionTimingState('IN ESECUZIONE'); btnStart.disabled = true; btnPause.disabled = false; btnStop.disabled = false; setUiBusy(false, 'RUNNING'); }
    if (state === 'READY' || state === 'IDLE') { forceRunIdleUi(); setUiBusy(false, 'READY'); }
    if (state === 'FAULT') { btnStart.disabled = false; btnPause.disabled = true; btnStop.disabled = false; setUiBusy(false, 'FAULT'); const box=document.getElementById('current-step-box'); if(box) box.innerHTML='Test in FAULT — scegli continua/ferma o premi STOP.'; }
    addLog(document.getElementById('sys-log'), `Stato → <b>${state}</b>`,
      state === 'FAULT' ? 'fail' : state === 'READY' || state === 'RUNNING' ? 'pass' : 'info');
    updateProductionTestMode();
  });

  api.on('hardware-statuses', (statuses) => { latestHardwareStatuses = Array.isArray(statuses) ? statuses : []; updateHwBadges(statuses); renderProductionHardwareList(); });

  api.on('step-started', (data) => {
    activeStepId = data.step_id;
    stepStatusMap[data.step_id] = 'running';
    renderSteps(); updateProductionTestMode();
    const box = document.getElementById('current-step-box');
    const cls = STEP_TYPE_COLORS[data.type] || 'type-color-D';
    box.innerHTML = `
      <span class="step-type-badge ${cls}">${data.type}</span>
      <span style="font-size:12px;margin-left:6px;">Step #${data.step_id}</span>
      ${data.waitingDebug ? '<div style="color:var(--warn);font-size:11px;margin-top:4px;">⏸ In attesa debug...</div>' : ''}`;
    try { setLiveMeasurePanel319({ ...data, pass:null, timestamp:Date.now(), measured:data.measured ?? data.value ?? null }); } catch {}
    // Log pulito: lo start aggiorna il riquadro corrente, non stampa righe tecniche.
  });

  api.on('step-detail', (data) => {
    if (data.level === 'fail' || data.level === 'warn') addLog(document.getElementById('run-log'), `${data.level === 'fail' ? '❌' : '⚠️'} Step #${data.step_id}: ${escapeHtml(data.message || '')}`, data.level === 'fail' ? 'fail' : 'warn');
  });

  api.on('step-passed', (data) => {
    activeStepId = null; stepStatusMap[data.step_id] = 'pass'; renderSteps(); updateProductionTestMode();
    addLog(document.getElementById('run-log'), `✅ ${escapeHtml(data.details || ('Step '+data.step_id+' OK'))}`, 'pass');
  });

  api.on('step-failed', (data) => {
    activeStepId = null; stepStatusMap[data.step_id] = 'fail'; renderSteps(); updateProductionTestMode();
    addLog(document.getElementById('run-log'), `❌ Step #${data.step_id} FAIL — ${escapeHtml(data.diagnosis?.probable_cause || data.error || '')}`, 'fail');
    try {
      const st = (recipe?.steps || []).find(x => Number(x.step_id) === Number(data?.step_id));
      if (!st || st.stop_on_fail !== false) setTimeout(() => forceFinalizeFail336('step FAIL configurato per fermare'), 120);
      else setTimeout(() => { try { api.failureAction('continue'); } catch(e) {} }, 80);
    } catch(e) {}
    document.getElementById('fault-panel').classList.add('show');
    document.getElementById('fault-cause').textContent = '🔴 ' + (data.diagnosis?.probable_cause || 'Causa sconosciuta');
    document.getElementById('fault-check').textContent = '🔧 ' + (data.diagnosis?.recommended_check || '');
  });



  api.on('manual-step-request', (data) => {
    pendingManualRequestId = data.requestId;
    const fallback = data.fallback_reason || data.manual_fallback;
    document.getElementById('manual-step-title').textContent = `${fallback ? '⚠️ Misura multimetro fallita' : '✋ Step manuale'} — ${data.label || 'Step'} #${data.step_id}`;
    document.getElementById('manual-step-instructions').textContent = fallback
      ? `Il multimetro non ha restituito una misura valida. ${data.fallback_reason || ''}

Vuoi inserire manualmente il valore letto sullo strumento esterno? Il sistema controllerà automaticamente min/max e assegnerà PASS/FAIL.`
      : (data.description || 'Seguire le istruzioni di collaudo, posizionare le sonde e premere conferma quando la misura è pronta.');
    const img = document.getElementById('manual-step-image');
    if (data.instruction_image) { img.src = data.instruction_image; img.style.display = 'block'; } else { img.removeAttribute('src'); img.style.display = 'none'; }
    const limits = `Limiti: ${data.min ?? '-∞'} ÷ ${data.max ?? '+∞'} ${data.unit || ''}`;
    document.getElementById('manual-step-measure-info').textContent = `Misura: ${data.manual_measure_type || 'CONFIRM'}${data.channel !== undefined ? ' su GPIO '+data.channel : ''}. Stabilizzazione: ${data.stable_time_ms || 0} ms. ${limits}.`;
    const limEl = document.getElementById('manual-step-limits'); if (limEl) limEl.textContent = limits + ' — PASS/FAIL automatico.';
    const alertEl = document.getElementById('manual-step-alert'); if (alertEl) alertEl.textContent = fallback ? 'MISURA FALLITA DAL MULTIMETRO: inserisci il valore manuale e premi “Usa misura manuale”.' : 'Posiziona le sonde, poi prova acquisizione. Se lo strumento non risponde puoi inserire misura manuale.';
    const acqBtn = document.getElementById('manual-step-acquire-btn'); if (acqBtn) acqBtn.style.display = fallback ? 'none' : '';
    document.getElementById('manual-step-value').value = '';
    document.getElementById('manual-step-modal').classList.add('show');
  });

  api.on('failure-decision-required', (data) => {
    try {
      const st = (recipe?.steps || []).find(x => Number(x.step_id) === Number(data?.step_id));
      const mustContinue = !!(st && st.stop_on_fail === false);
      if (mustContinue) {
        addLog(document.getElementById('run-log'), `⚠️ Step #${data.step_id} FAIL registrato ma configurato per proseguire.`, 'warn');
        setTimeout(() => { try { api.failureAction('continue'); } catch(e){} }, 50);
        return;
      }
      // 3.34: non lasciare più il test bloccato a metà percentuale in attesa del popup FAIL.
      // Se lo step è configurato per fermare, chiudiamo la run in modo pulito: progresso 100%, esito finale FAIL.
      pendingFailureDecision = false;
      currentRunState = 'FAIL';
      productionForceComplete = true;
      setStatePill('FAIL');
      setProductionTimingState('FAIL');
      try { document.getElementById('fail-decision-modal')?.classList.remove('show'); } catch {}
      try {
        const p=document.getElementById('prod-progress-percent');
        const f=document.getElementById('prod-progress-fill');
        if(p) p.textContent='100%';
        if(f) f.style.width='100%';
        setProductionFinalStatus('fail');
        updateProductionTestMode();
      } catch(e) {}
      addLog(document.getElementById('run-log'), `❌ Step #${data.step_id} FAIL: test chiuso con esito finale FAIL.`, 'fail');
      setTimeout(() => { try { api.failureAction('stop'); } catch(e){} }, 50);
      return;
    } catch(e) {}
    pendingFailureDecision = false;
    setTimeout(() => { try { api.failureAction('stop'); } catch(err){} }, 50);
  });

  api.on('run-completed', (data) => {
    currentRunState = data.success ? 'READY' : 'FAIL'; productionForceComplete = !data.success; setStatePill(data.success ? 'READY' : 'FAIL'); startInProgress = false;
    activeStepId = null; pendingFailureDecision = false; document.getElementById('fail-decision-modal')?.classList.remove('show'); forceRunIdleUi(); renderSteps(); updateProductionTestMode();
    try { const p=document.getElementById('prod-progress-percent'); const f=document.getElementById('prod-progress-fill'); if(p) p.textContent='100%'; if(f) f.style.width='100%'; } catch {}
    const banner = document.getElementById('result-banner');
    banner.textContent = data.success ? '✅ TEST SUPERATO — PASS' : '❌ TEST FALLITO — FAIL';
    banner.className = `result-banner show ${data.success ? 'pass' : 'fail'}`;
    addLog(document.getElementById('sys-log'),
      `Test completato: <b>${data.success ? 'PASS' : 'FAIL'}</b> — ${escapeHtml(data.report?.serial_dut || data.serial_dut || 'N/D')}`,
      data.success ? 'pass' : 'fail');
    try {
      if (typeof window.label420PrintFromTestResult === 'function') {
        const labelResult = window.label420PrintFromTestResult(Object.assign({}, data.report || {}, data, {
          result: data.success ? 'PASS' : 'FAIL',
          serial: data.report?.serial_dut || data.serial_dut || document.getElementById('serial-dut')?.value || '',
          workOrder: data.report?.lot_number || data.lotNumber || document.getElementById('lot-number')?.value || '',
          recipe: recipe?.recipe_name || data.report?.recipe_name || '',
          recipeRevision: recipe?.version || data.report?.recipe_version || ''
        }));
        if (labelResult && labelResult.ok) addLog(document.getElementById('run-log'), `🏷 Etichetta ${labelResult.template || ''} preparata/stampata automaticamente.`, 'info');
        else if (labelResult && labelResult.skipped) addLog(document.getElementById('run-log'), `🏷 Auto-stampa etichetta non eseguita: ${escapeHtml(labelResult.reason || 'disattivata')}.`, 'warn');
      }
    } catch(labelErr) { console.warn('[AT-MEC 4.20A4] Auto label print failed', labelErr); }
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-stop').disabled = true;
    try { loadAudit(); } catch {}
  });

  api.on('kpi-updated', (kpi) => {
    document.getElementById('kpi-total').textContent  = kpi.total;
    document.getElementById('kpi-passed').textContent = kpi.passed;
    document.getElementById('kpi-failed').textContent = kpi.failed;
    const y = kpi.total > 0 ? ((kpi.passed / kpi.total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('kpi-yield').textContent  = y;
    updateProductionTestMode();
  });

  api.on('system-fault', (data) => {
    startInProgress = false;
    currentRunState = 'READY'; setStatePill('READY');
    forceRunIdleUi();
    const btnStop = document.getElementById('btn-stop'); if (btnStop) btnStop.disabled = false;
    document.getElementById('fault-panel').classList.add('show');
    document.getElementById('fault-cause').textContent = '🔴 ' + (data.diagnosis?.probable_cause || data.reason || '');
    document.getElementById('fault-check').textContent = '🔧 ' + (data.diagnosis?.recommended_check || '');
    addLog(document.getElementById('sys-log'), `⚠️ FAULT: ${data.reason || 'Errore'}`, 'fail');
  });

  api.on('keysight-live', (data) => {
    if (data.cmd && data.cmd.includes('VOLT')) {
      document.getElementById('m-volt').textContent = parseFloat(data.value).toFixed(4);
      trendData.push(parseFloat(data.value));
      if (trendData.length > 120) trendData.shift();
      drawTrend();
    }
  });

  api.on('cli-log', (data) => {
    const log = document.getElementById('flash-log');
    log.textContent += data.output;
    log.scrollTop = log.scrollHeight;
  });

  api.on('system-ready', () => {
    addLog(document.getElementById('sys-log'), '🚀 Sistema ATE-MEC pronto', 'pass');
    setTimeout(refreshRecipeList, 50);
    setTimeout(loadAudit, 150);
    setTimeout(loadDatabaseDashboard, 220);
    setTimeout(async () => { await loadEsp32IoCatalog(); renderEsp32ControlGrids(); }, 250);
    setTimeout(scanSerialPorts, 400);
    setTimeout(loadAppSettings, 550);
    setTimeout(syncSerialRequiredUi, 120);
    setTimeout(()=>{ const a=document.getElementById('lot-number'); const b=document.getElementById('prod-lot-number'); if(a) a.value=activeLotNumber; if(b) b.value=activeLotNumber; }, 80);
    setTimeout(refreshRolesUsers, 700);
    api.getKpi().then(k => {
      document.getElementById('kpi-total').textContent  = k.total;
      document.getElementById('kpi-passed').textContent = k.passed;
      document.getElementById('kpi-failed').textContent = k.failed;
      document.getElementById('kpi-yield').textContent  = k.yield;
    }).catch(() => {});
  });

} else {
  addLog(document.getElementById('sys-log'),
    '⚠️ Modalità browser — per il test completo avvia con <b>npm start</b>', 'warn');
  refreshRecipeList();
loadEsp32IoCatalog().then(renderEsp32ControlGrids);
}


async function refreshRecipeVersions() {
  const sel = document.getElementById('recipe-version-list');
  const name = document.getElementById('recipe-list')?.value || recipe.recipe_name || '';
  if (!sel) return;
  if (!api?.listRecipeVersions || !name) { sel.innerHTML = '<option value="">ultima</option>'; return; }
  try {
    const versions = await api.listRecipeVersions(name);
    sel.innerHTML = versions && versions.length
      ? versions.map(v => `<option value="${v.version}">v${v.version} — ${new Date(v.created_at).toLocaleString('it-IT')} — ${escapeHtml(v.author || '')}</option>`).join('')
      : '<option value="">ultima</option>';
  } catch { sel.innerHTML = '<option value="">ultima</option>'; }
}

async function loadSelectedRecipeVersion() {
  try { if (api?.safePl303Off) await api.safePl303Off('CAMBIO_REVISIONE_RICETTA'); } catch {}
  const name = document.getElementById('recipe-list')?.value;
  const version = Number(document.getElementById('recipe-version-list')?.value || 0);
  if (!name || !version || !api?.loadRecipeVersion) return;
  try {
    const res = await api.loadRecipeVersion(name, version);
    if (!res?.ok) throw new Error(res?.error || 'Versione non trovata');
    recipe = res.recipe;
    recipe.steps = Array.isArray(recipe.steps) ? recipe.steps : [];
    renumberRecipeSteps();
    document.getElementById('recipe-name-inp').value = recipe.recipe_name || name;
    document.getElementById('recipe-name-page').value = recipe.recipe_name || name;
    document.getElementById('recipe-enabled').checked = recipe.enabled !== false;
    document.getElementById('recipe-enabled-page').checked = recipe.enabled !== false;
    setPowerSourceValue(recipe.power_metadata || 'PL303_PROGRAMMABLE');
    if (document.getElementById('power-source-page')) document.getElementById('power-source-page').value = recipe.power_metadata || 'PL303_PROGRAMMABLE';
    renderSteps(); renderRecipePage();
    addLog(document.getElementById('sys-log'), `🕘 Caricata ${escapeHtml(name)} v${version}`, 'info');
  } catch(e) { addLog(document.getElementById('sys-log'), `❌ Versione ricetta: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

function dbFiltersFromUi() {
  return {
    lot: document.getElementById('db-lot')?.value || '',
    serial: document.getElementById('db-serial')?.value || '',
    operator: document.getElementById('db-operator')?.value || '',
    recipe: document.getElementById('db-recipe')?.value || '',
    result: document.getElementById('db-result')?.value || 'ALL',
    dateFrom: document.getElementById('db-date-from')?.value || '',
    dateTo: document.getElementById('db-date-to')?.value || ''
  };
}
async function loadDatabaseDashboard() {
  if (!api?.getLocalDbStats) return;
  try {
    const st = await api.getLocalDbStats(dbFiltersFromUi());
    document.getElementById('db-total').textContent = st.total || 0;
    document.getElementById('db-pass').textContent = st.pass || 0;
    document.getElementById('db-fail').textContent = st.fail || 0;
    document.getElementById('db-yield').textContent = (st.yieldRate || 0) + '%';
    document.getElementById('db-repairs').textContent = st.repairCount || 0;
    document.getElementById('db-recipes').textContent = `${st.recipeCount || 0} / ${st.revisionCount || 0} rev`;
    const fpyEl = document.getElementById('db-fpy'); if (fpyEl) fpyEl.textContent = (st.fpyRate || 0) + '%';
    const retestEl = document.getElementById('db-retest-rate'); if (retestEl) retestEl.textContent = (st.retestRate || 0) + '%';
    const avgEl = document.getElementById('db-avg-time'); if (avgEl) avgEl.textContent = (st.avgTestTimeSec || 0) + 's';
    const snEl = document.getElementById('db-unique-serials'); if (snEl) snEl.textContent = st.uniqueSerials || 0;
    document.getElementById('db-path').textContent = 'Database locale: ' + (st.dbPath || 'N/D');
    const by = st.byRecipe || {};
    document.getElementById('db-by-recipe').innerHTML = Object.keys(by).length ? Object.keys(by).sort().map(k => {
      const r = by[k]; const y = r.total ? ((r.pass/r.total)*100).toFixed(1) : '0.0';
      return `<div class="log-item info"><b>${escapeHtml(k)}</b> — Test ${r.total}, PASS ${r.pass}, FAIL ${r.fail}, Yield ${y}%</div>`;
    }).join('') : '<div class="hint">Nessun dato per i filtri selezionati.</div>';
    const trendBox = document.getElementById('db-daily-trend');
    if (trendBox) trendBox.innerHTML = (st.dailyTrend || []).length ? (st.dailyTrend || []).map(d => `<div class="log-item info"><b>${escapeHtml(d.day)}</b> — Test ${d.total}, PASS ${d.pass}, FAIL ${d.fail}, Yield ${d.yieldRate}% <span class="trend-bar" style="width:${Math.max(4, Math.min(160, d.yieldRate*1.6))}px"></span></div>`).join('') : '<div class="hint">Nessun trend disponibile.</div>';
    const failBox = document.getElementById('db-top-failures');
    if (failBox) failBox.innerHTML = (st.topFailures || []).length ? (st.topFailures || []).map(x => `<div class="log-item fail"><b>${escapeHtml(x.name)}</b> — ${x.count} occorrenze</div>`).join('') : '<div class="hint">Nessun FAIL nei filtri selezionati.</div>';
    const industrialBox = document.getElementById('db-industrial-kpi');
    if (industrialBox) {
      const latest = st.latestReport || null;
      industrialBox.innerHTML = `
        <div class="log-item info"><b>FPY:</b> ${escapeHtml(st.fpyRate || 0)}% · <b>Retest:</b> ${escapeHtml(st.retestRate || 0)}% · <b>Seriali unici:</b> ${escapeHtml(st.uniqueSerials || 0)}</div>
        <div class="log-item info"><b>Tempo medio test:</b> ${escapeHtml(st.avgTestTimeSec || 0)}s · <b>Yield filtrato:</b> ${escapeHtml(st.yieldRate || 0)}%</div>
        <div class="log-item info"><b>Ultimo report:</b> ${latest ? `${escapeHtml(new Date(latest.timestamp).toLocaleString('it-IT'))} · ${escapeHtml(latest.serial_dut || '-')} · ${escapeHtml(latest.final_result || '-')}` : 'N/D'}</div>
      `;
    }
  } catch(e) { addLog(document.getElementById('sys-log'), `❌ Database KPI: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}
function clearDatabaseFilters() {
  ['db-lot','db-serial','db-operator','db-recipe','db-date-from','db-date-to'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const res = document.getElementById('db-result'); if (res) res.value = 'ALL';
  loadDatabaseDashboard();
}
async function exportLocalDatabase() {
  if (!api?.exportLocalDatabase) return;
  try { const res = await api.exportLocalDatabase(); if (res?.ok) addLog(document.getElementById('sys-log'), `💾 Database esportato: <b>${escapeHtml(res.filePath)}</b>`, 'pass'); }
  catch(e) { addLog(document.getElementById('sys-log'), `❌ Export DB: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}
async function exportFilteredReportsCsv() {
  if (!api?.exportLocalReportsCsv) { alert('Export CSV non disponibile nel preload.'); return; }
  try {
    const res = await api.exportLocalReportsCsv(dbFiltersFromUi());
    if (res?.ok) addLog(document.getElementById('sys-log'), `📤 CSV filtrato esportato: <b>${escapeHtml(res.filePath)}</b>`, 'pass');
  } catch(e) { addLog(document.getElementById('sys-log'), `❌ Export CSV: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}
async function backupLocalDatabaseNow(label='manuale') {
  if (!api?.backupLocalDatabase) return;
  try {
    const res = await api.backupLocalDatabase(label);
    if (res?.ok) addLog(document.getElementById('sys-log'), `🧰 Backup database creato: <b>${escapeHtml(res.filePath)}</b>`, 'pass');
  } catch(e) { addLog(document.getElementById('sys-log'), `❌ Backup DB: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}
function scheduleAutoDbBackup315() {
  try {
    const key = 'atmec_last_auto_db_backup';
    const today = new Date().toISOString().slice(0,10);
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);
    setTimeout(() => backupLocalDatabaseNow('auto_avvio'), 1800);
  } catch {}
}


function enterpriseDbCountsHtml417B(dash){
  const c = dash?.counts || {};
  const sqlite = dash?.sqliteActive ? '<span class="badge ok">SQLite attivo</span>' : '<span class="badge warn">JSON Enterprise</span>';
  return `
    <div class="log-item info"><b>Backend:</b> ${sqlite} · <b>Schema:</b> ${escapeHtml(dash?.schemaVersion || 'N/D')}</div>
    <div class="log-item info"><b>JSON:</b> ${escapeHtml(dash?.jsonPath || 'N/D')} · ${(Number(dash?.jsonSize||0)/1024).toFixed(1)} KB</div>
    <div class="log-item info"><b>SQLite:</b> ${escapeHtml(dash?.sqlitePath || 'N/D')} · ${(Number(dash?.sqliteSize||0)/1024).toFixed(1)} KB</div>
    ${dash?.sqliteError ? `<div class="log-item warn"><b>SQLite opzionale:</b> ${escapeHtml(dash.sqliteError)}. Installa better-sqlite3 per attivare il file .db nativo; il mirror JSON enterprise resta attivo.</div>` : ''}
    <div class="log-item info"><b>Tabelle:</b> users ${c.users||0}, roles ${c.roles||0}, recipes ${c.recipes||0}, revisions ${c.recipe_versions||0}, tests ${c.test_results||0}, seriali ${c.serial_history||0}, repairs ${c.repairs||0}, device events ${c.device_events||0}</div>
  `;
}
function setEnterpriseDbKpis417B(dash){
  const c = dash?.counts || {};
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('edb-users', c.users || 0);
  set('edb-recipes', `${c.recipes || 0}/${c.recipe_versions || 0}`);
  set('edb-tests', c.test_results || 0);
  set('edb-serials', c.serial_history || 0);
  set('edb-repairs', c.repairs || 0);
  set('edb-devices', (c.devices || 0) + (c.device_events ? `/${c.device_events}` : ''));
}
async function loadEnterpriseDatabaseDashboard(){
  const box=document.getElementById('enterprise-db-result');
  if(!api?.getEnterpriseDatabaseDashboard){ if(box) box.innerHTML='<div class="log-item fail">API Database Enterprise non disponibile.</div>'; return; }
  try{
    const dash=await api.getEnterpriseDatabaseDashboard();
    setEnterpriseDbKpis417B(dash);
    if(box) box.innerHTML=enterpriseDbCountsHtml417B(dash);
  }catch(e){ if(box) box.innerHTML=`<div class="log-item fail">Errore Database Enterprise: ${escapeHtml(normalizeError(e))}</div>`; }
}
async function migrateEnterpriseDatabaseNow(){
  const box=document.getElementById('enterprise-db-result');
  if(!api?.migrateEnterpriseDatabase){ if(box) box.innerHTML='<div class="log-item fail">API migrazione enterprise non disponibile.</div>'; return; }
  try{
    if(box) box.innerHTML='<div class="log-item info">Migrazione 4.17A+B in corso...</div>';
    const res=await api.migrateEnterpriseDatabase();
    const dash=res?.dashboard || res;
    setEnterpriseDbKpis417B(dash);
    if(box) box.innerHTML=`<div class="log-item pass"><b>Migrazione completata</b> — utenti ${escapeHtml(res.users||0)}, ruoli ${escapeHtml(res.roles||0)}, ricette ${escapeHtml(res.recipes||0)}, test ${escapeHtml(res.reports||0)}, riparazioni ${escapeHtml(res.repairs||0)}</div>${enterpriseDbCountsHtml417B(dash)}`;
  }catch(e){ if(box) box.innerHTML=`<div class="log-item fail">Errore migrazione: ${escapeHtml(normalizeError(e))}</div>`; }
}
async function verifyEnterpriseDatabaseNow(){
  const box=document.getElementById('enterprise-db-result');
  try{
    const res=await api.verifyEnterpriseDatabase();
    const dash=res?.dashboard || {};
    setEnterpriseDbKpis417B(dash);
    if(box) box.innerHTML=`<div class="log-item ${res?.ok?'pass':'fail'}"><b>Integrità:</b> ${res?.ok?'OK':'Problemi'} · Tabelle mancanti: ${(res?.missingTables||[]).join(', ') || 'nessuna'}</div>${enterpriseDbCountsHtml417B(dash)}`;
  }catch(e){ if(box) box.innerHTML=`<div class="log-item fail">Errore verifica: ${escapeHtml(normalizeError(e))}</div>`; }
}
async function backupEnterpriseDatabaseNow(){
  const box=document.getElementById('enterprise-db-result');
  try{
    const res=await api.backupEnterpriseDatabase('manuale');
    if(box) box.innerHTML=`<div class="log-item pass"><b>Backup Enterprise creato:</b> ${escapeHtml(res?.filePath||'N/D')}</div>${res?.sqliteFilePath?`<div class="log-item pass"><b>Backup SQLite:</b> ${escapeHtml(res.sqliteFilePath)}</div>`:''}`;
  }catch(e){ if(box) box.innerHTML=`<div class="log-item fail">Errore backup enterprise: ${escapeHtml(normalizeError(e))}</div>`; }
}
async function exportEnterpriseDatabaseNow(){
  const box=document.getElementById('enterprise-db-result');
  try{
    const res=await api.exportEnterpriseDatabase();
    if(box) box.innerHTML=`<div class="log-item ${res?.ok?'pass':'warn'}">${res?.ok?`Export creato: <b>${escapeHtml(res.filePath||'')}</b>`:'Export annullato.'}</div>`;
  }catch(e){ if(box) box.innerHTML=`<div class="log-item fail">Errore export enterprise: ${escapeHtml(normalizeError(e))}</div>`; }
}


async function loadSerialHistoryPanel() {
  const serial = (document.getElementById('serial-history-input')?.value || document.getElementById('db-serial')?.value || '').trim();
  const lot = (document.getElementById('serial-history-lot')?.value || document.getElementById('db-lot')?.value || '').trim();
  const box = document.getElementById('serial-history-result');
  if (!box) return;
  if (!serial) { box.innerHTML = '<div class="hint">Inserisci un seriale.</div>'; return; }
  try {
    const h = await api.getSerialHistory(serial, lot);
    const rows = (h.tests || []).slice(0, 12).map(r => `<tr><td>${escapeHtml(new Date(r.timestamp).toLocaleString('it-IT'))}</td><td class="${String(r.final_result||'').toLowerCase()}">${escapeHtml(r.final_result || '')}</td><td>${escapeHtml(r.recipe_name || '')}</td><td>${escapeHtml(r.lot_number || r.work_order || '')}</td><td>${escapeHtml(r.operator || '')}</td></tr>`).join('');
    const reps = (h.repairs || []).slice(0, 8).map(r => `<tr><td>${escapeHtml(new Date(r.timestamp).toLocaleString('it-IT'))}</td><td>${escapeHtml(r.operator || '')}</td><td>${escapeHtml(r.repair_note || '')}</td></tr>`).join('');
    box.innerHTML = `<b>Seriale ${escapeHtml(serial)}</b> — test trovati: ${h.totalTests || 0}, ultimo esito: <b>${escapeHtml(h.lastResult || 'N/D')}</b>
      <h4>Test</h4><table class="db-mini-table"><thead><tr><th>Data</th><th>Esito</th><th>Ricetta</th><th>Lotto</th><th>Operatore</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Nessun test.</td></tr>'}</tbody></table>
      <h4>Riparazioni</h4><table class="db-mini-table"><thead><tr><th>Data</th><th>Operatore</th><th>Nota</th></tr></thead><tbody>${reps || '<tr><td colspan="3">Nessuna riparazione registrata.</td></tr>'}</tbody></table>`;
  } catch(e) { box.innerHTML = `<div class="fail">Errore storico seriale: ${escapeHtml(normalizeError(e))}</div>`; }
}
async function saveSerialRepairNote() {
  const serial = (document.getElementById('serial-history-input')?.value || document.getElementById('db-serial')?.value || '').trim();
  const lot = (document.getElementById('serial-history-lot')?.value || document.getElementById('db-lot')?.value || '').trim();
  const note = (document.getElementById('serial-repair-note')?.value || '').trim();
  if (!serial || !note) { alert('Seriale e nota riparazione sono obbligatori.'); return; }
  try {
    const res = await api.addRepairRecord({ serial_dut: serial, lot_number: lot, work_order: lot, repair_note: note });
    addLog(document.getElementById('sys-log'), `🛠 Riparazione salvata per ${escapeHtml(serial)}`, 'pass');
    await loadSerialHistoryPanel();
    await loadDatabaseDashboard();
  } catch(e) { addLog(document.getElementById('sys-log'), `❌ Salvataggio riparazione: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

scheduleAutoDbBackup315();

doLogin();

setTimeout(() => { try { bootstrapDashboard217(); } catch(e) { console.warn('bootstrapDashboard217', e); } }, 800);

try { toggleRecipeSimpleMode(localStorage.getItem('atmec_recipe_simple_mode') !== '0'); } catch {}


// AT-MEC_HM_3.33_TEST_LIGHT - funzioni UX e misura manuale fallback
function toggleLeftRail(){
  const b=document.body;
  if(b.classList.contains('left-rail-open')){b.classList.remove('left-rail-open');b.classList.add('left-rail-collapsed');return;}
  b.classList.remove('left-rail-collapsed');b.classList.add('left-rail-open');
}
function toggleRightRail(){
  const b=document.body;
  if(b.classList.contains('right-rail-open')){b.classList.remove('right-rail-open');b.classList.add('right-rail-collapsed');return;}
  b.classList.remove('right-rail-collapsed');b.classList.add('right-rail-open');
}
function toggleRightStepDetails(){
  document.body.classList.toggle('right-step-compact');
  localStorage.setItem('atmec_right_step_compact', document.body.classList.contains('right-step-compact')?'1':'0');
}
try{ if(localStorage.getItem('atmec_right_step_compact')==='1') document.body.classList.add('right-step-compact'); }catch{}

function syncRecipeClient(value){
  recipe.client_name = value || '';
  recipe.customer = value || '';
  try{ localStorage.setItem('atmec_last_recipe_client', value || ''); }catch{}
}
const __atmec_renderRecipePage_317 = renderRecipePage;
renderRecipePage = function(){
  __atmec_renderRecipePage_317();
  const el=document.getElementById('recipe-client-page');
  if(el) el.value = recipe.client_name || recipe.customer || localStorage.getItem('atmec_last_recipe_client') || '';
  const logoEl=document.getElementById('recipe-customer-logo-page');
  if(logoEl) logoEl.value = recipe.customer_logo || recipe.client_logo || localStorage.getItem('atmec_last_recipe_customer_logo') || '';
};
function recipeMatchesClientFilter(recipeObj, filter){
  if(!filter) return true;
  const f=String(filter).toLowerCase().trim();
  if(!f) return true;
  const c=String(recipeObj?.client_name || recipeObj?.customer || '').toLowerCase();
  const n=String(recipeObj?.recipe_name || '').toLowerCase();
  return c.includes(f) || n.includes(f);
}

async function respondManualValueOnly(){
  const requestId = pendingManualRequestId;
  if (!requestId) return;
  const manualValue = document.getElementById('manual-step-value')?.value || '';
  if (!String(manualValue).trim()) { alert('Inserisci la misura manuale prima di continuare.'); return; }
  pendingManualRequestId = null;
  document.getElementById('manual-step-modal').classList.remove('show');
  await api.manualStepResponse(requestId, { ok: true, manual_value: manualValue, manual_input_forced: true });
}

// Sincronizza KPI nella sezione compatta a destra della dashboard esecuzione.
function syncMiniKpi317(){
  [['kpi-total','kpi-total-mini'],['kpi-passed','kpi-passed-mini'],['kpi-failed','kpi-failed-mini'],['kpi-yield','kpi-yield-mini']].forEach(([a,b])=>{
    const src=document.getElementById(a), dst=document.getElementById(b); if(src&&dst) dst.textContent=src.textContent;
  });
}
setInterval(syncMiniKpi317, 1000);

// Default loghi 3.17: MEC = azienda, MIRZA = sviluppatore.
function forceLogoBaseline317(){
  try{
    const paths={
      mec:['assets/default_logos/MEC.PNG','../../assets/default_logos/MEC.PNG','../../assets/MEC.PNG','assets/MEC.PNG'],
      gif:['assets/default_logos/MIRZA_Animation.gif','../../assets/default_logos/MIRZA_Animation.gif','../../assets/MIRZA_Animation.gif','assets/MIRZA_Animation.gif'],
      mirza:['assets/default_logos/MIRZA_LOGO.png','../../assets/default_logos/MIRZA_LOGO.png','../../assets/MIRZA_LOGO.png','assets/MIRZA_LOGO.png']
    };
    function setImgSafe(img, list){
      if(!img || !list || !list.length) return;
      let i=0;
      function tryNext(){
        if(i>=list.length){ img.style.visibility='hidden'; return; }
        const p=list[i++];
        const test=new Image();
        test.onload=()=>{ img.src=p; img.style.visibility='visible'; };
        test.onerror=tryNext;
        test.src=p;
      }
      tryNext();
    }
    document.querySelectorAll('[data-logo="company"], .company-logo, #company-logo, img[alt*="MEC" i]').forEach(img=>setImgSafe(img,paths.mec));
    document.querySelectorAll('[data-logo="developer-gif"], .developer-gif, #developer-gif').forEach(img=>setImgSafe(img,paths.gif));
    document.querySelectorAll('[data-logo="developer"], .developer-logo, #developer-logo, img[alt*="MIRZA" i]').forEach(img=>setImgSafe(img,paths.mirza));
  }catch(e){ console.warn('forceLogoBaseline317', e); }
}
setTimeout(forceLogoBaseline317, 300);
setTimeout(forceLogoBaseline317, 1500);

// Migliora messaggio manual-step quando chiamato come fallback da multimetro fallito.
const __manualStepHandler317 = true;


// AT-MEC_HM_3.33_TEST_LIGHT - pannelli laterali realmente a comparsa di default.
function collapseRails318(){
  document.body.classList.remove('left-rail-open','right-rail-open');
  document.body.classList.add('left-rail-collapsed','right-rail-collapsed');
}
try { collapseRails318(); } catch(e) {}
setTimeout(()=>{ try { collapseRails318(); } catch(e){} }, 150);
const __showTab318 = typeof showTab === 'function' ? showTab : null;
if (__showTab318) {
  showTab = function(...args){
    const out = __showTab318.apply(this,args);
    try { document.body.classList.remove('left-rail-open','right-rail-open'); document.body.classList.add('left-rail-collapsed','right-rail-collapsed'); } catch(e) {}
    return out;
  };
}



/* AT-MEC_HM_3.33_TEST_LIGHT - funzioni integrate */
function toggleRecipeDetailsPanel(){
  document.body.classList.toggle('recipe-details-visible');
  try{localStorage.setItem('atmec_recipe_details_visible', document.body.classList.contains('recipe-details-visible')?'1':'0');}catch{}
}
try{ if(localStorage.getItem('atmec_recipe_details_visible')==='1') document.body.classList.add('recipe-details-visible'); }catch{}
function syncRecipeProduct(value){
  recipe.product_name = value || '';
  recipe.product = value || '';
  try{ localStorage.setItem('atmec_last_recipe_product', value || ''); }catch{}
}
function syncRecipeCustomerLogo(value){
  recipe.customer_logo = value || '';
  recipe.client_logo = value || '';
  try{ localStorage.setItem('atmec_last_recipe_customer_logo', value || ''); }catch{}
}
function getRecipeCustomerProductSummary(r){
  const c = r?.client_name || r?.customer || '';
  const p = r?.product_name || r?.product || '';
  return `${c ? 'Cliente: '+c : 'Cliente: n/d'}${p ? ' · Prodotto: '+p : ''}`;
}
const __saveRecipe319 = saveRecipe;
saveRecipe = async function(){
  const c=document.getElementById('recipe-client-page')?.value?.trim() || recipe.client_name || recipe.customer || '';
  const pr=document.getElementById('recipe-product-page')?.value?.trim() || recipe.product_name || recipe.product || '';
  if(!c){ alert('Cliente obbligatorio: ogni ricetta deve essere collegata a un cliente.'); return; }
  recipe.client_name=c; recipe.customer=c; recipe.product_name=pr; recipe.product=pr;
  return __saveRecipe319.apply(this, arguments);
};
const __syncLoadedRecipeToUi319 = typeof syncLoadedRecipeToUi==='function' ? syncLoadedRecipeToUi : null;
if(__syncLoadedRecipeToUi319){
  syncLoadedRecipeToUi = function(name){
    __syncLoadedRecipeToUi319(name);
    const c=document.getElementById('recipe-client-page'); if(c) c.value = recipe.client_name || recipe.customer || '';
    const p=document.getElementById('recipe-product-page'); if(p) p.value = recipe.product_name || recipe.product || '';
    const lg=document.getElementById('recipe-customer-logo-page'); if(lg) lg.value = recipe.customer_logo || recipe.client_logo || '';
    const pf=document.getElementById('prod-client-filter'); if(pf && !pf.value && (recipe.client_name||recipe.customer)) pf.value = recipe.client_name || recipe.customer || '';
  };
}
const __renderRecipePage319 = typeof renderRecipePage==='function' ? renderRecipePage : null;
if(__renderRecipePage319){
  renderRecipePage = function(){
    __renderRecipePage319();
    const c=document.getElementById('recipe-client-page'); if(c) c.value = recipe.client_name || recipe.customer || localStorage.getItem('atmec_last_recipe_client') || '';
    const p=document.getElementById('recipe-product-page'); if(p) p.value = recipe.product_name || recipe.product || localStorage.getItem('atmec_last_recipe_product') || '';
    const lg=document.getElementById('recipe-customer-logo-page'); if(lg) lg.value = recipe.customer_logo || recipe.client_logo || localStorage.getItem('atmec_last_recipe_customer_logo') || '';
    document.querySelectorAll('#recipe-steps-page-list .recipe-flow-card').forEach((card, idx)=>{
      if(card.querySelector('.recipe-compact-step-details')) return;
      const st=recipe.steps[idx]||{};
      const details=document.createElement('div');
      details.className='recipe-compact-step-details';
      details.innerHTML=`<b>Dettagli step</b><div class="hint">${getRecipeCustomerProductSummary(recipe)} · Device: ${escapeHtml(st.device_mapping||st.device||'system')} · Timeout: ${escapeHtml(st.timeout||0)} ms · Variabile: ${escapeHtml(st.save_as_variable||'-')}</div>`;
      const target=card.children[1]; if(target) target.appendChild(details);
    });
  };
}
const __recipeMatchesClientFilter319 = typeof recipeMatchesClientFilter==='function' ? recipeMatchesClientFilter : null;
recipeMatchesClientFilter = function(recipeObj, filter){
  if(!filter) return true;
  const f=String(filter).toLowerCase().trim(); if(!f) return true;
  const vals=[recipeObj?.client_name, recipeObj?.customer, recipeObj?.product_name, recipeObj?.product, recipeObj?.recipe_name].map(x=>String(x||'').toLowerCase());
  return vals.some(v=>v.includes(f));
};
function setLiveMeasurePanel319(data){
  const set=(id,v)=>{const el=document.getElementById(id); if(el) el.textContent = (v===undefined||v===null||v==='') ? '--' : String(v);};
  if(!data){ set('prod-live-measure-value','--'); set('prod-live-expected','--'); set('prod-live-tolerance','--'); set('prod-live-device','--'); set('prod-live-unit','--'); set('prod-live-ts','--'); set('prod-live-result','--'); return; }
  const val = data.value ?? data.measured ?? data.measurement ?? data.current ?? data.voltage ?? data.resultValue;
  const min = data.min ?? data.expected_min;
  const max = data.max ?? data.expected_max;
  const exp = data.expected ?? data.nominal ?? (min!==undefined || max!==undefined ? `${min ?? '-∞'} ÷ ${max ?? '+∞'}` : '--');
  const unit = data.unit || '';
  let passfail = data.pass === true ? 'PASS' : data.pass === false ? 'FAIL' : (data.result || data.status || '--');
  set('prod-live-measure-value', val!==undefined ? `${Number(val).toString()==='NaN'?val:Number(val).toFixed ? Number(val).toFixed(3).replace(/\.000$/,'') : val} ${unit}` : '--');
  set('prod-live-expected', exp);
  set('prod-live-tolerance', data.tolerance ?? (min!==undefined || max!==undefined ? `${min ?? '-∞'} / ${max ?? '+∞'}` : '--'));
  set('prod-live-device', data.device || data.device_mapping || '--');
  set('prod-live-unit', unit || '--');
  set('prod-live-ts', new Date(data.timestamp || Date.now()).toLocaleTimeString('it-IT'));
  set('prod-live-result', passfail);
}
function inferStepLiveFromRecipe319(step){
  if(!step) return null;
  const isMeasure = String(step.type||'').match(/Measurement|Current|Voltage|Resistance|Frequency|Manual|PowerSupplyMeasure/i);
  if(!isMeasure) return null;
  return { value:'in lettura', min:step.min, max:step.max, unit:step.unit, device:step.device_mapping||step.device, timestamp:Date.now(), status:'RUNNING' };
}
if(api?.on){
  api.on('step-started', data=>{
    const st=(recipe.steps||[]).find(x=>Number(x.step_id)===Number(data.step_id));
    setLiveMeasurePanel319(inferStepLiveFromRecipe319(st) || {value:'--', device:data.device_mapping||data.device||'system', status:'RUNNING', timestamp:Date.now()});
  });
  api.on('step-detail', data=>{
    const text=String(data.message||'');
    const m=text.match(/(-?\d+(?:[\.,]\d+)?)/);
    if(m || data.value!==undefined || data.measured!==undefined) setLiveMeasurePanel319({...data, value:data.value??data.measured??m?.[1]?.replace(',','.'), timestamp:Date.now()});
  });
  api.on('step-passed', data=>setLiveMeasurePanel319({...data, pass:true, timestamp:Date.now()}));
  api.on('step-failed', data=>setLiveMeasurePanel319({...data, pass:false, timestamp:Date.now()}));
}
function updateCommModeUi(){
  const t=document.getElementById('comm-type')?.value || 'serial';
  const sb=document.getElementById('comm-serial-box'); const tb=document.getElementById('comm-tcp-box');
  if(sb) sb.style.display = t==='serial' ? '' : 'none';
  if(tb) tb.style.display = t==='serial' ? 'none' : '';
  const port=document.getElementById('comm-tcp-port'); if(port) port.value = t==='telnet' ? '23' : (port.value || '5025');
}
async function initCommunicationHub(){ updateCommModeUi(); await scanCommPorts(); await refreshCommLog(); }
async function scanCommPorts(){
  const sel=document.getElementById('comm-port'); if(!sel) return;
  try{ const ports = api?.scanSerialPorts ? await api.scanSerialPorts() : []; sel.innerHTML = '<option value="">seleziona porta</option>' + (ports||[]).map(p=>`<option value="${escapeHtml(p.path||p.comName||p)}">${escapeHtml(p.path||p.comName||p)} ${escapeHtml(p.manufacturer||'')}</option>`).join(''); }
  catch(e){ sel.innerHTML='<option value="">errore scan</option>'; }
}
function appendCommLogRow(row){
  const box=document.getElementById('comm-log'); if(!box) return;
  const cls=row.dir==='RX'?'comm-row-rx':row.dir==='TX'?'comm-row-tx':'comm-row-sys';
  const ts=new Date(row.ts||Date.now()).toLocaleTimeString('it-IT');
  box.insertAdjacentHTML('beforeend', `<div class="${cls}">[${ts}] ${escapeHtml(row.dir||'SYS')}: ${escapeHtml(row.data||'')}</div>`);
  box.scrollTop=box.scrollHeight;
  if(row.dir==='RX') window.__lastCommRx = row.data || '';
}
async function refreshCommLog(){
  const box=document.getElementById('comm-log'); if(box) box.innerHTML='';
  try{ const res=api?.commReadLog ? await api.commReadLog() : null; (res?.rows||[]).forEach(appendCommLogRow); }catch{}
}
async function openCommunication(){
  const t=document.getElementById('comm-type')?.value || 'serial';
  const st=document.getElementById('comm-status');
  try{
    let res;
    if(t==='serial') res=await api.commOpenSerial({port:document.getElementById('comm-port')?.value, baud:Number(document.getElementById('comm-baud')?.value||115200)});
    else res=await api.commOpenTcp({mode:t, host:document.getElementById('comm-host')?.value, port:Number(document.getElementById('comm-tcp-port')?.value||23)});
    if(st) st.textContent = res?.ok ? `✅ Connesso ${t}` : `❌ ${res?.error||'connessione fallita'}`;
  }catch(e){ if(st) st.textContent='❌ '+normalizeError(e); }
}
async function closeCommunication(){ try{ await api.commClose(); }catch{} const st=document.getElementById('comm-status'); if(st) st.textContent='Disconnesso.'; }
async function sendCommunication(){
  const data=document.getElementById('comm-tx')?.value || '';
  try{ const res=await api.commSend({data, appendNewline:document.getElementById('comm-newline')?.checked!==false}); if(!res?.ok) alert(res?.error||'Invio fallito'); }
  catch(e){ alert(normalizeError(e)); }
}
function testCommParserLast(){
  const rx=String(window.__lastCommRx||'');
  const key=String(document.getElementById('comm-parser-key')?.value||'').trim();
  const min=Number(document.getElementById('comm-parser-min')?.value||0);
  const max=Number(document.getElementById('comm-parser-max')?.value||0);
  const varName=String(document.getElementById('comm-parser-var')?.value||key||'VAR').trim();
  const out=document.getElementById('comm-parser-result');
  const re=new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*[:=]\\s*(-?\\d+(?:[\\.,]\\d+)?)','i');
  const m=rx.match(re);
  if(!m){ if(out) out.innerHTML=`<b class="comm-fail">Parser FAIL</b><div class="hint">Variabile ${escapeHtml(key)} non trovata nell'ultimo RX.</div>`; return; }
  const val=Number(m[1].replace(',','.')); const ok=val>=min && val<=max;
  window.__recipeVariables = window.__recipeVariables || {}; window.__recipeVariables[varName]=val;
  if(out) out.innerHTML=`<b class="${ok?'comm-pass':'comm-fail'}">${ok?'✅ PASS':'❌ FAIL'}</b><div>RX: <code>${escapeHtml(rx)}</code></div><div>${escapeHtml(key)} = <b>${val}</b> · Limiti ${min} ÷ ${max}</div><div>Variabile salvata: <b>${'${'+escapeHtml(varName)+'}'}</b></div>`;
}
if(api?.on){ api.on('comm-rx', row=>appendCommLogRow(row)); }
// Aggiunge campo prodotto dove mancante quando la pagina viene ridisegnata.
setTimeout(()=>{ try{ renderRecipePage(); }catch{} },250);




/* AT-MEC_HM_3.31 - login con INVIO e focus */
(function(){
  function bindLoginEnter331(){
    const user=document.getElementById('op-name');
    const pass=document.getElementById('op-password');
    if(user && !user.dataset.enter331){
      user.dataset.enter331='1';
      user.addEventListener('keydown', ev=>{ if(ev.key==='Enter'){ ev.preventDefault(); pass?.focus(); }});
      setTimeout(()=>{ try{ user.focus(); user.select?.(); }catch{} },120);
    }
    if(pass && !pass.dataset.enter331){
      pass.dataset.enter331='1';
      pass.addEventListener('keydown', ev=>{ if(ev.key==='Enter'){ ev.preventDefault(); if(typeof doLogin==='function') doLogin(); }});
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindLoginEnter331); else bindLoginEnter331();
})();

/* AT-MEC_HM_3.30 - patch operative richieste su 3.30 funzionante */
(function(){
  function safe(fn){ try{ fn(); }catch(e){ console.warn('[3.30 patch]', e); } }
  function moveTimingToRight(){ safe(()=>{
    const timing=document.querySelector('.prod-timing-strip');
    const rightPanel=document.querySelector('.prod-test-body > .prod-panel:nth-child(2)');
    const kpis=document.querySelector('.prod-kpis');
    if(!timing||!rightPanel||timing.classList.contains('prod-right-timing-326')) return;
    timing.classList.add('prod-right-timing-326');
    rightPanel.insertBefore(timing, kpis ? kpis.nextSibling : rightPanel.firstChild);
  }); }
  function ensureRecipeFailOptions(){ return; safe(()=>{
    document.querySelectorAll('#recipe-steps-page-list .recipe-flow-card').forEach((card, idx)=>{
      if(card.querySelector('.recipe-stopfail-326')) return;
      const st=(window.recipe?.steps||[])[idx]; if(!st) return;
      if(st.stop_on_fail === undefined) st.stop_on_fail = true;
      const row=document.createElement('div'); row.className='recipe-stopfail-326';
      row.innerHTML='<span>Se questo step va in FAIL: ferma test e dichiara ricetta fallita</span><input type="checkbox" '+(st.stop_on_fail!==false?'checked':'')+'>';
      row.querySelector('input').addEventListener('change', ev=>{ st.stop_on_fail=!!ev.target.checked; });
      card.appendChild(row);
    });
  }); }
  function ensureRecipePreview(){ safe(()=>{
    const host=document.querySelector('.recipe-step-workspace'); if(!host) return;
    let box=document.getElementById('recipe-preview-326');
    if(!box){ box=document.createElement('div'); box.id='recipe-preview-326'; box.className='recipe-preview-326'; host.insertBefore(box, host.children[1]||null); }
    const steps=(window.recipe?.steps||[]);
    const chips=steps.length ? steps.map((st,i)=>'<span class="recipe-preview-326-chip">'+(i+1)+'. '+escapeHtml(st.label||st.name||st.type||'Step')+'</span>').join('<span>→</span>') : '<span class="hint">Aggiungi step dal wizard/template: qui vedrai la preview della ricetta finale.</span>';
    box.innerHTML='<div class="recipe-preview-326-title">Preview grafica ricetta finale</div><div class="recipe-preview-326-flow">'+chips+'</div>';
  }); }
  function refresh326(){ moveTimingToRight(); ensureRecipeFailOptions(); ensureRecipePreview(); }
  const oldRender = window.renderRecipePage;
  if(typeof oldRender==='function'){
    window.renderRecipePage=function(){ const r=oldRender.apply(this, arguments); setTimeout(refresh326,30); return r; };
  }
  window.renderDeviceManagerPage326=function(){
    const box=document.getElementById('device-manager-page'); if(!box) return;
    if(typeof renderDeviceManagerMini==='function'){
      const old=document.getElementById('device-manager-mini');
      if(old && old.id!=='device-manager-page') old.innerHTML='';
      box.id='device-manager-mini'; renderDeviceManagerMini(); box.id='device-manager-page';
    } else {
      box.innerHTML='<div class="hint">Device Manager non disponibile in questa build.</div>';
    }
  };
  function commStepBase326(type){
    window.recipe = window.recipe || {steps:[]}; window.recipe.steps = window.recipe.steps || [];
    const n=window.recipe.steps.length+1;
    return { step_id:n, label:type, type:'CommunicationHub', comm_action:type, device_mapping:'Communication Hub', timeout:3000, stop_on_fail:true };
  }
  window.addCommReadStepToRecipe326=function(){ const st=commStepBase326('READ_RX'); st.label='Communication Hub - Lettura RX'; st.expected_pattern=document.getElementById('comm-parser-key')?.value||''; recipe.steps.push(st); if(typeof renumberRecipeSteps==='function') renumberRecipeSteps(); if(typeof renderSteps==='function') renderSteps(); if(typeof renderRecipePage==='function') renderRecipePage(); };
  window.addCommWriteStepToRecipe326=function(){ const st=commStepBase326('WRITE_TX'); st.label='Communication Hub - Scrittura TX'; st.command=document.getElementById('comm-tx')?.value||''; recipe.steps.push(st); if(typeof renumberRecipeSteps==='function') renumberRecipeSteps(); if(typeof renderSteps==='function') renderSteps(); if(typeof renderRecipePage==='function') renderRecipePage(); };
  window.addCommVerifyStepToRecipe326=function(){ const st=commStepBase326('VERIFY_RX'); st.label='Communication Hub - Verifica PASS/FAIL'; st.parser_key=document.getElementById('comm-parser-key')?.value||'VOLT'; st.min=Number(document.getElementById('comm-parser-min')?.value||0); st.max=Number(document.getElementById('comm-parser-max')?.value||0); st.save_as_variable=document.getElementById('comm-parser-var')?.value||st.parser_key; recipe.steps.push(st); if(typeof renumberRecipeSteps==='function') renumberRecipeSteps(); if(typeof renderSteps==='function') renderSteps(); if(typeof renderRecipePage==='function') renderRecipePage(); };
  window.exportCommLog326=function(){ const rows=[...document.querySelectorAll('#comm-log > div')].map(x=>x.textContent); const blob=new Blob([rows.join('\n')],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='communication_hub_log.txt'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); };
  window.importCommLog326=function(){ const input=document.createElement('input'); input.type='file'; input.accept='.txt,.log,.csv'; input.onchange=()=>{ const f=input.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ const box=document.getElementById('comm-log'); if(box) box.textContent=String(r.result||''); }; r.readAsText(f); }; input.click(); };
  window.registerSerialFromCommRx326=function(){ const rx=String(window.__lastCommRx||''); const m=rx.match(/(?:SN|SERIAL|SERIALE)\s*[:=]\s*([A-Z0-9_\-\.]+)/i) || rx.match(/([A-Z0-9]{6,})/i); if(!m){ alert('Nessun seriale riconosciuto nell’ultimo RX.'); return; } const sn=m[1]; ['prod-serial-input','serial-number','qr-manual-input','qr-manual-input-standalone'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=sn; }); if(typeof syncSerialInputs==='function') syncSerialInputs('prod'); alert('Seriale registrato da Communication Hub: '+sn); };
  document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh326,150));
  setInterval(()=>{ if(document.body.classList.contains('production-test-active')) moveTimingToRight(); },1000);
})();



/* AT-MEC_HM_3.36 - Modalità sviluppatore UI Admin */
function ensureUiDevPanel336(){
  if (document.getElementById('ui-dev-toggle-336')) return;
  const d=document.createElement('div'); d.id='ui-dev-toggle-336';
  d.innerHTML='<button class="btn btn-ghost btn-sm" onclick="toggleUiDevLabels336()">🏷 Mostra ID moduli</button><button class="btn btn-ghost btn-sm" onclick="exportUiLayoutHints336()">📋 Copia lista UI</button>';
  document.body.appendChild(d);
}
function isAdminUi336(){ try { return typeof canShowUiIds412K === 'function' ? canShowUiIds412K() : (String(currentUser?.role || currentUser?.username || '').toLowerCase().includes('admin') || Number(currentUser?.level||0) >= 90); } catch { return false; } }
function refreshUiDevButton336(){ ensureUiDevPanel336(); try { const can=isAdminUi336(); document.body.classList.toggle('admin-session', can); const p=document.getElementById('ui-dev-toggle-336'); if(p) p.style.display=can?'flex':'none'; if(!can){ clearUiDevLabels336(); document.body.classList.remove('ui-dev-labels-on'); } } catch { document.body.classList.remove('admin-session'); } }
function clearUiDevLabels336(){ document.querySelectorAll('.ui-dev-label-336').forEach(x=>x.remove()); }
function toggleUiDevLabels336(){
  const on = !document.body.classList.contains('ui-dev-labels-on');
  document.body.classList.toggle('ui-dev-labels-on', on);
  clearUiDevLabels336();
  if (!on) return;
  document.querySelectorAll('[data-ui-id]').forEach(el=>{
    const r=el.getBoundingClientRect(); if(r.width<10 || r.height<10) return;
    const lab=document.createElement('div'); lab.className='ui-dev-label-336'; lab.textContent=el.getAttribute('data-ui-id');
    lab.style.left=(window.scrollX+r.left+4)+'px'; lab.style.top=(window.scrollY+r.top+4)+'px'; document.body.appendChild(lab);
  });
}
function exportUiLayoutHints336(){
  const rows=[...document.querySelectorAll('[data-ui-id]')].map(el=>el.getAttribute('data-ui-id')).filter(Boolean).sort();
  const text=rows.join('\n');
  try { navigator.clipboard?.writeText(text); addLog(document.getElementById('sys-log'),'📋 Lista ID moduli copiata negli appunti.','pass'); }
  catch { console.log(text); alert(text); }
}
window.addEventListener('resize',()=>{ if(document.body.classList.contains('ui-dev-labels-on')) { clearUiDevLabels336(); setTimeout(()=>{document.body.classList.remove('ui-dev-labels-on'); toggleUiDevLabels336();},30); }});
setInterval(refreshUiDevButton336, 1500);


// AT-MEC_HM_4.10D - Modulo indipendente Storico Seriali & Riparazioni
// Patch conservativa: usa API/database già esistenti, senza modificare Test Mode, Ricette, Layout Editor o hardware.
let traceabilitySerialCache410D = null;
function initTraceabilitySerialPage(){
  try {
    const sn = (document.getElementById('trace-serial-input')?.value || document.getElementById('serial-dut')?.value || document.getElementById('prod-serial-dut')?.value || document.getElementById('serial-history-input')?.value || '').trim();
    const lot = (document.getElementById('trace-lot-input')?.value || document.getElementById('lot-number')?.value || document.getElementById('prod-lot-number')?.value || document.getElementById('serial-history-lot')?.value || '').trim();
    if(sn && document.getElementById('trace-serial-input')) document.getElementById('trace-serial-input').value = sn;
    if(lot && document.getElementById('trace-lot-input')) document.getElementById('trace-lot-input').value = lot;
    if(sn) loadTraceabilitySerialHistory();
  } catch(e) { console.warn('initTraceabilitySerialPage', e); }
}
function setTraceabilityText410D(id, value){ const el=document.getElementById(id); if(el) el.textContent=String(value ?? ''); }

function traceabilityFilters411(){
  return {
    serial: (document.getElementById('trace-serial-input')?.value || '').trim(),
    lot: (document.getElementById('trace-lot-input')?.value || '').trim(),
    operator: (document.getElementById('trace-operator-input')?.value || '').trim(),
    recipe: (document.getElementById('trace-recipe-input')?.value || '').trim(),
    result: (document.getElementById('trace-result-input')?.value || 'ALL').trim(),
    dateFrom: (document.getElementById('trace-date-from-input')?.value || '').trim(),
    dateTo: (document.getElementById('trace-date-to-input')?.value || '').trim()
  };
}
function traceabilityPass411(tests){ return (tests || []).filter(r => String(r.final_result || '').toUpperCase() === 'PASS').length; }
function traceabilityFail411(tests){ return (tests || []).filter(r => String(r.final_result || '').toUpperCase() === 'FAIL').length; }
function traceabilityDate411(v){ try { return v ? new Date(v).toLocaleString('it-IT') : '-'; } catch(_e){ return '-'; } }
function traceabilityApplyLocalFilters411(rows, filters){
  const f = filters || traceabilityFilters411();
  const norm = v => String(v || '').trim().toLowerCase();
  const from = f.dateFrom ? new Date(f.dateFrom + 'T00:00:00').getTime() : 0;
  const to = f.dateTo ? new Date(f.dateTo + 'T23:59:59').getTime() : Number.MAX_SAFE_INTEGER;
  return (rows || []).filter(r => {
    const ts = new Date(r.timestamp || 0).getTime();
    if (f.serial && !norm(r.serial_dut).includes(norm(f.serial))) return false;
    if (f.lot && !norm(r.lot_number || r.work_order).includes(norm(f.lot))) return false;
    if (f.operator && !norm(r.operator).includes(norm(f.operator))) return false;
    if (f.recipe && !norm(r.recipe_name).includes(norm(f.recipe))) return false;
    if (f.result && f.result !== 'ALL' && String(r.final_result || '').toUpperCase() !== f.result) return false;
    if (!Number.isNaN(ts) && (ts < from || ts > to)) return false;
    return true;
  });
}
function traceabilitySummaryHtml411(tests, repairs, filters){
  const uniqueSerials = new Set((tests || []).map(r => String(r.serial_dut || '').trim()).filter(Boolean)).size;
  const last = (tests || [])[0] || null;
  return `<div class="traceability-summary-strip">
    <div class="traceability-summary-item">Seriali unici<b>${uniqueSerials || (filters.serial ? 1 : 0)}</b></div>
    <div class="traceability-summary-item">Ricetta filtro<b>${escapeHtml(filters.recipe || 'Tutte')}</b></div>
    <div class="traceability-summary-item">Periodo<b>${escapeHtml((filters.dateFrom || 'inizio') + ' → ' + (filters.dateTo || 'oggi'))}</b></div>
    <div class="traceability-summary-item">Ultimo test<b>${escapeHtml(last ? traceabilityDate411(last.timestamp) : 'N/D')}</b></div>
  </div>`;
}
function traceabilityTimelineHtml411(tests){
  if(!(tests || []).length) return '<div class="hint">Nessun test trovato con i filtri selezionati.</div>';
  return `<div class="traceability-timeline">` + (tests || []).slice(0,80).map((r,i)=>{
    const res = String(r.final_result || '').toUpperCase();
    const cls = res === 'PASS' ? 'pass' : (res === 'FAIL' ? 'fail' : '');
    return `<div class="traceability-event ${cls}">
      <div class="event-head"><span>#${i+1} · ${escapeHtml(res || 'N/D')}</span><span>${escapeHtml(traceabilityDate411(r.timestamp))}</span></div>
      <div class="event-meta">SN: <b>${escapeHtml(r.serial_dut || '-')}</b> · Lotto: ${escapeHtml(r.lot_number || r.work_order || '-')} · Ricetta: ${escapeHtml(r.recipe_name || '-')} ${r.recipe_version ? 'v'+escapeHtml(r.recipe_version) : ''} · Operatore: ${escapeHtml(r.operator || '-')}</div>
      ${r.repair_note ? `<div class="event-note">${escapeHtml(r.repair_note)}</div>` : ''}
    </div>`;
  }).join('') + `</div>`;
}
function traceabilityRepairsHtml411(repairs){
  const rows=(repairs || []).slice(0,80).map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(traceabilityDate411(r.timestamp))}</td><td>${escapeHtml(r.serial_dut||'')}</td><td>${escapeHtml(r.lot_number||r.work_order||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('');
  return `<table class="db-mini-table"><thead><tr><th>#</th><th>Data</th><th>Seriale</th><th>Lotto</th><th>Operatore</th><th>Intervento</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Nessuna riparazione registrata.</td></tr>'}</tbody></table>`;
}
function openTraceabilityUnitCard411(){
  const serial=(document.getElementById('trace-serial-input')?.value || '').trim();
  const lot=(document.getElementById('trace-lot-input')?.value || '').trim();
  if(document.getElementById('unit-serial-input')) document.getElementById('unit-serial-input').value = serial;
  if(document.getElementById('unit-lot-input')) document.getElementById('unit-lot-input').value = lot;
  try { showTab('unit-card-tab'); } catch(_e) {}
  setTimeout(()=>{ try { if(serial) loadUnitGenealogy410E(); } catch(_e){} }, 80);
}
function exportTraceabilityCsv411(){
  const cache=traceabilitySerialCache410D;
  const tests=cache?.history?.tests || [];
  if(!tests.length){ alert('Esegui prima una ricerca nello Storico Seriali.'); return; }
  const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const body=['Data;Seriale;Lotto;Esito;Ricetta;Rev;Operatore;Nota'].concat(tests.map(r=>[r.timestamp||'',r.serial_dut||'',r.lot_number||r.work_order||'',r.final_result||'',r.recipe_name||'',r.recipe_version||'',r.operator||'',r.repair_note||''].map(esc).join(';'))).join('\n');
  downloadTextFile(`storico_seriali_${new Date().toISOString().slice(0,10)}.csv`, body, 'text/csv');
}

function clearTraceabilitySerialPage(){
  ['trace-serial-input','trace-lot-input','trace-operator-input','trace-recipe-input','trace-date-from-input','trace-date-to-input','trace-repair-note','trace-repair-cause'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  traceabilitySerialCache410D = null;
  setTraceabilityText410D('trace-total-tests','0');
  setTraceabilityText410D('trace-last-result','N/D');
  setTraceabilityText410D('trace-repair-count','0');
  setTraceabilityText410D('trace-retest-count','0');
  const t=document.getElementById('trace-tests-result'); if(t) t.innerHTML='<div class="hint">Inserisci un seriale e premi Cerca storico.</div>';
  const r=document.getElementById('trace-repairs-result'); if(r) r.innerHTML='<div class="hint">Nessuna ricerca eseguita.</div>'; const res=document.getElementById('trace-result-input'); if(res) res.value='ALL';
}
async function loadTraceabilitySerialHistory(){
  const filters=traceabilityFilters411();
  const testsBox=document.getElementById('trace-tests-result');
  const repairsBox=document.getElementById('trace-repairs-result');
  if(!api){ if(testsBox) testsBox.innerHTML='<div class="fail">API non disponibile.</div>'; return; }
  try{
    let tests=[]; let repairs=[]; let h={};
    if(filters.serial && api.getSerialHistory){
      h=await api.getSerialHistory(filters.serial, filters.lot);
      tests=traceabilityApplyLocalFilters411(Array.isArray(h?.tests) ? h.tests : [], filters);
      repairs=Array.isArray(h?.repairs) ? h.repairs : [];
      if(filters.operator) repairs=repairs.filter(r=>String(r.operator||'').toLowerCase().includes(filters.operator.toLowerCase()));
      if(filters.dateFrom || filters.dateTo) repairs=traceabilityApplyLocalFilters411(repairs.map(r=>({...r, final_result:'', recipe_name:''})), {...filters, result:'ALL', recipe:''});
    } else if(api.getAuditHistory) {
      tests=await api.getAuditHistory({ serial:filters.serial, lot:filters.lot, operator:filters.operator, recipe:filters.recipe, result:filters.result, dateFrom:filters.dateFrom, dateTo:filters.dateTo });
      tests=(Array.isArray(tests) ? tests : []).slice().sort((a,b)=>new Date(b.timestamp||0)-new Date(a.timestamp||0));
      repairs=[];
      h={ tests, repairs, totalTests:tests.length, lastResult:tests[0]?.final_result || '' };
    } else {
      if(testsBox) testsBox.innerHTML='<div class="fail">API storico/audit non disponibile.</div>'; return;
    }
    traceabilitySerialCache410D = { serial:filters.serial, lot:filters.lot, filters, history:{...h, tests, repairs} };
    const pass=traceabilityPass411(tests), fail=traceabilityFail411(tests);
    setTraceabilityText410D('trace-total-tests', tests.length);
    setTraceabilityText410D('trace-last-result', tests[0]?.final_result || h?.lastResult || 'N/D');
    setTraceabilityText410D('trace-repair-count', repairs.length);
    setTraceabilityText410D('trace-retest-count', Math.max(0, tests.length - (new Set(tests.map(r=>String(r.serial_dut||filters.serial||'').trim()).filter(Boolean)).size || (tests.length?1:0))));
    if(testsBox){
      const tableRows=tests.slice(0,80).map(r=>`<tr><td>${escapeHtml(traceabilityDate411(r.timestamp))}</td><td>${escapeHtml(r.serial_dut||filters.serial||'')}</td><td class="${String(r.final_result||'').toLowerCase()}">${escapeHtml(r.final_result||'')}</td><td>${escapeHtml(r.recipe_name||'')}</td><td>${escapeHtml(r.recipe_version||'')}</td><td>${escapeHtml(r.lot_number||r.work_order||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('');
      testsBox.innerHTML=`${traceabilitySummaryHtml411(tests, repairs, filters)}<div class="traceability-summary-strip"><div class="traceability-summary-item">PASS<b>${pass}</b></div><div class="traceability-summary-item">FAIL<b>${fail}</b></div><div class="traceability-summary-item">Retest<b>${Math.max(0, tests.length-1)}</b></div><div class="traceability-summary-item">Riparazioni<b>${repairs.length}</b></div></div><h4 style="margin:14px 0 8px">Timeline seriale / test</h4>${traceabilityTimelineHtml411(tests)}<h4 style="margin:16px 0 8px">Tabella test</h4><table class="db-mini-table"><thead><tr><th>Data</th><th>Seriale</th><th>Esito</th><th>Ricetta</th><th>Rev</th><th>Lotto</th><th>Operatore</th><th>Nota</th></tr></thead><tbody>${tableRows || '<tr><td colspan="8">Nessun test trovato.</td></tr>'}</tbody></table>`;
    }
    if(repairsBox) repairsBox.innerHTML=traceabilityRepairsHtml411(repairs);
  }catch(e){ if(testsBox) testsBox.innerHTML=`<div class="fail">Errore storico seriale: ${escapeHtml(normalizeError(e))}</div>`; }
}
async function saveTraceabilityRepairNote(){
  const serial=(document.getElementById('trace-serial-input')?.value || '').trim();
  const lot=(document.getElementById('trace-lot-input')?.value || '').trim();
  const operator=(document.getElementById('trace-operator-input')?.value || currentUser?.name || currentUser?.username || '').trim();
  const note=(document.getElementById('trace-repair-note')?.value || '').trim();
  const cause=(document.getElementById('trace-repair-cause')?.value || '').trim();
  if(!serial || !note){ alert('Seriale e nota intervento sono obbligatori.'); return; }
  if(!api || !api.addRepairRecord){ alert('API riparazioni non disponibile.'); return; }
  try{
    const fullNote = cause ? `${note} | Difetto/Causa: ${cause}` : note;
    await api.addRepairRecord({ serial_dut:serial, lot_number:lot, work_order:lot, operator, repair_note:fullNote });
    const rn=document.getElementById('trace-repair-note'); if(rn) rn.value='';
    const rc=document.getElementById('trace-repair-cause'); if(rc) rc.value='';
    await loadTraceabilitySerialHistory();
    try { await loadDatabaseDashboard(); } catch(_e) {}
    addLog(document.getElementById('sys-log'), `🛠 Riparazione salvata per ${escapeHtml(serial)}`, 'pass');
  }catch(e){ addLog(document.getElementById('sys-log'), `❌ Salvataggio riparazione: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}
function printTraceabilitySerialHistory(){
  const cache=traceabilitySerialCache410D;
  const serial=(document.getElementById('trace-serial-input')?.value || cache?.serial || '').trim();
  if(!serial){ alert('Cerca prima un seriale.'); return; }
  const lot=(document.getElementById('trace-lot-input')?.value || cache?.lot || '').trim();
  const h=cache?.history || {};
  const tests=Array.isArray(h.tests) ? h.tests : [];
  const repairs=Array.isArray(h.repairs) ? h.repairs : [];
  let html='<html><head><title>Storico seriale '+escapeHtml(serial)+'</title><style>body{font-family:Arial;padding:28px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #999;padding:6px;font-size:12px}.pass{color:green;font-weight:bold}.fail{color:red;font-weight:bold}</style></head><body>';
  html += `<h1>AT-MEC HM - Storico seriale</h1><p><b>Seriale:</b> ${escapeHtml(serial)}<br><b>Lotto:</b> ${escapeHtml(lot || 'Tutti')}<br><b>Test:</b> ${tests.length}<br><b>Riparazioni:</b> ${repairs.length}</p>`;
  html += '<h2>Cronologia test</h2><table><thead><tr><th>Data</th><th>Esito</th><th>Ricetta</th><th>Rev</th><th>Lotto</th><th>Operatore</th><th>Nota</th></tr></thead><tbody>';
  html += tests.map(r=>`<tr><td>${escapeHtml(new Date(r.timestamp).toLocaleString('it-IT'))}</td><td class="${String(r.final_result||'').toLowerCase()}">${escapeHtml(r.final_result||'')}</td><td>${escapeHtml(r.recipe_name||'')}</td><td>${escapeHtml(r.recipe_version||'')}</td><td>${escapeHtml(r.lot_number||r.work_order||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="7">Nessun test.</td></tr>';
  html += '</tbody></table><h2>Riparazioni</h2><table><thead><tr><th>Data</th><th>Lotto</th><th>Operatore</th><th>Intervento</th></tr></thead><tbody>';
  html += repairs.map(r=>`<tr><td>${escapeHtml(new Date(r.timestamp).toLocaleString('it-IT'))}</td><td>${escapeHtml(r.lot_number||r.work_order||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="4">Nessuna riparazione.</td></tr>';
  html += '</tbody></table><p style="margin-top:22px;font-size:11px">Generato da AT-MEC HM 4.13O</p></body></html>';
  const w=window.open('', '_blank');
  if(!w){ downloadTextFile(`storico_seriale_${serial}.html`, html, 'text/html'); return; }
  w.document.write(html); w.document.close(); setTimeout(()=>{ try{ w.print(); }catch{} }, 350);
}


// AT-MEC_HM_4.10E - Scheda Unità / Genealogia prodotto base
// Modulo indipendente: legge lo storico seriale già disponibile e costruisce identità, qualità e timeline.
let unitGenealogyCache410E = null;
function unitSetText410E(id, value){ const el=document.getElementById(id); if(el) el.textContent=String(value ?? ''); }
function unitDate410E(v){ try { return v ? new Date(v).toLocaleString('it-IT') : '-'; } catch(_e){ return '-'; } }
function initUnitCardPage410E(){
  try{
    const sn=(document.getElementById('unit-serial-input')?.value || document.getElementById('trace-serial-input')?.value || document.getElementById('serial-dut-dash')?.value || document.getElementById('serial-dut')?.value || document.getElementById('prod-serial-input')?.value || '').trim();
    const lot=(document.getElementById('unit-lot-input')?.value || document.getElementById('trace-lot-input')?.value || document.getElementById('lot-number')?.value || document.getElementById('prod-lot-number')?.value || '').trim();
    if(sn && document.getElementById('unit-serial-input')) document.getElementById('unit-serial-input').value=sn;
    if(lot && document.getElementById('unit-lot-input')) document.getElementById('unit-lot-input').value=lot;
    if(sn) loadUnitGenealogy410E();
  }catch(e){ console.warn('initUnitCardPage410E', e); }
}
function clearUnitCard410E(){
  ['unit-serial-input','unit-lot-input','unit-board-rev-input','unit-fw-input','unit-quality-note-input','unit-operator-input'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  unitGenealogyCache410E=null;
  unitSetText410E('unit-last-result','N/D'); unitSetText410E('unit-test-count','0'); unitSetText410E('unit-retest-count','0'); unitSetText410E('unit-repair-count','0');
  const identity=document.getElementById('unit-identity-box'); if(identity) identity.innerHTML='<div class="hint">Inserisci un seriale e carica la scheda unità.</div>';
  const quality=document.getElementById('unit-quality-box'); if(quality) quality.innerHTML='<div class="hint">Nessuna scheda caricata.</div>';
  const timeline=document.getElementById('unit-timeline-box'); if(timeline) timeline.innerHTML='<div class="hint">La timeline appare dopo la ricerca.</div>';
  const repairs=document.getElementById('unit-repairs-box'); if(repairs) repairs.innerHTML='<div class="hint">Nessuna ricerca eseguita.</div>';
}
async function loadUnitGenealogy410E(){
  const serial=(document.getElementById('unit-serial-input')?.value || '').trim();
  const lot=(document.getElementById('unit-lot-input')?.value || '').trim();
  const boardRev=(document.getElementById('unit-board-rev-input')?.value || '').trim();
  const firmwareManual=(document.getElementById('unit-fw-input')?.value || '').trim();
  const operatorFilter=(document.getElementById('unit-operator-input')?.value || '').trim();
  const qualityNote=(document.getElementById('unit-quality-note-input')?.value || '').trim();
  const identity=document.getElementById('unit-identity-box');
  const quality=document.getElementById('unit-quality-box');
  const timeline=document.getElementById('unit-timeline-box');
  const repairsBox=document.getElementById('unit-repairs-box');
  if(!serial){ if(identity) identity.innerHTML='<div class="hint">Inserisci un seriale.</div>'; return; }
  if(!api || !api.getSerialHistory){ if(identity) identity.innerHTML='<div class="fail">API storico seriale non disponibile.</div>'; return; }
  try{
    const h=await api.getSerialHistory(serial, lot);
    let tests=Array.isArray(h?.tests) ? h.tests.slice() : [];
    const repairs=Array.isArray(h?.repairs) ? h.repairs.slice() : [];
    if(operatorFilter) tests=tests.filter(r=>String(r.operator||'').toLowerCase().includes(operatorFilter.toLowerCase()));
    tests.sort((a,b)=>new Date(a.timestamp||0)-new Date(b.timestamp||0));
    repairs.sort((a,b)=>new Date(a.timestamp||0)-new Date(b.timestamp||0));
    const first=tests[0] || null;
    const last=tests[tests.length-1] || null;
    const pass=tests.filter(r=>String(r.final_result||'').toUpperCase()==='PASS').length;
    const fail=tests.filter(r=>String(r.final_result||'').toUpperCase()==='FAIL').length;
    const lastResult=last?.final_result || h?.lastResult || 'N/D';
    const firmware=firmwareManual || last?.firmware || last?.firmware_version || last?.fw_version || first?.firmware || first?.firmware_version || '-';
    unitGenealogyCache410E={serial, lot, boardRev, firmware, operatorFilter, qualityNote, tests, repairs, first, last, pass, fail, lastResult};
    unitSetText410E('unit-last-result', lastResult);
    unitSetText410E('unit-test-count', tests.length);
    unitSetText410E('unit-retest-count', Math.max(0, tests.length-1));
    unitSetText410E('unit-repair-count', repairs.length);
    if(identity){
      identity.innerHTML=`<table class="db-mini-table"><tbody>
        <tr><th>Seriale</th><td style="font-family:monospace;font-weight:900">${escapeHtml(serial)}</td></tr>
        <tr><th>Commessa / Lotto</th><td>${escapeHtml(lot || last?.lot_number || last?.work_order || first?.lot_number || first?.work_order || '-')}</td></tr>
        <tr><th>Revisione scheda</th><td>${escapeHtml(boardRev || '-')}</td></tr>
        <tr><th>Firmware</th><td>${escapeHtml(firmware)}</td></tr>
        <tr><th>Ricetta ultimo test</th><td>${escapeHtml(last?.recipe_name || '-')} ${last?.recipe_version ? 'v'+escapeHtml(last.recipe_version) : ''}</td></tr>
        <tr><th>Operatore ultimo test</th><td>${escapeHtml(last?.operator || '-')}</td></tr>
        <tr><th>Primo test</th><td>${escapeHtml(unitDate410E(first?.timestamp))}</td></tr>
        <tr><th>Ultimo test</th><td>${escapeHtml(unitDate410E(last?.timestamp))}</td></tr>
      </tbody></table>`;
    }
    if(quality){
      const resultClass=String(lastResult).toLowerCase()==='pass'?'validation-ok':(String(lastResult).toLowerCase()==='fail'?'validation-fail':'hint');
      quality.innerHTML=`<div class="lot-grid">
        <div class="lot-card"><div class="big ${resultClass}">${escapeHtml(lastResult)}</div><div>Ultimo esito</div></div>
        <div class="lot-card"><div class="big" style="color:var(--pass)">${pass}</div><div>PASS</div></div>
        <div class="lot-card"><div class="big" style="color:var(--fail)">${fail}</div><div>FAIL</div></div>
        <div class="lot-card"><div class="big">${repairs.length}</div><div>Riparazioni</div></div>
      </div><div class="hint" style="margin-top:8px;"><b>Note qualità:</b> ${escapeHtml(qualityNote || 'nessuna nota inserita')}</div>`;
    }
    if(timeline){
      const rows=tests.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(unitDate410E(r.timestamp))}</td><td class="${String(r.final_result||'').toLowerCase()}">${escapeHtml(r.final_result||'')}</td><td>${escapeHtml(r.recipe_name||'')}</td><td>${escapeHtml(r.recipe_version||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.execution_time_ms?((Number(r.execution_time_ms)/1000).toFixed(1)+'s'):'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('');
      timeline.innerHTML=`<table class="db-mini-table"><thead><tr><th>#</th><th>Data</th><th>Esito</th><th>Ricetta</th><th>Rev</th><th>Operatore</th><th>Tempo</th><th>Nota</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Nessun test trovato per questa unità.</td></tr>'}</tbody></table>`;
    }
    if(repairsBox){
      const rows=repairs.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(unitDate410E(r.timestamp))}</td><td>${escapeHtml(r.lot_number||r.work_order||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('');
      repairsBox.innerHTML=`<table class="db-mini-table"><thead><tr><th>#</th><th>Data</th><th>Lotto</th><th>Operatore</th><th>Intervento</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Nessuna riparazione collegata.</td></tr>'}</tbody></table>`;
    }
  }catch(e){ if(identity) identity.innerHTML=`<div class="fail">Errore scheda unità: ${escapeHtml(normalizeError(e))}</div>`; }
}
function printUnitGenealogy410E(){
  const c=unitGenealogyCache410E;
  const serial=(document.getElementById('unit-serial-input')?.value || c?.serial || '').trim();
  if(!serial){ alert('Carica prima una scheda unità.'); return; }
  const tests=c?.tests || []; const repairs=c?.repairs || [];
  let html='<html><head><title>Scheda unità '+escapeHtml(serial)+'</title><style>body{font-family:Arial;padding:28px}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #999;padding:6px;font-size:12px}.pass{color:green;font-weight:bold}.fail{color:red;font-weight:bold}</style></head><body>';
  html+=`<h1>AT-MEC HM - Scheda Unità / Genealogia prodotto</h1><p><b>Seriale:</b> ${escapeHtml(serial)}<br><b>Lotto:</b> ${escapeHtml(c?.lot || '-')}<br><b>Revisione scheda:</b> ${escapeHtml(c?.boardRev || '-')}<br><b>Firmware:</b> ${escapeHtml(c?.firmware || '-')}<br><b>Ultimo esito:</b> ${escapeHtml(c?.lastResult || 'N/D')}<br><b>Note qualità:</b> ${escapeHtml(c?.qualityNote || '-')}</p>`;
  html+='<h2>Timeline test</h2><table><thead><tr><th>#</th><th>Data</th><th>Esito</th><th>Ricetta</th><th>Rev</th><th>Operatore</th><th>Nota</th></tr></thead><tbody>';
  html+=tests.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(unitDate410E(r.timestamp))}</td><td class="${String(r.final_result||'').toLowerCase()}">${escapeHtml(r.final_result||'')}</td><td>${escapeHtml(r.recipe_name||'')}</td><td>${escapeHtml(r.recipe_version||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="7">Nessun test.</td></tr>';
  html+='</tbody></table><h2>Riparazioni</h2><table><thead><tr><th>#</th><th>Data</th><th>Lotto</th><th>Operatore</th><th>Intervento</th></tr></thead><tbody>';
  html+=repairs.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(unitDate410E(r.timestamp))}</td><td>${escapeHtml(r.lot_number||r.work_order||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="5">Nessuna riparazione.</td></tr>';
  html+='</tbody></table><p style="margin-top:22px;font-size:11px">Generato da AT-MEC HM 4.13O</p></body></html>';
  const w=window.open('', '_blank');
  if(!w){ downloadTextFile(`scheda_unita_${serial}.html`, html, 'text/html'); return; }
  w.document.write(html); w.document.close(); setTimeout(()=>{ try{ w.print(); }catch{} },350);
}


/* AT-MEC_HM_4.16B: report/layout/topbar legacy estratti in js/modules/reports/reports-layout-sync.js */
/* AT-MEC_HM_4.16B_APP_JS_DEEP_SPLIT - app.js alleggerito con moduli hardware/report. */
