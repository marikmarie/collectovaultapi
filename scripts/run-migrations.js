require('dotenv').config();

// Support both DB_* and VAULT_DB* environment variables
const dbHost = process.env.DB_HOST || process.env.VAULT_DB || '127.0.0.1';
const dbUser = process.env.DB_USER || process.env.VAULT_DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || process.env.VAULT_DB_PASS || '';
const dbDatabase = process.env.DB_DATABASE || process.env.VAULT_DB_NAME || 'collecto_vault';
const dbPort = Number(process.env.DB_PORT) || Number(process.env.VAULT_DB_PORT) || 3306;

const requiredVars = [
  { name: 'dbHost', value: dbHost },
  { name: 'dbUser', value: dbUser },
  { name: 'dbPassword', value: dbPassword },
  { name: 'dbDatabase', value: dbDatabase }
];

const missingVars = requiredVars.filter(v => !v.value).map(v => v.name);
if (missingVars.length) {
  console.error('Missing required database variables:', missingVars.join(', '));
  console.error('Set them in your environment or in a .env file at the project root and re-run the migration.');
  process.exit(1);
}
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  const pool = mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbDatabase,
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