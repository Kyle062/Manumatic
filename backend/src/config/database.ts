import mysql from "mysql2/promise";
import { env } from "./env";

// ============================================================
// MYSQL CONNECTION POOL
// ============================================================

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+08:00",
  dateStrings: false,
});

// ============================================================
// FORCE TIMEZONE ON EVERY NEW CONNECTION
// ============================================================
// Without this, only the first connection from the pool gets
// the +08:00 timezone. Subsequent connections use the OS
// timezone (usually UTC), causing date shifts.
// ============================================================

pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+08:00'");
});

// ============================================================
// TEST CONNECTION
// ============================================================

export const testConnection = async (): Promise<void> => {
  try {
    const connection = await pool.getConnection();

    // Ensure test connection also uses Manila time
    await connection.query("SET time_zone = '+08:00'");

    // Verify
    const [rows] = await connection.query(
      "SELECT NOW() AS now, CURDATE() AS today, @@session.time_zone AS tz",
    );
    const r = (rows as any[])[0];

    console.log(`🕒 MySQL session time: ${r.now}`);
    console.log(`📅 MySQL session date: ${r.today}`);
    console.log(`🌏 MySQL timezone: ${r.tz}`);

    await connection.ping();
    connection.release();

    console.log(
      `✅ MySQL connected to "${env.DB_NAME}" at ${env.DB_HOST}:${env.DB_PORT}`,
    );
  } catch (error) {
    console.error("❌ MySQL connection failed:", error);
    process.exit(1);
  }
};

export default pool;
