-- AT-MEC_HM_4.12E - SQLite schema draft
-- Preparazione futura: il backend attivo resta JSON locale.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  serial_dut TEXT NOT NULL,
  lot_number TEXT,
  work_order TEXT,
  product_code TEXT,
  board_revision TEXT,
  firmware_version TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(serial_dut, lot_number)
);

CREATE TABLE IF NOT EXISTS test_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  serial_dut TEXT,
  lot_number TEXT,
  work_order TEXT,
  operator TEXT,
  recipe_name TEXT,
  recipe_version INTEGER,
  final_result TEXT CHECK(final_result IN ('PASS','FAIL','ABORT','ERROR')),
  execution_time_ms INTEGER,
  repair_note TEXT,
  report_pdf_path TEXT,
  raw_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS test_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_report_id INTEGER NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
  step_id INTEGER,
  step_type TEXT,
  label TEXT,
  expected_value REAL,
  min_value REAL,
  max_value REAL,
  tolerance REAL,
  measured_value REAL,
  unit TEXT,
  device TEXT,
  measurement_origin TEXT CHECK(measurement_origin IN ('AUTOMATICA','MANUALE','SISTEMA')),
  result TEXT,
  timestamp TEXT,
  raw_json TEXT
);

CREATE TABLE IF NOT EXISTS repairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  serial_dut TEXT NOT NULL,
  lot_number TEXT,
  work_order TEXT,
  timestamp TEXT NOT NULL,
  operator TEXT,
  fault_description TEXT,
  repair_note TEXT NOT NULL,
  previous_result TEXT,
  retest_result TEXT,
  raw_json TEXT
);

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_name TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  author TEXT,
  note TEXT,
  raw_json TEXT NOT NULL,
  UNIQUE(recipe_name, version)
);

CREATE TABLE IF NOT EXISTS operators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT,
  enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  status TEXT CHECK(status IN ('PENDING','SYNCED','FAILED')) NOT NULL DEFAULT 'PENDING',
  payload_json TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_test_reports_serial ON test_reports(serial_dut);
CREATE INDEX IF NOT EXISTS idx_test_reports_timestamp ON test_reports(timestamp);
CREATE INDEX IF NOT EXISTS idx_test_reports_result ON test_reports(final_result);
CREATE INDEX IF NOT EXISTS idx_repairs_serial ON repairs(serial_dut);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
