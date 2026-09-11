export type UserRole = "sales_staff" | "inventory_personnel" | "management";

export interface AuthenticatedUser {
  id: string;
  employeeId: string;
  fullName: string;
  role: UserRole;
}

export interface LoginPayload {
  employeeId: string;
  password: string;
  keepSignedIn: boolean;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  token: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  sales_staff: "Sales Staff",
  inventory_personnel: "Inventory Personnel",
  management: "Management",
};
