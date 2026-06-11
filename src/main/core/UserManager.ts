/**
 * UserManager - autenticazione, ruoli, livelli e permessi. Solo Admin puo gestire utenti/ruoli.
 *
 * Commento introdotto in AT-MEC HM 2.14 per rendere esplicite responsabilita,
 * flusso dati e punti critici di stabilita del modulo.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export type Role = 'Operator' | 'Technician' | 'Engineer' | 'Developer' | 'Admin' | string;

interface RoleRecord { permissions: string[]; level: number; }
interface StoredUser { username: string; displayName: string; role: Role; salt: string; passwordHash: string; enabled: boolean; }
interface UserDb { roles: Record<string, string[] | RoleRecord>; users: StoredUser[]; }

export class UserManager {
  private dbPath = path.join(process.cwd(), 'config', 'users.json');
  private roles: Record<string, RoleRecord> = {
    Operator:   { level: 10,  permissions: ['run_test'] },
    Technician: { level: 30,  permissions: ['run_test', 'debug_mode'] },
    Engineer:   { level: 60,  permissions: ['run_test', 'debug_mode', 'edit_recipe', 'config_hardware'] },
    Developer:  { level: 80,  permissions: ['run_test', 'debug_mode', 'edit_recipe', 'config_hardware', 'manage_branding'] },
    Admin:      { level: 100, permissions: ['run_test', 'debug_mode', 'edit_recipe', 'config_hardware', 'manage_users', 'manage_branding'] }
  };

  private users: StoredUser[] = [];
  private currentRole: Role = 'Operator';
  private currentOperator: string = 'Operatore';

  constructor() { this.loadDb(); }

  private normalizeRoles(input: Record<string, string[] | RoleRecord> | undefined): Record<string, RoleRecord> {
    const out = { ...this.roles };
    for (const [name, value] of Object.entries(input || {})) {
      if (Array.isArray(value)) out[name] = { permissions: value, level: this.defaultLevelForRole(name) };
      else out[name] = { permissions: value.permissions || [], level: Number(value.level || this.defaultLevelForRole(name)) };
    }
    return out;
  }

  private defaultLevelForRole(role: string): number {
    const r = role.toLowerCase();
    if (r.includes('admin')) return 100;
    if (r.includes('develop') || r.includes('svilupp')) return 80;
    if (r.includes('engineer') || r.includes('ingegn')) return 60;
    if (r.includes('tech') || r.includes('tecn')) return 30;
    return 10;
  }

  private ensureDefaultAdmin(): void {
    const ensureUser = (username: string, displayName: string, role: Role, password: string) => {
      if (this.users.some(u => u.username.toLowerCase() === username.toLowerCase())) return;
      const salt = crypto.randomBytes(16).toString('hex');
      this.users.push({ username, displayName, role, salt, passwordHash: this.hashPassword(password, salt), enabled: true });
    };
    ensureUser('admin', 'Admin', 'Admin', 'admin');
    ensureUser('mirza', 'Mirza', 'Operator', 'mirza');
    // AT-MEC HM 2.16: se il database esiste gia, mantieni password ma forza mirza come Operatore livello 10 richiesto.
    const mirza = this.users.find(u => u.username.toLowerCase() === 'mirza');
    if (mirza) { mirza.role = 'Operator'; mirza.displayName = 'Mirza'; mirza.enabled = true; }
  }

  private loadDb(): void {
    try {
      if (!fs.existsSync(path.dirname(this.dbPath))) fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
      if (fs.existsSync(this.dbPath)) {
        const db: UserDb = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
        this.roles = this.normalizeRoles(db.roles || {});
        this.users = db.users || [];
      }
      this.ensureDefaultAdmin();
      this.saveDb();
    } catch (err) { console.error('[USER] Errore caricamento utenti:', err); }
  }

  private saveDb(): void {
    if (!fs.existsSync(path.dirname(this.dbPath))) fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    fs.writeFileSync(this.dbPath, JSON.stringify({ roles: this.roles, users: this.users }, null, 2));
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
  }

  public login(usernameRaw: string, password?: string): { ok: boolean; error?: string; operator?: string; role?: Role; level?: number } {
    const username = (usernameRaw || '').trim();
    if (!username) return { ok: false, error: 'Username mancante.' };
    if (!password) return { ok: false, error: 'Password obbligatoria.' };
    const user = this.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.enabled !== false);
    if (!user) return { ok: false, error: 'Utente non trovato o disabilitato.' };
    if (this.hashPassword(password, user.salt) !== user.passwordHash) return { ok: false, error: 'Password non valida.' };
    this.currentOperator = user.displayName || user.username;
    this.currentRole = user.role;
    const level = this.roles[user.role]?.level ?? 0;
    console.log(`[USER] Login: ${this.currentOperator} come ${this.currentRole} livello ${level}`);
    return { ok: true, operator: this.currentOperator, role: this.currentRole, level };
  }

  public createRole(role: string, permissions: string[], level?: number): { ok: boolean; error?: string } {
    const name = (role || '').trim();
    if (!name) return { ok: false, error: 'Nome ruolo mancante.' };
    this.roles[name] = { permissions: Array.from(new Set(permissions || [])), level: Number(level || this.defaultLevelForRole(name)) };
    this.saveDb();
    return { ok: true };
  }

  public createUser(username: string, displayName: string, role: Role, password: string): { ok: boolean; error?: string } {
    if (!username.trim()) return { ok: false, error: 'Username mancante.' };
    if (!password || password.length < 4) return { ok: false, error: 'Password troppo corta: minimo 4 caratteri.' };
    if (!this.roles[role]) return { ok: false, error: 'Ruolo non esistente.' };
    const salt = crypto.randomBytes(16).toString('hex');
    const rec: StoredUser = { username: username.trim(), displayName: displayName.trim() || username.trim(), role, salt, passwordHash: this.hashPassword(password, salt), enabled: true };
    const idx = this.users.findIndex(u => u.username.toLowerCase() === rec.username.toLowerCase());
    if (idx >= 0) this.users[idx] = rec; else this.users.push(rec);
    this.saveDb();
    return { ok: true };
  }



  public deleteUser(usernameRaw: string): { ok: boolean; error?: string } {
    const username = (usernameRaw || '').trim();
    if (!username) return { ok: false, error: 'Username mancante.' };
    const idx = this.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (idx < 0) return { ok: false, error: 'Utente non trovato.' };
    const target = this.users[idx];
    if (target.role === 'Admin' && this.users.filter(u => u.role === 'Admin' && u.enabled !== false).length <= 1) {
      return { ok: false, error: 'Impossibile eliminare ultimo Admin attivo.' };
    }
    this.users.splice(idx, 1);
    this.saveDb();
    return { ok: true };
  }

  public setUserEnabled(usernameRaw: string, enabled: boolean): { ok: boolean; error?: string } {
    const username = (usernameRaw || '').trim();
    const user = this.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return { ok: false, error: 'Utente non trovato.' };
    if (user.role === 'Admin' && enabled === false && this.users.filter(u => u.role === 'Admin' && u.enabled !== false).length <= 1) {
      return { ok: false, error: 'Impossibile disabilitare ultimo Admin attivo.' };
    }
    user.enabled = enabled;
    this.saveDb();
    return { ok: true };
  }

  public listRoles(): Array<{ role: string; permissions: string[]; level: number }> {
    return Object.keys(this.roles).map(role => ({ role, permissions: this.roles[role].permissions, level: this.roles[role].level }));
  }

  public listUsers(): Array<{ username: string; displayName: string; role: Role; enabled: boolean; level: number }> {
    return this.users.map(({ username, displayName, role, enabled }) => ({ username, displayName, role, enabled, level: this.roles[role]?.level ?? 0 }));
  }

  public hasPermission(role: Role, action: string): boolean {
    return this.roles[role]?.permissions.includes(action) || false;
  }

  public getCurrentRole(): Role { return this.currentRole; }
  public getCurrentOperator(): string { return this.currentOperator; }

  public canCurrentUser(action: string): boolean {
    return this.hasPermission(this.currentRole, action);
  }
}
