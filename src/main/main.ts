/**
 * AT-MEC HM 2.16 - Processo principale Electron.
 *
 * Responsabilità del file:
 * - avvio finestra HMI e servizi core;
 * - inizializzazione HAL, ricette, utenti, database locale e report;
 * - registrazione canali IPC protetti usati dal renderer;
 * - protezione anti-blocco tramite timeout, gestione errori e ritorni uniformi.
 */
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import { SerialPort } from 'serialport';

import { StateMachine, SystemState } from './core/StateMachine';
import { EventBus } from './core/EventBus';
import { UserManager } from './core/UserManager';
import { IotServer } from './core/IotServer';
import { PdfGenerator } from './core/PdfGenerator';
import { AuditSystem, TestReport } from './core/AuditSystem';
import { LocalDatabase } from './core/LocalDatabase';
import { DataProvider } from './core/DataProvider';
import { DeviceManager } from './hal/DeviceManager';
import { RecipeEngine, Recipe } from './runtime/RecipeEngine';

let mainWindow: BrowserWindow | null = null;
let iotServer: IotServer;
let hal: DeviceManager;
let recipeEngine: RecipeEngine;
let stateMachine: StateMachine;
let eventBus: EventBus;
let userManager: UserManager;
let auditSystem: AuditSystem;
let localDb: LocalDatabase;
let dataProvider: DataProvider;
let activeRunTraceMeta412I: any = {};


type CommSessionType = 'serial' | 'telnet' | 'tcp';
let commSerial: SerialPort | null = null;
let commTcp: net.Socket | null = null;
let commBuffer: Array<{ ts: string; dir: 'RX' | 'TX' | 'SYS'; data: string }> = [];
let commType: CommSessionType | null = null;

function pushComm(dir: 'RX' | 'TX' | 'SYS', data: string): void {
  const row = { ts: new Date().toISOString(), dir, data: String(data ?? '') };
  commBuffer.push(row);
  if (commBuffer.length > 1000) commBuffer = commBuffer.slice(-1000);
  try { mainWindow?.webContents.send('comm-rx', row); } catch {}
}

function closeCommunicationHub(): void {
  try { if (commSerial?.isOpen) commSerial.close(); } catch {}
  try { commTcp?.destroy(); } catch {}
  commSerial = null;
  commTcp = null;
  commType = null;
}

let kpiTotal = 0;
let kpiPassed = 0;
let kpiFailed = 0;

function timeoutPromise<T>(task: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    task,
    new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms); })
  ]).finally(() => { if (timer) clearTimeout(timer); });
}


/**
 * Registra un handler IPC con protezione anti-crash.
 *
 * Senza questo wrapper, un errore non gestito in un comando hardware o file-system
 * può propagarsi al renderer e lasciare la UI in stato incoerente.
 * Il wrapper mantiene il canale sempre rispondente e restituisce un oggetto errore
 * leggibile quando la funzione fallisce.
 */
function safeIpcHandle(channel: string, handler: (...args: any[]) => any): void {
  ipcMain.handle(channel, async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (err: any) {
      const message = err?.message || String(err);
      console.error(`[IPC:${channel}] Errore gestito:`, err);
      // 3.13: le query/polling PL303 non devono trasformarsi in FAULT globale.
      // I timeout di lettura diventano risultato non bloccante; l'operatore può riconnettere senza riavviare.
      if (!['query-pl303-status','measure-pl303-current','safe-pl303-off'].includes(channel)) {
        try {
          mainWindow?.webContents.send('system-fault', {
            reason: `Errore comando ${channel}: ${message}`,
            diagnosis: {
              probable_cause: 'Errore software o timeout hardware intercettato dal wrapper IPC.',
              recommended_check: 'Controllare log, stato strumenti e riprovare senza riavviare l’applicazione.'
            }
          });
        } catch {}
      }
      return { ok: false, error: message, channel };
    }
  });
}


function requirePermission(action: string): { ok: boolean; error?: string } | null {
  if (!userManager?.canCurrentUser(action)) {
    return { ok: false, error: `Permessi insufficienti: ${action} richiesto.` };
  }
  return null;
}

function requireAnyPermission(actions: string[]): { ok: boolean; error?: string } | null {
  if (!actions.some(a => userManager?.canCurrentUser(a))) {
    return { ok: false, error: `Permessi insufficienti: richiesto uno tra ${actions.join(', ')}.` };
  }
  return null;
}

function classifySettingsPermissions(settings: any): string[] {
  const keys = Object.keys(settings || {});
  const required = new Set<string>();
  const brandingRe = /(logo|Logo|brand|Brand|signature|Signature|report.*Logo|customerLogo|developerSmall|companyLogo|builderLogo|loginLarge|hmiLarge|logoBackground|logoBg)/;
  const hardwareRe = /(keysight|pl303|esp32|serial|baud|visa|port|hardware|device|station|instrument|exclude|scanner)/i;
  for (const k of keys) {
    if (brandingRe.test(k)) required.add('manage_branding');
    if (hardwareRe.test(k)) required.add('config_hardware');
  }
  return Array.from(required);
}

