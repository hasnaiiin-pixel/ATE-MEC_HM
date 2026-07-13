/* AT-MEC_HM_4.16D_CORE_MODULE_SPLIT
 * UI dashboard, report, storico e CSS legacy compatto.
 * Estratto da app-legacy-core.js preservando ordine di esecuzione.
 */
function startWizardLive() {
  stopWizardLive();
  document.getElementById('w-live-btn').textContent = '⏸ Stop live';
  readWizardValue();
  wizardLiveInterval = setInterval(readWizardValue, 750);
}

function stopWizardLive() {
  if (wizardLiveInterval) clearInterval(wizardLiveInterval);
  wizardLiveInterval = null;
  const btn = document.getElementById('w-live-btn');
  if (btn) btn.textContent = '▶ Live';
}

function removeStep(idx) {
  recipe.steps.splice(idx, 1);
  renumberRecipeSteps();
  renderSteps();
}

function clearRecipe() {
  recipe.steps = []; stepIdCounter = 1; renderSteps();
}

function duplicateRecipe() {
  const base = document.getElementById('recipe-name-inp').value.trim() || recipe.recipe_name || 'ricetta';
  document.getElementById('recipe-name-inp').value = `${base}_copy`;
  recipe.recipe_name = `${base}_copy`;
  recipe.version = (Number(recipe.version) || 1) + 1;
  addLog(document.getElementById('sys-log'), `Ricetta duplicata come <b>${recipe.recipe_name}</b>`, 'info');
}

function syncRecipeEnabledFromUi() {
  stopWizardLive();
  recipe.enabled = document.getElementById('recipe-enabled-page') ? document.getElementById('recipe-enabled-page').checked : (recipe.enabled !== false);
  renderSteps();
}


function canDeleteRecipeRole() {
  const r = String(currentUser?.role || '').toLowerCase();
  return Number(currentUser?.level || 0) >= 40 || ['admin','administrator','sviluppatore','developer','tecnico','technician'].some(x => r.includes(x));
}
async function deleteSelectedRecipe() {
  if (!canDeleteRecipeRole()) { alert('Permesso negato: eliminazione ricette consentita solo ad Admin, Sviluppatore o Tecnico.'); return; }
  const name = document.getElementById('recipe-list')?.value || recipe?.recipe_name || '';
  if (!name) { alert('Seleziona una ricetta da eliminare.'); return; }
  if (!confirm(`Eliminare la ricetta "${name}"? L'operazione non rimuove eventuali report storici.`)) return;
  try { localStorage.removeItem('recipe_' + name); } catch {}
  try { if (api?.deleteRecipe) await api.deleteRecipe(name); } catch(e) { addLog(document.getElementById('sys-log'), `⚠️ Delete DB/file: ${escapeHtml(normalizeError(e))}`, 'warn'); }
  if (recipe?.recipe_name === name) { recipe = { recipe_name:'Nuova Ricetta', version:1, enabled:true, power_metadata:'MANUAL_POWER', steps:[] }; stepIdCounter = 1; }
  await refreshRecipeList();
  await refreshProductionRecipes();
  await refreshDashboardRecipes?.();
  renderSteps(); renderRecipePage();
  addLog(document.getElementById('sys-log'), `🗑 Ricetta eliminata: <b>${escapeHtml(name)}</b>`, 'warn');
}

async function saveRecipe() {
  const name = document.getElementById('recipe-name-inp').value.trim() || 'default';
  recipe.recipe_name = name;
  recipe.power_metadata = getPowerSourceValue();
  recipe.enabled = document.getElementById('recipe-enabled-page') ? document.getElementById('recipe-enabled-page').checked : (recipe.enabled !== false);
  try {
    localStorage.setItem('recipe_' + name, JSON.stringify(recipe));
    let saveRes = null;
    if (api) saveRes = await withTimeout(api.saveRecipe(name, recipe), 3000, 'salvataggio ricetta');
    if (saveRes?.version) recipe.version = saveRes.version;
    addLog(document.getElementById('sys-log'), `Ricetta salvata: <b>${name}</b>${saveRes?.version ? ' — versione '+saveRes.version : ''}`, 'info');
    await refreshRecipeList();
    await refreshRecipeVersions();
  } catch(e) {
    addLog(document.getElementById('sys-log'), `❌ Errore salvataggio: ${e.message}`, 'fail');
  }
}

