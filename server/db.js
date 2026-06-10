const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'crosswire.db'));

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    facilitator_code TEXT UNIQUE NOT NULL,
    config TEXT NOT NULL,
    status TEXT DEFAULT 'waiting',
    current_round INTEGER DEFAULT 0,
    round_duration INTEGER DEFAULT 300,
    created_at INTEGER DEFAULT (unixepoch()),
    round_started_at INTEGER,
    paused_at INTEGER,
    paused_elapsed INTEGER DEFAULT 0
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS instances (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    instance_number INTEGER NOT NULL,
    status TEXT DEFAULT 'waiting',
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    join_code TEXT UNIQUE NOT NULL,
    country TEXT NOT NULL,
    team_number INTEGER NOT NULL,
    FOREIGN KEY (instance_id) REFERENCES instances(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    socket_id TEXT,
    joined_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (team_id) REFERENCES teams(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    round INTEGER NOT NULL,
    team_id TEXT NOT NULL,
    content TEXT DEFAULT '',
    submitted INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(instance_id, event_name, round)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS handoff_notes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    from_round INTEGER NOT NULL,
    team_id TEXT NOT NULL,
    content TEXT DEFAULT '',
    submitted INTEGER DEFAULT 0,
    submitted_at INTEGER,
    UNIQUE(instance_id, event_name, from_round)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS reflections (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    q1 TEXT DEFAULT '',
    q2 TEXT DEFAULT '',
    q3 TEXT DEFAULT '',
    submitted INTEGER DEFAULT 0
  )
`);

// Migration: add facilitator_notes if this DB predates the column
try {
  db.exec(`ALTER TABLE sessions ADD COLUMN facilitator_notes TEXT DEFAULT ''`);
} catch {}

// Wrap node:sqlite's prepare to match the better-sqlite3 API used in the rest of the code
// node:sqlite uses .get() and .all() the same way, but .run() returns { changes, lastInsertRowid }
const originalPrepare = db.prepare.bind(db);
db.prepare = (sql) => {
  const stmt = originalPrepare(sql);
  return stmt;
};

module.exports = db;