function isTcpConnectionText(conn: string): boolean {
  const clean = String(conn || '').trim().replace(/^tcp:\/\//i, '');
  return /^\d+\.\d+\.\d+\.\d+(:\d+)?$/.test(clean) || /^[a-zA-Z0-9_.-]+:\d+$/.test(clean);
}

function settingsFromReconnectConfig(c: { name: string; conn: string; baud: number }): any {
  const name = String(c?.name || '').trim();
  const conn = String(c?.conn || '').trim();
  const baud = Number(c?.baud || 0);
  if (!name || !conn || conn === 'mock') return {};
  if (name === 'modbus_serial' || name === 'esp32_serial') {
    return { esp32Port: conn, esp32Baud: baud || 115200 };
  }
  if (name === 'AimTTi_PL303') {
    if (isTcpConnectionText(conn)) {
      const clean = conn.replace(/^tcp:\/\//i, '');
      const [host, portText] = clean.includes(':') ? clean.split(':') : [clean, String(baud || 9221)];
      return { pl303Mode: 'ETHERNET', pl303Host: host, pl303Port: Number(portText || 9221), ttiHost: host, ttiPort: host, ttiBaud: Number(portText || 9221) };
    }
    return { pl303Mode: 'USB', pl303Com: conn, pl303Baud: baud || 9600, ttiPort: conn, ttiBaud: baud || 9600 };
  }
  if (name === 'Keysight_34461A' || name === 'Keysight_34465A') {
    const raw = conn.replace(/^visa:\/\//i, '').replace(/^usb:\/\//i, '');
    const isVisa = /^visa:\/\//i.test(conn) || /^(USB|TCPIP|GPIB).*::INSTR$/i.test(raw);
    const isUsbCom = /^usb:\/\//i.test(conn) || /^COM\d+$/i.test(raw) || raw.startsWith('/dev/');
    return { keysightMode: isVisa ? 'USB_VISA' : (isUsbCom ? 'USB_COM' : 'ETH'), keysightIp: raw, keysightPort: baud || (isVisa || isUsbCom ? 9600 : 5025) };
  }
  return {};
}

function persistReconnectSettings(configs: Array<{ name: string; conn: string; baud: number }>): void {
  const merged = (configs || []).reduce((acc, c) => ({ ...acc, ...settingsFromReconnectConfig(c) }), {} as any);
  if (Object.keys(merged).length) writeAppSettings(merged);
}

function normalizeInstrumentName(name: string): string {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return '';
  if (n.includes('modbus_serial') || n.includes('esp32') || n === 'esp32_serial') return 'modbus_serial';
  if (n.includes('aimtti_pl303') || n.includes('pl303') || n.includes('tti')) return 'AimTTi_PL303';
  if (n.includes('keysight') || n.includes('34461') || n.includes('34465') || n.includes('multimeter') || n.includes('multimetro') || n.includes('dmm')) return 'Keysight_34461A';
  if (n.includes('scanner') || n.includes('qr')) return 'QR_Scanner';
  if (['manual', 'manuale', 'operator', 'system', 'none'].includes(n)) return n;
  return String(name || '').trim();
}

function isInstrumentExcluded(name: string, excluded: Set<string>): boolean {
  const normalized = normalizeInstrumentName(name);
  return Array.from(excluded).some(item => normalizeInstrumentName(item) === normalized);
}


function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1280,
    minHeight: 800,
    backgroundColor: '#0d0d14',
    title: 'VEXON 10.1.3 - Industrial Test Platform',
    icon: path.join(__dirname, '../../assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true
    }
  });

  const htmlPath = path.join(__dirname, '../../src/renderer/index.html');
  mainWindow.loadFile(htmlPath);
  mainWindow.webContents.openDevTools({ mode: 'detach' });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function initSystems(): void {
  eventBus = new EventBus();
  userManager = new UserManager();
  auditSystem = new AuditSystem();
  localDb = new LocalDatabase();
  dataProvider = new DataProvider(localDb);

  stateMachine = new StateMachine((newState: SystemState) => {
    mainWindow?.webContents.send('state-changed', newState);
    eventBus.emit('state_changed', newState);
    iotServer?.broadcastEvent('STATE_CHANGE', { state: newState });
  });

  hal = new DeviceManager();
  recipeEngine = new RecipeEngine(stateMachine, eventBus, hal);

  iotServer = new IotServer(8080);

  eventBus.subscribe('step_started', (data) => {
    mainWindow?.webContents.send('step-started', data);
    iotServer.broadcastEvent('STEP_UPDATE', { ...data, state: 'started' });
  });
  eventBus.subscribe('step_passed', (data) => {
    mainWindow?.webContents.send('step-passed', data);
    iotServer.broadcastEvent('STEP_UPDATE', { ...data, state: 'passed' });
  });
  eventBus.subscribe('step_detail', (data) => {
    mainWindow?.webContents.send('step-detail', data);
    iotServer.broadcastEvent('STEP_DETAIL', data);
  });
  eventBus.subscribe('step_failed', (data) => {
    mainWindow?.webContents.send('step-failed', data);
    iotServer.broadcastEvent('STEP_UPDATE', { ...data, state: 'failed' });
  });
  eventBus.subscribe('failure_decision_required', (data) => {
    mainWindow?.webContents.send('failure-decision-required', data);
  });
  eventBus.subscribe('manual_step_request', (data) => {
    mainWindow?.webContents.send('manual-step-request', data);
  });
  eventBus.subscribe('run_completed', (data) => {
    const baseReport: TestReport | null = data.report || null;
    const station = dataProvider?.getStationTraceInfo ? dataProvider.getStationTraceInfo() : {};
    const report: TestReport | null = baseReport ? ({
      ...baseReport,
      station_id: station.stationId || '',
      station_name: station.stationName || '',
      station_department: station.stationDepartment || '',
      station_site: station.stationSite || '',
      customer_name: activeRunTraceMeta412I.customerName || '',
      customer_logo: activeRunTraceMeta412I.customerLogo || '',
      product_name: activeRunTraceMeta412I.productName || ''
    } as any) : null;
    if (report) data.report = report;
    mainWindow?.webContents.send('run-completed', data);
    if (data.success) {
      kpiPassed++;
    } else {
      kpiFailed++;
    }
    // AT-MEC_HM_4.13G: salva e stampa il report arricchito con tracciabilità postazione/cliente.
    if (report) { try { dataProvider.saveTestReport(report); } catch (err) { console.error('[DATA_PROVIDER] save report:', err); } }
    if (report) PdfGenerator.generateCertificate(report);
    kpiTotal++;
    if (report) iotServer.updateLiveKpi(kpiTotal, kpiPassed, kpiFailed, report.serial_dut, report.final_result);
    mainWindow?.webContents.send('kpi-updated', { total: kpiTotal, passed: kpiPassed, failed: kpiFailed });
  });
  eventBus.subscribe('recipe_loaded', (data) => {
    mainWindow?.webContents.send('recipe-loaded', data);
  });
  eventBus.subscribe('system_fault', (data) => {
    mainWindow?.webContents.send('system-fault', data);
  });

  console.log('[MAIN] Sistemi inizializzati.');
}

async function connectHardware(): Promise<void> {
  const cfg = readAppSettings();
  const excluded = new Set<string>(Array.isArray(cfg.excludedInstruments) ? cfg.excludedInstruments : []);
  const keysightMode = cfg.keysightMode || 'ETH';
  const keysightRaw = cfg.keysightIp || '127.0.0.1';
  const keysightConn = keysightMode === 'USB_COM' ? `usb://${keysightRaw}` : keysightMode === 'USB_VISA' ? `visa://${keysightRaw}` : keysightRaw;
  const attempts: Array<{ name: string; conn: string; baud: number; timeout: number }> = [
    { name: 'Keysight_34461A', conn: keysightConn, baud: Number(cfg.keysightPort || (keysightMode === 'ETH' ? 5025 : 9600)), timeout: 2800 },
    { name: 'AimTTi_PL303', conn: cfg.pl303Mode === 'ETHERNET' ? (cfg.pl303Host || cfg.ttiHost || 'mock') : (cfg.pl303Com || cfg.ttiPort || 'mock'), baud: Number(cfg.pl303Mode === 'ETHERNET' ? (cfg.pl303Port || 9221) : (cfg.pl303Baud || cfg.ttiBaud || 9600)), timeout: 3000 },
    { name: 'modbus_serial', conn: cfg.esp32Port || 'mock', baud: Number(cfg.esp32Baud || 115200), timeout: 3500 }
  ];
  for (const a of attempts) {
    if (excluded.has(a.name)) {
      console.log(`[MAIN] Strumento escluso da configurazione: ${a.name}`);
      continue;
    }
    try {
      await timeoutPromise(hal.connectDevice(a.name, a.conn, a.baud), a.timeout, `connect ${a.name}`);
    } catch (err) {
      console.error(`[MAIN] Connessione ${a.name} non riuscita:`, err);
    }
  }

  const statuses = hal.getAllStatuses();
  mainWindow?.webContents.send('hardware-statuses', statuses);
  console.log('[MAIN] Connessione hardware iniziale completata senza bloccare HMI.');
}

app.whenReady().then(async () => {
  initSystems();
  createWindow();

  mainWindow!.webContents.once('did-finish-load', async () => {
    await connectHardware();
    stateMachine.transitionTo('READY');
    mainWindow?.webContents.send('state-changed', stateMachine.getState());
    mainWindow?.webContents.send('system-ready', { version: '6.0_WORK_ORDER_PRODUCT_MANAGEMENT' });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', async () => {
  try { await timeoutPromise(hal.safePl303AllOutputsOff('APP_CLOSE'), 2500, 'PL303 off chiusura app'); } catch {}
  closeCommunicationHub();
  hal?.disconnect();
  iotServer?.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  try { await timeoutPromise(hal.safePl303AllOutputsOff('APP_BEFORE_QUIT'), 2500, 'PL303 off before quit'); } catch {}
});

safeIpcHandle('get-state', () => stateMachine.getState());

// AT-MEC_HM_6.0_WORK_ORDER_PRODUCT_MANAGEMENT - Printer discovery e adapter stampa base.
safeIpcHandle('print420a5-list-printers', async () => {
  try {
    const printers = mainWindow ? await mainWindow.webContents.getPrintersAsync() : [];
    return (printers || []).map((p: any) => ({
      id: p.name,
      name: p.name,
      driver: p.description || p.status || 'Windows Driver',
      type: /pdf/i.test(p.name || '') ? 'Virtuale' : 'Windows',
      port: p.options?.printerLocation || '',
      online: true,
      isDefault: !!p.isDefault
    }));
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err), printers: [] };
  }
});

safeIpcHandle('print420a5-print-job', async (_e, job: any) => {
  // Fase A5: adapter reale future-ready. Per sicurezza non forza stampa raw senza driver specifico.
  // Il renderer mantiene storico/coda anche quando la stampa reale non è disponibile.
  return { ok: true, simulatedByMain: true, jobId: job?.id || '', printer: job?.printer || '' };
});

safeIpcHandle('get-hardware-statuses', () => hal.getAllStatuses());
safeIpcHandle('get-professional-devices', () => hal.getProfessionalDeviceList());
safeIpcHandle('scan-serial-ports', async () => hal.scanSerialPorts());
safeIpcHandle('scan-visa-resources', async () => hal.scanVisaResources());
safeIpcHandle('get-esp32-io-catalog', () => hal.getEsp32IoCatalog());

safeIpcHandle('user-login', (_e, { username, password }) => userManager.login(username, password));
safeIpcHandle('verify-user-credentials', (_e, { username, password }) => userManager.verifyCredentials(username, password));
safeIpcHandle('user-logout', () => { userManager.logout(); return { ok: true }; });
safeIpcHandle('get-current-user', () => userManager.getCurrentUser());

safeIpcHandle('list-roles', () => userManager.listRoles());
safeIpcHandle('list-users', () => userManager.listUsers());
safeIpcHandle('list-login-users', () => userManager.listLoginUsers());
safeIpcHandle('create-role', (_e, { role, permissions, level }) => userManager.createRole(role, permissions || [], level));
safeIpcHandle('create-user', (_e, { username, displayName, role, password, operatorCode, photoDataUrl }) => userManager.createUser(username, displayName, role, password, operatorCode, photoDataUrl));
safeIpcHandle('delete-user', (_e, username) => userManager.deleteUser(username));
safeIpcHandle('set-user-enabled', (_e, { username, enabled }) => userManager.setUserEnabled(username, enabled));


// Connessione rapida e dedicata ESP32: usata dalla validazione ricette per non bloccare
// l'avvio tentando anche PL303/Keysight. Mantiene il nome logico modbus_serial.
safeIpcHandle('connect-esp32-only', async (_e, cfg: { port?: string; baud?: number }) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  const port = String(cfg?.port || '').trim();
  const baud = Number(cfg?.baud || 115200);
  if (!port || port === 'mock') return { ok: false, error: 'Porta ESP32 non selezionata', statuses: hal.getAllStatuses() };
  await timeoutPromise(hal.connectDevice('modbus_serial', port, baud), 4200, 'connect ESP32 only');
  const statuses = hal.getAllStatuses();
  mainWindow?.webContents.send('hardware-statuses', statuses);
  const st = statuses.find(s => s.name === 'modbus_serial');
  if (st && !st.mock) writeAppSettings(settingsFromReconnectConfig({ name: 'modbus_serial', conn: port, baud }));
  return { ok: !!st && !st.mock, status: st, statuses };
});

