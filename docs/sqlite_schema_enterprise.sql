-- AT-MEC HM 4.17B Enterprise SQLite schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_versions (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS test_results (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS test_steps (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS serial_history (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS firmware_history (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS repairs (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS device_events (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS device_configs (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS production_stats (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quality_stats (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);
CREATE INDEX IF NOT EXISTS idx_roles_updated_at ON roles(updated_at);
CREATE INDEX IF NOT EXISTS idx_permissions_updated_at ON permissions(updated_at);
CREATE INDEX IF NOT EXISTS idx_recipes_updated_at ON recipes(updated_at);
CREATE INDEX IF NOT EXISTS idx_recipe_versions_updated_at ON recipe_versions(updated_at);
CREATE INDEX IF NOT EXISTS idx_test_results_updated_at ON test_results(updated_at);
CREATE INDEX IF NOT EXISTS idx_test_steps_updated_at ON test_steps(updated_at);
CREATE INDEX IF NOT EXISTS idx_serial_history_updated_at ON serial_history(updated_at);
CREATE INDEX IF NOT EXISTS idx_firmware_history_updated_at ON firmware_history(updated_at);
CREATE INDEX IF NOT EXISTS idx_repairs_updated_at ON repairs(updated_at);
CREATE INDEX IF NOT EXISTS idx_devices_updated_at ON devices(updated_at);
CREATE INDEX IF NOT EXISTS idx_device_events_updated_at ON device_events(updated_at);
CREATE INDEX IF NOT EXISTS idx_device_configs_updated_at ON device_configs(updated_at);
CREATE INDEX IF NOT EXISTS idx_production_stats_updated_at ON production_stats(updated_at);
CREATE INDEX IF NOT EXISTS idx_quality_stats_updated_at ON quality_stats(updated_at);
