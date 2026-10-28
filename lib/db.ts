import mysql from 'mysql2/promise';

// Konfigurasi koneksi dari environment variables (default XAMPP)
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'todolist_db';

let pool: mysql.Pool | null = null;
let isInitialized = false;

/**
 * Memastikan database dan tabel 'users' serta 'todos' sudah dibuat dengan skema multi-user.
 */
async function ensureDatabaseAndTable() {
  if (isInitialized) return;

  try {
    // 1. Hubungkan ke MySQL server untuk memastikan database ada
    const tempConnection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });

    await tempConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await tempConnection.query(`USE \`${DB_NAME}\`;`);

    // 2. Buat tabel users jika belum ada
    await tempConnection.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`email\` VARCHAR(150) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_users_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Cek apakah tabel todos lama belum memiliki kolom user_id
    const [columns]: any = await tempConnection.query(`
      SHOW COLUMNS FROM \`todos\` LIKE 'user_id';
    `).catch(() => [[]]);

    // Jika tabel todos sudah ada tetapi belum ada kolom user_id, drop dan buat ulang (reset data lama sesuai persetujuan user)
    if (columns.length === 0) {
      await tempConnection.query(`DROP TABLE IF EXISTS \`todos\`;`);
    }

    // 4. Buat tabel todos dengan relasi user_id
    await tempConnection.query(`
      CREATE TABLE IF NOT EXISTS \`todos\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`completed\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        INDEX \`idx_todos_user_id\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await tempConnection.end();
    isInitialized = true;
  } catch (error) {
    console.error('Database auto-initialization error:', error);
    throw error;
  }
}

/**
 * Mendapatkan koneksi pool MySQL yang aktif
 */
export async function getDbPool(): Promise<mysql.Pool> {
  if (!pool) {
    await ensureDatabaseAndTable();

    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
}

/**
 * Helper untuk menjalankan query SQL dengan prepared statements
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  const dbPool = await getDbPool();
  const [results] = await dbPool.execute(sql, params);
  return results as T;
}

/**
 * Cek status koneksi ke MySQL XAMPP
 */
export async function checkConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const dbPool = await getDbPool();
    await dbPool.query('SELECT 1');
    return { ok: true, message: 'MySQL XAMPP Terhubung' };
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      return {
        ok: false,
        message: 'Koneksi ke MySQL gagal: Pastikan MySQL di XAMPP Control Panel sudah dalam status START.',
      };
    }
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      return {
        ok: false,
        message: 'Akses ditolak: Periksa user & password database pada file .env.',
      };
    }
    return {
      ok: false,
      message: `Error MySQL: ${error.message || 'Tidak dapat terhubung'}`,
    };
  }
}
