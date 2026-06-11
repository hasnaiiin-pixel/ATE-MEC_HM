/**
 * CalibrationManager - calibrazione strumenti/misure. Applica gain/offset ai valori grezzi.
 *
 * Commento introdotto in AT-MEC HM 2.14 per rendere esplicite responsabilita,
 * flusso dati e punti critici di stabilita del modulo.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface CalibrationData {
  gain: number;
  offset: number;
  last_calibration_date: string;
}

export class CalibrationManager {
  private configPath = path.join(process.cwd(), 'hardware_calibration.json');
  private calibrationDatabase: Record<string, CalibrationData> = {};

  constructor() { this.loadCalibration(); }

  private loadCalibration(): void {
    if (fs.existsSync(this.configPath)) {
      try {
        this.calibrationDatabase = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } catch {
        this.createDefaultCalibration();
      }
    } else {
      this.createDefaultCalibration();
    }
  }

  private createDefaultCalibration(): void {
    this.calibrationDatabase = {
      'Keysight_34461A_Volt': { gain: 1.0000, offset: 0.0000, last_calibration_date: new Date().toISOString() },
      'Keysight_34461A_Curr': { gain: 1.0000, offset: 0.0000, last_calibration_date: new Date().toISOString() },
      'AimTTi_PL303_Volt':    { gain: 1.0000, offset: 0.0000, last_calibration_date: new Date().toISOString() },
      'AimTTi_PL303_Curr':    { gain: 1.0000, offset: 0.0000, last_calibration_date: new Date().toISOString() }
    };
    this.saveCalibration();
  }

  public saveCalibration(): void {
    fs.writeFileSync(this.configPath, JSON.stringify(this.calibrationDatabase, null, 2));
  }

  public applyCalibration(instrumentKey: string, rawValue: number): number {
    const cal = this.calibrationDatabase[instrumentKey];
    return cal ? (rawValue * cal.gain) + cal.offset : rawValue;
  }

  public updateCalibration(instrumentKey: string, gain: number, offset: number): void {
    this.calibrationDatabase[instrumentKey] = {
      gain, offset, last_calibration_date: new Date().toISOString()
    };
    this.saveCalibration();
    console.log(`[CALIBRATION] Aggiornato ${instrumentKey}: gain=${gain}, offset=${offset}`);
  }

  public getAll(): Record<string, CalibrationData> { return { ...this.calibrationDatabase }; }
}
