import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { AlertTriangle, Receipt, Activity, ArrowRight } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import "./Dashboard.css";

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

// Sample weekly sales data for the chart
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

// ============================================================
// COMPONENT
// ============================================================

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const money = (n: number) =>
    "₱" +
    n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Header title="Dashboard" />

        <div className="dashboard-content">
          {/* ROW 1: Analytics + Needs Reordering */}
          <div className="dash-row-top">
            {/* Analytics */}
            <div className="dash-card dash-analytics">
              <h2 className="dash-card__title">Analytics</h2>

              {/* Mini chart */}
              <div className="analytics-chart">
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart
                    data={salesTrend}
                    margin={{ top: 6, right: 12, bottom: 0, left: -20 }}
                  >
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
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                      }}
                      formatter={(value) =>
                        "₱" + Number(value).toLocaleString()
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#0f6b5c"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#0f6b5c" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Stats */}
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
              <h2 className="dash-card__title">Needs reordering</h2>

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

            <div className="dash-card dash-logs">
              <div className="dash-card__subtitle-row dash-card__subtitle-row--light">
                <Activity size={14} />
                <span>Activity Logs</span>
              </div>
              <div className="dash-logs__body" />
            </div>
          </div>

          {/* ROW 3: Placeholder Banners */}
          <div className="dash-banners">
            <div className="dash-banner-placeholder">
              <span>Banner 1 — Car Service</span>
            </div>
            <div className="dash-banner-placeholder">
              <span>Banner 2 — Motorcycle Repair</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
