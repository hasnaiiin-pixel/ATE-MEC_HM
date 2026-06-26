/**
 * DeviceManager - Hardware Abstraction Layer AT-MEC.
 *
 * Coordina strumenti reali e mock: ESP32 USB JSON, SCPI, seriali e alimentatori.
 * Le operazioni ESP32 sono serializzate con una queue unica per evitare concorrenza
 * sulla porta USB e blocchi dopo letture/scritture ravvicinate.
 */
import * as net from 'net';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import ModbusRTU from 'modbus-serial';
import { SerialPort } from 'serialport';
import { CalibrationManager } from './CalibrationManager';
import { Esp32SerialProvider, Esp32PinMapEntry } from './Esp32SerialProvider';

export interface DeviceStatus {
  name: string;
  connected: boolean;
  mock: boolean;
  connectionString: string;
}

export class DeviceManager {
  private mockMode: Record<string, boolean> = {};
  private scpiSockets: Record<string, net.Socket> = {};
  private modbusClient: ModbusRTU | null = null;
  private ttiSerialPort: SerialPort | null = null;
  private scpiSerialPorts: Record<string, SerialPort> = {};
  private visaResources: Record<string, string> = {};
  private calibration = new CalibrationManager();
  private esp32Serial: Esp32SerialProvider | null = null;
  private deviceRegistry: Record<string, string> = {};
  private digitalOutputStates: Record<number, boolean> = {};
  private modbusQueue: Promise<any> = Promise.resolve();
  private modbusPortPath = '';
  private modbusBaudRate = 115200;
  private modbusTimeoutCount = 0;