async function exportCurrentRecipe() {
  const name = (document.getElementById('recipe-name-inp')?.value || recipe.recipe_name || 'ricetta').trim();
  recipe.recipe_name = name || recipe.recipe_name || 'ricetta';
  renumberRecipeSteps();
  if (!api?.exportRecipeAs) { addLog(document.getElementById('sys-log'), '❌ Export non disponibile in preload.', 'fail'); return; }
  try {
    const res = await api.exportRecipeAs(recipe.recipe_name, recipe);
    if (res?.ok) addLog(document.getElementById('sys-log'), `📤 Ricetta esportata: <b>${escapeHtml(res.filePath)}</b>`, 'pass');
  } catch(e) { addLog(document.getElementById('sys-log'), `❌ Export ricetta: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

async function importRecipeFile() {
  if (!api?.importRecipeFrom) { addLog(document.getElementById('sys-log'), '❌ Import non disponibile in preload.', 'fail'); return; }
  try {
    const res = await api.importRecipeFrom();
    if (!res?.ok) return;
    recipe = res.recipe || recipe;
    recipe.steps = Array.isArray(recipe.steps) ? recipe.steps : [];
    renumberRecipeSteps();
    document.getElementById('recipe-name-inp').value = recipe.recipe_name || 'Ricetta importata';
    document.getElementById('recipe-enabled').checked = recipe.enabled !== false;
    setPowerSourceValue(recipe.power_metadata || 'MANUAL_POWER');
    renderSteps();
    renderRecipePage();
    addLog(document.getElementById('sys-log'), `📥 Ricetta importata: <b>${escapeHtml(res.filePath)}</b>`, 'pass');
  } catch(e) { addLog(document.getElementById('sys-log'), `❌ Import ricetta: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

async function refreshRecipeList() {
  const sel = document.getElementById('recipe-list');
  let names = [];
  if (api) {
    try { names = await api.listRecipes(); } catch {}
  }
  const lsKeys = Object.keys(localStorage).filter(k => k.startsWith('recipe_')).map(k => k.replace('recipe_', ''));
  names = [...new Set([...names, ...lsKeys])];
  sel.innerHTML = names.length
    ? names.map(n => `<option value="${n}">${n}</option>`).join('')
    : '<option value="">— nessuna ricetta —</option>';
  await refreshRecipeVersions();
}

async function loadSavedRecipe() {
  try { if (api?.safePl303Off) await api.safePl303Off('CAMBIO_RICETTA_EDITOR'); } catch {}
  const name = document.getElementById('recipe-list').value;
  if (!name) return;
  let loaded = null;
  if (api) {
    try { const res = await api.loadRecipe(name); if (res.ok) loaded = res.recipe; } catch {}
  }
  if (!loaded) {
    const raw = localStorage.getItem('recipe_' + name);
    if (raw) loaded = JSON.parse(raw);
  }
  if (loaded) {
    const previousRecipe10114 = recipe;
    recipe = loaded;
    if (typeof window.vexon10114PrepareLoadedRecipe === 'function') await window.vexon10114PrepareLoadedRecipe(recipe, 'CARICAMENTO RICETTA EDITOR', previousRecipe10114);
    stepIdCounter = Math.max(...recipe.steps.map(s => s.step_id), 0) + 1;
    document.getElementById('recipe-name-inp').value = recipe.recipe_name;
    setPowerSourceValue(recipe.power_metadata || 'MANUAL_POWER');
    document.getElementById('recipe-enabled').checked = recipe.enabled !== false;
    const namePage = document.getElementById('recipe-name-page'); if (namePage) namePage.value = recipe.recipe_name;
    const enabledPage = document.getElementById('recipe-enabled-page'); if (enabledPage) enabledPage.checked = recipe.enabled !== false;
    renderSteps();
    addLog(document.getElementById('sys-log'), `Ricetta caricata: <b>${name}</b>`, 'info');
  }
}

async function doLogin() {
  const operator = document.getElementById('op-name').value.trim();
  const password = document.getElementById('op-password').value;
  if (!operator || !password) { document.getElementById('login-status').textContent = '❌ Inserisci username e password.'; return; }
  if (api) {
    try {
      const res = await api.userLogin(operator, password);
      if (!res.ok) { document.getElementById('login-status').textContent = '❌ ' + res.error; return; }
      document.getElementById('login-status').textContent = `✅ ${res.operator || operator} [${res.role || ''}] livello ${res.level ?? ''}`;
      completeLogin(res.operator || operator, res.role || 'Operator', res.level || 0, res.permissions || [], res.username || operator, res.operatorCode || '', res.photoDataUrl || '');
      try { if (typeof window.syncFactoryStationToDataProvider418B === 'function') window.syncFactoryStationToDataProvider418B(); } catch(_e){}
      return;
    } catch (e) { document.getElementById('login-status').textContent = '❌ Errore login: ' + normalizeError(e); return; }
  }
  document.getElementById('login-status').textContent = `✅ ${operator} [offline]`;
  completeLogin(operator, 'Offline', 0, []);
}



/* AT-MEC_HM_4.13R_J - Test Mode Device Gate SAFE
   Scopo: integra il pre-check Device Manager nell'avvio Test Mode senza modificare backend, login, ruoli o ricette.
   Se i dispositivi richiesti risultano non conformi, mostra un avviso chiaro e lascia scegliere se continuare. */
(function(){
  if(window.__atmecTestModeDeviceGate413RJ) return;
  window.__atmecTestModeDeviceGate413RJ = true;

  const REQUIRED_KEY = 'atmec_device_gate_required_413RE';
  const DEFAULT_REQUIRED = []; // 4.13R_K: in Test Mode il gate usa la ricetta, non obbliga strumenti generici

  function dmEsc(v){
    try { return (typeof escapeHtml === 'function') ? escapeHtml(v ?? '') : String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m])); }
    catch(_e){ return String(v ?? ''); }
  }

  function normalizeRecipeInstrumentName(name){
    const n = String(name || '').trim().toLowerCase();
    if(!n) return '';
    if(n.includes('modbus_serial') || n.includes('esp32') || n === 'esp32_serial') return 'modbus_serial';
    if(n.includes('aimtti_pl303') || n.includes('pl303') || n.includes('tti')) return 'AimTTi_PL303';
    if(n.includes('keysight') || n.includes('34461') || n.includes('34465') || n.includes('multimeter') || n.includes('multimetro') || n.includes('dmm')) return 'Keysight_34461A';
    if(n.includes('scanner') || n.includes('qr')) return 'QR_Scanner';
    if(['manual','manuale','operator','system','none'].includes(n)) return n;
    return String(name || '').trim();
  }

  window.normalizeRecipeInstrumentName = normalizeRecipeInstrumentName;
  window.isRecipeInstrumentExcluded = function(name){
    const excluded = Array.isArray(window.excludedInstruments) ? window.excludedInstruments : (Array.isArray(excludedInstruments) ? excludedInstruments : []);
    const wanted = normalizeRecipeInstrumentName(name);
    return excluded.some(item => normalizeRecipeInstrumentName(item) === wanted);
  };

  function mapInstrumentToGateKey(name){
    const normalized = normalizeRecipeInstrumentName(name);
    if(normalized === 'modbus_serial') return 'esp32';
    if(normalized === 'AimTTi_PL303') return 'pl303';
    if(normalized === 'Keysight_34461A') return 'multimeter';
    if(normalized === 'QR_Scanner') return 'scanner';
    return '';
  }

  function requiredDevices(){
    // 4.13R_K: il pre-check operativo deve seguire la ricetta corrente.
    // Il pannello Device Manager può avere una configurazione visiva, ma non deve rendere ESP32/PL303/DMM obbligatori per tutte le ricette.
    try{
      if(typeof getRequiredInstrumentsForRecipe === 'function') {
        const req = (getRequiredInstrumentsForRecipe() || [])
          .filter(x => !window.isRecipeInstrumentExcluded(x))
          .map(mapInstrumentToGateKey)
          .filter(Boolean);
        const unique = Array.from(new Set(req));
        if(unique.length) return unique;
      }
    }catch(_e){}
    return DEFAULT_REQUIRED;
  }

  function keyOfDevice(r){
    const txt = String((r && (r.name || r.device || r.label || r.type || r.group)) || '').toLowerCase();
    if(txt.includes('modbus_serial') || txt.includes('esp32')) return 'esp32';
    if(txt.includes('aimtti_pl303') || txt.includes('pl303') || txt.includes('tti') || txt.includes('psu') || txt.includes('aliment')) return 'pl303';
    if(txt.includes('multi') || txt.includes('dmm') || txt.includes('keysight') || txt.includes('34461')) return 'multimeter';
    if(txt.includes('scanner') || txt.includes('qr')) return 'scanner';
    return txt || 'device';
  }

  function labelOf(key){
    return { esp32:'ESP32', pl303:'PL303', multimeter:'Multimetro', scanner:'Scanner QR' }[key] || key;
  }

  function liveOf(r){
    if(!r) return false;
    const raw = String(r.status || r.state || r.mode || r.connectionStatus || '').toLowerCase();
    if(r.live === true || r.connected === true || r.online === true || r.ok === true) return true;
    if(r.mock === false && raw !== 'offline' && raw !== 'error') return true;
    if(raw.includes('online') || raw.includes('live') || raw.includes('connected') || raw.includes('ok') || raw.includes('ready')) return true;
    return false;
  }

  async function augmentEsp32Row(rows){
    rows = Array.isArray(rows) ? rows.slice() : [];
    try{
      if(window.api && typeof window.api.getEsp32Info === 'function'){
        const info = await Promise.race([window.api.getEsp32Info(), new Promise(resolve => setTimeout(() => resolve(null), 1400))]);
        if(info && (info.live === true || info.connected === true || info.ok === true)){
          const idx = rows.findIndex(r => keyOfDevice(r) === 'esp32');
          const row = { name:'modbus_serial', label:'ESP32-S3 Controller', live:true, connected:true, online:true, mock:false, status:'LIVE', connectionString:info.connectionString || info.port || 'ESP32 JSON', firmware:info.firmware || info.version || '' };
          if(idx >= 0) rows[idx] = Object.assign({}, rows[idx], row); else rows.push(row);
        }
      }
    }catch(_e){}
    return rows;
  }

  async function readRows(){
    try{
      if(window.api && typeof window.api.getProfessionalDevices === 'function'){
        const rows = await window.api.getProfessionalDevices();
        if(Array.isArray(rows)) return { rows: await augmentEsp32Row(rows), source:'getProfessionalDevices + ESP32 info' };
      }
    }catch(_e){}
    try{
      if(window.api && typeof window.api.getHardwareStatuses === 'function'){
        const rows = await window.api.getHardwareStatuses();
        if(Array.isArray(rows)) return { rows: await augmentEsp32Row(rows), source:'getHardwareStatuses + ESP32 info' };
      }
    }catch(_e){}
    return { rows: await augmentEsp32Row([]), source:'ESP32 info fallback' };
  }

  window.dm413rjPreStartGateSafe = async function(){
    const log = document.getElementById('run-log');
    const required = requiredDevices();
    const { rows, source } = await readRows();
    if(!required.length){
      if(typeof addLog === 'function') addLog(log, `🧩 Pre-check Device Manager: nessun dispositivo obbligatorio per questa ricetta.`, 'pass');
      return { ok:true, missing:[], skipped:true };
    }
    const byKey = {};
    rows.forEach(r => { byKey[keyOfDevice(r)] = r; });
    const missing = required.filter(k => !liveOf(byKey[k]));
    const okList = required.filter(k => liveOf(byKey[k]));

    if(typeof addLog === 'function'){
      addLog(log, `🧩 Pre-check Device Manager: sorgente <b>${dmEsc(source)}</b> · OK: ${okList.length}/${required.length}`, missing.length ? 'warn' : 'pass');
      if(missing.length){ addLog(log, `⚠️ Dispositivi non conformi: <b>${dmEsc(missing.map(labelOf).join(', '))}</b>`, 'warn'); }
    }

    try{
      window.__atmecLastTestGate413RJ = { ts: Date.now(), source, required, ok: okList, missing };
      localStorage.setItem('atmec_last_test_gate_413RJ', JSON.stringify(window.__atmecLastTestGate413RJ));
    }catch(_e){}

    if(!missing.length) return { ok:true, missing:[] };

    const message = 'Pre-check Device Manager non conforme:\n\n' +
      missing.map(labelOf).join(', ') +
      '\n\nVuoi continuare comunque?\nScegli Annulla per tornare al Device Manager e verificare collegamenti/porte.';
    const proceed = window.confirm(message);
    if(!proceed){
      if(typeof addLog === 'function') addLog(log, '⏹ Avvio test annullato dal pre-check Device Manager.', 'warn');
      return { ok:false, missing };
    }
    if(typeof addLog === 'function') addLog(log, "⚠️ Pre-check non conforme ignorato manualmente dall'utente.", 'warn');
    return { ok:true, missing, override:true };
  };
})();

