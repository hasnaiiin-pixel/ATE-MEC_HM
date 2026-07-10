"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataProvider = void 0;
/**
 * AT-MEC_HM_4.12E - Data Provider Layer.
 *
 * Obiettivo: preparare il passaggio futuro da JSON locale a SQLite/server
 * senza cambiare il comportamento attuale dell'applicazione.
 *
 * Modalità attuale sicura: LOCAL FIRST
 * - salva sempre prima nel database JSON locale esistente;
 * - crea una coda locale di sincronizzazione per invio server futuro;
 * - se il server non è configurato o offline, il collaudo NON si blocca.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const EnterpriseDatabase_1 = require("./EnterpriseDatabase");
function nowIso() { return new Date().toISOString(); }
function safeId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`; }
function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
}
function defaultConfig() {
    return {
        mode: 'local_first',
        server: { enabled: false, url: '', timeoutMs: 5000 },
        sync: { enabled: true, queuePath: path.join(process.cwd(), 'database', 'sync_queue.json'), localFirst: true },
        station: { id: process.env.COMPUTERNAME || 'STATION_01', name: 'Postazione locale', department: 'COLLAUDO', site: 'OSPITALETTO', autoSyncEnabled: false, autoSyncIntervalSec: 60 }
    };
}
class DataProvider {
    localDb;
    configPath;
    config;
    autoSyncTimer = null;
    enterpriseDb;
    constructor(localDb, configPath) {
        this.localDb = localDb;
        this.enterpriseDb = new EnterpriseDatabase_1.EnterpriseDatabase();
        this.configPath = configPath || path.join(process.cwd(), 'config', 'data_provider.json');
        this.config = this.loadConfig();
        this.ensureQueue();
        this.configureAutoSync();
    }
    getConfig() { return this.config; }
    loadConfig() {
        const base = defaultConfig();
        try {
            ensureDir(this.configPath);
            if (!fs.existsSync(this.configPath)) {
                fs.writeFileSync(this.configPath, JSON.stringify(base, null, 2));
                return base;
            }
            const parsed = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            return {
                ...base,
                ...parsed,
                server: { ...base.server, ...(parsed.server || {}) },
                sync: { ...base.sync, ...(parsed.sync || {}) },
                station: { ...base.station, ...(parsed.station || {}) }
            };
        }
        catch {
            return base;
        }
    }
    emptyQueue() { return { schemaVersion: 1, updatedAt: nowIso(), items: [] }; }
    readQueue() {
        const qPath = this.config.sync.queuePath || defaultConfig().sync.queuePath;
        ensureDir(qPath);
        if (!fs.existsSync(qPath))
            this.writeQueue(this.emptyQueue());
        try {
            const parsed = JSON.parse(fs.readFileSync(qPath, 'utf8'));
            return {
                schemaVersion: Number(parsed.schemaVersion || 1),
                updatedAt: parsed.updatedAt || nowIso(),
                lastSyncAt: parsed.lastSyncAt,
                items: Array.isArray(parsed.items) ? parsed.items : []
            };
        }
        catch {
            const backup = qPath.replace(/\.json$/, `_corrupt_${Date.now()}.json`);
            try {
                fs.copyFileSync(qPath, backup);
            }
            catch { }
            const fresh = this.emptyQueue();
            this.writeQueue(fresh);
            return fresh;
        }
    }
    writeQueue(queue) {
        const qPath = this.config.sync.queuePath || defaultConfig().sync.queuePath;
        ensureDir(qPath);
        queue.updatedAt = nowIso();
        const tmp = `${qPath}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(queue, null, 2));
        fs.renameSync(tmp, qPath);
    }
    ensureQueue() { this.readQueue(); }
    enqueue(type, payload) {
        if (!this.config.sync.enabled)
            return;
        const queue = this.readQueue();
        queue.items.push({
            id: safeId('sync'),
            type,
            status: 'PENDING',
            payload,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            attempts: 0,
            stationId: this.config.station.id,
            stationName: this.config.station.name,
            stationDepartment: this.config.station.department || '',
            stationSite: this.config.station.site || ''
        });
        this.writeQueue(queue);
    }
    postToServer(item) {
        const urlText = String(this.config.server.url || '').trim();
        if (!this.config.server.enabled || !urlText)
            return Promise.reject(new Error('Server non configurato'));
        const url = new URL(urlText.replace(/\/$/, '') + '/sync');
        const body = JSON.stringify({
            source: 'AT-MEC_HM',
            station: { id: this.config.station.id, name: this.config.station.name, department: this.config.station.department || '', site: this.config.station.site || '' },
            item
        });
        const lib = url.protocol === 'https:' ? https : http;
        return new Promise((resolve, reject) => {
            const req = lib.request({
                method: 'POST',
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                timeout: Number(this.config.server.timeoutMs || 5000),
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    ...(this.config.server.apiKey ? { 'Authorization': `Bearer ${this.config.server.apiKey}` } : {})
                }
            }, (res) => {
                const chunks = [];
                res.on('data', c => chunks.push(Buffer.from(c)));
                res.on('end', () => {
                    if ((res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300)
                        resolve();
                    else
                        reject(new Error(`HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString('utf8').slice(0, 300)}`));
                });
            });
            req.on('timeout', () => { req.destroy(new Error('Timeout sincronizzazione server')); });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
    // API dati: comportamento stabile local-first + mirror enterprise 4.17B.
    saveTestReport(report) {
        this.localDb.saveTestReport(report);
        try {
            this.enterpriseDb.storeTestReport(report);
        }
        catch (err) {
            console.error('[ENTERPRISE_DB] mirror test_report:', err);
        }
        this.enqueue('test_report', report);
    }
    getReports() { return this.localDb.getReports(); }
    filterReports(filters = {}) { return this.localDb.filterReports(filters); }
    findBySerialAndLot(serial, lot) { return this.localDb.findBySerialAndLot(serial, lot); }
    getSerialHistory(serial, lot) { return this.localDb.getSerialHistory(serial, lot); }
    getStats(filters = {}) { return this.localDb.getStats(filters); }
    exportReportsCsv(filters = {}) { return this.localDb.exportReportsCsv(filters); }
    backupSnapshot(label = 'manuale') { return this.localDb.backupSnapshot(label); }
    exportSnapshot() { return this.localDb.exportSnapshot(); }
    addRepairRecord(payload) {
        const rec = this.localDb.addRepairRecord(payload);
        try {
            this.enterpriseDb.storeRepairRecord(rec);
        }
        catch (err) {
            console.error('[ENTERPRISE_DB] mirror repair_record:', err);
        }
        this.enqueue('repair_record', rec);
        return rec;
    }
    saveRecipeVersion(recipe, author = 'Sistema', note = '') {
        const rev = this.localDb.saveRecipeVersion(recipe, author, note);
        try {
            this.enterpriseDb.storeRecipeRevision(rev);
        }
        catch (err) {
            console.error('[ENTERPRISE_DB] mirror recipe_revision:', err);
        }
        this.enqueue('recipe_revision', rev);
        return rev;
    }
    listRecipes() { return this.localDb.listRecipes(); }
    listRecipeVersions(name) { return this.localDb.listRecipeVersions(name); }
    loadRecipe(name, version) { return this.localDb.loadRecipe(name, version); }
    getStatus() {
        const queue = this.readQueue();
        const pending = queue.items.filter(i => i.status === 'PENDING').length;
        const failed = queue.items.filter(i => i.status === 'FAILED').length;
        const synced = queue.items.filter(i => i.status === 'SYNCED').length;
        return {
            ok: true,
            mode: this.config.mode,
            localBackend: 'json+enterprise',
            enterpriseBackend: this.enterpriseDb.isSqliteActive() ? 'sqlite+json' : 'json_enterprise',
            enterprise: this.enterpriseDb.getDashboard(),
            localDbPath: this.localDb.getPath(),
            queuePath: this.config.sync.queuePath,
            serverEnabled: !!this.config.server.enabled,
            serverUrl: this.config.server.url || '',
            timeoutMs: Number(this.config.server.timeoutMs || 5000),
            stationId: this.config.station.id || '',
            stationName: this.config.station.name || '',
            stationDepartment: this.config.station.department || '',
            stationSite: this.config.station.site || '',
            autoSyncEnabled: !!this.config.station.autoSyncEnabled,
            autoSyncIntervalSec: Number(this.config.station.autoSyncIntervalSec || 60),
            serverConfigured: !!(this.config.server.enabled && this.config.server.url),
            syncEnabled: !!this.config.sync.enabled,
            pending,
            failed,
            synced,
            total: queue.items.length,
            lastSyncAt: queue.lastSyncAt || '',
            message: this.config.server.enabled && this.config.server.url
                ? 'Server configurato. Sync disponibile.'
                : 'Modalità LOCAL FIRST: server non configurato, dati salvati localmente e pronti per sync futura.'
        };
    }
    getStationTraceInfo() {
        return {
            stationId: this.config.station.id || '',
            stationName: this.config.station.name || '',
            stationDepartment: this.config.station.department || '',
            stationSite: this.config.station.site || ''
        };
    }
    updateConfig(partial) {
        const next = {
            ...this.config,
            ...(partial || {}),
            server: { ...this.config.server, ...(partial || {}).server },
            sync: { ...this.config.sync, ...(partial || {}).sync },
            station: { ...this.config.station, ...(partial || {}).station }
        };
        next.server.url = String(next.server.url || '').trim();
        next.server.enabled = !!next.server.url && !!next.server.enabled;
        next.server.timeoutMs = Math.max(1000, Number(next.server.timeoutMs || 5000));
        next.mode = next.server.enabled ? 'local_first' : (next.mode || 'local_first');
        next.station.id = String(next.station.id || process.env.COMPUTERNAME || 'STATION_01').trim();
        next.station.name = String(next.station.name || 'Postazione locale').trim();
        next.station.department = String(next.station.department || 'COLLAUDO').trim();
        next.station.site = String(next.station.site || 'OSPITALETTO').trim();
        next.station.autoSyncIntervalSec = Math.max(15, Number(next.station.autoSyncIntervalSec || 60));
        this.config = next;
        ensureDir(this.configPath);
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
        this.ensureQueue();
        this.configureAutoSync();
        return this.getStatus();
    }
    getEnterpriseDashboard() {
        const localStats = this.localDb.getStats({});
        const dash = this.enterpriseDb.getDashboard();
        return { ok: true, ...dash, localStats };
    }
    migrateEnterpriseFoundation(extra = {}) {
        const snapshot = this.localDb.exportSnapshot();
        const users = Array.isArray(extra.users) ? extra.users : [];
        const roles = Array.isArray(extra.roles)
            ? extra.roles
            : Object.keys(extra.roles || {}).map(name => ({ role: name, ...(extra.roles[name] || {}) }));
        const devices = Array.isArray(extra.devices) ? extra.devices : [];
        return this.enterpriseDb.migrateFoundation({
            users,
            roles,
            devices,
            recipes: snapshot.recipes || [],
            reports: snapshot.testReports || [],
            repairs: snapshot.repairs || []
        });
    }
    backupEnterpriseDatabase(label = 'manuale') { return this.enterpriseDb.backup(label); }
    verifyEnterpriseDatabase() { return this.enterpriseDb.verifyIntegrity(); }
    exportEnterpriseDatabase() { return this.enterpriseDb.exportSnapshot(); }
    configureAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
        }
        if (!this.config.station.autoSyncEnabled || !this.config.server.enabled || !this.config.server.url)
            return;
        const intervalMs = Math.max(15, Number(this.config.station.autoSyncIntervalSec || 60)) * 1000;
        this.autoSyncTimer = setInterval(() => {
            this.syncNow().catch(err => console.error('[DATA_PROVIDER] auto sync:', err));
        }, intervalMs);
    }
    async testServerConnection(urlText) {
        const raw = String(urlText || this.config.server.url || '').trim();
        if (!raw)
            return { ok: false, message: 'Server non configurato.' };
        let url;
        try {
            url = new URL(raw.replace(/\/$/, '') + '/health');
        }
        catch {
            return { ok: false, message: 'URL server non valido.' };
        }
        const lib = url.protocol === 'https:' ? https : http;
        return new Promise((resolve) => {
            const req = lib.request({
                method: 'GET',
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                timeout: Number(this.config.server.timeoutMs || 5000)
            }, (res) => {
                const chunks = [];
                res.on('data', c => chunks.push(Buffer.from(c)));
                res.on('end', () => {
                    const body = Buffer.concat(chunks).toString('utf8');
                    resolve({ ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300, statusCode: res.statusCode, body, message: `HTTP ${res.statusCode}` });
                });
            });
            req.on('timeout', () => { req.destroy(new Error('Timeout verifica server')); });
            req.on('error', (err) => resolve({ ok: false, message: err?.message || String(err) }));
            req.end();
        });
    }
    async syncNow() {
        const queue = this.readQueue();
        if (!this.config.sync.enabled)
            return { ok: true, synced: 0, failed: 0, pending: 0, message: 'Sync disabilitata. Salvataggio locale attivo.' };
        if (!this.config.server.enabled || !this.config.server.url) {
            const pending = queue.items.filter(i => i.status === 'PENDING').length;
            return { ok: true, synced: 0, failed: 0, pending, message: 'Server non configurato: nessun invio eseguito. Coda mantenuta locale.' };
        }
        let synced = 0;
        let failed = 0;
        for (const item of queue.items.filter(i => i.status === 'PENDING' || i.status === 'FAILED')) {
            item.attempts = Number(item.attempts || 0) + 1;
            item.updatedAt = nowIso();
            try {
                await this.postToServer(item);
                item.status = 'SYNCED';
                item.syncedAt = nowIso();
                item.lastError = '';
                synced++;
            }
            catch (err) {
                item.status = 'FAILED';
                item.lastError = err?.message || String(err);
                failed++;
            }
        }
        queue.lastSyncAt = nowIso();
        this.writeQueue(queue);
        const pending = queue.items.filter(i => i.status === 'PENDING').length;
        return { ok: failed === 0, synced, failed, pending, lastSyncAt: queue.lastSyncAt };
    }
    getQueuePreview(limit = 30) {
        const queue = this.readQueue();
        const items = queue.items
            .slice()
            .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))
            .slice(0, Math.max(1, Number(limit || 30)))
            .map(i => ({
            id: i.id,
            type: i.type,
            status: i.status,
            attempts: Number(i.attempts || 0),
            createdAt: i.createdAt,
            updatedAt: i.updatedAt,
            syncedAt: i.syncedAt || '',
            stationId: i.stationId || '',
            stationName: i.stationName || '',
            stationDepartment: i.stationDepartment || '',
            stationSite: i.stationSite || '',
            lastError: i.lastError || '',
            payloadSummary: this.summarizePayload(i.payload)
        }));
        return { ok: true, total: queue.items.length, lastSyncAt: queue.lastSyncAt || '', items };
    }
    summarizePayload(payload) {
        try {
            const serial = payload?.serial_dut || payload?.serial || payload?.serialNumber || payload?.seriale || '';
            const recipe = payload?.recipe_name || payload?.recipe || payload?.recipeName || '';
            const result = payload?.final_result || payload?.result || payload?.esito || '';
            const ts = payload?.timestamp || payload?.createdAt || payload?.date || '';
            const parts = [serial ? `SN ${serial}` : '', recipe ? `Ricetta ${recipe}` : '', result ? `Esito ${result}` : '', ts ? String(ts).slice(0, 19) : ''].filter(Boolean);
            return parts.join(' · ') || JSON.stringify(payload).slice(0, 180);
        }
        catch {
            return 'Payload non leggibile';
        }
    }
    markFailedForRetry() {
        const queue = this.readQueue();
        let changed = 0;
        for (const item of queue.items) {
            if (item.status === 'FAILED') {
                item.status = 'PENDING';
                item.updatedAt = nowIso();
                item.lastError = item.lastError || 'Rimesso in coda manualmente';
                changed++;
            }
        }
        this.writeQueue(queue);
        return { ok: true, changed, message: `${changed} record rimessi in coda.` };
    }
    clearSyncedItems() {
        const queue = this.readQueue();
        const before = queue.items.length;
        queue.items = queue.items.filter(i => i.status !== 'SYNCED');
        const removed = before - queue.items.length;
        this.writeQueue(queue);
        return { ok: true, removed, pending: queue.items.filter(i => i.status === 'PENDING').length, failed: queue.items.filter(i => i.status === 'FAILED').length };
    }
}
exports.DataProvider = DataProvider;
