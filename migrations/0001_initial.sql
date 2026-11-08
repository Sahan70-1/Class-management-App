CREATE TABLE members (email TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('admin','staff','viewer')), created_at TEXT NOT NULL);
CREATE TABLE records (entity TEXT NOT NULL, record_key TEXT NOT NULL, value TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (entity,record_key));
CREATE TABLE events (seq INTEGER PRIMARY KEY AUTOINCREMENT, operation_id TEXT UNIQUE NOT NULL, entity TEXT NOT NULL, record_key TEXT NOT NULL, at TEXT NOT NULL, actor TEXT NOT NULL, description TEXT NOT NULL, value TEXT NOT NULL);
CREATE INDEX events_entity ON events(entity,seq);
CREATE TABLE schedule_lock (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL);
INSERT INTO schedule_lock(id,revision) VALUES(1,0);
