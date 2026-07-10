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
exports.CalibrationManager = void 0;
/**
 * CalibrationManager - calibrazione strumenti/misure. Applica gain/offset ai valori grezzi.
 *
 * Commento introdotto in AT-MEC HM 2.14 per rendere esplicite responsabilita,
 * flusso dati e punti critici di stabilita del modulo.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class CalibrationManager {
    configPath = path.join(process.cwd(), 'hardware_calibration.json');
    calibrationDatabase = {};
    constructor() { this.loadCalibration(); }
    loadCalibration() {
        if (fs.existsSync(this.configPath)) {
            try {
                this.calibrationDatabase = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            }
            catch {
                this.createDefaultCalibration();
            }
        }
        else {
            this.createDefaultCalibration();
        }
    }
    createDefaultCalibration() {
        this.calibrationDatabase = {
            'Keysight_34461A_Volt': { gain: 1.0000, offset: 0.0000, last_calibration_date: new Date().toISOString() },
            'Keysight_34461A_Curr': { gain: 1.0000, offset: 0.0000, last_calibration_date: new Date().toISOString() },
            'AimTTi_PL303_Volt': { gain: 1.0000, offset: 0.0000, last_calibration_date: new Date().toISOString() },
            'AimTTi_PL303_Curr': { gain: 1.0000, offset: 0.0000, last_calibration_date: new Date().toISOString() }
        };
        this.saveCalibration();
    }
    saveCalibration() {
        fs.writeFileSync(this.configPath, JSON.stringify(this.calibrationDatabase, null, 2));
    }
    applyCalibration(instrumentKey, rawValue) {
        const cal = this.calibrationDatabase[instrumentKey];
        return cal ? (rawValue * cal.gain) + cal.offset : rawValue;
    }
    updateCalibration(instrumentKey, gain, offset) {
        this.calibrationDatabase[instrumentKey] = {
            gain, offset, last_calibration_date: new Date().toISOString()
        };
        this.saveCalibration();
        console.log(`[CALIBRATION] Aggiornato ${instrumentKey}: gain=${gain}, offset=${offset}`);
    }
    getAll() { return { ...this.calibrationDatabase }; }
}
exports.CalibrationManager = CalibrationManager;
