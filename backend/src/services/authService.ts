import * as userModel from "../models/userModel";
import { comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { UserPublic } from "../types";

// ============================================================
// LOGIN
// ============================================================

export interface LoginResult {
  token: string;
  user: UserPublic;
}

export const login = async (
  username: string,
  password: string
): Promise<LoginResult> => {
  // Trim inputs
  const cleanUsername = username.trim();

  if (!cleanUsername || !password) {
    throw {
      status: 400,
      message: "Username and password are required."
    };
  }

  // Find user
  const user = await userModel.findByUsername(cleanUsername);

  if (!user) {
    throw {
      status: 401,
      message: "Invalid username or password."
    };
  }

  if (user.is_active === 0) {
  throw {
    status: 401,
    message: "Account is disabled. Contact the administrator."
  };
}

  // Compare password
  const valid = await comparePassword(password, user.password);

  if (!valid) {
    throw {
      status: 401,
      message: "Invalid username or password."
    };
  }

  // Update last login
  await userModel.updateLastLogin(user.user_id);

  // Sign JWT
  const token = signToken({
    user_id: user.user_id,
    username: user.username,
    role: user.role
  });

  // Build public user (no password)
  const publicUser: UserPublic = {
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    name: user.name,
    email: user.email
  };

  return { token, user: publicUser };
};

// ============================================================
// GET CURRENT USER
// ============================================================

export const getCurrentUser = async (
  userId: number
): Promise<UserPublic> => {
  const user = await userModel.findById(userId);

  if (!user) {
    throw {
      status: 404,
      message: "User not found."
    };
  }

  return {
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    name: user.name,
    email: user.email
  };
};