import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Inventory from "./pages/Inventory/Inventory";
import Sales from "./pages/Sales/Sales";
import Reports from "./pages/Reports/Reports";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Default → Login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/inventory"
            element={
              <RequireAuth>
                <Inventory />
              </RequireAuth>
            }
          />

          <Route
            path="/sales"
            element={
              <RequireAuth>
                <Sales />
              </RequireAuth>
            }
          />

          <Route
            path="/reports"
            element={
              <RequireAuth>
                <Reports />
              </RequireAuth>
            }
          />

          {/* 404 → Login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
