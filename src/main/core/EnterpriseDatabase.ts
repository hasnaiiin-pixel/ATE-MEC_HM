/**
 * AT-MEC_HM_4.17B - EnterpriseDatabase
 *
 * Layer enterprise sicuro: mantiene compatibilità JSON/local-first e prepara SQLite reale.
 * Se better-sqlite3 è installato, crea e aggiorna anche database/ate_mec_enterprise.db.
 * Se better-sqlite3 non è disponibile, l'app continua a funzionare con backend enterprise JSON.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { TestReport } from './AuditSystem';
import type { Recipe } from '../runtime/RecipeEngine';
import type { RepairRecord, RecipeRevision } from './LocalDatabase';

export type EnterpriseTableName =
  | 'users' | 'roles' | 'permissions'
  | 'recipes' | 'recipe_versions'
  | 'test_results' | 'test_steps'
  | 'serial_history' | 'firmware_history' | 'repairs'
  | 'devices' | 'device_events' | 'device_configs'
  | 'production_stats' | 'quality_stats';

interface EnterpriseDbShape {
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  backend: 'json_enterprise';
  sqliteReady: boolean;
  tables: Record<EnterpriseTableName, any[]>;
}

const TABLES: EnterpriseTableName[] = [
  'users','roles','permissions',
  'recipes','recipe_versions',
  'test_results','test_steps',
  'serial_history','firmware_history','repairs',
  'devices','device_events','device_configs',
  'production_stats','quality_stats'
];

function nowIso(): string { return new Date().toISOString(); }
function safeId(prefix: string): string { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`; }
function norm(v: any): string { return String(v || '').trim().toLowerCase(); }
function ensureDir(filePath: string): void { const d = path.dirname(filePath); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function compactJson(v: any): string { try { return JSON.stringify(v ?? null); } catch { return JSON.stringify({ error: 'unserializable' }); } }

export class EnterpriseDatabase {
  private jsonPath: string;
  private sqlitePath: string;
  private schemaPath: string;
  private sqlite: any | null = null;
  private sqliteError = '';

  constructor(baseDir: string = process.cwd()) {
    this.jsonPath = path.join(baseDir, 'database', 'ate_mec_enterprise_db.json');
    this.sqlitePath = path.join(baseDir, 'database', 'ate_mec_enterprise.db');
    this.schemaPath = path.join(baseDir, 'docs', 'sqlite_schema_enterprise.sql');
    ensureDir(this.jsonPath);
    ensureDir(this.schemaPath);
    this.writeSchemaFile();
    this.ensureJson();
    this.initOptionalSqlite();
  }

  public getJsonPath(): string { return this.jsonPath; }
  public getSqlitePath(): string { return this.sqlitePath; }
  public isSqliteActive(): boolean { return !!this.sqlite; }
  public getSqliteError(): string { return this.sqliteError; }

  private empty(): EnterpriseDbShape {
    const t = nowIso();
    const tables = {} as Record<EnterpriseTableName, any[]>;
    for (const name of TABLES) tables[name] = [];
    return { schemaVersion: 41702, createdAt: t, updatedAt: t, backend: 'json_enterprise', sqliteReady: false, tables };
  }

  private ensureJson(): void { if (!fs.existsSync(this.jsonPath)) this.writeJson(this.empty()); }

  private readJson(): EnterpriseDbShape {
    this.ensureJson();
    try {
      const parsed = JSON.parse(fs.readFileSync(this.jsonPath, 'utf8'));
      const base = this.empty();
      const tables = { ...base.tables } as Record<EnterpriseTableName, any[]>;
      for (const name of TABLES) tables[name] = Array.isArray(parsed?.tables?.[name]) ? parsed.tables[name] : [];
      return {
        schemaVersion: Number(parsed.schemaVersion || 41702),
        createdAt: parsed.createdAt || base.createdAt,
        updatedAt: parsed.updatedAt || nowIso(),
        backend: 'json_enterprise',
        sqliteReady: !!parsed.sqliteReady,
        tables
      };
    } catch {
      const backup = this.jsonPath.replace(/\.json$/, `_corrupt_${Date.now()}.json`);
      try { fs.copyFileSync(this.jsonPath, backup); } catch {}
      const fresh = this.empty();
      this.writeJson(fresh);
      return fresh;
    }
  }

  private writeJson(db: EnterpriseDbShape): void {
    db.updatedAt = nowIso();
    db.sqliteReady = !!this.sqlite;
    const tmp = `${this.jsonPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmp, this.jsonPath);
  }

  private upsertJson(table: EnterpriseTableName, key: string, row: any): void {
    const db = this.readJson();
    const list = db.tables[table] || [];
    const i = list.findIndex((x: any) => String(x.id || x.key || '') === key);
    const rec = { ...row, id: key, updatedAt: nowIso() };
    if (i >= 0) list[i] = { ...list[i], ...rec };
    else list.push({ ...rec, createdAt: row.createdAt || nowIso() });
    db.tables[table] = list;
    this.writeJson(db);
    this.upsertSqlite(table, key, rec);
  }

  private initOptionalSqlite(): void {
    try {
      // Optional runtime dependency. Non rompe l'app se il modulo nativo non è installato.
      // eslint-disable-next-line no-eval
      const req = eval('require');
      const BetterSqlite3 = req('better-sqlite3');
      ensureDir(this.sqlitePath);
      this.sqlite = new BetterSqlite3(this.sqlitePath);
      this.sqlite.pragma('journal_mode = WAL');
      this.sqlite.exec(this.sqliteSchema());
      this.replayJsonToSqlite();
      this.sqliteError = '';
    } catch (err: any) {
      this.sqlite = null;
      this.sqliteError = err?.message || String(err);
    }
  }

  private upsertSqlite(table: EnterpriseTableName, key: string, row: any): void {
    if (!this.sqlite) return;
    try {
      const stmt = this.sqlite.prepare(`INSERT OR REPLACE INTO ${table}(id, json, updated_at) VALUES (?, ?, ?)`);
      stmt.run(key, compactJson(row), nowIso());
    } catch (err: any) {
      this.sqliteError = err?.message || String(err);
    }
  }

  private replayJsonToSqlite(): void {
    if (!this.sqlite) return;
    const db = this.readJson();
    for (const table of TABLES) {
      for (const row of db.tables[table] || []) {
        const key = String(row.id || row.key || safeId(table));
        this.upsertSqlite(table, key, row);
      }
    }
  }

  public sqliteSchema(): string {
    const create = TABLES.map(t => `CREATE TABLE IF NOT EXISTS ${t} (\n  id TEXT PRIMARY KEY,\n  json TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);`).join('\n\n');
    const idx = TABLES.map(t => `CREATE INDEX IF NOT EXISTS idx_${t}_updated_at ON ${t}(updated_at);`).join('\n');
    return `-- AT-MEC HM 4.17B Enterprise SQLite schema\nPRAGMA foreign_keys = ON;\n\n${create}\n\n${idx}\n`;
  }

  private writeSchemaFile(): void {
    try { fs.writeFileSync(this.schemaPath, this.sqliteSchema(), 'utf8'); } catch {}
  }

  public storeRecipeRevision(rev: RecipeRevision): void {
    const key = String(rev.id || `${rev.recipe_name}_${rev.version}`);
    this.upsertJson('recipe_versions', key, rev);
    this.upsertJson('recipes', norm(rev.recipe_name || key), { id: norm(rev.recipe_name || key), recipe_name: rev.recipe_name, latestVersion: rev.version, updatedAt: rev.created_at, latestRevisionId: key });
  }

  public storeTestReport(report: TestReport): void {
    const key = safeId('test');
    this.upsertJson('test_results', key, report);
    const serial = String((report as any).serial_dut || '').trim();
    if (serial) this.upsertJson('serial_history', `${norm(serial)}_${key}`, { id: `${norm(serial)}_${key}`, serial, eventType: 'TEST', result: (report as any).final_result || '', timestamp: (report as any).timestamp || nowIso(), report });
    const steps = Array.isArray((report as any).steps_log) ? (report as any).steps_log : [];
    steps.forEach((step: any, idx: number) => this.upsertJson('test_steps', `${key}_step_${idx + 1}`, { ...step, testResultId: key, index: idx + 1 }));
    const fw = String((report as any).firmware || (report as any).firmware_version || '').trim();
    if (serial && fw) this.upsertJson('firmware_history', `${norm(serial)}_${norm(fw)}_${key}`, { serial, firmware: fw, timestamp: (report as any).timestamp || nowIso(), testResultId: key });
  }

  public storeRepairRecord(rec: RepairRecord): void {
    const key = String(rec.id || safeId('repair'));
    this.upsertJson('repairs', key, rec);
    if (rec.serial_dut) this.upsertJson('serial_history', `${norm(rec.serial_dut)}_${key}`, { id: `${norm(rec.serial_dut)}_${key}`, serial: rec.serial_dut, eventType: 'REPAIR', timestamp: rec.timestamp || nowIso(), repair: rec });
  }

  public storeDeviceConfig(name: string, payload: any): void { this.upsertJson('device_configs', norm(name || payload?.name || safeId('device_config')), { device: name, ...payload }); }
  public storeDeviceEvent(name: string, event: any): void { this.upsertJson('device_events', safeId('device_event'), { device: name, ...event, timestamp: event?.timestamp || nowIso() }); }
  public storeProductionStat(key: string, payload: any): void { this.upsertJson('production_stats', key || safeId('production_stat'), payload); }
  public storeQualityStat(key: string, payload: any): void { this.upsertJson('quality_stats', key || safeId('quality_stat'), payload); }

  public migrateFoundation(payload: { users?: any[]; roles?: any[]; recipes?: RecipeRevision[]; reports?: TestReport[]; repairs?: RepairRecord[]; devices?: any[] } = {}): any {
    let users = 0, roles = 0, recipes = 0, reports = 0, repairs = 0, devices = 0;
    for (const u of payload.users || []) { this.upsertJson('users', norm(u.username || u.id || safeId('user')), u); users++; }
    for (const r of payload.roles || []) { this.upsertJson('roles', norm(r.role || r.name || r.id || safeId('role')), r); roles++; }
    for (const r of payload.roles || []) {
      const roleName = r.role || r.name || '';
      for (const p of (r.permissions || [])) this.upsertJson('permissions', `${norm(roleName)}_${norm(p)}`, { role: roleName, permission: p });
    }
    for (const r of payload.recipes || []) { this.storeRecipeRevision(r); recipes++; }
    for (const r of payload.reports || []) { this.storeTestReport(r); reports++; }
    for (const r of payload.repairs || []) { this.storeRepairRecord(r); repairs++; }
    for (const d of payload.devices || []) { this.upsertJson('devices', norm(d.name || d.device || d.id || safeId('device')), d); devices++; }
    return { ok: true, users, roles, recipes, reports, repairs, devices, dashboard: this.getDashboard() };
  }

  public getDashboard(): any {
    const db = this.readJson();
    const counts: Record<string, number> = {};
    for (const t of TABLES) counts[t] = (db.tables[t] || []).length;
    let sqliteCounts: Record<string, number> = {};
    if (this.sqlite) {
      try {
        for (const t of TABLES) sqliteCounts[t] = Number(this.sqlite.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c || 0);
      } catch (err: any) { this.sqliteError = err?.message || String(err); }
    }
    const jsonSize = fs.existsSync(this.jsonPath) ? fs.statSync(this.jsonPath).size : 0;
    const sqliteSize = fs.existsSync(this.sqlitePath) ? fs.statSync(this.sqlitePath).size : 0;
    return { ok: true, schemaVersion: db.schemaVersion, backend: this.sqlite ? 'sqlite+json' : 'json_enterprise', sqliteActive: !!this.sqlite, sqliteError: this.sqliteError, jsonPath: this.jsonPath, sqlitePath: this.sqlitePath, schemaPath: this.schemaPath, jsonSize, sqliteSize, counts, sqliteCounts, updatedAt: db.updatedAt };
  }

  public verifyIntegrity(): any {
    const db = this.readJson();
    const missingTables = TABLES.filter(t => !Array.isArray(db.tables[t]));
    const dashboard = this.getDashboard();
    return { ok: missingTables.length === 0, missingTables, sqliteActive: !!this.sqlite, sqliteError: this.sqliteError, dashboard };
  }

  public exportSnapshot(): any { return this.readJson(); }

  public backup(label = 'manuale'): { ok: boolean; filePath: string; sqliteFilePath?: string; counts: any } {
    const backupDir = path.join(process.cwd(), 'backups', 'database_enterprise');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0,19).replace(/[T:]/g, '-');
    const safeLabel = String(label || 'manuale').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) || 'manuale';
    const filePath = path.join(backupDir, `AT-MEC_ENTERPRISE_DB_${safeLabel}_${stamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(this.exportSnapshot(), null, 2), 'utf8');
    let sqliteFilePath = '';
    if (fs.existsSync(this.sqlitePath)) {
      sqliteFilePath = path.join(backupDir, `AT-MEC_ENTERPRISE_DB_${safeLabel}_${stamp}.db`);
      try { fs.copyFileSync(this.sqlitePath, sqliteFilePath); } catch { sqliteFilePath = ''; }
    }
    return { ok: true, filePath, sqliteFilePath: sqliteFilePath || undefined, counts: this.getDashboard().counts };
  }
}
