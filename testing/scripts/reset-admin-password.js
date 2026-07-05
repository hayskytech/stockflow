import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DB connection details live in backend/.env; the target test credentials live in testing/.env.test.
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } = process.env;

if (!TEST_ADMIN_EMAIL || !TEST_ADMIN_PASSWORD) {
  console.error('Missing TEST_ADMIN_EMAIL or TEST_ADMIN_PASSWORD in testing/.env.test');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    const passwordHash = await bcrypt.hash(TEST_ADMIN_PASSWORD, 12);

    const [result] = await connection.execute(
      `UPDATE users
       SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL, must_change_password = 0
       WHERE email = ? AND role = 'admin'`,
      [passwordHash, TEST_ADMIN_EMAIL],
    );

    if (result.affectedRows === 0) {
      console.error(`No admin user found with email ${TEST_ADMIN_EMAIL}`);
      process.exit(1);
    }

    console.log(`Password reset for admin user ${TEST_ADMIN_EMAIL}`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
