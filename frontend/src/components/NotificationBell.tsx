import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  AlertTriangle,
  PackageX,
  Receipt,
  TrendingUp,
  RefreshCw,
  CheckCheck,
  ChevronRight,
} from "lucide-react";
import {
  getDashboardStats,
  getDashboardTransactions,
  getLowStockParts,
  getSalesTrend,
} from "../services/api";
import "./NotificationBell.css";

type Tone = "danger" | "warning" | "info" | "success";

interface AppNotification {
  id: string;
  tone: Tone;
  icon: typeof Bell;
  title: string;
  message: string;
  meta: string;
  path: string;
}

const STORAGE_KEY = "manumatik.notifications.read";
const TONE_RANK: Record<Tone, number> = {
  danger: 0,
  warning: 1,
  info: 2,
  success: 3,
};

const readStoredIds = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const money = (n: number) =>
  "₱" +
  Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function NotificationBell() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>(readStoredIds);
  const [loading, setLoading] = useState(false);

  const persistReadIds = (ids: string[]) => {
    setReadIds(ids);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Ignore storage failures (private browsing, etc.).
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, txnRes, lowStockRes, trendRes] = await Promise.all([
        getDashboardStats(),
        getDashboardTransactions(8),
        getLowStockParts(),
        getSalesTrend(),
      ]);

      const notifications: AppNotification[] = [];

      // 1) Parts that need restocking (the most actionable alerts).
      const lowStock = Array.isArray(lowStockRes.data) ? lowStockRes.data : [];
      lowStock.slice(0, 5).forEach((part: any) => {
        const isOut = Number(part.quantity) <= 0;
        notifications.push({
          id: `stock-${part.part_id}`,
          tone: isOut ? "danger" : "warning",
          icon: isOut ? PackageX : AlertTriangle,
          title: isOut ? `Out of stock: ${part.name}` : `Low stock: ${part.name}`,
          message: isOut
            ? "No units left — restock this part now."
            : `${part.quantity} left · reorder level ${part.reorder_level}`,
          meta: part.part_number || "Inventory",
          path: "/inventory",
        });
      });

      // 2) Yesterday's sales recap.
      const trend = Array.isArray(trendRes.data) ? trendRes.data : [];
      const yesterday = trend.length >= 2 ? trend[trend.length - 2] : null;
      if (yesterday) {
        const amount = Number(yesterday.sales) || 0;
        notifications.push({
          id: "sales-yesterday",
          tone: amount > 0 ? "success" : "info",
          icon: TrendingUp,
          title: "Yesterday's sales",
          message:
            amount > 0
              ? `${money(amount)} in sales recorded yesterday.`
              : "No sales were recorded yesterday.",
          meta: `${yesterday.day || "Yesterday"} · Sales recap`,
          path: "/reports",
        });
      }

      // 3) Most recent sale.
      const transactions = Array.isArray(txnRes.data) ? txnRes.data : [];
      if (transactions.length > 0) {
        const txn = transactions[0];
        const when = txn.sale_date
          ? new Date(txn.sale_date).toLocaleString("en-PH", {
              timeZone: "Asia/Manila",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : "Recent";
        notifications.push({
          id: `sale-${txn.sale_id ?? txn.receipt_no}`,
          tone: "info",
          icon: Receipt,
          title: "Latest sale recorded",
          message: `${txn.part_name || "Sale"} · ${money(txn.total_price)}`,
          meta: `${txn.receipt_no || "Receipt"} · ${when}`,
          path: "/reports",
        });
      }

      // 4) Simple pace insight: today vs the same day summary yesterday.
      const todaySales = Number(statsRes.data?.todaySales?.total_sales) || 0;
      const yesterdaySales = Number(yesterday?.sales) || 0;
      if (todaySales > 0 && yesterdaySales > 0) {
        const difference = todaySales - yesterdaySales;
        notifications.push({
          id: "sales-pace",
          tone: difference >= 0 ? "success" : "warning",
          icon: TrendingUp,
          title:
            difference >= 0
              ? "Today is ahead of yesterday"
              : "Today is behind yesterday",
          message: `${money(Math.abs(difference))} ${
            difference >= 0 ? "more" : "less"
          } than yesterday so far.`,
          meta: "Sales pace",
          path: "/dashboard",
        });
      }

      notifications.sort(
        (a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone],
      );
      setItems(notifications);
    } catch (err) {
      console.error("Notification fetch error:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const unreadCount = useMemo(
    () => items.filter((item) => !readIds.includes(item.id)).length,
    [items, readIds],
  );

  const handleItemClick = (item: AppNotification) => {
    if (!readIds.includes(item.id)) {
      persistReadIds([...readIds, item.id]);
    }
    setOpen(false);
    navigate(item.path);
  };

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        type="button"
        className={`notification-bell__button ${open ? "is-open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-bell__panel" role="dialog" aria-label="Notifications">
          <div className="notification-bell__head">
            <div>
              <h3>Notifications</h3>
              <p>
                {unreadCount > 0
                  ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                  : "You're all caught up"}
              </p>
            </div>
            <div className="notification-bell__head-actions">
              <button
                type="button"
                onClick={load}
                title="Refresh notifications"
                aria-label="Refresh notifications"
                disabled={loading}
              >
                <RefreshCw size={15} className={loading ? "is-spinning" : ""} />
              </button>
              <button
                type="button"
                onClick={() => persistReadIds(items.map((item) => item.id))}
                title="Mark all as read"
                aria-label="Mark all as read"
                disabled={items.length === 0 || unreadCount === 0}
              >
                <CheckCheck size={16} />
              </button>
            </div>
          </div>

          <div className="notification-bell__list">
            {loading && items.length === 0 ? (
              <div className="notification-bell__state">Loading updates…</div>
            ) : items.length === 0 ? (
              <div className="notification-bell__state">
                No store updates right now.
              </div>
            ) : (
              items.map((item) => {
                const Icon = item.icon;
                const isRead = readIds.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`notification-item notification-item--${item.tone} ${
                      isRead ? "is-read" : ""
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    <span className="notification-item__icon">
                      <Icon size={16} />
                    </span>
                    <span className="notification-item__body">
                      <span className="notification-item__title">
                        {item.title}
                      </span>
                      <span className="notification-item__message">
                        {item.message}
                      </span>
                      <span className="notification-item__meta">{item.meta}</span>
                    </span>
                    <ChevronRight size={15} className="notification-item__arrow" />
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            className="notification-bell__footer"
            onClick={() => {
              setOpen(false);
              navigate("/reports");
            }}
          >
            View store reports <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
