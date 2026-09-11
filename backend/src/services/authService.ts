import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { findUserByEmployeeId } from "../models/userModel";
import { PublicUser } from "../types/user";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
  "8h") as SignOptions["expiresIn"];

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid employee ID or password.");
    this.name = "InvalidCredentialsError";
  }
}

export function authenticate(
  employeeId: string,
  password: string
): { user: PublicUser; token: string } {
  const user = findUserByEmployeeId(employeeId);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw new InvalidCredentialsError();
  }

  const publicUser: PublicUser = {
    id: user.id,
    employeeId: user.employeeId,
    fullName: user.fullName,
    role: user.role,
  };

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { user: publicUser, token };
}
