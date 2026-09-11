import { LoginPayload, LoginResponse } from "../types/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export class AuthApiError extends Error {}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: payload.employeeId,
        password: payload.password,
        keepSignedIn: payload.keepSignedIn,
      }),
    });
  } catch {
    throw new AuthApiError("Can't reach the server. Check your connection and try again.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthApiError(data?.message || "Sign in failed. Please try again.");
  }

  return data as LoginResponse;
}
