-- AT-MEC_HM_6.6A_SQLITE_FOUNDATION
-- Schema iniziale non distruttivo. In 6.6A non sostituisce ancora JSON/localStorage.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT,
  enabled INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  permissions_json TEXT,
  level INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  revision TEXT DEFAULT 'REV_A',
  status TEXT DEFAULT 'DRAFT',
  recipe_json TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(name, revision)
);

CREATE TABLE IF NOT EXISTS test_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT,
  serial_dut TEXT,
  work_order TEXT,
  lot_number TEXT,
  recipe_name TEXT,
  recipe_version TEXT,
  operator TEXT,
  station_id TEXT,
  final_result TEXT,
  execution_time_ms INTEGER,
  report_json TEXT
);

CREATE TABLE IF NOT EXISTS repair_tickets (
  id TEXT PRIMARY KEY,
  serial_dut TEXT NOT NULL,
  work_order TEXT,
  lot_number TEXT,
  status TEXT DEFAULT 'OPEN',
  defect TEXT,
  cause TEXT,
  corrective_action TEXT,
  components TEXT,
  technician TEXT,
  notes TEXT,
  include_in_dossier INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS repair_actions (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  action_number INTEGER DEFAULT 1,
  defect TEXT,
  cause TEXT,
  corrective_action TEXT,
  components TEXT,
  technician TEXT,
  notes TEXT,
  attachments_json TEXT,
  created_at TEXT,
  FOREIGN KEY(ticket_id) REFERENCES repair_tickets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wo_number TEXT UNIQUE NOT NULL,
  product_id TEXT,
  lot TEXT,
  qty_requested INTEGER DEFAULT 0,
  qty_completed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PLANNED',
  context_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS repository_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  revision TEXT DEFAULT 'REV_A',
  status TEXT DEFAULT 'DRAFT',
  path TEXT,
  metadata_json TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(kind, name, revision)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT,
  category TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  username TEXT,
  details_json TEXT
);