async function startTest() {
  productionForceComplete = false;
  if (!requireLogin()) return;
  if (startInProgress) return;
  startInProgress = true;
  try {
    window.__atmec10112StartBusy = true;
    currentRunState = 'STARTING';
    setStatePill('STARTING');
    setProductionTimingState('AVVIO TEST');
    addLog(document.getElementById('run-log'), '▶ Avvio test richiesto: preparo il runtime senza attendere un secondo click.', 'info');
  } catch(e) {}
  stopWizardLive();
  if (autoPollInterval) { clearInterval(autoPollInterval); autoPollInterval = null; }
  meterPollBusy = false;
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnStop = document.getElementById('btn-stop');
  if (btnStart) btnStart.disabled = true;
  if (btnPause) btnPause.disabled = true;
  if (btnStop) btnStop.disabled = false;
  try {
    let recipePreparedFast10114 = (typeof window.vexon10114IsRecipePrepared === 'function' && window.vexon10114IsRecipePrepared(recipe) === true);
    const needsRecipePreparation10114 = ['gpio_initial_profile','gpio_inter_test_profile','gpio_safe_profile'].some(k => Array.isArray(recipe?.[k]) && recipe[k].some(r => r && r.enabled !== false && String(r.channel ?? '').trim() !== '' && Number.isFinite(Number(r.channel)))) || recipe?.automatic_cycle?.enabled === true;
    if (!recipePreparedFast10114 && needsRecipePreparation10114 && typeof window.vexon10114PrepareLoadedRecipe === 'function') {
      const prep10114 = await window.vexon10114PrepareLoadedRecipe(recipe, 'PREPARAZIONE PRIMA START', null);
      if (!prep10114 || prep10114.ok === false) { alert('Preparazione GPIO ricetta non completata. Controlla ESP32 e profilo iniziale.'); forceRunIdleUi(); return; }
      recipePreparedFast10114 = true;
    }
    recipe.enabled = document.getElementById('recipe-enabled-page') ? document.getElementById('recipe-enabled-page').checked : (recipe.enabled !== false);
    if (recipe.enabled === false) { alert('Ricetta disabilitata: attiva il flag per eseguire.'); return; }
    if (recipe.steps.filter(s => s.enabled !== false).length === 0) { alert('Aggiungi o abilita almeno uno step alla ricetta prima di avviare!'); return; }
    if (!api) { addLog(document.getElementById('run-log'), '⚠️ Avvia tramite Electron (npm run build && npm start)', 'warn'); return; }
    const stateBefore10112 = String(currentRunState || document.getElementById('state-pill')?.textContent || '').toUpperCase();
    if (/FAULT|ERROR/.test(stateBefore10112)) {
      await guardedUi('RECOVER stato prima avvio', () => api.recoverFault(), { timeoutMs: 2500, logTo: document.getElementById('run-log'), fallback: { ok:false } });
    } else {
      // 10.1.12: non bloccare ogni START con recover completo quando il runtime è già pronto.
      try { api.recoverFault && api.recoverFault(); } catch(e) {}
    }
    if (!recipePreparedFast10114) {
      await guardedUi('Auto collegamento strumenti necessari', () => autoConnectProductionInstruments(false), { timeoutMs: 4500, logTo: document.getElementById('run-log'), fallback: null });
    } else {
      addLog(document.getElementById('run-log'), '⚡ Ricetta e GPIO già preparati: scansione strumenti completa saltata.', 'info');
    }
    if (!recipePreparedFast10114 && typeof window.dm413rjPreStartGateSafe === 'function') {
      const dmGate = await window.dm413rjPreStartGateSafe();
      if (!dmGate || dmGate.ok === false) { forceRunIdleUi(); return; }
    }
    const sampleOk = (typeof window.runPreTestSampleWizard === 'function')
      ? await window.runPreTestSampleWizard()
      : (localStorage.getItem('atmec_sample_test_required') === '1' && typeof runPreTestSampleWizard === 'function' ? await runPreTestSampleWizard() : true);
    if (!sampleOk) { addLog(document.getElementById('run-log'), '⏹ Test annullato nel wizard scheda campione.', 'warn'); forceRunIdleUi(); return; }
    const hwCheck = await guardedUi('Validazione hardware', () => validateRecipeHardwareBeforeStart(), { timeoutMs: 5000, logTo: document.getElementById('run-log'), fallback: { ok:false, missing:['timeout validazione'] } });
    if (!hwCheck.ok) {
      const msg = `Hardware richiesto non LIVE: ${hwCheck.missing.join(', ')}. Apri ESP32 Control e premi Auto collega ESP32 per ricette, oppure seleziona la COM reale.`;
      addLog(document.getElementById('run-log'), `❌ ${escapeHtml(msg)}`, 'fail');
      alert(msg);
      return;
    }
    const serial = isSerialRequired() ? getSerialDut() : '';
    const lotNumber = getLotNumber();
    if (isSerialRequired() && !serial) { alert('Serial Number obbligatorio: inserisci SN manuale o da QR. Se questa scheda non ha seriale, disattiva il flag SN obbligatorio.'); forceRunIdleUi(); return; }
    if (!lotNumber) { alert('Inserisci Numero Lotto / Commessa prima di avviare la produzione.'); forceRunIdleUi(); return; }
    recipe.power_metadata = recipe.power_metadata || getPowerSourceValue();
    document.getElementById('result-banner')?.classList.remove('show');
    document.getElementById('fault-panel')?.classList.remove('show');
    stepStatusMap = {};
    lastStopWasOperator = false;
    startProductionTimer();
    setProductionTimingState('IN ESECUZIONE');
    clearLog();
    renderSteps();
    let res = await guardedUi('Avvio ricetta', () => api.startTest(resolveRecipeForExecution414A(recipe, { serial, lotNumber }), serial, { lotNumber, workOrder: lotNumber, serialRequired: isSerialRequired() }), { timeoutMs: 5000, logTo: document.getElementById('run-log'), fallback: { ok:false, error:'timeout avvio ricetta' } });
    if (res && !res.ok && String(res.error || '').includes('Ricetta già in esecuzione')) {
      addLog(document.getElementById('run-log'), '⚠️ Motore test rimasto in RUNNING: eseguo STOP/RESET automatico e ritento avvio.', 'warn');
      await stopTestAndReset();
      await guardedUi('RECOVER dopo RUNNING bloccato', () => api.recoverFault(), { timeoutMs: 2000, logTo: document.getElementById('run-log'), fallback:{ok:false} });
      res = await guardedUi('Avvio ricetta dopo reset', () => api.startTest(resolveRecipeForExecution414A(recipe, { serial, lotNumber }), serial, { lotNumber, workOrder: lotNumber, serialRequired: isSerialRequired() }), { timeoutMs: 5000, logTo: document.getElementById('run-log'), fallback: { ok:false, error:'timeout avvio dopo reset' } });
    }
    if (!res || !res.ok) {
      if (res?.duplicate) {
        if (res.previousResult === 'PASS') {
          { const c = await showFrontChoiceModal('Seriale già PASS', res.message || 'Seriale già PASS in questa commessa. Proseguire comunque?', [{id:'go',label:'Prosegui ritest',cls:'btn-warn'},{id:'cancel',label:'Annulla',cls:'btn-danger'}]); if (c !== 'go') { forceRunIdleUi(); return; } }
        } else {
          const note = await showFrontInputModal('Relazione riparazione obbligatoria', (res.message || 'Seriale già FAIL. Indica cosa è stato fatto alla scheda prima del ritest:'), 'Descrivi cosa è stato riparato o verificato sulla scheda...');
          if (!note || !note.trim()) { alert('Relazione riparazione obbligatoria per ritestare una scheda FAIL.'); forceRunIdleUi(); return; }
          pendingRepairNote = note.trim();
        }
        res = await guardedUi('Avvio ricetta ritest', () => api.startTest(resolveRecipeForExecution414A(recipe, { serial, lotNumber }), serial, { lotNumber, workOrder: lotNumber, overrideDuplicate: true, repairNote: pendingRepairNote, serialRequired: isSerialRequired() }), { timeoutMs: 5000, logTo: document.getElementById('run-log'), fallback: { ok:false, error:'timeout avvio ritest' } });
        pendingRepairNote = '';
        if (!res || !res.ok) { addLog(document.getElementById('run-log'), `❌ ${escapeHtml(res?.error || 'Avvio non riuscito')}`, 'fail'); return; }
      } else {
        addLog(document.getElementById('run-log'), `❌ ${escapeHtml(res?.error || 'Avvio non riuscito')}`, 'fail');
        forceRunIdleUi();
        return;
      }
    }
    if (btnPause) btnPause.disabled = false;
    if (btnStop) btnStop.disabled = false;
  } finally {
    startInProgress = false;
    setTimeout(() => { try { window.__atmec10112StartBusy = false; window.__vexon10114AutoCycleFastStart = false; } catch(e) {} }, 250);
    // Se il main ha accettato la ricetta, RUNNING arriverà via evento. Se non è partita, riabilita start.
    const stateText = document.getElementById('state-pill')?.textContent || '';
    if (btnStart && stateText !== 'RUNNING' && stateText !== 'PAUSED') btnStart.disabled = false;
    if (currentRunState !== 'RUNNING' && currentRunState !== 'PAUSED') forceRunIdleUi();
  }
}

async function stopTest() {
  await stopTestAndReset();
}

async function stopTestAndReset() {
  lastStopWasOperator = true;
  stopWizardLive();
  if (autoPollInterval) { clearInterval(autoPollInterval); autoPollInterval = null; }
  startInProgress = false;
  pendingFailureDecision = false;
  try { document.getElementById('fail-decision-modal')?.classList.remove('show'); } catch {}
  try { document.getElementById('manual-step-modal')?.classList.remove('show'); pendingManualRequestId = null; } catch {}
  if (api) {
    await guardedUi('STOP/RESET test', async () => {
      try { await api.stopTest(); } catch {}
      try { await api.recoverFault(); } catch {}
      return { ok:true };
    }, { timeoutMs: 3500, logTo: document.getElementById('run-log'), fallback:{ok:false} });
  }
  try { if (typeof window.vexon10114ApplySafeProfile === 'function') await window.vexon10114ApplySafeProfile(recipe, 'STOP OPERATORE'); } catch(e) { console.warn('[10.1.14] safe profile stop', e); }
  currentRunState = 'STOP_OPERATORE';
  setProductionTimingState('STOP_OPERATORE');
  setStatePill('READY');
  forceRunIdleUi();
  setUiBusy(false, 'STOP');
  addLog(document.getElementById('run-log'), '⏹ Test fermato. Sistema pronto per nuovo test.', 'warn');
  updateProductionTestMode();
}

async function pauseTest() {
  if (!api) return;
  await guardedUi('PAUSA ricetta', () => api.pauseTest(), { timeoutMs: 2500, logTo: document.getElementById('run-log') });
  document.getElementById('btn-pause').textContent = '▶ RIPRENDI';
  document.getElementById('btn-pause').onclick = resumeTest;
}

async function resumeTest() {
  if (!api) return;
  await guardedUi('RIPRENDI ricetta', () => api.resumeTest(), { timeoutMs: 2500, logTo: document.getElementById('run-log') });
  document.getElementById('btn-pause').textContent = '⏸ PAUSA';
  document.getElementById('btn-pause').onclick = pauseTest;
}

