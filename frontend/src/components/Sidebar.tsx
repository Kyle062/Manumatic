import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Tag,
  ShoppingCart,
  BarChart3,
  MessageSquare,
  UserCircle2,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { getLowStockParts } from "../services/api";
import signageImg from "../assets/images/Signage.png";
import "./Sidebar.css";

const menuItems = [
  { path: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { path: "/inventory", label: "Inventory", Icon: Tag },
  { path: "/sales", label: "Sales", Icon: ShoppingCart },
  { path: "/reports", label: "Reports", Icon: BarChart3 },
  { path: "/messages", label: "Messages", Icon: MessageSquare },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [lowStockCount, setLowStockCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetchLowStockCount();

    // Refresh every 30 seconds so the badge stays current
    const interval = setInterval(fetchLowStockCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Allow closing the drawer with Escape on touch laptops / keyboards.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const fetchLowStockCount = async () => {
    try {
      const res = await getLowStockParts();
      setLowStockCount(res.data.length);
    } catch (err) {
      // Silently fail
    }
  };

  const handleLogout = () => {
    // Only remove rememberedUsername if rememberMe is false
    // But since we can't easily access rememberMe state here,
    // let's rely on the user's explicit preference or clear it if they choose.
    // For now, let's keep the username if they checked "remember me" previously,
    // and just clear the password/session token which happens implicitly via logout().
    setMobileOpen(false);
    logout();
    navigate("/login");
  };

  const goTo = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <>
      <button
        type="button"
        className="sidebar__mobile-toggle"
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={20} strokeWidth={2} />
      </button>

      {mobileOpen && (
        <div
          className="sidebar__backdrop"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="sidebar__logo">
          <img src={signageImg} alt="Manumatik" className="sidebar__logo-img" />
          <button
            type="button"
            className="sidebar__close"
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} strokeWidth={2} />
          </button>
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
                onClick={() => goTo(path)}
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
          <button type="button" className="sidebar__logout" onClick={handleLogout}>
            <LogOut size={14} strokeWidth={2} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
