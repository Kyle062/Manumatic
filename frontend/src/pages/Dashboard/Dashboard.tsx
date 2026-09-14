import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import {
  AlertTriangle,
  Receipt,
  Activity,
  ArrowRight,
  Plus,
  ShoppingCart,
  BarChart3,
  Package,
  TrendingUp,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import "./Dashboard.css";

import DashboardImg1 from "../../assets/images/DashboardImg1.png";
import DashboardImg2 from "../../assets/images/DashboardImg2.png";

// ============================================================
// MOCK DATA
// ============================================================

const analytics = {
  todaySales: 4388.0,
  todayTransactions: 1,
  totalTransactions: 7,
  lowStockItems: 3,
  partsInCatalog: 12,
  unitsOnHand: 234,
};

const salesTrend = [
  { day: "Mon", sales: 1200 },
  { day: "Tue", sales: 2100 },
  { day: "Wed", sales: 1800 },
  { day: "Thu", sales: 3200 },
  { day: "Fri", sales: 2600 },
  { day: "Sat", sales: 4100 },
  { day: "Sun", sales: 4388 },
];

const needsReordering = [
  { name: "Iridium Sparkplug", part_number: "P-1002", left: 8 },
  { name: "Oil Filter Cartridge", part_number: "P-1006", left: 3 },
  { name: "Brake Rotor Disc (Pair)", part_number: "P-1009", left: 5 },
];

const recentTransactions = [
  {
    receipt: "RCP-16331",
    customer: "Walk-in",
    date: "2026-09-05",
    total: 144.0,
  },
  {
    receipt: "RCP-16344",
    customer: "Ramon Dela Cruz",
    date: "2026-09-06",
    total: 3320.0,
  },
  {
    receipt: "RCP-16360",
    customer: "Walk-in",
    date: "2026-09-07",
    total: 1435.0,
  },
  {
    receipt: "RCP-16278",
    customer: "Nissan Repair Shop",
    date: "2026-09-08",
    total: 4704.0,
  },
  {
    receipt: "RCP-16301",
    customer: "Walk-in",
    date: "2026-09-09",
    total: 3012.0,
  },
  {
    receipt: "RCP-16330",
    customer: "Mercedes Auto Repair",
    date: "2026-09-10",
    total: 1472.0,
  },
];

const activityLogs = [
  { time: "10:42", text: "System Admin processed sale RCP-16331" },
  { time: "10:15", text: "Store Manager updated stock for P-1002" },
  { time: "09:58", text: "System Admin added new part P-1012" },
  { time: "09:30", text: "Store Manager processed sale RCP-16330" },
  { time: "08:55", text: "System Admin logged in" },
  { time: "08:40", text: "Daily backup completed successfully" },
];

const topSellingParts = [
  { name: "Brake Pad — Toyota Vios", sold: 42, revenue: 50400 },
  { name: "Oil Filter — Honda Civic", sold: 38, revenue: 13300 },
  { name: "Spark Plug — NGK", sold: 35, revenue: 9800 },
  { name: "Air Filter — Mitsubishi", sold: 27, revenue: 12150 },
  { name: "Shock Absorber — Toyota", sold: 18, revenue: 45000 },
];

// Banner slides for the carousel
const bannerSlides = [
  { src: DashboardImg1, alt: "Banner 1 — Car Service" },
  { src: DashboardImg2, alt: "Banner 2 — Motorcycle Repair" },
];

// ============================================================
// COMPONENT
// ============================================================

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ----- Carousel state -----
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setSlide((s) => (s + 1) % bannerSlides.length);
    }, 4000);
    return () => clearInterval(id);
  }, [paused]);

  const prevSlide = () => {
    setSlide((s) => (s - 1 + bannerSlides.length) % bannerSlides.length);
  };
  const nextSlide = () => {
    setSlide((s) => (s + 1) % bannerSlides.length);
  };

  // ----- Helpers -----
  const money = (n: number) =>
    "₱" +
    n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const shortMoney = (n: number) => "₱" + n.toLocaleString("en-PH");

  const quickActions = [
    {
      label: "New Sale",
      hint: "Process a walk-in checkout",
      icon: ShoppingCart,
      path: "/sales",
      accent: "#0f6b5c",
    },
    {
      label: "Add Part",
      hint: "Register a new part",
      icon: Plus,
      path: "/inventory",
      accent: "#1d4ed8",
    },
    {
      label: "View Reports",
      hint: "Sales & inventory analytics",
      icon: BarChart3,
      path: "/reports",
      accent: "#7c3aed",
    },
    {
      label: "Manage Stock",
      hint: "Adjust quantities & alerts",
      icon: Package,
      path: "/inventory",
      accent: "#b45309",
    },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Header title="Dashboard" />

        <div className="dashboard-content">
          {/* ================================
              WELCOME STRIP
              ================================ */}
          <div className="welcome-strip">
            <div className="welcome-strip__left">
              <h2 className="welcome-strip__title">
                Welcome back, {user?.name?.split(" ")[0] || "User"} 👋
              </h2>
              <p className="welcome-strip__sub">
                Here's what's happening in your store today.
              </p>
            </div>
            <div className="welcome-strip__right">
              <button
                type="button"
                className="welcome-strip__cta"
                onClick={() => navigate("/sales")}
              >
                <ShoppingCart size={15} />
                New Sale
              </button>
            </div>
          </div>

          {/* ROW 1: Analytics + Needs Reordering */}
          <div className="dash-row-top">
            <div className="dash-card dash-analytics">
              <div className="dash-card__head">
                <h2 className="dash-card__title">Analytics</h2>
                <span className="dash-card__hint">Last 7 days</span>
              </div>

              <div className="analytics-chart">
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart
                    data={salesTrend}
                    margin={{ top: 8, right: 12, bottom: 0, left: -20 }}
                  >
                    <defs>
                      <linearGradient
                        id="salesFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#0f6b5c"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#0f6b5c"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#eef0f3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      }}
                      formatter={(value) =>
                        "₱" + Number(value).toLocaleString()
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#0f6b5c"
                      strokeWidth={2.5}
                      fill="url(#salesFill)"
                      dot={{ r: 3, fill: "#0f6b5c" }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="analytics-list">
                <div className="analytics-item">
                  <div className="analytics-item__label">Today's sales</div>
                  <div className="analytics-item__value">
                    {money(analytics.todaySales)}
                  </div>
                  <div className="analytics-item__sub">
                    {analytics.todayTransactions} transaction(s)
                  </div>
                </div>

                <div className="analytics-item">
                  <div className="analytics-item__label">
                    Total transactions
                  </div>
                  <div className="analytics-item__value">
                    {analytics.totalTransactions}
                  </div>
                  <div className="analytics-item__sub">
                    All-time recorded sales
                  </div>
                </div>

                <div className="analytics-item">
                  <div className="analytics-item__label">Low stock items</div>
                  <div className="analytics-item__value">
                    {analytics.lowStockItems}
                  </div>
                  <div className="analytics-item__sub">
                    At or below reorder level
                  </div>
                </div>

                <div className="analytics-item">
                  <div className="analytics-item__label">Parts in catalog</div>
                  <div className="analytics-item__value">
                    {analytics.partsInCatalog}
                  </div>
                  <div className="analytics-item__sub">
                    {analytics.unitsOnHand} units on hand
                  </div>
                </div>
              </div>
            </div>

            {/* Needs Reordering */}
            <div className="dash-card dash-reorder">
              <div className="dash-card__head">
                <h2 className="dash-card__title">Needs reordering</h2>
                <span className="dash-badge-count">
                  {needsReordering.length}
                </span>
              </div>

              <div className="reorder-list">
                {needsReordering.map((item) => (
                  <div className="reorder-item" key={item.part_number}>
                    <div className="reorder-item__left">
                      <AlertTriangle size={16} className="reorder-item__icon" />
                      <div className="reorder-item__info">
                        <div className="reorder-item__name">{item.name}</div>
                        <div className="reorder-item__code">
                          {item.part_number}
                        </div>
                      </div>
                    </div>
                    <div className="reorder-item__badge">{item.left} left</div>
                  </div>
                ))}
              </div>

              <div className="reorder-footer">
                <button
                  type="button"
                  className="reorder-btn"
                  onClick={() => navigate("/sales")}
                >
                  View Sales
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* ROW 2: Recent Transactions + Activity Logs */}
          <div className="dash-row-bottom">
            <div className="dash-card dash-transactions">
              <div className="dash-card__subtitle-row">
                <Receipt size={14} />
                <span>Recent transactions</span>
              </div>

              <div className="txn-scroll">
                <table className="txn-table">
                  <thead>
                    <tr>
                      <th>RECEIPT</th>
                      <th>CUSTOMER</th>
                      <th>DATE</th>
                      <th className="txn-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((txn) => (
                      <tr key={txn.receipt}>
                        <td>{txn.receipt}</td>
                        <td>{txn.customer}</td>
                        <td>{txn.date}</td>
                        <td className="txn-right">{money(txn.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="dash-card dash-logs">
              <div className="dash-card__subtitle-row dash-card__subtitle-row--light">
                <Activity size={14} />
                <span>Activity Logs</span>
              </div>

              <div className="logs-scroll">
                <ul className="logs-list">
                  {activityLogs.map((log, i) => (
                    <li className="log-item" key={i}>
                      <span className="log-item__time">{log.time}</span>
                      <span className="log-item__text">{log.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ROW 3: Quick Actions (with carousel inside) + Top Selling */}
          <div className="dash-row-third">
            {/* Quick Actions + Carousel */}
            <div className="dash-card dash-quick">
              <div className="dash-card__head">
                <h2 className="dash-card__title">Quick Actions</h2>
                <span className="dash-card__hint">Shortcuts</span>
              </div>

              <div className="quick-grid">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      className="quick-card"
                      onClick={() => navigate(action.path)}
                    >
                      <span
                        className="quick-card__icon"
                        style={{
                          background: `${action.accent}1a`,
                          color: action.accent,
                        }}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="quick-card__body">
                        <span className="quick-card__label">
                          {action.label}
                        </span>
                        <span className="quick-card__hint">{action.hint}</span>
                      </span>
                      <ArrowUpRight size={14} className="quick-card__arrow" />
                    </button>
                  );
                })}
              </div>

              {/* =============================
                  BANNER CAROUSEL (inside card)
                  ============================= */}
              <div
                className="banner-carousel"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
                <div
                  className="banner-carousel__track"
                  style={{ transform: `translateX(-${slide * 100}%)` }}
                >
                  {bannerSlides.map((b, i) => (
                    <div className="banner-carousel__slide" key={i}>
                      <img
                        src={b.src}
                        alt={b.alt}
                        className="banner-carousel__img"
                      />
                    </div>
                  ))}
                </div>

                {/* Arrows */}
                <button
                  type="button"
                  className="banner-carousel__nav banner-carousel__nav--prev"
                  onClick={prevSlide}
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="banner-carousel__nav banner-carousel__nav--next"
                  onClick={nextSlide}
                  aria-label="Next slide"
                >
                  <ChevronRight size={16} />
                </button>

                {/* Dots */}
                <div className="banner-carousel__dots">
                  {bannerSlides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`banner-carousel__dot ${
                        slide === i ? "is-active" : ""
                      }`}
                      onClick={() => setSlide(i)}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Top Selling */}
            <div className="dash-card dash-top">
              <div className="dash-card__head">
                <h2 className="dash-card__title">Top Selling Parts</h2>
                <span className="dash-card__hint">This week</span>
              </div>

              <ul className="top-list">
                {topSellingParts.map((part, idx) => (
                  <li className="top-item" key={part.name}>
                    <span className="top-item__rank">{idx + 1}</span>
                    <span className="top-item__info">
                      <span className="top-item__name">{part.name}</span>
                      <span className="top-item__sold">
                        <TrendingUp size={11} /> {part.sold} sold
                      </span>
                    </span>
                    <span className="top-item__revenue">
                      {shortMoney(part.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
