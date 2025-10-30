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

  // Client Profile table (single row for settings)
  db.exec(`
    CREATE TABLE IF NOT EXISTS client_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      website_url TEXT,
      corporate_identity TEXT,
      tone_of_voice TEXT,
      contact_info TEXT,
      email_config TEXT,
      content_guidelines TEXT,
      compliance TEXT,
      last_scanned_at DATETIME,
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

// Client Profile operations (single row)
const clientProfileService = {
  get() {
    const stmt = db.prepare('SELECT * FROM client_profile WHERE id = 1');
    return stmt.get();
  },

  upsert(data) {
    const existing = this.get();

    if (existing) {
      const stmt = db.prepare(`
        UPDATE client_profile SET
          website_url = ?,
          corporate_identity = ?,
          tone_of_voice = ?,
          contact_info = ?,
          email_config = ?,
          content_guidelines = ?,
          compliance = ?,
          last_scanned_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `);

      stmt.run(
        data.website_url || existing.website_url,
        data.corporate_identity || existing.corporate_identity,
        data.tone_of_voice || existing.tone_of_voice,
        data.contact_info || existing.contact_info,
        data.email_config || existing.email_config,
        data.content_guidelines || existing.content_guidelines,
        data.compliance || existing.compliance,
        data.last_scanned_at || existing.last_scanned_at
      );
    } else {
      const stmt = db.prepare(`
        INSERT INTO client_profile (
          id, website_url, corporate_identity, tone_of_voice,
          contact_info, email_config, content_guidelines,
          compliance, last_scanned_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        data.website_url || null,
        data.corporate_identity || null,
        data.tone_of_voice || null,
        data.contact_info || null,
        data.email_config || null,
        data.content_guidelines || null,
        data.compliance || null,
        data.last_scanned_at || null
      );
    }

    return this.get();
  }
};

// Initialize database on module load
initDatabase();

module.exports = {
  db,
  templateService,
  lookFeelService,
  clientProfileService
};
