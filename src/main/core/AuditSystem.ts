/**
 * AuditSystem - storico test e interfaccia verso database locale. Salva report, filtra risultati e controlla seriali gia testati.
 *
 * Commento introdotto in AT-MEC HM 2.14 per rendere esplicite responsabilita,
 * flusso dati e punti critici di stabilita del modulo.
 */
import * as fs from 'fs';
import * as path from 'path';
import { LocalDatabase } from './LocalDatabase';
import type { TestResult } from './TestResult';

export interface TestReport {
  timestamp: string;
  operator: string;
  recipe_name: string;
  recipe_version: number;
  serial_dut: string;
  lot_number?: string;
  work_order?: string;
  repair_note?: string;
  station_id?: string;
  station_name?: string;
  station_department?: string;
  station_site?: string;
  customer_name?: string;
  customer_logo?: string;
  product_name?: string;
  final_result: TestResult;
  execution_time_ms: number;
  steps_log: Array<{
    step_id: number;
    type: string;
    label?: string;
    component?: string;
    test_point?: string;
    device?: string;
    channel?: number;
    measured?: any;
    measurement_source?: 'AUTOMATICA' | 'MANUALE' | 'SISTEMA';
    measurement_device?: string;
    target?: number;
    tolerance?: number;
    min?: number;
    max?: number;
    unit?: string;
    timestamp?: string;
    result: 'PASS' | 'FAIL' | 'DONE';
  }>;
}

export class AuditSystem {
  private legacyPath = path.join(process.cwd(), 'production_history.json');
  private db = new LocalDatabase();

  constructor() {
    try {
      if (fs.existsSync(this.legacyPath)) {
        const legacy = JSON.parse(fs.readFileSync(this.legacyPath, 'utf8'));
        if (Array.isArray(legacy)) this.db.migrateLegacyReports(legacy);
      }
    } catch (err) {
      console.error('[AUDIT] Migrazione storico legacy non riuscita:', err);
    }
  }

  public logTest(report: TestReport): void {
    try { this.db.saveTestReport(report); }
    catch (err) { console.error('[AUDIT ERROR]', err); }
  }

  public getHistory(): TestReport[] { return this.db.getReports(); }

  public findBySerialAndLot(serial: string, lot: string): TestReport | null {
    return this.db.findBySerialAndLot(serial, lot);
  }

  public filterHistory(filters: any = {}): TestReport[] { return this.db.filterReports(filters); }

  public getStats(filters: any = {}): any { return this.db.getStats(filters); }
}
