import * as userModel from "../models/userModel";
import { hashPassword, comparePassword } from "../utils/password";

// ============================================================
// LIST ALL USERS (Admin only)
// ============================================================

export const listUsers = async () => {
  return userModel.findAllPublic();
};

// ============================================================
// CREATE USER (Admin only)
// ============================================================

export interface CreateUserInput {
  username: string;
  password: string;
  role: "admin" | "manager";
  name: string;
  email: string;
}

export const createUser = async (data: CreateUserInput) => {
  const username = data.username?.trim();
  const password = data.password;
  const name = data.name?.trim();
  const email = data.email?.trim();

  if (!username) {
    throw { status: 400, message: "Username is required." };
  }

  if (!password || password.length < 6) {
    throw {
      status: 400,
      message: "Password must be at least 6 characters."
    };
  }

  if (!name) {
    throw { status: 400, message: "Name is required." };
  }

  if (!email) {
    throw { status: 400, message: "Email is required." };
  }

  if (data.role !== "admin" && data.role !== "manager") {
    throw {
      status: 400,
      message: "Role must be 'admin' or 'manager'."
    };
  }

  const existing = await userModel.findByUsername(username);
  if (existing) {
    throw { status: 400, message: "Username already exists." };
  }

  const hashed = await hashPassword(password);
  const userId = await userModel.createUser(
    username,
    hashed,
    data.role,
    name,
    email
  );

  return { user_id: userId };
};

// ============================================================
// RESET PASSWORD (Admin verifies own password first)
// ============================================================

export const resetPassword = async (
  adminUserId: number,
  targetUserId: number,
  adminPassword: string,
  newPassword: string
): Promise<void> => {
  // ---- Validate inputs ----
  if (!adminPassword) {
    throw { status: 400, message: "Your password is required." };
  }

  if (!newPassword || newPassword.length < 6) {
    throw {
      status: 400,
      message: "New password must be at least 6 characters."
    };
  }

  // ---- Verify admin's own password ----
  const admin = await userModel.findById(adminUserId);
  if (!admin) {
    throw { status: 404, message: "Admin account not found." };
  }

  const validAdminPassword = await comparePassword(
    adminPassword,
    admin.password
  );

  if (!validAdminPassword) {
    throw { status: 401, message: "Your password is incorrect." };
  }

  // ---- Verify target user exists ----
  const target = await userModel.findById(targetUserId);
  if (!target) {
    throw { status: 404, message: "Target user not found." };
  }

  // ---- Prevent resetting own password through this UI ----
  if (adminUserId === targetUserId) {
    throw {
      status: 400,
      message: "Use profile settings to change your own password."
    };
  }

  // ---- Hash and save new password ----
  const hashed = await hashPassword(newPassword);
  await userModel.updatePassword(targetUserId, hashed);
};

// ============================================================
// TOGGLE ACTIVE (Admin only)
// ============================================================

export const toggleActive = async (
  userId: number,
  isActive: boolean
): Promise<void> => {
  const user = await userModel.findById(userId);
  if (!user) {
    throw { status: 404, message: "User not found." };
  }

  await userModel.setActive(userId, isActive);
};