safeIpcHandle('reconnect-hardware', async (_e, configs: Array<{ name: string; conn: string; baud: number }>) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  for (const c of configs) {
    try {
      await timeoutPromise(hal.connectDevice(c.name, c.conn, c.baud), 3500, `connect ${c.name}`);
    } catch (err) {
      console.error(`[MAIN] Timeout connessione ${c.name}:`, err);
    }
  }
  persistReconnectSettings(configs || []);
  const statuses = hal.getAllStatuses();
  mainWindow?.webContents.send('hardware-statuses', statuses);
  return statuses;
});

safeIpcHandle('start-test', async (_e, payload: { recipe: Recipe; serialDut: string; lotNumber?: string; workOrder?: string; overrideDuplicate?: boolean; repairNote?: string }) => {
  const denied = requirePermission('run_test'); if (denied) return denied;
  const { recipe, serialDut } = payload;
  const currentState = stateMachine.getState();
  if (currentState === 'FAULT') {
    stateMachine.transitionTo('RECOVERY');
    stateMachine.transitionTo('IDLE');
    stateMachine.transitionTo('READY');
  }
  if (recipeEngine.isRunning() || stateMachine.getState() === 'RUNNING' || stateMachine.getState() === 'PAUSED') {
    // AT-MEC 2.22: se il renderer è rimasto bloccato dopo un FAIL/popup nascosto, consenti al front-end
    // di ricevere un errore chiaro. Il front-end esegue STOP/RESET automatico e ritenta una sola volta.
    return { ok: false, error: 'Ricetta già in esecuzione. Premi STOP o attendi il completamento.' };
  }
  if ((recipe as any).enabled === false) {
    return { ok: false, error: 'Ricetta disabilitata: abilita il flag prima di avviare.' };
  }
  if (!userManager.canCurrentUser('run_test')) {
    return { ok: false, error: 'Permessi insufficienti.' };
  }
  const lotNumber = String(payload.lotNumber || payload.workOrder || '').trim();
  const serialKey = String(serialDut || '').trim();
  if (serialKey) {
    const previous = auditSystem.findBySerialAndLot(serialKey, lotNumber);
    if (previous && !payload.overrideDuplicate) {
      return {
        ok: false,
        duplicate: true,
        previousResult: previous.final_result,
        previous,
        requiresRepairNote: previous.final_result === 'FAIL',
        message: previous.final_result === 'PASS'
          ? `Seriale ${serialKey} già testato PASS nella commessa ${lotNumber || 'N/D'}. Vuoi proseguire comunque?`
          : `Seriale ${serialKey} già testato FAIL nella commessa ${lotNumber || 'N/D'}. Indica la relazione di riparazione prima di ripetere il test.`
      };
    }
    if (previous && previous.final_result === 'FAIL' && !String(payload.repairNote || '').trim()) {
      return { ok: false, duplicate: true, requiresRepairNote: true, previousResult: 'FAIL', previous, message: 'Relazione di riparazione obbligatoria per ritestare una scheda già FAIL.' };
    }
  }
  const hwCheck = hal.validateRecipeHardware(recipe);
  const cfg = readAppSettings();
  const excluded = new Set<string>(Array.isArray(cfg.excludedInstruments) ? cfg.excludedInstruments : []);
  const nonHardwareNames = new Set(['manual', 'manuale', 'operator', 'system', 'none', 'qr_scanner', 'scanner', 'barcode']);
  const missingAfterExclusions = (hwCheck.missing || []).filter(name => !isInstrumentExcluded(name, excluded) && !nonHardwareNames.has(String(name || '').toLowerCase()));
  if (missingAfterExclusions.length > 0) {
    return {
      ok: false,
      error: `Hardware richiesto non LIVE: ${missingAfterExclusions.join(', ')}. Collegalo dalla Modalità Test oppure escludilo se non è necessario.`
    };
  }
  if (stateMachine.getState() !== 'READY') {
    return { ok: false, error: `Sistema non pronto (${stateMachine.getState()}). Premi RECOVER o riavvia connessione hardware.` };
  }
  activeRunTraceMeta412I = {
    customerName: (recipe as any).client_name || (recipe as any).customer || '',
    customerLogo: (recipe as any).customer_logo || (recipe as any).client_logo || '',
    productName: (recipe as any).product_name || (recipe as any).product || ''
  };
  recipeEngine.run(recipe, serialDut, userManager.getCurrentOperator(), { lotNumber, workOrder: lotNumber, repairNote: payload.repairNote || '' }).catch(err => {
    console.error('[MAIN] Errore run ricetta:', err);
  }).finally(() => {
    try {
      if (recipeEngine.isRunning() === false && (stateMachine.getState() === 'RUNNING' || stateMachine.getState() === 'PAUSED' || stateMachine.getState() === 'FAULT')) {
        const st = stateMachine.getState();
        if (st === 'RUNNING') { try { stateMachine.transitionTo('READY'); } catch {} }
        else if (st === 'PAUSED') { try { stateMachine.transitionTo('RECOVERY'); } catch {}; try { stateMachine.transitionTo('IDLE'); } catch {}; try { stateMachine.transitionTo('READY'); } catch {} }
        else if (st === 'FAULT') { try { stateMachine.transitionTo('RECOVERY'); } catch {}; try { stateMachine.transitionTo('IDLE'); } catch {}; try { stateMachine.transitionTo('READY'); } catch {} }
        mainWindow?.webContents.send('state-changed', stateMachine.getState());
      }
    } catch {}
  });
  return { ok: true };
});

