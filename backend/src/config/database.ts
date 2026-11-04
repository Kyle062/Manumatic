import mysql from "mysql2/promise";
import { env } from "./env";

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

pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+08:00'");
});

export const testConnection = async (): Promise<void> => {
  try {
    const connection = await pool.getConnection();

    await connection.query("SET time_zone = '+08:00'");

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
