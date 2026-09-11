import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../types/auth";
import "./Dashboard.css";

export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="dashboard-placeholder">
      <div>
        <p className="dashboard-placeholder__eyebrow">Signed in</p>
        <h1>
          {user ? `Welcome, ${user.fullName}` : "Welcome"}
        </h1>
        {user && (
          <p className="dashboard-placeholder__role">{ROLE_LABELS[user.role]}</p>
        )}
        <p className="dashboard-placeholder__note">
          This is a placeholder — the dashboard, inventory, sales, orders, and
          reports modules are built next.
        </p>
        <button onClick={signOut} className="dashboard-placeholder__signout">
          Sign out
        </button>
      </div>
    </div>
  );
}
