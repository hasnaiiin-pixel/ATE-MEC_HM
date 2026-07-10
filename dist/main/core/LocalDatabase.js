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
exports.LocalDatabase = void 0;
/**
 * LocalDatabase - database locale JSON semplice. Versiona ricette, storico test, riparazioni e KPI.
 *
 * Commento introdotto in AT-MEC HM 2.14 per rendere esplicite responsabilita,
 * flusso dati e punti critici di stabilita del modulo.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function nowIso() { return new Date().toISOString(); }
function safeId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`; }
function norm(v) { return String(v || '').trim().toLowerCase(); }
class LocalDatabase {
    dbPath;
    constructor(filePath) {
        const dbDir = path.join(process.cwd(), 'database');
        if (!fs.existsSync(dbDir))
            fs.mkdirSync(dbDir, { recursive: true });
        this.dbPath = filePath || path.join(dbDir, 'ate_mec_local_db.json');
        this.ensure();
    }
    getPath() { return this.dbPath; }
    empty() {
        const t = nowIso();
        return { schemaVersion: 1, createdAt: t, updatedAt: t, recipes: [], testReports: [], repairs: [] };
    }
    ensure() {
        if (!fs.existsSync(this.dbPath))
            this.write(this.empty());
    }
    read() {
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
        }
        catch {
            const backup = this.dbPath.replace(/\.json$/, `_corrupt_${Date.now()}.json`);
            try {
                fs.copyFileSync(this.dbPath, backup);
            }
            catch { }
            const fresh = this.empty();
            this.write(fresh);
            return fresh;
        }
    }
    write(db) {
        db.updatedAt = nowIso();
        const tmp = `${this.dbPath}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
        fs.renameSync(tmp, this.dbPath);
    }
    migrateLegacyReports(legacyReports) {
        const db = this.read();
        const keys = new Set(db.testReports.map(r => `${r.timestamp}|${r.serial_dut}|${r.recipe_name}`));
        let added = 0;
        for (const r of legacyReports || []) {
            const k = `${r.timestamp}|${r.serial_dut}|${r.recipe_name}`;
            if (!keys.has(k)) {
                db.testReports.push(r);
                keys.add(k);
                added++;
            }
        }
        if (added)
            this.write(db);
    }
    saveTestReport(report) {
        const db = this.read();
        db.testReports.push(report);
        if (report.repair_note) {
            db.repairs.push({
                id: safeId('repair'),
                serial_dut: report.serial_dut,
                lot_number: report.lot_number,
                work_order: report.work_order,
                timestamp: nowIso(),
                operator: report.operator,
                repair_note: String(report.repair_note),
                previous_result: report.final_result
            });
        }
        this.write(db);
    }
    getReports() { return this.read().testReports; }
    filterReports(filters = {}) {
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
            const hay = `${r.operator} ${r.recipe_name} ${r.serial_dut} ${r.lot_number || ''} ${r.work_order || ''} ${r.final_result} ${r.repair_note || ''}`.toLowerCase();
            if (q && !hay.includes(q))
                return false;
            if (serial && !norm(r.serial_dut).includes(serial))
                return false;
            if (lot && !norm(r.lot_number || r.work_order).includes(lot))
                return false;
            if (operator && !norm(r.operator).includes(operator))
                return false;
            if (recipe && !norm(r.recipe_name).includes(recipe))
                return false;
            if (result && result !== 'ALL' && r.final_result !== result)
                return false;
            if (!Number.isNaN(t) && (t < dateFrom || t > dateTo))
                return false;
            return true;
        });
    }
    findBySerialAndLot(serial, lot) {
        const serialKey = norm(serial);
        const lotKey = norm(lot);
        if (!serialKey)
            return null;
        const matches = this.getReports().filter(r => norm(r.serial_dut) === serialKey && norm(r.lot_number || r.work_order) === lotKey);
        return matches.length ? matches[matches.length - 1] : null;
    }
    saveRecipeVersion(recipe, author = 'Sistema', note = '') {
        const db = this.read();
        const name = String(recipe.recipe_name || 'Nuova Ricetta').trim() || 'Nuova Ricetta';
        const versions = db.recipes.filter(r => norm(r.recipe_name) === norm(name)).map(r => Number(r.version || 0));
        const nextVersion = Math.max(0, ...versions, Number(recipe.version || 0)) + 1;
        const cleanRecipe = { ...recipe, recipe_name: name, version: nextVersion, steps: Array.isArray(recipe.steps) ? recipe.steps : [] };
        const rev = {
            id: safeId('recipe'), recipe_name: name, version: nextVersion, created_at: nowIso(), author, note, recipe: cleanRecipe
        };
        db.recipes.push(rev);
        this.write(db);
        return rev;
    }
    listRecipes() {
        const byName = {};
        for (const r of this.read().recipes) {
            const key = r.recipe_name || 'Nuova Ricetta';
            if (!byName[key])
                byName[key] = [];
            byName[key].push(r);
        }
        return Object.keys(byName).map(name => {
            const list = byName[name].sort((a, b) => Number(a.version) - Number(b.version));
            const last = list[list.length - 1];
            return { recipe_name: name, latestVersion: last.version, revisions: list.length, updatedAt: last.created_at };
        }).sort((a, b) => a.recipe_name.localeCompare(b.recipe_name));
    }
    listRecipeVersions(name) {
        return this.read().recipes.filter(r => norm(r.recipe_name) === norm(name)).sort((a, b) => Number(b.version) - Number(a.version));
    }
    loadRecipe(name, version) {
        const list = this.listRecipeVersions(name);
        if (!list.length)
            return null;
        const hit = version ? list.find(r => Number(r.version) === Number(version)) : list[0];
        return hit ? hit.recipe : null;
    }
    getSerialHistory(serial, lot) {
        const serialKey = norm(serial);
        const lotKey = norm(lot || '');
        const db = this.read();
        const tests = db.testReports
            .filter(r => norm(r.serial_dut) === serialKey && (!lotKey || norm(r.lot_number || r.work_order) === lotKey))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const repairs = db.repairs
            .filter(r => norm(r.serial_dut) === serialKey && (!lotKey || norm(r.lot_number || r.work_order) === lotKey))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const last = tests[0] || null;
        return { serial, lot: lot || '', totalTests: tests.length, lastResult: last?.final_result || '', lastTest: last, tests, repairs };
    }
    addRepairRecord(payload) {
        const db = this.read();
        const rec = {
            id: safeId('repair'),
            serial_dut: String(payload.serial_dut || '').trim(),
            lot_number: String(payload.lot_number || payload.work_order || '').trim(),
            work_order: String(payload.work_order || payload.lot_number || '').trim(),
            timestamp: nowIso(),
            operator: String(payload.operator || 'Operatore').trim(),
            repair_note: String(payload.repair_note || '').trim(),
            previous_result: payload.previous_result
        };
        if (!rec.serial_dut)
            throw new Error('Seriale obbligatorio per salvare una riparazione.');
        if (!rec.repair_note)
            throw new Error('Nota riparazione obbligatoria.');
        db.repairs.push(rec);
        this.write(db);
        return rec;
    }
    getStats(filters = {}) {
        const reports = this.filterReports(filters);
        const db = this.read();
        const serialFilter = norm(filters.serial);
        const lotFilter = norm(filters.lot);
        const dateFrom = filters.dateFrom ? new Date(filters.dateFrom + 'T00:00:00').getTime() : 0;
        const dateTo = filters.dateTo ? new Date(filters.dateTo + 'T23:59:59').getTime() : Number.MAX_SAFE_INTEGER;
        const resultOf = (r) => String(r?.final_result || r?.result || '').toUpperCase();
        const isPass = (r) => resultOf(r) === 'PASS';
        const isFail = (r) => resultOf(r) === 'FAIL';
        const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
        const stepLabel = (s) => String(s?.label || s?.description || '').trim();
        const stepKey = (s) => {
            const label = stepLabel(s);
            return `${s?.step_id ?? 'N/D'} ${label || s?.type || 'Step'}`.trim();
        };
        const componentKey = (s, r) => {
            const direct = String(s?.component || s?.component_name || s?.refdes || s?.part || s?.part_number || '').trim();
            if (direct)
                return direct.toUpperCase();
            const text = `${stepLabel(s)} ${s?.type || ''} ${r?.repair_note || ''}`;
            const m = text.match(/\b(?:R|C|U|D|Q|L|J|TP|F|K|M)\d{1,5}\b/i);
            if (m)
                return m[0].toUpperCase();
            return s?.step_id ? `STEP ${s.step_id}` : 'NON CODIFICATO';
        };
        const testPointKey = (s) => {
            const direct = String(s?.test_point || s?.testPoint || s?.tp || '').trim();
            if (direct)
                return direct.toUpperCase();
            return s?.step_id ? `STEP ${s.step_id}` : 'N/D';
        };
        const inc = (map, key, by = 1) => {
            const clean = String(key || 'N/D').trim() || 'N/D';
            map[clean] = (map[clean] || 0) + by;
        };
        const top = (map, limit = 10) => Object.keys(map).map(name => ({ name, count: map[name] })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, limit);
        const pct1 = (value, base) => base ? Number(((value / base) * 100).toFixed(1)) : 0;
        const repairRows = (db.repairs || []).filter((r) => {
            const t = new Date(r.timestamp || 0).getTime();
            if (serialFilter && !norm(r.serial_dut).includes(serialFilter))
                return false;
            if (lotFilter && !norm(r.lot_number || r.work_order).includes(lotFilter))
                return false;
            if (!Number.isNaN(t) && (t < dateFrom || t > dateTo))
                return false;
            return true;
        });
        const total = reports.length;
        const pass = reports.filter(isPass).length;
        const fail = reports.filter(isFail).length;
        const stopped = reports.filter(r => !isPass(r) && !isFail(r)).length;
        const repairCount = repairRows.length + reports.filter(r => String(r.repair_note || '').trim()).length;
        const yieldRate = total ? Number(((pass / total) * 100).toFixed(1)) : 0;
        const byRecipe = {};
        const byOperator = {};
        const byStation = {};
        for (const r of reports) {
            const key = r.recipe_name || 'N/D';
            if (!byRecipe[key])
                byRecipe[key] = { total: 0, pass: 0, fail: 0, stopped: 0 };
            byRecipe[key].total++;
            if (isPass(r))
                byRecipe[key].pass++;
            else if (isFail(r))
                byRecipe[key].fail++;
            else
                byRecipe[key].stopped++;
            const op = String(r.operator || 'N/D').trim() || 'N/D';
            if (!byOperator[op])
                byOperator[op] = { total: 0, pass: 0, fail: 0, stopped: 0 };
            byOperator[op].total++;
            if (isPass(r))
                byOperator[op].pass++;
            else if (isFail(r))
                byOperator[op].fail++;
            else
                byOperator[op].stopped++;
            const station = String(r.station_name || r.station_id || 'Locale').trim() || 'Locale';
            if (!byStation[station])
                byStation[station] = { total: 0, pass: 0, fail: 0, stopped: 0 };
            byStation[station].total++;
            if (isPass(r))
                byStation[station].pass++;
            else if (isFail(r))
                byStation[station].fail++;
            else
                byStation[station].stopped++;
        }
        const byDay = {};
        const topFailures = {};
        const topPasses = {};
        const topComponents = {};
        const topTestPoints = {};
        const failByStepType = {};
        const failByDevice = {};
        const passByStepType = {};
        const measurementGroups = {};
        const failureDetails = [];
        for (const r of reports) {
            const day = String(r.timestamp || '').slice(0, 10) || 'N/D';
            if (!byDay[day])
                byDay[day] = { total: 0, pass: 0, fail: 0 };
            byDay[day].total++;
            if (isPass(r))
                byDay[day].pass++;
            else
                byDay[day].fail++;
            for (const step of (r.steps_log || [])) {
                const sResult = String(step?.result || '').toUpperCase();
                const measured = Number(step?.measured);
                if (Number.isFinite(measured)) {
                    const name = stepKey(step);
                    const unit = String(step?.unit || '').trim();
                    const key = `${name}|${unit}`;
                    if (!measurementGroups[key])
                        measurementGroups[key] = { name, unit, count: 0, pass: 0, fail: 0, min: measured, max: measured, sum: 0, below: 0, above: 0 };
                    const g = measurementGroups[key];
                    g.count++;
                    g.sum += measured;
                    g.min = Math.min(g.min, measured);
                    g.max = Math.max(g.max, measured);
                    if (sResult === 'FAIL')
                        g.fail++;
                    else
                        g.pass++;
                    if (Number.isFinite(Number(step?.min)) && measured < Number(step.min))
                        g.below++;
                    if (Number.isFinite(Number(step?.max)) && measured > Number(step.max))
                        g.above++;
                }
                if (sResult === 'PASS' || sResult === 'DONE') {
                    inc(topPasses, stepKey(step));
                    inc(passByStepType, String(step?.type || 'Step'));
                }
            }
            if (!isPass(r)) {
                const failedSteps = (r.steps_log || []).filter((x) => String(x?.result || '').toUpperCase() === 'FAIL');
                const source = failedSteps.length ? failedSteps : [{ step_id: '', type: r.recipe_name || 'FAIL generico', label: r.recipe_name || 'FAIL generico' }];
                for (const failed of source) {
                    const key = stepKey(failed);
                    inc(topFailures, key);
                    inc(topComponents, componentKey(failed, r));
                    inc(topTestPoints, testPointKey(failed));
                    inc(failByStepType, String(failed?.type || 'FAIL generico'));
                    inc(failByDevice, String(failed?.measurement_device || failed?.device || 'N/D'));
                }
                const first = source[0] || {};
                failureDetails.push({
                    timestamp: r.timestamp || '',
                    serial: r.serial_dut || '',
                    lot: r.lot_number || r.work_order || '',
                    recipe: r.recipe_name || '',
                    result: resultOf(r),
                    step: stepKey(first),
                    component: componentKey(first, r),
                    testPoint: testPointKey(first),
                    measured: first?.measured,
                    min: first?.min,
                    max: first?.max,
                    unit: first?.unit || '',
                    operator: r.operator || ''
                });
            }
        }
        for (const repair of repairRows) {
            const note = String(repair.repair_note || '').trim();
            const m = note.match(/\b(?:R|C|U|D|Q|L|J|TP|F|K|M)\d{1,5}\b/i);
            if (m)
                inc(topComponents, m[0].toUpperCase());
        }
        const dailyTrend = Object.keys(byDay).sort().slice(-30).map(day => ({ day, ...byDay[day], yieldRate: byDay[day].total ? Number(((byDay[day].pass / byDay[day].total) * 100).toFixed(1)) : 0, failRate: byDay[day].total ? Number(((byDay[day].fail / byDay[day].total) * 100).toFixed(1)) : 0 }));
        const topFailureList = top(topFailures, 12);
        const topPassList = top(topPasses, 12);
        const topComponentList = top(topComponents, 12);
        const topTestPointList = top(topTestPoints, 12);
        const measurementDistribution = Object.keys(measurementGroups).map(key => {
            const g = measurementGroups[key];
            return { name: g.name, unit: g.unit, count: g.count, pass: g.pass, fail: g.fail, min: Number(g.min.toFixed(4)), max: Number(g.max.toFixed(4)), avg: Number((g.sum / Math.max(1, g.count)).toFixed(4)), below: g.below, above: g.above, failRate: pct1(g.fail, g.count) };
        }).sort((a, b) => b.failRate - a.failRate || b.count - a.count).slice(0, 16);
        // AT-MEC_HM_4.10I - KPI industriali aggiuntivi, calcolati solo sui report filtrati.
        // Non modifica il motore test: serve solo per dashboard/qualità.
        const validSerialReports = reports.filter((r) => String(r.serial_dut || '').trim());
        const bySerial = {};
        for (const r of validSerialReports) {
            const sn = String(r.serial_dut || '').trim();
            if (!bySerial[sn])
                bySerial[sn] = [];
            bySerial[sn].push(r);
        }
        const serialKeys = Object.keys(bySerial);
        let firstPass = 0;
        let serialsWithRetest = 0;
        const serialTimelines = serialKeys.map(sn => {
            const tests = bySerial[sn].slice().sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
            const repairs = repairRows.filter((x) => norm(x.serial_dut) === norm(sn));
            const events = [
                ...tests.map((x) => ({ type: 'TEST', timestamp: x.timestamp || '', result: resultOf(x), recipe: x.recipe_name || '', lot: x.lot_number || x.work_order || '', operator: x.operator || '' })),
                ...repairs.map((x) => ({ type: 'REPAIR', timestamp: x.timestamp || '', result: 'REPAIR', recipe: '', lot: x.lot_number || x.work_order || '', operator: x.operator || '', note: x.repair_note || '' }))
            ].sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
            const latest = events[events.length - 1] || null;
            return {
                serial: sn,
                totalTests: tests.length,
                pass: tests.filter(isPass).length,
                fail: tests.filter(isFail).length,
                retest: tests.length > 1,
                latestResult: latest?.result || '',
                latestAt: latest?.timestamp || '',
                events
            };
        }).sort((a, b) => new Date(b.latestAt || 0).getTime() - new Date(a.latestAt || 0).getTime()).slice(0, 20);
        for (const sn of serialKeys) {
            const list = bySerial[sn].slice().sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
            if (isPass(list[0]))
                firstPass++;
            if (list.length > 1)
                serialsWithRetest++;
        }
        const fpyRate = serialKeys.length ? Number(((firstPass / serialKeys.length) * 100).toFixed(1)) : 0;
        const retestRate = serialKeys.length ? Number(((serialsWithRetest / serialKeys.length) * 100).toFixed(1)) : 0;
        const timed = reports.map((r) => Number(r.execution_time_ms || 0)).filter((n) => Number.isFinite(n) && n > 0);
        const avgTestTimeSec = timed.length ? Number((timed.reduce((a, b) => a + b, 0) / timed.length / 1000).toFixed(1)) : 0;
        const latestReport = reports.slice().sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())[0] || null;
        const recentReports = reports.slice(-20).reverse();
        const failAnalysis = {
            totalFail: fail,
            stopped,
            failRate: pct1(fail, total),
            affectedSerials: serialKeys.filter(sn => bySerial[sn].some(isFail)).length,
            topFailures: topFailureList,
            topComponents: topComponentList,
            topTestPoints: topTestPointList,
            byStepType: top(failByStepType, 10),
            byDevice: top(failByDevice, 10),
            details: failureDetails.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()).slice(0, 30)
        };
        const passAnalysis = {
            totalPass: pass,
            passRate: pct1(pass, total),
            firstPassSerials: firstPass,
            topPassedChecks: topPassList,
            byStepType: top(passByStepType, 10),
            stableRecipes: Object.keys(byRecipe).map(name => ({ name, total: byRecipe[name].total, pass: byRecipe[name].pass, fail: byRecipe[name].fail, yieldRate: pct1(byRecipe[name].pass, byRecipe[name].total) })).sort((a, b) => b.yieldRate - a.yieldRate || b.total - a.total).slice(0, 10)
        };
        return { dbPath: this.dbPath, total, pass, fail, stopped, repairCount, yieldRate, fpyRate, retestRate, avgTestTimeSec, uniqueSerials: serialKeys.length, latestReport, byRecipe, byOperator, byStation, dailyTrend, topFailures: topFailureList, topPasses: topPassList, topComponents: topComponentList, topTestPoints: topTestPointList, failAnalysis, passAnalysis, measurementDistribution, serialTimelines, recentReports, repairRecords: repairRows.slice(-20).reverse(), recipeCount: this.listRecipes().length, revisionCount: db.recipes.length };
    }
    exportReportsCsv(filters = {}) {
        const reports = this.filterReports(filters);
        const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
        const head = ['Data', 'Commessa/Lotto', 'Operatore', 'Ricetta', 'Versione', 'Seriale', 'Esito', 'Tempo_s', 'Nota_riparazione', 'Step_fail', 'Misure'];
        const rows = reports.map((r) => {
            const failed = (r.steps_log || []).find((x) => x.result === 'FAIL');
            const measures = (r.steps_log || []).map((x) => `${x.step_id || ''}:${x.type || ''}=${x.measured ?? 'N/A'} ${x.result || ''}`).join(' | ');
            return [
                r.timestamp || '', r.lot_number || r.work_order || '', r.operator || '', r.recipe_name || '', r.recipe_version || '', r.serial_dut || '', r.final_result || '',
                r.execution_time_ms ? (Number(r.execution_time_ms) / 1000).toFixed(2) : '', r.repair_note || '', failed ? `${failed.step_id || ''} ${failed.type || ''}` : '', measures
            ].map(esc).join(';');
        });
        return head.map(esc).join(';') + '\n' + rows.join('\n');
    }
    backupSnapshot(label = 'manuale') {
        const backupDir = path.join(process.cwd(), 'backups', 'database');
        if (!fs.existsSync(backupDir))
            fs.mkdirSync(backupDir, { recursive: true });
        const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const safeLabel = String(label || 'manuale').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) || 'manuale';
        const filePath = path.join(backupDir, `AT-MEC_DB_${safeLabel}_${stamp}.json`);
        fs.writeFileSync(filePath, JSON.stringify(this.exportSnapshot(), null, 2));
        return { ok: true, filePath, count: this.read().testReports.length };
    }
    exportSnapshot() { return this.read(); }
}
exports.LocalDatabase = LocalDatabase;
