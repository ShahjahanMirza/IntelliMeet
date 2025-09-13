import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite database setup for development
const dbPath = path.join(__dirname, '../../database.sqlite');

export interface DatabaseResult {
  rows: any[];
  rowCount: number;
}

export class SQLiteWrapper {
  public db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(dbPath);
  }

  async query(sql: string, params: any[] = []): Promise<DatabaseResult> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: any, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            rows: rows || [],
            rowCount: rows ? rows.length : 0
          });
        }
      });
    });
  }

  async update(sql: string, params: any[] = []): Promise<DatabaseResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err: any) {
        if (err) {
          reject(err);
        } else {
          resolve({
            rows: [],
            rowCount: this.changes
          });
        }
      });
    });
  }

  async queryRow(sql: string, params: any[] = []): Promise<any> {
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  async insertAndReturn(sql: string, params: any[] = [], tableName: string, idColumn: string = 'id', customId?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const self = this;
      this.db.run(sql, params, function(err: any) {
        if (err) {
          reject(err);
        } else {
          // Use custom ID if provided, otherwise use lastID
          const idToUse = customId || this.lastID;
          // Get the inserted row
          self.db.get(`SELECT * FROM ${tableName} WHERE ${idColumn} = ?`, [idToUse], (err: any, row: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(row);
            }
          });
        }
      });
    });
  }

  async exec(sql: string, params: any[] = []): Promise<DatabaseResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err: any) {
        if (err) {
          reject(err);
        } else {
          resolve({
            rows: [],
            rowCount: this.changes
          });
        }
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export const pool = new SQLiteWrapper();

export async function initializeDatabase() {
  try {
    console.log('Initializing SQLite database...');

    // Run migrations
    await runMigrations();

    console.log('SQLite database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

async function runMigrations() {
  try {
    // Create tables if they don't exist
    await pool.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        password TEXT,
        is_recording_enabled BOOLEAN NOT NULL DEFAULT 0,
        max_participants INTEGER NOT NULL DEFAULT 10,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        creator_id TEXT
      )
    `);

    await pool.exec(`
      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL REFERENCES rooms(id),
        name TEXT NOT NULL,
        joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        left_at DATETIME,
        is_audio_enabled BOOLEAN NOT NULL DEFAULT 1,
        is_video_enabled BOOLEAN NOT NULL DEFAULT 1,
        is_screen_sharing BOOLEAN NOT NULL DEFAULT 0,
        is_host BOOLEAN NOT NULL DEFAULT 0
      )
    `);

    // Create indexes
    await pool.exec(`
      CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id)
    `);

    await pool.exec(`
      CREATE INDEX IF NOT EXISTS idx_participants_active ON participants(room_id, left_at)
    `);

    // Add is_host column if it doesn't exist (for existing databases)
    try {
      await pool.exec(`
        ALTER TABLE participants ADD COLUMN is_host BOOLEAN NOT NULL DEFAULT 0
      `);
      console.log('Added is_host column to participants table');
    } catch (error) {
      // Column already exists, ignore the error
      console.log('is_host column already exists or error adding it:', error);
    }

    // Add creator_id column to rooms if it doesn't exist (for existing databases)
    try {
      await pool.exec(`
        ALTER TABLE rooms ADD COLUMN creator_id TEXT
      `);
      console.log('Added creator_id column to rooms table');
    } catch (error) {
      // Column already exists, ignore the error
      console.log('creator_id column already exists or error adding it:', error);
    }

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Export cleanup function for graceful shutdown
export async function cleanupDatabase() {
  console.log('Closing database connections...');
  await pool.close();
}
