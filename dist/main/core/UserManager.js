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
exports.UserManager = void 0;
/**
 * UserManager 4.13L - gestione centralizzata autenticazione/RBAC.
 *
 * Correzioni strutturali rispetto a 4.13G:
 * - deny-by-default: nessun ruolo corrente prima del login;
 * - login reale separato da verifica credenziali non distruttiva;
 * - logout reale lato backend;
 * - salvataggio utenti/ruoli in userData/auth con migrazione legacy da config/users.json;
 * - password legacy SHA-256 migrate progressivamente a scrypt;
 * - update utente esistente senza obbligo di riscrivere password;
 * - protezione ultimo account con manage_users.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const electron_1 = require("electron");
class UserManager {
    dbPath;
    legacyDbPath = path.join(process.cwd(), 'config', 'users.json');
    roles = {
        Operator: { level: 10, permissions: ['run_test', 'view_reports'] },
        Tecnico: { level: 30, permissions: ['run_test', 'view_reports', 'debug_mode', 'view_traceability', 'view_kpi', 'manage_repair', 'ai_read', 'export_data'] },
        Technician: { level: 30, permissions: ['run_test', 'view_reports', 'debug_mode', 'view_traceability', 'view_kpi', 'manage_repair', 'ai_read', 'export_data'] },
        Engineer: { level: 60, permissions: ['run_test', 'view_reports', 'debug_mode', 'edit_recipe', 'config_hardware', 'view_traceability', 'view_kpi', 'manage_data', 'manage_repair', 'ai_read', 'export_data'] },
        Developer: { level: 80, permissions: ['run_test', 'view_reports', 'debug_mode', 'edit_recipe', 'config_hardware', 'manage_branding', 'edit_layout', 'show_ui_ids', 'test_elements', 'view_traceability', 'view_kpi', 'manage_data', 'manage_ai', 'config_ai', 'export_data'] },
        Admin: { level: 100, permissions: ['run_test', 'view_reports', 'debug_mode', 'edit_recipe', 'config_hardware', 'manage_users', 'manage_branding', 'edit_layout', 'show_ui_ids', 'test_elements', 'view_traceability', 'view_kpi', 'manage_data', 'sign_quality', 'approve_reports', 'manage_ai', 'config_ai', 'reset_data', 'manage_work_orders', 'manage_repair', 'export_data', 'import_data', 'factory_admin', 'runtime_validate', 'startup_doctor', 'driver_install', 'driver_check'] },
        Qualità: { level: 60, permissions: ['view_reports', 'sign_quality', 'approve_reports', 'view_kpi', 'view_traceability', 'ai_read'] }
    };
    users = [];
    currentUsername = null;
    currentRole = null;
    currentOperator = '';
    constructor() {
        const userData = electron_1.app?.getPath ? electron_1.app.getPath('userData') : process.cwd();
        this.dbPath = path.join(userData, 'auth', 'users.json');
        this.loadDb();
    }
    normalizePermissionName(permission) {
        const p = String(permission || '').trim();
        if (p === 'manage_archive')
            return 'manage_data';
        return p;
    }
    normalizePermissions(input = []) {
        return Array.from(new Set((input || []).map(p => this.normalizePermissionName(String(p))).filter(Boolean)));
    }
    normalizeRoles(input) {
        const defaults = JSON.parse(JSON.stringify(this.roles));
        const out = JSON.parse(JSON.stringify(defaults));
        for (const [name, value] of Object.entries(input || {})) {
            const roleName = String(name || '').trim();
            if (!roleName)
                continue;
            const inputPerms = Array.isArray(value) ? value : (value.permissions || []);
            const inputLevel = Array.isArray(value) ? this.defaultLevelForRole(roleName) : Number(value.level || this.defaultLevelForRole(roleName));
            const basePerms = defaults[roleName]?.permissions || [];
            // I ruoli core mantengono i permessi minimi/canonici del progetto, poi aggiungono eventuali permessi legacy/custom.
            const merged = defaults[roleName] ? [...basePerms, ...inputPerms] : inputPerms;
            out[roleName] = { permissions: this.normalizePermissions(merged), level: inputLevel };
        }
        // Admin deve restare sempre recuperabile e gestore, anche se un users.json legacy era incompleto.
        out.Admin = { level: 100, permissions: this.normalizePermissions(defaults.Admin.permissions) };
        return out;
    }
    defaultLevelForRole(role) {
        const r = String(role || '').toLowerCase();
        if (r.includes('admin'))
            return 100;
        if (r.includes('develop') || r.includes('svilupp'))
            return 80;
        if (r.includes('engineer') || r.includes('ingegn'))
            return 60;
        if (r.includes('tech') || r.includes('tecn'))
            return 30;
        return 10;
    }
    ensureDir() {
        fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    }
    ensureDefaultAdmin() {
        const setPassword = (user, password) => {
            user.salt = crypto.randomBytes(16).toString('hex');
            user.passwordHash = this.hashPassword(password, user.salt);
        };
        const ensureUser = (username, displayName, role, password, forceRepair = false) => {
            let user = this.users.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (!user) {
                const salt = crypto.randomBytes(16).toString('hex');
                this.users.push({ username, displayName, role, salt, passwordHash: this.hashPassword(password, salt), enabled: true, operatorCode: username.toUpperCase() });
                return;
            }
            // 4.13M recovery: admin deve sempre essere accessibile dopo migrazioni/corruzioni users.json.
            // Se admin esiste ma è disabilitato, con ruolo errato o password non verificabile, lo ripariamo.
            if (forceRepair) {
                user.displayName = user.displayName || displayName;
                user.role = role;
                user.enabled = true;
                if (!this.verifyPassword(user, password))
                    setPassword(user, password);
            }
        };
        ensureUser('Admin', 'Admin', 'Admin', 'Criicket@Hasnaiin@786!', true);
        ensureUser('Tecnico', 'Tecnico', 'Tecnico', 'Tecnico@786!', true);
    }
    loadJson(file) {
        try {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
        catch {
            return null;
        }
    }
    loadDb() {
        try {
            this.ensureDir();
            let db = fs.existsSync(this.dbPath) ? this.loadJson(this.dbPath) : null;
            if (!db && fs.existsSync(this.legacyDbPath))
                db = this.loadJson(this.legacyDbPath);
            if (db) {
                this.roles = this.normalizeRoles(db.roles || {});
                this.users = Array.isArray(db.users) ? db.users : [];
            }
            this.ensureDefaultAdmin();
            this.saveDb();
        }
        catch (err) {
            console.error('[USER] Errore caricamento utenti:', err);
            this.ensureDefaultAdmin();
            this.saveDb();
        }
    }
    saveDb() {
        this.ensureDir();
        const payload = JSON.stringify({ roles: this.roles, users: this.users }, null, 2);
        const tmp = `${this.dbPath}.tmp`;
        fs.writeFileSync(tmp, payload);
        fs.renameSync(tmp, this.dbPath);
    }
    legacyHash(password, salt) {
        return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
    }
    scryptHash(password, saltHex) {
        const key = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64).toString('hex');
        return `scrypt$${saltHex}$${key}`;
    }
    hashPassword(password, salt) {
        const saltHex = salt && /^[a-f0-9]{32,}$/i.test(salt) ? salt : crypto.randomBytes(16).toString('hex');
        return this.scryptHash(password, saltHex);
    }
    verifyPassword(user, password) {
        const stored = String(user.passwordHash || '');
        if (stored.startsWith('scrypt$')) {
            const parts = stored.split('$');
            if (parts.length !== 3)
                return false;
            const expected = this.scryptHash(password, parts[1]);
            const a = Buffer.from(expected);
            const b = Buffer.from(stored);
            return a.length === b.length && crypto.timingSafeEqual(a, b);
        }
        // Legacy 4.13G SHA-256 path: accepted once, then upgraded.
        if (this.legacyHash(password, user.salt) === stored) {
            user.salt = crypto.randomBytes(16).toString('hex');
            user.passwordHash = this.hashPassword(password, user.salt);
            this.saveDb();
            return true;
        }
        return false;
    }
    auth(usernameRaw, password, mutateSession = false) {
        const username = (usernameRaw || '').trim();
        if (!username)
            return { ok: false, error: 'Username mancante.' };
        if (!password)
            return { ok: false, error: 'Password obbligatoria.' };
        const user = this.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.enabled !== false);
        if (!user)
            return { ok: false, error: 'Utente non trovato o disabilitato.' };
        if (!this.verifyPassword(user, password))
            return { ok: false, error: 'Password non valida.' };
        const role = user.role;
        const level = this.roles[role]?.level ?? 0;
        const permissions = this.normalizePermissions(this.roles[role]?.permissions || []);
        if (mutateSession) {
            this.currentUsername = user.username;
            this.currentOperator = user.displayName || user.username;
            this.currentRole = role;
            console.log(`[USER] Login: ${this.currentOperator} come ${this.currentRole} livello ${level}`);
        }
        return { ok: true, username: user.username, operator: user.displayName || user.username, role, level, permissions, operatorCode: user.operatorCode || user.username, photoDataUrl: user.photoDataUrl || '' };
    }
    login(usernameRaw, password) { return this.auth(usernameRaw, password, true); }
    verifyCredentials(usernameRaw, password) { return this.auth(usernameRaw, password, false); }
    logout() { this.currentUsername = null; this.currentRole = null; this.currentOperator = ''; }
    getCurrentUser() {
        if (!this.currentUsername || !this.currentRole)
            return { ok: false, error: 'Login richiesto.' };
        const role = this.currentRole;
        const user = this.users.find(u => u.username.toLowerCase() === String(this.currentUsername).toLowerCase());
        return { ok: true, username: this.currentUsername, operator: this.currentOperator, role, level: this.roles[role]?.level ?? 0, permissions: this.normalizePermissions(this.roles[role]?.permissions || []), operatorCode: user?.operatorCode || this.currentUsername, photoDataUrl: user?.photoDataUrl || '' };
    }
    requireManageUsers() {
        if (!this.canCurrentUser('manage_users'))
            return { ok: false, error: 'Permessi insufficienti: manage_users richiesto.' };
        return { ok: true };
    }
    activeManagersCount() {
        return this.users.filter(u => u.enabled !== false && this.normalizePermissions(this.roles[u.role]?.permissions || []).includes('manage_users')).length;
    }
    createRole(role, permissions, level) {
        const auth = this.requireManageUsers();
        if (!auth.ok)
            return auth;
        const name = (role || '').trim();
        if (!name)
            return { ok: false, error: 'Nome ruolo mancante.' };
        const nextPerms = this.normalizePermissions(permissions || []);
        const old = this.roles[name];
        if (this.normalizePermissions(old?.permissions || []).includes('manage_users') && !nextPerms.includes('manage_users')) {
            const affectedManagers = this.users.filter(u => u.enabled !== false && u.role === name).length;
            if (this.activeManagersCount() - affectedManagers < 1)
                return { ok: false, error: 'Impossibile rimuovere ultimo ruolo con manage_users attivo.' };
        }
        this.roles[name] = { permissions: nextPerms, level: Number(level || this.defaultLevelForRole(name)) };
        this.saveDb();
        return { ok: true };
    }
    createUser(username, displayName, role, password, operatorCode, photoDataUrl) {
        const auth = this.requireManageUsers();
        if (!auth.ok)
            return auth;
        const clean = (username || '').trim();
        if (!clean)
            return { ok: false, error: 'Username mancante.' };
        if (!this.roles[role])
            return { ok: false, error: 'Ruolo non esistente.' };
        const idx = this.users.findIndex(u => u.username.toLowerCase() === clean.toLowerCase());
        if (idx >= 0) {
            const old = this.users[idx];
            const removingLastManager = this.normalizePermissions(this.roles[old.role]?.permissions || []).includes('manage_users') && !this.normalizePermissions(this.roles[role]?.permissions || []).includes('manage_users') && this.activeManagersCount() <= 1;
            if (removingLastManager)
                return { ok: false, error: 'Impossibile togliere i permessi all’ultimo utente gestore.' };
            old.displayName = (displayName || '').trim() || clean;
            old.role = role;
            old.operatorCode = (operatorCode || '').trim() || old.operatorCode || clean;
            if (typeof photoDataUrl === 'string' && photoDataUrl.trim())
                old.photoDataUrl = photoDataUrl.trim();
            if (password && password.length >= 4) {
                old.salt = crypto.randomBytes(16).toString('hex');
                old.passwordHash = this.hashPassword(password, old.salt);
            }
            else if (password)
                return { ok: false, error: 'Password troppo corta: minimo 4 caratteri.' };
            if (this.currentUsername && old.username.toLowerCase() === this.currentUsername.toLowerCase()) {
                this.currentRole = role;
                this.currentOperator = old.displayName || old.username;
            }
            this.saveDb();
            return { ok: true };
        }
        if (!password || password.length < 4)
            return { ok: false, error: 'Password troppo corta: minimo 4 caratteri.' };
        const salt = crypto.randomBytes(16).toString('hex');
        this.users.push({ username: clean, displayName: (displayName || '').trim() || clean, role, salt, passwordHash: this.hashPassword(password, salt), enabled: true, operatorCode: (operatorCode || '').trim() || clean, photoDataUrl: (photoDataUrl || '').trim() });
        this.saveDb();
        return { ok: true };
    }
    deleteUser(usernameRaw) {
        const auth = this.requireManageUsers();
        if (!auth.ok)
            return auth;
        const username = (usernameRaw || '').trim();
        if (!username)
            return { ok: false, error: 'Username mancante.' };
        const idx = this.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
        if (idx < 0)
            return { ok: false, error: 'Utente non trovato.' };
        const target = this.users[idx];
        if (this.normalizePermissions(this.roles[target.role]?.permissions || []).includes('manage_users') && this.activeManagersCount() <= 1) {
            return { ok: false, error: 'Impossibile eliminare ultimo utente con manage_users.' };
        }
        this.users.splice(idx, 1);
        this.saveDb();
        return { ok: true };
    }
    setUserEnabled(usernameRaw, enabled) {
        const auth = this.requireManageUsers();
        if (!auth.ok)
            return auth;
        const username = (usernameRaw || '').trim();
        const user = this.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user)
            return { ok: false, error: 'Utente non trovato.' };
        if (enabled === false && this.normalizePermissions(this.roles[user.role]?.permissions || []).includes('manage_users') && this.activeManagersCount() <= 1) {
            return { ok: false, error: 'Impossibile disabilitare ultimo utente con manage_users.' };
        }
        user.enabled = enabled;
        this.saveDb();
        return { ok: true };
    }
    listRoles() {
        return Object.keys(this.roles).map(role => ({ role, permissions: this.normalizePermissions(this.roles[role].permissions), level: this.roles[role].level }));
    }
    listUsers() {
        if (!this.canCurrentUser('manage_users'))
            return { ok: false, error: 'Permessi insufficienti: manage_users richiesto.' };
        return this.users.map(({ username, displayName, role, enabled, operatorCode, photoDataUrl }) => ({ username, displayName, role, enabled, operatorCode: operatorCode || username, photoDataUrl: photoDataUrl || '', level: this.roles[role]?.level ?? 0, permissions: this.normalizePermissions(this.roles[role]?.permissions || []) }));
    }
    /**
     * 10.0.1 - elenco pubblico e sicuro per la pagina login.
     * Non espone password, hash, salt o permessi; serve solo a mostrare gli utenti attivi nel selettore iniziale.
     */
    listLoginUsers() {
        return this.users
            .filter(u => u && u.enabled !== false)
            .map(({ username, displayName, role, operatorCode }) => ({
            username,
            displayName: displayName || username,
            role,
            operatorCode: operatorCode || username
        }));
    }
    hasPermission(role, action) {
        if (!role || !action)
            return false;
        return this.normalizePermissions(this.roles[role]?.permissions || []).includes(this.normalizePermissionName(action)) || false;
    }
    getCurrentRole() { return this.currentRole; }
    getCurrentOperator() { return this.currentOperator || '—'; }
    canCurrentUser(action) { return this.hasPermission(this.currentRole, action); }
}
exports.UserManager = UserManager;
