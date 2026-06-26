/* AT-MEC_HM_4.16D_CORE_MODULE_SPLIT
 * Stato globale, guardie, utility, login/bootstrap, wizard e funzioni base.
 * Estratto da app-legacy-core.js preservando ordine di esecuzione.
 */
/* AT-MEC_HM_4.16C_APP_JS_FINAL_SPLIT
 * Legacy renderer core extracted from app.js.
 * This file intentionally preserves the exact execution order and global function declarations
 * from 4.16B to avoid regressions while shrinking app.js to a bootstrap file.
 */
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
let recipe = { recipe_name: 'Nuova Ricetta', version: 1, enabled: true, power_metadata: 'MANUAL_POWER', steps: [] };
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
let selectedUserPhotoDataUrl = '';
let selectedUserOperatorCode = '';
function userCanManageUsers() {
  return !!currentUser && Array.isArray(currentUser.permissions) && currentUser.permissions.includes('manage_users');
}
function userCanManageBranding() {
  return !!currentUser && Array.isArray(currentUser.permissions) && currentUser.permissions.includes('manage_branding');
}
function userCanConfigHardware() {
  return !!currentUser && Array.isArray(currentUser.permissions) && currentUser.permissions.includes('config_hardware');
}

// AT-MEC_HM_4.13A - permessi UI/layout centralizzati.
function userHasPermission412K(permission) {
  try {
    const wanted = permission === 'manage_archive' ? 'manage_data' : permission;
    const perms = currentUser?.permissions || [];
    return Array.isArray(perms) && perms.map(p => p === 'manage_archive' ? 'manage_data' : p).includes(wanted);
  } catch(_e) { return false; }
}
function isAdminOrDeveloper412K() {
  const r = String(currentUser?.role || '').toLowerCase();
  return !!currentUser && (r.includes('admin') || Number(currentUser?.level || 0) >= 100);
}
function canUseLayoutTools412K() {
  return userHasPermission412K('edit_layout') || userHasPermission412K('test_elements');
}
function canShowUiIds412K() {
  return userHasPermission412K('show_ui_ids');
}
window.atmecCanUseLayoutTools412K = canUseLayoutTools412K;
window.atmecCanShowUiIds412K = canShowUiIds412K;
function refreshSecurityUi412K() {
  try {
    const canLayout = canUseLayoutTools412K();
    const canIds = canShowUiIds412K();
    document.body.classList.toggle('atmec-can-layout-412k', canLayout);
    document.body.classList.toggle('atmec-can-uiids-412k', canIds);
    document.body.classList.toggle('atmec-operator-session-412k', !!currentUser && !canLayout);
    ['atmec-inspector-358-bar','atmec-layout-manager-362-panel','atmec-layout-373-panel','atmec-inspector-358-pop','atmec-move-handle-358','atmec-resize-handle-358'].forEach(id=>{
      const el=document.getElementById(id); if(el && !canLayout) el.style.display='none';
    });
    const dev=document.getElementById('ui-dev-toggle-336'); if(dev && !canIds) dev.style.display='none';
    if(!canIds){ try{ clearUiDevLabels336(); document.body.classList.remove('ui-dev-labels-on'); }catch(_e){} }
    if(!canLayout){ try{ document.body.classList.remove('atmec-layout-edit-on','atmec-layout-grid-on'); }catch(_e){} }
  } catch(e) { console.warn('refreshSecurityUi412K', e); }
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
function updateSampleWizardUi() {
  const required = isSampleTestRequired();
  ['sample-test-required-prod','sample-test-required-dash'].forEach(id => { const el=document.getElementById(id); if(el) el.checked = !!required; });
  const btn = document.getElementById('sample-startup-wizard-btn');
  if (btn) {
    btn.disabled = !required;
    btn.title = required ? 'Apri wizard scheda campione' : 'Attiva Test campione per usare il wizard';
  }
  if (!required) document.getElementById('startup-wizard-modal')?.classList.remove('show');
}
function setSampleTestRequired(required) {
  localStorage.setItem('atmec_sample_test_required', required ? '1' : '0');
  if (!required) {
    sessionStorage.setItem('atmec_startup_wizard_done','1');
    sessionStorage.removeItem('atmec_sample_test_done');
  }
  updateSampleWizardUi();
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
  const list = required.length ? required : [];
  if (!list.length && typeof addLog === 'function') addLog(document.getElementById('run-log'), 'Scheda campione: nessuno strumento automatico richiesto dalla ricetta.', 'info');
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
  updateSampleWizardUi();
  if (!isSampleTestRequired()) {
    if (force && typeof showToast === 'function') showToast('Wizard campione disattivato: abilita Test campione per aprirlo.', 'warn');
    return;
  }
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
  updateSampleWizardUi();
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


function completeLogin(operator, role, level = 0, permissions = [], username = '', operatorCode = '', photoDataUrl = '') {
  currentUser = { operator, username: username || operator, operatorCode: operatorCode || username || operator, photoDataUrl: photoDataUrl || '', role, level: Number(level || 0), permissions: Array.isArray(permissions) ? permissions : [] };
  window.atmecCurrentUser412K = currentUser;
  document.body.classList.remove('locked');
  const box = document.getElementById('logged-user-box');
  if (box) box.innerHTML = `<div class="user-mini-413o"><div class="avatar-mini-413o">${photoDataUrl ? `<img src="${escapeHtml(photoDataUrl)}">` : escapeHtml(String(operator||'?').slice(0,1).toUpperCase())}</div><div>✅ <b>${escapeHtml(operator)}</b><br><span>${escapeHtml(operatorCode || username || '')} · ${escapeHtml(role)} · livello ${Number(level || 0)}</span></div></div>`;
  addLog(document.getElementById('sys-log'), `Login: <b>${escapeHtml(operator)}</b> [${escapeHtml(role)}] livello ${Number(level || 0)}`, 'pass');
  refreshRolesUsers().catch(()=>{}); loadAppSettings().catch(()=>{}); refreshBrandingPermissions(); refreshSecurityUi412K();
  const lotEl=document.getElementById('lot-number'); if(lotEl && !lotEl.value) lotEl.value=activeLotNumber;
  const prodLot=document.getElementById('prod-lot-number'); if(prodLot && !prodLot.value) prodLot.value=activeLotNumber;
  refreshProductionRecipes();
  setTimeout(() => autoConnectProductionInstruments(false), 350);
  const lowLevelOperator = String(role || '').toLowerCase().includes('operatore') || String(role || '').toLowerCase().includes('operator') || Number(level || 0) <= 10;
  if (lowLevelOperator) setTimeout(() => enterProductionTestMode(), 250);
}
async function logoutAndLock() {
  try { if (api?.userLogout) await api.userLogout(); } catch(_e) {}
  currentUser = null;
  window.atmecCurrentUser412K = null;
  refreshSecurityUi412K();
  document.body.classList.add('locked');
  const st = document.getElementById('login-status'); if (st) st.textContent = '';
  const pw = document.getElementById('op-password'); if (pw) pw.value = '';
}
function requireLogin() {
  if (!currentUser) { document.body.classList.add('locked'); return false; }
  return true;
}

async function syncCurrentUserFromBackend413O(reason = '') {
  try {
    if (!api?.getCurrentUser || !currentUser) return;
    const res = await api.getCurrentUser();
    if (res?.ok) {
      currentUser = {
        operator: res.operator || res.username || currentUser.operator,
        username: res.username || currentUser.username || res.operator,
        operatorCode: res.operatorCode || res.username || currentUser.operatorCode || '',
        photoDataUrl: res.photoDataUrl || currentUser.photoDataUrl || '',
        role: res.role || currentUser.role,
        level: Number(res.level || 0),
        permissions: Array.isArray(res.permissions) ? res.permissions : []
      };
      window.atmecCurrentUser412K = currentUser;
      const box = document.getElementById('logged-user-box');
      if (box) box.innerHTML = `<div class="user-mini-413o"><div class="avatar-mini-413o">${currentUser.photoDataUrl ? `<img src="${escapeHtml(currentUser.photoDataUrl)}">` : escapeHtml(String(currentUser.operator||'?').slice(0,1).toUpperCase())}</div><div>✅ <b>${escapeHtml(currentUser.operator)}</b><br><span>${escapeHtml(currentUser.operatorCode || '')} · ${escapeHtml(currentUser.role)} · livello ${Number(currentUser.level||0)}</span></div></div>`;
      refreshSecurityUi412K();
      if (typeof refreshNavigationPermissions412K_FIX1 === 'function') refreshNavigationPermissions412K_FIX1();
      if (typeof refreshOperatorProfile413O === 'function') refreshOperatorProfile413O();
      if (reason) addLog(document.getElementById('sys-log'), `🔄 Permessi aggiornati in tempo reale: ${escapeHtml(reason)}`, 'info');
    }
  } catch(e) { console.warn('syncCurrentUserFromBackend413O', e); }
}
window.syncCurrentUserFromBackend413O = syncCurrentUserFromBackend413O;
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
  document.querySelectorAll('.tab-content').forEach(t => {
    t.classList.remove('active');
    // 6.5A_FIX2: non lasciare display:none inline, altrimenti le pagine standard restano vuote
    if (t.style && (t.style.display === 'none' || t.style.display === 'block' || t.style.display === 'flex')) t.style.display = '';
  });
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const tab = document.getElementById(id);
  if (tab) {
    tab.classList.add('active');
    if (tab.style) tab.style.display = '';
  }
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

function normalizeHardwareRowsForLookup(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.rows)) return raw.rows;
  if (raw && Array.isArray(raw.statuses)) return raw.statuses;
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([k, v]) => Object.assign({ name: k }, (v && typeof v === 'object') ? v : { status: v }));
  }
  return [];
}

