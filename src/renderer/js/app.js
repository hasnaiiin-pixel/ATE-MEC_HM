/*
 * AT-MEC HM 2.16 - GUARDIE GLOBALI RENDERER
 *
 * Scopo del blocco:
 * - intercettare errori JavaScript non gestiti senza rompere tutta l'interfaccia;
 * - evitare che promise IPC rigettate lascino pulsanti in stato busy;
 * - rendere i problemi visibili nel log invece di bloccare la navigazione.
 */
if (!window.__AT_MEC_GLOBAL_ERROR_GUARD_395__) {
  window.__AT_MEC_GLOBAL_ERROR_GUARD_395__ = true;
  window.addEventListener('error', function(ev) {
    try {
      console.error('[UI ERROR]', ev.error || ev.message);
      var log = document.getElementById('sys-log');
      if (log && typeof addLog === 'function') addLog(log, 'Errore UI gestito: ' + escapeHtml(ev.message || 'errore sconosciuto'), 'fail');
    } catch (_) {}
  });
  window.addEventListener('unhandledrejection', function(ev) {
    try {
      var msg = (ev.reason && ev.reason.message) ? ev.reason.message : String(ev.reason || 'Promise rejection');
      console.error('[UI PROMISE]', ev.reason);
      var log = document.getElementById('sys-log');
      if (log && typeof addLog === 'function') addLog(log, 'Operazione non completata: ' + escapeHtml(msg), 'warn');
    } catch (_) {}
  });
}

var api = (typeof window !== 'undefined' && window.api) ? window.api : null;
var IS_ELECTRON = (api !== null);

/* Stato applicativo condiviso tra pagine HMI.
 * Ogni variabile controlla una parte del renderer: ricette, polling, utenti, produzione e loghi.
 * I flag busy impediscono doppio click o polling sovrapposti che in passato causavano blocchi.
 */
let recipe = { recipe_name: 'Nuova Ricetta', version: 1, enabled: true, power_metadata: 'PL303_PROGRAMMABLE', steps: [] };
let stepIdCounter = 1;
let autoPollInterval = null;
let trendData = [];
let activeStepId = null;
let auditCache = [];
let qrStream = null;
let qrScanInterval = null;
let latestHardwareStatuses = [];
let wizardLiveInterval = null;
let wizardLiveBusy = false;
let esp32IoCatalog = [];
let liveIoSnapshot = {};
let serialPortsCache = [];
let uiBusyCount = 0;
let lastUiOperation = '';
let meterPollBusy = false;
let startInProgress = false;
let hwApplyInProgress = false;
let serialScanInProgress = false;
let esp32ControlLiveTimer = null;
let esp32ControlBusy = false;
let esp32ControlInitialized = false;
let safeCallSeq = 0;
let stepStatusMap = {};
let pendingManualRequestId = null;
let pendingFailureDecision = false;
let currentInstructionImageDataUrl = '';
let productionTestMode = false;
let currentRunState = 'READY';
let productionForceComplete = false;
let excludedInstruments = [];
let productionRecipesCache = [];
let productionAutoConnectDone = false;
let activeLotNumber = localStorage.getItem('atmec_lot_number') || '';
let pendingRepairNote = '';
let testRunStartTs = 0;
let testElapsedTimer = null;
let lastStopWasOperator = false;

let currentUser = null;
let selectedUserName = '';
function userCanManageUsers() {
  return !!currentUser && ((currentUser.role || '').toLowerCase() === 'admin' || Number(currentUser.level || 0) >= 100);
}

function saveLotNumberLocal() {
  const v = document.getElementById('lot-number')?.value || '';
  activeLotNumber = v.trim();
  localStorage.setItem('atmec_lot_number', activeLotNumber);
  const prod = document.getElementById('prod-lot-number'); if (prod && prod.value !== activeLotNumber) prod.value = activeLotNumber;
}
function syncLotNumberInputs(src) {
  const v = src === 'prod' ? (document.getElementById('prod-lot-number')?.value || '') : src === 'dash' ? (document.getElementById('lot-number-dash')?.value || '') : (document.getElementById('lot-number')?.value || '');
  setLotNumber(v);
}
function setLotNumber(v) {
  activeLotNumber = String(v || '').trim(); localStorage.setItem('atmec_lot_number', activeLotNumber);
  ['lot-number','prod-lot-number','lot-number-dash'].forEach(id => { const el=document.getElementById(id); if (el && el.value !== String(v || '')) el.value = String(v || ''); });
}
function syncSerialInputs(src) {
  const v = src === 'prod' ? (document.getElementById('prod-serial-input')?.value || '') : src === 'dash' ? (document.getElementById('serial-dut-dash')?.value || '') : (document.getElementById('serial-dut')?.value || '');
  ['serial-dut','prod-serial-input','serial-dut-dash'].forEach(id => { const el=document.getElementById(id); if (el && el.value !== v) el.value = v; });
}
function getLotNumber() { return (document.getElementById('lot-number-dash')?.value || document.getElementById('lot-number')?.value || activeLotNumber || '').trim(); }
function isSerialRequired() {
  const saved = localStorage.getItem('atmec_serial_required');
  return saved === null ? true : saved === '1';
}
function setSerialRequired(required) {
  localStorage.setItem('atmec_serial_required', required ? '1' : '0');
  ['serial-required-dash','serial-required-prod','serial-required-settings'].forEach(id => { const el=document.getElementById(id); if(el) el.checked = !!required; });
  updateProductionTestMode();
}
function syncSerialRequiredUi() { setSerialRequired(isSerialRequired()); }
function getSerialDutRaw() { return (document.getElementById('serial-dut-dash')?.value || document.getElementById('serial-dut')?.value || document.getElementById('prod-serial-input')?.value || '').trim(); }
function getSerialDut() { return getSerialDutRaw(); }

async function showFrontInputModal(title, message, placeholder = '') {
  return new Promise(resolve => {
    const old = document.getElementById('front-input-modal');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'front-input-modal';
    overlay.className = 'ate-front-modal';
    overlay.style.zIndex = '2147483000';
    overlay.innerHTML = `<div class="ate-front-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="hint" style="margin-bottom:10px;white-space:pre-wrap;">${escapeHtml(message)}</div>
      <textarea id="front-input-text" placeholder="${escapeHtml(placeholder)}"></textarea>
      <div class="row" style="justify-content:flex-end;margin-top:12px;">
        <button class="btn btn-ghost" id="front-input-cancel">Annulla</button>
        <button class="btn btn-primary" id="front-input-ok">Conferma</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    const text = overlay.querySelector('#front-input-text');
    setTimeout(() => text?.focus(), 50);
    overlay.querySelector('#front-input-cancel').onclick = () => { overlay.remove(); resolve(''); };
    overlay.querySelector('#front-input-ok').onclick = () => { const v = text?.value || ''; overlay.remove(); resolve(v); };
  });
}

async function showFrontChoiceModal(title, message, buttons = []) {
  return new Promise(resolve => {
    const old = document.getElementById('front-choice-modal');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'front-choice-modal';
    overlay.className = 'ate-front-modal';
    overlay.style.zIndex = '2147483000';
    const btnHtml = (buttons.length ? buttons : [{id:'ok', label:'OK', cls:'btn-primary'}]).map(b => `<button class="btn ${b.cls || 'btn-ghost'}" data-choice="${escapeHtml(b.id)}">${escapeHtml(b.label)}</button>`).join('');
    overlay.innerHTML = `<div class="ate-front-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="hint" style="margin-bottom:10px;white-space:pre-wrap;">${escapeHtml(message)}</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px;">${btnHtml}</div>
    </div>`;
    document.body.appendChild(overlay);
    setTimeout(() => { try { overlay.scrollIntoView({block:'center'}); overlay.querySelector('[data-choice]')?.focus(); } catch {} }, 30);
    overlay.querySelectorAll('[data-choice]').forEach(btn => btn.onclick = () => { const v = btn.getAttribute('data-choice'); overlay.remove(); resolve(v); });
  });
}
function isSampleTestRequired() { return localStorage.getItem('atmec_sample_test_required') === '1'; }
function setSampleTestRequired(required) {
  localStorage.setItem('atmec_sample_test_required', required ? '1' : '0');
  ['sample-test-required-prod','sample-test-required-dash'].forEach(id => { const el=document.getElementById(id); if(el) el.checked = !!required; });
}
async function runPreTestSampleWizard() {
  if (!isSampleTestRequired()) return true;
  if (sessionStorage.getItem('atmec_sample_test_done') === '1') return true;
  const choice = await showFrontChoiceModal('Test scheda campione', 'Prima di avviare la produzione devi eseguire/approvare il test su scheda campione. Vuoi procedere con il wizard preliminare?', [
    {id:'start', label:'Avvia wizard campione', cls:'btn-primary'},
    {id:'skip', label:'Salta per questa volta', cls:'btn-ghost'},
    {id:'cancel', label:'Annulla test', cls:'btn-danger'}
  ]);
  if (choice === 'cancel') return false;
  if (choice === 'skip') return true;
  const required = getRequiredInstrumentsForRecipe();
  const list = required.length ? required : ['ESP32'];
  for (const instrument of list) {
    const st = latestHardwareStatuses.find(x => String(x.name) === String(instrument));
    const msg = `Strumento richiesto: ${instrument}
Stato attuale: ${st?.live ? 'LIVE' : (st?.state || 'N/D')}
Connessione: ${st?.connection || st?.port || st?.ip || 'N/D'}

Collega/verifica lo strumento, poi conferma.`;
    const r = await showFrontChoiceModal('Wizard collegamento strumenti', msg, [
      {id:'ok', label:'Conferma collegato', cls:'btn-success'},
      {id:'retry', label:'Ricollega strumenti', cls:'btn-primary'},
      {id:'cancel', label:'Annulla', cls:'btn-danger'}
    ]);
    if (r === 'cancel') return false;
    if (r === 'retry') await guardedUi('Ricollega strumenti preliminari', () => autoConnectProductionInstruments(false), { timeoutMs: 8000, logTo: document.getElementById('run-log'), fallback:null });
  }
  const board = await showFrontChoiceModal('Conferma scheda campione', 'Monta la scheda campione nota buona. Confermi che la scheda campione è pronta e che i punti di test sono corretti?', [
    {id:'ok', label:'Confermo, avvia test', cls:'btn-success'},
    {id:'cancel', label:'Annulla', cls:'btn-danger'}
  ]);
  if (board === 'ok') { sessionStorage.setItem('atmec_sample_test_done','1'); return true; }
  return false;
}


let startupWizardStep = 0;
const startupWizardLabels = ['1. Ricetta e revisione', '2. Strumenti richiesti', '3. Test strumenti', '4. Scheda campione', '5. Pronto'];
function openStartupWizard(force=false) {
  if (!force && sessionStorage.getItem('atmec_startup_wizard_done') === '1') return;
  const m = document.getElementById('startup-wizard-modal');
  if (!m) return;
  // AT-MEC_HM_2.29: se il wizard e gia aperto NON resettare lo step.
  // Il bug precedente riportava sempre da step 2 a step 1 dopo AVANTI,
  // perche loadProductionRecipeSelection() richiamava openStartupWizard(true).
  const alreadyOpen = m.classList.contains('show');
  if (!alreadyOpen) startupWizardStep = 0;
  m.classList.add('show');
  renderStartupWizard();
}
function closeStartupWizard(skip=false) {
  sessionStorage.setItem('atmec_startup_wizard_done','1');
  document.getElementById('startup-wizard-modal')?.classList.remove('show');
  if (!skip && isSampleTestRequired()) sessionStorage.setItem('atmec_sample_test_done','1');
}
function startupWizardPrev(){ startupWizardStep=Math.max(0,startupWizardStep-1); renderStartupWizard(); }
let startupWizardBusy = false;
async function startupWizardNext(){
  if (startupWizardBusy) return;
  startupWizardBusy = true;
  try {
  const stepBefore = startupWizardStep;
  if (startupWizardStep === 0) await loadProductionRecipeSelection();
  startupWizardStep = stepBefore; // protezione anti-reset da refresh/ricaricamento ricetta
  if (startupWizardStep === 1) await autoConnectProductionInstruments(false);
  if (startupWizardStep === 2) await autoConnectProductionInstruments(true);
  if (startupWizardStep === 3 && isSampleTestRequired()) {
    const ok = await showFrontChoiceModal('Scheda campione', 'Monta la scheda campione nota buona e conferma che sei pronto. Il sistema salverà la conferma per questa sessione.', [
      {id:'ok', label:'Scheda campione pronta', cls:'btn-success'}, {id:'cancel', label:'Non pronta', cls:'btn-danger'}
    ]);
    if (ok !== 'ok') return;
    sessionStorage.setItem('atmec_sample_test_done','1');
  }
  startupWizardStep=Math.min(startupWizardLabels.length-1,startupWizardStep+1); renderStartupWizard();
  } finally { startupWizardBusy = false; }
}
function renderStartupWizard(){
  const steps=document.getElementById('startup-wizard-steps'); const content=document.getElementById('startup-wizard-content');
  if(!steps||!content) return;
  steps.innerHTML = startupWizardLabels.map((l,i)=>`<div class="startup-wizard-step ${i===startupWizardStep?'active':''}">${escapeHtml(l)}</div>`).join('');
  const req=getRequiredInstrumentsForRecipe();
  if(startupWizardStep===0){
    content.innerHTML = `<h3>Ricetta e revisione</h3><div class="startup-cell-grid"><div class="startup-cell"><b>Ricetta</b><select id="startup-recipe-select" onchange="document.getElementById('prod-recipe-select').value=this.value; loadProductionRecipeSelection();"></select><div class="hint">Seleziona la ricetta da usare in produzione.</div></div><div class="startup-cell"><b>Revisione</b><select id="startup-recipe-version-select" onchange="document.getElementById('prod-recipe-version-select').value=this.value; loadProductionRecipeRevisionSelection();"><option value="">ultima</option></select><div class="hint">La revisione viene salvata nel report.</div></div></div>`;
    setTimeout(async()=>{ await refreshProductionRecipes(); const ps=document.getElementById('prod-recipe-select'); const ss=document.getElementById('startup-recipe-select'); if(ss&&ps) ss.innerHTML=ps.innerHTML; await refreshProductionRecipeVersions(); const pv=document.getElementById('prod-recipe-version-select'); const sv=document.getElementById('startup-recipe-version-select'); if(sv&&pv) sv.innerHTML=pv.innerHTML; },30);
  } else if(startupWizardStep===1){
    content.innerHTML = `<h3>Strumenti richiesti</h3><div class="startup-cell-grid">${(req.length?req:['Nessuno strumento obbligatorio']).map(n=>`<div class="startup-cell"><b>${escapeHtml(getInstrumentDisplayName(n))}</b><div class="hint">Accendi e collega prima del test.</div></div>`).join('')}</div>`;
  } else if(startupWizardStep===2){
    content.innerHTML = `<h3>Test strumenti</h3><div class="hint">Premi Avanti per ricollegare e testare gli strumenti richiesti.</div><div id="startup-device-list">${document.getElementById('prod-hardware-list')?.innerHTML || ''}</div>`;
  } else if(startupWizardStep===3){
    content.innerHTML = `<h3>Scheda campione</h3><div class="startup-cell"><b>Test scheda campione all'inizio</b><label style="display:flex;gap:8px;align-items:center;margin-top:8px;"><input type="checkbox" ${isSampleTestRequired()?'checked':''} onchange="setSampleTestRequired(this.checked)" style="width:auto;"> Abilita controllo scheda campione per questa produzione</label><div class="hint">Se attivo, prima del test normale viene chiesta conferma di scheda campione nota buona.</div></div>`;
  } else {
    content.innerHTML = `<h3>Pronto</h3><div class="startup-cell"><b>Configurazione preliminare completata</b><div class="hint">Puoi entrare in Test Mode e avviare il test.</div></div>`;
  }
}


function completeLogin(operator, role, level = 0) {
  currentUser = { operator, role, level: Number(level || 0) };
  document.body.classList.remove('locked');
  const box = document.getElementById('logged-user-box');
  if (box) box.innerHTML = `✅ <b>${escapeHtml(operator)}</b><br><span>${escapeHtml(role)} · livello ${Number(level || 0)}</span>`;
  addLog(document.getElementById('sys-log'), `Login: <b>${escapeHtml(operator)}</b> [${escapeHtml(role)}] livello ${Number(level || 0)}`, 'pass');
  refreshRolesUsers().catch(()=>{}); loadAppSettings().catch(()=>{}); refreshBrandingPermissions();
  const lotEl=document.getElementById('lot-number'); if(lotEl && !lotEl.value) lotEl.value=activeLotNumber;
  const prodLot=document.getElementById('prod-lot-number'); if(prodLot && !prodLot.value) prodLot.value=activeLotNumber;
  refreshProductionRecipes();
  setTimeout(() => autoConnectProductionInstruments(false), 350);
  const lowLevelOperator = String(role || '').toLowerCase().includes('operatore') || String(role || '').toLowerCase().includes('operator') || Number(level || 0) <= 10;
  if (lowLevelOperator) setTimeout(() => enterProductionTestMode(), 250);
}
function logoutAndLock() {
  currentUser = null;
  document.body.classList.add('locked');
  const st = document.getElementById('login-status'); if (st) st.textContent = '';
  const pw = document.getElementById('op-password'); if (pw) pw.value = '';
}
function requireLogin() {
  if (!currentUser) { document.body.classList.add('locked'); return false; }
  return true;
}
function renumberRecipeSteps() {
  recipe.steps.forEach((s, i) => { s.step_id = i + 1; });
  stepIdCounter = recipe.steps.length + 1;
  stepStatusMap = {};
}

function stepUiStatus(step) {
  if (activeStepId === step.step_id) return 'running';
  return stepStatusMap[step.step_id] || 'todo';
}
function stepStatusLabel(st) {
  return ({ pass:'PASS', fail:'FAIL', running:'IN ESECUZIONE', todo:'DA FARE' })[st] || 'DA FARE';
}


const STATE_COLORS = {
  IDLE: '#9090b0', READY: '#2ecc71', RUNNING: '#00d4ff',
  PAUSED: '#f39c12', FAULT: '#ff4136', RECOVERY: '#e74c3c', MAINTENANCE: '#9b59b6'
};

const STEP_TYPE_COLORS = {
  VoltageMeasurement: 'type-color-V', CurrentMeasurement: 'type-color-I', AnalogInputMeasurement: 'type-color-I',
  ResistanceTest: 'type-color-R', FrequencyTest: 'type-color-F',
  Delay: 'type-color-D', SCPICommand: 'type-color-CMD',
  FirmwareErase: 'type-color-FW', FirmwareFlash: 'type-color-FW', FirmwareVerify: 'type-color-FW',
  DigitalOutputSet: 'type-color-IO', DigitalInputCheck: 'type-color-IO', ManualMeasurement: 'type-color-CMD',
  LoopStart: 'type-color-D', LoopEnd: 'type-color-D', GotoIfFail: 'type-color-D'
};

function ts() {
  return new Date().toLocaleTimeString('it-IT', { hour12: false });
}

/** Log compatto e limitato: impedisce crescita infinita del DOM e rallentamenti. */
function addLog(container, text, cls = 'info') {
  try {
    if (!container) return;
    const el = document.createElement('div');
    el.className = `log-item ${cls}`;
    el.innerHTML = `<span class="log-ts">${ts()}</span>${text}`;
    container.appendChild(el);
    while (container.children.length > 350) container.removeChild(container.firstChild);
    container.scrollTop = container.scrollHeight;
  } catch (e) { console.error('addLog failed', e); }
}

function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('it-IT');
}
setInterval(updateClock, 1000);
updateClock();

/** Navigazione principale tra pagine: non distrugge lo stato, mostra solo il tab richiesto. */
function showTab(id, btn) {
  if (!requireLogin()) return;
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const tab = document.getElementById(id);
  if (tab) tab.classList.add('active');
  if (btn) btn.classList.add('active');
}

function setStatePill(state) {
  const pill = document.getElementById('state-pill');
  pill.textContent = state;
  pill.style.color = STATE_COLORS[state] || '#9090b0';
  pill.style.borderColor = STATE_COLORS[state] || '#9090b0';
}

function stepSummary(step) {
  const parts = [];
  if (step.enabled === false) parts.push(`<span class="pill-mini">DISABILITATO</span>`);
  if (step.label) parts.push(`<span class="pill-mini">${escapeHtml(step.label)}</span>`);
  if (step.io_type) parts.push(`<span class="pill-mini">${step.io_type}</span>`);
  if (step.channel !== undefined) parts.push(`<span class="pill-mini">GPIO ${step.channel}</span>`);
  if (step.min !== undefined || step.max !== undefined) parts.push(`<span class="pill-mini">${step.min ?? '-∞'} ÷ ${step.max ?? '+∞'} ${step.unit || ''}</span>`);
  if (step.value !== undefined && step.type.includes('Digital')) parts.push(`<span class="pill-mini">${step.value ? 'HIGH' : 'LOW'}</span>`);
  if (step.type === 'DigitalOutputSet' && step.output_mode && step.output_mode !== 'set') parts.push(`<span class="pill-mini">${step.output_mode}${step.output_mode === 'pulse' ? ' '+(step.frequency_hz||1)+'Hz x'+(step.pulse_count||1) : ' '+(step.timeout||0)+'ms'}</span>`);
  return parts.length ? `<div class="step-summary">${parts.join('')}</div>` : '';
}

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}


function formatMeasured(v) {
  if (v === null || v === undefined) return 'N/A';
  if (typeof v === 'boolean') return v ? 'HIGH' : 'LOW';
  if (typeof v === 'object') return escapeHtml(JSON.stringify(v));
  return escapeHtml(v);
}

function currentWizardAllowedIo() {
  const type = document.getElementById('w-type')?.value || '';
  return esp32IoCatalog.filter(ch => ch.allowedFor?.includes(type));
}

async function loadEsp32IoCatalog() {
  if (api) {
    try { esp32IoCatalog = await api.getEsp32IoCatalog(); } catch {}
  }
  if (!esp32IoCatalog || !esp32IoCatalog.length) {
    esp32IoCatalog = [
      ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,21,47,48].map(gpio=>({io_type:'DI',channel:gpio,gpio,label:`GPIO${gpio}`,allowedFor:['DigitalInputCheck'],safe:true,note:`Ingresso digitale diretto: pin ${gpio}`})),
      ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,21,47,48].map(gpio=>({io_type:'DO',channel:gpio,gpio,label:`GPIO${gpio}`,allowedFor:['DigitalOutputSet'],safe:true,note:`Uscita digitale diretta: pin ${gpio}`})),
      ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].map(gpio=>({io_type:'AI',channel:gpio,gpio,label:`GPIO${gpio}`,allowedFor:['AnalogInputMeasurement'],safe:true,note:`Ingresso analogico diretto: pin ${gpio}`}))
    ];
  }
}

function renderIoGrid() {
  const grid = document.getElementById('w-io-grid');
  if (!grid) return;
  const type = document.getElementById('w-type').value;
  const allowed = esp32IoCatalog.filter(x => x.allowedFor?.includes(type));
  const shown = allowed.length ? allowed : esp32IoCatalog.filter(x => x.io_type === guessIoType(type));
  grid.innerHTML = shown.map(x => {
    const selected = Number(document.getElementById('w-channel').value) === Number(x.channel);
    const live = liveIoSnapshot[`${x.io_type}_${x.channel}`];
    const liveCls = live === true ? ' high' : live === false ? ' low' : '';
    return `<div class="io-chip ${selected?'selected':''}${x.safe===false?' disabled':''}${liveCls}" onclick="selectIoChannel(${x.channel}, ${x.safe===false})" title="${escapeHtml(x.note || '')}"><b>${escapeHtml(x.label)}</b><div class="detail-line">${x.io_type === 'DO' ? 'USCITA DIGITALE' : x.io_type === 'DI' ? 'INGRESSO DIGITALE' : x.io_type}</div><div class="io-state-line">STATO: ${live === true ? 'HIGH' : live === false ? 'LOW' : 'N/D'}</div></div>`;
  }).join('') || '<div class="detail-line">Nessun I/O disponibile per questa funzione.</div>';
}

function selectIoChannel(ch, disabled) {
  if (disabled) return;
  document.getElementById('w-channel').value = ch;
  renderIoGrid();
}
function highlightSelectedIo(){ renderIoGrid(); }

function renderSteps() {

  const list = document.getElementById('steps-list');
  list.innerHTML = '';
  recipe.steps.forEach((step, i) => {
    const cls = STEP_TYPE_COLORS[step.type] || 'type-color-D';
    const uiSt = stepUiStatus(step);
    const active = step.step_id === activeStepId ? ' active-step' : '';
    const status = ` step-${uiSt}`;
    const row = document.createElement('div');
    row.className = `step-row${active}${status}${step.enabled === false ? ' disabled-step' : ''}`;
    row.dataset.id = step.step_id;
    row.innerHTML = `
      <span class="step-num">${i + 1}</span>
      <div>
        <span class="step-type-badge ${cls}">${step.type}</span>
        <span style="font-size:10px;color:var(--text2);margin-left:4px;">${escapeHtml(step.device_mapping)}</span> <span class="status-pill ${uiSt}">${stepStatusLabel(uiSt)}</span>
        ${stepSummary(step)}
      </div>
      <div style="display:flex;gap:3px;">
        <button class="btn btn-ghost btn-xs" onclick="openStepWizard(${i})">✏️</button>
        <button class="btn btn-ghost btn-xs" onclick="cloneStep(${i})">⧉</button>
        <button class="btn btn-ghost btn-xs" onclick="removeStep(${i})">✕</button>
      </div>`;
    list.appendChild(row);
  });
  renderRecipePage();
}

let wizardEditIndex = null;