safeIpcHandle('stop-test', async () => {
  // STOP TEST operatore: deve sempre liberare il motore ricetta e riportare il sistema avviabile.
  // Non è un emergency stop: non scollega gli strumenti, ma sblocca RUNNING/PAUSED/FAULT.
  try { recipeEngine.requestStop(); } catch {}
  try { await timeoutPromise(hal.safePl303AllOutputsOff('STOP_TEST'), 2500, 'PL303 OFF stop test'); } catch {}
  try { (recipeEngine as any).forceResetAfterStop?.(); } catch {}
  await new Promise(res => setTimeout(res, 120));
  const st = stateMachine.getState();
  if (st === 'FAULT' || st === 'RUNNING' || st === 'PAUSED' || st === 'RECOVERY') {
    try { stateMachine.transitionTo('RECOVERY'); } catch {}
    try { stateMachine.transitionTo('IDLE'); } catch {}
    try { stateMachine.transitionTo('READY'); } catch {}
  }
  mainWindow?.webContents.send('state-changed', stateMachine.getState());
  return { ok: true, state: stateMachine.getState() };
});

safeIpcHandle('emergency-stop-all', async () => {
  const errors: string[] = [];
  let outputsLow = 0;
  try { recipeEngine.requestStop(); } catch (err: any) { errors.push('STOP test: ' + (err?.message || String(err))); }
  try { await timeoutPromise(hal.safePl303AllOutputsOff('EMERGENZA'), 7000, 'PL303 OFF emergenza'); } catch (err: any) { errors.push('PL303 OFF emergenza: ' + (err?.message || String(err))); }

  const doChannels = hal.getEsp32IoCatalog().filter(ch => ch.io_type === 'DO' && ch.safe).map(ch => ch.channel);
  for (const gpio of doChannels) {
    try {
      await timeoutPromise(hal.setDigitalOutput(gpio, false), 900, `emergency DO GPIO${gpio}`);
      outputsLow++;
    } catch (err: any) {
      errors.push(`GPIO${gpio}: ${err?.message || String(err)}`);
    }
  }

  // 3.13: non scollegare forzatamente tutti gli strumenti: chiudere la seriale obbligava a riavviare l'app.
  // L'emergenza porta le uscite in stato sicuro, ferma il test e lascia Device Manager pronto per reconnect.
  try {
    const st = stateMachine.getState();
    if (st === 'RUNNING' || st === 'PAUSED' || st === 'FAULT' || st === 'RECOVERY') {
      try { stateMachine.transitionTo('RECOVERY'); } catch {}
      try { stateMachine.transitionTo('IDLE'); } catch {}
      try { stateMachine.transitionTo('READY'); } catch {}
    }
  } catch {}
  try { mainWindow?.webContents.send('hardware-statuses', hal.getAllStatuses()); } catch {}
  try { mainWindow?.webContents.send('state-changed', stateMachine.getState()); } catch {}
  return { ok: errors.length === 0, outputsLow, errors, resetWithoutRestart: true };
});

safeIpcHandle('pause-test', () => {
  recipeEngine.requestPause();
  return { ok: true };
});

safeIpcHandle('resume-test', () => {
  recipeEngine.requestResume();
  return { ok: true };
});

safeIpcHandle('set-debug-mode', (_e, enabled: boolean) => {
  const denied = requirePermission('debug_mode'); if (denied) return denied;
  if (!userManager.canCurrentUser('debug_mode')) {
    return { ok: false, error: 'Permessi insufficienti.' };
  }
  recipeEngine.setDebugMode(enabled);
  return { ok: true };
});