  public async connectDevice(deviceName: string, connectionString: string, portOrBaud: number = 5025): Promise<boolean> {
    // AT-MEC_HM_3.1: nome strumento ufficiale Keysight 34461A.
    // Per retrocompatibilità accettiamo anche eventuali vecchie ricette/configurazioni 34465A.
    if (deviceName === 'Keysight_34465A') deviceName = 'Keysight_34461A';
    const previousConnection = this.deviceRegistry[deviceName];
    this.deviceRegistry[deviceName] = connectionString;
    // AT-MEC 2.24: se uno strumento è già connesso sulla stessa porta non chiudere/riaprire.
    // Questo evita disconnessioni durante il Test Mode e riduce timeout falsi.
    if ((deviceName === 'modbus_serial' || deviceName === 'esp32_serial') && this.esp32Serial?.isConnected?.() && connectionString === this.modbusPortPath && !this.getMockMode('modbus_serial')) {
      return true;
    }

    if (connectionString === '127.0.0.1' || connectionString === 'mock') {
      this.mockMode[deviceName] = true;
      console.log(`[HAL] ${deviceName} avviato in MODALITÀ SIMULATA.`);
      return true;
    }

    if (deviceName === 'esp32_serial') {
      this.esp32Serial = new Esp32SerialProvider();
      try {
        await this.esp32Serial.connect(connectionString, portOrBaud);
        this.mockMode[deviceName] = false;
        console.log(`[HAL] ESP32-S3 connesso via USB seriale su ${connectionString}`);
        return true;
      } catch (err) {
        this.mockMode[deviceName] = true;
        console.log(`[HAL] ESP32-S3 seriale non trovato su ${connectionString}. Attivata simulazione.`, err);
        return true;
      }
    }

    if (deviceName === 'modbus_serial') {
      // AT-MEC_HM_1_4: manteniamo il nome logico "modbus_serial" per non cambiare
      // ricette e validazioni, ma il backend stabile verso ESP32 è USB JSON.
      // Il firmware JSON pulito è quello che l'utente ha verificato funzionante.
      this.modbusPortPath = connectionString;
      this.modbusBaudRate = portOrBaud;
      this.modbusTimeoutCount = 0;
      await this.closeModbusQuietly();
      try { this.esp32Serial?.close(); } catch {}
      this.esp32Serial = new Esp32SerialProvider();
      try {
        await this.withLocalTimeout(this.esp32Serial.connect(connectionString, portOrBaud), 3500, 'connect ESP32 JSON');
        this.mockMode[deviceName] = false;
        console.log(`[HAL] ESP32-S3 connessa su ${connectionString} come modbus_serial/logico via JSON USB`);
        return true;
      } catch (err) {
        try { this.esp32Serial?.close(); } catch {}
        this.esp32Serial = null;
        this.mockMode[deviceName] = true;
        console.log(`[HAL] ESP32-S3 JSON non trovata su ${connectionString}. Attivata simulazione modbus_serial.`, err);
        return true;
      }
    }

    if (deviceName === 'AimTTi_PL303') {
      if (previousConnection === connectionString && !this.getMockMode(deviceName) && (this.ttiSerialPort?.isOpen || (this.scpiSockets[deviceName] && !this.scpiSockets[deviceName].destroyed))) {
        return true;
      }
      // AT-MEC_HM_2.15: driver dedicato alimentatore Aim-TTi PL303QMD-P.
      // Supporta due modalità: USB/seriale (COMx) ed Ethernet/TCP SCPI.
      // Se la connessione fallisce non blocca la HMI: passa in MOCK e segnala lo stato.
      await this.safeCloseSerialPort(this.ttiSerialPort, 'PL303 porta precedente');
      this.ttiSerialPort = null;
      delete this.scpiSockets[deviceName];
      const conn = String(connectionString || '').trim();
      const isTcp = conn.startsWith('tcp://') || /^\d+\.\d+\.\d+\.\d+$/.test(conn) || /^[a-zA-Z0-9_.-]+:\d+$/.test(conn);
      if (isTcp) {
        const clean = conn.replace(/^tcp:\/\//, '');
        const [host, portText] = clean.includes(':') ? clean.split(':') : [clean, String(portOrBaud || 9221)];
        return new Promise((resolve) => {
          const socket = new net.Socket();
          socket.setTimeout(2200);
          socket.connect(Number(portText || 9221), host, () => {
            this.scpiSockets[deviceName] = socket;
            this.mockMode[deviceName] = false;
            console.log(`[HAL] Alimentatore Aim-TTi PL303QMD-P connesso Ethernet ${host}:${portText || 9221}`);
            resolve(true);
          });
          socket.on('timeout', () => { socket.destroy(); this.mockMode[deviceName] = true; console.log(`[HAL] PL303 TCP timeout su ${host}. MOCK attivo.`); resolve(true); });
          socket.on('error', () => { this.mockMode[deviceName] = true; console.log(`[HAL] PL303 TCP errore su ${host}. MOCK attivo.`); resolve(true); });
        });
      }
      return new Promise((resolve) => {
        this.ttiSerialPort = new SerialPort({ path: conn, baudRate: portOrBaud }, (err) => {
          if (err) {
            console.log(`[HAL] Alimentatore Aim-TTi PL303QMD-P non trovato su ${conn}. Attivata simulazione.`);
            this.mockMode[deviceName] = true;
          } else {
            console.log(`[HAL] Alimentatore Aim-TTi PL303QMD-P connesso via USB su ${conn}`);
            this.mockMode[deviceName] = false;
          }
          resolve(true);
        });
      });
    }

    if (deviceName === 'Keysight_34461A') {
      if (previousConnection === connectionString && !this.getMockMode(deviceName) && (this.visaResources[deviceName] || this.scpiSerialPorts[deviceName]?.isOpen || (this.scpiSockets[deviceName] && !this.scpiSockets[deviceName].destroyed))) {
        return true;
      }
      // Driver Keysight 34461A. Modalità supportate:
      // - Ethernet/LAN SCPI: IP o tcp://IP:5025
      // - USB seriale/COM quando disponibile come porta virtuale
      // - USB/VISA/USBTMC: previsto come configurazione; se non esiste un bridge VISA resta in MOCK esplicito
      await this.safeCloseSerialPort(this.scpiSerialPorts[deviceName], `${deviceName} porta seriale precedente`);
      delete this.scpiSerialPorts[deviceName];
      delete this.scpiSockets[deviceName];
      const conn = String(connectionString || '').trim();
      const cleanUsb = conn.replace(/^usb:\/\//i, '').replace(/^visa:\/\//i, '');
      const isVisaResource = /^visa:\/\//i.test(conn) || /^(USB|TCPIP|GPIB).*::INSTR$/i.test(conn);
      if (isVisaResource) {
        const resource = cleanUsb;
        try {
          const out = await this.execVisaBridge(['query', resource, '*IDN?'], 15000);
          if (!out?.ok) throw new Error(out?.error || 'Risposta VISA non valida');
          const idn = String(out.response || '').trim();
          // AT-MEC_HM_3.5: accetta risposte valide anche se Keysight restituisce
          // "Keysight Technologies" con maiuscole/minuscole diverse.
          // Lo strumento è LIVE se risponde a *IDN? e la risposta contiene 34461A o Keysight.
          if (!idn || (!/34461A/i.test(idn) && !/KEYSIGHT/i.test(idn))) {
            throw new Error(`Risposta *IDN? inattesa da Keysight 34461A: ${idn || 'vuota'}`);
          }
          this.visaResources[deviceName] = resource;
          this.mockMode[deviceName] = false;
          console.log(`[HAL] Keysight 34461A LIVE USB/VISA ${resource}: ${idn}`);
          return true;
        } catch (err: any) {
          delete this.visaResources[deviceName];
          this.mockMode[deviceName] = true;
          console.log(`[HAL] Keysight 34461A VISA non disponibile su ${resource}. MOCK attivo.`, err?.message || err);
          return true;
        }
      }
      if (/^COM\d+$/i.test(cleanUsb) || cleanUsb.startsWith('/dev/')) {
        return new Promise((resolve) => {
          this.scpiSerialPorts[deviceName] = new SerialPort({ path: cleanUsb, baudRate: Number(portOrBaud) || 9600 }, (err) => {
            if (err) {
              this.mockMode[deviceName] = true;
              console.log(`[HAL] Keysight 34461A USB/COM non trovato su ${cleanUsb}. MOCK attivo.`);
            } else {
              this.mockMode[deviceName] = false;
              console.log(`[HAL] Keysight 34461A connesso USB/COM su ${cleanUsb}`);
            }
            resolve(true);
          });
        });
      }
      // Altrimenti prosegue come strumento TCP/IP SCPI su porta 5025.
    }

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.connect(portOrBaud, connectionString, () => {
        this.mockMode[deviceName] = false;
        this.scpiSockets[deviceName] = socket;
        console.log(`[HAL] Strumento TCP ${deviceName} connesso presso ${connectionString}:${portOrBaud}`);
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        this.mockMode[deviceName] = true;
        console.log(`[HAL] ${deviceName} TCP timeout su ${connectionString}. Attivata simulazione.`);
        resolve(true);
      });
      socket.on('error', () => {
        this.mockMode[deviceName] = true;
        console.log(`[HAL] ${deviceName} TCP disconnesso su ${connectionString}. Attivata simulazione.`);
        resolve(true);
      });
    });
  }



