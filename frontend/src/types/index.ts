export interface User {
  user_id: number;
  username: string;
  role: "admin" | "manager";
  name: string;
  email: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}