safeIpcHandle('next-step', () => {
  recipeEngine.nextStep();
  return { ok: true };
});

safeIpcHandle('retry-current-measurement', () => {
  return recipeEngine.requestCurrentMeasurementRetry();
});

safeIpcHandle('manual-step-response', (_e, { requestId, response }) => {
  recipeEngine.resolveManualStep(Number(requestId), response || {});
  return { ok: true };
});

safeIpcHandle('failure-action', (_e, action: 'continue' | 'stop') => {
  recipeEngine.resolveFailureAction(action === 'continue' ? 'continue' : 'stop');
  return { ok: true };
});

safeIpcHandle('recover-fault', () => {
  if (stateMachine.getState() === 'FAULT') {
    stateMachine.transitionTo('RECOVERY');
    stateMachine.transitionTo('IDLE');
    stateMachine.transitionTo('READY');
  }
  return { ok: true };
});

safeIpcHandle('flash-firmware', async (_e, { tool, operation, filePath }) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  const { FlashManager } = await import('./hal/FlashManager');
  const result = await FlashManager.executeFlashOperation(tool, operation, filePath, 30000);
  eventBus.emit('cli-log-received', { tool, operation, output: result.output, success: result.success });
  mainWindow?.webContents.send('cli-log', { tool, operation, output: result.output, success: result.success });
  return result;
});

safeIpcHandle('query-multimeter', async (_e, { device, cmd }) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  const val = await timeoutPromise(hal.querySCPI(device, cmd), 2500, `query ${device}`);
  const parsed = parseFloat(val);
  if (!isNaN(parsed)) {
    eventBus.emit('keysight-live-update', { device, value: parsed, cmd });
    mainWindow?.webContents.send('keysight-live', { device, value: parsed, cmd });
  }
  return val;
});


safeIpcHandle('connect-pl303', async (_e, cfg: { mode?: string; host?: string; port?: number; com?: string; baud?: number }) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  const mode = String(cfg?.mode || 'USB').toUpperCase();
  const conn = mode === 'ETHERNET' ? String(cfg?.host || 'mock') : String(cfg?.com || 'mock');
  const speed = mode === 'ETHERNET' ? Number(cfg?.port || 9221) : Number(cfg?.baud || 9600);
  await timeoutPromise(hal.connectDevice('AimTTi_PL303', conn, speed), 4000, 'connect PL303');
  const settings: any = mode === 'ETHERNET'
    ? { pl303Mode: 'ETHERNET', pl303Host: conn, pl303Port: speed, ttiPort: conn, ttiBaud: speed }
    : { pl303Mode: 'USB', pl303Com: conn, pl303Baud: speed, ttiPort: conn, ttiBaud: speed };
  writeAppSettings(settings);
  const statuses = hal.getAllStatuses();
  mainWindow?.webContents.send('hardware-statuses', statuses);
  return { ok: true, statuses };
});

safeIpcHandle('set-pl303-output', async (_e, cfg: { voltage?: number; current?: number; outputOn?: boolean; channel?: number }) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  const res = await timeoutPromise(hal.setPl303Output(Number(cfg?.voltage || 0), Number(cfg?.current || 0), Boolean(cfg?.outputOn), Number(cfg?.channel || 1)), 3500, 'set PL303');
  return res;
});

safeIpcHandle('query-pl303-status', async (_e, channel: number = 1) => {
  try {
    return await timeoutPromise(hal.getPl303Status(Number(channel || 1)), 6500, 'query PL303');
  } catch (err: any) {
    return { ok: false, channel: Number(channel || 1), voltage: null, current: null, error: err?.message || String(err), timeout: true };
  }
});

safeIpcHandle('safe-pl303-off', async (_e, reason: string = 'MANUAL_SAFE_OFF') => {
  try {
    return await timeoutPromise(hal.safePl303AllOutputsOff(reason), 4500, 'PL303 CH1/CH2 OFF');
  } catch (err: any) {
    return { ok: false, reason, error: err?.message || String(err), nonBlocking: true };
  }
});

safeIpcHandle('measure-pl303-current', async (_e, channel: number = 1) => {
  try {
    return await timeoutPromise(hal.measurePl303Current(Number(channel || 1)), 5000, 'misura corrente PL303');
  } catch (err: any) {
    return { ok: false, channel: Number(channel || 1), current: null, error: err?.message || String(err), timeout: true };
  }
});


safeIpcHandle('read-digital-input', async (_e, channel: number) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  return timeoutPromise(hal.readDigitalInput(Number(channel) || 0), 2000, 'read DI');
});

safeIpcHandle('read-digital-output', async (_e, channel: number) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  return timeoutPromise(hal.readDigitalOutput(Number(channel) || 0), 2000, 'read DO');
});

safeIpcHandle('read-analog-input', async (_e, channel: number) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  return timeoutPromise(hal.readAnalogInput(Number(channel) || 0), 2000, 'read AI');
});

safeIpcHandle('set-digital-output', async (_e, { channel, state }) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  await timeoutPromise(hal.setDigitalOutput(Number(channel) || 0, Boolean(state)), 2500, 'write DO');
  return { ok: true };
});

safeIpcHandle('write-analog-output', async (_e, { channel, value }) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  await timeoutPromise(hal.writeAnalogOutput(Number(channel) || 0, Number(value) || 0), 2500, 'write AO');
  return { ok: true };
});

safeIpcHandle('get-esp32-info', async () => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  return timeoutPromise(hal.getEsp32Info(), 3500, 'get ESP32 info');
});

safeIpcHandle('set-esp32-pin-map', async (_e, entries) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  hal.setEsp32PinMap(entries || []);
  return { ok: true };
});


// AT-MEC_HM_3.30 - Communication Hub: seriale, Telnet/TCP, log RX/TX e base parser renderer.
safeIpcHandle('comm-open-serial', async (_e, cfg: { port?: string; baud?: number }) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  closeCommunicationHub();
  const port = String(cfg?.port || '').trim();
  const baudRate = Number(cfg?.baud || 115200);
  if (!port) return { ok: false, error: 'Porta seriale non selezionata' };
  commType = 'serial';
  commBuffer = [];
  commSerial = new SerialPort({ path: port, baudRate, autoOpen: false });
  await new Promise<void>((resolve, reject) => commSerial!.open(err => err ? reject(err) : resolve()));
  commSerial.on('data', (buf: Buffer) => pushComm('RX', buf.toString('utf8')));
  commSerial.on('error', (err: Error) => pushComm('SYS', `SERIAL ERROR: ${err.message}`));
  commSerial.on('close', () => pushComm('SYS', 'SERIALE CHIUSA'));
  pushComm('SYS', `SERIALE APERTA ${port} @ ${baudRate}`);
  return { ok: true, type: commType, port, baudRate };
});

