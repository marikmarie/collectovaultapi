require('dotenv').config();
const requiredEnv = ['DB_HOST','DB_USER','DB_PASSWORD','DB_DATABASE'];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error('Missing DB environment variables:', missingEnv.join(', '));
  console.error('Set them in your environment or in a .env file at the project root and re-run the migration.');
  process.exit(1);
}
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 5,
    multipleStatements: true
  });

  const conn = await pool.getConnection();

  try {
    // Ensure migrations table exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        run_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    const migrationsDir = path.join(__dirname, '..', 'src', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found at', migrationsDir);
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const name = file;
      const [rows] = await conn.query('SELECT id FROM migrations WHERE name = ?', [name]);
      if (rows.length > 0) {
        console.log(`Skipped (already applied): ${name}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`Applying migration: ${name}`);
      try {
        await conn.query(sql);
        await conn.query('INSERT INTO migrations (name) VALUES (?)', [name]);
        console.log(`Applied: ${name}`);
      } catch (err) {
        console.error(`Failed to apply migration ${name}:`, err.message || err);
        throw err;
      }
    }

    console.log('Migrations completed');
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});