async function toggleDebug(enabled) {
  if (api) { try { await api.setDebugMode(enabled); } catch {} }
  document.getElementById('btn-next-step').disabled = !enabled;
  addLog(document.getElementById('sys-log'), `Debug mode: <b>${enabled ? 'ON' : 'OFF'}</b>`, 'info');
}

async function nextStep() { if (api) await guardedUi('Next step debug', () => api.nextStep(), { timeoutMs: 2500, logTo: document.getElementById('run-log') }); }

async function recoverFault() {
  stopWizardLive();
  if (api) { await guardedUi('RECOVER fault', () => api.recoverFault(), { timeoutMs: 2500 }); }
  document.getElementById('fault-panel')?.classList.remove('show');
  document.getElementById('btn-start').disabled = false;
  document.getElementById('btn-pause').disabled = true;
  document.getElementById('btn-stop').disabled = true;
}


async function respondManualStep(ok) {
  const requestId = pendingManualRequestId;
  if (!requestId || !api) return;
  const manualValue = document.getElementById('manual-step-value')?.value || '';
  pendingManualRequestId = null;
  document.getElementById('manual-step-modal').classList.remove('show');
  await api.manualStepResponse(requestId, { ok, manual_value: manualValue });
}
async function respondManualPassFail(pass) {
  const requestId = pendingManualRequestId;
  if (!requestId || !api) return;
  const manualValue = document.getElementById('manual-step-value')?.value || '';
  pendingManualRequestId = null;
  document.getElementById('manual-step-modal').classList.remove('show');
  await api.manualStepResponse(requestId, { ok: true, manual_result: pass ? 'PASS' : 'FAIL', manual_value: manualValue || (pass ? 'PASS manuale' : 'FAIL manuale') });
}

async function respondFailureAction(action) {
  if (!api) return;
  pendingFailureDecision = false;
  document.getElementById('fail-decision-modal').classList.remove('show');
  await api.failureAction(action);
  if (action === 'stop') setTimeout(stopTestAndReset, 100);
}

function clearLog() { const l=document.getElementById('run-log'); l.innerHTML = ''; l.classList.add('compact'); }

function getRequiredInstrumentsForRecipe() {
  // Calcola gli strumenti realmente richiesti dalla ricetta attiva.
  // Evita di mostrare o validare PL303/Keysight/Scanner se la ricetta non li usa.
  const required = new Set();
  const activeSteps = (recipe.steps || []).filter(s => s && s.enabled !== false);
  const power = recipe.power_metadata || 'MANUAL_POWER';
  const hasRealPl303Step = activeSteps.some(step => {
    const t = String(step.type || '');
    const dev = window.normalizeRecipeInstrumentName ? window.normalizeRecipeInstrumentName(step.device_mapping || step.device || '') : String(step.device_mapping || step.device || '');
    return t === 'PowerSupplySet' || t === 'PowerSupplyMeasureCurrent' || dev === 'AimTTi_PL303';
  });
  if (power === 'ESP32_RELAY_POWER') required.add('modbus_serial');
  const recipeGpioProfiles10114 = ['gpio_initial_profile','gpio_inter_test_profile','gpio_safe_profile'].some(k => Array.isArray(recipe?.[k]) && recipe[k].some(r => r && r.enabled !== false && String(r.channel ?? '').trim() !== '' && Number.isFinite(Number(r.channel))));
  if (recipeGpioProfiles10114) required.add('modbus_serial');
  if (recipe?.automatic_cycle?.enabled === true) required.add(recipe.automatic_cycle.trigger_device || 'Keysight_34461A');
  // 10.1.4: non mostrare/validare PL303 solo perché arriva power_metadata vecchio da WO/commessa.
  if (power === 'PL303_PROGRAMMABLE' && hasRealPl303Step) required.add('AimTTi_PL303');
  for (const step of activeSteps) {
    if (['DI','DO'].includes(step.io_type) || step.type === 'DigitalInputCheck' || step.type === 'DigitalOutputSet' || (step.measurement_gpio_enabled === true && Number.isFinite(Number(step.measurement_gpio_channel)))) required.add('modbus_serial');
    if (['VoltageMeasurement','CurrentMeasurement','ResistanceTest','FrequencyTest','AnalogInputMeasurement','StableMeasurement'].includes(step.type)) required.add(step.device_mapping || 'Keysight_34461A');
    if (step.type === 'PowerSupplySet' || step.type === 'PowerSupplyMeasureCurrent') required.add('AimTTi_PL303');
    if (step.type === 'SCPICommand' && step.device_mapping && step.device_mapping !== 'system') required.add(step.device_mapping);
    if (step.type === 'ManualMeasurement') {
      const manualType = String(step.manual_measure_type || step.io_type || '').toUpperCase();
      const dev = String(step.device_mapping || '').trim();
      const devKey = dev.toLowerCase();
      const manualDevice = !dev || ['manual','manuale','operator','system','none'].includes(devKey);
      const requiresScpiDevice = manualType === 'SCPI' || manualType.startsWith('SCPI_');
      if (requiresScpiDevice && !manualDevice) required.add(dev);
    }
  }
  required.delete('QR_Scanner'); // scanner QR non blocca il test: è input operatore, non strumento di misura obbligatorio.
  required.delete('manual');
  required.delete('manuale');
  required.delete('operator');
  required.delete('system');
  required.delete('none');
  return Array.from(required).map(name => window.normalizeRecipeInstrumentName ? window.normalizeRecipeInstrumentName(name) : name).filter(Boolean);
}

function getInstrumentDisplayName(name) {
  return name === 'modbus_serial' ? 'ESP32' : name === 'AimTTi_PL303' ? 'Alimentatore PL303' : name === 'QR_Scanner' ? 'Scanner QR' : name === 'Keysight_34461A' ? 'Keysight' : String(name || 'Strumento');
}

function renderRecipePrecheckOperations() {
  const required = getRequiredInstrumentsForRecipe();
  const box = document.getElementById('prod-precheck-list') || document.getElementById('dashboard-device-list');
  if (!box) return;
  if (!required.length) return;
  const rows = required.map(name => `<div class="prod-hw-row"><div><b>${escapeHtml(getInstrumentDisplayName(name))}</b><div class="detail-line">Operazione preliminare: collegare/accendere e verificare LIVE prima del test.</div></div><span class="state-led low">CHECK</span></div>`).join('');
  if (box.id === 'dashboard-device-list') box.innerHTML = rows;
}


async function validateRecipeHardwareBeforeStart() {
  const required = new Set(getRequiredInstrumentsForRecipe().filter(name => !(window.isRecipeInstrumentExcluded ? window.isRecipeInstrumentExcluded(name) : excludedInstruments.includes(name))));
  if (!required.size) return { ok: true, missing: [] };

  function readJsonSafe(k, fallback) { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? fallback : v; } catch { return fallback; } }
  function normalizeRows(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.rows)) return raw.rows;
    if (raw && Array.isArray(raw.statuses)) return raw.statuses;
    if (raw && typeof raw === 'object') return Object.entries(raw).map(([k, v]) => Object.assign({ name:k }, (v && typeof v === 'object') ? v : { status:v }));
    return [];
  }
  function txt(x) { return String((x && (x.name || x.device || x.label || x.type || x.group || x.driver || x._logical || x._title)) || '').toLowerCase(); }
  function aliasesFor(name) {
    const n = String(name || '').toLowerCase();
    if (n === 'modbus_serial' || n.includes('esp32')) return ['modbus_serial','esp32','esp32-s3','controller'];
    if (n === 'aimtti_pl303' || n.includes('pl303') || n.includes('alimentatore') || n.includes('tti')) return ['aimtti_pl303','pl303','tti','alimentatore','power'];
    if (n === 'keysight_34461a' || n.includes('keysight') || n.includes('34461') || n.includes('multimet')) return ['keysight_34461a','keysight','34461','multimetro','dmm'];
    if (n.includes('scanner') || n.includes('qr')) return ['qr_scanner','scanner','barcode'];
    return [n];
  }
  function isLive(st) {
    if (!st) return false;
    if (st.manualSimulation || st.mock === true || String(st.status || st.state || '').toUpperCase().includes('SIM')) return false;
    if (st.live === true || st.connected === true || st.ok === true || st.online === true) return true;
    const s = String(st.status || st.state || '').toUpperCase();
    return ['ONLINE','LIVE','CONNECTED','OK'].includes(s);
  }
  function findStatus(name, rows) {
    const aliases = aliasesFor(name);
    return rows.find(x => aliases.some(a => txt(x).includes(a))) || null;
  }
  function sharedStatusRows() {
    const shared = readJsonSafe('atmec67c_device_status_shared', {});
    const rows = [];
    if (shared && typeof shared === 'object') {
      Object.entries(shared).forEach(([key, value]) => {
        if (value && typeof value === 'object') rows.push(Object.assign({ name:key }, value));
      });
    }
    return rows;
  }

  // VEXON 10.1.9: se gli strumenti richiesti sono già LIVE nella cache condivisa,
  // non bloccare l'avvio ricetta con interrogazioni lente e ripetute.
  const cachedRows = normalizeRows(latestHardwareStatuses || []).concat(sharedStatusRows());
  if (cachedRows.length && [...required].every(name => isLive(findStatus(name, cachedRows)))) {
    latestHardwareStatuses = cachedRows;
    return { ok: true, missing: [] };
  }

  let rows = [];
  try { rows = normalizeRows(await withTimeout(api.getHardwareStatuses(), 700, 'stato hardware')); } catch { rows = []; }
  const sharedRows = sharedStatusRows();
  latestHardwareStatuses = rows.concat(sharedRows);

  // ESP32 può essere verificato anche dal backend JSON, ma solo se realmente richiesto.
  if (required.has('modbus_serial')) {
    let espStatus = findStatus('modbus_serial', latestHardwareStatuses);
    if (!isLive(espStatus)) {
      try {
        const info = await withTimeout(api.getEsp32Info?.(), 1800, 'info ESP32');
        if (info?.live === true) latestHardwareStatuses.push({ name:'modbus_serial', mock:false, connected:true, live:true, connectionString: info.connectionString || 'ESP32 JSON' });
      } catch {}
    }
  }

  const missing = [...required].filter(name => !(window.isRecipeInstrumentExcluded ? window.isRecipeInstrumentExcluded(name) : excludedInstruments.includes(name)) && !isLive(findStatus(name, latestHardwareStatuses)));
  return { ok: missing.length === 0, missing };
}