safeIpcHandle('comm-open-tcp', async (_e, cfg: { host?: string; port?: number; mode?: string }) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  closeCommunicationHub();
  const host = String(cfg?.host || '').trim();
  const port = Number(cfg?.port || 23);
  if (!host) return { ok: false, error: 'IP/host non inserito' };
  commType = String(cfg?.mode || 'telnet').toLowerCase() === 'tcp' ? 'tcp' : 'telnet';
  commBuffer = [];
  commTcp = new net.Socket();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout connessione TCP/Telnet')), 5000);
    commTcp!.once('connect', () => { clearTimeout(timer); resolve(); });
    commTcp!.once('error', err => { clearTimeout(timer); reject(err); });
    commTcp!.connect(port, host);
  });
  commTcp.on('data', (buf: Buffer) => pushComm('RX', buf.toString('utf8')));
  commTcp.on('error', (err: Error) => pushComm('SYS', `TCP ERROR: ${err.message}`));
  commTcp.on('close', () => pushComm('SYS', 'TCP/TELNET CHIUSO'));
  pushComm('SYS', `${commType.toUpperCase()} APERTO ${host}:${port}`);
  return { ok: true, type: commType, host, port };
});

safeIpcHandle('comm-send', async (_e, payload: { data?: string; appendNewline?: boolean }) => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  const raw = String(payload?.data ?? '');
  const data = raw + (payload?.appendNewline === false ? '' : '\n');
  if (commSerial?.isOpen) {
    await new Promise<void>((resolve, reject) => commSerial!.write(data, err => err ? reject(err) : resolve()));
    pushComm('TX', data);
    return { ok: true };
  }
  if (commTcp && !commTcp.destroyed) {
    commTcp.write(data);
    pushComm('TX', data);
    return { ok: true };
  }
  return { ok: false, error: 'Nessuna comunicazione aperta' };
});

safeIpcHandle('comm-close', async () => {
  const denied = requirePermission('config_hardware'); if (denied) return denied;
  closeCommunicationHub();
  pushComm('SYS', 'Communication Hub disconnesso');
  return { ok: true };
});

safeIpcHandle('comm-read-log', async () => { const denied = requirePermission('config_hardware'); if (denied) return denied; return { ok: true, type: commType, rows: commBuffer.slice(-500) }; });

safeIpcHandle('get-audit-history', (_e, filters) => { const denied = requirePermission('view_reports'); if (denied) return denied; return auditSystem.filterHistory(filters || {}).slice(-1000); });
safeIpcHandle('check-serial-history', (_e, { serialDut, lotNumber }) => { const denied = requirePermission('view_traceability'); if (denied) return denied; return auditSystem.findBySerialAndLot(serialDut, lotNumber); });
safeIpcHandle('get-local-db-stats', (_e, filters) => { const denied = requirePermission('view_kpi'); if (denied) return denied; return dataProvider.getStats(filters || {}); });
safeIpcHandle('get-serial-history', (_e, { serialDut, lotNumber }) => { const denied = requirePermission('view_traceability'); if (denied) return denied; return dataProvider.getSerialHistory(serialDut, lotNumber); });
safeIpcHandle('add-repair-record', (_e, payload) => { const denied = requirePermission('view_traceability'); if (denied) return denied; return dataProvider.addRepairRecord({ ...(payload || {}), operator: userManager.getCurrentOperator() }); });

