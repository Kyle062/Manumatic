import bcrypt from "bcryptjs";
import { User } from "../types/user";

/**
 * Placeholder in-memory store standing in for the real database.
 * Swap findUserByEmployeeId() for a real query once the schema
 * (parts, inventory, sales, orders) is designed in a later step.
 *
 * Seed passwords are all "changeme123" — for local dev only.
 */
const seedHash = bcrypt.hashSync("changeme123", 10);

const users: User[] = [
  {
    id: "u-001",
    employeeId: "MGT-001",
    fullName: "Kyle Bernard Trimidal",
    role: "management",
    passwordHash: seedHash,
  },
  {
    id: "u-002",
    employeeId: "SLS-001",
    fullName: "Cherry Mae Cortez",
    role: "sales_staff",
    passwordHash: seedHash,
  },
  {
    id: "u-003",
    employeeId: "INV-001",
    fullName: "Jelbert Forro",
    role: "inventory_personnel",
    passwordHash: seedHash,
  },
];

export function findUserByEmployeeId(employeeId: string): User | undefined {
  return users.find(
    (u) => u.employeeId.toLowerCase() === employeeId.toLowerCase()
  );
}
