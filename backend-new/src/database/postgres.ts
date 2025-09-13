import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// PostgreSQL database connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/video_meeting_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initializeDatabase() {
  try {
    // Test the connection
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    client.release();
    
    // Run migrations
    await runMigrations();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        password TEXT,
        is_recording_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        max_participants INTEGER NOT NULL DEFAULT 10,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL REFERENCES rooms(id),
        name TEXT NOT NULL,
        joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
        left_at TIMESTAMP,
        is_audio_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        is_video_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        is_screen_sharing BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_participants_active ON participants(room_id, left_at) WHERE left_at IS NULL;
    `);

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connections...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connections...');
  await pool.end();
  process.exit(0);
});
