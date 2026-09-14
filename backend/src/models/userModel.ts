import pool from "../config/database";
import { User } from "../types";

// ============================================================
// FIND USER BY USERNAME
// ============================================================

export const findByUsername = async (
  username: string
): Promise<User | null> => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE username = ? LIMIT 1",
    [username]
  );

  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
};

// ============================================================
// FIND USER BY ID
// ============================================================

export const findById = async (userId: number): Promise<User | null> => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE user_id = ? LIMIT 1",
    [userId]
  );

  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
};

// ============================================================
// GET ALL USERS (Admin only)
// ============================================================

export const findAll = async (): Promise<User[]> => {
  const [rows] = await pool.execute(
    "SELECT * FROM users ORDER BY created_at DESC"
  );
  return rows as User[];
};

// ============================================================
// CREATE USER
// ============================================================

export const create = async (
  username: string,
  password: string,
  role: "admin" | "manager",
  name: string,
  email: string
): Promise<number> => {
  const [result] = await pool.execute(
    `INSERT INTO users (username, password, role, name, email)
     VALUES (?, ?, ?, ?, ?)`,
    [username, password, role, name, email]
  );

  return (result as any).insertId;
};

// ============================================================
// UPDATE LAST LOGIN
// ============================================================

export const updateLastLogin = async (userId: number): Promise<void> => {
  await pool.execute(
    "UPDATE users SET last_login = NOW() WHERE user_id = ?",
    [userId]
  );
};

// ============================================================
// COUNT USERS
// ============================================================

export const countUsers = async (): Promise<number> => {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM users"
  );
  return (rows as any[])[0].total;
};