  private withLocalTimeout<T>(task: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    return Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms);
      })
    ]).finally(() => { if (timer) clearTimeout(timer); });
  }

  /**
   * AT-MEC_HM_3.8 - Chiusura seriale sicura.
   * Evita il crash Electron "Port is not open" quando un driver prova a chiudere
   * una porta seriale gia chiusa o mai aperta. L'errore viene registrato come warning
   * e non viene propagato al main process.
   */
  private async safeCloseSerialPort(port: any, label = 'porta seriale'): Promise<void> {
    if (!port) return;
    try {
      if (port.isOpen === false) return;
      await new Promise<void>((resolve) => {
        try {
          port.close?.((err?: Error) => {
            if (err && !/Port is not open/i.test(err.message || '')) console.warn(`[HAL] ${label}: errore close non critico:`, err.message || err);
            resolve();
          });
        } catch (err: any) {
          if (!/Port is not open/i.test(err?.message || '')) console.warn(`[HAL] ${label}: eccezione close non critica:`, err?.message || err);
          resolve();
        }
      });
    } catch (err: any) {
      if (!/Port is not open/i.test(err?.message || '')) console.warn(`[HAL] ${label}: close ignorato:`, err?.message || err);
    }
  }

  private safeCloseSerialPortSync(port: any, label = 'porta seriale'): void {
    if (!port) return;
    try {
      if (port.isOpen === false) return;
      port.close?.((err?: Error) => {
        if (err && !/Port is not open/i.test(err.message || '')) console.warn(`[HAL] ${label}: errore close non critico:`, err.message || err);
      });
    } catch (err: any) {
      if (!/Port is not open/i.test(err?.message || '')) console.warn(`[HAL] ${label}: eccezione close non critica:`, err?.message || err);
    }
  }

  private async closeModbusQuietly(): Promise<void> {
    try { await new Promise<void>((resolve) => this.modbusClient?.close?.(() => resolve()) || resolve()); } catch {}
    this.modbusClient = null;
  }



  /**
   * Esegue il bridge Python VISA per strumenti USBTMC/VISA come Keysight 34461A.
   * AT-MEC non include librerie Keysight proprietarie: usa Keysight IO Libraries installate
   * sul PC e PyVISA come ponte leggero. In caso di assenza di Python/PyVISA ritorna errore chiaro.
   */
  private async execVisaBridge(args: string[], timeoutMs = 15000): Promise<any> {
    const scriptCandidates = [
      path.join(process.cwd(), 'scripts', 'keysight_visa_bridge.py'),
      path.join(__dirname, '..', '..', 'scripts', 'keysight_visa_bridge.py'),
      path.join((process as any).resourcesPath || process.cwd(), 'scripts', 'keysight_visa_bridge.py')
    ];
    const script = scriptCandidates.find(p => fs.existsSync(p));
    if (!script) throw new Error('Bridge VISA non trovato: scripts/keysight_visa_bridge.py');

    const pyCandidates = process.platform === 'win32'
      ? [{ exe: 'py', prefix: ['-3'] }, { exe: 'python', prefix: [] }, { exe: 'python3', prefix: [] }]
      : [{ exe: 'python3', prefix: [] }, { exe: 'python', prefix: [] }];

    let lastErr: any = null;
    for (const c of pyCandidates) {
      try {
        return await new Promise<any>((resolve, reject) => {
          const child = execFile(c.exe, [...c.prefix, script, ...args], { timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
            if (err) { reject(new Error(stderr?.trim() || err.message)); return; }
            try { resolve(JSON.parse(stdout || '{}')); }
            catch { reject(new Error(`Risposta bridge VISA non valida: ${stdout || stderr}`)); }
          });
          child.on('error', reject);
        });
      } catch (err) {
        lastErr = err;
      }
    }
    throw new Error(`Python/PyVISA non disponibile: ${lastErr?.message || lastErr}`);
  }

  /** Scansione risorse VISA disponibili, es. USB0::0x2A8D::0x1301::MY...::INSTR. */
  public async scanVisaResources(): Promise<Array<{ resource: string; idn?: string; ok: boolean; error?: string }>> {
    try {
      const res = await this.execVisaBridge(['list'], 8000);
      return Array.isArray(res.resources) ? res.resources : [];
    } catch (err: any) {
      return [{ resource: '', ok: false, error: err?.message || String(err) }];
    }
  }

  private async reconnectModbusAfterFault(): Promise<void> {
    if (!this.modbusPortPath || this.mockMode['modbus_serial']) return;
    const port = this.modbusPortPath;
    const baud = this.modbusBaudRate || 115200;
    await this.closeModbusQuietly();
    this.modbusClient = new ModbusRTU();
    try {
      await this.withLocalTimeout(this.modbusClient.connectRTUBuffered(port, { baudRate: baud }), 2500, 'modbus reconnect');
      await this.withLocalTimeout(Promise.resolve(this.modbusClient.setID(1)), 500, 'modbus setID');
      try { this.modbusClient.setTimeout?.(800); } catch {}
      this.mockMode['modbus_serial'] = false;
      this.modbusTimeoutCount = 0;
      console.log(`[HAL] Modbus seriale ripristinato su ${port}`);
    } catch (err) {
      await this.closeModbusQuietly();
      this.mockMode['modbus_serial'] = true;
      console.error('[HAL] Ripristino Modbus fallito:', err);
    }
  }

  private runModbusExclusive<T>(label: string, fn: () => Promise<T>, timeoutMs = 1200): Promise<T> {
    const run = async () => {
      if (this.mockMode['modbus_serial']) throw new Error('modbus_serial in MOCK');
      if (!this.modbusClient) throw new Error('modbus_serial non connesso');
      try {
        const result = await this.withLocalTimeout(fn(), timeoutMs, label);
        this.modbusTimeoutCount = 0;
        await new Promise(res => setTimeout(res, 20));
        return result;
      } catch (err) {
        this.modbusTimeoutCount++;
        console.error(`[HAL] ${label} fallito:`, err);
        if (this.modbusTimeoutCount >= 2) {
          await this.reconnectModbusAfterFault();
        }
        throw err;
      }
    };
    const chained = this.modbusQueue.then(run, run);
    this.modbusQueue = chained.catch(() => undefined);
    return chained;
  }

  /**
   * Protezione anti-blocco della coda ESP32.
   * Tutte le operazioni GPIO passano qui, una alla volta, con timeout e reset MOCK
   * dopo errori ripetuti. In questo modo una richiesta lenta non paralizza la HMI.
   */
  private runEsp32Exclusive<T>(label: string, fn: () => Promise<T>, timeoutMs = 1500): Promise<T> {
    const run = async () => {
      if (this.mockMode['modbus_serial']) throw new Error('modbus_serial in MOCK');
      if (!this.esp32Serial?.isConnected()) throw new Error('ESP32 JSON non connessa');
      try {
        const result = await this.withLocalTimeout(fn(), timeoutMs, label);
        this.modbusTimeoutCount = 0;
        await new Promise(res => setTimeout(res, 10));
        return result;
      } catch (err) {
        this.modbusTimeoutCount++;
        console.error(`[HAL] ${label} fallito:`, err);
        if (this.modbusTimeoutCount >= 3) {
          // AT-MEC 2.24: non scollegare subito la ESP32. Mantieni la porta aperta e tenta un
          // handshake leggero; solo se la porta è realmente chiusa passa a MOCK.
          if (!this.esp32Serial?.isConnected?.()) {
            this.mockMode['modbus_serial'] = true;
            try { this.esp32Serial?.close(); } catch {}
            this.esp32Serial = null;
          }
        }
        throw err;
      }
    };
    const chained = this.modbusQueue.then(run, run);
    this.modbusQueue = chained.catch(() => undefined);
    return chained;
  }

  public getMockMode(name: string): boolean {
    if (name === 'Keysight_34465A') name = 'Keysight_34461A';
    return this.mockMode[name] ?? true;
  }

  public getAllStatuses(): DeviceStatus[] {
    return Object.keys(this.deviceRegistry).map(name => ({
      name,
      connected: !this.getMockMode(name),
      mock: this.getMockMode(name),
      connectionString: this.deviceRegistry[name]
    }));
  }

  public isDeviceLive(name: string): boolean {
    // AT-MEC_HM_2.17: la ricetta continua a richiedere "modbus_serial" come nome logico,
    // ma l'hardware reale è ESP32 USB JSON. Se il backend ESP32 è connesso, lo stato è LIVE.
    if (name === 'modbus_serial') {
      return Boolean(this.esp32Serial?.isConnected?.()) && !this.getMockMode('modbus_serial');
    }
    return this.deviceRegistry[name] !== undefined && !this.getMockMode(name);
  }

  public getProfessionalDeviceList(): Array<{ group: string; name: string; label: string; live: boolean; connectionString: string; mock: boolean; required: boolean }> {
    const rows = [
      { group: 'Controller I/O', name: 'modbus_serial', label: 'ESP32-S3 USB JSON' },
      { group: 'Alimentatori', name: 'AimTTi_PL303', label: 'Alimentatore PL303QMD-P' },
      { group: 'Multimetri', name: 'Keysight_34461A', label: 'Keysight 34461A Multimetro SCPI Ethernet/USB' },
      { group: 'Scanner', name: 'QR_Scanner', label: 'Scanner QR / Barcode' }
    ];
    return rows.map(r => ({
      ...r,
      live: this.isDeviceLive(r.name) || r.name === 'QR_Scanner',
      mock: r.name === 'QR_Scanner' ? false : this.getMockMode(r.name),
      connectionString: this.deviceRegistry[r.name] || (r.name === 'QR_Scanner' ? 'HID/Webcam/manuale' : 'non configurato'),
      required: false
    }));
  }

  public validateRecipeHardware(recipe: { power_metadata?: string; steps?: Array<{ device_mapping?: string; io_type?: string; type?: string; enabled?: boolean; manual_measure_type?: string; manual_input_enabled?: boolean }> }): { ok: boolean; missing: string[] } {
    const required = new Set<string>();
    const normalizeRequired = (name: string): string => {
      const n = String(name || '').trim().toLowerCase();
      if (!n) return '';
      if (n.includes('modbus_serial') || n.includes('esp32') || n === 'esp32_serial') return 'modbus_serial';
      if (n.includes('aimtti_pl303') || n.includes('pl303') || n.includes('tti')) return 'AimTTi_PL303';
      if (n.includes('keysight') || n.includes('34461') || n.includes('34465') || n.includes('multimeter') || n.includes('multimetro') || n.includes('dmm')) return 'Keysight_34461A';
      if (n.includes('scanner') || n.includes('qr')) return 'QR_Scanner';
      return String(name || '').trim();
    };
    const addRequired = (name: string) => {
      const normalized = normalizeRequired(name);
      if (normalized && normalized !== 'QR_Scanner') required.add(normalized);
    };

    if (recipe.power_metadata === 'PL303_PROGRAMMABLE') addRequired('AimTTi_PL303');
    if (recipe.power_metadata === 'ESP32_RELAY_POWER') addRequired('modbus_serial');

    for (const step of recipe.steps || []) {
      if (step.enabled === false) continue;
      const device = String(step.device_mapping || '').trim();
      const deviceKey = device.toLowerCase();

      // AT-MEC_HM_4.10H: gli step manuali/operatori non sono hardware LIVE.
      // In precedenza device_mapping:'manual' entrava tra gli strumenti richiesti e bloccava
      // l'avvio con errore: "Hardware richiesto non LIVE: manual".
      if (!device || deviceKey === 'manual' || deviceKey === 'manuale' || deviceKey === 'operator' || deviceKey === 'system' || deviceKey === 'none') {
        if (step.type === 'ManualMeasurement') continue;
      }
      if (['DI', 'DO'].includes(step.io_type || '') || step.type === 'DigitalInputCheck' || step.type === 'DigitalOutputSet') { addRequired('modbus_serial'); continue; }
      if (['VoltageMeasurement','CurrentMeasurement','ResistanceTest','FrequencyTest','AnalogInputMeasurement'].includes(step.type || '')) { addRequired(device || 'Keysight_34461A'); continue; }
      if (step.type === 'ManualMeasurement') {
        const manualType = String(step.manual_measure_type || step.io_type || '').toUpperCase();
        const requiresScpiDevice = manualType === 'SCPI' || manualType.startsWith('SCPI_');
        if (requiresScpiDevice && device && !['manual','manuale','operator','system','none'].includes(deviceKey)) addRequired(device);
        continue;
      }
      if (!device || deviceKey === 'system') continue;
      addRequired(device);
    }

    const missing = Array.from(required).filter(name => !this.isDeviceLive(name));
    return { ok: missing.length === 0, missing };
  }

  public async writeSCPI(deviceName: string, cmd: string): Promise<void> {
    if (this.mockMode[deviceName]) return;
    if (this.visaResources[deviceName]) {
      const out = await this.execVisaBridge(['query', this.visaResources[deviceName], cmd], 15000);
      if (!out?.ok) throw new Error(out?.error || 'Errore write VISA');
      return;
    }

    if (deviceName === 'AimTTi_PL303' && this.ttiSerialPort) {
      this.ttiSerialPort.write(`${cmd}\r\n`);
      return;
    }
    if (this.scpiSockets[deviceName]) {
      this.scpiSockets[deviceName].write(`${cmd}\n`);
    }
  }

  public async querySCPI(deviceName: string, cmd: string): Promise<string> {
    if (deviceName === 'Keysight_34465A') deviceName = 'Keysight_34461A';
    if (this.mockMode[deviceName]) {
      let rawMock = 0;
      let calKey = '';
      if (cmd.includes('V1O?'))  { rawMock = 5.01 + Math.random() * 0.02; calKey = `${deviceName}_Volt`; }
      else if (cmd.includes('I1O?'))  { rawMock = 0.125 + Math.random() * 0.01; calKey = `${deviceName}_Curr`; }
      else if (cmd.includes('VOLT') || cmd.includes('MEAS:VOLT')) { rawMock = 4.98 + Math.random() * 0.04; calKey = `${deviceName}_Volt`; }
      else if (cmd.includes('CURR') || cmd.includes('MEAS:CURR')) { rawMock = 0.125 + Math.random() * 0.01; calKey = `${deviceName}_Curr`; }
      else if (cmd.includes('RES') || cmd.includes('MEAS:RES'))   { rawMock = 470 + Math.random() * 5; calKey = `${deviceName}_Volt`; }
      else if (cmd.includes('FREQ'))  { rawMock = 1000 + Math.random() * 2; calKey = `${deviceName}_Volt`; }
      else return 'MOCK_OK';
      return this.calibration.applyCalibration(calKey, rawMock).toString();
    }

    if (this.visaResources[deviceName]) {
      const out = await this.execVisaBridge(['query', this.visaResources[deviceName], cmd], 15000);
      if (!out?.ok) throw new Error(out?.error || 'Errore query VISA');
      return String(out.response || '').trim();
    }

    if (deviceName === 'AimTTi_PL303' && this.ttiSerialPort) {
      // AT-MEC_HM_3.10 TEST: query PL303 seriale non bloccante.
      // Il PL303 può rispondere lentamente o non rispondere se la porta/baud non è corretta:
      // in quel caso ritorniamo TIMEOUT invece di lasciare pendente la Promise.
      return new Promise((resolve) => {
        let raw = '';
        let done = false;
        const sp = this.ttiSerialPort!;
        const finish = (value: string) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          try { sp.off('data', onData); } catch {}
          resolve(String(value || '').trim());
        };
        const onData = (data: Buffer) => {
          raw += data.toString();
          if (raw.includes('\n') || raw.includes('\r')) finish(raw);
        };
        const timer = setTimeout(() => finish('TIMEOUT'), 1200);
        sp.on('data', onData);
        sp.write(`${cmd}\r\n`, (err?: Error | null) => { if (err) finish('TIMEOUT'); });
      });
    }

    if (this.scpiSerialPorts[deviceName]) {
      return new Promise((resolve) => {
        const sp = this.scpiSerialPorts[deviceName];
        const timer = setTimeout(() => resolve('TIMEOUT'), 2500);
        sp.once('data', (data) => { clearTimeout(timer); resolve(data.toString().trim()); });
        sp.write(`${cmd}
`);
      });
    }

    return new Promise((resolve, reject) => {
      const socket = this.scpiSockets[deviceName];
      if (!socket) { reject(new Error(`Socket non trovato per ${deviceName}`)); return; }
      socket.once('data', (data) => {
        const rawNum = parseFloat(data.toString().trim());
        if (!isNaN(rawNum)) {
          const typeKey = cmd.includes('VOLT') ? 'Volt' : 'Curr';
          resolve(this.calibration.applyCalibration(`${deviceName}_${typeKey}`, rawNum).toString());
        } else {
          resolve(data.toString().trim());
        }
      });
      socket.write(`${cmd}\n`, (err) => { if (err) reject(err); });
    });
  }

  public async setDigitalOutput(channel: number, state: boolean): Promise<void> {
    // In AT-MEC_HM_1_4 il channel È il GPIO reale serigrafato sulla scheda.
    // Esempio: channel 4 -> GPIO4 -> pin scritto 4.
    this.digitalOutputStates[channel] = state;
    if (this.mockMode['modbus_serial'] || !this.esp32Serial?.isConnected()) {
      console.log(`[HAL MOCK] Digital OUT GPIO${channel} = ${state}`);
      return;
    }
    await this.runEsp32Exclusive(`writeDigital GPIO${channel}`, async () => {
      await this.esp32Serial!.writeDigital(channel, state);
    }, 1800);
  }

  public async readDigitalOutput(channel: number): Promise<boolean> {
    if (this.mockMode['modbus_serial'] || !this.esp32Serial?.isConnected()) return this.digitalOutputStates[channel] ?? false;
    const value = await this.runEsp32Exclusive(`readDigital GPIO${channel}`, async () => this.esp32Serial!.readDigital(channel), 1500);
    this.digitalOutputStates[channel] = value;
    return value;
  }

  public async readDigitalInput(channel: number): Promise<boolean> {
    if (this.mockMode['modbus_serial'] || !this.esp32Serial?.isConnected()) return Math.random() > 0.5;
    return this.runEsp32Exclusive(`readDigital GPIO${channel}`, async () => this.esp32Serial!.readDigital(channel), 1500);
  }

  public async readAnalogInput(channel: number): Promise<number> {
    if (this.mockMode['modbus_serial'] || !this.esp32Serial?.isConnected()) return Math.random() * 3.3;
    return this.runEsp32Exclusive(`readAnalog GPIO${channel}`, async () => this.esp32Serial!.readAnalog(channel), 1800);
  }

  public async writeAnalogOutput(channel: number, value: number): Promise<void> {
    if (this.mockMode['modbus_serial'] || !this.esp32Serial?.isConnected()) {
      console.log(`[HAL MOCK] Analog OUT GPIO${channel} = ${value}`);
      return;
    }
    await this.runEsp32Exclusive(`writeAnalog GPIO${channel}`, async () => {
      await this.esp32Serial!.writeAnalog(channel, value);
    }, 1800);
  }

  public setEsp32PinMap(entries: Esp32PinMapEntry[]): void {
    this.esp32Serial?.setPinMap(entries);
  }


  public async scanSerialPorts(): Promise<Array<{ path: string; manufacturer?: string; serialNumber?: string; friendlyName: string; likelyEsp32: boolean }>> {
    try {
      const ports = await SerialPort.list();
      return ports.map((p: any) => {
        const text = `${p.path || ''} ${p.manufacturer || ''} ${p.serialNumber || ''} ${p.vendorId || ''} ${p.productId || ''}`.toLowerCase();
        const likelyEsp32 = text.includes('espressif') || text.includes('esp32') || text.includes('silicon labs') || text.includes('cp210') || text.includes('ch340') || text.includes('usb jtag');
        return {
          path: p.path,
          manufacturer: p.manufacturer,
          serialNumber: p.serialNumber,
          friendlyName: `${p.path}${p.manufacturer ? ' — ' + p.manufacturer : ''}${p.serialNumber ? ' — SN ' + p.serialNumber : ''}`,
          likelyEsp32
        };
      });
    } catch (err) {
      console.error('[HAL] Errore scansione porte seriali:', err);
      return [];
    }
  }

  public getEsp32IoCatalog(): Array<{ io_type: 'DI'|'DO'|'AI'|'AO'; channel: number; label: string; gpio?: number; allowedFor: string[]; safe: boolean; note: string }> {
    // AT-MEC_HM_1_4: mappatura diretta. Il campo channel È il numero GPIO fisico serigrafato sulla scheda.
    // Esempio: channel=4 -> GPIO4 -> pin scritto "4" sulla ESP32-S3 DevKitC-1.
    const usableDigital = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,21,47,48];
    const analogCapable = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
    const reserved = [0,19,20,43,44,45,46];
    const special = [35,36,37,38,39,40,41,42];
    const row = (io_type: 'DI'|'DO'|'AI'|'AO', gpio: number, safe: boolean, note: string) => ({
      io_type,
      channel: gpio,
      gpio,
      label: `GPIO${gpio}`,
      allowedFor: io_type === 'DO' ? ['DigitalOutputSet'] : io_type === 'DI' ? ['DigitalInputCheck'] : io_type === 'AI' ? ['AnalogInputMeasurement'] : ['AnalogOutputSet'],
      safe,
      note
    });
    return [
      ...usableDigital.map(gpio => row('DO', gpio, true, `Uscita digitale diretta: GPIO${gpio} = pin ${gpio} sulla scheda`)),
      ...usableDigital.map(gpio => row('DI', gpio, true, `Ingresso digitale diretto: GPIO${gpio} = pin ${gpio} sulla scheda`)),
      ...analogCapable.map(gpio => row('AI', gpio, true, `Ingresso analogico ADC: GPIO${gpio} = pin ${gpio}; valore 0..3.3V`)),
      ...reserved.map(gpio => row('DO', gpio, false, `RISERVATO/DA EVITARE: GPIO${gpio}. Non usare per uscite generiche.`)),
      ...reserved.map(gpio => row('DI', gpio, false, `RISERVATO/DA EVITARE: GPIO${gpio}. Non usare per ingressi generici.`)),
      ...special.map(gpio => row('DO', gpio, false, `SPI/FSPI speciale: GPIO${gpio}. Disabilitato finché non viene validato sul tuo hardware.`)),
      ...special.map(gpio => row('DI', gpio, false, `SPI/FSPI speciale: GPIO${gpio}. Disabilitato finché non viene validato sul tuo hardware.`))
    ];
  }

  public async getEsp32Info(): Promise<any> {
    const ports = await this.scanSerialPorts();
    let fwInfo: any = null;
    if (!this.mockMode['modbus_serial'] && this.esp32Serial?.isConnected()) {
      try { fwInfo = await this.runEsp32Exclusive('info ESP32', async () => this.esp32Serial!.getInfo(), 1800); } catch {}
    }
    return {
      device: 'ESP32-S3 DevKitC-1 N16R8',
      transport: 'modbus_serial logico → USB JSON',
      live: this.isDeviceLive('modbus_serial'),
      connectionString: this.deviceRegistry['modbus_serial'] || 'mock',
      firmware: fwInfo,
      ports,
      ioCatalog: this.getEsp32IoCatalog()
    };
  }


  /**
   * AT-MEC_HM_3.6 - Gestione PL303QMD-P a due canali indipendenti.
   *
   * channel=1 -> CH1, channel=2 -> CH2.
   * Comandi SCPI Aim-TTi usati:
   * - V<ch> <volt>  imposta tensione canale
   * - I<ch> <ampere> imposta limite corrente canale
   * - OP<ch> 0/1    uscita canale OFF/ON
   * La funzione valida i range base e lavora anche in MOCK senza bloccare la HMI.
   */
  public async setPl303Output(voltage: number, current: number, outputOn: boolean, channel = 1): Promise<{ ok: boolean; voltage: number; current: number; outputOn: boolean; mock: boolean }> {
    const ch = Math.max(1, Math.min(2, Number(channel) || 1));
    const v = Math.max(0, Math.min(30.5, Number(voltage) || 0));
    const i = Math.max(0, Math.min(3.2, Number(current) || 0));
    try {
      await this.writeSCPI('AimTTi_PL303', `V${ch} ${v.toFixed(3)}`);
      await this.pl303CommandDelay(120);
      await this.writeSCPI('AimTTi_PL303', `I${ch} ${i.toFixed(3)}`);
      await this.pl303CommandDelay(120);
      await this.writeSCPI('AimTTi_PL303', `OP${ch} ${outputOn ? 1 : 0}`);
      await this.pl303CommandDelay(120);
      return { ok: true, voltage: v, current: i, outputOn: Boolean(outputOn), mock: this.getMockMode('AimTTi_PL303') };
    } catch (err: any) {
      return { ok: false, voltage: v, current: i, outputOn: Boolean(outputOn), mock: this.getMockMode('AimTTi_PL303'), error: err?.message || String(err) } as any;
    }
  }

  /** Legge lo stato sintetico del PL303 per la pagina dedicata alimentatore. */
  public async getPl303Status(channel = 1): Promise<any> {
    const ch = Math.max(1, Math.min(2, Number(channel) || 1));
    const mock = this.getMockMode('AimTTi_PL303');
    if (mock) return { ok: true, mock: true, channel: ch, voltage: 0, current: 0, outputOn: false, connectionString: this.deviceRegistry['AimTTi_PL303'] || 'mock' };
    const voltageRaw = await this.querySCPI('AimTTi_PL303', `V${ch}O?`).catch(() => 'TIMEOUT');
    await this.pl303CommandDelay(80);
    const currentRaw = await this.querySCPI('AimTTi_PL303', `I${ch}O?`).catch(() => 'TIMEOUT');
    const voltage = parseFloat(String(voltageRaw).replace(',', '.'));
    const current = parseFloat(String(currentRaw).replace(',', '.'));
    const timeout = String(voltageRaw).includes('TIMEOUT') || String(currentRaw).includes('TIMEOUT');
    return {
      ok: !timeout,
      mock: false,
      timeout,
      warning: timeout ? 'PL303 non ha risposto entro il timeout; controllare porta COM/baud/cavo.' : undefined,
      channel: ch,
      voltage: Number.isNaN(voltage) ? undefined : voltage,
      current: Number.isNaN(current) ? undefined : current,
      outputOn: undefined,
      connectionString: this.deviceRegistry['AimTTi_PL303'] || ''
    };
  }


  private async pl303CommandDelay(ms = 180): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * AT-MEC_HM_3.9 TEST - Spegnimento sicuro alimentatore PL303QMD-P.
   * Invia OFF CH1 e CH2 con pausa tra i comandi per evitare perdita comando su seriale lenta.

   * Disattiva sempre CH1 e CH2 in caso di chiusura app, cambio ricetta, fine test, FAIL, STOP, ABORT o EMERGENZA.
   * Non solleva eccezioni bloccanti: restituisce il dettaglio di ogni canale per log/report.
   */
  public async safePl303AllOutputsOff(reason = 'SAFETY'): Promise<{ ok: boolean; reason: string; channels: any[]; mock: boolean }> {
    const channels: any[] = [];
    const mock = this.getMockMode('AimTTi_PL303');
    // Alcuni PL303 via USB/seriale ignorano il secondo comando se arriva immediatamente dopo il primo.
    // Per sicurezza inviamo CH1 OFF, pausa, CH2 OFF, pausa, poi ripetiamo una seconda volta.
    for (const pass of [1, 2]) {
      for (const ch of [1, 2]) {
        try {
          await this.writeSCPI('AimTTi_PL303', `OP${ch} 0`);
          await this.pl303CommandDelay(220);
          if (pass === 1) channels.push({ channel: ch, ok: true, outputOn: false });
        } catch (err) {
          if (pass === 1) channels.push({ channel: ch, ok: false, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }
    return { ok: channels.every(c => c.ok), reason, channels, mock };
  }

  /**
   * AT-MEC_HM_3.7 - Misura consumo corrente dal PL303QMD-P.
   * Legge I<ch>O? dal canale selezionato e ritorna la corrente in ampere.
   */
  public async measurePl303Current(channel = 1): Promise<{ ok: boolean; channel: number; current: number; unit: string; mock: boolean; raw?: string }> {
    const ch = Math.max(1, Math.min(2, Number(channel) || 1));
    const mock = this.getMockMode('AimTTi_PL303');
    if (mock) return { ok: true, channel: ch, current: 0, unit: 'A', mock: true, raw: 'MOCK' };
    const raw = await this.querySCPI('AimTTi_PL303', `I${ch}O?`).catch(() => 'TIMEOUT');
    const current = parseFloat(String(raw).replace(',', '.'));
    const timeout = String(raw).includes('TIMEOUT');
    return { ok: true, channel: ch, current: Number.isNaN(current) ? 0 : current, unit: 'A', mock: false, raw: String(raw).trim(), timeout, warning: timeout ? 'timeout lettura corrente PL303' : undefined } as any;
  }

  public disconnect(): void {
    try { this.modbusClient?.close?.(() => undefined); } catch {}
    try { this.esp32Serial?.close(); } catch {}
    this.safeCloseSerialPortSync(this.ttiSerialPort, 'PL303 disconnect')
    for (const s of Object.values(this.scpiSockets)) { try { s.destroy(); } catch {} }
    for (const p of Object.values(this.scpiSerialPorts)) { this.safeCloseSerialPortSync(p, 'SCPI serial disconnect'); }
  }

}