async function queryMeter(cmd, elId, unit) {
  if (meterPollBusy) return;
  meterPollBusy = true;
  try {
    if (!api) {
      const mock = (4.98 + Math.random() * 0.04);
      document.getElementById(elId).textContent = mock.toFixed(4);
      if (elId === 'm-volt') { trendData.push(mock); if (trendData.length > 120) trendData.shift(); drawTrend(); }
      return;
    }
    const device = document.getElementById('meter-device').value;
    const val = await withTimeout(api.queryMultimeter(device, cmd), 12000, 'Multimetro Keysight');
    const num = parseFloat(val);
    const el = document.getElementById(elId);
    if (el) el.textContent = isNaN(num) ? val : (num.toFixed(4) + (unit ? ' ' + unit : ''));
    addLog(document.getElementById('keysight-log'), `↔ ${escapeHtml(cmd)} → ${escapeHtml(String(val))}`, isNaN(num) && String(val).includes('TIMEOUT') ? 'warn' : 'info');
    if (elId === 'm-volt' && !isNaN(num)) {
      trendData.push(num);
      if (trendData.length > 120) trendData.shift();
      drawTrend();
    }
  } catch(e) {
    addLog(document.getElementById('sys-log'), `⚠️ Lettura multimetro non completata: ${escapeHtml(normalizeError(e))}`, 'warn');
  } finally {
    meterPollBusy = false;
  }
}

function toggleAutoPoll(on) {
  if (on) {
    if (autoPollInterval) return;
    const cmd = document.getElementById('meter-live-command')?.value || 'MEAS:VOLT:DC?';
    queryMeter(cmd, cmd.includes('CURR') ? 'm-curr' : cmd.includes('RES') ? 'm-res' : 'm-volt', cmd.includes('CURR') ? 'A' : cmd.includes('RES') ? 'Ω' : 'V');
    autoPollInterval = setInterval(() => { const c = document.getElementById('meter-live-command')?.value || 'MEAS:VOLT:DC?'; queryMeter(c, c.includes('CURR') ? 'm-curr' : c.includes('RES') ? 'm-res' : 'm-volt', c.includes('CURR') ? 'A' : c.includes('RES') ? 'Ω' : 'V'); }, 1500);
  } else {
    if (autoPollInterval) clearInterval(autoPollInterval);
    autoPollInterval = null;
    meterPollBusy = false;
  }
}