function getHardwareStatusByName(name) {
  const wanted = String(name || '').toLowerCase();
  const rows = normalizeHardwareRowsForLookup(latestHardwareStatuses);
  const exact = rows.find(x => x && (x.name === name || x.device === name));
  if (exact) return exact;
  function txt(x){ return String((x && (x.name || x.device || x.label || x.type || x.group || x.driver || x._logical || x._title)) || '').toLowerCase(); }
  if (wanted === 'modbus_serial' || wanted.includes('esp32')) {
    return rows.find(x => { const t = txt(x); return t.includes('modbus_serial') || t.includes('esp32') || t.includes('esp32-s3') || t.includes('esp32 controller'); });
  }
  if (wanted === 'aimtti_pl303' || wanted.includes('pl303') || wanted.includes('alimentatore') || wanted.includes('tti')) {
    return rows.find(x => { const t = txt(x); return t.includes('aimtti_pl303') || t.includes('pl303') || t.includes('tti') || t.includes('alimentatore') || t.includes('power'); });
  }
  if (wanted === 'keysight_34461a' || wanted.includes('keysight') || wanted.includes('34461') || wanted.includes('multimetro')) {
    return rows.find(x => { const t = txt(x); return t.includes('keysight_34461a') || t.includes('keysight') || t.includes('34461') || t.includes('multimet') || t.includes('dmm'); });
  }
  return undefined;
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



// AT-MEC 6.7D: export funzioni condivise per moduli UI legacy.
try {
  if (typeof runPreTestSampleWizard === 'function') window.runPreTestSampleWizard = runPreTestSampleWizard;
  if (typeof getHardwareStatusByName === 'function') window.getHardwareStatusByName = getHardwareStatusByName;
  if (typeof isHardwareLiveStatus === 'function') window.isHardwareLiveStatus = isHardwareLiveStatus;
} catch (_e) {}
try {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateSampleWizardUi);
  else updateSampleWizardUi();
} catch (_e) {}
