import { Request, Response } from "express";
import { authenticate, InvalidCredentialsError } from "../services/authService";
import { LoginRequestBody } from "../types/user";

export function login(req: Request<{}, {}, LoginRequestBody>, res: Response) {
  const { employeeId, password } = req.body;

  if (!employeeId?.trim() || !password) {
    return res.status(400).json({
      message: "Employee ID and password are both required.",
    });
  }

  try {
    const { user, token } = authenticate(employeeId.trim(), password);
    return res.status(200).json({ user, token });
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return res.status(401).json({ message: err.message });
    }
    console.error("Unexpected login error:", err);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}