function drawTrend() {
  const canvas = document.getElementById('trendChart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#0d0d14'; ctx.fillRect(0, 0, W, H);
  if (trendData.length < 2) return;
  const min = Math.min(...trendData) - 0.1;
  const max = Math.max(...trendData) + 0.1;
  const range = max - min || 1;
  ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = H - (i / 4) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = '#9090b0'; ctx.font = '9px monospace';
    ctx.fillText((min + (i / 4) * range).toFixed(3) + 'V', 2, y - 2);
  }
  ctx.beginPath(); ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2;
  trendData.forEach((v, i) => {
    const x = (i / (trendData.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  const last = trendData[trendData.length - 1];
  ctx.fillStyle = '#00d4ff'; ctx.font = 'bold 11px monospace';
  ctx.fillText(last.toFixed(4) + 'V', W - 75, 14);
}

async function runFlash() {
  const tool = document.getElementById('flash-tool').value;
  const op   = document.getElementById('flash-op').value;
  const fp   = document.getElementById('flash-path').value || 'mock';
  const log  = document.getElementById('flash-log');
  log.textContent = `[${ts()}] Avvio ${op} su ${tool}...\n`;
  document.getElementById('flash-status').textContent = '⏳ In corso...';
  document.getElementById('flash-status').style.color = 'var(--warn)';
  if (!api) {
    setTimeout(() => {
      log.textContent += '[MOCK] Connecting via SWD... OK\n[MOCK] ' + op + ' completed.\n[MOCK] Verify OK';
      document.getElementById('flash-status').textContent = '✅ SUCCESSO (mock)';
      document.getElementById('flash-status').style.color = 'var(--pass)';
    }, 1200);
    return;
  }
  try {
    const res = await api.flashFirmware(tool, op, fp);
    log.textContent += res.output;
    log.scrollTop = log.scrollHeight;
    if (res.success) {
      document.getElementById('flash-status').textContent = '✅ SUCCESSO';
      document.getElementById('flash-status').style.color = 'var(--pass)';
    } else {
      document.getElementById('flash-status').textContent = '❌ FALLITO';
      document.getElementById('flash-status').style.color = 'var(--fail)';
    }
  } catch(e) {
    log.textContent += '\n❌ Errore: ' + e.message;
    document.getElementById('flash-status').textContent = '❌ ERRORE';
    document.getElementById('flash-status').style.color = 'var(--fail)';
  }
}

function clearFlashLog() {
  document.getElementById('flash-log').textContent = '';
  document.getElementById('flash-status').textContent = '';
}

async function browseFile() {
  if (!api) { alert('Funzione disponibile solo in Electron.'); return; }
  try {
    const f = await api.openFileDialog();
    if (f) document.getElementById('flash-path').value = f;
  } catch {}
}

function getAuditFilters() {
  return {
    q: document.getElementById('audit-filter')?.value || '',
    serial: document.getElementById('audit-serial')?.value || '',
    lot: document.getElementById('audit-lot')?.value || '',
    operator: document.getElementById('audit-operator')?.value || '',
    result: document.getElementById('audit-result')?.value || 'ALL',
    dateFrom: document.getElementById('audit-date-from')?.value || '',
    dateTo: document.getElementById('audit-date-to')?.value || ''
  };
}
async function loadAudit() {
  if (!api) { renderAuditTable([]); return; }
  try {
    auditCache = await api.getAuditHistory(getAuditFilters());
    renderAuditTable(auditCache);
  } catch { renderAuditTable([]); }
}
function clearAuditFilters() {
  ['audit-filter','audit-serial','audit-lot','audit-operator','audit-date-from','audit-date-to'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const r=document.getElementById('audit-result'); if(r) r.value='ALL';
  loadAudit();
}
function renderAuditTable(data) {
  const body = document.getElementById('audit-body');
  if (!body) return;
  body.innerHTML = (data || []).slice().reverse().map(r => `
    <tr>
      <td>${new Date(r.timestamp).toLocaleString('it-IT')}</td>
      <td>${escapeHtml(r.lot_number || r.work_order || '')}</td>
      <td>${escapeHtml(r.operator || '')}</td>
      <td>${escapeHtml(r.recipe_name || '')} v${escapeHtml(String(r.recipe_version || ''))}</td>
      <td style="font-family:monospace;">${escapeHtml(r.serial_dut || '')}</td>
      <td>${escapeHtml(r.station_name || r.station_id || '')}</td>
      <td>${((r.execution_time_ms || 0) / 1000).toFixed(2)}s</td>
      <td class="${r.final_result === 'PASS' ? 'tag-pass' : 'tag-fail'}">${escapeHtml(r.final_result || '')}</td>
      <td>${escapeHtml(r.repair_note || '')}</td>
    </tr>`).join('');
}
function filterAudit(q) { if(document.getElementById('audit-filter')) document.getElementById('audit-filter').value = q || ''; loadAudit(); }

function openTestReportFromTestMode() {
  document.body.classList.remove('production-test-active');
  productionTestMode = false;
  showTab('audit-tab', document.querySelector('[data-tab=audit]'));
  const sn = getSerialDutRaw();
  const lot = getLotNumber();
  if (sn && document.getElementById('audit-serial')) document.getElementById('audit-serial').value = sn;
  if (lot && document.getElementById('audit-lot')) document.getElementById('audit-lot').value = lot;
  loadAudit();
}
function downloadTextFile(filename, text, mime='text/plain') {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function auditRowsForExport(kind='ALL') {
  let rows = Array.isArray(auditCache) ? auditCache.slice() : [];
  if (kind === 'PASS') rows = rows.filter(r => String(r.final_result || '').toUpperCase() === 'PASS');
  if (kind === 'FAIL') rows = rows.filter(r => String(r.final_result || '').toUpperCase() === 'FAIL');
  return rows;
}
function exportAuditCsv(kind='ALL') {
  const rows = auditRowsForExport(kind);
  const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = ['Data test','Commessa','Operatore','Ricetta','Revisione','Seriale','Esito','Tempo_s','Riparazione'];
  const body = rows.map(r => [
    new Date(r.timestamp).toLocaleString('it-IT'), r.lot_number || r.work_order || '', r.operator || '', r.recipe_name || '', r.recipe_version || '', r.serial_dut || '', r.final_result || '', ((r.execution_time_ms || 0)/1000).toFixed(2), r.repair_note || ''
  ].map(esc).join(';')).join('\n');
  downloadTextFile(`AT-MEC_storico_${kind}_${new Date().toISOString().slice(0,10)}.csv`, head.map(esc).join(';') + '\n' + body, 'text/csv');
}
function exportSerialHistoryPdf() {
  const serial = document.getElementById('audit-serial')?.value?.trim() || getSerialDutRaw();
  if (!serial) { alert('Inserisci o seleziona un Serial Number per esportare lo storico scheda.'); return; }
  const lot = document.getElementById('audit-lot')?.value?.trim() || getLotNumber();
  const rows = (Array.isArray(auditCache) ? auditCache : []).filter(r => String(r.serial_dut || '') === serial && (!lot || String(r.lot_number || r.work_order || '') === lot)).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
  let html = `<html><head><title>Storico ${escapeHtml(serial)}</title><style>body{font-family:Arial;padding:28px}h1{font-size:22px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:6px;font-size:12px}.pass{color:green;font-weight:bold}.fail{color:red;font-weight:bold}
/* AT-MEC_HM_3.16 - Report/export/backup, storico seriali e KPI migliorati */
.db-panel-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;}
.db-mini-table{width:100%;border-collapse:collapse;font-size:12px;}
.db-mini-table th,.db-mini-table td{border-bottom:1px solid var(--border);padding:6px;text-align:left;vertical-align:top;}
.db-mini-table th{color:var(--text2);font-size:10px;letter-spacing:.8px;text-transform:uppercase;}
.serial-history-card{border:1px solid var(--border);border-radius:14px;background:rgba(255,255,255,.035);padding:10px;margin-top:10px;}
.trend-bar{height:9px;border-radius:999px;background:rgba(0,212,255,.28);display:inline-block;min-width:4px;}
.recipe-var-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid rgba(0,212,255,.25);background:rgba(0,212,255,.08);border-radius:999px;padding:3px 8px;margin:2px;font-size:11px;}
@media(max-width:1100px){.db-panel-grid{grid-template-columns:1fr;}}


/* AT-MEC_HM_3.33_TEST_LIGHT - UX compatta e ordinata */
.chrome-toggle{min-width:72px;}
body.left-rail-collapsed #sidebar{position:absolute;left:-280px;top:43px;bottom:0;z-index:7000;box-shadow:18px 0 40px rgba(0,0,0,.45);transition:left .18s ease;}
body.left-rail-open #sidebar{position:absolute;left:0;top:43px;bottom:0;z-index:7000;box-shadow:18px 0 40px rgba(0,0,0,.45);transition:left .18s ease;}
body.right-rail-collapsed #right{position:absolute;right:-310px;top:43px;bottom:0;z-index:7000;box-shadow:-18px 0 40px rgba(0,0,0,.45);transition:right .18s ease;}
body.right-rail-open #right{position:absolute;right:0;top:43px;bottom:0;z-index:7000;box-shadow:-18px 0 40px rgba(0,0,0,.45);transition:right .18s ease;}
body.right-step-compact #current-step-box .detail-line, body.right-step-compact #current-step-box pre{display:none!important;}
#run-tab .brand-hero{min-height:58px!important;padding:8px 12px!important;display:grid!important;grid-template-columns:minmax(220px,1fr) minmax(280px,.75fr)!important;gap:10px!important;align-items:center!important;}
#run-tab .brand-hero img{display:none!important;}
#run-tab .brand-hero .run-mini-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
#run-tab>.kpi-grid{display:none!important;}
.dashboard-production-grid{grid-template-columns:minmax(0,1fr) minmax(260px,.45fr)!important;}
.dashboard-card{padding:10px!important;border-radius:14px!important;}
.dashboard-card h3{font-size:13px!important;margin-bottom:7px!important;}
.dashboard-start-row{grid-template-columns:repeat(4,minmax(110px,1fr))!important;gap:8px!important;}
.dashboard-start-row .btn{min-height:42px!important;font-size:13px!important;padding:8px 10px!important;}
.run-actions-modern{display:none!important;}
.prod-actions{display:grid!important;grid-template-columns:repeat(5,minmax(90px,1fr))!important;gap:6px!important;}
.prod-actions .btn{min-height:38px!important;font-size:11px!important;padding:7px!important;}
.prod-kpis{transform:scale(.82);transform-origin:top right;margin-bottom:-14px!important;}
.prod-test-body{grid-template-columns:minmax(0,1fr) minmax(240px,.38fr)!important;}
.prod-info-cell{border:1px solid rgba(0,212,255,.18)!important;border-radius:12px!important;background:rgba(0,212,255,.045)!important;}
.prod-meta-row-225{align-items:stretch!important;}
.prod-timing-strip{text-align:center!important;justify-content:center!important;}
.prod-time-cell{text-align:center!important;}
#recipe-tab{font-size:11px!important;}
.recipe-page-layout{grid-template-columns:300px minmax(0,1fr)!important;gap:9px!important;}
.recipe-big-card,.modern-panel{padding:9px!important;border-radius:12px!important;}
.recipe-template-grid{grid-template-columns:repeat(auto-fit,minmax(118px,1fr))!important;gap:6px!important;}
.recipe-template-btn{padding:8px!important;min-height:58px!important;font-size:11px!important;border-radius:11px!important;}
.recipe-template-btn span{font-size:10px!important;}
.recipe-flow-card{grid-template-columns:42px minmax(0,1fr) auto!important;gap:8px!important;padding:9px!important;border-radius:13px!important;}
.recipe-flow-icon{width:36px!important;height:36px!important;border-radius:12px!important;font-size:20px!important;}
.recipe-flow-title{font-size:13px!important;}
.recipe-flow-desc{font-size:10.5px!important;}
.recipe-inline-edit{grid-template-columns:repeat(auto-fit,minmax(86px,1fr))!important;gap:5px!important;padding:7px!important;}
.recipe-inline-edit input,.recipe-inline-edit select{height:29px!important;font-size:11px!important;border:1px solid rgba(0,212,255,.38)!important;background:rgba(0,212,255,.055)!important;}
.manual-clear-alert{border:1px solid rgba(243,156,18,.65);background:rgba(243,156,18,.12);color:#ffd58a;border-radius:12px;padding:10px;margin:8px 0;font-weight:800;line-height:1.35;}
.manual-input-panel{border:2px solid rgba(0,212,255,.58);border-radius:14px;background:rgba(0,212,255,.08);padding:12px;margin-top:10px;}
.manual-measure-input{height:48px!important;font-size:22px!important;font-weight:900!important;text-align:center!important;border-color:var(--accent)!important;background:#071923!important;}
.manual-action-grid{grid-template-columns:repeat(3,minmax(160px,1fr))!important;}
.logo-white-local,#login-large-logo,#login-developer-logo,#app-large-logo,#developer-small-logo,#prod-company-logo,#prod-dev-logo{background:#fff!important;padding:8px!important;box-shadow:0 0 0 1px rgba(0,0,0,.08)!important;filter:none!important;}
#prod-company-logo{max-width:120px!important;max-height:48px!important;}
#prod-dev-logo{max-width:105px!important;max-height:42px!important;}



/* AT-MEC_HM_3.33_TEST_LIGHT - major UI/UX, Communication Hub, misure live */
:root{--atmec-compact-scale:.92;}
input[type="checkbox"]{appearance:none;-webkit-appearance:none;width:42px!important;height:22px!important;min-width:42px;border-radius:999px!important;border:1px solid rgba(255,255,255,.22)!important;background:rgba(255,255,255,.14)!important;position:relative;vertical-align:middle;cursor:pointer;transition:.16s ease;}
input[type="checkbox"]:before{content:"";position:absolute;width:16px;height:16px;border-radius:50%;left:3px;top:2px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.35);transition:.16s ease;}
input[type="checkbox"]:checked{background:linear-gradient(90deg,var(--accent),#22c55e)!important;border-color:rgba(34,197,94,.8)!important;}
input[type="checkbox"]:checked:before{left:21px;}
input[type="checkbox"]:after{content:"OFF";position:absolute;right:5px;top:4px;font-size:8px;font-weight:900;color:rgba(255,255,255,.78);}
input[type="checkbox"]:checked:after{content:"ON";left:5px;right:auto;color:#031417;}
.submenu-device,.nav-group{border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.035);margin:7px 0;padding:5px;}
.submenu-device summary,.nav-group summary{cursor:pointer;list-style:none;font-weight:900;font-size:12px;padding:8px;border-radius:9px;color:var(--text);display:flex;justify-content:space-between;align-items:center;}
.submenu-device summary::-webkit-details-marker,.nav-group summary::-webkit-details-marker{display:none;}
.submenu-device[open] summary,.nav-group[open] summary{background:rgba(0,212,255,.075);color:var(--accent);}
.submenu-btn{margin-top:4px!important;font-size:11px!important;min-height:30px!important;padding:6px 8px!important;}
body.left-rail-collapsed #main{grid-template-columns:0 minmax(0,1fr) 0!important;}
body.left-rail-open #sidebar,body.right-rail-open #right{backdrop-filter:blur(10px);}
#run-tab .brand-hero{min-height:44px!important;padding:6px 9px!important;grid-template-columns:minmax(180px,1fr) minmax(240px,.52fr)!important;}
#run-tab .brand-hero [style*="font-size:22px"]{font-size:17px!important;}
#run-tab .brand-hero [style*="font-size:12px"]{display:none!important;}
#run-tab .run-mini-kpi,.run-mini-kpi{transform:scale(.78);transform-origin:top right;justify-self:end;}
.dashboard-production-grid{grid-template-columns:minmax(0,.62fr) minmax(280px,.38fr)!important;gap:8px!important;}
.dashboard-card,.recipe-big-card,.modern-panel{transform:scale(var(--atmec-compact-scale));transform-origin:top left;}
.recipe-step-workspace{max-width:100%;}
.recipe-page-layout{grid-template-columns:260px minmax(0,1fr)!important;align-items:start!important;}
#recipe-steps-page-list{max-width:100%;}
.recipe-flow-card{max-width:100%;}
.recipe-compact-step-details{display:none;margin-top:8px;border:1px dashed rgba(255,255,255,.14);border-radius:10px;padding:8px;background:rgba(0,0,0,.14);}
body.recipe-details-visible .recipe-compact-step-details{display:block;}
.recipe-customer-toolbar{display:grid;grid-template-columns:repeat(2,minmax(130px,1fr));gap:8px;}
.recipe-customer-toolbar input{height:32px!important;font-size:12px!important;}
.prod-kpis{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:6px!important;transform:scale(.70)!important;transform-origin:top right!important;margin-left:auto!important;max-width:260px!important;}
.prod-kpi{padding:7px!important;border-radius:10px!important;}
.prod-kpi .num{font-size:18px!important;}
.prod-kpi .lbl{font-size:9px!important;}
.prod-actions-vertical-318{grid-template-columns:1fr!important;}
.prod-big-action{min-height:58px!important;font-size:13px!important;}
.prod-current-step{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;}
.step-live-measure-panel{border:1px solid rgba(0,212,255,.32);border-radius:14px;background:rgba(0,212,255,.07);padding:10px;margin-top:8px;}
.step-live-measure-panel .live-title{font-size:11px;color:var(--text2);letter-spacing:.9px;text-transform:uppercase;font-weight:900;}
.step-live-measure-panel .live-value{font-size:28px;font-weight:950;color:var(--accent);font-family:monospace;line-height:1.15;}
.step-live-measure-panel .live-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px;}
.step-live-measure-panel .live-cell{border:1px solid var(--border);border-radius:10px;padding:6px;background:rgba(0,0,0,.14);font-size:10px;}
.step-live-measure-panel .live-cell b{display:block;font-size:12px;color:var(--text);}
.manual-clear-alert{font-size:14px!important;border-width:2px!important;}
.manual-measure-input{outline:3px solid rgba(0,212,255,.18);}
.db-kpi-page-319{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:12px;align-items:start;}
.db-kpi-compact-right{position:sticky;top:6px;display:grid;gap:7px;}
.db-kpi-small{border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.04);padding:8px;text-align:right;}
.db-kpi-small .n{font-size:20px;font-weight:950;color:var(--accent);}
.db-action-row-319{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.comm-grid{display:grid;grid-template-columns:320px minmax(0,1fr) 340px;gap:12px;align-items:start;}
.comm-card{border:1px solid var(--border);border-radius:16px;background:rgba(255,255,255,.04);padding:12px;}
.comm-log{height:430px;overflow:auto;background:#05070b;border:1px solid var(--border);border-radius:12px;padding:10px;font-family:monospace;font-size:12px;white-space:pre-wrap;}
.comm-row-rx{color:#9be7ff}.comm-row-tx{color:#9dffb0}.comm-row-sys{color:#ffd98a}.comm-pass{color:var(--pass);font-weight:900}.comm-fail{color:var(--fail);font-weight:900}
@media(max-width:1200px){.comm-grid{grid-template-columns:1fr}.db-kpi-page-319{grid-template-columns:1fr}.recipe-page-layout{grid-template-columns:1fr!important}.prod-kpis{max-width:none!important}}



/* AT-MEC_HM_3.30 - correzioni reali da base 3.30 */
html, body { height:100%; overflow:auto !important; }
#center, .tab-content, #production-test-mode, .prod-test-body { overflow:auto !important; }
body.production-test-active #production-test-mode { display:flex !important; flex-direction:column !important; height:100vh !important; max-height:100vh !important; overflow-y:auto !important; padding-bottom:24px !important; }
body.production-test-active .prod-test-body { flex:1 1 auto !important; min-height:0 !important; overflow-y:auto !important; grid-template-columns:minmax(0,1fr) minmax(260px,340px) !important; align-items:start !important; }
.prod-panel { min-height:0 !important; }
.prod-meta-row-318 { grid-template-columns:minmax(160px,.8fr) minmax(220px,1fr) minmax(220px,1fr) !important; gap:10px !important; }
.prod-info-cell, .prod-check-card { min-height:72px !important; padding:8px 10px !important; }
.prod-check-card label { margin-bottom:4px !important; }
.prod-inline-control { height:28px !important; min-height:28px !important; padding:3px 8px !important; display:grid !important; grid-template-columns:1fr 48px !important; align-items:center !important; gap:8px !important; font-size:11px !important; }
.prod-inline-control input[type="checkbox"] { justify-self:end !important; margin-left:auto !important; width:42px !important; min-width:42px !important; height:22px !important; transform:none !important; }
.prod-input-row { height:30px !important; }
.prod-input-row input { height:30px !important; }
.prod-boxed-hint { min-height:30px !important; padding:5px 7px !important; font-size:10px !important; }
.prod-kpis { transform:none !important; max-width:none !important; width:100% !important; grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:10px !important; margin:0 0 10px 0 !important; }
.prod-kpi { min-height:72px !important; padding:12px !important; display:flex !important; flex-direction:column !important; justify-content:center !important; align-items:center !important; }
.prod-kpi .num { font-size:28px !important; line-height:1 !important; }
.prod-kpi .lbl { font-size:11px !important; text-align:center !important; }
.prod-actions-vertical-318 { display:grid !important; grid-template-columns:1fr !important; gap:10px !important; margin-top:8px !important; }
.prod-actions-vertical-318 .prod-big-action { width:100% !important; min-height:58px !important; height:58px !important; display:flex !important; align-items:center !important; justify-content:center !important; text-align:center !important; gap:10px !important; border-radius:14px !important; box-shadow:0 10px 22px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.14) !important; }
.prod-actions-vertical-318 .action-ico { font-size:22px !important; filter:drop-shadow(0 2px 2px rgba(0,0,0,.3)); }
.prod-right-timing-326 { margin:8px 0 10px !important; display:grid !important; grid-template-columns:1fr 1fr !important; gap:8px !important; }
.prod-right-timing-326 #prod-state-cell { grid-column:1 / -1 !important; order:3 !important; }
.prod-right-timing-326 .prod-time-cell { min-height:54px !important; padding:8px !important; border:1px solid var(--border); border-radius:12px; background:rgba(255,255,255,.045); }
.prod-right-timing-326 .prod-time-cell b { font-size:18px !important; }
.prod-current-step { overflow:visible !important; }
#prod-current-step.value { white-space:normal !important; overflow-wrap:anywhere !important; line-height:1.25 !important; max-height:none !important; }
.prod-status-banner { min-height:48px !important; display:flex !important; align-items:center !important; justify-content:center !important; font-size:18px !important; }
.dashboard-production-grid { grid-template-columns:minmax(0,.50fr) minmax(320px,.50fr) !important; }
#run-tab .prod-kpis, #run-tab .run-mini-kpi { transform:scale(1.2) !important; transform-origin:top right !important; }
.db-kpi-page-319, .db-kpi-page-326 { display:grid !important; grid-template-columns:minmax(0,1fr) 300px !important; gap:14px !important; align-items:start !important; }
.db-kpi-compact-right { position:sticky !important; top:10px !important; display:grid !important; gap:8px !important; }
.recipe-page-layout { display:grid !important; grid-template-columns:minmax(300px,380px) minmax(0,1fr) !important; gap:14px !important; align-items:start !important; }
#recipe-tab .recipe-big-card { transform:none !important; }
.recipe-page-toolbar { display:grid !important; grid-template-columns:repeat(4,minmax(145px,1fr)) !important; gap:8px !important; align-items:end !important; margin-bottom:8px !important; }
.recipe-actions-grid { display:flex !important; flex-wrap:wrap !important; justify-content:flex-start !important; gap:8px !important; margin:8px 0 10px !important; padding:8px !important; border:1px solid var(--border); border-radius:12px; background:rgba(0,0,0,.12); }
.recipe-actions-grid .btn { min-height:34px !important; padding:7px 10px !important; }
.recipe-template-grid { display:grid !important; grid-template-columns:1fr !important; gap:8px !important; max-height:520px !important; overflow:auto !important; }
.recipe-template-btn { min-height:54px !important; text-align:left !important; }
.recipe-step-workspace { min-width:0 !important; }
#recipe-steps-page-list { display:grid !important; gap:10px !important; }
.recipe-flow-card { width:100% !important; max-width:none !important; }
.recipe-preview-326 { margin-top:10px; border:1px solid rgba(0,212,255,.24); border-radius:14px; background:rgba(0,212,255,.06); padding:10px; }
.recipe-preview-326-title { font-size:12px; font-weight:900; color:var(--accent); text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; }
.recipe-preview-326-flow { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.recipe-preview-326-chip { border:1px solid var(--border); background:rgba(0,0,0,.20); border-radius:999px; padding:5px 8px; font-size:11px; font-weight:800; }
.recipe-stopfail-326 { margin-top:8px; padding:7px 8px; border:1px solid rgba(255,193,7,.25); border-radius:10px; background:rgba(255,193,7,.06); display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:11px; font-weight:800; }
.comm-step-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; margin:10px 0; }
#device-tab .device-manager-mini { margin-top:12px; }
.logo-halo-fix, #prod-company-logo, #prod-dev-logo { background:#fff !important; border-radius:10px !important; padding:4px !important; object-fit:contain !important; }
@media(max-width:1100px){ body.production-test-active .prod-test-body,.recipe-page-layout,.db-kpi-page-319,.db-kpi-page-326{grid-template-columns:1fr!important}.recipe-page-toolbar{grid-template-columns:1fr 1fr!important}.prod-right-timing-326{grid-template-columns:1fr!important}.comm-step-actions{grid-template-columns:1fr!important} }



/* AT-MEC_HM_3.31 - correzioni richieste: login INVIO, FAIL per step, layout KPI/Test Mode/Ricette */
html, body { min-height:100%; overflow:auto !important; }
body.production-test-active { overflow:auto !important; }
body.production-test-active #production-test-mode { overflow-y:auto !important; overflow-x:hidden !important; padding-bottom:28px !important; }
body.production-test-active .prod-test-body { align-items:start !important; padding-bottom:30px !important; }
body.production-test-active .prod-kpis { display:grid !important; grid-template-columns:1fr 1fr !important; gap:12px !important; width:100% !important; max-width:430px !important; }
body.production-test-active .prod-kpi { min-height:86px !important; padding:14px !important; display:flex !important; flex-direction:column !important; justify-content:center !important; }
body.production-test-active .prod-kpi .num { font-size:clamp(28px,3vw,42px) !important; line-height:1 !important; }
body.production-test-active .prod-kpi .lbl { font-size:12px !important; white-space:normal !important; }
body.production-test-active .prod-actions-vertical-318 { margin-top:12px !important; display:flex !important; flex-direction:column !important; align-items:stretch !important; gap:10px !important; }
body.production-test-active .prod-big-action { justify-content:flex-start !important; text-align:center !important; min-height:58px !important; padding:12px 16px !important; font-size:15px !important; border-radius:14px !important; }
body.production-test-active .prod-big-action span:last-child { flex:1; text-align:center; }
body.production-test-active .action-ico { font-size:22px !important; width:36px !important; text-align:center !important; }
body.production-test-active .prod-current-step { overflow:visible !important; min-height:110px !important; }
body.production-test-active #prod-current-step { white-space:normal !important; overflow-wrap:anywhere !important; word-break:break-word !important; line-height:1.25 !important; }
body.production-test-active .prod-status-banner { width:100% !important; min-height:58px !important; font-size:22px !important; display:flex !important; align-items:center !important; justify-content:center !important; }
body.production-test-active .prod-meta-row-318 { align-items:stretch !important; }
body.production-test-active .prod-check-card { min-height:112px !important; padding:10px 12px !important; display:grid !important; grid-template-rows:auto auto 1fr !important; }
body.production-test-active .prod-inline-control { justify-content:space-between !important; gap:12px !important; }
body.production-test-active .prod-inline-control input[type="checkbox"] { width:48px !important; height:24px !important; flex:0 0 auto !important; accent-color:var(--accent) !important; }
body.production-test-active .prod-input-row input { min-height:34px !important; }
body.production-test-active .prod-boxed-hint { min-height:34px !important; padding:6px 8px !important; }
body.production-test-active .prod-right-timing-326, body.production-test-active .prod-timing-strip { display:grid !important; grid-template-columns:1fr !important; gap:8px !important; margin:0 0 12px 0 !important; }
body.production-test-active .prod-time-cell { min-height:54px !important; }
#db-tab, #audit-tab { overflow:auto !important; }
#db-tab .recipe-big-card, #db-tab .kpi-card, #db-tab .log-list { position:relative !important; z-index:auto !important; }
#db-tab .kpi-grid { display:grid !important; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)) !important; gap:12px !important; margin:12px 0 !important; }
#db-tab .db-panel-grid { display:grid !important; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)) !important; gap:12px !important; align-items:start !important; }
#db-tab .recipe-page-toolbar { display:grid !important; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)) !important; gap:10px !important; align-items:end !important; }
#recipe-tab { overflow:auto !important; }
#recipe-tab .recipe-page-toolbar { display:grid !important; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)) !important; gap:10px !important; align-items:end !important; margin-bottom:8px !important; }
#recipe-tab .recipe-actions-grid { display:flex !important; flex-wrap:wrap !important; align-items:center !important; justify-content:flex-start !important; gap:8px !important; margin:8px 0 12px !important; padding:8px !important; border:1px solid var(--border) !important; border-radius:12px !important; background:rgba(0,0,0,.14) !important; position:sticky !important; top:0 !important; z-index:5 !important; }
#recipe-tab .recipe-page-layout { display:grid !important; grid-template-columns:280px minmax(0,1fr) !important; gap:14px !important; align-items:start !important; }
#recipe-tab .recipe-template-grid { display:grid !important; grid-template-columns:1fr !important; gap:8px !important; max-height:calc(100vh - 260px) !important; overflow:auto !important; }
#recipe-tab .recipe-template-btn { width:100% !important; text-align:left !important; min-height:48px !important; }
#recipe-tab #recipe-steps-page-list { display:grid !important; gap:10px !important; }
.recipe-stopfail-331 { margin-top:8px; padding:8px 10px; border:1px solid rgba(255,193,7,.35); border-radius:10px; background:rgba(255,193,7,.08); display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:12px; font-weight:800; }
.recipe-stopfail-331 input[type="checkbox"] { width:46px; height:22px; accent-color:var(--warn); flex:0 0 auto; }
.step-live-measure-panel { margin-top:10px !important; border:1px solid rgba(0,212,255,.28) !important; border-radius:14px !important; background:rgba(0,212,255,.07) !important; padding:10px !important; }
.step-live-measure-panel .live-value { font-size:30px !important; font-weight:900 !important; text-align:center !important; color:var(--accent) !important; }
.step-live-measure-panel .live-grid { display:grid !important; grid-template-columns:repeat(3,minmax(0,1fr)) !important; gap:6px !important; }
.step-live-measure-panel .live-cell { border:1px solid var(--border); border-radius:9px; padding:6px; font-size:10px; color:var(--text2); }
.step-live-measure-panel .live-cell b { display:block; color:var(--text); font-size:12px; margin-top:2px; overflow:hidden; text-overflow:ellipsis; }
@media(max-width:1150px){ #recipe-tab .recipe-page-layout{grid-template-columns:1fr!important} body.production-test-active .prod-test-body{grid-template-columns:1fr!important} }

</style></head><body>`;
  html += `<h1>AT-MEC - Storico scheda e riparazioni</h1><p><b>Serial Number:</b> ${escapeHtml(serial)}<br><b>Commessa:</b> ${escapeHtml(lot || 'Tutte')}</p>`;
  html += `<table><thead><tr><th>Data</th><th>Esito</th><th>Ricetta</th><th>Rev</th><th>Operatore</th><th>Riparazione / Intervento</th></tr></thead><tbody>`;
  html += rows.map(r => `<tr><td>${new Date(r.timestamp).toLocaleString('it-IT')}</td><td class="${String(r.final_result).toLowerCase()}">${escapeHtml(r.final_result || '')}</td><td>${escapeHtml(r.recipe_name || '')}</td><td>${escapeHtml(String(r.recipe_version || ''))}</td><td>${escapeHtml(r.operator || '')}</td><td>${escapeHtml(r.repair_note || '')}</td></tr>`).join('');
  html += `</tbody></table><p style="margin-top:22px;font-size:11px">Generato da AT-MEC HM</p></body></html>`;
  const w = window.open('', '_blank');
  if (!w) { downloadTextFile(`storico_${serial}.html`, html, 'text/html'); return; }
  w.document.write(html); w.document.close(); setTimeout(() => { try { w.print(); } catch {} }, 350);
}





// AT-MEC_HM_3.16 - Lotto, ricerca avanzata, firma e validazione ricetta
function getOperatorSignature(){
  try { return JSON.parse(localStorage.getItem('atmec_operator_signature') || '{}'); } catch { return {}; }
}
function saveOperatorSignature(){
  const sig = {
    name: document.getElementById('operator-signature-name')?.value?.trim() || '',
    pinSet: !!(document.getElementById('operator-signature-pin')?.value || '').trim(),
    note: document.getElementById('operator-signature-note')?.value?.trim() || '',
    savedAt: new Date().toISOString()
  };
  if(!sig.name){ alert('Inserisci nome firma operatore.'); return; }
  localStorage.setItem('atmec_operator_signature', JSON.stringify(sig));
  const st=document.getElementById('operator-signature-status'); if(st) st.textContent=' Firma salvata: '+sig.name;
}
function loadOperatorSignature(){
  const sig=getOperatorSignature();
  const n=document.getElementById('operator-signature-name'); if(n && sig.name) n.value=sig.name;
  const no=document.getElementById('operator-signature-note'); if(no && sig.note) no.value=sig.note;
  const st=document.getElementById('operator-signature-status'); if(st && sig.name) st.textContent=' Firma attiva: '+sig.name;
}
function getLotFilterPayload(){
  return {
    lot: document.getElementById('lot-manager-input')?.value?.trim() || document.getElementById('db-lot')?.value?.trim() || '',
    serial: document.getElementById('lot-manager-serial')?.value?.trim() || '',
    result: document.getElementById('lot-manager-result')?.value || 'ALL'
  };
}
