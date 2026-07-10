"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeEngine = void 0;
const DiagnosticEngine_1 = require("../core/DiagnosticEngine");
const FlashManager_1 = require("../hal/FlashManager");
class RecipeEngine {
    stateMachine;
    eventBus;
    hal;
    debugMode = false;
    debugResolver = null;
    loopCounters = {};
    running = false;
    manualSeq = 0;
    manualResolvers = {};
    pendingManualResponses = {};
    failResolver = null;
    stopRequestedByOperator = false;
    measurementRetrySeq = 0;
    activeStableMeasurementStepId = null;
    constructor(stateMachine, eventBus, hal) {
        this.stateMachine = stateMachine;
        this.eventBus = eventBus;
        this.hal = hal;
    }
    setDebugMode(enabled) { this.debugMode = enabled; }
    nextStep() {
        if (this.debugResolver) {
            this.debugResolver();
            this.debugResolver = null;
        }
    }
    requestStop() {
        this.stopRequestedByOperator = true;
        const st = this.stateMachine.getState();
        if (st === 'RUNNING' || st === 'PAUSED') {
            this.stateMachine.transitionTo('FAULT');
            if (this.debugResolver) {
                this.debugResolver();
                this.debugResolver = null;
            }
            if (this.failResolver) {
                this.failResolver('stop');
                this.failResolver = null;
            }
            Object.keys(this.manualResolvers).forEach(k => { this.manualResolvers[Number(k)]({ ok: false, action: 'cancel' }); delete this.manualResolvers[Number(k)]; });
        }
    }
    resolveManualStep(requestId, response) {
        const resolver = this.manualResolvers[requestId];
        if (resolver) {
            resolver(response || {});
            delete this.manualResolvers[requestId];
            return;
        }
        // 10.1.11: se la UI risponde molto velocemente, conserva la risposta fino a quando
        // il resolver dello step manuale viene registrato. Evita il problema del primo click perso.
        if (requestId)
            this.pendingManualResponses[requestId] = response || {};
    }
    resolveFailureAction(action) {
        if (this.failResolver) {
            this.failResolver(action === 'continue' ? 'continue' : 'stop');
            this.failResolver = null;
        }
    }
    requestPause() {
        if (this.stateMachine.getState() === 'RUNNING') {
            this.stateMachine.transitionTo('PAUSED');
        }
    }
    requestResume() {
        if (this.stateMachine.getState() === 'PAUSED') {
            this.stateMachine.transitionTo('RUNNING');
            if (this.debugResolver) {
                this.debugResolver();
                this.debugResolver = null;
            }
        }
    }
    isRunning() { return this.running; }
    requestCurrentMeasurementRetry() {
        if (!this.running || this.activeStableMeasurementStepId === null) {
            return { ok: false, error: 'Nessuna misura stabilizzata attiva da riprovare.' };
        }
        this.measurementRetrySeq++;
        this.eventBus.emit('step_detail', {
            step_id: this.activeStableMeasurementStepId,
            level: 'info',
            message: 'RIPROVA MISURA richiesto da operatore: timer stabilità e timeout misura riavviati.',
            status: 'RIPROVA MISURA',
            retry_requested: true,
            stable_elapsed_ms: 0,
            timeout_elapsed_ms: 0
        });
        return { ok: true, step_id: this.activeStableMeasurementStepId };
    }
    forceResetAfterStop() {
        // Reset duro e controllato usato dal tasto STOP TEST per evitare stato 'test in esecuzione' bloccato
        // dopo FAIL, manual step, debug o promesse hardware pendenti.
        this.stopRequestedByOperator = true;
        this.running = false;
        this.debugResolver = null;
        if (this.failResolver) {
            this.failResolver('stop');
            this.failResolver = null;
        }
        Object.keys(this.manualResolvers).forEach(k => { this.manualResolvers[Number(k)]({ ok: false, action: 'cancel' }); delete this.manualResolvers[Number(k)]; });
    }
    async run(recipe, serialDut, operatorName, context = {}) {
        if (this.stateMachine.getState() === 'FAULT') {
            this.stateMachine.transitionTo('RECOVERY');
            this.stateMachine.transitionTo('IDLE');
            this.stateMachine.transitionTo('READY');
        }
        if (this.stateMachine.getState() !== 'READY')
            return false;
        this.stopRequestedByOperator = false;
        this.running = true;
        this.measurementRetrySeq = 0;
        this.activeStableMeasurementStepId = null;
        this.loopCounters = {};
        this.stateMachine.transitionTo('RUNNING');
        this.eventBus.emit('recipe_loaded', { name: recipe.recipe_name, version: recipe.version });
        const startTime = Date.now();
        const reportSteps = [];
        if (recipe.enabled === false) {
            this.running = false;
            this.eventBus.emit('system_fault', {
                reason: 'RICETTA DISABILITATA',
                diagnosis: { probable_cause: 'Flag ricetta non attivo.', recommended_check: 'Abilita la ricetta prima di avviare.' }
            });
            this.stateMachine.transitionTo('READY');
            return false;
        }
        recipe = { ...recipe, steps: (recipe.steps || []).filter(s => s.enabled !== false) };
        const source = this.resolvePowerSource(recipe);
        try {
            if (source === 'PL303_PROGRAMMABLE') {
                await this.withTimeout(this.hal.writeSCPI('AimTTi_PL303', 'V1 5.0'), 1500, 'PL303 V set');
                await this.withTimeout(this.hal.writeSCPI('AimTTi_PL303', 'I1 0.5'), 1500, 'PL303 I set');
                await this.withTimeout(this.hal.writeSCPI('AimTTi_PL303', 'OP1 1'), 1500, 'PL303 ON');
            }
            else if (source === 'ESP32_RELAY_POWER') {
                await this.withTimeout(this.hal.setDigitalOutput(0, true), 1000, 'ESP32 power ON');
            }
            else if (source === 'MANUAL_POWER') {
                this.eventBus.emit('step_detail', {
                    step_id: 0,
                    level: 'info',
                    message: "Alimentazione manuale selezionata: il test parte senza blocco su PL303. Verificare manualmente tensione/corrente prima dell\'avvio fisico."
                });
            }
            let idx = 0;
            let recipeSuccess = true;
            while (idx < recipe.steps.length) {
                const currentState = this.stateMachine.getState();
                if (currentState === 'FAULT') {
                    recipeSuccess = false;
                    break;
                }
                if (currentState === 'PAUSED') {
                    await new Promise(res => { this.debugResolver = res; });
                    continue;
                }
                const step = recipe.steps[idx];
                if (this.debugMode) {
                    this.eventBus.emit('step_started', { step_id: step.step_id, type: step.type, label: step.label, description: step.description, waitingDebug: true, timeout: step.timeout, stable_time_ms: step.stable_time_ms, sample_interval_ms: step.sample_interval_ms, min: step.min, max: step.max, target: step.target, tolerance: step.tolerance, unit: step.unit, device: this.normalizeMeasurementDeviceName(step.device_mapping || step.device), device_display: this.measurementDeviceDisplayName(step.device_mapping || step.device) });
                    this.eventBus.emit('step_detail', { step_id: step.step_id, level: 'info', message: this.describeStep(step) });
                    await new Promise(res => { this.debugResolver = res; });
                }
                else {
                    this.eventBus.emit('step_started', { step_id: step.step_id, type: step.type, label: step.label, description: step.description, waitingDebug: false, timeout: step.timeout, stable_time_ms: step.stable_time_ms, sample_interval_ms: step.sample_interval_ms, min: step.min, max: step.max, target: step.target, tolerance: step.tolerance, unit: step.unit, device: this.normalizeMeasurementDeviceName(step.device_mapping || step.device), device_display: this.measurementDeviceDisplayName(step.device_mapping || step.device) });
                    this.eventBus.emit('step_detail', { step_id: step.step_id, level: 'info', message: this.describeStep(step) });
                }
                if (step.type === 'LoopStart') {
                    if (this.loopCounters[step.step_id] === undefined) {
                        this.loopCounters[step.step_id] = Number(step.value) || 1;
                    }
                    idx++;
                    continue;
                }
                if (step.type === 'LoopEnd') {
                    const startId = Number(step.target_step);
                    if (this.loopCounters[startId] > 1) {
                        this.loopCounters[startId]--;
                        idx = recipe.steps.findIndex(s => s.step_id === startId) + 1;
                    }
                    else {
                        delete this.loopCounters[startId];
                        idx++;
                    }
                    continue;
                }
                const stepResult = await this.executeStep(step);
                reportSteps.push({
                    step_id: step.step_id,
                    type: step.type,
                    label: step.label || step.description || '',
                    component: step.component || step.component_name || step.refdes || '',
                    test_point: step.test_point || step.testPoint || step.tp || '',
                    device: this.normalizeMeasurementDeviceName(step.device_mapping || step.device), device_display: this.measurementDeviceDisplayName(step.device_mapping || step.device) || step.io_type || stepResult.measurement_device || '',
                    channel: step.channel,
                    measured: stepResult.measured,
                    measurement_source: stepResult.measurement_source,
                    measurement_device: stepResult.measurement_device,
                    target: stepResult.target,
                    tolerance: stepResult.tolerance,
                    min: stepResult.min,
                    max: stepResult.max,
                    unit: stepResult.unit,
                    timestamp: stepResult.timestamp,
                    result: !stepResult.success
                        ? 'FAIL'
                        : (step.type === 'Delay' || step.type === 'DigitalOutputSet' || step.type === 'SCPICommand' || step.type === 'PowerSupplySet')
                            ? 'DONE'
                            : 'PASS'
                });
                if (!stepResult.success) {
                    const diagnosis = DiagnosticEngine_1.DiagnosticEngine.analyzeFailure(step, stepResult.measured);
                    this.eventBus.emit('step_detail', { step_id: step.step_id, level: 'fail', message: stepResult.error || stepResult.details || 'Step fallito: dettagli non disponibili.' });
                    this.eventBus.emit('step_failed', { step_id: step.step_id, type: step.type, measured: stepResult.measured, diagnosis });
                    if (step.type === 'GotoIfFail' && step.target_step !== undefined) {
                        const targetIdx = recipe.steps.findIndex(s => s.step_id === step.target_step);
                        if (targetIdx !== -1) {
                            idx = targetIdx;
                            continue;
                        }
                    }
                    recipeSuccess = false;
                    let action = step.stop_on_fail === false ? 'continue' : 'stop';
                    if (step.stop_on_fail === false) {
                        this.eventBus.emit('step_detail', { step_id: step.step_id, level: 'warn', message: 'FAIL registrato: step configurato per proseguire senza bloccare il test.' });
                    }
                    else {
                        action = await this.waitFailureDecision(step, stepResult);
                    }
                    if (action === 'continue') {
                        if (this.stateMachine.getState() === 'PAUSED')
                            this.stateMachine.transitionTo('RUNNING');
                        this.eventBus.emit('step_detail', { step_id: step.step_id, level: 'warn', message: 'Operatore ha scelto CONTINUA dopo FAIL. Test prosegue, risultato finale resterà FAIL.' });
                        idx++;
                        continue;
                    }
                    // AT-MEC 2.23: scelta FERMA o timeout del popup FAIL chiudono la run in modo pulito.
                    // Non deve restare RUNNING: il report FAIL viene emesso e il finally riporta READY.
                    recipeSuccess = false;
                    break;
                }
                else {
                    this.eventBus.emit('step_passed', { step_id: step.step_id, type: step.type, measured: stepResult.measured, details: this.shortStepOk(step, stepResult) });
                }
                idx++;
            }
            try {
                if (source === 'PL303_PROGRAMMABLE') {
                    await this.withTimeout(this.hal.safePl303AllOutputsOff('FINE_TEST'), 2500, 'PL303 CH1/CH2 OFF');
                }
                else if (source === 'ESP32_RELAY_POWER') {
                    await this.withTimeout(this.hal.setDigitalOutput(0, false), 1200, 'ESP32 power OFF');
                }
            }
            catch (err) {
                this.eventBus.emit('step_detail', { step_id: 0, level: 'fail', message: `Spegnimento alimentazione non confermato: ${err instanceof Error ? err.message : String(err)}` });
            }
            const executionTime = Date.now() - startTime;
            const report = {
                timestamp: new Date().toISOString(),
                operator: operatorName,
                recipe_name: recipe.recipe_name,
                recipe_version: recipe.version,
                serial_dut: serialDut,
                lot_number: context.lotNumber || context.workOrder || '',
                work_order: context.workOrder || context.lotNumber || '',
                repair_note: context.repairNote || '',
                final_result: recipeSuccess ? 'PASS' : (this.stopRequestedByOperator ? 'STOP_OPERATORE' : 'FAIL'),
                execution_time_ms: executionTime,
                steps_log: reportSteps
            };
            this.eventBus.emit('run_completed', { success: recipeSuccess, report });
            // AT-MEC 2.23: sia PASS sia FAIL devono terminare lo stato RUNNING.
            // Il FAIL resta visibile nel pannello diagnostico, ma il motore torna avviabile.
            if (this.stateMachine.getState() === 'PAUSED')
                this.stateMachine.transitionTo('RUNNING');
            if (this.stateMachine.getState() === 'RUNNING')
                this.stateMachine.transitionTo('READY');
            if (!recipeSuccess) {
                this.eventBus.emit('system_fault', {
                    reason: 'TEST FALLITO',
                    diagnosis: DiagnosticEngine_1.DiagnosticEngine.analyzeFailure(reportSteps.length > 0
                        ? recipe.steps.find(s => s.step_id === reportSteps[reportSteps.length - 1].step_id) || recipe.steps[0]
                        : recipe.steps[0], reportSteps.length > 0 ? reportSteps[reportSteps.length - 1].measured : null)
                });
            }
            return recipeSuccess;
        }
        catch (err) {
            console.error('[RECIPE] Errore run:', err);
            this.stateMachine.transitionTo('FAULT');
            try {
                await this.withTimeout(this.hal.safePl303AllOutputsOff('ERRORE_ESECUZIONE'), 2500, 'PL303 safety OFF errore');
                this.eventBus.emit('step_detail', { step_id: 0, level: 'warn', message: 'Sicurezza: alimentatore PL303 CH1/CH2 disattivato per errore esecuzione.' });
            }
            catch { }
            this.eventBus.emit('run_completed', { success: false, report: null });
            this.eventBus.emit('system_fault', {
                reason: 'ERRORE ESECUZIONE RICETTA',
                diagnosis: {
                    probable_cause: err instanceof Error ? err.message : String(err),
                    recommended_check: 'Controlla connessione hardware, timeout step e stato live strumenti.'
                }
            });
            return false;
        }
        finally {
            try {
                await this.withTimeout(this.hal.safePl303AllOutputsOff('FINALLY_SAFE_OFF'), 2500, 'PL303 finally OFF');
            }
            catch { }
            this.running = false;
            this.debugResolver = null;
            if (this.stateMachine.getState() === 'FAULT') {
                // Non lasciare l'app bloccata dopo un errore di step/comunicazione: il pannello mostra il fault, ma il sistema torna avviabile.
                this.stateMachine.transitionTo('RECOVERY');
                this.stateMachine.transitionTo('IDLE');
                this.stateMachine.transitionTo('READY');
            }
        }
    }
    async sleepInterruptible(ms) {
        const end = Date.now() + Math.max(0, ms || 0);
        while (Date.now() < end) {
            if (this.stateMachine.getState() === 'FAULT')
                throw new Error('Esecuzione interrotta');
            while (this.stateMachine.getState() === 'PAUSED') {
                await new Promise(res => { this.debugResolver = res; });
            }
            await new Promise(res => setTimeout(res, Math.min(50, Math.max(1, end - Date.now()))));
        }
    }
    async withTimeout(task, ms, label) {
        const timeoutMs = Math.max(250, ms || 2000);
        let timer;
        return Promise.race([
            task,
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timeout ${timeoutMs}ms`)), timeoutMs); })
        ]).finally(() => { if (timer)
            clearTimeout(timer); });
    }
    async waitFailureDecision(step, result) {
        // Durante la scelta operatore non lasciare lo stato come RUNNING: la UI deve capire che il test è fermo su FAIL.
        if (this.stateMachine.getState() === 'RUNNING')
            this.stateMachine.transitionTo('PAUSED');
        this.eventBus.emit('failure_decision_required', {
            step_id: step.step_id,
            type: step.type,
            label: step.label || step.type,
            error: result.error || result.details || 'Step fallito',
            measured: result.measured
        });
        return new Promise(resolve => {
            const timer = setTimeout(() => {
                if (this.failResolver)
                    this.failResolver = null;
                resolve('stop');
            }, 250);
            // 3.34: timeout breve per evitare percentuale bloccata in caso di FAIL senza risposta UI.
            this.failResolver = (action) => {
                clearTimeout(timer);
                resolve(action);
            };
        });
    }
    async requestManualStep(step) {
        const requestId = ++this.manualSeq;
        const payload = {
            requestId,
            step_id: step.step_id,
            type: step.type,
            label: step.label || 'Step manuale',
            description: step.description || '',
            instruction_image: step.instruction_image || '',
            manual_measure_type: step.manual_measure_type || step.io_type || 'CONFIRM',
            channel: step.channel,
            unit: step.unit || '',
            min: step.min,
            max: step.max,
            stable_time_ms: Number(step.stable_time_ms ?? step.timeout ?? 1000),
            manual_fallback: step.manual_fallback || false,
            fallback_reason: step.fallback_reason || ''
        };
        return new Promise(resolve => {
            const timer = setTimeout(() => {
                delete this.manualResolvers[requestId];
                delete this.pendingManualResponses[requestId];
                resolve({ ok: false, action: 'timeout' });
            }, Math.max(60000, Number(step.timeout || 1000) + 600000));
            this.manualResolvers[requestId] = (response) => {
                clearTimeout(timer);
                delete this.pendingManualResponses[requestId];
                resolve(response || {});
            };
            const early = this.pendingManualResponses[requestId];
            if (early !== undefined) {
                this.manualResolvers[requestId](early);
                delete this.manualResolvers[requestId];
                return;
            }
            this.eventBus.emit('manual_step_request', payload);
        });
    }
    shortStepOk(step, result) {
        const n = step.channel ?? '';
        if (step.type === 'DigitalOutputSet')
            return `Uscita ${n} OK`;
        if (step.type === 'DigitalInputCheck')
            return `Ingresso ${n} OK`;
        if (step.type === 'AnalogInputMeasurement')
            return `Misura DMM OK${result.measured !== undefined ? `: ${result.measured}` : ''}`;
        if (step.type === 'PowerSupplySet')
            return `Alimentatore CH${step.ps_channel || step.channel || 1} OK`;
        if (step.type === 'PowerSupplyMeasureCurrent')
            return `Consumo CH${step.ps_channel || step.channel || 1} OK`;
        if (step.type === 'StableMeasurement')
            return `Misura stabilizzata OK${result.measured !== undefined ? `: ${result.measured}` : ''}`;
        if (step.type === 'ManualMeasurement')
            return `Manuale OK${result.measured !== undefined ? `: ${typeof result.measured === 'object' ? JSON.stringify(result.measured) : result.measured}` : ''}`;
        if (step.type === 'Delay')
            return `Attesa OK`;
        return `${step.label || step.type} OK`;
    }
    resolvePowerSource(recipe) {
        // 10.1.4: PL303 non deve accendersi/essere interrogato solo perché una vecchia ricetta o WO
        // porta power_metadata=PL303_PROGRAMMABLE. Lo usiamo solo se c'è uno step reale PL303.
        const explicit = String(recipe.power_metadata || '').trim();
        const hasPowerSupplyStep = (recipe.steps || []).some(s => {
            if (!s || s.enabled === false)
                return false;
            const type = String(s.type || '');
            const dev = this.normalizeMeasurementDeviceName(s.device_mapping || s.device);
            return ['PowerSupplySet', 'PowerSupplyMeasureCurrent'].includes(type) || dev === 'AimTTi_PL303';
        });
        if (explicit === 'PL303_PROGRAMMABLE')
            return hasPowerSupplyStep ? 'PL303_PROGRAMMABLE' : 'MANUAL_POWER';
        if (explicit === 'ESP32_RELAY_POWER')
            return explicit;
        if (explicit && explicit !== 'MANUAL_POWER')
            return explicit;
        return hasPowerSupplyStep ? 'PL303_PROGRAMMABLE' : 'MANUAL_POWER';
    }
    normalizeMeasurementDeviceName(name) {
        const raw = String(name || '').trim();
        const n = raw.toLowerCase();
        if (!raw || ['auto', 'default', 'dmm', 'multimeter', 'multimetro', 'keysight', 'keysight_34461a', 'keysight_34465a', '34461a', '34465a'].includes(n) || n.includes('keysight') || n.includes('34461') || n.includes('34465') || n.includes('multimet')) {
            return 'Keysight_34461A';
        }
        if (n.includes('aimtti_pl303') || n.includes('pl303') || n.includes('tti') || n.includes('aliment'))
            return 'AimTTi_PL303';
        if (n.includes('modbus_serial') || n.includes('esp32'))
            return 'modbus_serial';
        return raw;
    }
    measurementDeviceDisplayName(name) {
        const normalized = this.normalizeMeasurementDeviceName(name);
        if (normalized === 'Keysight_34461A')
            return 'Keysight 34461A';
        if (normalized === 'AimTTi_PL303')
            return 'Alimentatore PL303QMD-P';
        if (normalized === 'modbus_serial')
            return 'Controller I/O';
        return normalized || 'Strumento';
    }
    measurementBounds(step) {
        let min = step.min ?? -Infinity;
        let max = step.max ?? Infinity;
        const target = Number(step.target);
        const tolerance = Number(step.tolerance);
        if (Number.isFinite(target) && Number.isFinite(tolerance) && tolerance >= 0) {
            min = target - tolerance;
            max = target + tolerance;
        }
        return { min, max };
    }
    buildMeasurementResult(step, value, source, detailsPrefix) {
        const numeric = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'));
        const measured = Number.isNaN(numeric) ? value : numeric;
        const { min, max } = this.measurementBounds(step);
        const ok = typeof measured === 'number' && measured >= min && measured <= max;
        const unit = step.unit || '';
        const targetTxt = step.target !== undefined ? ` target ${step.target}${unit ? ' ' + unit : ''};` : '';
        const tolTxt = step.tolerance !== undefined ? ` tolleranza ±${step.tolerance}${unit ? ' ' + unit : ''};` : '';
        return {
            success: ok,
            measured,
            measurement_source: source,
            measurement_device: source === 'AUTOMATICA' ? this.normalizeMeasurementDeviceName(step.device_mapping || step.device) : 'operatore/manuale',
            target: step.target,
            tolerance: step.tolerance,
            min,
            max,
            unit,
            timestamp: new Date().toISOString(),
            details: `${detailsPrefix}: ${measured} ${unit}; origine ${source};${targetTxt}${tolTxt} limite ${min === -Infinity ? '-∞' : min} ÷ ${max === Infinity ? '+∞' : max}${ok ? '' : ' — fuori tolleranza'}`.trim()
        };
    }
    async requestManualMeasurementValue(step, reason = '') {
        const manualOperator = await this.requestManualStep({
            ...step,
            type: 'ManualMeasurement',
            manual_input_enabled: true,
            manual_fallback: true,
            fallback_reason: reason,
            manual_measure_type: 'MANUAL_VALUE'
        });
        if (!manualOperator || manualOperator.ok === false || manualOperator.action === 'cancel') {
            throw new Error(reason ? `Inserimento manuale annullato: ${reason}` : 'Inserimento manuale annullato');
        }
        const numeric = parseFloat(String(manualOperator.manual_value ?? '').replace(',', '.'));
        return Number.isNaN(numeric) ? manualOperator.manual_value : numeric;
    }
    async acquireManualFallbackMeasurement(step, error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (step.measurement_mode === 'automatic' || step.manual_fallback_enabled === false) {
            throw new Error(`Lettura multimetro fallita e fallback manuale non accettato: ${msg}`);
        }
        this.eventBus.emit('step_detail', { step_id: step.step_id, level: 'warn', message: `Lettura multimetro fallita: ${msg}. Fallback manuale abilitato.` });
        return this.requestManualMeasurementValue(step, msg);
    }
    stableMeasurementCommand(step) {
        if (step.command)
            return String(step.command).trim();
        const u = String(step.unit || '').toLowerCase();
        if (u.includes('ohm') || u.includes('ω'))
            return 'MEAS:RES?';
        if (u.includes('a') && !u.includes('hz'))
            return 'MEAS:CURR:DC?';
        if (u.includes('hz'))
            return 'MEAS:FREQ?';
        return 'MEAS:VOLT:DC?';
    }
    stableMeasurementKind(step) {
        const txt = `${step.command || ''} ${step.unit || ''} ${step.label || ''}`.toLowerCase();
        if (txt.includes('res') || txt.includes('ohm') || txt.includes('ω'))
            return 'RES';
        if (txt.includes('curr') || txt.includes('ampere') || /\ba\b/.test(txt))
            return 'CURR_DC';
        if (txt.includes('freq') || txt.includes('hz'))
            return 'FREQ';
        return 'VOLT_DC';
    }
    stableMeasurementPrepareCommands(step) {
        // 10.1.4: prepara Keysight una sola volta. Durante il polling non mandiamo più MEAS:*?
        // ripetuti perché riconfigurano continuamente il DMM e possono causare OVERLOAD/Remote Command Error.
        const kind = this.stableMeasurementKind(step);
        if (kind === 'RES')
            return ['*CLS', 'CONF:RES', 'SENS:RES:RANG:AUTO ON', 'SENS:RES:NPLC 0.02', 'TRIG:SOUR IMM', 'SAMP:COUN 1', '*CLS'];
        if (kind === 'CURR_DC')
            return ['*CLS', 'CONF:CURR:DC', 'SENS:CURR:DC:RANG:AUTO ON', 'SENS:CURR:DC:NPLC 0.02', 'TRIG:SOUR IMM', 'SAMP:COUN 1', '*CLS'];
        if (kind === 'FREQ')
            return ['*CLS', 'CONF:FREQ', 'TRIG:SOUR IMM', 'SAMP:COUN 1', '*CLS'];
        return ['*CLS', 'CONF:VOLT:DC', 'SENS:VOLT:DC:RANG:AUTO ON', 'SENS:VOLT:DC:NPLC 0.02', 'TRIG:SOUR IMM', 'SAMP:COUN 1', '*CLS'];
    }
    isDefaultStableMeasurementCommand(step) {
        const cmd = this.stableMeasurementCommand(step).toUpperCase().replace(/\s+/g, '');
        return ['MEAS:RES?', 'MEAS:VOLT:DC?', 'MEAS:CURR:DC?', 'MEAS:FREQ?'].includes(cmd);
    }
    async prepareStableMeasurementDevice(step, device) {
        if (device !== 'Keysight_34461A')
            return { prepared: false, readCommand: this.stableMeasurementCommand(step) };
        // Per comandi custom lasciamo il comportamento ricetta, ma puliamo comunque la coda errori.
        if (!this.isDefaultStableMeasurementCommand(step)) {
            try {
                await this.withTimeout(this.hal.writeSCPI(device, '*CLS'), 1200, 'Keysight *CLS');
            }
            catch { }
            return { prepared: false, readCommand: this.stableMeasurementCommand(step) };
        }
        try {
            for (const cmd of this.stableMeasurementPrepareCommands(step)) {
                try {
                    await this.withTimeout(this.hal.writeSCPI(device, cmd), 1800, `Keysight prepare ${cmd}`);
                    await new Promise(res => setTimeout(res, 45));
                }
                catch (cmdErr) {
                    // Alcune opzioni possono non essere supportate su tutte le modalità. Non blocchiamo:
                    // si prosegue con READ? se la configurazione principale è stata accettata, altrimenti fallback.
                    const msg = cmdErr instanceof Error ? cmdErr.message : String(cmdErr);
                    if (/CONF:/i.test(cmd))
                        throw new Error(msg);
                }
            }
            return { prepared: true, readCommand: 'READ?' };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            try {
                await this.withTimeout(this.hal.writeSCPI(device, '*CLS'), 1200, 'Keysight clear after prepare error');
            }
            catch { }
            return { prepared: false, readCommand: this.stableMeasurementCommand(step), error: msg };
        }
    }
    parseStableMeasurementRaw(raw) {
        const text = String(raw ?? '').trim();
        const upper = text.toUpperCase();
        if (!text)
            return { value: null, display: 'N/D', invalid: true, overload: false, error: 'risposta vuota' };
        if (/OVLD|OVERLOAD|OLOAD|INF|NAN|TIMEOUT|ERROR/.test(upper)) {
            return { value: text, display: /OVLD|OVERLOAD|OLOAD/.test(upper) ? 'OVERLOAD' : text, invalid: true, overload: /OVLD|OVERLOAD|OLOAD/.test(upper), error: text };
        }
        const val = parseFloat(text.replace(',', '.'));
        if (!Number.isFinite(val))
            return { value: text, display: text, invalid: true, overload: false, error: 'valore non numerico' };
        // I DMM Keysight usano spesso 9.9E37/9.91E37 per overload/open input.
        if (Math.abs(val) > 1e30)
            return { value: val, display: 'OVERLOAD', invalid: true, overload: true, error: text };
        return { value: val, display: String(val), invalid: false, overload: false };
    }
    async readStableMeasurementValue(step, readTimeoutMs, readCommand) {
        const raw = await this.withTimeout(this.hal.querySCPI(this.normalizeMeasurementDeviceName(step.device_mapping || step.device), readCommand || this.stableMeasurementCommand(step)), readTimeoutMs, 'stable measurement read');
        const parsed = this.parseStableMeasurementRaw(raw);
        return { ...parsed, raw };
    }
    async executeStableMeasurement(step) {
        const timeoutMs = Math.max(1000, Number(step.timeout) || 10000);
        const stableMs = Math.max(0, Number(step.stable_time_ms) || 1000);
        const requestedSampleMs = Math.max(50, Number(step.sample_interval_ms) || 100);
        const measurementDevice = this.normalizeMeasurementDeviceName(step.device_mapping || step.device);
        const measurementDeviceDisplay = this.measurementDeviceDisplayName(measurementDevice);
        // 10.1.8: flusso automatico veloce con popup operatore pulito. La misura assistita dall'operatore resta AUTOMATICA
        // quando esiste uno strumento reale (Keysight/DMM), anche se vecchie ricette hanno measurement_mode='manual'.
        const instrumentLiveMode = measurementDevice === 'Keysight_34461A' || /keysight|3446|dmm|multimet|scpi/i.test(`${step.device_mapping || ''} ${step.device || ''} ${step.manual_measure_type || ''}`);
        const sampleMs = measurementDevice === 'Keysight_34461A' ? Math.max(100, requestedSampleMs) : requestedSampleMs;
        const readTimeoutMs = measurementDevice === 'Keysight_34461A' ? Math.max(450, Math.min(900, sampleMs * 6)) : Math.max(500, Math.min(2500, sampleMs * 4));
        let startedAt = Date.now();
        let stableStart = 0;
        let lastValue = null;
        let lastError = '';
        let lastEmit = 0;
        let lastStatus = '';
        let seenRetrySeq = this.measurementRetrySeq;
        this.activeStableMeasurementStepId = step.step_id;
        const { min, max } = this.measurementBounds(step);
        let preparedRead = { prepared: false, readCommand: this.stableMeasurementCommand(step) };
        const emitLive = (payload = {}) => {
            this.eventBus.emit('step_detail', {
                step_id: step.step_id,
                type: step.type,
                label: step.label || step.description || '',
                description: step.description || step.label || '',
                step_label: step.label || step.description || '',
                level: payload.level || 'info',
                message: payload.message || 'Misura stabilizzata live',
                value: payload.value ?? lastValue,
                measured: payload.measured ?? payload.value ?? lastValue,
                raw: payload.raw,
                min,
                max,
                unit: step.unit || '',
                device: measurementDevice,
                device_display: measurementDeviceDisplay,
                instrument: measurementDeviceDisplay,
                tolerance: step.tolerance,
                status: payload.status || 'LETTURA LIVE',
                stable_elapsed_ms: payload.stable_elapsed_ms ?? 0,
                stable_required_ms: stableMs,
                timeout_elapsed_ms: Date.now() - startedAt,
                timeout_ms: timeoutMs,
                sample_interval_ms: sampleMs,
                requested_sample_interval_ms: requestedSampleMs,
                target: step.target,
                timestamp: new Date().toISOString(),
                live_popup: true,
                auto_advance: true
            });
        };
        if (step.measurement_mode === 'manual' && !instrumentLiveMode) {
            const manualVal = await this.requestManualMeasurementValue(step, 'Misura stabilizzata configurata come manuale');
            const res = this.buildMeasurementResult(step, manualVal, 'MANUALE', 'Misura stabilizzata manuale');
            if (res.success && stableMs > 0)
                await this.sleepInterruptible(stableMs);
            this.activeStableMeasurementStepId = null;
            return { ...res, details: `${res.details}; stabilizzazione manuale ${stableMs} ms` };
        }
        preparedRead = await this.prepareStableMeasurementDevice(step, measurementDevice);
        if (preparedRead.error) {
            emitLive({
                level: 'warn',
                status: 'PREPARAZIONE STRUMENTO WARNING',
                message: `Preparazione sicura ${measurementDeviceDisplay} non completa (${preparedRead.error}). Uso comando ricetta con polling protetto.`
            });
        }
        else {
            emitLive({ status: 'LETTURA LIVE', message: `Misura live ${measurementDeviceDisplay} avviata; polling ${sampleMs} ms.` });
        }
        while ((Date.now() - startedAt) <= timeoutMs) {
            if (this.stateMachine.getState() === 'FAULT')
                throw new Error('Esecuzione interrotta');
            while (this.stateMachine.getState() === 'PAUSED') {
                await new Promise(res => { this.debugResolver = res; });
            }
            if (seenRetrySeq !== this.measurementRetrySeq) {
                seenRetrySeq = this.measurementRetrySeq;
                startedAt = Date.now();
                stableStart = 0;
                lastError = '';
                lastStatus = 'RIPROVA MISURA';
                preparedRead = await this.prepareStableMeasurementDevice(step, measurementDevice);
                emitLive({
                    level: 'info',
                    status: 'RIPROVA MISURA',
                    message: 'Riprova misura: lettura live continua, timer stabilità e timeout riavviati.',
                    stable_elapsed_ms: 0,
                    retry_requested: true
                });
            }
            try {
                const read = await this.readStableMeasurementValue(step, readTimeoutMs, preparedRead.readCommand);
                lastValue = read.invalid ? read.display : read.value;
                const invalid = !!read.invalid;
                const res = invalid
                    ? { success: false, measured: lastValue, details: read.error || read.display }
                    : this.buildMeasurementResult(step, read.value, 'AUTOMATICA', 'Misura stabilizzata');
                const inside = !invalid && !!res.success;
                if (inside) {
                    if (!stableStart)
                        stableStart = Date.now();
                }
                else {
                    stableStart = 0;
                }
                const stableElapsed = inside && stableStart ? Date.now() - stableStart : 0;
                const status = invalid ? (read.overload ? 'OVERLOAD / NON VALIDO' : 'VALORE NON VALIDO') : (inside ? 'IN STABILIZZAZIONE' : 'FUORI RANGE');
                const now = Date.now();
                if (now - lastEmit >= 100 || status !== lastStatus || stableElapsed >= stableMs) {
                    lastEmit = now;
                    lastStatus = status;
                    emitLive({
                        level: invalid ? 'warn' : 'info',
                        status,
                        message: invalid
                            ? `Misura stabilizzata: ${read.display}; stabilità azzerata; range ${min === -Infinity ? '-∞' : min} ÷ ${max === Infinity ? '+∞' : max}`
                            : `Misura stabilizzata: ${read.value} ${step.unit || ''}; stabile ${stableElapsed}/${stableMs} ms; range ${min === -Infinity ? '-∞' : min} ÷ ${max === Infinity ? '+∞' : max}`,
                        value: lastValue,
                        measured: lastValue,
                        raw: read.raw,
                        stable_elapsed_ms: stableElapsed
                    });
                }
                if (inside) {
                    const remainingStableMs = stableMs - stableElapsed;
                    if (stableMs <= 0 || remainingStableMs <= 0) {
                        emitLive({
                            level: 'info',
                            status: 'OK STABILE',
                            message: `Misura stabilizzata OK: ${lastValue} ${step.unit || ''}; pass automatico immediato`,
                            value: lastValue,
                            measured: lastValue,
                            raw: read.raw,
                            stable_elapsed_ms: stableMs
                        });
                        this.activeStableMeasurementStepId = null;
                        return { ...res, success: true, details: `${res.details}; valore stabile per ${stableMs} ms; pass automatico immediato; polling ${sampleMs} ms` };
                    }
                    const waitMs = Math.max(1, Math.min(sampleMs, remainingStableMs));
                    await this.sleepInterruptible(waitMs);
                    if (this.stateMachine.getState() === 'FAULT')
                        throw new Error('Esecuzione interrotta');
                    if (seenRetrySeq !== this.measurementRetrySeq)
                        continue;
                    const finalStableElapsed = Date.now() - stableStart;
                    if (finalStableElapsed >= stableMs) {
                        emitLive({
                            level: 'info',
                            status: 'OK STABILE',
                            message: `Misura stabilizzata OK: ${lastValue} ${step.unit || ''}; pass automatico immediato`,
                            value: lastValue,
                            measured: lastValue,
                            raw: read.raw,
                            stable_elapsed_ms: stableMs
                        });
                        this.activeStableMeasurementStepId = null;
                        return { ...res, success: true, details: `${res.details}; valore stabile per ${stableMs} ms; pass automatico immediato; polling ${sampleMs} ms` };
                    }
                    continue;
                }
            }
            catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
                const now = Date.now();
                if (now - lastEmit >= 500 || lastStatus !== 'LETTURA NON DISPONIBILE') {
                    lastEmit = now;
                    lastStatus = 'LETTURA NON DISPONIBILE';
                    emitLive({
                        level: 'warn',
                        status: 'LETTURA NON DISPONIBILE',
                        message: `Lettura misura stabilizzata non disponibile: ${lastError}. Ritento automaticamente fino a timeout.`,
                        stable_elapsed_ms: 0
                    });
                }
            }
            await this.sleepInterruptible(sampleMs);
        }
        if (step.measurement_mode !== 'automatic' && step.manual_fallback_enabled !== false) {
            try {
                emitLive({ level: 'warn', status: 'FAIL / INSERIMENTO MANUALE', message: 'Timeout misura stabilizzata automatica: fallback manuale attivo.', stable_elapsed_ms: 0 });
                const manualVal = await this.requestManualMeasurementValue(step, lastError || 'Timeout misura stabilizzata automatica');
                this.activeStableMeasurementStepId = null;
                return this.buildMeasurementResult(step, manualVal, 'MANUALE', 'Misura stabilizzata fallback manuale');
            }
            catch { }
        }
        this.activeStableMeasurementStepId = null;
        return {
            success: false,
            measured: lastValue,
            measurement_source: 'AUTOMATICA',
            measurement_device: measurementDevice,
            device_display: measurementDeviceDisplay,
            instrument: measurementDeviceDisplay,
            target: step.target,
            tolerance: step.tolerance,
            min,
            max,
            unit: step.unit || '',
            timestamp: new Date().toISOString(),
            error: `Misura non stabilizzata entro ${timeoutMs} ms. Ultimo valore: ${lastValue ?? 'N/D'} ${step.unit || ''}${lastError ? '. Ultimo errore: ' + lastError : ''}`
        };
    }
    async executeStep(step) {
        try {
            switch (step.type) {
                case 'StableMeasurement':
                    return await this.executeStableMeasurement(step);
                case 'ManualMeasurement': {
                    const operator = await this.requestManualStep(step);
                    if (!operator || operator.ok === false || operator.action === 'cancel') {
                        return { success: false, measured: null, error: "Step manuale annullato o non confermato dall\'operatore." };
                    }
                    if (operator.manual_result === 'PASS') {
                        return { success: true, measured: operator.manual_value || 'PASS manuale', details: 'Step manuale confermato PASS dall\'operatore.' };
                    }
                    if (operator.manual_result === 'FAIL') {
                        return { success: false, measured: operator.manual_value || 'FAIL manuale', error: 'Step manuale segnato FAIL dall\'operatore.' };
                    }
                    const stableMs = Math.max(0, Number(step.stable_time_ms ?? step.timeout ?? 1000));
                    if (stableMs > 0) {
                        this.eventBus.emit('step_detail', { step_id: step.step_id, level: 'info', message: `Stabilizzazione misura manuale: ${stableMs} ms` });
                        await this.sleepInterruptible(stableMs);
                    }
                    const kind = step.manual_measure_type || step.io_type || 'CONFIRM';
                    let measured = operator.manual_value;
                    // AT-MEC_HM_3.1: se la misura non può essere acquisita da uno strumento,
                    // lo step manuale può richiedere inserimento manuale del valore.
                    // In questo caso NON interroga HAL/strumenti e valida direttamente il valore inserito.
                    if (step.manual_input_enabled) {
                        const numeric = parseFloat(String(operator.manual_value ?? '').replace(',', '.'));
                        measured = Number.isNaN(numeric) ? operator.manual_value : numeric;
                        const okManual = typeof measured === 'number' ? measured >= (step.min ?? -Infinity) && measured <= (step.max ?? Infinity) : Boolean(measured);
                        return { ...this.buildMeasurementResult(step, measured, 'MANUALE', 'Misura manuale inserita operatore'), success: okManual };
                    }
                    if (kind === 'DI')
                        measured = await this.withTimeout(this.hal.readDigitalInput(step.channel ?? 0), step.timeout || 1500, 'manual DI read');
                    else if (kind === 'DO')
                        measured = await this.withTimeout(this.hal.readDigitalOutput(step.channel ?? 0), step.timeout || 1500, 'manual DO read');
                    else if (kind === 'AI')
                        measured = await this.withTimeout(this.hal.readAnalogInput(step.channel ?? 0), step.timeout || 1500, 'manual AI read');
                    else if (kind === 'SCPI' || String(kind).startsWith('SCPI_')) {
                        try {
                            const skind = String(kind);
                            const command = step.command || (skind === 'SCPI_CURR_DC' ? 'MEAS:CURR:DC?' : skind === 'SCPI_FREQ' ? 'MEAS:FREQ?' : skind === 'SCPI_OHM' ? 'MEAS:RES?' : 'MEAS:VOLT:DC?');
                            const raw = await this.withTimeout(this.hal.querySCPI(step.device_mapping, command), step.timeout || 2500, 'manual SCPI read');
                            measured = parseFloat(raw);
                            if (Number.isNaN(measured))
                                measured = raw;
                        }
                        catch (err) {
                            // AT-MEC_HM_3.17: se il multimetro non risponde, non bloccare il test.
                            // Chiede all'operatore se vuole inserire la misura manuale; PASS/FAIL resta automatico su min/max.
                            const msg = err instanceof Error ? err.message : String(err);
                            this.eventBus.emit('step_detail', { step_id: step.step_id, level: 'warn', message: `Misura fallita dal multimetro: ${msg}. Richiesto inserimento manuale.` });
                            const fallbackOperator = await this.requestManualStep({ ...step, manual_input_enabled: true, manual_fallback: true, fallback_reason: msg });
                            if (!fallbackOperator || fallbackOperator.ok === false || fallbackOperator.action === 'cancel') {
                                return { success: false, measured: null, error: `Misura fallita dal multimetro e inserimento manuale annullato: ${msg}` };
                            }
                            const numeric = parseFloat(String(fallbackOperator.manual_value ?? '').replace(',', '.'));
                            measured = Number.isNaN(numeric) ? fallbackOperator.manual_value : numeric;
                        }
                    }
                    else if (measured === undefined || measured === '')
                        measured = 'CONFERMATO';
                    let ok = true;
                    if (typeof measured === 'number')
                        ok = measured >= (step.min ?? -Infinity) && measured <= (step.max ?? Infinity);
                    if (kind === 'DI' || kind === 'DO')
                        ok = measured === Boolean(step.value);
                    return { ...(typeof measured === 'number' ? this.buildMeasurementResult(step, measured, kind === 'SCPI' || String(kind).startsWith('SCPI_') ? 'AUTOMATICA' : 'SISTEMA', 'Step manuale acquisito') : { success: ok, measured, details: `Step manuale acquisito: ${typeof measured === 'boolean' ? (measured ? 'HIGH' : 'LOW') : measured} ${step.unit || ''}`.trim(), measurement_source: 'SISTEMA', timestamp: new Date().toISOString() }), success: ok };
                }
                case 'PowerSupplySet': {
                    const ch = Math.max(1, Math.min(2, Number(step.ps_channel || step.channel || 1)));
                    const voltage = Math.max(0, Math.min(30.5, Number(step.ps_voltage ?? step.value?.voltage ?? step.min ?? 0)));
                    const current = Math.max(0, Math.min(3.2, Number(step.ps_current ?? step.value?.current ?? step.max ?? 0)));
                    const outputOn = Boolean(step.ps_output_on ?? step.value?.outputOn ?? true);
                    const timeout = Math.max(1500, Number(step.timeout) || 2500);
                    await this.withTimeout(this.hal.setPl303Output(voltage, current, outputOn, ch), timeout, `PL303 CH${ch} set`);
                    return {
                        success: true,
                        measured: { channel: ch, voltage, current, outputOn },
                        details: `PL303 CH${ch}: ${voltage.toFixed(3)} V / ${current.toFixed(3)} A, output ${outputOn ? 'ON' : 'OFF'}`
                    };
                }
                case 'PowerSupplyMeasureCurrent': {
                    const ch = Math.max(1, Math.min(2, Number(step.ps_channel || step.channel || 1)));
                    const timeout = Math.max(1500, Number(step.timeout) || 2500);
                    const res = await this.withTimeout(this.hal.measurePl303Current(ch), timeout, `PL303 CH${ch} misura corrente`);
                    const currentA = Number(res.current);
                    const unit = (step.unit || 'A').toLowerCase();
                    const measured = unit === 'ma' ? currentA * 1000 : currentA;
                    const min = step.min ?? -Infinity;
                    const max = step.max ?? Infinity;
                    const ok = measured >= min && measured <= max;
                    return {
                        success: ok,
                        measured,
                        details: `Consumo PL303 CH${ch}: ${measured.toFixed(4)} ${step.unit || 'A'}; limite ${step.min ?? '-∞'} ÷ ${step.max ?? '+∞'}${res.mock ? ' (MOCK)' : ''}`
                    };
                }
                case 'Delay':
                    await this.sleepInterruptible(step.timeout || 500);
                    return { success: true, measured: step.timeout, details: `Attesa completata: ${step.timeout || 500} ms` };
                case 'DigitalOutputSet': {
                    const channel = step.channel ?? 0;
                    const activeState = Boolean(step.value);
                    const returnState = Boolean(step.return_state ?? false);
                    const mode = step.output_mode || 'set';
                    const commandTimeout = Math.max(1200, Number(step.timeout) || 1200);
                    const feedbackTimeout = Math.max(1500, Number(step.timeout) || 1500);
                    const verifyFeedback = step.verify_feedback === true;
                    let writeCount = 0;
                    try {
                        if (mode === 'pulse') {
                            const hz = Math.max(0.1, Number(step.frequency_hz) || 1);
                            const count = Math.max(1, Math.floor(Number(step.pulse_count) || 1));
                            const halfPeriodMs = Math.max(20, Math.round(1000 / hz / 2));
                            for (let i = 0; i < count; i++) {
                                await this.withTimeout(this.hal.setDigitalOutput(channel, activeState), commandTimeout, `DO${channel} impulso ${i + 1}/${count} ON`);
                                writeCount++;
                                await this.sleepInterruptible(halfPeriodMs);
                                await this.withTimeout(this.hal.setDigitalOutput(channel, returnState), commandTimeout, `DO${channel} impulso ${i + 1}/${count} OFF`);
                                writeCount++;
                                await this.sleepInterruptible(halfPeriodMs);
                            }
                        }
                        else {
                            await this.withTimeout(this.hal.setDigitalOutput(channel, activeState), commandTimeout, `DO${channel} set ${activeState ? 'HIGH' : 'LOW'}`);
                            writeCount++;
                            if (mode === 'timed') {
                                await this.sleepInterruptible(Math.max(1, Number(step.timeout) || 500));
                                await this.withTimeout(this.hal.setDigitalOutput(channel, returnState), commandTimeout, `DO${channel} ritorno ${returnState ? 'HIGH' : 'LOW'}`);
                                writeCount++;
                            }
                        }
                    }
                    catch (err) {
                        return {
                            success: false,
                            measured: { channel, mode, expected: mode === 'set' ? activeState : returnState, writeCount },
                            error: `DO${channel}: comando non completato (${err instanceof Error ? err.message : String(err)}). Controlla COM, slave Modbus, coil address e alimentazione ESP32.`
                        };
                    }
                    const expected = mode === 'set' ? activeState : returnState;
                    try {
                        const actual = await this.withTimeout(this.hal.readDigitalOutput(channel), feedbackTimeout, `DO${channel} lettura feedback`);
                        const ok = actual === expected;
                        return {
                            success: verifyFeedback ? ok : true,
                            measured: { channel, state: actual, mode, expected, writeCount, verifyFeedback },
                            details: `DO${channel} ${mode}: comando OK (${writeCount} scritture). Atteso finale ${expected ? 'HIGH' : 'LOW'}, feedback letto ${actual ? 'HIGH' : 'LOW'}${ok ? ' ✓' : (verifyFeedback ? ' ❌' : ' ⚠ non bloccante')}.`
                        };
                    }
                    catch (err) {
                        return {
                            success: !verifyFeedback,
                            measured: { channel, state: expected, mode, expected, writeCount, feedback: 'non letto', verifyFeedback },
                            details: `DO${channel} ${mode}: comando OK (${writeCount} scritture). Feedback non letto entro ${feedbackTimeout} ms${verifyFeedback ? ' — step fallito perché la verifica feedback è obbligatoria.' : ' — step considerato OK perché la verifica feedback non è obbligatoria.'}`,
                            error: verifyFeedback ? `DO${channel}: feedback non disponibile (${err instanceof Error ? err.message : String(err)}). Controlla se readCoils è implementato e se l'indirizzo coil è corretto.` : undefined
                        };
                    }
                }
                case 'DigitalInputCheck': {
                    const actual = await this.withTimeout(this.hal.readDigitalInput(step.channel ?? 0), step.timeout || 1000, 'DI read');
                    return { success: actual === Boolean(step.value), measured: actual, details: `DI${step.channel ?? 0}: atteso ${Boolean(step.value) ? 'HIGH' : 'LOW'}, letto ${actual ? 'HIGH' : 'LOW'}` };
                }
                case 'VoltageMeasurement': {
                    const cmd = step.command || 'MEAS:VOLT:DC?';
                    if (step.measurement_mode === 'manual') {
                        const manualVal = await this.requestManualMeasurementValue(step, 'Misura configurata come solo manuale');
                        return this.buildMeasurementResult(step, manualVal, 'MANUALE', 'Tensione manuale');
                    }
                    try {
                        const raw = await this.withTimeout(this.hal.querySCPI(step.device_mapping || 'Keysight_34461A', cmd), step.timeout || 2000, 'SCPI voltage');
                        const val = parseFloat(raw);
                        return this.buildMeasurementResult(step, Number.isNaN(val) ? raw : val, 'AUTOMATICA', 'Tensione automatica');
                    }
                    catch (err) {
                        const manualVal = await this.acquireManualFallbackMeasurement(step, err);
                        return this.buildMeasurementResult(step, manualVal, 'MANUALE', 'Tensione fallback manuale');
                    }
                }
                case 'CurrentMeasurement': {
                    const cmd = step.command || 'MEAS:CURR:DC?';
                    if (step.measurement_mode === 'manual') {
                        const manualVal = await this.requestManualMeasurementValue(step, 'Misura configurata come solo manuale');
                        return this.buildMeasurementResult(step, manualVal, 'MANUALE', 'Corrente manuale');
                    }
                    try {
                        const raw = await this.withTimeout(this.hal.querySCPI(step.device_mapping || 'Keysight_34461A', cmd), step.timeout || 2000, 'SCPI current');
                        const val = parseFloat(raw);
                        return this.buildMeasurementResult(step, Number.isNaN(val) ? raw : val, 'AUTOMATICA', 'Corrente automatica');
                    }
                    catch (err) {
                        const manualVal = await this.acquireManualFallbackMeasurement(step, err);
                        return this.buildMeasurementResult(step, manualVal, 'MANUALE', 'Corrente fallback manuale');
                    }
                }
                case 'AnalogInputMeasurement': {
                    const cmd = step.command || 'MEAS:VOLT:DC?';
                    if (step.measurement_mode === 'manual') {
                        const manualVal = await this.requestManualMeasurementValue(step, 'Misura configurata come solo manuale');
                        return this.buildMeasurementResult(step, manualVal, 'MANUALE', 'DMM manuale');
                    }
                    try {
                        const raw = await this.withTimeout(this.hal.querySCPI(step.device_mapping || 'Keysight_34461A', cmd), step.timeout || 2500, 'DMM analog measurement');
                        const val = parseFloat(raw);
                        return this.buildMeasurementResult(step, Number.isNaN(val) ? raw : val, 'AUTOMATICA', 'DMM automatica');
                    }
                    catch (err) {
                        const manualVal = await this.acquireManualFallbackMeasurement(step, err);
                        return this.buildMeasurementResult(step, manualVal, 'MANUALE', 'DMM fallback manuale');
                    }
                }
                case 'ResistanceTest': {
                    const cmd = step.command || 'MEAS:RES?';
                    if (step.measurement_mode === 'manual') {
                        const manualVal = await this.requestManualMeasurementValue(step, 'Misura configurata come solo manuale');
                        return this.buildMeasurementResult(step, manualVal, 'MANUALE', 'Resistenza manuale');
                    }
                    try {
                        const raw = await this.withTimeout(this.hal.querySCPI(step.device_mapping || 'Keysight_34461A', cmd), step.timeout || 2000, 'SCPI resistance');
                        const val = parseFloat(raw);
                        return this.buildMeasurementResult(step, Number.isNaN(val) ? raw : val, 'AUTOMATICA', 'Resistenza automatica');
                    }
                    catch (err) {
                        const manualVal = await this.acquireManualFallbackMeasurement(step, err);
                        return this.buildMeasurementResult(step, manualVal, 'MANUALE', 'Resistenza fallback manuale');
                    }
                }
                case 'FrequencyTest': {
                    const cmd = step.command || 'MEAS:FREQ?';
                    if (step.measurement_mode === 'manual') {
                        const manualVal = await this.requestManualMeasurementValue(step, 'Misura configurata come solo manuale');
                        return this.buildMeasurementResult(step, manualVal, 'MANUALE', 'Frequenza manuale');
                    }
                    try {
                        const raw = await this.withTimeout(this.hal.querySCPI(step.device_mapping || 'Keysight_34461A', cmd), step.timeout || 2000, 'SCPI frequency');
                        const val = parseFloat(raw);
                        return this.buildMeasurementResult(step, Number.isNaN(val) ? raw : val, 'AUTOMATICA', 'Frequenza automatica');
                    }
                    catch (err) {
                        const manualVal = await this.acquireManualFallbackMeasurement(step, err);
                        return this.buildMeasurementResult(step, manualVal, 'MANUALE', 'Frequenza fallback manuale');
                    }
                }
                case 'SCPICommand':
                    await this.withTimeout(this.hal.writeSCPI(step.device_mapping, String(step.command || step.value)), step.timeout || 1000, 'SCPI command');
                    return { success: true, measured: step.value, details: `Comando inviato a ${step.device_mapping}: ${String(step.command || step.value)}` };
                case 'FirmwareErase': {
                    const result = await FlashManager_1.FlashManager.executeFlashOperation(step.device_mapping, 'ERASE', step.value ?? 'mock', step.timeout);
                    return { success: result.success, measured: result.output.split('\n').pop() };
                }
                case 'FirmwareFlash': {
                    const result = await FlashManager_1.FlashManager.executeFlashOperation(step.device_mapping, 'FLASH', step.value ?? 'mock', step.timeout);
                    return { success: result.success, measured: result.output.split('\n').pop() };
                }
                case 'FirmwareVerify': {
                    const result = await FlashManager_1.FlashManager.executeFlashOperation(step.device_mapping, 'VERIFY', step.value ?? 'mock', step.timeout);
                    return { success: result.success, measured: result.output.split('\n').pop() };
                }
                case 'GotoIfFail':
                    return { success: false, measured: null };
                default:
                    console.warn(`[RECIPE] Tipo step sconosciuto: ${step.type}`);
                    return { success: false, measured: null, error: `Tipo step sconosciuto: ${step.type}` };
            }
        }
        catch (err) {
            console.error(`[RECIPE] Errore step ${step.step_id}:`, err);
            return { success: false, measured: null, error: err instanceof Error ? err.message : String(err) };
        }
    }
    describeStep(step) {
        const name = step.label ? `${step.label} — ` : '';
        if (step.type === 'DigitalOutputSet')
            return `${name}DO${step.channel ?? 0}: imposta ${step.value ? 'HIGH' : 'LOW'} in modalità ${step.output_mode || 'set'}${step.output_mode === 'pulse' ? `, ${step.frequency_hz || 1} Hz x ${step.pulse_count || 1}` : ''}.`;
        if (step.type === 'DigitalInputCheck')
            return `${name}DI${step.channel ?? 0}: verifica stato atteso ${step.value ? 'HIGH' : 'LOW'}.`;
        if (step.type === 'PowerSupplySet')
            return `${name}Alimentatore PL303QMD-P CH${step.ps_channel || step.channel || 1}: imposta ${step.ps_voltage ?? step.value?.voltage ?? 0} V / ${step.ps_current ?? step.value?.current ?? 0} A e output ${(step.ps_output_on ?? step.value?.outputOn ?? true) ? 'ON' : 'OFF'}.`;
        if (step.type === 'PowerSupplyMeasureCurrent')
            return `${name}Misura consumo alimentatore PL303QMD-P CH${step.ps_channel || step.channel || 1}: limite ${step.min ?? '-∞'} ÷ ${step.max ?? '+∞'} ${step.unit || 'A'}.`;
        if (step.type === 'AnalogInputMeasurement')
            return `${name}Multimetro digitale: acquisisci misura analogica (${step.command || 'MEAS:VOLT:DC?'}) e verifica ${step.min ?? '-∞'} ÷ ${step.max ?? '+∞'} ${step.unit || 'V'}.`;
        if (step.type === 'StableMeasurement')
            return `${name}Misura stabilizzata su ${this.measurementDeviceDisplayName(step.device_mapping || step.device)}: target ${step.target ?? 'N/D'}, limiti ${step.min ?? '-∞'} ÷ ${step.max ?? '+∞'} ${step.unit || ''}, stabile per ${step.stable_time_ms ?? 1000} ms, timeout ${step.timeout ?? 10000} ms, su FAIL ${step.stop_on_fail === false ? 'continua' : 'ferma'}.`;
        if (['VoltageMeasurement', 'CurrentMeasurement', 'ResistanceTest', 'FrequencyTest'].includes(step.type))
            return `${name}${step.type} su ${step.device_mapping}: origine ${step.measurement_mode || 'auto_with_fallback'}, comando ${step.command || 'default'}, target ${step.target ?? 'N/D'}, tolleranza ±${step.tolerance ?? 'N/D'}, limiti ${step.min ?? '-∞'} ÷ ${step.max ?? '+∞'} ${step.unit || ''}.`;
        if (step.type === 'Delay')
            return `${name}Attesa ${step.timeout || 500} ms.`;
        if (step.type === 'ManualMeasurement')
            return `${name}Step manuale: mostra istruzioni, attende conferma operatore, stabilizza ${step.stable_time_ms ?? step.timeout ?? 1000} ms e ${step.manual_input_enabled ? 'usa misura manuale inserita dall\'operatore' : 'acquisisce ' + (step.manual_measure_type || step.io_type || 'CONFIRM')}.`;
        return `${name}${step.type} su ${step.device_mapping}.`;
    }
}
exports.RecipeEngine = RecipeEngine;
