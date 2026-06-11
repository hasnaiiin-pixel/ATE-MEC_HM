/**
 * IotServer - server WebSocket per dashboard remota e KPI live.
 *
 * Espone gli aggiornamenti di stato, step e produzione a client remoti.
 * In 2.14 le trasmissioni sono protette per impedire che un client scollegato
 * o lento possa bloccare l'HMI principale.
 */
import { WebSocketServer, WebSocket } from 'ws';
import type { TestResult } from './TestResult';

export interface KpiData {
  total: number;
  passed: number;
  failed: number;
  yield: string;
  last_serial?: string;
  last_result?: TestResult;
  uptime_ms?: number;
}

export class IotServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private lastKpiData: KpiData = { total: 0, passed: 0, failed: 0, yield: '0%' };
  private startTime = Date.now();

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.send(JSON.stringify({ type: 'KPI_UPDATE', data: this.lastKpiData }));
      ws.send(JSON.stringify({ type: 'SERVER_INFO', data: { version: '1.0.0', port } }));
      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));
    });
    console.log(`[IOT SERVER] WebSocket IIoT avviato sulla porta ${port}`);
  }

  /**
   * Invia un evento a tutti i client connessi.
   * Ogni send è isolato: se un client remoto ha socket rotto, viene rimosso
   * senza propagare errori verso il processo principale.
   */
  public broadcastEvent(eventType: string, payload: any): void {
    const message = JSON.stringify({ type: eventType, data: payload, ts: Date.now() });
    this.clients.forEach(client => {
      try {
        if (client.readyState === WebSocket.OPEN) client.send(message);
        else this.clients.delete(client);
      } catch (err) {
        this.clients.delete(client);
        console.error('[IOT SERVER] Client rimosso per errore send:', err);
      }
    });
  }

  public updateLiveKpi(total: number, passed: number, failed: number, lastSerial?: string, lastResult?: TestResult): void {
    const yieldRate = total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%';
    this.lastKpiData = {
      total, passed, failed, yield: yieldRate,
      last_serial: lastSerial,
      last_result: lastResult,
      uptime_ms: Date.now() - this.startTime
    };
    this.broadcastEvent('KPI_UPDATE', this.lastKpiData);
  }

  public getClientCount(): number { return this.clients.size; }

  public close(): void { this.wss.close(); }
}
