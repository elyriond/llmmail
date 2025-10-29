const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, '../data/llmmail.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
function initDatabase() {
  // Email Templates table (with Mapp placeholders)
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      user_prompt TEXT,
      subject TEXT,
      preheader TEXT,
      html_content TEXT NOT NULL,
      brand_color TEXT DEFAULT '#6366f1',
      accent_color TEXT DEFAULT '#ec4899',
      logo_url TEXT,
      font_family TEXT DEFAULT 'Arial, sans-serif',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Look & Feel templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS look_feel_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      brand_color TEXT NOT NULL,
      accent_color TEXT NOT NULL,
      logo_url TEXT,
      font_family TEXT DEFAULT 'Arial, sans-serif',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database initialized successfully');
}

// Email Template operations
const templateService = {
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO email_templates (
        name, description, user_prompt, subject, preheader, html_content,
        brand_color, accent_color, logo_url, font_family
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.name,
      data.description || null,
      data.userPrompt || null,
      data.subject,
      data.preheader || null,
      data.html,
      data.lookAndFeel?.brandColor || '#6366f1',
      data.lookAndFeel?.accentColor || '#ec4899',
      data.lookAndFeel?.logoUrl || null,
      data.lookAndFeel?.fontFamily || 'Arial, sans-serif'
    );

    return info.lastInsertRowid;
  },

  getById(id) {
    const stmt = db.prepare('SELECT * FROM email_templates WHERE id = ?');
    return stmt.get(id);
  },

  getByName(name) {
    const stmt = db.prepare('SELECT * FROM email_templates WHERE name = ?');
    return stmt.get(name);
  },

  getAll(limit = 50, offset = 0) {
    const stmt = db.prepare(`
      SELECT id, name, description, subject, created_at, updated_at
      FROM email_templates
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  },

  update(id, data) {
    const stmt = db.prepare(`
      UPDATE email_templates
      SET name = ?, description = ?, subject = ?, html_content = ?,
          brand_color = ?, accent_color = ?, logo_url = ?, font_family = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(
      data.name,
      data.description,
      data.subject,
      data.html,
      data.lookAndFeel?.brandColor,
      data.lookAndFeel?.accentColor,
      data.lookAndFeel?.logoUrl,
      data.lookAndFeel?.fontFamily,
      id
    );
  },

  delete(id) {
    const stmt = db.prepare('DELETE FROM email_templates WHERE id = ?');
    return stmt.run(id);
  }
};

// Look & Feel template operations
const lookFeelService = {
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO look_feel_templates (name, brand_color, accent_color, logo_url, font_family)
      VALUES (?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.name,
      data.brandColor,
      data.accentColor,
      data.logoUrl || null,
      data.fontFamily || 'Arial, sans-serif'
    );

    return info.lastInsertRowid;
  },

  getAll() {
    const stmt = db.prepare('SELECT * FROM look_feel_templates ORDER BY created_at DESC');
    return stmt.all();
  },

  getByName(name) {
    const stmt = db.prepare('SELECT * FROM look_feel_templates WHERE name = ?');
    return stmt.get(name);
  },

  delete(id) {
    const stmt = db.prepare('DELETE FROM look_feel_templates WHERE id = ?');
    return stmt.run(id);
  }
};

// Initialize database on module load
initDatabase();

module.exports = {
  db,
  templateService,
  lookFeelService
};
