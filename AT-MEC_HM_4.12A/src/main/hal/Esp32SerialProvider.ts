/**
 * Esp32SerialProvider - backend hardware ESP32-S3 USB JSON.
 *
 * Scopo:
 * - mantenere la seriale sempre sequenziale e non bloccante;
 * - gestire timeout, disconnessioni e risposte senza id;
 * - evitare code infinite che congelano la UI.
 */
import { SerialPort } from 'serialport';

export interface Esp32PinMapEntry {
  label: string;
  gpio: number;
  mode: 'DI' | 'DO' | 'AI' | 'AO';
  unit?: string;
  scale?: number;
  offset?: number;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timer: NodeJS.Timeout;
}

/**
 * Provider hardware reale per ESP32-S3 DevKitC-1.
 * Protocollo: una richiesta JSON per riga, una risposta JSON per riga.
 */
export class Esp32SerialProvider {
  private port: SerialPort | null = null;
  private rxBuffer = '';
  private sequence = 1;
  private pending = new Map<number, PendingRequest>();
  // Limite di sicurezza: se molte richieste restano pendenti significa che la seriale non risponde.
  private maxPendingRequests = 8;
  private pinMap: Record<number, Esp32PinMapEntry> = {};

  public async connect(path: string, baudRate = 115200): Promise<void> {
    if (this.port?.isOpen) return;

    this.port = new SerialPort({ path, baudRate, autoOpen: false });
    this.port.on('data', (data: Buffer) => this.handleData(data));
    this.port.on('error', (err) => this.rejectAll(err));
    this.port.on('close', () => this.rejectAll(new Error('ESP32 seriale disconnesso')));

    await new Promise<void>((resolve, reject) => {
      this.port!.open((err) => err ? reject(err) : resolve());
    });

    // Firmware AT-MEC_HM_1_4 JSON: non usa ModbusRTU.
    // Accetta comandi su USB seriale e risponde JSON per riga.
    // Usiamo info come handshake; il provider gestisce anche firmware che non restituiscono id.
    const hello = await this.request('info', {}, 2500);
    if (!hello?.ok) throw new Error('Handshake ESP32 JSON non valido');
  }

  public isConnected(): boolean {
    return Boolean(this.port?.isOpen);
  }

  public setPinMap(entries: Esp32PinMapEntry[]): void {
    this.pinMap = {};
    entries.forEach(entry => { this.pinMap[entry.gpio] = entry; });
  }

  public async configurePin(gpio: number, mode: 'DI' | 'DO' | 'AI' | 'AO'): Promise<void> {
    await this.request('pinMode', { gpio, mode });
  }

  public async writeDigital(gpio: number, state: boolean): Promise<void> {
    await this.request('writeDigital', { gpio, value: state ? 1 : 0 });
  }

  public async readDigital(gpio: number): Promise<boolean> {
    const res = await this.request('readDigital', { gpio });
    return Boolean(res.value);
  }

  public async readAnalog(gpio: number): Promise<number> {
    const res = await this.request('readAnalog', { gpio });
    const volts = Number(res.voltage ?? res.value ?? 0);
    const map = this.pinMap[gpio];
    return map ? (volts * (map.scale ?? 1)) + (map.offset ?? 0) : volts;
  }

  public async writeAnalog(gpio: number, value: number): Promise<void> {
    await this.request('writeAnalog', { gpio, value });
  }

  public async getInfo(): Promise<any> {
    return this.request('info', {});
  }

  public close(): void {
    this.rejectAll(new Error('ESP32 seriale chiuso'));
    if (this.port?.isOpen) this.port.close();
    this.port = null;
  }

  /**
   * Invia un comando JSON e attende una sola risposta.
   * Se la coda pendente supera maxPendingRequests viene svuotata per evitare blocchi UI.
   */
  private async request(cmd: string, payload: Record<string, any>, timeoutMs = 1500): Promise<any> {
    if (!this.port?.isOpen) throw new Error('ESP32 seriale non connesso');
    if (this.pending.size >= this.maxPendingRequests) {
      this.rejectAll(new Error('Coda ESP32 piena: reset richieste pendenti per protezione anti-blocco'));
    }
    const id = this.sequence++;
    const packet = JSON.stringify({ id, cmd, ...payload }) + '\n';

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout ESP32 comando ${cmd}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.port!.write(packet, (err) => {
        if (err) {
          clearTimeout(timer);
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

  /**
   * Accumula dati seriali e spezza le risposte a righe.
   * La guardia sulla dimensione buffer previene blocchi se arrivano dati corrotti senza newline.
   */
  private handleData(data: Buffer): void {
    this.rxBuffer += data.toString('utf8');
    if (this.rxBuffer.length > 8192) {
      console.warn('[ESP32] Buffer RX troppo grande, svuotato per protezione anti-blocco');
      this.rxBuffer = '';
      return;
    }
    let idx = this.rxBuffer.indexOf('\n');
    while (idx >= 0) {
      const line = this.rxBuffer.slice(0, idx).trim();
      this.rxBuffer = this.rxBuffer.slice(idx + 1);
      if (line) this.handleLine(line);
      idx = this.rxBuffer.indexOf('\n');
    }
  }

  private handleLine(line: string): void {
    try {
      const msg = JSON.parse(line);

      // Alcuni firmware JSON puliti rispondono senza id. In quel caso risolviamo
      // la prima richiesta pendente in FIFO. Questo evita blocchi UI se il firmware
      // comunica correttamente ma non fa echo dell'id.
      let id = Number(msg.id);
      let pending = Number.isFinite(id) ? this.pending.get(id) : undefined;
      if (!pending && this.pending.size > 0) {
        const first = this.pending.entries().next().value as [number, PendingRequest] | undefined;
        if (first) {
          id = first[0];
          pending = first[1];
        }
      }

      if (!pending) {
        // Messaggi asincroni tipo boot/info non richiesti: non sono errori.
        console.log('[ESP32]', line);
        return;
      }
      clearTimeout(pending.timer);
      this.pending.delete(id);
      if (msg.ok === false) pending.reject(new Error(msg.error || 'Errore ESP32'));
      else pending.resolve(msg);
    } catch (err) {
      console.warn('[ESP32] Riga seriale non JSON:', line);
    }
  }

  private rejectAll(err: Error): void {
    this.pending.forEach(p => {
      clearTimeout(p.timer);
      p.reject(err);
    });
    this.pending.clear();
  }
}
