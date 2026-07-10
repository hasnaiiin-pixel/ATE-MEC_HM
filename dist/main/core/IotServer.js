"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IotServer = void 0;
/**
 * IotServer - server WebSocket per dashboard remota e KPI live.
 *
 * 7.5.3 STARTUP SAFE:
 * - l'HMI non deve chiudersi se la porta 8080 è già occupata;
 * - EADDRINUSE/EACCES vengono gestiti come warning;
 * - viene provato un fallback su 8081/8082, poi il server remoto viene disabilitato;
 * - Test Mode e produzione continuano comunque.
 */
const ws_1 = require("ws");
class IotServer {
    wss = null;
    clients = new Set();
    lastKpiData = { total: 0, passed: 0, failed: 0, yield: '0%' };
    startTime = Date.now();
    activePort = null;
    constructor(port = 8080) {
        this.tryStart(port, 0);
    }
    tryStart(port, attempt) {
        try {
            const server = new ws_1.WebSocketServer({ port });
            this.wss = server;
            server.on('listening', () => {
                this.activePort = port;
                console.log(`[IOT SERVER] WebSocket IIoT avviato sulla porta ${port}`);
            });
            server.on('error', (err) => {
                const code = err?.code || '';
                console.warn(`[IOT SERVER] Porta ${port} non disponibile (${code || err?.message || err}). HMI continua.`);
                try {
                    server.close();
                }
                catch (_e) { }
                if (this.wss === server)
                    this.wss = null;
                if (code === 'EADDRINUSE' || code === 'EACCES') {
                    if (attempt < 2) {
                        const nextPort = port + 1;
                        console.warn(`[IOT SERVER] Provo fallback porta ${nextPort}.`);
                        this.tryStart(nextPort, attempt + 1);
                        return;
                    }
                }
                this.activePort = null;
                console.warn('[IOT SERVER] Dashboard remota disabilitata. Applicazione principale attiva.');
            });
            server.on('connection', (ws) => {
                this.clients.add(ws);
                try {
                    ws.send(JSON.stringify({ type: 'KPI_UPDATE', data: this.lastKpiData }));
                    ws.send(JSON.stringify({ type: 'SERVER_INFO', data: { version: '7.5.3', port: this.activePort || port } }));
                }
                catch (_e) { }
                ws.on('close', () => this.clients.delete(ws));
                ws.on('error', () => this.clients.delete(ws));
            });
        }
        catch (err) {
            console.warn(`[IOT SERVER] Avvio WebSocket non riuscito. Server remoto disabilitato, HMI continua.`, err?.message || err);
            this.wss = null;
            this.activePort = null;
        }
    }
    /**
     * Invia un evento a tutti i client connessi.
     * Ogni send è isolato: se un client remoto ha socket rotto, viene rimosso
     * senza propagare errori verso il processo principale.
     */
    broadcastEvent(eventType, payload) {
        if (!this.wss || this.clients.size === 0)
            return;
        const message = JSON.stringify({ type: eventType, data: payload, ts: Date.now() });
        this.clients.forEach(client => {
            try {
                if (client.readyState === ws_1.WebSocket.OPEN)
                    client.send(message);
                else
                    this.clients.delete(client);
            }
            catch (err) {
                this.clients.delete(client);
                console.error('[IOT SERVER] Client rimosso per errore send:', err);
            }
        });
    }
    updateLiveKpi(total, passed, failed, lastSerial, lastResult) {
        const yieldRate = total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%';
        this.lastKpiData = {
            total, passed, failed, yield: yieldRate,
            last_serial: lastSerial,
            last_result: lastResult,
            uptime_ms: Date.now() - this.startTime
        };
        this.broadcastEvent('KPI_UPDATE', this.lastKpiData);
    }
    getClientCount() { return this.clients.size; }
    getPort() { return this.activePort; }
    close() {
        try {
            this.wss?.close();
        }
        catch (_e) { }
        this.wss = null;
        this.activePort = null;
        this.clients.clear();
    }
}
exports.IotServer = IotServer;
