import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Tag,
  ShoppingCart,
  BarChart3,
  UserCircle2,
  LogOut,
} from "lucide-react";
import { getLowStockParts } from "../services/api";
import signageImg from "../assets/images/Signage.png";
import "./Sidebar.css";

const menuItems = [
  { path: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { path: "/inventory", label: "Inventory", Icon: Tag },
  { path: "/sales", label: "Sales", Icon: ShoppingCart },
  { path: "/reports", label: "Reports", Icon: BarChart3 },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    fetchLowStockCount();

    // Refresh every 30 seconds so the badge stays current
    const interval = setInterval(fetchLowStockCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLowStockCount = async () => {
    try {
      const res = await getLowStockParts();
      setLowStockCount(res.data.length);
    } catch (err) {
      // Silently fail
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <img src={signageImg} alt="Manumatik" className="sidebar__logo-img" />
      </div>

      <div className="sidebar__user">
        <div className="sidebar__avatar">
          <UserCircle2 size={22} strokeWidth={1.8} />
        </div>
        <div className="sidebar__user-info">
          <div className="sidebar__user-name">{user?.name}</div>
          <div className="sidebar__user-role">
            {user?.role === "admin" ? "Admin/Owner" : "Manager"}
          </div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {menuItems.map(({ path, label, Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              type="button"
              className={`sidebar__nav-item ${active ? "is-active" : ""}`}
              onClick={() => navigate(path)}
            >
              <span className="sidebar__nav-icon">
                <Icon size={17} strokeWidth={2} />
              </span>
              <span className="sidebar__nav-label">{label}</span>
              {path === "/inventory" && lowStockCount > 0 && (
                <span className="sidebar__nav-badge">{lowStockCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <button type="button" className="sidebar__logout" onClick={logout}>
          <LogOut size={14} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
