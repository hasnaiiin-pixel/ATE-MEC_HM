/* AT-MEC_HM 10.1.14
 * Profili GPIO di ricetta + ciclo automatico veloce da multimetro.
 * - Profilo iniziale: applicato UNA SOLA VOLTA quando la ricetta viene caricata/cambiata.
 * - Profilo tra test: applicato a fine run senza ricaricare la ricetta.
 * - Profilo sicuro: applicato su STOP/cambio ricetta/chiusura.
 * - Auto-start: attende rimozione vecchia scheda, poi nuova misura stabile.
 */
(function(){
  'use strict';
  if (window.__VEXON_RECIPE_GPIO_CYCLE_10114__) return;
  window.__VEXON_RECIPE_GPIO_CYCLE_10114__ = '10.1.14';

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms)||0)));
  const num = value => {
    const n = Number(String(value ?? '').replace(',', '.').replace(/[^0-9+\-.eE]/g, ''));
    return Number.isFinite(n) ? n : null;
  };
  const state = {
    preparedKey: '',
    prepared: false,
    applying: false,
    applySeq: 0,
    lastOutputs: {},
    currentRecipe: null,
    cycleState: 'DISABLED',
    latestValue: null,
    latestValueTs: 0,
    presenceSince: 0,
    absenceSince: 0,
    lastRunCompletedTs: 0,
    lastRunSerial: '',
    pollBusy: false,
    pollTimer: null,
    evalTimer: null,
    startBusy: false,
    statusMessage: ''
  };

  function currentRecipe(){
    try { if (typeof recipe !== 'undefined' && recipe) return recipe; } catch(_e) {}
    return window.recipe || state.currentRecipe || null;
  }
  function keyOf(r){ return r ? `${String(r.recipe_name||'').trim()}@${Number(r.version||0)}` : ''; }
  function log(message, type='info'){
    try {
      const target = $('run-log') || $('sys-log');
      if (typeof window.addLog === 'function' && target) window.addLog(target, message, type);
      else console.log('[VEXON 10.1.14]', String(message).replace(/<[^>]+>/g,''));
    } catch(_e) { console.log('[VEXON 10.1.14]', message); }
  }
  function profileRows(r, field){
    const rows = r && Array.isArray(r[field]) ? r[field] : [];
    return rows.filter(row => row && row.enabled !== false && String(row.channel ?? '').trim() !== '' && Number.isFinite(Number(row.channel)));
  }
  function anyGpioProfiles(r){
    return ['gpio_initial_profile','gpio_inter_test_profile','gpio_safe_profile'].some(k => profileRows(r,k).length > 0);
  }
  function cycleCfg(r){
    const raw = (r && r.automatic_cycle && typeof r.automatic_cycle === 'object') ? r.automatic_cycle : {};
    const firstStable = (r?.steps || []).find(s => s && s.enabled !== false && s.type === 'StableMeasurement') || {};
    const hasNumeric = (v) => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v));
    const finiteOr = (v, fallback) => hasNumeric(v) ? Number(v) : fallback;
    return {
      enabled: raw.enabled === true,
      device: String(raw.trigger_device || firstStable.device_mapping || firstStable.device || 'Keysight_34461A'),
      command: String(raw.trigger_command || firstStable.command || 'MEAS:VOLT:DC?'),
      presenceMin: finiteOr(raw.presence_min, finiteOr(firstStable.min, -Infinity)),
      presenceMax: finiteOr(raw.presence_max, finiteOr(firstStable.max, Infinity)),
      absenceMin: hasNumeric(raw.absence_min) ? Number(raw.absence_min) : null,
      absenceMax: hasNumeric(raw.absence_max) ? Number(raw.absence_max) : null,
      stableMs: Math.max(100, finiteOr(raw.stable_time_ms, 300)),
      removalStableMs: Math.max(100, finiteOr(raw.removal_stable_ms, 250)),
      minimumCycleDelayMs: Math.max(0, finiteOr(raw.minimum_cycle_delay_ms, 500)),
      pollMs: Math.max(250, finiteOr(raw.poll_interval_ms, 400)),
      requireRemoval: raw.require_removal_before_next_start !== false,
      startOnFirstDetection: raw.start_on_first_detection !== false
    };
  }
  function setCycleState(next, message=''){
    state.cycleState = next;
    state.statusMessage = message || '';
    renderStatus();
  }
  function renderStatus(){
    let badge = $('vexon10114-cycle-status');
    const anchor = $('vexon1019-auto-start-wrap') || $('btn-start');
    if (!badge && anchor) {
      badge = document.createElement('span');
      badge.id = 'vexon10114-cycle-status';
      badge.className = 'vexon10114-cycle-status';
      anchor.insertAdjacentElement('afterend', badge);
    }
    if (!badge) return;
    const labels = {
      DISABLED:'AUTO CICLO OFF', PREPARING:'PREPARO GPIO', READY:'BANCO PRONTO',
      WAIT_REMOVAL:'RIMUOVERE SCHEDA', ARMED:'ATTESA NUOVA SCHEDA', STARTING:'AVVIO AUTOMATICO',
      RUNNING:'TEST IN ESECUZIONE', ERROR:'ERRORE PREPARAZIONE'
    };
    badge.textContent = labels[state.cycleState] || state.cycleState;
    badge.dataset.state = state.cycleState;
    badge.title = state.statusMessage || '';
  }

  async function ensureRequiredHardware(r){
    if (!r || (!anyGpioProfiles(r) && !cycleCfg(r).enabled)) return;
    if (typeof window.autoConnectProductionInstruments === 'function') {
      try {
        await Promise.race([
          Promise.resolve(window.autoConnectProductionInstruments(false)),
          new Promise(resolve => setTimeout(resolve, 5000))
        ]);
      } catch(e) { console.warn('[10.1.14] pre-connect recipe hardware', e); }
    }
  }

  async function applyProfile(r, field, reason, options={}){
    const rows = profileRows(r, field);
    if (!rows.length) return {ok:true, applied:0, skipped:0, errors:[]};
    if (!window.api?.setDigitalOutput) return {ok:false, applied:0, skipped:0, errors:['API GPIO non disponibile']};
    const seq = ++state.applySeq;
    state.applying = true;
    let applied = 0, skipped = 0;
    const errors = [];
    try {
      for (const row of rows) {
        if (seq !== state.applySeq) return {ok:false, canceled:true, applied, skipped, errors};
        const channel = Number(row.channel);
        const desired = String(row.state ?? 'LOW').toUpperCase() === 'HIGH';
        const key = String(channel);
        const force = options.force === true || row.force === true;
        if (!force && state.lastOutputs[key] === desired) {
          skipped++;
        } else {
          try {
            const result = await window.api.setDigitalOutput(channel, desired);
            if (result && result.ok === false) throw new Error(result.error || `GPIO${channel} non confermato`);
            state.lastOutputs[key] = desired;
            applied++;
          } catch(e) {
            const text = `GPIO${channel} ${desired?'HIGH':'LOW'}: ${(e&&e.message)||e}`;
            errors.push(text);
            if (row.required !== false) throw new Error(text);
          }
        }
        if (Number(row.delay_ms) > 0) await sleep(Number(row.delay_ms));
      }
      if (rows.length) log(`🔌 ${reason}: profilo ${field.replace('gpio_','').replace('_profile','')} applicato (${applied} comandi, ${skipped} già corretti).`, errors.length?'warn':'info');
      return {ok:errors.length===0, applied, skipped, errors};
    } finally {
      state.applying = false;
      renderStatus();
    }
  }

  async function prepareLoadedRecipe(nextRecipe, reason='CARICAMENTO RICETTA', previousRecipe=null){
    if (!nextRecipe) return {ok:false, error:'Ricetta assente'};
    const nextKey = keyOf(nextRecipe);
    if (state.prepared && state.preparedKey === nextKey) {
      state.currentRecipe = nextRecipe;
      startIdleMonitoring();
      return {ok:true, cached:true};
    }
    setCycleState('PREPARING', reason);
    state.prepared = false;
    state.currentRecipe = nextRecipe;
    state.presenceSince = 0;
    state.absenceSince = 0;
    stopIdleMonitoring();
    try {
      const prev = previousRecipe || currentRecipe();
      if (prev && keyOf(prev) && keyOf(prev) !== nextKey) {
        await applyProfile(prev, 'gpio_safe_profile', 'Cambio ricetta: stato sicuro precedente', {force:true});
      }
      await ensureRequiredHardware(nextRecipe);
      const initial = await applyProfile(nextRecipe, 'gpio_initial_profile', 'Caricamento ricetta', {force:true});
      if (!initial.ok) throw new Error(initial.errors?.join('; ') || 'Profilo iniziale GPIO non applicato');
      state.preparedKey = nextKey;
      state.prepared = true;
      setCycleState('READY', 'Profilo iniziale applicato una sola volta');
      log(`✅ Banco preparato per <b>${String(nextRecipe.recipe_name||'ricetta')}</b>. Il profilo iniziale non verrà ricaricato dopo ogni test.`, 'pass');
      const cfg = cycleCfg(nextRecipe);
      if (cfg.enabled) {
        setOperatorToggle(true);
        setCycleState(cfg.startOnFirstDetection ? 'ARMED' : 'WAIT_REMOVAL', cfg.startOnFirstDetection ? 'Prima scheda: rilevamento diretto abilitato' : 'Attesa condizione a vuoto');
        startIdleMonitoring();
      } else {
        setCycleState('READY', 'Banco pronto; ciclo automatico disabilitato in ricetta');
      }
      return {ok:true};
    } catch(e) {
      state.prepared = false;
      state.preparedKey = '';
      setCycleState('ERROR', (e&&e.message)||String(e));
      log(`❌ Preparazione GPIO ricetta non completata: ${String((e&&e.message)||e)}`, 'fail');
      return {ok:false, error:(e&&e.message)||String(e)};
    }
  }

  async function applyInterTestProfile(r=currentRecipe(), reason='FINE TEST'){
    if (!r) return {ok:true};
    setCycleState('PREPARING', 'Riposo rapido tra test');
    const result = await applyProfile(r, 'gpio_inter_test_profile', reason, {force:false});
    state.lastRunCompletedTs = Date.now();
    state.presenceSince = 0;
    state.absenceSince = 0;
    const cfg = cycleCfg(r);
    if (cfg.enabled && result.ok) {
      setCycleState(cfg.requireRemoval ? 'WAIT_REMOVAL' : 'ARMED', cfg.requireRemoval ? 'Attendo rimozione scheda precedente' : 'Pronto per nuova misura');
      startIdleMonitoring();
    } else if (!cfg.enabled) {
      setCycleState('READY', 'Profilo tra test applicato');
    } else {
      setCycleState('ERROR', result.errors?.join('; ') || 'Profilo tra test non applicato');
    }
    return result;
  }

  async function applySafeProfile(r=currentRecipe(), reason='STOP / SICUREZZA'){
    stopIdleMonitoring();
    state.presenceSince = 0;
    state.absenceSince = 0;
    const result = await applyProfile(r, 'gpio_safe_profile', reason, {force:true});
    state.prepared = false;
    state.preparedKey = '';
    setCycleState(result.ok ? 'DISABLED' : 'ERROR', reason);
    return result;
  }

  function inRange(v, min, max){ return v != null && v >= min && v <= max; }
  function isPresent(v, cfg){ return inRange(v, cfg.presenceMin, cfg.presenceMax); }
  function isAbsent(v, cfg){
    if (v == null) return false;
    if (cfg.absenceMin != null && cfg.absenceMax != null) return inRange(v, cfg.absenceMin, cfg.absenceMax);
    return !isPresent(v, cfg);
  }
  function readSerial(){
    try { if (typeof window.getSerialDutRaw === 'function') return String(window.getSerialDutRaw()||'').trim(); } catch(_e) {}
    for (const id of ['serial-dut','prod-serial-input','serial-dut-dash']) { const el=$(id); if (el?.value) return String(el.value).trim(); }
    return '';
  }
  function serialRequired(){ try { return typeof window.isSerialRequired === 'function' ? !!window.isSerialRequired() : false; } catch(_e) { return false; } }
  function readLot(){ try { return typeof window.getLotNumber === 'function' ? String(window.getLotNumber()||'').trim() : ''; } catch(_e) { return ''; } }

  async function triggerAutomaticStart(){
    if (state.startBusy || state.applying || !state.prepared) return;
    const r = currentRecipe();
    if (!r || keyOf(r) !== state.preparedKey) return;
    if (serialRequired()) {
      const sn = readSerial();
      if (!sn || (state.lastRunSerial && sn === state.lastRunSerial)) {
        setCycleState('ARMED', !sn ? 'Attesa seriale nuova scheda' : 'Scansionare un seriale diverso dalla scheda precedente');
        return;
      }
    }
    if (!readLot()) { setCycleState('ARMED', 'Inserire lotto/commessa'); return; }
    if (typeof window.startTest !== 'function') return;
    state.startBusy = true;
    setCycleState('STARTING', 'Misura nuova scheda stabile');
    window.__vexon10114AutoCycleFastStart = true;
    try {
      await Promise.resolve(window.startTest());
      await sleep(180);
      let runtimeState = '';
      try {
        runtimeState = String((typeof currentRunState !== 'undefined' ? currentRunState : '') || '').toUpperCase();
      } catch(_e) {}
      try {
        const pill = $('test-state-pill') || $('run-state') || $('runtime-state');
        runtimeState += ' ' + String(pill?.textContent || '').toUpperCase();
      } catch(_e) {}
      if (/RUNNING|STARTING|PAUSED|IN ESECUZIONE|AVVIO/.test(runtimeState)) {
        setCycleState('RUNNING', 'Test avviato automaticamente');
      } else {
        setCycleState('ARMED', 'Avvio non accettato: correggere i dati richiesti');
        startIdleMonitoring();
      }
    } catch(e) {
      setCycleState('ARMED', (e&&e.message)||String(e));
      startIdleMonitoring();
      log(`⚠️ Auto-start non completato: ${String((e&&e.message)||e)}`, 'warn');
    } finally {
      setTimeout(() => {
        state.startBusy = false;
        window.__vexon10114AutoCycleFastStart = false;
        if (state.cycleState === 'STARTING') {
          setCycleState('ARMED', 'Banco pronto: attesa nuova scheda');
          startIdleMonitoring();
        }
      }, 400);
    }
  }

  function evaluateLatest(){
    const r = currentRecipe();
    const cfg = cycleCfg(r);
    const operatorEnabled = operatorToggleEnabled();
    if (!r || !cfg.enabled || !operatorEnabled || !state.prepared || state.applying) return;
    if (['RUNNING','STARTING','PREPARING','ERROR'].includes(state.cycleState)) return;
    const v = state.latestValue;
    if (v == null || Date.now() - state.latestValueTs > Math.max(2500, cfg.pollMs*5)) return;
    const now = Date.now();
    if (state.cycleState === 'WAIT_REMOVAL') {
      if (isAbsent(v,cfg)) {
        if (!state.absenceSince) state.absenceSince = now;
        if (now-state.absenceSince >= cfg.removalStableMs) {
          state.absenceSince = 0; state.presenceSince = 0;
          setCycleState('ARMED','Vecchia scheda rimossa: attesa nuova misura');
        }
      } else state.absenceSince = 0;
      return;
    }
    if (state.cycleState !== 'ARMED' && state.cycleState !== 'READY') return;
    if (now-state.lastRunCompletedTs < cfg.minimumCycleDelayMs) return;
    if (isPresent(v,cfg)) {
      if (!state.presenceSince) state.presenceSince = now;
      if (now-state.presenceSince >= cfg.stableMs) {
        state.presenceSince = 0;
        triggerAutomaticStart();
      }
    } else state.presenceSince = 0;
  }

  async function pollOnce(){
    if (state.pollBusy || state.applying || state.cycleState === 'RUNNING' || state.cycleState === 'STARTING') return;
    const r = currentRecipe(); const cfg = cycleCfg(r);
    if (!r || !cfg.enabled || !operatorToggleEnabled() || !state.prepared || !window.api?.queryMultimeter) return;
    state.pollBusy = true;
    try {
      const timeout = new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout lettura trigger')),1800));
      const raw = await Promise.race([window.api.queryMultimeter(cfg.device,cfg.command), timeout]);
      const value = num(raw?.value ?? raw?.measured ?? raw);
      if (value != null) { state.latestValue=value; state.latestValueTs=Date.now(); }
    } catch(_e) {
      // Nessun popup: il ciclo resta armato e riprova al prossimo poll.
    } finally { state.pollBusy=false; }
  }

  function startIdleMonitoring(){
    stopIdleMonitoring();
    const cfg = cycleCfg(currentRecipe());
    if (!cfg.enabled || !operatorToggleEnabled()) return;
    state.pollTimer = setInterval(pollOnce, cfg.pollMs);
    state.evalTimer = setInterval(evaluateLatest, 100);
    pollOnce();
  }
  function stopIdleMonitoring(){
    if (state.pollTimer) clearInterval(state.pollTimer);
    if (state.evalTimer) clearInterval(state.evalTimer);
    state.pollTimer = null; state.evalTimer = null; state.pollBusy=false;
  }
  function operatorToggleEnabled(){ const cb=$('vexon1019-auto-start'); return cb ? !!cb.checked : true; }
  function setOperatorToggle(enabled){
    const cb=$('vexon1019-auto-start');
    if (cb) { cb.checked=!!enabled; localStorage.setItem('vexon1019_auto_start_first_measure', enabled?'1':'0'); }
  }
  function hookToggle(){
    const cb=$('vexon1019-auto-start'); if(!cb || cb.__vx10114) return;
    cb.__vx10114=true;
    const label=cb.parentElement; if(label) label.childNodes.forEach(n=>{if(n.nodeType===3 && /Auto-start/.test(n.nodeValue||'')) n.nodeValue=' Ciclo automatico da multimetro';});
    cb.addEventListener('change',()=>{
      if(cb.checked){
        const cfg=cycleCfg(currentRecipe());
        if(cfg.enabled){ if(state.cycleState==='DISABLED'||state.cycleState==='READY') setCycleState('ARMED','Attesa misura nuova scheda'); startIdleMonitoring(); }
        else setCycleState('READY','Abilitare Ciclo automatico nella ricetta');
      } else { stopIdleMonitoring(); setCycleState(state.prepared?'READY':'DISABLED','Disabilitato da operatore'); }
    });
  }

  function quickHardwareCheck(){
    if (!state.prepared || keyOf(currentRecipe()) !== state.preparedKey) return {ok:false, missing:['profilo ricetta non preparato']};
    return {ok:true, missing:[], prepared:true};
  }

  function install(){
    // Disattiva il vecchio auto-start 10.1.9: questa release usa rimozione/inserimento e profili GPIO.
    try { if(window.__vx1019AutoStartTimer){ clearInterval(window.__vx1019AutoStartTimer); window.__vx1019AutoStartTimer=null; } } catch(_e) {}
    hookToggle(); renderStatus();
    setTimeout(()=>{ try { if(window.__vx1019AutoStartTimer){clearInterval(window.__vx1019AutoStartTimer);window.__vx1019AutoStartTimer=null;} }catch(_e){} hookToggle(); },700);
    if(window.api?.on && !window.__vx10114ApiHooks){
      window.__vx10114ApiHooks=true;
      window.api.on('keysight-live', data=>{
        const value=num(data?.value ?? data?.measured ?? data);
        if(value!=null){state.latestValue=value;state.latestValueTs=Date.now();evaluateLatest();}
      });
      window.api.on('state-changed', s=>{
        const v=String(s||'').toUpperCase();
        if(v==='RUNNING'){stopIdleMonitoring();setCycleState('RUNNING','Test in esecuzione');}
      });
      window.api.on('run-completed', data=>{
        state.lastRunSerial=String(data?.report?.serial_dut || data?.serial_dut || readSerial() || '').trim();
        applyInterTestProfile(currentRecipe(), data?.success ? 'FINE TEST PASS' : 'FINE TEST FAIL').catch(e=>console.warn('[10.1.14] inter-test',e));
      });
    }
    window.addEventListener('beforeunload',()=>{ try{ applySafeProfile(currentRecipe(),'CHIUSURA APPLICAZIONE'); }catch(_e){} });
  }

  window.vexon10114PrepareLoadedRecipe = prepareLoadedRecipe;
  window.vexon10114ApplyInterTestProfile = applyInterTestProfile;
  window.vexon10114ApplySafeProfile = applySafeProfile;
  window.vexon10114IsRecipePrepared = r => state.prepared && keyOf(r||currentRecipe())===state.preparedKey;
  window.vexon10114QuickHardwareCheck = quickHardwareCheck;
  window.vexon10114GetCycleState = () => ({...state, currentRecipe:undefined});

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install); else install();
})();
