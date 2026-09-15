import pool from "../config/database";
import { User } from "../types";

// ============================================================
// FIND USER BY USERNAME
// ============================================================

export const findByUsername = async (
  username: string,
): Promise<User | null> => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE username = ? LIMIT 1",
    [username],
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
    [userId],
  );

  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
};

// ============================================================
// GET ALL USERS (Admin only)
// ============================================================

export const findAll = async (): Promise<User[]> => {
  const [rows] = await pool.execute(
    "SELECT * FROM users ORDER BY created_at DESC",
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
  email: string,
): Promise<number> => {
  const [result] = await pool.execute(
    `INSERT INTO users (username, password, role, name, email)
     VALUES (?, ?, ?, ?, ?)`,
    [username, password, role, name, email],
  );

  return (result as any).insertId;
};

// ============================================================
// UPDATE LAST LOGIN
// ============================================================

export const updateLastLogin = async (userId: number): Promise<void> => {
  await pool.execute("UPDATE users SET last_login = NOW() WHERE user_id = ?", [
    userId,
  ]);
};

// ============================================================
// COUNT USERS
// ============================================================

export const countUsers = async (): Promise<number> => {
  const [rows] = await pool.execute("SELECT COUNT(*) AS total FROM users");
  return (rows as any[])[0].total;
};

// ============================================================
// ADMIN USER MANAGEMENT
// ============================================================

export const findAllPublic = async () => {
  const [rows] = await pool.execute(
    `SELECT user_id, username, role, name, email, created_at, last_login, is_active
     FROM users
     ORDER BY created_at ASC`,
  );
  return rows;
};

export const createUser = async (
  username: string,
  hashedPassword: string,
  role: "admin" | "manager",
  name: string,
  email: string,
): Promise<number> => {
  const [result] = await pool.execute(
    `INSERT INTO users (username, password, role, name, email)
     VALUES (?, ?, ?, ?, ?)`,
    [username, hashedPassword, role, name, email],
  );
  return (result as any).insertId;
};

export const updatePassword = async (
  userId: number,
  hashedPassword: string,
): Promise<number> => {
  const [result] = await pool.execute(
    "UPDATE users SET password = ? WHERE user_id = ?",
    [hashedPassword, userId],
  );
  return (result as any).affectedRows;
};

export const setActive = async (
  userId: number,
  isActive: boolean,
): Promise<number> => {
  const [result] = await pool.execute(
    "UPDATE users SET is_active = ? WHERE user_id = ?",
    [isActive ? 1 : 0, userId],
  );
  return (result as any).affectedRows;
};
