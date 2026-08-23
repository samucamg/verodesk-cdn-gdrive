DROP TABLE IF EXISTS uploads;

CREATE TABLE uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_key TEXT NOT NULL,
    project_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_extension TEXT NOT NULL,
    mime_type TEXT,
    drive_file_id TEXT UNIQUE NOT NULL,
    uploaded_by TEXT NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project ON uploads(project_key);
CREATE INDEX IF NOT EXISTS idx_date ON uploads(upload_date DESC);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
