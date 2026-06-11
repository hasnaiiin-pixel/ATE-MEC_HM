/**
 * LocalDatabase - database locale JSON semplice. Versiona ricette, storico test, riparazioni e KPI.
 *
 * Commento introdotto in AT-MEC HM 2.14 per rendere esplicite responsabilita,
 * flusso dati e punti critici di stabilita del modulo.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Recipe } from '../runtime/RecipeEngine';
import { TestReport } from './AuditSystem';
import type { TestResult } from './TestResult';

export interface RecipeRevision {
  id: string;
  recipe_name: string;
  version: number;
  created_at: string;
  author: string;
  note?: string;
  recipe: Recipe;
}

export interface RepairRecord {
  id: string;
  serial_dut: string;
  lot_number?: string;
  work_order?: string;
  timestamp: string;
  operator: string;
  repair_note: string;
  previous_result?: TestResult;
}

export interface LocalDbShape {
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  recipes: RecipeRevision[];
  testReports: TestReport[];
  repairs: RepairRecord[];
}

function nowIso(): string { return new Date().toISOString(); }
function safeId(prefix: string): string { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`; }
function norm(v: any): string { return String(v || '').trim().toLowerCase(); }

export class LocalDatabase {
  private dbPath: string;

  constructor(filePath?: string) {
    const dbDir = path.join(process.cwd(), 'database');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    this.dbPath = filePath || path.join(dbDir, 'ate_mec_local_db.json');
    this.ensure();
  }

  public getPath(): string { return this.dbPath; }

  private empty(): LocalDbShape {
    const t = nowIso();
    return { schemaVersion: 1, createdAt: t, updatedAt: t, recipes: [], testReports: [], repairs: [] };
  }

  private ensure(): void {
    if (!fs.existsSync(this.dbPath)) this.write(this.empty());
  }

  private read(): LocalDbShape {
    this.ensure();
    try {
      const raw = fs.readFileSync(this.dbPath, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        schemaVersion: Number(parsed.schemaVersion || 1),
        createdAt: parsed.createdAt || nowIso(),
        updatedAt: parsed.updatedAt || nowIso(),
        recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [],
        testReports: Array.isArray(parsed.testReports) ? parsed.testReports : [],
        repairs: Array.isArray(parsed.repairs) ? parsed.repairs : []
      };
    } catch {
      const backup = this.dbPath.replace(/\.json$/, `_corrupt_${Date.now()}.json`);
      try { fs.copyFileSync(this.dbPath, backup); } catch {}
      const fresh = this.empty();
      this.write(fresh);
      return fresh;
    }
  }

  private write(db: LocalDbShape): void {
    db.updatedAt = nowIso();
    const tmp = `${this.dbPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, this.dbPath);
  }

  public migrateLegacyReports(legacyReports: TestReport[]): void {
    const db = this.read();
    const keys = new Set(db.testReports.map(r => `${r.timestamp}|${r.serial_dut}|${r.recipe_name}`));
    let added = 0;
    for (const r of legacyReports || []) {
      const k = `${r.timestamp}|${r.serial_dut}|${r.recipe_name}`;
      if (!keys.has(k)) { db.testReports.push(r); keys.add(k); added++; }
    }
    if (added) this.write(db);
  }

  public saveTestReport(report: TestReport): void {
    const db = this.read();
    db.testReports.push(report);
    if ((report as any).repair_note) {
      db.repairs.push({
        id: safeId('repair'),
        serial_dut: report.serial_dut,
        lot_number: (report as any).lot_number,
        work_order: (report as any).work_order,
        timestamp: nowIso(),
        operator: report.operator,
        repair_note: String((report as any).repair_note),
        previous_result: report.final_result
      });
    }
    this.write(db);
  }

  public getReports(): TestReport[] { return this.read().testReports; }

  public filterReports(filters: any = {}): TestReport[] {
    const q = norm(filters.q);
    const serial = norm(filters.serial);
    const lot = norm(filters.lot);
    const operator = norm(filters.operator);
    const recipe = norm(filters.recipe);
    const result = String(filters.result || '').toUpperCase();
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom + 'T00:00:00').getTime() : 0;
    const dateTo = filters.dateTo ? new Date(filters.dateTo + 'T23:59:59').getTime() : Number.MAX_SAFE_INTEGER;
    return this.getReports().filter(r => {
      const t = new Date(r.timestamp).getTime();
      const hay = `${r.operator} ${r.recipe_name} ${r.serial_dut} ${(r as any).lot_number || ''} ${(r as any).work_order || ''} ${r.final_result} ${(r as any).repair_note || ''}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (serial && !norm(r.serial_dut).includes(serial)) return false;
      if (lot && !norm((r as any).lot_number || (r as any).work_order).includes(lot)) return false;
      if (operator && !norm(r.operator).includes(operator)) return false;
      if (recipe && !norm(r.recipe_name).includes(recipe)) return false;
      if (result && result !== 'ALL' && r.final_result !== result) return false;
      if (!Number.isNaN(t) && (t < dateFrom || t > dateTo)) return false;
      return true;
    });
  }

  public findBySerialAndLot(serial: string, lot: string): TestReport | null {
    const serialKey = norm(serial);
    const lotKey = norm(lot);
    if (!serialKey) return null;
    const matches = this.getReports().filter(r => norm(r.serial_dut) === serialKey && norm((r as any).lot_number || (r as any).work_order) === lotKey);
    return matches.length ? matches[matches.length - 1] : null;
  }

  public saveRecipeVersion(recipe: Recipe, author = 'Sistema', note = ''): RecipeRevision {
    const db = this.read();
    const name = String(recipe.recipe_name || 'Nuova Ricetta').trim() || 'Nuova Ricetta';
    const versions = db.recipes.filter(r => norm(r.recipe_name) === norm(name)).map(r => Number(r.version || 0));
    const nextVersion = Math.max(0, ...versions, Number(recipe.version || 0)) + 1;
    const cleanRecipe: Recipe = { ...recipe, recipe_name: name, version: nextVersion, steps: Array.isArray(recipe.steps) ? recipe.steps : [] };
    const rev: RecipeRevision = {
      id: safeId('recipe'), recipe_name: name, version: nextVersion, created_at: nowIso(), author, note, recipe: cleanRecipe
    };
    db.recipes.push(rev);
    this.write(db);
    return rev;
  }

  public listRecipes(): Array<{ recipe_name: string; latestVersion: number; revisions: number; updatedAt: string }> {
    const byName: Record<string, RecipeRevision[]> = {};
    for (const r of this.read().recipes) {
      const key = r.recipe_name || 'Nuova Ricetta';
      if (!byName[key]) byName[key] = [];
      byName[key].push(r);
    }
    return Object.keys(byName).map(name => {
      const list = byName[name].sort((a,b) => Number(a.version) - Number(b.version));
      const last = list[list.length - 1];
      return { recipe_name: name, latestVersion: last.version, revisions: list.length, updatedAt: last.created_at };
    }).sort((a,b) => a.recipe_name.localeCompare(b.recipe_name));
  }

  public listRecipeVersions(name: string): RecipeRevision[] {
    return this.read().recipes.filter(r => norm(r.recipe_name) === norm(name)).sort((a,b) => Number(b.version) - Number(a.version));
  }

  public loadRecipe(name: string, version?: number): Recipe | null {
    const list = this.listRecipeVersions(name);
    if (!list.length) return null;
    const hit = version ? list.find(r => Number(r.version) === Number(version)) : list[0];
    return hit ? hit.recipe : null;
  }


  public getSerialHistory(serial: string, lot?: string): any {
    const serialKey = norm(serial);
    const lotKey = norm(lot || '');
    const db = this.read();
    const tests = db.testReports
      .filter(r => norm(r.serial_dut) === serialKey && (!lotKey || norm((r as any).lot_number || (r as any).work_order) === lotKey))
      .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const repairs = db.repairs
      .filter(r => norm(r.serial_dut) === serialKey && (!lotKey || norm(r.lot_number || r.work_order) === lotKey))
      .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const last = tests[0] || null;
    return { serial, lot: lot || '', totalTests: tests.length, lastResult: last?.final_result || '', lastTest: last, tests, repairs };
  }

  public addRepairRecord(payload: Partial<RepairRecord>): RepairRecord {
    const db = this.read();
    const rec: RepairRecord = {
      id: safeId('repair'),
      serial_dut: String(payload.serial_dut || '').trim(),
      lot_number: String(payload.lot_number || payload.work_order || '').trim(),
      work_order: String(payload.work_order || payload.lot_number || '').trim(),
      timestamp: nowIso(),
      operator: String(payload.operator || 'Operatore').trim(),
      repair_note: String(payload.repair_note || '').trim(),
      previous_result: payload.previous_result
    };
    if (!rec.serial_dut) throw new Error('Seriale obbligatorio per salvare una riparazione.');
    if (!rec.repair_note) throw new Error('Nota riparazione obbligatoria.');
    db.repairs.push(rec);
    this.write(db);
    return rec;
  }

  public getStats(filters: any = {}): any {
    const reports = this.filterReports(filters);
    const total = reports.length;
    const pass = reports.filter(r => r.final_result === 'PASS').length;
    const fail = reports.filter(r => r.final_result === 'FAIL').length;
    const repairCount = reports.filter(r => String((r as any).repair_note || '').trim()).length;
    const yieldRate = total ? Number(((pass / total) * 100).toFixed(1)) : 0;
    const byRecipe: Record<string, { total: number; pass: number; fail: number }> = {};
    for (const r of reports) {
      const key = r.recipe_name || 'N/D';
      if (!byRecipe[key]) byRecipe[key] = { total: 0, pass: 0, fail: 0 };
      byRecipe[key].total++;
      if (r.final_result === 'PASS') byRecipe[key].pass++; else byRecipe[key].fail++;
    }
    const byDay: Record<string, { total: number; pass: number; fail: number }> = {};
    const topFailures: Record<string, number> = {};
    for (const r of reports) {
      const day = String(r.timestamp || '').slice(0, 10) || 'N/D';
      if (!byDay[day]) byDay[day] = { total: 0, pass: 0, fail: 0 };
      byDay[day].total++;
      if (r.final_result === 'PASS') byDay[day].pass++; else byDay[day].fail++;
      if (r.final_result !== 'PASS') {
        const failed = (r.steps_log || []).find((x: any) => x.result === 'FAIL');
        const key = failed ? `${failed.step_id} ${failed.type}` : (r.recipe_name || 'FAIL generico');
        topFailures[key] = (topFailures[key] || 0) + 1;
      }
    }
    const dailyTrend = Object.keys(byDay).sort().slice(-14).map(day => ({ day, ...byDay[day], yieldRate: byDay[day].total ? Number(((byDay[day].pass / byDay[day].total) * 100).toFixed(1)) : 0 }));
    const topFailureList = Object.keys(topFailures).map(name => ({ name, count: topFailures[name] })).sort((a,b) => b.count - a.count).slice(0, 10);

    // AT-MEC_HM_4.10I - KPI industriali aggiuntivi, calcolati solo sui report filtrati.
    // Non modifica il motore test: serve solo per dashboard/qualità.
    const validSerialReports = reports.filter((r: any) => String(r.serial_dut || '').trim());
    const bySerial: Record<string, any[]> = {};
    for (const r of validSerialReports as any[]) {
      const sn = String(r.serial_dut || '').trim();
      if (!bySerial[sn]) bySerial[sn] = [];
      bySerial[sn].push(r);
    }
    const serialKeys = Object.keys(bySerial);
    let firstPass = 0;
    let serialsWithRetest = 0;
    for (const sn of serialKeys) {
      const list = bySerial[sn].slice().sort((a: any,b: any) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
      if (String(list[0]?.final_result || '').toUpperCase() === 'PASS') firstPass++;
      if (list.length > 1) serialsWithRetest++;
    }
    const fpyRate = serialKeys.length ? Number(((firstPass / serialKeys.length) * 100).toFixed(1)) : 0;
    const retestRate = serialKeys.length ? Number(((serialsWithRetest / serialKeys.length) * 100).toFixed(1)) : 0;
    const timed = reports.map((r: any) => Number(r.execution_time_ms || 0)).filter((n: number) => Number.isFinite(n) && n > 0);
    const avgTestTimeSec = timed.length ? Number((timed.reduce((a: number,b: number) => a + b, 0) / timed.length / 1000).toFixed(1)) : 0;
    const latestReport = reports.slice().sort((a: any,b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())[0] || null;

    const recentReports = reports.slice(-20).reverse();
    return { dbPath: this.dbPath, total, pass, fail, repairCount, yieldRate, fpyRate, retestRate, avgTestTimeSec, uniqueSerials: serialKeys.length, latestReport, byRecipe, dailyTrend, topFailures: topFailureList, recentReports, repairRecords: this.read().repairs.slice(-20).reverse(), recipeCount: this.listRecipes().length, revisionCount: this.read().recipes.length };
  }


  public exportReportsCsv(filters: any = {}): string {
    const reports = this.filterReports(filters);
    const esc = (v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const head = ['Data','Commessa/Lotto','Operatore','Ricetta','Versione','Seriale','Esito','Tempo_s','Nota_riparazione','Step_fail','Misure'];
    const rows = reports.map((r: any) => {
      const failed = (r.steps_log || []).find((x: any) => x.result === 'FAIL');
      const measures = (r.steps_log || []).map((x: any) => `${x.step_id || ''}:${x.type || ''}=${x.measured ?? 'N/A'} ${x.result || ''}`).join(' | ');
      return [
        r.timestamp || '', r.lot_number || r.work_order || '', r.operator || '', r.recipe_name || '', r.recipe_version || '', r.serial_dut || '', r.final_result || '',
        r.execution_time_ms ? (Number(r.execution_time_ms) / 1000).toFixed(2) : '', r.repair_note || '', failed ? `${failed.step_id || ''} ${failed.type || ''}` : '', measures
      ].map(esc).join(';');
    });
    return head.map(esc).join(';') + '\n' + rows.join('\n');
  }

  public backupSnapshot(label = 'manuale'): { ok: boolean; filePath: string; count: number } {
    const backupDir = path.join(process.cwd(), 'backups', 'database');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0,19).replace(/[T:]/g, '-');
    const safeLabel = String(label || 'manuale').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) || 'manuale';
    const filePath = path.join(backupDir, `AT-MEC_DB_${safeLabel}_${stamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(this.exportSnapshot(), null, 2));
    return { ok: true, filePath, count: this.read().testReports.length };
  }

  public exportSnapshot(): LocalDbShape { return this.read(); }
}
