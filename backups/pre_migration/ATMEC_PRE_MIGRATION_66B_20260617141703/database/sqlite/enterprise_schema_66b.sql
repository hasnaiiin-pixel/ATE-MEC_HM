-- AT-MEC_HM 6.6B Core Data Migration schema
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, role TEXT, enabled INTEGER DEFAULT 1, raw_json TEXT);
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT UNIQUE, raw_json TEXT);
CREATE TABLE IF NOT EXISTS recipes (id TEXT PRIMARY KEY, name TEXT, version TEXT, status TEXT, source TEXT, raw_json TEXT);
CREATE TABLE IF NOT EXISTS recipe_steps (id TEXT PRIMARY KEY, recipe_id TEXT, step_index INTEGER, type TEXT, title TEXT, raw_json TEXT, FOREIGN KEY(recipe_id) REFERENCES recipes(id));
CREATE TABLE IF NOT EXISTS test_runs (id TEXT PRIMARY KEY, timestamp TEXT, serial TEXT, work_order TEXT, lot TEXT, recipe TEXT, operator TEXT, station TEXT, result TEXT, duration_ms INTEGER, raw_json TEXT);
CREATE TABLE IF NOT EXISTS test_steps (id TEXT PRIMARY KEY, test_run_id TEXT, step_index INTEGER, result TEXT, measured_value TEXT, raw_json TEXT, FOREIGN KEY(test_run_id) REFERENCES test_runs(id));
CREATE TABLE IF NOT EXISTS repair_tickets (id TEXT PRIMARY KEY, serial TEXT, status TEXT, created_at TEXT, closed_at TEXT, defect TEXT, cause TEXT, corrective_action TEXT, technician TEXT, raw_json TEXT);
CREATE TABLE IF NOT EXISTS repair_actions (id TEXT PRIMARY KEY, ticket_id TEXT, action_index INTEGER, technician TEXT, defect TEXT, cause TEXT, corrective_action TEXT, components TEXT, notes TEXT, timestamp TEXT, raw_json TEXT, FOREIGN KEY(ticket_id) REFERENCES repair_tickets(id));
CREATE TABLE IF NOT EXISTS repair_attachments (id TEXT PRIMARY KEY, ticket_id TEXT, action_id TEXT, filename TEXT, path TEXT, type TEXT, raw_json TEXT, FOREIGN KEY(ticket_id) REFERENCES repair_tickets(id));
CREATE TABLE IF NOT EXISTS work_orders (id TEXT PRIMARY KEY, wo_number TEXT, product TEXT, customer TEXT, lot TEXT, qty_target INTEGER, qty_done INTEGER, status TEXT, raw_json TEXT);
CREATE TABLE IF NOT EXISTS repository_items (id TEXT PRIMARY KEY, kind TEXT, name TEXT, version TEXT, status TEXT, raw_json TEXT);
CREATE TABLE IF NOT EXISTS repository_versions (id TEXT PRIMARY KEY, item_id TEXT, version TEXT, status TEXT, author TEXT, timestamp TEXT, raw_json TEXT, FOREIGN KEY(item_id) REFERENCES repository_items(id));
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value_json TEXT);
CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, timestamp TEXT, category TEXT, actor TEXT, action TEXT, object_type TEXT, object_id TEXT, raw_json TEXT);
