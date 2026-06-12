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
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { LocalDatabase, RepairRecord } from './LocalDatabase';
import type { TestReport } from './AuditSystem';
import type { Recipe } from '../runtime/RecipeEngine';

export type DataProviderMode = 'local_json' | 'local_first' | 'sqlite_local' | 'server';
export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

interface DataProviderConfig {
  mode: DataProviderMode;
  server: { enabled: boolean; url: string; apiKey?: string; timeoutMs: number };
  sync: { enabled: boolean; queuePath: string; localFirst: boolean };
  station: { id: string; name: string; department?: string; site?: string; autoSyncEnabled: boolean; autoSyncIntervalSec: number };
}

interface SyncQueueItem {
  id: string;
  type: string;
  status: SyncStatus;
  payload: any;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  lastError?: string;
  syncedAt?: string;
  stationId?: string;
  stationName?: string;
  stationDepartment?: string;
  stationSite?: string;
}

interface SyncQueueShape {
  schemaVersion: number;
  updatedAt: string;
  lastSyncAt?: string;
  items: SyncQueueItem[];
}

function nowIso(): string { return new Date().toISOString(); }
function safeId(prefix: string): string { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`; }

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function defaultConfig(): DataProviderConfig {
  return {
    mode: 'local_first',
    server: { enabled: false, url: '', timeoutMs: 5000 },
    sync: { enabled: true, queuePath: path.join(process.cwd(), 'database', 'sync_queue.json'), localFirst: true },
    station: { id: process.env.COMPUTERNAME || 'STATION_01', name: 'Postazione locale', department: 'COLLAUDO', site: 'OSPITALETTO', autoSyncEnabled: false, autoSyncIntervalSec: 60 }
  };
}

export class DataProvider {
  private localDb: LocalDatabase;
  private configPath: string;
  private config: DataProviderConfig;
  private autoSyncTimer: NodeJS.Timeout | null = null;

  constructor(localDb: LocalDatabase, configPath?: string) {
    this.localDb = localDb;
    this.configPath = configPath || path.join(process.cwd(), 'config', 'data_provider.json');
    this.config = this.loadConfig();
    this.ensureQueue();
    this.configureAutoSync();
  }

  public getConfig(): DataProviderConfig { return this.config; }

  private loadConfig(): DataProviderConfig {
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
    } catch {
      return base;
    }
  }

  private emptyQueue(): SyncQueueShape { return { schemaVersion: 1, updatedAt: nowIso(), items: [] }; }

  private readQueue(): SyncQueueShape {
    const qPath = this.config.sync.queuePath || defaultConfig().sync.queuePath;
    ensureDir(qPath);
    if (!fs.existsSync(qPath)) this.writeQueue(this.emptyQueue());
    try {
      const parsed = JSON.parse(fs.readFileSync(qPath, 'utf8'));
      return {
        schemaVersion: Number(parsed.schemaVersion || 1),
        updatedAt: parsed.updatedAt || nowIso(),
        lastSyncAt: parsed.lastSyncAt,
        items: Array.isArray(parsed.items) ? parsed.items : []
      };
    } catch {
      const backup = qPath.replace(/\.json$/, `_corrupt_${Date.now()}.json`);
      try { fs.copyFileSync(qPath, backup); } catch {}
      const fresh = this.emptyQueue();
      this.writeQueue(fresh);
      return fresh;
    }
  }

  private writeQueue(queue: SyncQueueShape): void {
    const qPath = this.config.sync.queuePath || defaultConfig().sync.queuePath;
    ensureDir(qPath);
    queue.updatedAt = nowIso();
    const tmp = `${qPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(queue, null, 2));
    fs.renameSync(tmp, qPath);
  }

  private ensureQueue(): void { this.readQueue(); }

  private enqueue(type: string, payload: any): void {
    if (!this.config.sync.enabled) return;
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

  private postToServer(item: SyncQueueItem): Promise<void> {
    const urlText = String(this.config.server.url || '').trim();
    if (!this.config.server.enabled || !urlText) return Promise.reject(new Error('Server non configurato'));
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
        const chunks: Buffer[] = [];
        res.on('data', c => chunks.push(Buffer.from(c)));
        res.on('end', () => {
          if ((res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300) resolve();
          else reject(new Error(`HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString('utf8').slice(0, 300)}`));
        });
      });
      req.on('timeout', () => { req.destroy(new Error('Timeout sincronizzazione server')); });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  // API dati: comportamento invariato, backend attivo = JSON locale esistente.
  public saveTestReport(report: TestReport): void {
    this.localDb.saveTestReport(report);
    this.enqueue('test_report', report);
  }
  public getReports(): TestReport[] { return this.localDb.getReports(); }
  public filterReports(filters: any = {}): TestReport[] { return this.localDb.filterReports(filters); }
  public findBySerialAndLot(serial: string, lot: string): TestReport | null { return this.localDb.findBySerialAndLot(serial, lot); }
  public getSerialHistory(serial: string, lot?: string): any { return this.localDb.getSerialHistory(serial, lot); }
  public getStats(filters: any = {}): any { return this.localDb.getStats(filters); }
  public exportReportsCsv(filters: any = {}): string { return this.localDb.exportReportsCsv(filters); }
  public backupSnapshot(label = 'manuale'): { ok: boolean; filePath: string; count: number } { return this.localDb.backupSnapshot(label); }
  public exportSnapshot(): any { return this.localDb.exportSnapshot(); }

  public addRepairRecord(payload: Partial<RepairRecord>): RepairRecord {
    const rec = this.localDb.addRepairRecord(payload);
    this.enqueue('repair_record', rec);
    return rec;
  }

  public saveRecipeVersion(recipe: Recipe, author = 'Sistema', note = ''): any {
    const rev = this.localDb.saveRecipeVersion(recipe, author, note);
    this.enqueue('recipe_revision', rev);
    return rev;
  }
  public listRecipes(): Array<{ recipe_name: string; latestVersion: number; revisions: number; updatedAt: string }> { return this.localDb.listRecipes(); }
  public listRecipeVersions(name: string): any[] { return this.localDb.listRecipeVersions(name); }
  public loadRecipe(name: string, version?: number): Recipe | null { return this.localDb.loadRecipe(name, version); }

  public getStatus(): any {
    const queue = this.readQueue();
    const pending = queue.items.filter(i => i.status === 'PENDING').length;
    const failed = queue.items.filter(i => i.status === 'FAILED').length;
    const synced = queue.items.filter(i => i.status === 'SYNCED').length;
    return {
      ok: true,
      mode: this.config.mode,
      localBackend: 'json',
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

  public getStationTraceInfo(): any {
    return {
      stationId: this.config.station.id || '',
      stationName: this.config.station.name || '',
      stationDepartment: this.config.station.department || '',
      stationSite: this.config.station.site || ''
    };
  }

  public updateConfig(partial: Partial<DataProviderConfig>): any {
    const next: DataProviderConfig = {
      ...this.config,
      ...(partial || {}),
      server: { ...this.config.server, ...((partial || {}) as any).server },
      sync: { ...this.config.sync, ...((partial || {}) as any).sync },
      station: { ...this.config.station, ...((partial || {}) as any).station }
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


  private configureAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    if (!this.config.station.autoSyncEnabled || !this.config.server.enabled || !this.config.server.url) return;
    const intervalMs = Math.max(15, Number(this.config.station.autoSyncIntervalSec || 60)) * 1000;
    this.autoSyncTimer = setInterval(() => {
      this.syncNow().catch(err => console.error('[DATA_PROVIDER] auto sync:', err));
    }, intervalMs);
  }

  public async testServerConnection(urlText?: string): Promise<any> {
    const raw = String(urlText || this.config.server.url || '').trim();
    if (!raw) return { ok: false, message: 'Server non configurato.' };
    let url: URL;
    try { url = new URL(raw.replace(/\/$/, '') + '/health'); }
    catch { return { ok: false, message: 'URL server non valido.' }; }
    const lib = url.protocol === 'https:' ? https : http;
    return new Promise((resolve) => {
      const req = lib.request({
        method: 'GET',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        timeout: Number(this.config.server.timeoutMs || 5000)
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', c => chunks.push(Buffer.from(c)));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({ ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300, statusCode: res.statusCode, body, message: `HTTP ${res.statusCode}` });
        });
      });
      req.on('timeout', () => { req.destroy(new Error('Timeout verifica server')); });
      req.on('error', (err: any) => resolve({ ok: false, message: err?.message || String(err) }));
      req.end();
    });
  }

  public async syncNow(): Promise<any> {
    const queue = this.readQueue();
    if (!this.config.sync.enabled) return { ok: true, synced: 0, failed: 0, pending: 0, message: 'Sync disabilitata. Salvataggio locale attivo.' };
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
      } catch (err: any) {
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

  public getQueuePreview(limit = 30): any {
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

  private summarizePayload(payload: any): string {
    try {
      const serial = payload?.serial_dut || payload?.serial || payload?.serialNumber || payload?.seriale || '';
      const recipe = payload?.recipe_name || payload?.recipe || payload?.recipeName || '';
      const result = payload?.final_result || payload?.result || payload?.esito || '';
      const ts = payload?.timestamp || payload?.createdAt || payload?.date || '';
      const parts = [serial ? `SN ${serial}` : '', recipe ? `Ricetta ${recipe}` : '', result ? `Esito ${result}` : '', ts ? String(ts).slice(0, 19) : ''].filter(Boolean);
      return parts.join(' · ') || JSON.stringify(payload).slice(0, 180);
    } catch {
      return 'Payload non leggibile';
    }
  }

  public markFailedForRetry(): any {
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

  public clearSyncedItems(): any {
    const queue = this.readQueue();
    const before = queue.items.length;
    queue.items = queue.items.filter(i => i.status !== 'SYNCED');
    const removed = before - queue.items.length;
    this.writeQueue(queue);
    return { ok: true, removed, pending: queue.items.filter(i => i.status === 'PENDING').length, failed: queue.items.filter(i => i.status === 'FAILED').length };
  }

}