safeIpcHandle('delete-recipe', async (_e, name: string) => {
  const denied = requirePermission('edit_recipe'); if (denied) return denied;
  const role = String((userManager as any).getCurrentUser?.()?.role || userManager.getCurrentOperator?.() || '').toLowerCase();
  const allowed = ['admin','administrator','sviluppatore','developer','tecnico','technician'].some(x => role.includes(x));
  // Fallback: nelle versioni precedenti il controllo completo dei permessi e gia lato HMI.
  const safeName = String(name || '').replace(/[\/:*?"<>|]/g, '_').trim();
  if (!safeName) return { ok:false, error:'Nome ricetta non valido.' };
  const filePath = path.join(process.cwd(), 'recipes', `${safeName}.json`);
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (err:any) { return { ok:false, error: err?.message || String(err) }; }
  return { ok:true };
});

safeIpcHandle('list-recipe-versions', (_e, name: string) => { const denied = requirePermission('view_reports'); if (denied) return denied; return dataProvider.listRecipeVersions(name); });
safeIpcHandle('load-recipe-version', (_e, { name, version }) => {
  const denied = requirePermission('view_reports'); if (denied) return denied;
  const recipe = dataProvider.loadRecipe(name, Number(version));
  return recipe ? { ok: true, recipe } : { ok: false, error: 'Versione ricetta non trovata.' };
});
safeIpcHandle('export-local-database', async () => {
  const denied = requirePermission('manage_data'); if (denied) return denied;
  const result = await dialog.showSaveDialog({
    title: 'Esporta database locale AT-MEC',
    defaultPath: `AT-MEC_database_${new Date().toISOString().slice(0,10)}.json`,
    filters: [{ name: 'Database locale JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false };
  fs.writeFileSync(result.filePath, JSON.stringify(dataProvider.exportSnapshot(), null, 2));
  return { ok: true, filePath: result.filePath };
});

safeIpcHandle('export-local-reports-csv', async (_e, filters) => {
  const denied = requirePermission('manage_data'); if (denied) return denied;
  const result = await dialog.showSaveDialog({
    title: 'Esporta storico test filtrato in CSV',
    defaultPath: `AT-MEC_storico_test_${new Date().toISOString().slice(0,10)}.csv`,
    filters: [{ name: 'CSV Excel compatibile', extensions: ['csv'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false };
  fs.writeFileSync(result.filePath, dataProvider.exportReportsCsv(filters || {}), 'utf8');
  return { ok: true, filePath: result.filePath };
});

safeIpcHandle('backup-local-database', async (_e, label) => { const denied = requirePermission('manage_data'); if (denied) return denied; return dataProvider.backupSnapshot(label || 'manuale'); });
safeIpcHandle('get-data-provider-status', () => { const denied = requireAnyPermission(['manage_data','config_hardware','view_kpi']); if (denied) return denied; return dataProvider.getStatus(); });
safeIpcHandle('get-station-trace-info', () => { const denied = requireAnyPermission(['view_traceability','view_kpi','manage_data']); if (denied) return denied; return dataProvider.getStationTraceInfo(); });
safeIpcHandle('save-data-provider-config', (_e, cfg) => { const denied = requireAnyPermission(['manage_data','config_hardware']); if (denied) return denied; return dataProvider.updateConfig(cfg || {}); });
safeIpcHandle('test-data-provider-server', (_e, url) => { const denied = requireAnyPermission(['manage_data','config_hardware']); if (denied) return denied; return dataProvider.testServerConnection(url); });
safeIpcHandle('sync-data-provider-now', async () => { const denied = requirePermission('manage_data'); if (denied) return denied; return dataProvider.syncNow(); });
safeIpcHandle('get-sync-queue-preview', (_e, limit) => { const denied = requirePermission('manage_data'); if (denied) return denied; return dataProvider.getQueuePreview(Number(limit || 30)); });
safeIpcHandle('retry-failed-sync-queue', async () => {
  const denied = requirePermission('manage_data'); if (denied) return denied;
  dataProvider.markFailedForRetry();
  return dataProvider.syncNow();
});
safeIpcHandle('clear-synced-sync-queue', () => { const denied = requirePermission('manage_data'); if (denied) return denied; return dataProvider.clearSyncedItems(); });

safeIpcHandle('get-enterprise-database-dashboard', () => {
  const denied = requirePermission('manage_data'); if (denied) return denied;
  return dataProvider.getEnterpriseDashboard();
});

safeIpcHandle('migrate-enterprise-database', () => {
  const denied = requirePermission('manage_data'); if (denied) return denied;
  let authData: any = { users: [], roles: [] };
  try {
    const usersPath = path.join(process.cwd(), 'config', 'users.json');
    if (fs.existsSync(usersPath)) authData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  } catch {}
  const roleRows = Array.isArray(authData.roles)
    ? authData.roles
    : Object.keys(authData.roles || {}).map(name => ({ role: name, ...(authData.roles[name] || {}) }));
  return dataProvider.migrateEnterpriseFoundation({
    users: Array.isArray(authData.users) ? authData.users : [],
    roles: roleRows
  });
});

safeIpcHandle('backup-enterprise-database', (_e, label) => {
  const denied = requirePermission('manage_data'); if (denied) return denied;
  return dataProvider.backupEnterpriseDatabase(label || 'manuale');
});

safeIpcHandle('verify-enterprise-database', () => {
  const denied = requirePermission('manage_data'); if (denied) return denied;
  return dataProvider.verifyEnterpriseDatabase();
});

safeIpcHandle('export-enterprise-database', async () => {
  const denied = requirePermission('manage_data'); if (denied) return denied;
  const save = await dialog.showSaveDialog(mainWindow!, {
    title: 'Esporta database enterprise AT-MEC',
    defaultPath: `AT-MEC_enterprise_database_${new Date().toISOString().slice(0,10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (save.canceled || !save.filePath) return { ok: false, canceled: true };
  fs.writeFileSync(save.filePath, JSON.stringify(dataProvider.exportEnterpriseDatabase(), null, 2), 'utf8');
  return { ok: true, filePath: save.filePath };
});


safeIpcHandle('get-kpi', () => {
  const denied = requirePermission('view_kpi'); if (denied) return denied;
  return { total: kpiTotal, passed: kpiPassed, failed: kpiFailed, yield: kpiTotal > 0 ? ((kpiPassed / kpiTotal) * 100).toFixed(1) + '%' : '0%' };
});

safeIpcHandle('save-recipe', async (_e, { name, recipe }: { name: string; recipe: Recipe }) => {
  const denied = requirePermission('edit_recipe'); if (denied) return denied;
  const recipesDir = path.join(process.cwd(), 'recipes');
  if (!fs.existsSync(recipesDir)) fs.mkdirSync(recipesDir, { recursive: true });
  const baseName = String(name || recipe?.recipe_name || 'Nuova Ricetta').trim() || 'Nuova Ricetta';
  const rev = dataProvider.saveRecipeVersion({ ...recipe, recipe_name: baseName }, userManager.getCurrentOperator(), 'Salvataggio da HMI');
  const filePath = path.join(recipesDir, `${baseName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(rev.recipe, null, 2));
  return { ok: true, filePath, version: rev.version, revisionId: rev.id };
});

safeIpcHandle('load-recipe', async (_e, name: string) => {
  const fromDb = dataProvider.loadRecipe(name);
  if (fromDb) return { ok: true, recipe: fromDb };
  const filePath = path.join(process.cwd(), 'recipes', `${name}.json`);
  if (!fs.existsSync(filePath)) return { ok: false, error: 'Ricetta non trovata.' };
  const recipe: Recipe = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return { ok: true, recipe };
});

safeIpcHandle('list-recipes', () => {
  const names = new Set<string>();
  for (const r of dataProvider.listRecipes()) names.add(r.recipe_name);
  const recipesDir = path.join(process.cwd(), 'recipes');
  if (fs.existsSync(recipesDir)) {
    fs.readdirSync(recipesDir).filter(f => f.endsWith('.json')).forEach(f => names.add(f.replace('.json', '')));
  }
  return Array.from(names).sort();
});


function getConfigDir(): string {
  const dir = path.join(process.cwd(), 'config');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function logoDataUrl(filePath: string): string {
  try {
    if (!fs.existsSync(filePath)) return '';
    const ext = path.extname(filePath).replace('.', '').toLowerCase();
    const mime = ext === 'jpg' ? 'jpeg' : (ext || 'png');
    return `data:image/${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
  } catch { return ''; }
}

function getDefaultLogoSettings(): any {
  const base = path.join(process.cwd(), 'assets', 'default_logos');
  const mLogo = path.join(base, 'M_LOGO.png');
  const mecLogo = path.join(base, 'MEC.PNG');
  const mirzaLogo = fs.existsSync(path.join(base, 'MIRZA.png')) ? path.join(base, 'MIRZA.png') : path.join(base, 'MIRZA_LOGO.png');
  const mirzaGif = fs.existsSync(path.join(base, 'MIRZA_Animation.gif')) ? path.join(base, 'MIRZA_Animation.gif') : mirzaLogo;
  return {
    loginLargeLogoPath: mirzaLogo,
    loginLargeLogoDataUrl: logoDataUrl(mirzaLogo),
    loginSmallLogoPath: mecLogo,
    loginSmallLogoDataUrl: logoDataUrl(mecLogo),
    hmiLargeLogoPath: mecLogo,
    hmiLargeLogoDataUrl: logoDataUrl(mecLogo),
    appLargeLogoPath: mecLogo,
    appLargeLogoDataUrl: logoDataUrl(mecLogo),
    developerSmallLogoPath: mirzaLogo,
    developerSmallLogoDataUrl: logoDataUrl(mirzaLogo),
    reportLargeLogoPath: mecLogo,
    reportLargeLogoDataUrl: logoDataUrl(mecLogo),
    reportSmallLogoPath: mirzaLogo,
    reportSmallLogoDataUrl: logoDataUrl(mirzaLogo),
    companyLogoPath: mecLogo,
    companyLogoDataUrl: logoDataUrl(mecLogo),
    builderLogoPath: mirzaLogo,
    builderLogoDataUrl: logoDataUrl(mirzaLogo),
    logoBackgroundMode: 'white',
    keysightMode: 'USB_VISA',
    keysightIp: 'USB0::0x2A8D::0x1301::MY57216945::0::INSTR',
    keysightPort: 9600
  };
}

function readAppSettings(): any {
  const defaults = getDefaultLogoSettings();
  const file = path.join(getConfigDir(), 'app_settings.json');
  if (!fs.existsSync(file)) return defaults;
  try { return { ...defaults, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { return defaults; }
}

function writeAppSettings(settings: any): any {
  const file = path.join(getConfigDir(), 'app_settings.json');
  let current: any = {};
  if (fs.existsSync(file)) { try { current = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { current = {}; } }
  const merged = { ...current, ...(settings || {}) };
  fs.writeFileSync(file, JSON.stringify(merged, null, 2));
  return readAppSettings();
}

safeIpcHandle('get-app-settings', () => readAppSettings());
safeIpcHandle('reset-default-logos', () => { const denied = requirePermission('manage_branding'); if (denied) return denied; return { ok: true, settings: writeAppSettings(getDefaultLogoSettings()) }; });
safeIpcHandle('save-app-settings', (_e, settings) => {
  const required = classifySettingsPermissions(settings);
  for (const perm of required) { const denied = requirePermission(perm); if (denied) return denied; }
  return { ok: true, settings: writeAppSettings(settings) };
});
safeIpcHandle('select-logo-file', async (_e, kind: string) => {
  const denied = requirePermission('manage_branding'); if (denied) return denied;
  const safeKind = String(kind || 'company').replace(/[^a-zA-Z0-9_-]/g, '_');
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Immagini', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  const src = result.filePaths[0];
  const ext = path.extname(src) || '.png';
  const logoDir = path.join(getConfigDir(), 'logos');
  if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });
  const dst = path.join(logoDir, `${safeKind}_logo${ext}`);
  fs.copyFileSync(src, dst);
  const rawExt = ext.replace('.', '').toLowerCase();
  const mime = rawExt === 'jpg' ? 'jpeg' : rawExt;
  const dataUrl = `data:image/${mime};base64,${fs.readFileSync(dst).toString('base64')}`;
  const settings = writeAppSettings({ [`${safeKind}LogoPath`]: dst, [`${safeKind}LogoDataUrl`]: dataUrl });
  return { ok: true, path: dst, dataUrl, settings };
});



// AT-MEC_HM_4.13G - selezione loghi cliente/firme da percorso libero con copia nel progetto.
safeIpcHandle('select-customer-logo-file-413c', async (_e, customerName: string) => {
  const denied = requirePermission('manage_branding'); if (denied) return denied;
  const safeName = String(customerName || 'CLIENTE').replace(/[^a-zA-Z0-9_-]/g, '_') || 'CLIENTE';
  const result = await dialog.showOpenDialog({
    title: 'Seleziona logo cliente',
    filters: [{ name: 'Immagini', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  const src = result.filePaths[0];
  const ext = (path.extname(src) || '.png').toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) {
    return { ok: false, error: 'Formato logo non supportato. Usa PNG, JPG, WEBP o SVG.' };
  }
  const stat = fs.statSync(src);
  if (stat.size > 5 * 1024 * 1024) {
    return { ok: false, error: 'Logo troppo grande. Limite consigliato: 5 MB.' };
  }
  const customersDir = path.join(process.cwd(), 'assets', 'customers');
  if (!fs.existsSync(customersDir)) fs.mkdirSync(customersDir, { recursive: true });
  const fileName = `${safeName}${ext}`;
  const dst = path.join(customersDir, fileName);
  fs.copyFileSync(src, dst);
  // IMPORTANTE: non ritorniamo base64/dataUrl. Il renderer salva solo il percorso relativo.
  return { ok: true, sourcePath: src, path: dst, relativePath: `assets/customers/${fileName}`, fileName };
});

safeIpcHandle('select-signature-file-413c', async (_e, username: string) => {
  const denied = requirePermission('manage_branding'); if (denied) return denied;
  const safeName = String(username || 'firma').replace(/[^a-zA-Z0-9_-]/g, '_') || 'firma';
  const result = await dialog.showOpenDialog({
    title: 'Seleziona immagine firma',
    filters: [{ name: 'Immagini', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  const src = result.filePaths[0];
  const ext = (path.extname(src) || '.png').toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) {
    return { ok: false, error: 'Formato firma non supportato. Usa PNG, JPG, WEBP o SVG.' };
  }
  const stat = fs.statSync(src);
  if (stat.size > 5 * 1024 * 1024) {
    return { ok: false, error: 'Immagine firma troppo grande. Limite consigliato: 5 MB.' };
  }
  const sigDir = path.join(process.cwd(), 'assets', 'signatures');
  if (!fs.existsSync(sigDir)) fs.mkdirSync(sigDir, { recursive: true });
  const fileName = `${safeName}_signature${ext}`;
  const dst = path.join(sigDir, fileName);
  fs.copyFileSync(src, dst);
  // IMPORTANTE: non ritorniamo base64/dataUrl. Il renderer salva solo il percorso relativo.
  return { ok: true, sourcePath: src, path: dst, relativePath: `assets/signatures/${fileName}`, fileName };
});
safeIpcHandle('export-recipe-as', async (_e, { name, recipe }) => {
  const denied = requirePermission('edit_recipe'); if (denied) return denied;
  const safeName = String(name || recipe?.recipe_name || 'ricetta').replace(/[\/:*?"<>|]/g, '_');
  const result = await dialog.showSaveDialog({
    title: 'Esporta ricetta',
    defaultPath: `${safeName}.json`,
    filters: [{ name: 'Ricetta ATE-MEC', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false };
  fs.writeFileSync(result.filePath, JSON.stringify(recipe, null, 2));
  return { ok: true, filePath: result.filePath };
});

safeIpcHandle('import-recipe-from', async () => {
  const denied = requirePermission('edit_recipe'); if (denied) return denied;
  const result = await dialog.showOpenDialog({
    title: 'Importa ricetta',
    filters: [{ name: 'Ricetta ATE-MEC', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  const filePath = result.filePaths[0];
  const recipe = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return { ok: true, filePath, recipe };
});

safeIpcHandle('open-file-dialog', async () => {
  const denied = requirePermission('edit_recipe'); if (denied) return denied;
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Firmware', extensions: ['hex', 'bin', 'elf'] }],
    properties: ['openFile']
  });
  return result.canceled ? null : result.filePaths[0];
});

safeIpcHandle('select-instruction-image', async () => {
  const denied = requirePermission('edit_recipe'); if (denied) return denied;
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Immagini', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).replace('.', '').toLowerCase() || 'png';
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  const data = fs.readFileSync(filePath).toString('base64');
  return { ok: true, path: filePath, dataUrl: `data:image/${mime};base64,${data}` };
});

safeIpcHandle('open-certificates-folder', () => {
  const denied = requirePermission('manage_data'); if (denied) return denied;
  const certDir = path.join(process.cwd(), 'certificates');
  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
  require('electron').shell.openPath(certDir);
  return { ok: true };
});
