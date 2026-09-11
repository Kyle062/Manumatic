/**
 * The study defines three user groups who share the system:
 * sales staff, inventory personnel, and management/owner.
 * Access level and available modules are determined by this role.
 */
export type UserRole = "sales_staff" | "inventory_personnel" | "management";

export interface User {
  id: string;
  employeeId: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
}

export interface PublicUser {
  id: string;
  employeeId: string;
  fullName: string;
  role: UserRole;
}

export interface LoginRequestBody {
  employeeId: string;
  password: string;
  keepSignedIn?: boolean;
}
