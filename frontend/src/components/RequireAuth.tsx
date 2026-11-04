import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ReactNode } from "react";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();

  // ✅ 1. Wait for localStorage to load before redirecting
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#0f6b5c",
          fontWeight: "bold",
          fontSize: "14px",
        }}
      >
        Loading system...
      </div>
    );
  }

  // ✅ 2. Check both user object and token presence
  if (!user || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}