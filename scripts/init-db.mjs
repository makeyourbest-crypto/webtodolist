import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'todolist_db';

async function initDatabase() {
  console.log(`🔌 Menghubungkan ke MySQL di ${DB_HOST}:${DB_PORT} (User: ${DB_USER})...`);

  try {
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });

    console.log('✅ Berhasil terhubung ke server MySQL.');

    // 1. Buat database
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Database "${DB_NAME}" siap digunakan.`);

    await connection.query(`USE \`${DB_NAME}\`;`);

    // 2. Buat tabel users
    await connection.query(`
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
    console.log('✅ Tabel "users" siap.');

    // 3. Drop tabel todos lama jika belum ada kolom user_id
    const [columns] = await connection.query(`SHOW COLUMNS FROM \`todos\` LIKE 'user_id';`).catch(() => [[]]);
    if (columns.length === 0) {
      await connection.query(`DROP TABLE IF EXISTS \`todos\`;`);
    }

    // 4. Buat tabel todos berelasi
    await connection.query(`
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
    console.log('✅ Tabel "todos" berelasi siap.');

    await connection.end();
    console.log('\n🎉 Inisialisasi Database Selesai!\n');
  } catch (error) {
    console.error('\n❌ Gagal inisialisasi database:', error.message);
    process.exit(1);
  }
}

initDatabase();
