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
exports.AuditSystem = void 0;
/**
 * AuditSystem - storico test e interfaccia verso database locale. Salva report, filtra risultati e controlla seriali gia testati.
 *
 * Commento introdotto in AT-MEC HM 2.14 per rendere esplicite responsabilita,
 * flusso dati e punti critici di stabilita del modulo.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const LocalDatabase_1 = require("./LocalDatabase");
class AuditSystem {
    legacyPath = path.join(process.cwd(), 'production_history.json');
    db = new LocalDatabase_1.LocalDatabase();
    constructor() {
        try {
            if (fs.existsSync(this.legacyPath)) {
                const legacy = JSON.parse(fs.readFileSync(this.legacyPath, 'utf8'));
                if (Array.isArray(legacy))
                    this.db.migrateLegacyReports(legacy);
            }
        }
        catch (err) {
            console.error('[AUDIT] Migrazione storico legacy non riuscita:', err);
        }
    }
    logTest(report) {
        try {
            this.db.saveTestReport(report);
        }
        catch (err) {
            console.error('[AUDIT ERROR]', err);
        }
    }
    getHistory() { return this.db.getReports(); }
    findBySerialAndLot(serial, lot) {
        return this.db.findBySerialAndLot(serial, lot);
    }
    filterHistory(filters = {}) { return this.db.filterReports(filters); }
    getStats(filters = {}) { return this.db.getStats(filters); }
}
exports.AuditSystem = AuditSystem;