const WIZARD_PRESETS = {
  measure_voltage:   { type:'VoltageMeasurement', io_type:'SCPI', device:'Keysight_34461A', unit:'V', target:5.00, tolerance:0.25, min:4.75, max:5.25, timeout:2000, command:'MEAS:VOLT:DC?', label:'Misura tensione', measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
  measure_current:   { type:'CurrentMeasurement', io_type:'SCPI', device:'Keysight_34461A', unit:'A', target:0.25, tolerance:0.25, min:0.05, max:0.5, timeout:2000, command:'MEAS:CURR:DC?', label:'Misura corrente', measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
  measure_analog:    { type:'AnalogInputMeasurement', io_type:'SCPI', device:'Keysight_34461A', unit:'V', target:1.65, tolerance:1.65, min:0, max:3.3, timeout:2500, command:'MEAS:VOLT:DC?', label:'Misura analogica DMM', measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
  measure_resistance:{ type:'ResistanceTest', io_type:'SCPI', device:'Keysight_34461A', unit:'Ω', target:480, tolerance:30, min:450, max:510, timeout:2000, command:'MEAS:RES?', label:'Misura resistenza', measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
  measure_frequency: { type:'FrequencyTest', io_type:'SCPI', device:'Keysight_34461A', unit:'Hz', target:1000, tolerance:10, min:990, max:1010, timeout:2000, command:'MEAS:FREQ?', label:'Misura frequenza', measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
  measure_continuity:{ type:'ManualMeasurement', io_type:'SCPI', device:'Keysight_34461A', unit:'Ω', target:0, tolerance:10, min:0, max:10, timeout:2500, command:'MEAS:RES?', label:'Controllo continuità', manual_measure_type:'SCPI_OHM', measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
  measure_temp:      { type:'ManualMeasurement', io_type:'SYSTEM', device:'manual', unit:'°C', target:25, tolerance:10, min:15, max:35, timeout:0, command:'', label:'Misura temperatura', manual_measure_type:'TEMPERATURE', measurement_mode:'manual', manual_input_enabled:true, manual_fallback_enabled:true },
  measure_power:     { type:'ManualMeasurement', io_type:'SYSTEM', device:'manual', unit:'W', target:10, tolerance:5, min:5, max:15, timeout:0, command:'', label:'Misura potenza', manual_measure_type:'POWER', measurement_mode:'manual', manual_input_enabled:true, manual_fallback_enabled:true },
  manual_value:      { type:'ManualMeasurement', io_type:'SYSTEM', device:'manual', unit:'', target:0, tolerance:0, min:0, max:999, timeout:0, command:'', label:'Misura manuale valore', manual_measure_type:'MANUAL_VALUE', measurement_mode:'manual', manual_input_enabled:true, manual_fallback_enabled:true },
  power_supply:      { type:'PowerSupplySet', io_type:'SCPI', device:'AimTTi_PL303', unit:'V/A', timeout:3000, command:'', label:'Set alimentatore PL303', ps_channel:1, ps_voltage:24, ps_current:1, ps_output_on:true },
  digital_input:     { type:'DigitalInputCheck', io_type:'DI', device:'modbus_serial', unit:'bool', value:true, timeout:500, command:'', label:'Ingresso digitale' },
  digital_output:    { type:'DigitalOutputSet', io_type:'DO', device:'modbus_serial', unit:'bool', value:true, timeout:1500, command:'', label:'Uscita digitale', verify_feedback:false },
  manual_measure:    { type:'ManualMeasurement', io_type:'SCPI', device:'Keysight_34461A', unit:'V', min:0, max:3.3, timeout:2500, label:'Step manuale guidato', manual_measure_type:'SCPI', command:'MEAS:VOLT:DC?', stable_time_ms:1000 },
  scpi:              { type:'SCPICommand', io_type:'SCPI', device:'Keysight_34461A', unit:'', value:'*RST', timeout:1000, command:'*RST', label:'Comando SCPI' },
  delay:             { type:'Delay', io_type:'SYSTEM', device:'system', unit:'ms', timeout:1000, command:'', label:'Attesa' },
  firmware_flash:    { type:'FirmwareFlash', io_type:'FW', device:'STLink', unit:'', value:'mock', timeout:20000, command:'mock', label:'Flash firmware' }
};

function openStepWizard(idx = null) {
  wizardEditIndex = idx;
  document.getElementById('wizard-title').textContent = idx === null ? '🧙 Nuovo step smart' : `✏️ Modifica step #${recipe.steps[idx].step_id}`;
  const base = idx === null ? null : recipe.steps[idx];
  if (base) fillWizardFromStep(base); else applyWizardCategory();
  document.getElementById('step-wizard').classList.add('show');
}

function closeStepWizard() { stopWizardLive(); document.getElementById('step-wizard').classList.remove('show'); }

function applyWizardCategory() {
  const p = WIZARD_PRESETS[document.getElementById('w-category').value];
  document.getElementById('w-enabled').checked = true;
  document.getElementById('w-label').value = p.label || '';
  document.getElementById('w-type').value = p.type;
  document.getElementById('w-io-type').value = p.io_type;
  document.getElementById('w-device').value = p.device;
  document.getElementById('w-channel').value = 0;
  document.getElementById('w-value-bool').value = String(p.value ?? true);
  document.getElementById('w-value').value = p.value ?? '';
  document.getElementById('w-unit').value = p.unit || '';
  document.getElementById('w-min').value = p.min ?? '';
  document.getElementById('w-max').value = p.max ?? '';
  document.getElementById('w-target').value = p.target ?? '';
  document.getElementById('w-tolerance').value = p.tolerance ?? '';
  document.getElementById('w-measure-mode').value = p.measurement_mode || (p.manual_input_enabled ? 'manual' : 'auto_with_fallback');
  const mf0 = document.getElementById('w-manual-fallback-enabled'); if (mf0) mf0.checked = p.manual_fallback_enabled !== false;
  document.getElementById('w-timeout').value = p.timeout ?? 1000;
  document.getElementById('w-command').value = p.command ?? '';
  document.getElementById('w-do-mode').value = p.output_mode || 'set';
  document.getElementById('w-return-state').value = String(p.return_state ?? false);
  document.getElementById('w-frequency').value = p.frequency_hz ?? 1;
  document.getElementById('w-pulse-count').value = p.pulse_count ?? 1;
  document.getElementById('w-verify-feedback').checked = Boolean(p.verify_feedback);
  document.getElementById('w-description').value = p.type === 'ManualMeasurement' ? 'Posizionare le sonde sui punti indicati. Quando il contatto è stabile premere Conferma: il sistema acquisisce la misura automaticamente.' : '';
  document.getElementById('w-manual-type').value = p.manual_measure_type || p.io_type || 'AI';
  const mi = document.getElementById('w-manual-input-enabled'); if (mi) mi.checked = Boolean(p.manual_input_enabled || p.manual_measure_type === 'MANUAL_VALUE');
  document.getElementById('w-stable-time').value = p.stable_time_ms ?? 1000;
  currentInstructionImageDataUrl = '';
  document.getElementById('w-instruction-image-name').value = '';
  document.getElementById('w-instruction-image-preview').style.display = 'none';
  document.getElementById('w-live-value').textContent = 'Nessuna lettura live.';
  syncWizardVisibility();
}

function fillWizardFromStep(step) {
  document.getElementById('w-enabled').checked = step.enabled !== false;
  document.getElementById('w-label').value = step.label || '';
  document.getElementById('w-type').value = step.type;
  document.getElementById('w-io-type').value = step.io_type || guessIoType(step.type);
  document.getElementById('w-device').value = step.device_mapping || 'Keysight_34461A';
  document.getElementById('w-channel').value = step.channel ?? 0;
  document.getElementById('w-value-bool').value = String(Boolean(step.value));
  document.getElementById('w-value').value = step.value ?? '';
  document.getElementById('w-unit').value = step.unit || '';
  document.getElementById('w-min').value = step.min ?? '';
  document.getElementById('w-max').value = step.max ?? '';
  document.getElementById('w-target').value = step.target ?? '';
  document.getElementById('w-tolerance').value = step.tolerance ?? '';
  document.getElementById('w-measure-mode').value = step.measurement_mode || (step.manual_input_enabled ? 'manual' : 'auto_with_fallback');
  const mf1 = document.getElementById('w-manual-fallback-enabled'); if (mf1) mf1.checked = step.manual_fallback_enabled !== false;
  document.getElementById('w-timeout').value = step.timeout ?? 1000;
  document.getElementById('w-command').value = step.command || (typeof step.value === 'string' ? step.value : '');
  document.getElementById('w-do-mode').value = step.output_mode || 'set';
  document.getElementById('w-return-state').value = String(step.return_state ?? false);
  document.getElementById('w-frequency').value = step.frequency_hz ?? 1;
  document.getElementById('w-pulse-count').value = step.pulse_count ?? 1;
  document.getElementById('w-verify-feedback').checked = Boolean(step.verify_feedback);
  document.getElementById('w-description').value = step.description || '';
  document.getElementById('w-manual-type').value = step.manual_measure_type || step.io_type || 'AI';
  const mi = document.getElementById('w-manual-input-enabled'); if (mi) mi.checked = Boolean(step.manual_input_enabled || step.manual_measure_type === 'MANUAL_VALUE');
  document.getElementById('w-stable-time').value = step.stable_time_ms ?? step.timeout ?? 1000;
  currentInstructionImageDataUrl = step.instruction_image || '';
  document.getElementById('w-instruction-image-name').value = currentInstructionImageDataUrl ? 'Immagine salvata nella ricetta' : '';
  const prev = document.getElementById('w-instruction-image-preview');
  if (currentInstructionImageDataUrl) { prev.src = currentInstructionImageDataUrl; prev.style.display = 'block'; } else prev.style.display = 'none';
  syncWizardVisibility();
}

function guessIoType(type) {
  if (type === 'DigitalInputCheck') return 'DI';
  if (type === 'DigitalOutputSet') return 'DO';
  if (type === 'AnalogInputMeasurement') return 'SCPI';
  if (type.startsWith('Firmware')) return 'FW';
  if (type === 'Delay') return 'SYSTEM';
  if (type === 'ManualMeasurement') return document.getElementById('w-manual-type')?.value || 'AI';
  return 'SCPI';
}

function syncWizardVisibility() {
  const type = document.getElementById('w-type').value;
  const manualKind = document.getElementById('w-manual-type')?.value || 'AI';
  const measureMode = document.getElementById('w-measure-mode')?.value || 'auto_with_fallback';
  const manualInputEnabled = Boolean(document.getElementById('w-manual-input-enabled')?.checked) || manualKind === 'MANUAL_VALUE' || measureMode === 'manual';
  const isOutputDigital = type === 'DigitalOutputSet';
  const isInputDigital = type === 'DigitalInputCheck';
  const isMeasurement = ['VoltageMeasurement','CurrentMeasurement','ResistanceTest','FrequencyTest','AnalogInputMeasurement'].includes(type);
  const isPowerSupply = type === 'PowerSupplySet' || type === 'PowerSupplyMeasureCurrent';
  const isDelay = type === 'Delay';
  const isManual = type === 'ManualMeasurement';
  const isScpi = type === 'SCPICommand';
  const isFw = type.startsWith('Firmware');
  const customValue = ['SCPICommand','FirmwareFlash','FirmwareErase','FirmwareVerify'].includes(type);

  // AT-MEC_HM_3.1: wizard realmente filtrato.
  // Ogni tipo step mostra solo i campi pertinenti, per evitare confusione in produzione.
  const show = new Set(['enabled']);

  if (isOutputDigital) {
    show.add('channel'); show.add('value'); show.add('timeout'); show.add('do_mode'); show.add('do_verify');
    if (document.getElementById('w-do-mode').value !== 'set') show.add('do_return');
    if (document.getElementById('w-do-mode').value === 'pulse') { show.add('do_freq'); show.add('do_count'); }
  } else if (isInputDigital) {
    show.add('channel'); show.add('value'); show.add('timeout');
  } else if (isMeasurement) {
    show.add('device'); show.add('command'); show.add('unit'); show.add('min'); show.add('max'); show.add('target'); show.add('tolerance'); show.add('measure_mode'); show.add('manual_fallback'); show.add('measure_preview'); show.add('timeout');
  } else if (isPowerSupply) {
    show.add('ps_channel'); show.add('ps_voltage'); show.add('ps_current'); show.add('ps_output'); show.add('timeout');
  } else if (isManual) {
    show.add('manual_type'); show.add('manual_input'); show.add('stable_time'); show.add('instruction_image'); show.add('unit'); show.add('timeout');
    if (!manualInputEnabled && manualKind !== 'CONFIRM' && manualKind !== 'MANUAL_VALUE') show.add('device');
    if (!manualInputEnabled && ['DI','DO','AI'].includes(manualKind)) show.add('channel');
    if (!manualInputEnabled && (manualKind === 'SCPI' || manualKind.startsWith('SCPI_'))) { show.add('device'); show.add('command'); }
    if (manualInputEnabled || (['AI','SCPI'].includes(manualKind) || manualKind.startsWith('SCPI_'))) { show.add('min'); show.add('max'); show.add('target'); show.add('tolerance'); show.add('manual_fallback'); show.add('measure_preview'); }
    if (!manualInputEnabled && ['DI','DO'].includes(manualKind)) show.add('value');
  } else if (isScpi) {
    show.add('device'); show.add('command'); show.add('timeout');
  } else if (isDelay) {
    show.add('timeout');
  } else if (isFw) {
    show.add('device'); show.add('command'); show.add('timeout');
  }

  document.querySelectorAll('.wizard-field').forEach(el => {
    const key = el.getAttribute('data-field');
    el.classList.toggle('hidden', !show.has(key));
  });

  const ioEl = document.getElementById('w-io-type');
  const devEl = document.getElementById('w-device');
  if (isOutputDigital) { ioEl.value = 'DO'; devEl.value = 'modbus_serial'; }
  else if (isInputDigital) { ioEl.value = 'DI'; devEl.value = 'modbus_serial'; }
  else if (isPowerSupply) { ioEl.value = 'SCPI'; devEl.value = 'AimTTi_PL303'; }
  else if (isMeasurement || isScpi) { ioEl.value = 'SCPI'; if (!devEl.value || devEl.value === 'modbus_serial') devEl.value = 'Keysight_34461A'; }
  else if (isDelay) { ioEl.value = 'SYSTEM'; devEl.value = 'system'; }
  else if (isManual) {
    ioEl.value = manualInputEnabled ? 'SYSTEM' : (manualKind === 'MANUAL_VALUE' ? 'SYSTEM' : manualKind);
    if ((manualKind === 'SCPI' || manualKind.startsWith('SCPI_'))) devEl.value = 'Keysight_34461A';
    if (['DI','DO','AI'].includes(manualKind)) devEl.value = 'modbus_serial';
  }

  document.getElementById('w-value').style.display = customValue ? 'block' : 'none';
  document.getElementById('w-value-bool').style.display = (isOutputDigital || isInputDigital || (isManual && ['DI','DO'].includes(manualKind) && !manualInputEnabled)) ? 'block' : 'none';
  document.getElementById('w-value-label').textContent = isInputDigital ? 'Stato atteso ingresso' : isOutputDigital ? 'Stato da impostare uscita' : 'Valore';
  renderIoGrid();

  const help = document.getElementById('w-smart-help');
  if (isOutputDigital) help.textContent = 'Uscita digitale: sono visibili solo GPIO DO, stato HIGH/LOW, modalità uscita, timeout e feedback.';
  else if (isInputDigital) help.textContent = 'Ingresso digitale: sono visibili solo GPIO DI, stato atteso HIGH/LOW e timeout. Lo stato I/O è visibile nella griglia.';
  else if (isMeasurement) help.textContent = 'Misura universale: scegli automatica da multimetro, solo manuale o automatica con fallback. Nel report viene salvata origine AUTOMATICA/MANUALE, target, tolleranza e timestamp.';
  else if (type === 'PowerSupplySet') help.textContent = 'Alimentatore PL303QMD-P: scegli CH1 o CH2, imposta tensione/corrente e ON/OFF. Lo step usa solo opzioni alimentatore.';
  else if (type === 'PowerSupplyMeasureCurrent') help.textContent = 'Misura consumo dal PL303QMD-P: scegli CH1/CH2 e imposta limiti min/max corrente. A fine step il consumo viene salvato nel report.';
  else if (isManual) help.textContent = manualInputEnabled ? 'Step manuale con misura manuale: l’operatore inserisce il valore, il sistema applica min/max e assegna PASS/FAIL.' : 'Step manuale: mostra istruzioni/immagine e poi acquisisce da I/O o strumento selezionato.';
  else if (isDelay) help.textContent = 'Attesa: viene mostrato solo il tempo in millisecondi.';
  else help.textContent = 'Step strumento/firmware: mostra solo device, comando e timeout.';
  updateWizardMeasurePreview412C();
}

function formatMeasure412C(value, unit) {
  if (value === undefined || value === null || value === '' || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const fixed = Math.abs(n) >= 100 ? n.toFixed(2) : n.toFixed(3);
  return `${fixed.replace(/\.?0+$/, '')}${unit ? ' ' + unit : ''}`;
}
function calcMeasureRange412C(target, tolerance, min, max) {
  const tOk = target !== '' && target !== undefined && !Number.isNaN(Number(target));
  const tolOk = tolerance !== '' && tolerance !== undefined && !Number.isNaN(Number(tolerance));
  let lo = min !== '' && min !== undefined && !Number.isNaN(Number(min)) ? Number(min) : undefined;
  let hi = max !== '' && max !== undefined && !Number.isNaN(Number(max)) ? Number(max) : undefined;
  if (tOk && tolOk) {
    lo = Number(target) - Math.abs(Number(tolerance));
    hi = Number(target) + Math.abs(Number(tolerance));
  }
  return { min: lo, max: hi, target: tOk ? Number(target) : undefined, tolerance: tolOk ? Math.abs(Number(tolerance)) : undefined };
}
function updateWizardMeasurePreview412C() {
  const box = document.getElementById('w-measure-preview-412c');
  if (!box) return;
  const unit = document.getElementById('w-unit')?.value?.trim() || '';
  const type = document.getElementById('w-type')?.value || '';
  const mode = document.getElementById('w-measure-mode')?.value || 'auto_with_fallback';
  const manualFallback = document.getElementById('w-manual-fallback-enabled')?.checked !== false;
  const target = document.getElementById('w-target')?.value ?? '';
  const tolerance = document.getElementById('w-tolerance')?.value ?? '';
  const min = document.getElementById('w-min')?.value ?? '';
  const max = document.getElementById('w-max')?.value ?? '';
  const r = calcMeasureRange412C(target, tolerance, min, max);
  const origin = mode === 'manual' ? 'MANUALE operatore' : (mode === 'automatic' ? 'AUTOMATICA da multimetro digitale' : 'AUTOMATICA + fallback MANUALE');
  const warn = (r.min !== undefined && r.max !== undefined && r.min > r.max) ? '<div class="measure-preview-warn-412c">⚠️ Min maggiore di Max: correggere i valori.</div>' : '';
  const rangeReady = r.min !== undefined && r.max !== undefined;
  box.innerHTML = `
    <div class="measure-preview-head-412c"><b>${escapeHtml(type || 'Misura')}</b><span>${escapeHtml(origin)}</span></div>
    <div class="measure-preview-grid-412c">
      <div><small>Valore atteso</small><strong>${formatMeasure412C(r.target, unit)}</strong></div>
      <div><small>Tolleranza ±</small><strong>${formatMeasure412C(r.tolerance, unit)}</strong></div>
      <div><small>Min PASS</small><strong>${formatMeasure412C(r.min, unit)}</strong></div>
      <div><small>Max PASS</small><strong>${formatMeasure412C(r.max, unit)}</strong></div>
    </div>
    <div class="measure-preview-range-412c">${rangeReady ? `PASS se valore misurato è tra <b>${formatMeasure412C(r.min, unit)}</b> e <b>${formatMeasure412C(r.max, unit)}</b>.` : 'Inserisci target+tolleranza oppure min/max per calcolare il range PASS.'}</div>
    <div class="measure-preview-origin-412c">Fallback manuale multimetro: <b>${manualFallback ? 'ACCETTATO' : 'NON ACCETTATO'}</b>. Nel report viene salvata origine misura AUTOMATICA/MANUALE.</div>
    ${warn}`;
}


function wizardStepFromForm(commitId = false) {
  const type = document.getElementById('w-type').value;
  const isDigital = type.includes('Digital');
  const isCustomValue = ['SCPICommand','FirmwareFlash','FirmwareErase','FirmwareVerify'].includes(type);
  const minRaw = document.getElementById('w-min').value;
  const maxRaw = document.getElementById('w-max').value;
  const targetRaw = document.getElementById('w-target')?.value || '';
  const toleranceRaw = document.getElementById('w-tolerance')?.value || '';
  const command = document.getElementById('w-command').value.trim();
  const step = {
    step_id: wizardEditIndex === null ? (commitId ? stepIdCounter++ : stepIdCounter) : recipe.steps[wizardEditIndex].step_id,
    type,
    enabled: document.getElementById('w-enabled').checked,
    label: document.getElementById('w-label').value.trim(),
    description: document.getElementById('w-description').value.trim(),
    io_type: document.getElementById('w-io-type').value,
    device_mapping: document.getElementById('w-device').value,
    timeout: Number(document.getElementById('w-timeout').value) || 0
  };
  if (['DI','DO','AI','AO'].includes(step.io_type)) step.channel = Number(document.getElementById('w-channel').value) || 0;
  if (isDigital) step.value = document.getElementById('w-value-bool').value === 'true';
  if (type === 'DigitalOutputSet') {
    step.output_mode = document.getElementById('w-do-mode').value || 'set';
    step.return_state = document.getElementById('w-return-state').value === 'true';
    step.frequency_hz = Number(document.getElementById('w-frequency').value) || 1;
    step.pulse_count = Number(document.getElementById('w-pulse-count').value) || 1;
    step.verify_feedback = document.getElementById('w-verify-feedback').checked;
  }
  if (isCustomValue) step.value = document.getElementById('w-value').value || command || 'mock';
  if (minRaw !== '') step.min = Number(minRaw);
  if (maxRaw !== '') step.max = Number(maxRaw);
  if (targetRaw !== '') step.target = Number(targetRaw);
  if (toleranceRaw !== '') step.tolerance = Math.abs(Number(toleranceRaw));
  if (targetRaw !== '' && toleranceRaw !== '') {
    const range412C = calcMeasureRange412C(targetRaw, toleranceRaw, minRaw, maxRaw);
    step.min = range412C.min;
    step.max = range412C.max;
  }
  if (['VoltageMeasurement','CurrentMeasurement','ResistanceTest','FrequencyTest','AnalogInputMeasurement'].includes(type)) {
    step.measurement_mode = document.getElementById('w-measure-mode')?.value || 'auto_with_fallback';
    step.manual_fallback_enabled = Boolean(document.getElementById('w-manual-fallback-enabled')?.checked);
    if (step.measurement_mode === 'manual') { step.manual_input_enabled = true; step.device_mapping = 'manual'; step.io_type = 'SYSTEM'; }
  }
  const unit = document.getElementById('w-unit').value.trim();
  if (unit) step.unit = unit;
  if (command) step.command = command;
  if (type === 'PowerSupplySet') {
    step.device_mapping = 'AimTTi_PL303';
    step.io_type = 'SCPI';
    step.ps_channel = Number(document.getElementById('w-ps-channel')?.value || 1);
    step.channel = step.ps_channel;
    step.ps_voltage = Number(document.getElementById('w-ps-voltage')?.value || 0);
    step.ps_current = Number(document.getElementById('w-ps-current')?.value || 0);
    step.ps_output_on = document.getElementById('w-ps-output')?.value !== 'false';
    step.value = { voltage: step.ps_voltage, current: step.ps_current, outputOn: step.ps_output_on };
    step.unit = 'V/A';
  }
  if (type === 'ManualMeasurement') {
    step.manual_measure_type = document.getElementById('w-manual-type').value;
    const manualCmdMap = { SCPI_VOLT_DC:'MEAS:VOLT:DC?', SCPI_CURR_DC:'MEAS:CURR:DC?', SCPI_FREQ:'MEAS:FREQ?', SCPI_OHM:'MEAS:RES?' };
    const manualUnitMap = { SCPI_VOLT_DC:'V', SCPI_CURR_DC:'A', SCPI_FREQ:'Hz', SCPI_OHM:'Ω' };
    if (manualCmdMap[step.manual_measure_type]) {
      step.command = command || manualCmdMap[step.manual_measure_type];
      step.unit = unit || manualUnitMap[step.manual_measure_type];
      step.device_mapping = document.getElementById('w-device')?.value || 'Keysight_34461A';
      step.io_type = 'SCPI';
    }
    step.manual_input_enabled = Boolean(document.getElementById('w-manual-input-enabled')?.checked) || step.manual_measure_type === 'MANUAL_VALUE' || document.getElementById('w-measure-mode')?.value === 'manual';
    step.measurement_mode = document.getElementById('w-measure-mode')?.value || (step.manual_input_enabled ? 'manual' : 'auto_with_fallback');
    step.manual_fallback_enabled = Boolean(document.getElementById('w-manual-fallback-enabled')?.checked);
    step.stable_time_ms = Number(document.getElementById('w-stable-time').value) || 0;
    if (currentInstructionImageDataUrl) step.instruction_image = currentInstructionImageDataUrl;
    if (!manualCmdMap[step.manual_measure_type]) step.io_type = step.manual_measure_type === 'CONFIRM' ? 'SYSTEM' : step.manual_measure_type;
    if (['DI','DO'].includes(step.manual_measure_type)) step.value = document.getElementById('w-value-bool').value === 'true';
  }
  return step;
}


async function selectInstructionImageForStep() {
  if (!api || !api.selectInstructionImage) { alert('Selettore immagini disponibile solo in Electron.'); return; }
  const res = await api.selectInstructionImage();
  if (!res || !res.ok) return;
  currentInstructionImageDataUrl = res.dataUrl;
  document.getElementById('w-instruction-image-name').value = res.path || 'immagine selezionata';
  const img = document.getElementById('w-instruction-image-preview');
  img.src = currentInstructionImageDataUrl;
  img.style.display = 'block';
}
function clearInstructionImage() {
  currentInstructionImageDataUrl = '';
  document.getElementById('w-instruction-image-name').value = '';
  const img = document.getElementById('w-instruction-image-preview');
  img.removeAttribute('src'); img.style.display = 'none';
}

function saveWizardStep() {
  const step = wizardStepFromForm(true);
  if (!step.label) step.label = step.type;
  if (wizardEditIndex === null) {
    recipe.steps.push(step);
    addLog(document.getElementById('sys-log'), `Step wizard aggiunto: <b>${step.label}</b>`, 'info');
  } else {
    recipe.steps[wizardEditIndex] = step;
    addLog(document.getElementById('sys-log'), `Step modificato: <b>${step.label}</b>`, 'info');
  }
  renumberRecipeSteps();
  renderSteps();
  closeStepWizard();
}

function addStep() { openStepWizard(); }

function editStep(idx) { openStepWizard(idx); }

function cloneStep(idx) {
  const copy = JSON.parse(JSON.stringify(recipe.steps[idx]));
  copy.step_id = stepIdCounter++;
  copy.label = `${copy.label || copy.type} copia`;
  recipe.steps.splice(idx + 1, 0, copy);
  renumberRecipeSteps();
  renderSteps();
}


function setUiBusy(on, label = '') {
  uiBusyCount = Math.max(0, uiBusyCount + (on ? 1 : -1));
  lastUiOperation = on ? label : lastUiOperation;
  const busy = uiBusyCount > 0;
  document.body.classList.toggle('ui-busy', busy);
  const w = document.getElementById('ui-watchdog');
  if (w) {
    w.style.display = busy ? 'block' : 'none';
    w.textContent = busy ? `⚠️ Operazione in corso: ${label || lastUiOperation || 'attendere timeout'}` : '';
  }
}

function normalizeError(e) {
  if (!e) return 'Errore sconosciuto';
  return e.message || String(e);
}

function isHardwareLiveStatus(st) {
  if (!st) return false;
  if (st.live === true) return true;
  if (st.connected === true && st.mock !== true) return true;
  if (String(st.status || '').toUpperCase() === 'LIVE') return true;
  return st.mock === false;
}

function getHardwareStatusByName(name) {
  return (latestHardwareStatuses || []).find(x => x.name === name || x.device === name);
}

async function guardedUi(label, fn, opts = {}) {
  const timeoutMs = opts.timeoutMs || 5000;
  const logTo = opts.logTo || document.getElementById('sys-log');
  setUiBusy(true, label);
  const seq = ++safeCallSeq;
  try {
    return await withTimeout(Promise.resolve().then(fn), timeoutMs, label);
  } catch (e) {
    console.error(`[UI] ${label} failed`, e);
    addLog(logTo, `❌ ${escapeHtml(label)}: ${escapeHtml(normalizeError(e))}`, 'fail');
    return opts.fallback;
  } finally {
    if (seq === safeCallSeq || opts.alwaysUnlock !== false) setUiBusy(false, label);
  }
}

/* 3.95: gestione errori centralizzata nel blocco iniziale.
   Manteniamo solo lo sblocco UI locale senza aggiungere un secondo log duplicato. */
if (!window.__AT_MEC_UI_BUSY_ERROR_UNLOCK_395__) {
  window.__AT_MEC_UI_BUSY_ERROR_UNLOCK_395__ = true;
  window.addEventListener('error', () => setUiBusy(false, 'errore grafica'));
  window.addEventListener('unhandledrejection', () => setUiBusy(false, 'promise rejection'));
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label || 'Operazione'} timeout ${ms}ms`)), ms); })
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

async function readWizardValue() {
  if (wizardLiveBusy) return;
  wizardLiveBusy = true;
  const step = wizardStepFromForm(false);
  const live = document.getElementById('w-live-value');
  if (!api) { setWizardLiveChip('mock', 'Lettura disponibile avviando l’app Electron.'); wizardLiveBusy = false; return; }
  try {
    let val = null;
    if (step.type === 'AnalogInputMeasurement') {
      val = await withTimeout(api.queryMultimeter(step.device_mapping || 'Keysight_34461A', step.command || 'MEAS:VOLT:DC?'), 1800, 'DMM live');
      setWizardLiveChip('analog', `${val} ${step.unit || 'V'}`);
    } else if (step.type === 'DigitalInputCheck') {
      val = await withTimeout(api.readDigitalInput(step.channel || 0), 900, 'DI live');
      liveIoSnapshot[`DI_${step.channel}`] = Boolean(val);
      setWizardLiveChip(val ? 'high' : 'low', `GPIO${step.channel} = ${val ? 'HIGH' : 'LOW'}`);
      renderIoGrid();
    } else if (step.type === 'DigitalOutputSet') {
      // Stabilità: il live del wizard NON deve scrivere uscite in polling. Legge soltanto lo stato reale.
      val = api.readDigitalOutput ? await withTimeout(api.readDigitalOutput(step.channel || 0), 1200, 'DO feedback') : Boolean(step.value);
      liveIoSnapshot[`DO_${step.channel}`] = Boolean(val);
      setWizardLiveChip(val ? 'high' : 'low', `GPIO${step.channel} feedback = ${val ? 'HIGH' : 'LOW'}; target step ${Boolean(step.value) ? 'HIGH' : 'LOW'}`);
      renderIoGrid();
    } else if (step.command || step.type.includes('Measurement') || step.type.includes('Test')) {
      val = await withTimeout(api.queryMultimeter(step.device_mapping, step.command || 'MEAS:VOLT:DC?'), 1500, 'Strumento live');
      setWizardLiveChip('analog', `${val} ${step.unit || ''}`);
    } else {
      setWizardLiveChip('mock', 'Tipo non leggibile live');
    }
  } catch (e) {
    setWizardLiveChip('low', `Errore lettura: ${e.message}`);
  } finally {
    wizardLiveBusy = false;
  }
}

function setWizardLiveChip(kind, text) {
  const live = document.getElementById('w-live-value');
  live.className = `live-chip ${kind === 'high' ? 'high' : kind === 'low' ? 'low' : ''}`;
  live.innerHTML = `<span class="live-dot"></span><span>${escapeHtml(text)}</span>`;
}

function toggleWizardLive() {
  if (wizardLiveInterval) stopWizardLive();
  else startWizardLive();
}

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
  if (recipe?.recipe_name === name) { recipe = { recipe_name:'Nuova Ricetta', version:1, enabled:true, power_metadata:'PL303_PROGRAMMABLE', steps:[] }; stepIdCounter = 1; }
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
    recipe = loaded;
    stepIdCounter = Math.max(...recipe.steps.map(s => s.step_id), 0) + 1;
    document.getElementById('recipe-name-inp').value = recipe.recipe_name;
    setPowerSourceValue(recipe.power_metadata || 'PL303_PROGRAMMABLE');
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
      completeLogin(res.operator || operator, res.role || 'Operator', res.level || 0);
      return;
    } catch (e) { document.getElementById('login-status').textContent = '❌ Errore login: ' + normalizeError(e); return; }
  }
  document.getElementById('login-status').textContent = `✅ ${operator} [offline]`;
  completeLogin(operator, 'Offline', 0);
}

async function startTest() {
  productionForceComplete = false;
  if (!requireLogin()) return;
  if (startInProgress) return;
  startInProgress = true;
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
    recipe.enabled = document.getElementById('recipe-enabled-page') ? document.getElementById('recipe-enabled-page').checked : (recipe.enabled !== false);
    if (recipe.enabled === false) { alert('Ricetta disabilitata: attiva il flag per eseguire.'); return; }
    if (recipe.steps.filter(s => s.enabled !== false).length === 0) { alert('Aggiungi o abilita almeno uno step alla ricetta prima di avviare!'); return; }
    if (!api) { addLog(document.getElementById('run-log'), '⚠️ Avvia tramite Electron (npm run build && npm start)', 'warn'); return; }
    await guardedUi('RECOVER stato prima avvio', () => api.recoverFault(), { timeoutMs: 2500, logTo: document.getElementById('run-log'), fallback: { ok:false } });
    await guardedUi('Auto collegamento strumenti necessari', () => autoConnectProductionInstruments(false), { timeoutMs: 8000, logTo: document.getElementById('run-log'), fallback: null });
    const sampleOk = await runPreTestSampleWizard();
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
    recipe.power_metadata = getPowerSourceValue();
    document.getElementById('result-banner')?.classList.remove('show');
    document.getElementById('fault-panel')?.classList.remove('show');
    stepStatusMap = {};
    lastStopWasOperator = false;
    startProductionTimer();
    setProductionTimingState('IN ESECUZIONE');
    clearLog();
    renderSteps();
    let res = await guardedUi('Avvio ricetta', () => api.startTest(JSON.parse(JSON.stringify(recipe)), serial, { lotNumber, workOrder: lotNumber, serialRequired: isSerialRequired() }), { timeoutMs: 5000, logTo: document.getElementById('run-log'), fallback: { ok:false, error:'timeout avvio ricetta' } });
    if (res && !res.ok && String(res.error || '').includes('Ricetta già in esecuzione')) {
      addLog(document.getElementById('run-log'), '⚠️ Motore test rimasto in RUNNING: eseguo STOP/RESET automatico e ritento avvio.', 'warn');
      await stopTestAndReset();
      await guardedUi('RECOVER dopo RUNNING bloccato', () => api.recoverFault(), { timeoutMs: 2000, logTo: document.getElementById('run-log'), fallback:{ok:false} });
      res = await guardedUi('Avvio ricetta dopo reset', () => api.startTest(JSON.parse(JSON.stringify(recipe)), serial, { lotNumber, workOrder: lotNumber, serialRequired: isSerialRequired() }), { timeoutMs: 5000, logTo: document.getElementById('run-log'), fallback: { ok:false, error:'timeout avvio dopo reset' } });
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
        res = await guardedUi('Avvio ricetta ritest', () => api.startTest(JSON.parse(JSON.stringify(recipe)), serial, { lotNumber, workOrder: lotNumber, overrideDuplicate: true, repairNote: pendingRepairNote, serialRequired: isSerialRequired() }), { timeoutMs: 5000, logTo: document.getElementById('run-log'), fallback: { ok:false, error:'timeout avvio ritest' } });
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
  const power = getPowerSourceValue() || recipe.power_metadata || 'MANUAL_POWER';
  if (power === 'ESP32_RELAY_POWER') required.add('modbus_serial');
  if (power === 'PL303_PROGRAMMABLE') required.add('AimTTi_PL303');
  for (const step of (recipe.steps || []).filter(s => s.enabled !== false)) {
    if (['DI','DO'].includes(step.io_type) || step.type === 'DigitalInputCheck' || step.type === 'DigitalOutputSet') required.add('modbus_serial');
    if (['VoltageMeasurement','CurrentMeasurement','ResistanceTest','FrequencyTest','AnalogInputMeasurement'].includes(step.type)) required.add(step.device_mapping || 'Keysight_34461A');
    if (step.type === 'PowerSupplySet') required.add('AimTTi_PL303');
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
  return Array.from(required).filter(Boolean);
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
  const required = new Set(getRequiredInstrumentsForRecipe().filter(name => !excludedInstruments.includes(name)));

  try { latestHardwareStatuses = await withTimeout(api.getHardwareStatuses(), 1800, 'stato hardware'); } catch {}

  // Fix 2.18: se serve ESP32, verifica prima il backend JSON già vivo e poi tenta SOLO ESP32.
  // Non usare esp32ConnectOnPort qui: quella funzione collega anche altri strumenti e può causare
  // timeout validazione pur avendo ESP32 correttamente collegata.
  if (required.has('modbus_serial')) {
    let espStatus = getHardwareStatusByName('modbus_serial');
    if (!isHardwareLiveStatus(espStatus)) {
      try {
        const info = await withTimeout(api.getEsp32Info?.(), 1800, 'info ESP32');
        if (info?.live === true) {
          latestHardwareStatuses = latestHardwareStatuses || [];
          const existing = getHardwareStatusByName('modbus_serial');
          if (existing) { existing.mock = false; existing.connected = true; }
          else latestHardwareStatuses.push({ name:'modbus_serial', mock:false, connected:true, connectionString: info.connectionString || 'ESP32 JSON' });
        }
      } catch {}
    }

    espStatus = getHardwareStatusByName('modbus_serial');
    if (!isHardwareLiveStatus(espStatus)) {
      const cfg = api.getAppSettings ? await withTimeout(api.getAppSettings(), 1200, 'settings ESP32').catch(() => ({})) : {};
      const selected = document.getElementById('esp32-control-com')?.value || document.getElementById('cfg-esp-com')?.value || cfg.esp32Port || '';
      const port = selected && selected !== 'mock' ? selected : (cfg.esp32Port || '');
      const baud = Number(document.getElementById('cfg-esp-baud')?.value || cfg.esp32Baud || 115200);
      if (port && port !== 'mock') {
        addLog(document.getElementById('run-log'), `ℹ️ ESP32 richiesta: collegamento rapido su ${escapeHtml(port)}...`, 'info');
        let quick = null;
        if (api.connectEsp32Only) quick = await withTimeout(api.connectEsp32Only({ port, baud }), 4200, 'connessione rapida ESP32').catch(e => ({ ok:false, error: normalizeError(e) }));
        else quick = await guardedUi('Connessione rapida ESP32', () => api.reconnectHardware([{ name:'modbus_serial', conn:port, baud }]), { timeoutMs: 4300, logTo: document.getElementById('run-log'), fallback: [] });
        if (quick?.statuses) latestHardwareStatuses = quick.statuses;
        else { try { latestHardwareStatuses = await withTimeout(api.getHardwareStatuses(), 1200, 'stato hardware post ESP32'); } catch {} }
      }
    }
  }

  const missing = [...required].filter(name => !excludedInstruments.includes(name) && !isHardwareLiveStatus(getHardwareStatusByName(name)));
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
function collectReportsForLot(){
  const f=getLotFilterPayload();
  const lot=f.lot.toLowerCase();
  let rows=[];
  const all = Array.isArray(auditCache) ? auditCache.slice() : [];
  rows = all.filter(r => {
    const rlot=String(r.lot_number || r.work_order || '').toLowerCase();
    const rsn=String(r.serial_dut || '').toLowerCase();
    const rr=String(r.final_result || '').toUpperCase();
    if(lot && !rlot.includes(lot)) return false;
    if(f.serial && !rsn.includes(f.serial.toLowerCase())) return false;
    if(f.result && f.result !== 'ALL' && rr !== f.result) return false;
    return true;
  });
  return rows.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
}
async function loadLotDashboard(){
  if(!Array.isArray(auditCache) || !auditCache.length) { try { await loadAudit(); } catch{} }
  const f=getLotFilterPayload();
  const rows=collectReportsForLot();
  const pass=rows.filter(r=>String(r.final_result).toUpperCase()==='PASS').length;
  const fail=rows.filter(r=>String(r.final_result).toUpperCase()==='FAIL').length;
  const serials=new Set(rows.map(r=>String(r.serial_dut||'').trim()).filter(Boolean));
  const yieldRate=rows.length ? ((pass/rows.length)*100).toFixed(1) : '0.0';
  const top={};
  rows.filter(r=>String(r.final_result).toUpperCase()==='FAIL').forEach(r=>{ const fl=(r.steps_log||[]).find(x=>x.result==='FAIL'); const k=fl ? `${fl.step_id||''} ${fl.type||''}`.trim() : (r.recipe_name||'FAIL'); top[k]=(top[k]||0)+1; });
  const topHtml=Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`<div class="lot-list-row"><div>${escapeHtml(k)}</div><div>${v}</div><div>FAIL</div><div></div></div>`).join('') || '<div class="hint">Nessun guasto nel filtro.</div>';
  const list=rows.slice(0,30).map(r=>`<div class="lot-list-row"><div><b>${escapeHtml(r.serial_dut||'-')}</b><br><span class="hint">${escapeHtml(r.recipe_name||'')} · ${new Date(r.timestamp).toLocaleString('it-IT')}</span></div><div class="${String(r.final_result).toLowerCase()==='pass'?'validation-ok':'validation-fail'}">${escapeHtml(r.final_result||'')}</div><div>${escapeHtml(String(r.execution_time_ms?((r.execution_time_ms/1000).toFixed(1)+'s'):''))}</div><div>${escapeHtml(r.operator||'')}</div></div>`).join('') || '<div class="hint">Nessun test trovato per questo lotto/filtro.</div>';
  const el=document.getElementById('lot-dashboard-result');
  if(el) el.innerHTML=`<div class="lot-grid"><div class="lot-card"><div class="big">${rows.length}</div><div>Test lotto</div></div><div class="lot-card"><div class="big">${serials.size}</div><div>Seriali unici</div></div><div class="lot-card"><div class="big" style="color:var(--pass)">${pass}</div><div>PASS</div></div><div class="lot-card"><div class="big" style="color:var(--fail)">${fail}</div><div>FAIL</div></div><div class="lot-card"><div class="big">${yieldRate}%</div><div>Yield</div></div></div><h4>Top difetti</h4>${topHtml}<h4>Ultimi seriali lotto ${escapeHtml(f.lot||'')}</h4>${list}`;
}
function copyLotToDbFilters(){
  const lot=document.getElementById('lot-manager-input')?.value||''; const serial=document.getElementById('lot-manager-serial')?.value||''; const result=document.getElementById('lot-manager-result')?.value||'ALL';
  const dl=document.getElementById('db-lot'); if(dl) dl.value=lot; const ds=document.getElementById('db-serial'); if(ds) ds.value=serial; const dr=document.getElementById('db-result'); if(dr) dr.value=result;
  loadDatabaseDashboard();
}
function exportLotCsv(){
  const rows=collectReportsForLot(); const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const head=['Data','Lotto','Seriale','Esito','Ricetta','Versione','Operatore','Tempo_s','Riparazione'];
  const body=rows.map(r=>[r.timestamp||'',r.lot_number||r.work_order||'',r.serial_dut||'',r.final_result||'',r.recipe_name||'',r.recipe_version||'',r.operator||'',r.execution_time_ms?Number(r.execution_time_ms/1000).toFixed(2):'',r.repair_note||''].map(esc).join(';')).join('\n');
  downloadTextFile(`AT-MEC_lotto_${(getLotFilterPayload().lot||'ALL').replace(/[^a-z0-9_-]+/gi,'_')}_${new Date().toISOString().slice(0,10)}.csv`, head.map(esc).join(';')+'\n'+body, 'text/csv');
}
function exportLotPdf(){
  const f=getLotFilterPayload(); const rows=collectReportsForLot();
  const pass=rows.filter(r=>String(r.final_result).toUpperCase()==='PASS').length; const fail=rows.filter(r=>String(r.final_result).toUpperCase()==='FAIL').length; const y=rows.length?((pass/rows.length)*100).toFixed(1):'0.0';
  let html=`<html><head><title>Report lotto ${escapeHtml(f.lot||'ALL')}</title><style>body{font-family:Arial;padding:28px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:6px;font-size:12px}.pass{color:green;font-weight:bold}.fail{color:red;font-weight:bold}.k{display:inline-block;margin-right:20px;font-size:14px}

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
  html+=`<h1>AT-MEC - Report lotto</h1><p><b>Lotto:</b> ${escapeHtml(f.lot||'Tutti')}<br><b>Generato:</b> ${new Date().toLocaleString('it-IT')}</p>`;
  html+=`<p><span class="k">Test: <b>${rows.length}</b></span><span class="k">PASS: <b>${pass}</b></span><span class="k">FAIL: <b>${fail}</b></span><span class="k">Yield: <b>${y}%</b></span></p>`;
  html+=`<table><thead><tr><th>Data</th><th>Seriale</th><th>Esito</th><th>Ricetta</th><th>Operatore</th><th>Riparazione</th></tr></thead><tbody>`+rows.map(r=>`<tr><td>${new Date(r.timestamp).toLocaleString('it-IT')}</td><td>${escapeHtml(r.serial_dut||'')}</td><td class="${String(r.final_result).toLowerCase()}">${escapeHtml(r.final_result||'')}</td><td>${escapeHtml(r.recipe_name||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('')+`</tbody></table>`;
  const sig=getOperatorSignature(); if(sig.name) html+=`<p style="margin-top:28px"><b>Firma operatore:</b> ${escapeHtml(sig.name)}<br><b>Nota:</b> ${escapeHtml(sig.note||'')}</p>`;
  html+='</body></html>'; const w=window.open('', '_blank'); if(!w){downloadTextFile('report_lotto.html', html, 'text/html');return;} w.document.write(html); w.document.close(); setTimeout(()=>{try{w.print();}catch{}},350);
}
function validateRecipeAdvanced(showAlert=false){
  const issues=[]; const warnings=[]; const steps=Array.isArray(recipe?.steps)?recipe.steps:[];
  if(!recipe?.recipe_name || recipe.recipe_name==='Nuova Ricetta') warnings.push('Nome ricetta generico: assegna un nome chiaro.');
  if(!steps.length) issues.push('Nessuno step configurato.');
  steps.forEach((st,i)=>{ const n=i+1; const type=String(st.type||'');
    if(!type) issues.push(`Step ${n}: tipo mancante.`);
    if(['VoltageMeasurement','CurrentMeasurement','ResistanceTest','FrequencyTest','ManualMeasurement','PowerSupplyMeasureCurrent'].includes(type)){
      const hasRange = st.min !== undefined || st.max !== undefined || st.expected !== undefined || st.value !== undefined;
      if(!hasRange) warnings.push(`Step ${n}: misura senza valore atteso/min/max.`);
      if(st.min!==undefined && st.max!==undefined && Number(st.min)>Number(st.max)) issues.push(`Step ${n}: min maggiore di max.`);
    }
    if(type==='PowerSupplySet' && (st.voltage===undefined || st.current_limit===undefined)) warnings.push(`Step ${n}: alimentatore senza tensione o limite corrente.`);
    if(type==='Delay' && !Number(st.timeout||st.ms||st.value)) warnings.push(`Step ${n}: attesa senza tempo valido.`);
    if((st.if_fail_goto!==undefined || st.goto_on_fail!==undefined) && Number(st.if_fail_goto||st.goto_on_fail)>steps.length) issues.push(`Step ${n}: IF FAIL punta a step inesistente.`);
    if(st.loop_count!==undefined && Number(st.loop_count)<1) issues.push(`Step ${n}: loop_count non valido.`);
  });
  const box=document.getElementById('recipe-health');
  const html=`<div class="recipe-validation-list"><div class="${issues.length?'validation-fail':warnings.length?'validation-warn':'validation-ok'}">${issues.length?'Ricetta NON valida':warnings.length?'Ricetta valida con avvisi':'Ricetta OK'}</div>${issues.map(x=>`<div>❌ ${escapeHtml(x)}</div>`).join('')}${warnings.map(x=>`<div>⚠️ ${escapeHtml(x)}</div>`).join('') || '<div>✅ Nessun avviso importante.</div>'}</div>`;
  if(box) box.innerHTML=html;
  if(showAlert) alert(issues.length ? `Ricetta NON valida: ${issues.length} errori, ${warnings.length} avvisi.` : `Ricetta valida: ${warnings.length} avvisi.`);
  return { ok: issues.length===0, issues, warnings };
}
try { const oldRenderRecipePage = renderRecipePage; renderRecipePage = function(){ oldRenderRecipePage(); try{ validateRecipeAdvanced(false); loadOperatorSignature(); }catch{} }; } catch{}

function esp32Log(text, cls='info') {
  addLog(document.getElementById('esp32-control-log'), text, cls);
}

function getEsp32Channels(type, opts = {}) {
  const onlySafe = opts.onlySafe === true;
  return (esp32IoCatalog || [])
    .filter(x => String(x.io_type || '').toUpperCase() === type)
    .filter(x => !onlySafe || x.safe !== false)
    .filter(x => Number.isFinite(Number(x.channel)) && Number(x.channel) > 0);
}

function isEsp32SafeChannel(type, channel) {
  return getEsp32Channels(type).some(x => Number(x.channel) === Number(channel) && x.safe !== false);
}

async function initEsp32ControlPage() {
  if (esp32ControlInitialized) return;
  esp32ControlInitialized = true;
  await loadEsp32IoCatalog();
  renderEsp32ControlGrids();
  await esp32ControlScanPorts(false);
  await esp32ControlRefreshStatus();
}

function renderEsp32ControlGrids() {
  const doGrid = document.getElementById('esp32-do-grid');
  const inGrid = document.getElementById('esp32-input-grid');
  if (!doGrid || !inGrid) return;
  const dos = getEsp32Channels('DO');
  const dis = getEsp32Channels('DI');
  const ais = getEsp32Channels('AI');
  doGrid.innerHTML = (dos.length ? dos : Array.from({length:16},(_,i)=>({io_type:'DO',channel:i,label:`DO_${String(i).padStart(2,'0')}`,safe:true}))).map(ch => {
    const key = `DO_${ch.channel}`;
    const val = liveIoSnapshot[key];
    const cls = val === true ? 'high' : val === false ? 'low' : '';
    const disabled = ch.safe === false;
    return `<div class="io-control-card ${disabled?'disabled':''}">
      <div class="io-control-head"><span class="io-name">${escapeHtml(ch.label || key)}</span><span id="esp32-state-${key}" class="state-led ${cls}">${val === true ? 'HIGH' : val === false ? 'LOW' : '---'}</span></div>
      <div class="detail-line">GPIO ${ch.channel}${ch.note ? ' — '+escapeHtml(ch.note) : ''}</div>
      <div class="row">
        <button class="btn btn-success btn-xs" ${disabled?'disabled':''} onclick="esp32SetDo(${Number(ch.channel)}, true)">HIGH</button>
        <button class="btn btn-ghost btn-xs" ${disabled?'disabled':''} onclick="esp32SetDo(${Number(ch.channel)}, false)">LOW</button>
        <button class="btn btn-ghost btn-xs" onclick="esp32ReadOne('DO', ${Number(ch.channel)})">Leggi</button>
      </div>
    </div>`;
  }).join('');
  inGrid.innerHTML = [
    ...(dis.length ? dis : Array.from({length:16},(_,i)=>({io_type:'DI',channel:i,label:`DI_${String(i).padStart(2,'0')}`,safe:true}))),
    ...(ais.length ? ais : Array.from({length:8},(_,i)=>({io_type:'AI',channel:i,label:`AI_${String(i).padStart(2,'0')}`,safe:true})))
  ].map(ch => {
    const type = String(ch.io_type).toUpperCase();
    const key = `${type}_${ch.channel}`;
    const val = liveIoSnapshot[key];
    const cls = val === true ? 'high' : val === false ? 'low' : '';
    const text = typeof val === 'number' ? val.toFixed(3) : (val === true ? 'HIGH' : val === false ? 'LOW' : '---');
    return `<div class="io-control-card ${ch.safe===false?'disabled':''}">
      <div class="io-control-head"><span class="io-name">${escapeHtml(ch.label || key)}</span><span id="esp32-state-${key}" class="state-led ${cls}">${text}</span></div>
      <div class="detail-line">${type === 'AI' ? 'Ingresso analogico' : 'Ingresso digitale'} — GPIO ${ch.channel}</div>
      <button class="btn btn-ghost btn-xs" onclick="esp32ReadOne('${type}', ${Number(ch.channel)})">Leggi ora</button>
    </div>`;
  }).join('');
}

function updateEsp32ControlChip(type, channel, value) {
  const key = `${type}_${channel}`;
  liveIoSnapshot[key] = value;
  const el = document.getElementById(`esp32-state-${key}`);
  if (!el) return;
  el.classList.remove('high','low');
  if (value === true) { el.classList.add('high'); el.textContent = 'HIGH'; }
  else if (value === false) { el.classList.add('low'); el.textContent = 'LOW'; }
  else if (typeof value === 'number') { el.textContent = value.toFixed(3); }
  else { el.textContent = '---'; }
}

async function esp32ControlScanPorts(log=true) {
  const list = document.getElementById('esp32-control-ports');
  const sel = document.getElementById('esp32-control-com');
  if (!api || !list || !sel) return;
  try {
    const ports = await guardedUi('Scansione periferiche ESP32', () => api.scanSerialPorts(), { timeoutMs: 3500, logTo: document.getElementById('esp32-control-log'), fallback: [] });
    serialPortsCache = Array.isArray(ports) ? ports : [];
    sel.innerHTML = '<option value="mock">mock</option>' + serialPortsCache.map(p => `<option value="${escapeHtml(p.path)}">${escapeHtml(p.friendlyName || p.path)}${p.likelyEsp32 ? ' ⭐ ESP32' : ''}</option>`).join('');
    const cfgSel = document.getElementById('cfg-esp-com');
    if (cfgSel?.value && cfgSel.value !== 'mock') sel.value = cfgSel.value;
    else {
      const likely = serialPortsCache.find(p => p.likelyEsp32);
      if (likely) sel.value = likely.path;
    }
    list.innerHTML = serialPortsCache.map(p => `<div class="port-card ${p.likelyEsp32?'likely':''}"><div><b>${escapeHtml(p.path)}</b><div class="detail-line">${escapeHtml(p.friendlyName || p.manufacturer || 'periferica seriale')}</div></div><button class="btn btn-ghost btn-xs" onclick="document.getElementById('esp32-control-com').value='${escapeHtml(p.path)}'">Usa</button></div>`).join('') || '<div class="detail-line">Nessuna periferica seriale trovata.</div>';
    if (log) esp32Log(`Periferiche trovate: <b>${serialPortsCache.length}</b>`, 'info');
  } catch(e) { list.innerHTML = '❌ ' + escapeHtml(e.message || e); }
}

async function esp32ConnectOnPort(port, log=true) {
  const baud = Number(document.getElementById('cfg-esp-baud')?.value || 115200);
  if (document.getElementById('cfg-esp-com')) document.getElementById('cfg-esp-com').value = port;
  if (document.getElementById('esp32-control-com')) document.getElementById('esp32-control-com').value = port;
  if (api?.saveAppSettings) {
    try { await api.saveAppSettings({ esp32Port: port, esp32Baud: baud }); } catch {}
  }
  const configs = [
    { name: 'modbus_serial', conn: port, baud },
    { name: 'Keysight_34461A', conn: ((document.getElementById('cfg-keysight-mode')?.value === 'USB') ? 'usb://' : '') + (document.getElementById('cfg-keysight-ip')?.value || '127.0.0.1'), baud: Number(document.getElementById('cfg-keysight-port')?.value || 5025) },
    { name: 'AimTTi_PL303', conn: document.getElementById('cfg-tti-com')?.value || 'mock', baud: Number(document.getElementById('cfg-tti-baud')?.value || 9600) }
  ];
  const res = await guardedUi('Connessione ESP32/modbus_serial', () => api.reconnectHardware(configs), { timeoutMs: 7000, logTo: document.getElementById('esp32-control-log') || document.getElementById('run-log'), fallback: [] });
  latestHardwareStatuses = Array.isArray(res) ? res : [];
  updateHwBadges(latestHardwareStatuses);
  await esp32ControlRefreshStatus();
  const st = latestHardwareStatuses.find(x => x.name === 'modbus_serial');
  if (log) esp32Log(st && !st.mock ? `✅ ESP32 LIVE su <b>${escapeHtml(port)}</b>. Le ricette useranno modbus_serial.` : `❌ ESP32 non live su ${escapeHtml(port)}.`, st && !st.mock ? 'pass' : 'fail');
  return st && !st.mock;
}

async function esp32ControlConnect() {
  const port = document.getElementById('esp32-control-com')?.value || 'mock';
  await esp32ConnectOnPort(port, true);
}

async function esp32AutoConnectAndUseForRecipes() {
  await esp32ControlScanPorts(false);
  const selected = document.getElementById('esp32-control-com')?.value;
  const likely = serialPortsCache.find(p => p.likelyEsp32)?.path;
  const port = (selected && selected !== 'mock') ? selected : (likely || serialPortsCache[0]?.path || 'mock');
  if (!port || port === 'mock') { esp32Log('❌ Nessuna COM ESP32 trovata. Controlla cavo USB dati e driver.', 'fail'); return; }
  document.getElementById('esp32-control-com').value = port;
  const ok = await esp32ConnectOnPort(port, true);
  if (ok) {
    setPowerSourceValue('ESP32_RELAY_POWER');
    const psPage = document.getElementById('power-source-page'); if (psPage) psPage.value = 'ESP32_RELAY_POWER';
    recipe.power_metadata = 'ESP32_RELAY_POWER';
    esp32Log('✅ ESP32 impostata come hardware ricetta. Ora puoi avviare test con I/O ESP32.', 'pass');
    addLog(document.getElementById('run-log'), '✅ ESP32 LIVE: modbus_serial pronto per ricette.', 'pass');
  }
}

async function esp32ControlInfo() {
  if (!api) return;
  try {
    const info = await guardedUi('Info ESP32', () => api.getEsp32Info(), { timeoutMs: 3500, logTo: document.getElementById('esp32-control-log'), fallback: null });
    if (info) {
      document.getElementById('esp32-control-fw').textContent = `FW: ${info.fw || info.version || 'n/d'}`;
      esp32Log(`Info: ${escapeHtml(JSON.stringify(info))}`, 'info');
    }
  } catch(e) { esp32Log(`❌ Info ESP32: ${escapeHtml(e.message || e)}`, 'fail'); }
}

async function esp32ControlRefreshStatus() {
  try {
    const statuses = api ? await withTimeout(api.getHardwareStatuses(), 2500, 'stato hardware') : [];
    latestHardwareStatuses = Array.isArray(statuses) ? statuses : [];
    const esp = latestHardwareStatuses.find(x => x.name === 'modbus_serial' || x.name === 'ESP32' || String(x.name||'').toLowerCase().includes('esp32'));
    document.getElementById('esp32-control-conn').textContent = `Stato: ${esp?.status || 'n/d'}${esp?.mock ? ' MOCK' : ''}`;
    document.getElementById('esp32-control-port').textContent = `Porta: ${document.getElementById('esp32-control-com')?.value || document.getElementById('cfg-esp-com')?.value || 'n/d'}`;
  } catch {}
}

async function esp32ReadOne(type, channel) {
  if (!api) return;
  try {
    let value;
    if (type === 'DI') value = await guardedUi(`Lettura DI${channel}`, () => api.readDigitalInput(channel), { timeoutMs: 2200, logTo: document.getElementById('esp32-control-log'), fallback: null });
    else if (type === 'DO') value = await guardedUi(`Lettura DO${channel}`, () => api.readDigitalOutput(channel), { timeoutMs: 2200, logTo: document.getElementById('esp32-control-log'), fallback: null });
    else value = await guardedUi(`Lettura AI${channel}`, () => api.readAnalogInput(channel), { timeoutMs: 2200, logTo: document.getElementById('esp32-control-log'), fallback: null });
    if (value !== null) updateEsp32ControlChip(type, channel, value);
    return value;
  } catch(e) { esp32Log(`❌ ${type}${channel}: ${escapeHtml(e.message || e)}`, 'fail'); return null; }
}

async function esp32SetDo(channel, state) {
  if (!api) return { ok:false, error:'api non disponibile' };
  channel = Number(channel);
  if (!isEsp32SafeChannel('DO', channel)) {
    const msg = `GPIO${channel} non valido o disabilitato per uscita digitale`;
    esp32Log(`⏭️ ${escapeHtml(msg)}`, 'warn');
    return { ok:false, skipped:true, error:msg };
  }
  try {
    const res = await guardedUi(`Set DO${channel} ${state?'HIGH':'LOW'}`, () => api.setDigitalOutput(channel, state), { timeoutMs: 3000, logTo: document.getElementById('esp32-control-log'), fallback: {ok:false, error:'timeout comando'} });
    if (!res || res.ok === false) {
      const err = res?.error || 'comando non confermato';
      esp32Log(`❌ Set DO${channel} ${state?'HIGH':'LOW'}: ${escapeHtml(err)}`, 'fail');
      return { ok:false, error:err };
    }
    updateEsp32ControlChip('DO', channel, state);
    esp32Log(`✅ DO${channel} ${state?'HIGH':'LOW'}`, 'pass');
    setTimeout(() => esp32ReadOne('DO', channel), 120);
    return { ok:true };
  } catch(e) {
    esp32Log(`❌ Set DO${channel}: ${escapeHtml(e.message || e)}`, 'fail');
    return { ok:false, error:e.message || String(e) };
  }
}

async function esp32ControlPollOnce() {
  if (esp32ControlBusy) return;
  esp32ControlBusy = true;
  try {
    const di = getEsp32Channels('DI', { onlySafe:true }).slice(0, 16);
    const doCh = getEsp32Channels('DO', { onlySafe:true }).slice(0, 16);
    const ai = getEsp32Channels('AI', { onlySafe:true }).slice(0, 8);
    for (const ch of [...doCh, ...di, ...ai]) {
      if (!document.getElementById('esp32-live-enable')?.checked) break;
      await esp32ReadOne(String(ch.io_type).toUpperCase(), Number(ch.channel));
      await new Promise(r => setTimeout(r, 20));
    }
  } finally { esp32ControlBusy = false; }
}

function toggleEsp32ControlLive(enabled) {
  if (esp32ControlLiveTimer) { clearInterval(esp32ControlLiveTimer); esp32ControlLiveTimer = null; }
  if (!enabled) { esp32Log('Live ESP32 fermato.', 'warn'); return; }
  const rate = Math.max(250, Number(document.getElementById('esp32-live-rate')?.value || 500));
  esp32Log(`Live ESP32 avviato ogni ${rate} ms.`, 'info');
  esp32ControlPollOnce();
  esp32ControlLiveTimer = setInterval(esp32ControlPollOnce, rate);
}

async function esp32EmergencyLow() {
  if (esp32ControlBusy) { esp32Log('⏳ Attendi: operazione ESP32 già in corso.', 'warn'); return; }
  const live = document.getElementById('esp32-live-enable');
  const liveWasOn = !!live?.checked;
  if (liveWasOn) { live.checked = false; toggleEsp32ControlLive(false); }
  esp32ControlBusy = true;
  try {
    const channels = getEsp32Channels('DO', { onlySafe:true }).slice(0, 32);
    esp32Log(`⛔ Tutte DO LOW: ${channels.length} GPIO validi. GPIO riservati/non validi saltati.`, 'warn');
    let ok = 0, fail = 0;
    for (const ch of channels) {
      const res = await esp32SetDo(Number(ch.channel), false);
      if (res?.ok) ok++; else fail++;
      await new Promise(r => setTimeout(r, 25));
    }
    esp32Log(`✅ Tutte DO LOW completato: ${ok} OK${fail ? ', '+fail+' errori' : ''}.`, fail ? 'warn' : 'pass');
  } finally {
    esp32ControlBusy = false;
    if (liveWasOn && live) { live.checked = true; toggleEsp32ControlLive(true); }
  }
}

function canExitProductionTestRole(role, level) {
  const r = String(role || '').toLowerCase();
  return Number(level || 0) >= 40 || ['admin','administrator','sviluppatore','developer','engineer','ingegnere','tecnico','technician'].some(x => r.includes(x));
}


function stepStatusLabel(status) {
  if (status === 'pass') return 'PASS';
  if (status === 'fail') return 'FAIL';
  if (status === 'running') return 'IN ESECUZIONE';
  return 'DA FARE';
}
function renderProductionSequenceLog() {
  const box = document.getElementById('prod-sequence-log');
  if (!box) return;
  const steps = Array.isArray(recipe?.steps) ? recipe.steps : [];
  if (!steps.length) { box.innerHTML = '<div class="detail-line">Nessuno step nella ricetta selezionata.</div>'; return; }
  box.innerHTML = steps.map((st, idx) => {
    const status = stepStatusMap[st.step_id] || 'todo';
    const label = stepStatusLabel(status);
    return `<div class="prod-seq-row ${status}">
      <div>#${idx + 1}</div>
      <div><b>${escapeHtml(st.label || st.type || 'Step')}</b><div class="detail-line">${escapeHtml(st.type || '')}${st.enabled === false ? ' · DISABILITATO' : ''}</div></div>
      <div class="prod-status-pill ${status}">${label}</div>
    </div>`;
  }).join('');
}
async function loadRecipeMetaForFilter317(name) {
  let r = null;
  try { if (api?.loadRecipe) { const res = await api.loadRecipe(name); if (res?.ok) r = res.recipe; } } catch {}
  if (!r) { try { r = JSON.parse(localStorage.getItem('recipe_' + name) || 'null'); } catch {} }
  return r || { recipe_name: name };
}
async function filterRecipeNamesByClient317(names, filter) {
  if (!filter) return names;
  const out = [];
  for (const n of names) { const meta = await loadRecipeMetaForFilter317(n); if (recipeMatchesClientFilter(meta, filter)) out.push(n); }
  return out;
}

async function refreshProductionRecipes() {
  const sel = document.getElementById('prod-recipe-select');
  if (!sel) return;
  let names = [];
  try { if (api?.listRecipes) names = await api.listRecipes(); } catch {}
  const localNames = Object.keys(localStorage).filter(k => k.startsWith('recipe_')).map(k => k.replace('recipe_', ''));
  names = Array.from(new Set([...(Array.isArray(names) ? names : []), ...localNames])).filter(Boolean).sort();
  names = await filterRecipeNamesByClient317(names, document.getElementById('prod-client-filter')?.value || '');
  productionRecipesCache = names;
  const current = recipe?.recipe_name || '';
  sel.innerHTML = names.map(n => `<option value="${escapeHtml(n)}" ${n===current?'selected':''}>${escapeHtml(n)}</option>`).join('') || '<option value="">Nessuna ricetta salvata</option>';
  if (!current && names[0]) { sel.value = names[0]; await loadProductionRecipeSelection(); }
}

async function refreshProductionRecipeVersions() {
  const sel = document.getElementById('prod-recipe-version-select');
  const name = document.getElementById('prod-recipe-select')?.value || recipe?.recipe_name || '';
  if (!sel) return;
  if (!api?.listRecipeVersions || !name) { sel.innerHTML = '<option value="">ultima</option>'; return; }
  try {
    const versions = await api.listRecipeVersions(name);
    sel.innerHTML = versions && versions.length
      ? '<option value="">ultima</option>' + versions.map(v => `<option value="${v.version}">v${v.version} — ${new Date(v.created_at).toLocaleString('it-IT')}</option>`).join('')
      : '<option value="">ultima</option>';
  } catch { sel.innerHTML = '<option value="">ultima</option>'; }
}

async function loadProductionRecipeRevisionSelection() {
  try { if (api?.safePl303Off) await api.safePl303Off('CAMBIO_REVISIONE_TEST_MODE'); } catch {}
  const name = document.getElementById('prod-recipe-select')?.value || '';
  const version = Number(document.getElementById('prod-recipe-version-select')?.value || 0);
  if (!name) return;
  if (!version) { await loadProductionRecipeSelection(); return; }
  try {
    const res = api?.loadRecipeVersion ? await api.loadRecipeVersion(name, version) : null;
    if (!res?.ok) throw new Error(res?.error || 'Versione non trovata');
    recipe = res.recipe;
    recipe.steps = Array.isArray(recipe.steps) ? recipe.steps : [];
    renumberRecipeSteps();
    syncLoadedRecipeToUi(name);
    addLog(document.getElementById('run-log'), `🕘 Ricetta caricata: <b>${escapeHtml(name)}</b> v${version}`, 'info');
  } catch(e) { addLog(document.getElementById('run-log'), `❌ Versione ricetta: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

function syncLoadedRecipeToUi(name) {
  document.getElementById('recipe-name-inp').value = recipe.recipe_name || name;
  if (document.getElementById('recipe-name-page')) document.getElementById('recipe-name-page').value = recipe.recipe_name || name;
  if (document.getElementById('recipe-client-page')) document.getElementById('recipe-client-page').value = recipe.client_name || recipe.customer || '';
  setPowerSourceValue(recipe.power_metadata || 'MANUAL_POWER');
  if (document.getElementById('recipe-enabled')) document.getElementById('recipe-enabled').checked = recipe.enabled !== false;
  if (document.getElementById('recipe-enabled-page')) document.getElementById('recipe-enabled-page').checked = recipe.enabled !== false;
  stepStatusMap = {};
  renderSteps();
  renderProductionSequenceLog();
  updateProductionTestMode();
  renderRecipePrecheckOperations();
}

async function loadProductionRecipeSelection() {
  try { if (api?.safePl303Off) await api.safePl303Off('CAMBIO_RICETTA_TEST_MODE'); } catch {}
  const name = document.getElementById('prod-recipe-select')?.value || '';
  if (!name) return;
  let loaded = null;
  try { if (api?.loadRecipe) { const res = await api.loadRecipe(name); if (res?.ok) loaded = res.recipe; } } catch {}
  if (!loaded) { try { const raw = localStorage.getItem('recipe_' + name); if (raw) loaded = JSON.parse(raw); } catch {} }
  if (!loaded) { addLog(document.getElementById('run-log'), `❌ Ricetta non caricata: ${escapeHtml(name)}`, 'fail'); return; }
  recipe = loaded;
  recipe.steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  renumberRecipeSteps();
  await refreshProductionRecipeVersions();
  syncLoadedRecipeToUi(name);
  setTimeout(() => autoConnectProductionInstruments(false), 150);
  // AT-MEC_HM_2.29: apri il wizard solo se non e gia aperto; non deve resettare lo step corrente.
  if (productionTestMode) setTimeout(() => {
    const m = document.getElementById('startup-wizard-modal');
    if (m && !m.classList.contains('show')) openStartupWizard(true);
  }, 220);
  addLog(document.getElementById('run-log'), `📂 Ricetta test mode caricata: <b>${escapeHtml(recipe.recipe_name || name)}</b>`, 'info');
}
function canUseProductionDebug() {
  return canExitProductionTestRole(currentUser?.role, currentUser?.level);
}
async function toggleDebugModeFromProduction(enabled) {
  if (!canUseProductionDebug()) {
    const cb = document.getElementById('prod-debug-flag'); if (cb) cb.checked = false;
    addLog(document.getElementById('run-log'), 'Permesso negato: debug consentito solo ad Admin, Sviluppatore, Engineer o Tecnico.', 'fail');
    return;
  }
  try {
    const res = api?.setDebugMode ? await api.setDebugMode(!!enabled) : { ok:false, error:'API non disponibile' };
    addLog(document.getElementById('run-log'), res?.ok ? `🐞 Debug step-by-step ${enabled ? 'attivato' : 'disattivato'}.` : `❌ Debug: ${escapeHtml(res?.error || 'errore')}`, res?.ok ? 'info' : 'fail');
  } catch(e) { addLog(document.getElementById('run-log'), `❌ Debug: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}
async function nextDebugStep() {
  if (!canUseProductionDebug()) return;
  try { await api?.nextStep?.(); } catch(e) { addLog(document.getElementById('run-log'), `❌ Next step: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}
async function autoConnectProductionInstruments(showLog=false) {
  if (!api) return;
  try {
    const cfg = await api.getAppSettings?.() || {};
    excludedInstruments = Array.isArray(cfg.excludedInstruments) ? cfg.excludedInstruments : [];
    const required = new Set(getRequiredInstrumentsForRecipe());

    const configs = [];
    if (required.has('modbus_serial') && !excludedInstruments.includes('modbus_serial')) {
      let port = cfg.esp32Port || document.getElementById('esp32-control-com')?.value || document.getElementById('cfg-esp-com')?.value || '';
      if (!port || port === 'mock') {
        await esp32ControlScanPorts(false);
        port = serialPortsCache.find(p => p.likelyEsp32)?.path || serialPortsCache[0]?.path || 'mock';
      }
      configs.push({ name: 'modbus_serial', conn: port, baud: Number(cfg.esp32Baud || 115200) });
    }
    if (required.has('Keysight_34461A') && !excludedInstruments.includes('Keysight_34461A')) { const km = cfg.keysightMode || 'ETH'; const kr = cfg.keysightIp || '127.0.0.1'; configs.push({ name: 'Keysight_34461A', conn: km === 'USB_COM' ? 'usb://' + kr : km === 'USB_VISA' ? 'visa://' + kr : kr, baud: Number(cfg.keysightPort || (km === 'ETH' ? 5025 : 9600)) }); }
    if (required.has('AimTTi_PL303') && !excludedInstruments.includes('AimTTi_PL303')) configs.push({ name: 'AimTTi_PL303', conn: ((cfg.pl303Mode === 'ETHERNET') ? (cfg.pl303Host || cfg.ttiHost || 'mock') : (cfg.pl303Com || cfg.ttiPort || 'mock')), baud: Number((cfg.pl303Mode === 'ETHERNET') ? (cfg.pl303Port || 9221) : (cfg.pl303Baud || cfg.ttiBaud || 9600)) });
    if (configs.length) {
      const statuses = await guardedUi('Auto collegamento strumenti necessari', () => api.reconnectHardware(configs), { timeoutMs: Math.max(4500, configs.length * 3200), logTo: document.getElementById('run-log'), fallback: [] });
      latestHardwareStatuses = Array.isArray(statuses) ? statuses : latestHardwareStatuses;
    } else {
      try { latestHardwareStatuses = await api.getHardwareStatuses(); } catch {}
    }
    updateHwBadges(latestHardwareStatuses);
    renderProductionHardwareList();
    if (showLog) addLog(document.getElementById('run-log'), '🔌 Auto collegamento strumenti necessari completato.', 'info');
  } catch(e) { addLog(document.getElementById('run-log'), `❌ Auto collegamento strumenti: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

function renderProductionHardwareList() {
  const box = document.getElementById('prod-hardware-list');
  if (!box) return;
  const expected = getRequiredInstrumentsForRecipe();
  const byName = new Map((latestHardwareStatuses || []).map(s => [s.name, s]));
  if (!expected.length) { box.innerHTML = '<div class="hint">Questa ricetta non richiede strumenti automatici. Verifica eventuali operazioni manuali prima di START.</div>'; return; }
  box.innerHTML = expected.map(name => {
    const st = byName.get(name) || { name, status:'NON RILEVATO', mock:true };
    const excluded = excludedInstruments.includes(name);
    const live = isHardwareLiveStatus(st);
    const displayName = getInstrumentDisplayName(name);
    const conn = st.conn || st.port || st.host || st.connection || '-';
    return `<div class="prod-hw-row">
      <div><b>${escapeHtml(displayName)}</b><div class="detail-line">${excluded ? 'ESCLUSO' : (live ? 'LIVE' : 'NON LIVE')}</div></div>
      <div class="detail-line">${escapeHtml(String(conn))}</div>
      <span class="state-led ${live ? 'high' : 'low'}">${excluded ? 'SKIP' : (live ? 'LIVE' : 'ERR')}</span>
      <button class="btn btn-ghost btn-xs" onclick="toggleInstrumentExcluded('${escapeHtml(name)}')">${excluded ? 'Includi' : 'Escludi'}</button>
    </div>`;
  }).join('');
}
async function toggleInstrumentExcluded(name) {
  const idx = excludedInstruments.indexOf(name);
  if (idx >= 0) excludedInstruments.splice(idx, 1); else excludedInstruments.push(name);
  try { await api?.saveAppSettings?.({ excludedInstruments }); } catch {}
  renderProductionHardwareList();
  addLog(document.getElementById('run-log'), `${idx >= 0 ? 'Incluso' : 'Escluso'} strumento: <b>${escapeHtml(name)}</b>`, 'info');
}


function setProductionFinalStatus(status) {
  const b = document.getElementById('prod-status-banner');
  if (!b) return;
  const st = String(status || 'todo').toLowerCase();
  const cls = st.includes('pass') ? 'pass' : st.includes('fail') ? 'fail' : (st.includes('running') || st.includes('run')) ? 'running' : 'todo';
  b.className = 'prod-status-banner ' + cls;
  b.textContent = cls === 'pass' ? 'PASS' : cls === 'fail' ? 'FAIL' : cls === 'running' ? 'IN ESECUZIONE' : 'DA FARE';
}


function formatDurationMs(ms) {
  ms = Math.max(0, Number(ms || 0));
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  return h > 0 ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function estimateRecipeDurationMs() {
  try {
    return (recipe?.steps || []).filter(s => s.enabled !== false).reduce((sum, s) => {
      let t = Number(s.timeout || 0);
      if (String(s.type || '') === 'Delay') t = Math.max(t, Number(s.value || 0));
      if (String(s.type || '') === 'ManualMeasurement') t += Number(s.stable_time_ms || 0);
      if (String(s.type || '') === 'DigitalOutputSet' && s.output_mode === 'timed') t += Number(s.timeout || s.value || 0);
      if (String(s.type || '') === 'DigitalOutputSet' && s.output_mode === 'pulse') {
        const hz = Math.max(0.1, Number(s.frequency_hz || 1));
        const count = Math.max(1, Number(s.pulse_count || 1));
        t += Math.round((count / hz) * 1000);
      }
      return sum + Math.max(250, t || 500);
    }, 0);
  } catch { return 0; }
}
function setProductionTimingState(stateText) {
  const normalized = String(stateText || 'READY').toUpperCase();
  const stateEl = document.getElementById('prod-execution-state');
  if (stateEl) {
    stateEl.textContent = normalized;
    stateEl.classList.toggle('running-blink', normalized.includes('RUN') || normalized.includes('ESECUZ'));
  }
  const cell = document.getElementById('prod-state-cell');
  if (cell) {
    cell.className = 'prod-time-cell ' + (normalized.includes('PASS') ? 'pass' : normalized.includes('FAIL') ? 'fail' : normalized.includes('STOP') ? 'stop' : normalized.includes('RUN') || normalized.includes('ESECUZ') ? 'running' : '');
  }
}
function startProductionTimer() {
  testRunStartTs = Date.now();
  if (testElapsedTimer) clearInterval(testElapsedTimer);
  testElapsedTimer = setInterval(updateProductionTiming, 1000);
  updateProductionTiming();
}
function stopProductionTimer() {
  if (testElapsedTimer) { clearInterval(testElapsedTimer); testElapsedTimer = null; }
  updateProductionTiming();
}
function updateProductionTiming() {
  const est = document.getElementById('prod-estimated-time');
  if (est) est.textContent = formatDurationMs(estimateRecipeDurationMs());
  const real = document.getElementById('prod-real-time');
  if (real) real.textContent = testRunStartTs ? formatDurationMs(Date.now() - testRunStartTs) : '00:00';
}

function updateProductionTestMode() {
  const total = recipe?.steps?.length || 0;
  let pass = 0, fail = 0, running = 0;
  for (const st of Object.values(stepStatusMap || {})) {
    if (st === 'pass') pass++;
    else if (st === 'fail') fail++;
    else if (st === 'running') running++;
  }
  const doneRaw = Math.min(total, pass + fail);
  const finalFailState = !!productionForceComplete || String(currentRunState || '').toUpperCase().includes('FAIL') || String(currentRunState || '').toUpperCase().includes('FAULT');
  const done = finalFailState && fail > 0 ? total : doneRaw;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const cur = recipe?.steps?.find(s => s.step_id === activeStepId);
  const runningState = currentRunState === 'RUNNING' || running > 0;
  const setText = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  setText('prod-recipe-name', recipe?.recipe_name || 'Nessuna ricetta selezionata');
  setText('prod-serial', `Commessa: ${getLotNumber() || '-'} · SN scheda: ${getSerialDutRaw() || (isSerialRequired() ? '-' : 'NON RICHIESTO')}`);
  setText('prod-state', 'Stato: ' + (currentRunState || 'READY'));
  setProductionTimingState(currentRunState || 'READY');
  updateProductionTiming();
  setText('prod-progress-percent', pct + '%');
  setText('prod-kpi-total', String(total));
  setText('prod-kpi-pass', String(pass));
  setText('prod-kpi-fail', String(fail));
  setText('prod-kpi-todo', String(Math.max(0, total - done - running)));
  setText('prod-current-step', cur ? `#${cur.step_id} — ${cur.label || cur.type || 'Step'}` : (runningState ? 'In esecuzione...' : 'Da fare'));
  const fill=document.getElementById('prod-progress-fill'); if(fill) fill.style.width = pct + '%';
  const progressWrap = document.querySelector('.prod-progress-wrap');
  if (progressWrap) progressWrap.classList.toggle('final-fail', finalFailState && fail > 0);
  const badge=document.getElementById('prod-running-badge'); if(badge) badge.style.display = runningState ? 'inline-flex' : 'none';
  setProductionFinalStatus(fail > 0 || String(currentRunState || '').toUpperCase().includes('FAIL') || String(currentRunState || '').toUpperCase().includes('FAULT') ? 'fail' : (total > 0 && done === total && fail === 0 ? 'pass' : (runningState ? 'running' : 'todo')));
  const dbg=document.getElementById('prod-debug-box'); if(dbg) dbg.classList.toggle('show', canUseProductionDebug());
  renderProductionSequenceLog();
  renderProductionHardwareList();
  const clk=document.getElementById('prod-clock'); if(clk) clk.textContent = new Date().toLocaleString();
}

function enterProductionTestMode() {
  if (!requireLogin()) return;
  productionTestMode = true;
  document.body.classList.add('production-test-active');
  refreshProductionRecipes();
  updateProductionTestMode();
  if (!productionAutoConnectDone) {
    productionAutoConnectDone = true;
    setTimeout(() => autoConnectProductionInstruments(false), 250);
  }
}

function requestExitProductionTestMode() {
  if (canExitProductionTestRole(currentUser?.role, currentUser?.level)) {
    document.body.classList.remove('production-test-active');
    productionTestMode = false;
    return;
  }
  const st = document.getElementById('exit-test-status'); if (st) st.textContent = '';
  const pw = document.getElementById('exit-test-pass'); if (pw) pw.value = '';
  document.getElementById('exit-test-modal')?.classList.add('show');
}

async function verifyExitProductionTestMode() {
  const u = document.getElementById('exit-test-user')?.value?.trim() || '';
  const p = document.getElementById('exit-test-pass')?.value || '';
  const st = document.getElementById('exit-test-status');
  if (!u || !p) { if(st) st.textContent = 'Inserisci username e password.'; return; }
  try {
    const res = api ? await api.userLogin(u, p) : { ok:false, error:'API non disponibile' };
    if (!res?.ok) { if(st) st.textContent = '❌ ' + (res?.error || 'Credenziali non valide'); return; }
    if (!canExitProductionTestRole(res.role, res.level)) { if(st) st.textContent = `❌ Ruolo non autorizzato: ${res.role || 'N/D'}`; return; }
    document.getElementById('exit-test-modal')?.classList.remove('show');
    stopPl303Live();
    try { await safePl303Off('USCITA_TEST_MODE'); } catch {}
    document.body.classList.remove('production-test-active');
    productionTestMode = false;
    addLog(document.getElementById('sys-log'), `Uscita modalità test autorizzata da <b>${escapeHtml(res.operator || u)}</b> — PL303 CH1+CH2 OFF`, 'info');
  } catch(e) { if(st) st.textContent = '❌ Errore: ' + normalizeError(e); }
}

async function emergencyStopAll() {
  pl303EmergencyLock = true;
  stopPl303Live();
  stopWizardLive();
  const live = document.getElementById('esp32-live-enable');
  if (live) { live.checked = false; toggleEsp32ControlLive(false); }
  addLog(document.getElementById('run-log'), '🚨 EMERGENZA: stop test, tutte DO LOW e scollegamento strumenti...', 'fail');
  try {
    try { await safePl303Off('EMERGENZA_RENDERER_PRE'); } catch {}
    if (api?.emergencyStopAll) {
      const res = await guardedUi('EMERGENZA', () => api.emergencyStopAll(), { timeoutMs: 9000, logTo: document.getElementById('run-log'), fallback: { ok:false, error:'timeout emergenza' } });
      addLog(document.getElementById('run-log'), `🚨 Emergenza completata: ${res?.outputsLow ?? 0} DO LOW, ${res?.errors?.length || 0} errori. Strumenti scollegati.`, res?.errors?.length ? 'warn' : 'fail');
    } else {
      await guardedUi('STOP ricetta', () => api.stopTest(), { timeoutMs: 2500, logTo: document.getElementById('run-log') });
      await esp32EmergencyLow();
    }
  } catch(e) {
    addLog(document.getElementById('run-log'), `❌ Errore emergenza: ${escapeHtml(normalizeError(e))}`, 'fail');
  } finally {
    try { await safePl303Off('EMERGENZA_RENDERER_POST'); } catch {}
    forceRunIdleUi();
    updateProductionTestMode();
  }
}



/* AT-MEC_HM_2.29 - Funzioni pagina alimentatore PL303 e QR produzione. */
function pl303Log(msg, level='info') { addLog(document.getElementById('pl303-status'), msg, level); }
function syncPl303ModeFields() {
  const mode = document.getElementById('pl303-mode')?.value || 'USB';
  const usb = document.getElementById('pl303-usb-fields');
  const eth = document.getElementById('pl303-eth-fields');
  if (usb) usb.style.display = mode === 'USB' ? 'grid' : 'none';
  if (eth) eth.style.display = mode === 'ETHERNET' ? 'grid' : 'none';
}
async function loadPl303Settings() {
  syncPl303ModeFields();
  try {
    const cfg = await api?.getAppSettings?.() || {};
    if (document.getElementById('pl303-mode')) document.getElementById('pl303-mode').value = cfg.pl303Mode || 'USB';
    if (document.getElementById('pl303-host')) document.getElementById('pl303-host').value = cfg.pl303Host || cfg.ttiHost || '';
    if (document.getElementById('pl303-port')) document.getElementById('pl303-port').value = cfg.pl303Port || 9221;
    if (document.getElementById('pl303-baud')) document.getElementById('pl303-baud').value = cfg.pl303Baud || cfg.ttiBaud || 9600;
    await scanPl303SerialPorts(false);
    const com = cfg.pl303Com || cfg.ttiPort || 'mock';
    const sel = document.getElementById('pl303-com'); if (sel && [...sel.options].some(o => o.value === com)) sel.value = com;
    syncPl303ModeFields();
    setPl303LiveState('Premi Read/Live dopo la connessione');
    // 3.12: non interrogare automaticamente il PL303 all'apertura pagina: se porta/baud non sono corretti si generano timeout inutili.
    restartPl303LiveIfEnabled();
  } catch(e) { pl303Log('❌ Caricamento impostazioni PL303: ' + escapeHtml(normalizeError(e)), 'fail'); }
}
async function scanPl303SerialPorts(show=true) {
  const sel = document.getElementById('pl303-com');
  const list = document.getElementById('pl303-port-list');
  if (!api?.scanSerialPorts || !sel) return;
  try {
    const ports = await api.scanSerialPorts();
    sel.innerHTML = '<option value="mock">mock</option>' + ports.map(p => `<option value="${escapeHtml(p.path)}">${escapeHtml(p.friendlyName || p.path)}</option>`).join('');
    if (list && show) list.innerHTML = ports.map(p => `<div class="port-card"><b>${escapeHtml(p.path)}</b><div class="detail-line">${escapeHtml(p.manufacturer || 'seriale')} ${p.serialNumber ? '— SN '+escapeHtml(p.serialNumber) : ''}</div></div>`).join('') || 'Nessuna porta seriale trovata.';
  } catch(e) { if (list) list.textContent = 'Errore scan porte: ' + normalizeError(e); }
}
function getPl303UiConfig() {
  const mode = document.getElementById('pl303-mode')?.value || 'USB';
  return {
    mode,
    host: document.getElementById('pl303-host')?.value?.trim() || 'mock',
    port: Number(document.getElementById('pl303-port')?.value || 9221),
    com: document.getElementById('pl303-com')?.value || 'mock',
    baud: Number(document.getElementById('pl303-baud')?.value || 9600)
  };
}
async function savePl303SettingsOnly() {
  const cfg = getPl303UiConfig();
  await api?.saveAppSettings?.({ pl303Mode: cfg.mode, pl303Host: cfg.host, pl303Port: cfg.port, pl303Com: cfg.com, pl303Baud: cfg.baud, ttiPort: cfg.mode === 'ETHERNET' ? cfg.host : cfg.com, ttiBaud: cfg.mode === 'ETHERNET' ? cfg.port : cfg.baud });
  pl303Log('💾 Impostazioni PL303 salvate.', 'pass');
}
async function connectPl303() {
  pl303EmergencyLock = false;
  const cfg = getPl303UiConfig();
  await savePl303SettingsOnly();
  const res = await guardedUi('Connessione PL303', () => api.connectPl303(cfg), { timeoutMs: 5000, logTo: document.getElementById('pl303-status'), fallback:{ok:false,error:'timeout'} });
  if (res?.ok) { latestHardwareStatuses = Array.isArray(res.statuses) ? res.statuses : latestHardwareStatuses; updateHwBadges(latestHardwareStatuses); renderProductionHardwareList(); pl303Log('🔌 PL303 collegamento completato.', 'pass'); }
  else pl303Log('❌ PL303 non collegato: ' + escapeHtml(res?.error || 'errore'), 'fail');
}
async function setPl303Output(channelOrOutputOn, maybeOutputOn) {
  const channel = (typeof maybeOutputOn === 'boolean') ? Number(channelOrOutputOn || 1) : 1;
  const outputOn = (typeof maybeOutputOn === 'boolean') ? maybeOutputOn : Boolean(channelOrOutputOn);
  const voltage = Number(document.getElementById(`pl303-ch${channel}-set-v`)?.value || document.getElementById('pl303-set-v')?.value || 0);
  const current = Number(document.getElementById(`pl303-ch${channel}-set-i`)?.value || document.getElementById('pl303-set-i')?.value || 0);
  const res = await guardedUi(`Set PL303 CH${channel}`, () => api.setPl303Output({ voltage, current, outputOn, channel }), { timeoutMs: 5000, logTo: document.getElementById('pl303-status'), fallback:{ok:false,error:'timeout'} });
  if (res?.ok) {
    const ve = document.getElementById(`pl303-ch${channel}-v-read`) || document.getElementById('pl303-v-read');
    if (ve) ve.textContent = outputOn ? Number(voltage).toFixed(3) : '0.000';
    pl303Log(`⚡ PL303 CH${channel} ${outputOn ? 'ON' : 'OFF'} — impostata ${Number(voltage).toFixed(3)} V / limite ${Number(current).toFixed(3)} A ${res.mock ? '(MOCK)' : ''}`, outputOn ? 'pass' : 'warn');
  } else pl303Log(`❌ Set PL303 CH${channel}: ` + escapeHtml(res?.error || 'errore'), 'fail');
  await queryPl303Status(channel, false).catch(()=>{});
  if (outputOn) await measurePl303Current(channel).catch(()=>{});
}
let pl303EmergencyLock = false;
function markPl303ValueUpdated(el) {
  if (!el) return;
  el.classList.add('updated');
  setTimeout(() => el.classList.remove('updated'), 220);
}
function setPl303Readouts(channel, voltage, current) {
  const ve = document.getElementById(`pl303-ch${channel}-v-read`) || document.getElementById('pl303-v-read');
  const ie = document.getElementById(`pl303-ch${channel}-i-read`) || document.getElementById('pl303-i-read');
  if (voltage !== undefined && voltage !== null) {
    const v = Number.isFinite(Number(voltage)) ? Number(voltage).toFixed(3) : String(voltage);
    if (ve && ve.textContent !== v) { ve.textContent = v; markPl303ValueUpdated(ve); }
  }
  if (current !== undefined && current !== null) {
    const i = Number.isFinite(Number(current)) ? Number(current).toFixed(3) : String(current);
    if (ie && ie.textContent !== i) { ie.textContent = i; markPl303ValueUpdated(ie); }
  }
}

async function queryPl303Status(channelOrShow=true, maybeShow) {
  if (!api?.queryPl303Status) return { ok:false, error:'API queryPl303Status non disponibile' };
  if (pl303EmergencyLock && maybeShow !== 'force') return { ok:false, skipped:true, error:'PL303 polling sospeso dopo emergenza' };
  const channel = (typeof channelOrShow === 'number') ? Number(channelOrShow || 1) : 1;
  const show = (typeof maybeShow === 'boolean') ? maybeShow : (typeof channelOrShow === 'boolean' ? channelOrShow : true);
  let res;
  if (show) {
    res = await guardedUi(`Lettura PL303 CH${channel}`, () => api.queryPl303Status(channel), { timeoutMs: 6000, logTo: null, fallback:{ok:false,error:'timeout'} });
  } else {
    // Live/polling: lettura diretta SENZA guardedUi, così non lampeggia/blocca tutta la HMI.
    try { res = await api.queryPl303Status(channel); }
    catch(e) { res = { ok:false, error: normalizeError(e) }; }
  }
  if (res?.ok) {
    setPl303Readouts(channel, res.voltage, res.current);
    if (show) pl303Log(`📡 Stato PL303 CH${channel}: ${Number(res.voltage).toFixed(3)} V / ${Number(res.current).toFixed(3)} A ${res.mock ? '(MOCK)' : ''}`, res.mock ? 'warn' : 'info');
  } else {
    if (show) pl303Log(`⚠️ Stato PL303 CH${channel} non disponibile: ${escapeHtml(res?.error || 'timeout')}. La HMI resta operativa.`, 'warn');
  }
  return res;
}
let pl303LiveTimer = null;
let pl303LiveBusy = false;
function setPl303LiveState(text) { const el = document.getElementById('pl303-live-state'); if (el) el.textContent = text; }
function getPl303LiveInterval() { return Math.max(1500, Number(document.getElementById('pl303-live-interval')?.value || 2500)); }
async function pl303LiveOnce(show=false) {
  if (pl303LiveBusy || pl303EmergencyLock) return;
  pl303LiveBusy = true;
  try {
    setPl303LiveState('Live lettura V/A...');
    await queryPl303Status(1, show);
    await new Promise(r => setTimeout(r, 220));
    await queryPl303Status(2, show);
    setPl303LiveState('Live OK ' + new Date().toLocaleTimeString());
  } catch(e) {
    setPl303LiveState('Live errore/timeout non bloccante');
    if (show) pl303Log('⚠️ Live PL303: ' + escapeHtml(normalizeError(e)), 'warn');
  } finally {
    pl303LiveBusy = false;
  }
}
function stopPl303Live() { if (pl303LiveTimer) clearInterval(pl303LiveTimer); pl303LiveTimer = null; setPl303LiveState('Live OFF'); }
function togglePl303Live(enabled) {
  if (enabled) pl303EmergencyLock = false;
  const cb = document.getElementById('pl303-live-enabled'); if (cb) cb.checked = Boolean(enabled);
  if (!enabled) return stopPl303Live();
  stopPl303Live();
  pl303LiveOnce(false);
  pl303LiveTimer = setInterval(() => pl303LiveOnce(false), getPl303LiveInterval());
  setPl303LiveState('Live ON ogni ' + getPl303LiveInterval() + ' ms');
}
function restartPl303LiveIfEnabled() { if (document.getElementById('pl303-live-enabled')?.checked) togglePl303Live(true); }

async function measurePl303Current(channel=1) {
  const ch = Math.max(1, Math.min(2, Number(channel) || 1));
  const meter = document.getElementById(`pl303-ch${ch}-i-read`) || document.getElementById('pl303-i-read');
  try {
    if (!api?.measurePl303Current) {
      pl303Log(`❌ Misura corrente CH${ch}: API measurePl303Current non disponibile`, 'fail');
      return { ok:false, error:'API measurePl303Current non disponibile' };
    }
    const res = await guardedUi(`Misura corrente PL303 CH${ch}`, () => api.measurePl303Current(ch), { timeoutMs: 4500, logTo: document.getElementById('pl303-status'), fallback:{ok:false,error:'timeout misura corrente'} });
    if (res?.ok) {
      const i = Number.isFinite(Number(res.current)) ? Number(res.current).toFixed(3) : '--.--';
      if (meter) meter.textContent = i;
      pl303Log(`📈 Consumo reale CH${ch}: ${i} A ${res.mock ? '(MOCK)' : ''}`, res.mock ? 'warn' : 'pass');
    } else {
      pl303Log(`❌ Misura corrente CH${ch}: ${escapeHtml(res?.error || 'errore')}`, 'fail');
    }
    return res;
  } catch(e) {
    const msg = normalizeError(e);
    pl303Log(`❌ Misura corrente CH${ch}: ${escapeHtml(msg)}`, 'fail');
    return { ok:false, error:msg };
  }
}

async function safePl303Off(reason='MANUAL_SAFE_OFF') {
  try {
    stopPl303Live();
    let res = null;
    if (api?.safePl303Off) {
      res = await guardedUi('PL303 CH1+CH2 OFF sicuro', () => api.safePl303Off(reason), { timeoutMs: 6500, logTo: document.getElementById('pl303-status'), fallback:{ok:false,error:'timeout safe off'} });
    } else {
      // Fallback renderer: invia OFF separato sui due canali con piccola pausa.
      await setPl303Output(1, false);
      await new Promise(r => setTimeout(r, 180));
      await setPl303Output(2, false);
      res = { ok:true, fallback:true };
    }
    // 3.12: dopo OFF sicuro non facciamo query immediate: su seriale lenta causavano timeout e falsi fault.
    setPl303Readouts(1, 0, 0);
    setPl303Readouts(2, 0, 0);
    pl303Log(`🛑 PL303 CH1+CH2 OFF sicuro completato (${escapeHtml(reason)})`, res?.ok ? 'pass' : 'warn');
    return res;
  } catch(e) {
    const msg = normalizeError(e);
    pl303Log('❌ CH1+CH2 OFF sicuro: ' + escapeHtml(msg), 'fail');
    return { ok:false, error:msg };
  }
}

if (typeof window !== 'undefined') {
  window.measurePl303Current = measurePl303Current;
  window.safePl303Off = safePl303Off;
  window.queryPl303Status = queryPl303Status;
  window.setPl303Output = setPl303Output;
  window.togglePl303Live = togglePl303Live;
  window.restartPl303LiveIfEnabled = restartPl303LiveIfEnabled;
  window.pl303LiveOnce = pl303LiveOnce;
}

function setSerialFromQrPanel(value) {
  const v = String(value || '').trim();
  ['serial-dut','prod-serial-input','serial-dut-dash','qr-manual-input-standalone'].forEach(id => { const el=document.getElementById(id); if (el && el.value !== v) el.value = v; });
  const prodTxt = document.getElementById('prod-serial'); if (prodTxt) prodTxt.textContent = `Commessa: ${getLotNumber() || '-'} · SN scheda: ${v || '-'}`;
  if (v) localStorage.setItem('atmec_last_serial', v);
}

async function scanSerialPorts() {
  const list = document.getElementById('serial-port-list');
  const sel = document.getElementById('cfg-esp-com');
  if (!api) { list.innerHTML = '<div class="detail-line">Disponibile solo in Electron.</div>'; return; }
  try {
    serialPortsCache = await api.scanSerialPorts();
    sel.innerHTML = '<option value="mock">mock</option>' + serialPortsCache.map(p => `<option value="${escapeHtml(p.path)}">${escapeHtml(p.friendlyName || p.path)}${p.likelyEsp32 ? ' ⭐ ESP32 probabile' : ''}</option>`).join('');
    const likely = serialPortsCache.find(p => p.likelyEsp32);
    if (likely) sel.value = likely.path;
    list.innerHTML = serialPortsCache.map(p => `<div class="port-card ${p.likelyEsp32?'likely':''}"><div><b>${escapeHtml(p.path)}</b><div class="detail-line">${escapeHtml(p.manufacturer || 'periferica seriale')} ${p.serialNumber ? '— SN '+escapeHtml(p.serialNumber) : ''}</div></div><button class="btn btn-ghost btn-xs" onclick="document.getElementById('cfg-esp-com').value='${escapeHtml(p.path)}'">Usa</button></div>`).join('') || '<div class="detail-line">Nessuna periferica seriale trovata.</div>';
  } catch(e) { list.innerHTML = '❌ ' + escapeHtml(e.message); }
}

async function testManualPowerStart() {
  const old = getPowerSourceValue();
  setPowerSourceValue('MANUAL_POWER');
  addLog(document.getElementById('sys-log'), '🧪 Alimentazione manuale selezionata: il test non viene bloccato dal PL303.', 'info');
  setPowerSourceValue(old);
}


async function saveLogoBackgroundMode() {
  const mode = document.getElementById('logo-bg-mode')?.value || 'transparent';
  document.body.classList.toggle('logo-white-bg', mode === 'white');
  if (!api?.saveAppSettings) return;
  if (!userCanManageUsers()) { addLog(document.getElementById('sys-log'), 'Permesso negato: solo Admin può modificare lo sfondo loghi.', 'fail'); return; }
  try {
    await api.saveAppSettings({ logoBackgroundMode: mode });
    addLog(document.getElementById('sys-log'), `Sfondo loghi impostato: <b>${mode === 'white' ? 'bianco' : 'trasparente'}</b>`, 'info');
  } catch(e) { addLog(document.getElementById('sys-log'), `❌ Errore sfondo loghi: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

function applyLogoBackgroundMode(mode) {
  const selected = mode === 'white' ? 'white' : 'transparent';
  document.body.classList.toggle('logo-white-bg', selected === 'white');
  const sel = document.getElementById('logo-bg-mode');
  if (sel) sel.value = selected;
}


async function saveLogoBgKind(kind, mode) {
  if (!api?.saveAppSettings) return;
  if (!userCanManageUsers()) { addLog(document.getElementById('sys-log'), 'Permesso negato: solo Admin può modificare lo sfondo loghi.', 'fail'); return; }
  const cfg = await api.getAppSettings();
  const logoBgModes = { ...(cfg.logoBgModes || {}), [kind]: mode === 'white' ? 'white' : 'transparent' };
  await api.saveAppSettings({ logoBgModes });
  await loadAppSettings();
}
function applyLogoBgToElement(id, mode) {
  const el = document.getElementById(id); if (!el) return;
  el.classList.toggle('logo-white-local', mode === 'white');
  el.classList.toggle('logo-transparent-local', mode !== 'white');
}
function setLogoModeSelect(kind, mode) {
  const sel = document.querySelector(`.logo-mode-select[data-logo-kind="${kind}"]`);
  if (sel) sel.value = mode === 'white' ? 'white' : 'transparent';
}

async function selectLogo(kind) {
  if (!api) return;
  if (!userCanManageUsers()) { addLog(document.getElementById('sys-log'), 'Permesso negato: solo Admin può modificare i loghi.', 'fail'); return; }
  try {
    const res = await api.selectLogoFile(kind);
    if (res.ok) { await loadAppSettings(); addLog(document.getElementById('sys-log'), `Logo ${escapeHtml(kind)} salvato`, 'info'); }
  } catch(e) { addLog(document.getElementById('sys-log'), `❌ Errore logo: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}


async function resetDefaultLogos() {
  if (!api) return;
  if (!userCanManageUsers()) { addLog(document.getElementById('sys-log'), 'Permesso negato: solo Admin può ripristinare i loghi.', 'fail'); return; }
  try {
    const res = await api.resetDefaultLogos();
    if (res?.ok) { await loadAppSettings(); addLog(document.getElementById('sys-log'), 'Loghi default M/MEC/MIRZA ripristinati.', 'pass'); }
  } catch(e) { addLog(document.getElementById('sys-log'), `❌ Errore reset loghi: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

async function loadAppSettings() {
  if (!api) return;
  try {
    const cfg = await api.getAppSettings();
    const pick = (...keys) => {
      for (const k of keys) if (cfg && cfg[k]) return cfg[k];
      return '';
    };
    const setImg = (id, data) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (data) { el.src = data; el.style.display = 'inline-block'; }
      else { el.removeAttribute('src'); el.style.display = 'none'; }
    };

    const loginLarge = pick('loginLargeLogoDataUrl');
    const loginSmall = pick('loginSmallLogoDataUrl');
    const hmiLarge = pick('hmiLargeLogoDataUrl', 'appLargeLogoDataUrl');
    const developerSmall = pick('developerSmallLogoDataUrl', 'hmiSmallLogoDataUrl');
    const reportLarge = pick('reportLargeLogoDataUrl', 'companyLogoDataUrl');
    const reportSmall = pick('reportSmallLogoDataUrl', 'builderLogoDataUrl');

    setImg('loginLarge-logo-preview', loginLarge);
    setImg('loginSmall-logo-preview', loginSmall);
    setImg('hmiLarge-logo-preview', hmiLarge);
    setImg('developerSmall-logo-preview', developerSmall);
    setImg('reportLarge-logo-preview', reportLarge);
    setImg('reportSmall-logo-preview', reportSmall);

    // Vecchi preview mantenuti per compatibilità con Settings
    setImg('company-logo-preview', reportLarge);
    setImg('builder-logo-preview', reportSmall);
    setImg('appLarge-logo-preview', hmiLarge);

    // Loghi realmente visibili nell'interfaccia
    setImg('login-large-logo', loginLarge);
    setImg('login-small-logo', loginSmall);
    const fallback = document.getElementById('login-logo-fallback');
    if (fallback) fallback.style.display = loginSmall ? 'none' : 'inline';

    setImg('app-large-logo', hmiLarge);
    setImg('hmi-main-large-logo', hmiLarge);
    const title = document.getElementById('app-title-logo');
    if (title) title.style.display = hmiLarge ? 'none' : 'inline';
    setImg('developer-small-logo', developerSmall);
    setImg('login-developer-logo', developerSmall);
    setImg('prod-company-logo', hmiLarge || loginLarge || reportLarge);
    setImg('prod-dev-logo', developerSmall || reportSmall);
    
    if (cfg.keysightMode) { const el=document.getElementById('cfg-keysight-mode'); if(el) el.value=cfg.keysightMode; }
    if (cfg.keysightIp) { const el=document.getElementById('cfg-keysight-ip'); if(el) el.value=cfg.keysightIp; const mh=document.getElementById('meter-host'); if(mh) mh.value=cfg.keysightIp; const mv=document.getElementById('meter-visa'); if(mv) mv.value=cfg.keysightIp; }
    if (cfg.keysightPort) { const el=document.getElementById('cfg-keysight-port'); if(el) el.value=cfg.keysightPort; const mp=document.getElementById('meter-port'); if(mp) mp.value=cfg.keysightPort; }
    const mm=document.getElementById('meter-conn-mode'); if(mm && cfg.keysightMode) mm.value=cfg.keysightMode;
    syncKeysightMeterMode();
    updateKeysightConnectionHint();

    applyLogoBackgroundMode(cfg.logoBackgroundMode || 'transparent');
    const bg = cfg.logoBgModes || {};
    [['loginLarge','loginLarge-logo-preview'],['loginSmall','loginSmall-logo-preview'],['hmiLarge','hmiLarge-logo-preview'],['developerSmall','developerSmall-logo-preview'],['reportLarge','reportLarge-logo-preview'],['reportSmall','reportSmall-logo-preview'],['loginLarge','login-large-logo'],['developerSmall','login-developer-logo'],['hmiLarge','app-large-logo'],['hmiLarge','hmi-main-large-logo'],['developerSmall','developer-small-logo'],['hmiLarge','prod-company-logo']].forEach(([k,id]) => applyLogoBgToElement(id, bg[k] || cfg.logoBackgroundMode || 'transparent'));
    [['developerSmall','prod-dev-logo']].forEach(([k,id]) => applyLogoBgToElement(id, bg[k] || cfg.logoBackgroundMode || 'transparent'));
    ['loginLarge','loginSmall','hmiLarge','developerSmall','reportLarge','reportSmall'].forEach(k => setLogoModeSelect(k, bg[k] || cfg.logoBackgroundMode || 'transparent'));

    refreshBrandingPermissions();
  const lotEl=document.getElementById('lot-number'); if(lotEl && !lotEl.value) lotEl.value=activeLotNumber;
  const prodLot=document.getElementById('prod-lot-number'); if(prodLot && !prodLot.value) prodLot.value=activeLotNumber;
  } catch(e) {
    console.warn('loadAppSettings failed', e);
  }
}

function refreshBrandingPermissions() {
  const can = userCanManageUsers();
  document.querySelectorAll('.brand-admin-only').forEach(btn => { btn.disabled = !can; btn.title = can ? '' : 'Solo Admin'; });
  const warn = document.getElementById('branding-admin-warning');
  if (warn) warn.style.display = can ? 'none' : 'block';
}

async function refreshRolesUsers() {
  if (!api) return;
  try {
    const roles = await api.listRoles();
    const users = await api.listUsers();
    const canManage = userCanManageUsers();
    const roleOptions = roles.map(r => `<option value="${escapeHtml(r.role)}">${escapeHtml(r.role)} — livello ${r.level ?? 0}</option>`).join('');
    const sel = document.getElementById('new-user-role'); if (sel) sel.innerHTML = roleOptions;
    const userSel = document.getElementById('users-select');
    if (userSel) userSel.innerHTML = '<option value="">— nuovo utente —</option>' + users.map(u => `<option value="${escapeHtml(u.username)}">${escapeHtml(u.username)} — ${escapeHtml(u.role)} ${u.enabled===false?'(disabilitato)':''}</option>`).join('');
    const roleRows = roles.map(r => `<div class="port-card"><div><b>${escapeHtml(r.role)}</b><div class="detail-line">Livello ${r.level ?? 0} · ${(r.permissions||[]).map(escapeHtml).join(', ') || 'nessun permesso'}</div></div></div>`).join('');
    const userRows = users.map(u => `<div class="port-card" onclick="selectUserFromList('${escapeJs(u.username)}')" style="cursor:pointer;"><div><b>${escapeHtml(u.username)}</b> — ${escapeHtml(u.displayName||'')}<div class="detail-line">${escapeHtml(u.role)} · livello ${u.level ?? 0} · ${u.enabled===false?'DISABILITATO':'attivo'}</div></div></div>`).join('') || '<div class="hint">Nessun utente creato.</div>';
    document.getElementById('roles-users-list').innerHTML = `<h4>Ruoli disponibili</h4>${roleRows}<h4 style="margin-top:10px;">Credenziali utenti</h4>${userRows}`;
    window.__usersCache = users;
    applyUserAdminLock(canManage);
  } catch(e) { addLog(document.getElementById('sys-log'), '❌ Errore lettura utenti/ruoli: ' + escapeHtml(normalizeError(e)), 'fail'); }
}

function escapeJs(v) { return String(v ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' '); }

function applyUserAdminLock(canManage = userCanManageUsers()) {
  document.querySelectorAll('#users-tab input, #users-tab select, #users-tab button').forEach(el => {
    if (el.id === 'users-select') { el.disabled = false; return; }
    el.disabled = !canManage;
  });
  const hint = document.getElementById('user-admin-hint');
  if (hint) hint.textContent = canManage ? 'Admin abilitato: puoi creare, modificare, disabilitare ed eliminare utenti.' : 'Accesso sola lettura: solo Admin può modificare utenti e ruoli.';
}

function clearUserForm() {
  selectedUserName = '';
  ['new-user-name','new-user-display','new-user-pass'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const us = document.getElementById('users-select'); if (us) us.value = '';
}

function selectUserFromList(username) {
  selectedUserName = username || '';
  const users = window.__usersCache || [];
  const u = users.find(x => x.username === username);
  const us = document.getElementById('users-select'); if (us) us.value = username || '';
  if (!u) { clearUserForm(); return; }
  document.getElementById('new-user-name').value = u.username || '';
  document.getElementById('new-user-display').value = u.displayName || '';
  document.getElementById('new-user-role').value = u.role || '';
  document.getElementById('new-user-pass').value = '';
}

function applyRoleLevelPreset() {
  const level = parseInt(document.getElementById('new-role-level')?.value || '10', 10);
  const map = {
    run_test: level >= 10,
    debug_mode: level >= 30,
    edit_recipe: level >= 60,
    config_hardware: level >= 60,
    manage_branding: level >= 80,
    manage_users: level >= 100
  };
  document.querySelectorAll('.perm-check').forEach(ch => { ch.checked = !!map[ch.value]; });
}

async function createRoleFromUi() {
  if (!userCanManageUsers()) { addLog(document.getElementById('sys-log'), '⛔ Solo Admin può modificare ruoli.', 'fail'); return; }
  const role = document.getElementById('new-role-name').value.trim();
  const permissions = [...document.querySelectorAll('.perm-check:checked')].map(x => x.value);
  const level = parseInt(document.getElementById('new-role-level')?.value || '10', 10);
  const res = await withTimeout(api.createRole(role, permissions, level), 2500, 'crea ruolo');
  addLog(document.getElementById('sys-log'), res.ok ? `Ruolo creato/aggiornato: <b>${escapeHtml(role)}</b>` : `❌ ${escapeHtml(res.error)}`, res.ok ? 'info' : 'fail');
  await withTimeout(refreshRolesUsers(), 2500, 'aggiorna ruoli');
}

async function createUserFromUi() {
  if (!userCanManageUsers()) { addLog(document.getElementById('sys-log'), '⛔ Solo Admin può creare o modificare utenti.', 'fail'); return; }
  const res = await api.createUser(
    document.getElementById('new-user-name').value,
    document.getElementById('new-user-display').value,
    document.getElementById('new-user-role').value,
    document.getElementById('new-user-pass').value
  );
  addLog(document.getElementById('sys-log'), res.ok ? 'Credenziali create/aggiornate.' : `❌ ${escapeHtml(res.error)}`, res.ok ? 'info' : 'fail');
  await refreshRolesUsers();
}

async function deleteSelectedUser() {
  if (!userCanManageUsers()) { addLog(document.getElementById('sys-log'), '⛔ Solo Admin può eliminare utenti.', 'fail'); return; }
  const username = selectedUserName || document.getElementById('new-user-name').value.trim();
  if (!username) { alert('Seleziona un utente da eliminare.'); return; }
  if (!confirm(`Eliminare definitivamente l'utente "${username}"?`)) return;
  const res = await api.deleteUser(username);
  addLog(document.getElementById('sys-log'), res.ok ? `Utente eliminato: <b>${escapeHtml(username)}</b>` : `❌ ${escapeHtml(res.error)}`, res.ok ? 'info' : 'fail');
  clearUserForm();
  await refreshRolesUsers();
}

async function toggleSelectedUser(enabled) {
  if (!userCanManageUsers()) { addLog(document.getElementById('sys-log'), '⛔ Solo Admin può abilitare/disabilitare utenti.', 'fail'); return; }
  const username = selectedUserName || document.getElementById('new-user-name').value.trim();
  if (!username) { alert('Seleziona un utente.'); return; }
  const res = await api.setUserEnabled(username, !!enabled);
  addLog(document.getElementById('sys-log'), res.ok ? `Utente ${enabled ? 'abilitato' : 'disabilitato'}: <b>${escapeHtml(username)}</b>` : `❌ ${escapeHtml(res.error)}`, res.ok ? 'info' : 'fail');
  await refreshRolesUsers();
}


function getKeysightConnFromUi(prefixSource='meter') {
  const modeEl = document.getElementById(prefixSource === 'settings' ? 'cfg-keysight-mode' : 'meter-conn-mode');
  const mode = modeEl?.value || 'ETH';
  if (prefixSource === 'settings') {
    const raw = document.getElementById('cfg-keysight-ip')?.value || '127.0.0.1';
    const baud = Number(document.getElementById('cfg-keysight-port')?.value || (mode === 'ETH' ? 5025 : 9600));
    const conn = mode === 'USB_COM' ? 'usb://' + raw : mode === 'USB_VISA' ? 'visa://' + raw : raw;
    return { mode, conn, baud, raw };
  }
  const host = document.getElementById('meter-host')?.value || '127.0.0.1';
  const com = document.getElementById('meter-com')?.value || document.getElementById('meter-host')?.value || '';
  const visa = document.getElementById('meter-visa')?.value || '';
  const port = Number(document.getElementById('meter-port')?.value || (mode === 'ETH' ? 5025 : 9600));
  const conn = mode === 'USB_COM' ? 'usb://' + com : mode === 'USB_VISA' ? 'visa://' + visa : host;
  return { mode, conn, baud: port, raw: mode === 'USB_COM' ? com : mode === 'USB_VISA' ? visa : host };
}

function syncKeysightMeterMode() {
  const mode = document.getElementById('meter-conn-mode')?.value || 'ETH';
  const hostBox = document.getElementById('meter-host-box');
  const comBox = document.getElementById('meter-com-box');
  const visaBox = document.getElementById('meter-visa-box');
  const hostLabel = document.getElementById('meter-host-label');
  const portLabel = document.getElementById('meter-port-label');
  const port = document.getElementById('meter-port');
  if (hostBox) hostBox.style.display = mode === 'ETH' ? 'block' : 'none';
  if (comBox) comBox.style.display = mode === 'USB_COM' ? 'block' : 'none';
  if (visaBox) visaBox.style.display = mode === 'USB_VISA' ? 'block' : 'none';
  if (hostLabel) hostLabel.textContent = mode === 'ETH' ? 'IP / Host' : 'Risorsa';
  if (portLabel) portLabel.textContent = mode === 'ETH' ? 'Porta TCP' : mode === 'USB_COM' ? 'Baud USB/COM' : 'Bridge / timeout';
  if (port) { if (mode === 'ETH' && (port.value === '9600' || !port.value)) port.value = '5025'; if (mode !== 'ETH' && (port.value === '5025' || !port.value)) port.value = '9600'; }
}

async function scanKeysightUsbPorts() {
  const sel = document.getElementById('meter-com');
  if (!sel || !api?.scanSerialPorts) return;
  try {
    const ports = await withTimeout(api.scanSerialPorts(), 2500, 'scan Keysight USB');
    const opts = ['<option value="">Seleziona COM</option>'].concat((ports || []).map(p => `<option value="${escapeHtml(p.path || p)}">${escapeHtml(p.path || p)} ${escapeHtml(p.manufacturer || '')}</option>`));
    sel.innerHTML = opts.join('');
    addLog(document.getElementById('keysight-log'), `🔎 Porte USB/COM trovate: ${(ports || []).length}`, 'info');
  } catch(e) { addLog(document.getElementById('keysight-log'), `❌ Scan USB Keysight: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}


async function scanKeysightVisaResources() {
  const inp = document.getElementById('meter-visa');
  if (!api?.scanVisaResources) {
    addLog(document.getElementById('keysight-log'), '⚠️ Scan VISA non disponibile in questa build.', 'warn');
    return;
  }
  try {
    addLog(document.getElementById('keysight-log'), '🔎 Scansione VISA in corso...', 'info');
    const rows = await withTimeout(api.scanVisaResources(), 9000, 'scan VISA Keysight');
    const okRows = (rows || []).filter(r => r && r.ok && r.resource);
    if (okRows.length && inp) inp.value = okRows[0].resource;
    if (!okRows.length) {
      const err = rows?.[0]?.error || 'Nessuna risorsa VISA trovata. Verifica Keysight Connection Expert e PyVISA.';
      addLog(document.getElementById('keysight-log'), `⚠️ ${escapeHtml(err)}`, 'warn');
      return;
    }
    okRows.forEach(r => addLog(document.getElementById('keysight-log'), `✅ VISA: ${escapeHtml(r.resource)} ${r.idn ? '— ' + escapeHtml(r.idn) : ''}`, 'pass'));
  } catch(e) {
    addLog(document.getElementById('keysight-log'), `❌ Scan VISA: ${escapeHtml(normalizeError(e))}`, 'fail');
  }
}

async function connectKeysightFromPage() {
  if (!api) return;
  const cfg = getKeysightConnFromUi('meter');
  const st = document.getElementById('keysight-status');
  try {
    if (st) st.textContent = 'Connessione Keysight in corso...';
    const res = await guardedUi('Connessione Keysight 34461A', () => api.reconnectHardware([{ name:'Keysight_34461A', conn: cfg.conn, baud: cfg.baud }]), { timeoutMs: 15000, fallback: null });
    if (!res) throw new Error('Timeout connessione Keysight');
    latestHardwareStatuses = await api.getHardwareStatuses().catch(() => latestHardwareStatuses);
    const k = getHardwareStatusByName('Keysight_34461A');
    const txt = k && !k.mock ? `✅ Keysight 34461A LIVE — ${cfg.raw}` : `⚠️ Keysight 34461A non LIVE/MOCK — ${cfg.raw}. Prova *IDN? e verifica Resource VISA.`;
    if (st) st.textContent = txt;
    addLog(document.getElementById('keysight-log'), txt, k && !k.mock ? 'pass' : 'warn');
  } catch(e) { if (st) st.textContent = '❌ ' + normalizeError(e); addLog(document.getElementById('keysight-log'), `❌ Connessione: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

async function keysightIdn() {
  // AT-MEC_HM_3.5: prima assicura la connessione USB/VISA/TCP, poi interroga *IDN?.
  const k = getHardwareStatusByName('Keysight_34461A');
  if (!k || k.mock === true || k.connected === false) {
    await connectKeysightFromPage();
  }
  await queryMeter('*IDN?', 'keysight-status', '');
}

async function keysightManualQuery() {
  const cmd = document.getElementById('meter-manual-cmd')?.value || '*IDN?';
  await queryMeter(cmd, 'keysight-status', '');
}

async function saveKeysightSettingsFromPage() {
  if (!api?.saveAppSettings) return;
  const cfg = getKeysightConnFromUi('meter');
  try {
    const old = await api.getAppSettings?.() || {};
    const raw = cfg.raw;
    await api.saveAppSettings({ ...old, keysightMode: cfg.mode, keysightIp: raw, keysightPort: cfg.baud });
    addLog(document.getElementById('keysight-log'), '💾 Impostazioni Keysight salvate.', 'pass');
    const sm = document.getElementById('cfg-keysight-mode'); if (sm) sm.value = cfg.mode;
    const si = document.getElementById('cfg-keysight-ip'); if (si) si.value = raw;
    const sp = document.getElementById('cfg-keysight-port'); if (sp) sp.value = String(cfg.baud);
  } catch(e) { addLog(document.getElementById('keysight-log'), `❌ Salvataggio: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

function updateKeysightConnectionHint() {
  const mode = document.getElementById('cfg-keysight-mode')?.value || 'ETH';
  const hint = document.getElementById('keysight-conn-hint');
  const port = document.getElementById('cfg-keysight-port');
  if (mode === 'USB_COM') {
    if (hint) hint.textContent = 'USB/COM: seleziona o inserisci COMx se Windows espone il 34461A come porta virtuale.';
    if (port && port.value === '5025') port.value = '9600';
  } else if (mode === 'USB_VISA') {
    if (hint) hint.textContent = 'USB/VISA: inserisci resource USB0::...::INSTR oppure usa 🔎 VISA. Richiede Keysight IO Libraries + Python PyVISA.';
    if (port && port.value === '5025') port.value = '9600';
  } else {
    if (hint) hint.textContent = 'Ethernet consigliata: IP dello strumento e porta SCPI 5025.';
    if (port && port.value === '9600') port.value = '5025';
  }
}

async function applyHwSettings() {
  if (hwApplyInProgress) return;
  hwApplyInProgress = true;
  stopWizardLive();
  if (!api) {
    document.getElementById('hw-detail-status').textContent = '⚠️ Disponibile solo in Electron';
    hwApplyInProgress = false;
    return;
  }
  try {
    const configs = [
      { name: 'Keysight_34461A', conn: getKeysightConnFromUi('settings').conn,  baud: parseInt(document.getElementById('cfg-keysight-port').value) },
      { name: 'AimTTi_PL303',   conn: document.getElementById('cfg-tti-com').value,        baud: parseInt(document.getElementById('cfg-tti-baud').value) },
      { name: 'modbus_serial',  conn: document.getElementById('cfg-esp-com').value,        baud: parseInt(document.getElementById('cfg-esp-baud').value) }
    ];
    if (api.saveAppSettings) { try { await api.saveAppSettings({ esp32Port: document.getElementById('cfg-esp-com').value, esp32Baud: parseInt(document.getElementById('cfg-esp-baud').value), ttiPort: document.getElementById('cfg-tti-com').value, ttiBaud: parseInt(document.getElementById('cfg-tti-baud').value), keysightMode: document.getElementById('cfg-keysight-mode')?.value || 'ETH', keysightIp: document.getElementById('cfg-keysight-ip').value, keysightPort: parseInt(document.getElementById('cfg-keysight-port').value) }); } catch {} }
    const statuses = await guardedUi('Riconnessione hardware', () => api.reconnectHardware(configs), { timeoutMs: 7000, fallback: null });
    if (!statuses) throw new Error('Timeout riconnessione hardware');
    updateHwBadges(statuses);
    const msg = statuses.map(s => `${s.name}: ${s.mock ? '⚡MOCK' : '✅LIVE'}`).join('  ');
    document.getElementById('hw-detail-status').textContent = msg;
  } catch(e) {
    document.getElementById('hw-detail-status').textContent = '❌ ' + normalizeError(e);
  } finally {
    hwApplyInProgress = false;
  }
}

function syncRecipeNameInputs(source) {
  const a = document.getElementById('recipe-name-inp');
  const b = document.getElementById('recipe-name-page');
  const val = source === 'page' ? b?.value : a?.value;
  if (a && source === 'page') a.value = val;
  if (b && source !== 'page') b.value = val;
  recipe.recipe_name = val || recipe.recipe_name;
}
function getPowerSourceValue() {
  const el = document.getElementById('power-source') || document.getElementById('power-source-page');
  return el?.value || recipe.power_metadata || 'MANUAL_POWER';
}
function setPowerSourceValue(value) {
  const safeValue = value || recipe.power_metadata || 'MANUAL_POWER';
  const a = document.getElementById('power-source');
  const b = document.getElementById('power-source-page');
  if (a) a.value = safeValue;
  if (b) b.value = safeValue;
  recipe.power_metadata = safeValue;
  return safeValue;
}

function syncPowerInputs(source) {
  const a = document.getElementById('power-source');
  const b = document.getElementById('power-source-page');
  const val = source === 'page' ? (b?.value || getPowerSourceValue()) : (a?.value || getPowerSourceValue());
  setPowerSourceValue(val);
  updateRecipeHealth();
}
function syncRecipeEnabledInputs(source) {
  const a = document.getElementById('recipe-enabled');
  const b = document.getElementById('recipe-enabled-page');
  const val = source === 'page' ? !!b?.checked : !!a?.checked;
  if (a && source === 'page') a.checked = val;
  if (b && source !== 'page') b.checked = val;
  recipe.enabled = val;
  renderSteps();
}
function openStepWizardFromPage() {
  const t = document.getElementById('new-step-type-page')?.value;
  if (t && document.getElementById('new-step-type')) document.getElementById('new-step-type').value = t;
  const catByType = { DigitalOutputSet:'digital_output', DigitalInputCheck:'digital_input', AnalogInputMeasurement:'measure_analog', VoltageMeasurement:'measure_voltage', CurrentMeasurement:'measure_current', ResistanceTest:'measure_resistance', FrequencyTest:'measure_frequency', SCPICommand:'scpi', Delay:'delay', FirmwareFlash:'firmware_flash' };
  if (t && document.getElementById('w-category')) document.getElementById('w-category').value = catByType[t] || 'measure_voltage';
  openStepWizard();
}

function toggleRecipeSimpleMode(on=true) {
  document.body.classList.toggle('recipe-simple-mode', Boolean(on));
  try { localStorage.setItem('atmec_recipe_simple_mode', Boolean(on) ? '1' : '0'); } catch {}
}
function recipeStepIcon(step) {
  const t = String(step?.type || '');
  if (t.includes('PowerSupply')) return step?.ps_output_on === false || step?.value?.outputOn === false ? '🛑' : '🔋';
  if (t.includes('Current')) return '📈';
  if (t.includes('Voltage') || t.includes('Analog')) return '📏';
  if (t.includes('Resistance')) return 'Ω';
  if (t.includes('Frequency')) return 'Hz';
  if (t.includes('Manual')) return '✋';
  if (t.includes('Delay')) return '⏱';
  if (t.includes('DigitalOutput')) return '🔌';
  if (t.includes('DigitalInput')) return '👁️';
  return '🧩';
}
function describeRecipeStep(step) {
  const chips = [];
  const type = String(step?.type || '');
  const push = (k,v) => { if (v !== undefined && v !== null && v !== '') chips.push(`<span class="recipe-value-chip"><b>${escapeHtml(k)}</b> ${escapeHtml(v)}</span>`); };
  if (type === 'PowerSupplySet') { push('CH', step.ps_channel || step.channel || 1); push('V', step.ps_voltage ?? step.value?.voltage); push('I max', step.ps_current ?? step.value?.current); push('OUT', (step.ps_output_on ?? step.value?.outputOn) === false ? 'OFF' : 'ON'); }
  else if (type === 'PowerSupplyMeasureCurrent') { push('CH', step.channel || step.ps_channel || 1); push('Min', step.min); push('Max', step.max); push('Unità', step.unit || 'A'); }
  else if (type.includes('Measurement') || type.includes('Test')) { push('Device', step.device_mapping || 'Manuale'); push('Min', step.min); push('Max', step.max); push('Unità', step.unit); }
  else if (type === 'ManualMeasurement') { push('Tipo', step.manual_measure_type || (step.manual_input_enabled ? 'MANUAL_VALUE' : 'PASS_FAIL')); push('Origine', step.measurement_mode || (step.manual_input_enabled ? 'MANUALE' : 'AUTO')); push('Target', step.target); push('Tol', step.tolerance); push('Min', step.min); push('Max', step.max); push('Unità', step.unit); }
  else if (type === 'Delay') { push('Attesa', (step.timeout || 1000) + ' ms'); }
  else if (type === 'GotoIfFail') { push('Vai a step_id', step.target_step || 1); }
  else if (type === 'LoopStart') { push('Ripeti', (step.value || 1) + ' volte'); }
  if (step.save_as_variable) push('Salva var', step.save_as_variable);
  if (step.compare_variable) push('Usa var', step.compare_variable);
  else { push('Device', step.device_mapping || 'system'); push('GPIO', step.channel); push('Timeout', step.timeout ? step.timeout + ' ms' : ''); }
  return chips.join(' ');
}
function addQuickRecipeStep(kind) {
  const base = {
    ps_on:{ type:'PowerSupplySet', label:'Alimentatore ON', description:'Imposta e abilita uscita alimentatore', io_type:'SCPI', device_mapping:'AimTTi_PL303', channel:1, ps_channel:1, ps_voltage:24, ps_current:1, ps_output_on:true, value:{ voltage:24, current:1, outputOn:true }, unit:'V/A', timeout:3000 },
    ps_off:{ type:'PowerSupplySet', label:'Alimentatore OFF sicuro', description:'Disattiva uscita alimentatore', io_type:'SCPI', device_mapping:'AimTTi_PL303', channel:1, ps_channel:1, ps_voltage:0, ps_current:0, ps_output_on:false, value:{ voltage:0, current:0, outputOn:false }, unit:'V/A', timeout:3000 },
    measure_voltage:{ type:'VoltageMeasurement', label:'Misura tensione', description:'Misura tensione con limiti e tolleranza', io_type:'SCPI', device_mapping:'Keysight_34461A', command:'MEAS:VOLT:DC?', target:24.0, tolerance:0.5, min:23.5, max:24.5, unit:'V', timeout:2500, measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
    measure_current:{ type:'CurrentMeasurement', label:'Misura corrente', description:'Misura consumo in ampere con tolleranza', io_type:'SCPI', device_mapping:'Keysight_34461A', command:'MEAS:CURR:DC?', target:0.5, tolerance:0.5, min:0, max:1, unit:'A', timeout:2500, measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
    measure_ohm:{ type:'ResistanceTest', label:'Misura resistenza', description:'Misura resistenza con tolleranza', io_type:'SCPI', device_mapping:'Keysight_34461A', command:'MEAS:RES?', target:500, tolerance:500, min:0, max:1000, unit:'Ω', timeout:2500, measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
    multi_channel_resistance:{ type:'MultiChannelResistanceTest', label:'Test multi-canale resistenza', description:'Misura resistenza canali con uscite associate e valori separati', io_type:'SCPI', device_mapping:'Keysight_34461A', command:'MEAS:RES?', unit:'Ω', timeout:3000, stop_on_fail:false, channel_fail_policy:'continue', channels:Array.from({length:10},(_,n)=>({ name:'CH'+(n+1), output:'OUT'+(n+1), min:10, max:50, stable_ms:500, enabled:true })) },
    measure_freq:{ type:'FrequencyTest', label:'Misura frequenza', description:'Misura frequenza con tolleranza', io_type:'SCPI', device_mapping:'Keysight_34461A', command:'MEAS:FREQ?', target:1000, tolerance:10, min:990, max:1010, unit:'Hz', timeout:2500, measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
    measure_continuity:{ type:'ManualMeasurement', label:'Controllo continuità', description:'Verifica continuità circuito con valore Ohm manuale/strumento', io_type:'SCPI', device_mapping:'Keysight_34461A', manual_measure_type:'SCPI_OHM', command:'MEAS:RES?', manual_input_enabled:false, manual_fallback_enabled:true, min:0, max:10, unit:'Ω', timeout:2500 },
    measure_temp:{ type:'ManualMeasurement', label:'Misura temperatura', description:'Inserimento temperatura misurata', io_type:'SYSTEM', device_mapping:'manual', manual_measure_type:'TEMPERATURE', manual_input_enabled:true, min:15, max:45, unit:'°C', timeout:0 },
    measure_power:{ type:'ManualMeasurement', label:'Misura potenza', description:'Inserimento o calcolo potenza assorbita', io_type:'SYSTEM', device_mapping:'manual', manual_measure_type:'POWER', manual_input_enabled:true, min:0, max:100, unit:'W', timeout:0 },
    manual_value:{ type:'ManualMeasurement', label:'Inserimento misura manuale', description:'L’operatore inserisce manualmente il valore misurato', io_type:'SYSTEM', device_mapping:'manual', manual_measure_type:'MANUAL_VALUE', manual_input_enabled:true, min:0, max:999, unit:'', timeout:0 },
    manual_passfail:{ type:'ManualMeasurement', label:'Controllo manuale PASS/FAIL', description:'L’operatore conferma esito manuale', io_type:'SYSTEM', device_mapping:'manual', manual_measure_type:'CONFIRM', manual_input_enabled:false, expected_result:'PASS_FAIL', timeout:0 },
    delay:{ type:'Delay', label:'Attesa stabilizzazione', description:'Pausa prima dello step successivo', io_type:'SYSTEM', device_mapping:'system', unit:'ms', timeout:1000 },
    save_variable:{ type:'ManualMeasurement', label:'Salva variabile misura', description:'Inserisci valore e salvalo come variabile ricetta', io_type:'SYSTEM', device_mapping:'manual', manual_measure_type:'MANUAL_VALUE', manual_input_enabled:true, min:0, max:999, unit:'', save_as_variable:'VAR1', timeout:0 },
    if_fail_goto:{ type:'GotoIfFail', label:'IF FAIL vai a step', description:'Salto condizionato base in caso di FAIL', io_type:'SYSTEM', device_mapping:'system', target_step:1, timeout:0 },
    loop_3x:{ type:'LoopStart', label:'Inizio loop x3', description:'Ripeti gruppo step 3 volte, chiudi con LoopEnd', io_type:'SYSTEM', device_mapping:'system', value:3, timeout:0 }
  }[kind];
  if (!base) return;
  const step = JSON.parse(JSON.stringify(base));
  step.step_id = stepIdCounter++;
  step.enabled = true;
  recipe.steps.push(step);
  renumberRecipeSteps();
  renderSteps();
  addLog(document.getElementById('sys-log'), `🧩 Template aggiunto: <b>${escapeHtml(step.label)}</b>`, 'pass');
}

function renderRecipePage() {
  const namePage = document.getElementById('recipe-name-page');
  const powerPage = document.getElementById('power-source-page');
  const enabledPage = document.getElementById('recipe-enabled-page');
  if (namePage) namePage.value = document.getElementById('recipe-name-inp')?.value || recipe.recipe_name || '';
  if (powerPage) powerPage.value = getPowerSourceValue();
  if (enabledPage) enabledPage.checked = recipe.enabled !== false;
  const list = document.getElementById('recipe-steps-page-list');
  if (!list) return;
  if (!recipe.steps.length) { list.innerHTML = '<div class="hint">Nessuno step. Premi “Aggiungi step guidato”.</div>'; updateRecipeHealth(); return; }
  list.innerHTML = recipe.steps.map((step, i) => {
    const cls = STEP_TYPE_COLORS[step.type] || 'type-color-D';
    const uiSt = stepUiStatus(step);
    const status = ` step-${uiSt}`;
    return `<div class="recipe-flow-card large-step-row${status} ${step.enabled === false ? 'disabled-step' : ''}" draggable="true" ondragstart="recipeDragStart(event, ${i})" ondragover="recipeDragOver(event, ${i})" ondragleave="recipeDragLeave(event)" ondrop="recipeDrop(event, ${i})" ondragend="recipeDragEnd(event)">
      <div class="recipe-flow-icon">${recipeStepIcon(step)}</div>
      <div>
        <div class="recipe-flow-title">#${i + 1} — ${escapeHtml(step.label || step.type)} <span class="status-pill ${uiSt}">${stepStatusLabel(uiSt)}</span></div>
        <div class="recipe-flow-desc"><span class="step-type-badge ${cls}">${escapeHtml(step.type)}</span> ${describeRecipeStep(step)} ${inlineIoStateForStep(step)}</div>
        ${renderRecipeInlineEditor(step, i)}
        ${renderStopOnFailOption331(step, i)}
      </div>
      <div class="recipe-step-actions">
        <button class="btn btn-primary btn-xs" onclick="openStepWizard(${i})">✏️ Valori</button>
        <button class="btn btn-ghost btn-xs" onclick="toggleStepEnabled(${i})">${step.enabled === false ? '✅' : '🚫'}</button>
        <button class="btn btn-ghost btn-xs" onclick="cloneStep(${i})">⧉</button>
        <button class="btn btn-ghost btn-xs" onclick="moveStep(${i}, -1)">⬆</button>
        <button class="btn btn-ghost btn-xs" onclick="moveStep(${i}, 1)">⬇</button>
        <button class="btn btn-danger btn-xs" onclick="removeStep(${i})">✕</button>
      </div>
    </div>`;
  }).join('');
  updateRecipeHealth();
}
function recipeDeviceOptions(selected) {
  const opts = ['manual','AimTTi_PL303','Keysight_34461A','modbus_serial','ESP32','MULTIMETER_1'];
  return opts.map(o => `<option value="${escapeHtml(o)}" ${String(selected||'')===o?'selected':''}>${escapeHtml(o)}</option>`).join('');
}
function renderRecipeInlineEditor(step, i) {
  const type = String(step?.type || '');
  const isPs = type === 'PowerSupplySet';
  const isMeasure = type.includes('Measurement') || type.includes('Test') || type === 'ManualMeasurement' || type === 'PowerSupplyMeasureCurrent';
  if (!isPs && !isMeasure && type !== 'Delay') return '';
  const field = (label, html) => `<div><label>${label}</label>${html}</div>`;
  const input = (prop, value, inputType='text') => `<input type="${inputType}" value="${escapeHtml(value ?? '')}" onchange="updateRecipeStepField(${i}, '${prop}', this.value)">`;
  if (isPs) {
    return `<div class="recipe-inline-edit">
      ${field('Etichetta', input('label', step.label || 'Alimentatore'))}
      ${field('CH', `<select onchange="updateRecipeStepField(${i}, 'ps_channel', this.value)"><option value="1" ${Number(step.ps_channel||step.channel||1)===1?'selected':''}>CH1</option><option value="2" ${Number(step.ps_channel||step.channel||1)===2?'selected':''}>CH2</option></select>`)}
      ${field('Volt', input('ps_voltage', step.ps_voltage ?? step.value?.voltage ?? 24, 'number'))}
      ${field('I max A', input('ps_current', step.ps_current ?? step.value?.current ?? 1, 'number'))}
      ${field('Output', `<select onchange="updateRecipeStepField(${i}, 'ps_output_on', this.value)"><option value="true" ${(step.ps_output_on ?? step.value?.outputOn) !== false?'selected':''}>ON</option><option value="false" ${(step.ps_output_on ?? step.value?.outputOn) === false?'selected':''}>OFF</option></select>`)}
    </div>`;
  }
  if (type === 'GotoIfFail') {
    return `<div class="recipe-inline-edit">${field('Etichetta', input('label', step.label || 'IF FAIL'))}${field('Vai a step_id', input('target_step', step.target_step || 1, 'number'))}</div>`;
  }
  if (type === 'LoopStart') {
    return `<div class="recipe-inline-edit">${field('Etichetta', input('label', step.label || 'Loop'))}${field('Ripetizioni', input('value', step.value || 3, 'number'))}</div>`;
  }
  if (type === 'Delay') {
    return `<div class="recipe-inline-edit">${field('Etichetta', input('label', step.label || 'Attesa'))}${field('Attesa ms', input('timeout', step.timeout || 1000, 'number'))}</div>`;
  }
  if (type === 'MultiChannelResistanceTest') {
    const rows = Array.isArray(step.channels) ? step.channels : [];
    return `<div class="recipe-inline-edit">
      ${field('Etichetta', input('label', step.label || 'Test multi-canale resistenza'))}
      ${field('Device', `<select onchange="updateRecipeStepField(${i}, 'device_mapping', this.value)">${recipeDeviceOptions(step.device_mapping || 'Keysight_34461A')}</select>`)}
      ${field('Unità', input('unit', step.unit || 'Ω'))}
      ${field('FAIL', `<select onchange="updateRecipeStepField(${i}, 'stop_on_fail', this.value==='stop')"><option value="stop" ${step.stop_on_fail!==false?'selected':''}>Ferma test</option><option value="continue" ${step.stop_on_fail===false?'selected':''}>Continua e segnala canali</option></select>`)}
    </div>
    <div class="recipe-multichannel-336">
      <div class="recipe-multichannel-head"><span>Canale</span><span>Uscita</span><span>Min</span><span>Max</span><span>Stab ms</span><span>ON</span></div>
      ${rows.map((ch,ci)=>`<div class="recipe-multichannel-row">
        <input value="${escapeHtml(ch.name||('CH'+(ci+1)))}" onchange="updateMultiChannel336(${i},${ci},'name',this.value)">
        <input value="${escapeHtml(ch.output||('OUT'+(ci+1)))}" onchange="updateMultiChannel336(${i},${ci},'output',this.value)">
        <input type="number" value="${escapeHtml(ch.min??'')}" onchange="updateMultiChannel336(${i},${ci},'min',this.value)">
        <input type="number" value="${escapeHtml(ch.max??'')}" onchange="updateMultiChannel336(${i},${ci},'max',this.value)">
        <input type="number" value="${escapeHtml(ch.stable_ms??500)}" onchange="updateMultiChannel336(${i},${ci},'stable_ms',this.value)">
        <input type="checkbox" ${ch.enabled!==false?'checked':''} onchange="updateMultiChannel336(${i},${ci},'enabled',this.checked)">
      </div>`).join('')}
      <div class="row" style="margin-top:8px;"><button class="btn btn-ghost btn-sm" onclick="addMultiChannelRow336(${i})">➕ Canale</button><button class="btn btn-ghost btn-sm" onclick="fillMultiChannelRows336(${i},15)">↔ 15 canali</button></div>
    </div>`;
  }
  return `<div class="recipe-inline-edit">
    ${field('Etichetta', input('label', step.label || type))}
    ${field('Device', `<select onchange="updateRecipeStepField(${i}, 'device_mapping', this.value)">${recipeDeviceOptions(step.device_mapping || 'manual')}</select>`)}
    ${field('Min', input('min', step.min ?? '', 'number'))}
    ${field('Max', input('max', step.max ?? '', 'number'))}
    ${field('Target', input('target', step.target ?? '', 'number'))}
    ${field('Tol ±', input('tolerance', step.tolerance ?? '', 'number'))}
    ${field('Origine', `<select onchange="updateRecipeStepField(${i}, 'measurement_mode', this.value)"><option value="auto_with_fallback" ${(step.measurement_mode||'auto_with_fallback')==='auto_with_fallback'?'selected':''}>Auto + fallback</option><option value="automatic" ${step.measurement_mode==='automatic'?'selected':''}>Solo auto</option><option value="manual" ${step.measurement_mode==='manual'?'selected':''}>Solo manuale</option></select>`)}
    ${field('Fallback manuale', `<select onchange="updateRecipeStepField(${i}, 'manual_fallback_enabled', this.value==='true')"><option value="true" ${step.manual_fallback_enabled!==false?'selected':''}>Accettato</option><option value="false" ${step.manual_fallback_enabled===false?'selected':''}>Non accettato</option></select>`)}
    ${field('Unità', input('unit', step.unit || ''))}
    ${field('Salva variabile', input('save_as_variable', step.save_as_variable || ''))}
    ${field('Usa variabile', input('compare_variable', step.compare_variable || ''))}
    ${field('Tipo', `<select onchange="updateRecipeStepField(${i}, 'manual_measure_type', this.value)"><option value="MANUAL_VALUE" ${step.manual_measure_type==='MANUAL_VALUE'?'selected':''}>Valore</option><option value="CONFIRM" ${step.manual_measure_type==='CONFIRM'?'selected':''}>PASS/FAIL</option><option value="CONTINUITY" ${step.manual_measure_type==='CONTINUITY'?'selected':''}>Continuità</option><option value="TEMPERATURE" ${step.manual_measure_type==='TEMPERATURE'?'selected':''}>Temperatura</option><option value="POWER" ${step.manual_measure_type==='POWER'?'selected':''}>Potenza</option></select>`)}
    <div class="recipe-measure-preview-412c">${renderMeasurePreviewInline412C(step)}</div>
  </div>`;
}

function renderMeasurePreviewInline412C(step) {
  const unit = step.unit || '';
  const r = calcMeasureRange412C(step.target, step.tolerance, step.min, step.max);
  const mode = step.measurement_mode || (step.manual_input_enabled ? 'manual' : 'auto_with_fallback');
  const origin = mode === 'manual' ? 'MANUALE' : (mode === 'automatic' ? 'AUTOMATICA' : 'AUTO + MANUALE');
  const range = (r.min !== undefined && r.max !== undefined)
    ? `${formatMeasure412C(r.min, unit)} → ${formatMeasure412C(r.max, unit)}`
    : 'range non definito';
  const target = r.target !== undefined ? formatMeasure412C(r.target, unit) : '—';
  const tol = r.tolerance !== undefined ? '± ' + formatMeasure412C(r.tolerance, unit) : '—';
  const bad = (r.min !== undefined && r.max !== undefined && r.min > r.max) ? '<span class="fail">⚠️ Min > Max</span>' : '';
  return `<b>Anteprima misura:</b> atteso ${target}, tolleranza ${tol}, PASS ${range}, origine ${escapeHtml(origin)} ${bad}`;
}

function renderStopOnFailOption331(step, i) {
  const checked = step.stop_on_fail !== false;
  return `<div class="recipe-stopfail-336" data-ui-id="recipe.step.${i+1}.fail.policy"><span>Se FAIL: <b>${checked ? 'FERMA test e marca FAIL' : 'PROSEGUI e segnala guasto'}</b></span><label class="switch336"><input type="checkbox" ${checked ? 'checked' : ''} onchange="updateRecipeStepField(${i}, 'stop_on_fail', this.checked)"><span class="slider336"></span></label></div>`;
}

function updateMultiChannel336(stepIndex, chIndex, prop, value) {
  const step = recipe.steps[stepIndex]; if (!step) return;
  if (!Array.isArray(step.channels)) step.channels = [];
  if (!step.channels[chIndex]) step.channels[chIndex] = { name:'CH'+(chIndex+1), output:'OUT'+(chIndex+1), min:10, max:50, stable_ms:500, enabled:true };
  let v = value;
  if (['min','max','stable_ms'].includes(prop)) v = value === '' ? '' : Number(value);
  if (prop === 'enabled') v = Boolean(value);
  step.channels[chIndex][prop] = v;
  renderSteps();
}
function addMultiChannelRow336(stepIndex) { const step = recipe.steps[stepIndex]; if (!step) return; if (!Array.isArray(step.channels)) step.channels=[]; const n=step.channels.length+1; step.channels.push({name:'CH'+n, output:'OUT'+n, min:10, max:50, stable_ms:500, enabled:true}); renderSteps(); }
function fillMultiChannelRows336(stepIndex, count) { const step = recipe.steps[stepIndex]; if (!step) return; const old=Array.isArray(step.channels)?step.channels:[]; step.channels=Array.from({length:Number(count)||15},(_,i)=> old[i] || {name:'CH'+(i+1), output:'OUT'+(i+1), min:10, max:50, stable_ms:500, enabled:true}); renderSteps(); }


function updateRecipeStepField(i, prop, value) {
  const step = recipe.steps[i]; if (!step) return;
  let v = value;
  if (['min','max','target','tolerance','timeout','ps_voltage','ps_current','ps_channel','channel','target_step','value'].includes(prop)) v = value === '' ? '' : Number(value);
  if (prop === 'ps_output_on') v = String(value) === 'true';
  if (prop === 'stop_on_fail') v = Boolean(value);
  step[prop] = v;
  if (prop === 'ps_channel') step.channel = Number(v) || 1;
  if (prop === 'ps_voltage') step.value = { ...(step.value || {}), voltage: Number(v) || 0 };
  if (prop === 'ps_current') step.value = { ...(step.value || {}), current: Number(v) || 0 };
  if (prop === 'ps_output_on') step.value = { ...(step.value || {}), outputOn: Boolean(v) };
  if (['target','tolerance'].includes(prop) && step.target !== '' && step.target !== undefined && step.tolerance !== '' && step.tolerance !== undefined) {
    const rr = calcMeasureRange412C(step.target, step.tolerance, step.min, step.max);
    step.tolerance = Math.abs(Number(step.tolerance));
    step.min = rr.min;
    step.max = rr.max;
  }
  renderSteps();
}
let recipeDragIndex = null;
function recipeDragStart(ev, i){ recipeDragIndex = i; ev.currentTarget?.classList.add('dragging'); try{ev.dataTransfer.effectAllowed='move';}catch{} }
function recipeDragOver(ev, i){ ev.preventDefault(); ev.currentTarget?.classList.add('drop-target'); }
function recipeDragLeave(ev){ ev.currentTarget?.classList.remove('drop-target'); }
function recipeDragEnd(ev){ ev.currentTarget?.classList.remove('dragging'); document.querySelectorAll('.recipe-flow-card.drop-target').forEach(x=>x.classList.remove('drop-target')); }
function recipeDrop(ev, i){ ev.preventDefault(); document.querySelectorAll('.recipe-flow-card.drop-target').forEach(x=>x.classList.remove('drop-target')); if(recipeDragIndex===null || recipeDragIndex===i) return; const [item]=recipe.steps.splice(recipeDragIndex,1); recipe.steps.splice(i,0,item); recipeDragIndex=null; renumberRecipeSteps(); renderSteps(); }
function renderDeviceManagerMini() {
  const box = document.getElementById('device-manager-mini'); if (!box) return;
  const names = ['AimTTi_PL303','modbus_serial','Keysight_34461A'];
  box.innerHTML = names.map(n => {
    const st = latestHardwareStatuses.find(x => x.name === n) || {};
    const online = st.connected || st.live || (!st.mock && st.status === 'connected');
    const mock = st.mock;
    const cls = online ? 'device-state-online' : (mock ? 'device-state-offline' : 'device-state-error');
    const txt = online ? 'ONLINE' : (mock ? 'MOCK/OFFLINE' : 'OFFLINE');
    return `<div class="device-mini-card"><b>${escapeHtml(n)}</b><span class="${cls}">${txt}</span><div class="hint">${escapeHtml(st.connectionString || st.port || st.status || 'nessun dato')}</div></div>`;
  }).join('');
}
async function renderQualityMini() {
  const box = document.getElementById('quality-mini'); if (!box) return;
  let k = { total:0, passed:0, failed:0, yield:'0%' };
  try { if (api?.getKpi) k = await api.getKpi(); } catch {}
  box.innerHTML = `<div class="quality-mini-card"><div class="num">${escapeHtml(k.total||0)}</div><div>Test</div></div><div class="quality-mini-card"><div class="num">${escapeHtml(k.passed||0)}</div><div>PASS</div></div><div class="quality-mini-card"><div class="num">${escapeHtml(k.failed||0)}</div><div>FAIL</div></div><div class="quality-mini-card"><div class="num">${escapeHtml(k.yield||'0%')}</div><div>Yield</div></div>`;
}

function toggleStepEnabled(i) { recipe.steps[i].enabled = recipe.steps[i].enabled === false; renderSteps(); }
function moveStep(i, delta) { const j = i + delta; if (j < 0 || j >= recipe.steps.length) return; const tmp = recipe.steps[i]; recipe.steps[i] = recipe.steps[j]; recipe.steps[j] = tmp; renumberRecipeSteps(); renderSteps(); }
function updateRecipeHealth() {
  const el = document.getElementById('recipe-health'); if (!el) return;
  const active = recipe.steps.filter(s => s.enabled !== false);
  const needsEsp = active.some(s => ['DI','DO','AI','AO'].includes(s.io_type)) || (getPowerSourceValue() === 'ESP32_RELAY_POWER');
  const esp = latestHardwareStatuses.find(x => x.name === 'modbus_serial');
  const espTxt = needsEsp ? (esp && !esp.mock ? '✅ ESP32/modbus_serial LIVE' : '❌ ESP32/modbus_serial non LIVE') : 'ℹ️ ESP32 non richiesto';
  const errors = [];
  active.forEach((s,idx)=>{ 
    const measure = String(s.type||'').match(/Measurement|Resistance|Frequency|PowerSupplyMeasureCurrent|Manual/i);
    if (s.min !== undefined && s.max !== undefined && s.min !== '' && s.max !== '' && Number(s.min) > Number(s.max)) errors.push(`Step ${idx+1}: Min > Max`); 
    if (measure && s.target !== undefined && s.target !== '' && s.min !== undefined && s.max !== undefined && (Number(s.target) < Number(s.min) || Number(s.target) > Number(s.max))) errors.push(`Step ${idx+1}: target fuori range`);
    if (measure && !s.unit && s.type !== 'ManualMeasurement') errors.push(`Step ${idx+1}: unità mancante`);
    if (measure && !s.device_mapping) errors.push(`Step ${idx+1}: dispositivo mancante`);
    if (!s.label) errors.push(`Step ${idx+1}: etichetta mancante`); 
  });
  const pl303Needed = active.some(s => s.device_mapping === 'AimTTi_PL303' || s.type === 'PowerSupplySet' || s.type === 'PowerSupplyMeasureCurrent');
  const pl303 = latestHardwareStatuses.find(x => x.name === 'AimTTi_PL303');
  const pl303Txt = pl303Needed ? (pl303 && !pl303.mock ? '✅ PL303 LIVE' : '⚠️ PL303 offline/mock') : 'ℹ️ PL303 non richiesto';
  el.innerHTML = `<b>Stato ricetta:</b> ${recipe.enabled !== false ? 'abilitata' : 'disabilitata'} · Step attivi: ${active.length}/${recipe.steps.length}<br>${espTxt}<br>${pl303Txt}${errors.length ? '<br><span style="color:var(--fail)">❌ '+errors.map(escapeHtml).join(' · ')+'</span>' : '<br><span style="color:var(--pass)">✅ Valori base coerenti</span>'}`;
  renderDeviceManagerMini();
  renderQualityMini();
}


function selectRecipeStepType(type, el) {
  const sel = document.getElementById('new-step-type-page');
  if (sel) sel.value = type;
  document.querySelectorAll('.recipe-type-tab').forEach(x => x.classList.remove('active'));
  if (el) el.classList.add('active');
}

async function refreshDashboardRecipes() {
  const sel = document.getElementById('dash-recipe-select');
  if (!sel) return;
  let names = [];
  try { if (api?.listRecipes) names = await api.listRecipes(); } catch {}
  const localNames = Object.keys(localStorage).filter(k => k.startsWith('recipe_')).map(k => k.replace('recipe_', ''));
  names = Array.from(new Set([...(Array.isArray(names) ? names : []), ...localNames])).filter(Boolean).sort();
  names = await filterRecipeNamesByClient317(names, document.getElementById('dash-client-filter')?.value || '');
  const current = recipe?.recipe_name || '';
  sel.innerHTML = names.map(n => `<option value="${escapeHtml(n)}" ${n===current?'selected':''}>${escapeHtml(n)}</option>`).join('') || '<option value="">Nessuna ricetta</option>';
}

async function loadDashboardRecipeSelection() {
  const prodSel = document.getElementById('prod-recipe-select');
  const dashSel = document.getElementById('dash-recipe-select');
  if (prodSel && dashSel) {
    await refreshProductionRecipes();
    prodSel.value = dashSel.value;
    await loadProductionRecipeSelection();
  } else if (dashSel?.value) {
    let loaded = null;
    try { if (api?.loadRecipe) { const res = await api.loadRecipe(dashSel.value); if (res?.ok) loaded = res.recipe; } } catch {}
    if (!loaded) { try { loaded = JSON.parse(localStorage.getItem('recipe_' + dashSel.value) || 'null'); } catch {} }
    if (loaded) { recipe = loaded; recipe.steps = Array.isArray(recipe.steps) ? recipe.steps : []; renumberRecipeSteps(); renderSteps(); }
  }
  addLog(document.getElementById('run-log'), `📂 Ricetta dashboard selezionata: <b>${escapeHtml(recipe?.recipe_name || dashSel?.value || '-')}</b>`, 'info');
}

async function startTestFromDashboard() {
  await loadDashboardRecipeSelection();
  await autoConnectProductionInstruments(false);
  await startTest();
}

function friendlyDeviceLabel(name) {
  return name === 'modbus_serial' ? 'ESP32-S3 USB JSON' : name === 'AimTTi_PL303' ? 'Alimentatore PL303' : name === 'Keysight_34461A' ? 'Keysight Multimetro' : name === 'QR_Scanner' ? 'Scanner QR' : name;
}

async function renderDashboardDevices() {
  const box = document.getElementById('dashboard-device-list');
  if (!box) return;
  let rows = [];
  try { rows = api?.getProfessionalDevices ? await api.getProfessionalDevices() : []; } catch {}
  if (!rows || !rows.length) { try { rows = await api.getHardwareStatuses(); } catch {} }
  if (!rows || !rows.length) { box.innerHTML = '<div class="hint">Nessuno strumento configurato.</div>'; return; }
  box.innerHTML = rows.map(r => {
    const live = r.live || (!r.mock && (r.connected !== false));
    return `<div class="dashboard-hw-row ${live?'live':'fail'}"><div><b>${escapeHtml(r.label || friendlyDeviceLabel(r.name))}</b><div class="detail-line">${escapeHtml(r.group || 'Strumento')}</div></div><div class="detail-line">${escapeHtml(r.connectionString || r.conn || '-')}</div><span class="state-led ${live?'high':'low'}">${live?'LIVE':'OFF'}</span></div>`;
  }).join('');
}

function inlineIoStateForStep(step) {
  const io = step.io_type || guessIoType(step.type);
  if (!['DI','DO','AI'].includes(io) || step.channel === undefined) return '';
  const key = `${io}_${step.channel}`;
  const v = liveIoSnapshot[key];
  const label = v === true ? 'HIGH' : v === false ? 'LOW' : (typeof v === 'number' ? Number(v).toFixed(3) : 'N/D');
  const cls = v === true ? 'high' : v === false ? 'low' : '';
  return `<span class="live-chip io-live-inline ${cls}"><span class="live-dot"></span>${io} GPIO${step.channel}: ${label}</span>`;
}

async function bootstrapDashboard217() {
  await refreshDashboardRecipes();
  renderDashboardDevices();
  const lot = document.getElementById('lot-number-dash'); if (lot) lot.value = getLotNumber();
  const sn = document.getElementById('serial-dut-dash'); if (sn) sn.value = getSerialDutRaw();
}

function updateHwBadges(statuses) {
  latestHardwareStatuses = statuses || [];
  const container = document.getElementById('hw-badges');
  container.innerHTML = statuses.map(s => `
    <div class="hw-badge ${s.mock ? 'mock' : 'live'}">
      <div class="dot"></div>
      <span>${s.name.split('_')[0]} ${s.mock ? 'MOCK' : 'LIVE'}</span>
    </div>`).join('');
}

async function startQr() {
  try {
    qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('videoEl');
    video.srcObject = qrStream;
    video.style.display = 'block';
    qrScanInterval = setInterval(() => scanQrFrame(), 300);
  } catch (e) {
    addLog(document.getElementById('sys-log'), '❌ Camera non disponibile', 'fail');
  }
}

function stopQr() {
  clearInterval(qrScanInterval);
  if (qrStream) qrStream.getTracks().forEach(t => t.stop());
  document.getElementById('videoEl').style.display = 'none';
}

function scanQrFrame() {
  const video = document.getElementById('videoEl');
  const canvas = document.getElementById('qrCanvas');
  if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (typeof jsQR !== 'undefined') {
    const code = jsQR(imgData.data, imgData.width, imgData.height);
    if (code) {
      document.getElementById('serial-dut').value = code.data; const psi=document.getElementById('prod-serial-input'); if(psi) psi.value = code.data;
      document.getElementById('qrResult').textContent = '✅ ' + code.data;
      stopQr();
    }
  }
}


function forceRunIdleUi() {
  stopProductionTimer();
  activeStepId = null;
  startInProgress = false;
  currentRunState = 'STOP_OPERATORE';
  setProductionTimingState('STOP_OPERATORE');
  setStatePill('READY');
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnStop = document.getElementById('btn-stop');
  if (btnStart) btnStart.disabled = false;
  if (btnPause) { btnPause.disabled = true; btnPause.textContent = '⏸ PAUSA'; btnPause.onclick = pauseTest; }
  if (btnStop) btnStop.disabled = true;
  const box = document.getElementById('current-step-box');
  if (box) box.innerHTML = 'Nessun test in esecuzione.';
}

let failFinalizeWatchdog336 = null;
function forceFinalizeFail336(reason) {
  try {
    productionForceComplete = true;
    currentRunState = 'FAIL';
    activeStepId = null;
    pendingFailureDecision = false;
    setStatePill('FAIL');
    setProductionTimingState('FAIL');
    const p=document.getElementById('prod-progress-percent'); const f=document.getElementById('prod-progress-fill');
    if(p) p.textContent='100%'; if(f) f.style.width='100%';
    setProductionFinalStatus('fail');
    forceRunIdleUi();
    updateProductionTestMode();
    addLog(document.getElementById('run-log'), `❌ Test chiuso con esito FAIL${reason ? ' — '+escapeHtml(reason) : ''}.`, 'fail');
  } catch(e) { console.warn('forceFinalizeFail336', e); }
}
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
    const pf=document.getElementById('prod-client-filter'); if(pf && !pf.value && (recipe.client_name||recipe.customer)) pf.value = recipe.client_name || recipe.customer || '';
  };
}
const __renderRecipePage319 = typeof renderRecipePage==='function' ? renderRecipePage : null;
if(__renderRecipePage319){
  renderRecipePage = function(){
    __renderRecipePage319();
    const c=document.getElementById('recipe-client-page'); if(c) c.value = recipe.client_name || recipe.customer || localStorage.getItem('atmec_last_recipe_client') || '';
    const p=document.getElementById('recipe-product-page'); if(p) p.value = recipe.product_name || recipe.product || localStorage.getItem('atmec_last_recipe_product') || '';
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
function isAdminUi336(){ try { return String(currentUser?.role || currentUser?.username || '').toLowerCase().includes('admin') || Number(currentUser?.level||0) >= 90; } catch { return true; } }
function refreshUiDevButton336(){ ensureUiDevPanel336(); try { document.body.classList.toggle('admin-session', isAdminUi336()); } catch { document.body.classList.add('admin-session'); } }
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
  html += '</tbody></table><p style="margin-top:22px;font-size:11px">Generato da AT-MEC HM 4.12C</p></body></html>';
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
  html+='</tbody></table><p style="margin-top:22px;font-size:11px">Generato da AT-MEC HM 4.12C</p></body></html>';
  const w=window.open('', '_blank');
  if(!w){ downloadTextFile(`scheda_unita_${serial}.html`, html, 'text/html'); return; }
  w.document.write(html); w.document.close(); setTimeout(()=>{ try{ w.print(); }catch{} },350);
}


// AT-MEC_HM_4.11 - Loghi PDF + layout Storico/Scheda isolato dal KPI dashboard.
function atmecReportLogoUrl410J(fileName){
  try { return new URL('assets/' + fileName, window.location.href).href; }
  catch(_e){ return 'assets/' + fileName; }
}
function atmecReportHeader410J(title, subtitle=''){
  const mec = atmecReportLogoUrl410J('MEC.PNG');
  const mirza = atmecReportLogoUrl410J('MIRZA_LOGO.png');
  return `<div class="atmec-print-header"><div class="atmec-print-logo-box"><img src="${mec}" alt="MEC"></div><div class="atmec-print-title"><h1>${escapeHtml(title)}</h1>${subtitle?`<div>${subtitle}</div>`:''}</div><div class="atmec-print-logo-box"><img src="${mirza}" alt="MIRZA"></div></div>`;
}
function atmecReportStyle410J(){
  return `<style>
    body{font-family:Arial,Helvetica,sans-serif;padding:26px;color:#111;background:#fff} h1{font-size:20px;margin:0 0 4px 0} h2{font-size:15px;margin:20px 0 8px 0} table{width:100%;border-collapse:collapse;margin-top:10px}td,th{border:1px solid #999;padding:6px;font-size:12px;vertical-align:top}th{background:#f1f3f6;text-align:left}.pass{color:green;font-weight:bold}.fail{color:red;font-weight:bold}.muted{color:#666;font-size:11px}.atmec-print-header{display:grid;grid-template-columns:120px 1fr 120px;gap:18px;align-items:center;border-bottom:2px solid #202538;padding-bottom:12px;margin-bottom:18px}.atmec-print-logo-box{height:68px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #e4e7ee;border-radius:10px;padding:6px}.atmec-print-logo-box img{max-width:100%;max-height:56px;object-fit:contain}.atmec-print-title{text-align:center}.atmec-print-title div{font-size:12px;color:#555}.atmec-print-footer{margin-top:22px;border-top:1px solid #ddd;padding-top:8px;font-size:11px;color:#666;display:flex;justify-content:space-between;gap:12px}@media print{body{padding:14mm}.atmec-print-header{break-inside:avoid}}
  </style>`;
}

// Sovrascrittura conservativa export storico da pagina Test Report/Audit: stessa logica, solo header loghi.
function exportSerialHistoryPdf() {
  const serial = document.getElementById('audit-serial')?.value?.trim() || document.getElementById('serial-history-input')?.value?.trim() || getSerialDutRaw();
  if (!serial) { alert('Inserisci o seleziona un Serial Number per esportare lo storico scheda.'); return; }
  const lot = document.getElementById('audit-lot')?.value?.trim() || document.getElementById('serial-history-lot')?.value?.trim() || getLotNumber();
  const sourceRows = Array.isArray(auditCache) && auditCache.length ? auditCache : [];
  const rows = sourceRows.filter(r => String(r.serial_dut || '') === serial && (!lot || String(r.lot_number || r.work_order || '') === lot)).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
  let html = `<html><head><title>Storico ${escapeHtml(serial)}</title>${atmecReportStyle410J()}</head><body>`;
  html += atmecReportHeader410J('AT-MEC HM - Storico scheda e riparazioni', `<b>Seriale:</b> ${escapeHtml(serial)} &nbsp; <b>Commessa/Lotto:</b> ${escapeHtml(lot || 'Tutte')}`);
  html += `<table><thead><tr><th>Data</th><th>Esito</th><th>Ricetta</th><th>Rev</th><th>Operatore</th><th>Riparazione / Intervento</th></tr></thead><tbody>`;
  html += rows.map(r => `<tr><td>${new Date(r.timestamp).toLocaleString('it-IT')}</td><td class="${String(r.final_result).toLowerCase()}">${escapeHtml(r.final_result || '')}</td><td>${escapeHtml(r.recipe_name || '')}</td><td>${escapeHtml(String(r.recipe_version || ''))}</td><td>${escapeHtml(r.operator || '')}</td><td>${escapeHtml(r.repair_note || '')}</td></tr>`).join('') || '<tr><td colspan="6">Nessun record trovato.</td></tr>';
  html += `</tbody></table><div class="atmec-print-footer"><span>Generato da AT-MEC HM 4.12C</span><span>${new Date().toLocaleString('it-IT')}</span></div></body></html>`;
  const w = window.open('', '_blank');
  if (!w) { downloadTextFile(`storico_${serial}.html`, html, 'text/html'); return; }
  w.document.write(html); w.document.close(); setTimeout(() => { try { w.print(); } catch {} }, 350);
}

// Versione 4.10D con loghi: Storico Seriali/Riparazioni.
function printTraceabilitySerialHistory(){
  const c=traceabilitySerialCache410D;
  const serial=(document.getElementById('trace-serial-input')?.value || c?.serial || '').trim();
  if(!serial){ alert('Cerca prima un seriale.'); return; }
  const tests=c?.history?.tests || []; const repairs=c?.history?.repairs || []; const lot=c?.lot || document.getElementById('trace-lot-input')?.value || '';
  let html='<html><head><title>Storico seriale '+escapeHtml(serial)+'</title>'+atmecReportStyle410J()+'</head><body>';
  html += atmecReportHeader410J('AT-MEC HM - Storico seriale', `<b>Seriale:</b> ${escapeHtml(serial)} &nbsp; <b>Lotto:</b> ${escapeHtml(lot || 'Tutti')} &nbsp; <b>Test:</b> ${tests.length} &nbsp; <b>Riparazioni:</b> ${repairs.length}`);
  html += '<h2>Test eseguiti</h2><table><thead><tr><th>Data</th><th>Seriale</th><th>Esito</th><th>Ricetta</th><th>Operatore</th><th>Riparazione</th></tr></thead><tbody>';
  html += tests.map(r=>`<tr><td>${new Date(r.timestamp).toLocaleString('it-IT')}</td><td>${escapeHtml(r.serial_dut||serial)}</td><td class="${String(r.final_result||'').toLowerCase()}">${escapeHtml(r.final_result||'')}</td><td>${escapeHtml(r.recipe_name||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="6">Nessun test.</td></tr>';
  html += '</tbody></table><h2>Riparazioni</h2><table><thead><tr><th>Data</th><th>Lotto</th><th>Operatore</th><th>Intervento</th></tr></thead><tbody>';
  html += repairs.map(r=>`<tr><td>${new Date(r.timestamp).toLocaleString('it-IT')}</td><td>${escapeHtml(r.lot_number||r.work_order||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="4">Nessuna riparazione.</td></tr>';
  html += `</tbody></table><div class="atmec-print-footer"><span>Generato da AT-MEC HM 4.12C</span><span>${new Date().toLocaleString('it-IT')}</span></div></body></html>`;
  const w=window.open('', '_blank');
  if(!w){ downloadTextFile(`storico_seriale_${serial}.html`, html, 'text/html'); return; }
  w.document.write(html); w.document.close(); setTimeout(()=>{ try{ w.print(); }catch{} }, 350);
}

// Versione 4.10E con loghi: Scheda unità/Genealogia prodotto.
function printUnitGenealogy410E(){
  const c=unitGenealogyCache410E;
  const serial=(document.getElementById('unit-serial-input')?.value || c?.serial || '').trim();
  if(!serial){ alert('Carica prima una scheda unità.'); return; }
  const tests=c?.tests || []; const repairs=c?.repairs || [];
  let html='<html><head><title>Scheda unità '+escapeHtml(serial)+'</title>'+atmecReportStyle410J()+'</head><body>';
  html+=atmecReportHeader410J('AT-MEC HM - Scheda Unità / Genealogia prodotto', `<b>Seriale:</b> ${escapeHtml(serial)} &nbsp; <b>Lotto:</b> ${escapeHtml(c?.lot || '-')} &nbsp; <b>Ultimo esito:</b> ${escapeHtml(c?.lastResult || 'N/D')}`);
  html+=`<p><b>Revisione scheda:</b> ${escapeHtml(c?.boardRev || '-')}<br><b>Firmware:</b> ${escapeHtml(c?.firmware || '-')}<br><b>Note qualità:</b> ${escapeHtml(c?.qualityNote || '-')}</p>`;
  html+='<h2>Timeline test</h2><table><thead><tr><th>#</th><th>Data</th><th>Esito</th><th>Ricetta</th><th>Rev</th><th>Operatore</th><th>Nota</th></tr></thead><tbody>';
  html+=tests.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(unitDate410E(r.timestamp))}</td><td class="${String(r.final_result||'').toLowerCase()}">${escapeHtml(r.final_result||'')}</td><td>${escapeHtml(r.recipe_name||'')}</td><td>${escapeHtml(r.recipe_version||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="7">Nessun test.</td></tr>';
  html+='</tbody></table><h2>Riparazioni</h2><table><thead><tr><th>#</th><th>Data</th><th>Lotto</th><th>Operatore</th><th>Intervento</th></tr></thead><tbody>';
  html+=repairs.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(unitDate410E(r.timestamp))}</td><td>${escapeHtml(r.lot_number||r.work_order||'')}</td><td>${escapeHtml(r.operator||'')}</td><td>${escapeHtml(r.repair_note||'')}</td></tr>`).join('') || '<tr><td colspan="5">Nessuna riparazione.</td></tr>';
  html+=`</tbody></table><div class="atmec-print-footer"><span>Generato da AT-MEC HM 4.12C</span><span>${new Date().toLocaleString('it-IT')}</span></div></body></html>`;
  const w=window.open('', '_blank');
  if(!w){ downloadTextFile(`scheda_unita_${serial}.html`, html, 'text/html'); return; }
  w.document.write(html); w.document.close(); setTimeout(()=>{ try{ w.print(); }catch{} },350);
}

// AT-MEC_HM_4.12C - Analisi Produzione separata.
// Modulo additivo: usa solo getLocalDbStats e non modifica Test Mode, Dashboard, Storico, Scheda Unità o Layout Editor.
function productionAnalysisFilters412A(){
  return {
    lot: (document.getElementById('pa412a-lot')?.value || '').trim(),
    serial: (document.getElementById('pa412a-serial')?.value || '').trim(),
    operator: (document.getElementById('pa412a-operator')?.value || '').trim(),
    recipe: (document.getElementById('pa412a-recipe')?.value || '').trim(),
    result: (document.getElementById('pa412a-result')?.value || 'ALL').trim(),
    dateFrom: (document.getElementById('pa412a-date-from')?.value || '').trim(),
    dateTo: (document.getElementById('pa412a-date-to')?.value || '').trim()
  };
}
function pa412aSetText(id, value){ const el=document.getElementById(id); if(el) el.textContent=String(value ?? ''); }
function pa412aHtmlRows(items, emptyText){
  if(!Array.isArray(items) || !items.length) return `<div class="hint">${escapeHtml(emptyText || 'Nessun dato disponibile.')}</div>`;
  return items.map((it)=>`<div class="pa412a-row"><b>${escapeHtml(it.title ?? it.name ?? it.day ?? '-')}</b><span>${escapeHtml(it.value ?? it.count ?? it.summary ?? '')}</span></div>`).join('');
}
async function loadProductionAnalysisDashboard412A(){
  const status=document.getElementById('pa412a-status');
  if(status) status.textContent='Calcolo KPI in corso...';
  if(!api?.getLocalDbStats){ if(status) status.textContent='API KPI non disponibile.'; return; }
  try{
    const filters=productionAnalysisFilters412A();
    const st=await api.getLocalDbStats(filters);
    pa412aSetText('pa412a-fpy', (st.fpyRate || 0) + '%');
    pa412aSetText('pa412a-yield', (st.yieldRate || 0) + '%');
    pa412aSetText('pa412a-retest', (st.retestRate || 0) + '%');
    pa412aSetText('pa412a-avg-time', (st.avgTestTimeSec || 0) + 's');
    pa412aSetText('pa412a-serials', st.uniqueSerials || 0);
    pa412aSetText('pa412a-total', st.total || 0);
    const today=new Date().toISOString().slice(0,10);
    const todayTrend=(Array.isArray(st.dailyTrend) ? st.dailyTrend : []).find(x=>String(x.day)===today) || {pass:0, fail:0};
    pa412aSetText('pa412a-pass-today', todayTrend.pass || 0);
    pa412aSetText('pa412a-fail-today', todayTrend.fail || 0);
    const trend=(Array.isArray(st.dailyTrend) ? st.dailyTrend : []).slice(-14).map(d=>({title:d.day, value:`${d.pass || 0} PASS / ${d.fail || 0} FAIL · Yield ${d.yieldRate || 0}%`}));
    const failures=(Array.isArray(st.topFailures) ? st.topFailures : []).slice(0,10).map(f=>({title:f.name || 'FAIL', value:`${f.count || 0} occorrenze`}));
    const latest=st.latestReport || null;
    const latestRows=latest ? [
      {title:'Data', value: latest.timestamp ? new Date(latest.timestamp).toLocaleString('it-IT') : '-'},
      {title:'Esito', value: latest.final_result || '-'},
      {title:'Seriale', value: latest.serial_dut || '-'},
      {title:'Ricetta', value: `${latest.recipe_name || '-'} ${latest.recipe_version ? 'v'+latest.recipe_version : ''}`},
      {title:'Operatore', value: latest.operator || '-'}
    ] : [];
    const trendBox=document.getElementById('pa412a-trend'); if(trendBox) trendBox.innerHTML=pa412aHtmlRows(trend, 'Nessun trend disponibile con questi filtri.');
    const failBox=document.getElementById('pa412a-top-failures'); if(failBox) failBox.innerHTML=pa412aHtmlRows(failures, 'Nessun guasto trovato con questi filtri.');
    const latestBox=document.getElementById('pa412a-latest'); if(latestBox) latestBox.innerHTML=pa412aHtmlRows(latestRows, 'Nessun report disponibile con questi filtri.');
    if(status) status.textContent=`KPI aggiornati · ${st.total || 0} test filtrati · DB: ${st.dbPath || 'N/D'}`;
  }catch(e){
    if(status) status.textContent='Errore calcolo KPI: '+normalizeError(e);
    console.error('[AT-MEC 4.12C] Analisi Produzione', e);
  }
}
function clearProductionAnalysisFilters412A(){
  ['pa412a-lot','pa412a-serial','pa412a-operator','pa412a-recipe','pa412a-date-from','pa412a-date-to'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const res=document.getElementById('pa412a-result'); if(res) res.value='ALL';
  loadProductionAnalysisDashboard412A();
}


// AT-MEC_HM_4.12C - Archivio Dati & Backup separato.
// Modulo additivo: usa API gia esistenti e non modifica Test Mode, Ricette, Hardware, Layout Editor, Storico o Scheda Unità.
function archiveFilters412B(){
  return {
    serial: (document.getElementById('da412b-serial')?.value || '').trim(),
    lot: (document.getElementById('da412b-lot')?.value || '').trim(),
    operator: (document.getElementById('da412b-operator')?.value || '').trim(),
    recipe: (document.getElementById('da412b-recipe')?.value || '').trim(),
    result: (document.getElementById('da412b-result')?.value || 'ALL').trim(),
    dateFrom: (document.getElementById('da412b-date-from')?.value || '').trim(),
    dateTo: (document.getElementById('da412b-date-to')?.value || '').trim()
  };
}
function da412bSetText(id, value){ const el=document.getElementById(id); if(el) el.textContent=String(value ?? ''); }
function da412bStatus(id, text){ const el=document.getElementById(id); if(el) el.textContent=String(text || ''); }
function archiveRows412B(rows){
  if(!Array.isArray(rows) || !rows.length) return '<div class="hint">Nessun record trovato con questi filtri.</div>';
  return rows.slice(0,25).map(r=>{
    const res=String(r.final_result || r.result || '').toUpperCase();
    const cls=res==='PASS'?'pass':(res==='FAIL'?'fail':'');
    const ts=r.timestamp ? new Date(r.timestamp).toLocaleString('it-IT') : '-';
    return `<div class="da412b-row ${cls}"><b>${escapeHtml(ts)} · ${escapeHtml(res || 'N/D')}</b><span>${escapeHtml(r.serial_dut || r.serial || '-')} · ${escapeHtml(r.recipe_name || '-')} · ${escapeHtml(r.operator || '-')}</span></div>`;
  }).join('');
}
async function loadDataArchiveDashboard412B(){
  da412bStatus('da412b-maint-status','Aggiornamento archivio in corso...');
  try{
    if(!api?.getLocalDbStats){ da412bStatus('da412b-maint-status','API statistiche archivio non disponibile.'); return; }
    const st=await api.getLocalDbStats(archiveFilters412B());
    da412bSetText('da412b-total', st.total || 0);
    da412bSetText('da412b-serials', st.uniqueSerials || 0);
    da412bSetText('da412b-yield', (st.yieldRate || 0) + '%');
    da412bSetText('da412b-retest', (st.retestRate || 0) + '%');
    da412bStatus('da412b-maint-status', `Archivio OK · ${st.total || 0} test · DB: ${st.dbPath || 'N/D'}`);
  }catch(e){
    da412bStatus('da412b-maint-status','Errore archivio: '+normalizeError(e));
    console.error('[AT-MEC 4.12C] Archivio dati', e);
  }
}
async function previewDataArchive412B(){
  const box=document.getElementById('da412b-preview');
  if(box) box.innerHTML='<div class="hint">Caricamento anteprima...</div>';
  try{
    let rows=[];
    if(api?.getAuditHistory){ rows=await api.getAuditHistory(archiveFilters412B()); }
    if(box) box.innerHTML=archiveRows412B(Array.isArray(rows)?rows:[]);
    da412bStatus('da412b-export-status', `${Array.isArray(rows)?rows.length:0} record trovati.`);
    await loadDataArchiveDashboard412B();
  }catch(e){
    if(box) box.innerHTML='<div class="hint">Errore anteprima: '+escapeHtml(normalizeError(e))+'</div>';
  }
}
async function createArchiveBackup412B(){
  const label=(document.getElementById('da412b-backup-label')?.value || 'manuale').trim() || 'manuale';
  da412bStatus('da412b-backup-status','Creazione backup in corso...');
  try{
    if(!api?.backupLocalDatabase){ da412bStatus('da412b-backup-status','API backup non disponibile.'); return; }
    const res=await api.backupLocalDatabase(label);
    if(res?.ok) da412bStatus('da412b-backup-status', `Backup creato: ${res.filePath} · record: ${res.count ?? '-'}`);
    else da412bStatus('da412b-backup-status', 'Backup annullato o non creato.');
  }catch(e){ da412bStatus('da412b-backup-status','Errore backup: '+normalizeError(e)); }
}
async function verifyDataArchive412B(){
  await loadDataArchiveDashboard412B();
  da412bStatus('da412b-maint-status','Verifica completata. Se i conteggi sono visibili, archivio e API sono raggiungibili.');
}
async function exportArchiveCsv412B(){
  da412bStatus('da412b-export-status','Esportazione CSV in corso...');
  try{
    if(api?.exportLocalReportsCsv){
      const res=await api.exportLocalReportsCsv(archiveFilters412B());
      da412bStatus('da412b-export-status', res?.ok ? `CSV esportato: ${res.filePath}` : 'Esportazione CSV annullata.');
    } else {
      let rows=[]; if(api?.getAuditHistory) rows=await api.getAuditHistory(archiveFilters412B());
      const head=['timestamp','serial_dut','lot_number','work_order','operator','recipe_name','recipe_version','final_result','execution_time_ms','repair_note'];
      const esc=(v)=>`"${String(v??'').replace(/"/g,'""')}"`;
      const body=[head.join(';')].concat((rows||[]).map(r=>head.map(k=>esc(r[k])).join(';'))).join('\n');
      downloadTextFile(`AT-MEC_archivio_${new Date().toISOString().slice(0,10)}.csv`, body, 'text/csv');
      da412bStatus('da412b-export-status','CSV scaricato dal browser.');
    }
  }catch(e){ da412bStatus('da412b-export-status','Errore CSV: '+normalizeError(e)); }
}
async function exportArchiveJson412B(){
  da412bStatus('da412b-export-status','Esportazione JSON in corso...');
  try{
    if(api?.exportLocalDatabase){
      const res=await api.exportLocalDatabase();
      da412bStatus('da412b-export-status', res?.ok ? `JSON esportato: ${res.filePath}` : 'Esportazione JSON annullata.');
    } else {
      const rows=api?.getAuditHistory ? await api.getAuditHistory(archiveFilters412B()) : [];
      downloadTextFile(`AT-MEC_archivio_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify({exported_at:new Date().toISOString(), filters:archiveFilters412B(), rows}, null, 2), 'application/json');
      da412bStatus('da412b-export-status','JSON scaricato dal browser.');
    }
  }catch(e){ da412bStatus('da412b-export-status','Errore JSON: '+normalizeError(e)); }
}
function clearArchiveFilters412B(){
  ['da412b-serial','da412b-lot','da412b-operator','da412b-recipe','da412b-date-from','da412b-date-to','da412b-backup-label'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const r=document.getElementById('da412b-result'); if(r) r.value='ALL';
  const box=document.getElementById('da412b-preview'); if(box) box.innerHTML='<div class="hint">Filtri puliti. Premi Anteprima per visualizzare i dati.</div>';
  loadDataArchiveDashboard412B();
}
