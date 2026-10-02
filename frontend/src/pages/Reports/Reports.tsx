import { useState, useEffect, useMemo } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast, { ToastType } from "../../components/Toast";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Users,
  Download,
  BarChart3,
  Clock,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  getSalesOverview,
  getInventoryValuation,
  getTopMovers,
  getReorderPriority,
  getLowStockForecast,
  getCashierPerformance,
} from "../../services/api";
import "./Reports.css";

// ============================================================
// TYPES
// ============================================================

type Tab =
  | "sales"
  | "valuation"
  | "movers"
  | "reorder"
  | "forecast"
  | "cashier";

type Range = "today" | "week" | "month";

interface ToastState {
  message: string;
  type: ToastType;
}

const CATEGORY_COLORS = [
  "#0f6b5c",
  "#1d4ed8",
  "#7c3aed",
  "#b45309",
  "#dc2626",
  "#0891b2",
  "#65a30d",
];

// ============================================================
// COMPONENT
// ============================================================

export default function Reports() {
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<Range>("today");

  // ---- Data ----
  const [salesData, setSalesData] = useState<any>(null);
  const [valuationData, setValuationData] = useState<any>(null);
  const [moversData, setMoversData] = useState<any>(null);
  const [reorderData, setReorderData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [cashierData, setCashierData] = useState<any[]>([]);

  // ---- Load data on tab change ----
  useEffect(() => {
    loadTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, range]);

  const loadTab = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "sales":
          const r1 = await getSalesOverview(range);
          setSalesData(r1.data);
          break;
        case "valuation":
          const r2 = await getInventoryValuation();
          setValuationData(r2.data);
          break;
        case "movers":
          const r3 = await getTopMovers(5);
          setMoversData(r3.data);
          break;
        case "reorder":
          const r4 = await getReorderPriority();
          setReorderData(r4.data);
          break;
        case "forecast":
          const r5 = await getLowStockForecast();
          setForecastData(r5.data);
          break;
        case "cashier":
          const r6 = await getCashierPerformance();
          setCashierData(r6.data);
          break;
      }
    } catch (err) {
      console.error("Failed to load report:", err);
      showToast("Failed to load report data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  // ---- Helpers ----
  const money = (n: number) =>
    "₱" +
    Number(n).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const shortMoney = (n: number) =>
    "₱" + Number(n).toLocaleString("en-PH", { maximumFractionDigits: 0 });

  const shortDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
  };

  // ---- CSV Export ----
  const exportCSV = (filename: string, rows: any[]) => {
    if (!rows || rows.length === 0) {
      showToast("No data to export.", "error");
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = r[h];
            if (val === null || val === undefined) return "";
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast(`Exported ${rows.length} rows as CSV.`, "success");
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Header title="Reports" />

        <div className="rpt-content">
          {/* TABS */}
          <div className="rpt-tabs">
            {(
              [
                { id: "sales", label: "Sales Overview", Icon: TrendingUp },
                { id: "valuation", label: "Inventory Value", Icon: Package },
                { id: "movers", label: "Top Movers", Icon: Activity },
                {
                  id: "reorder",
                  label: "Reorder Priority",
                  Icon: AlertTriangle,
                },
                { id: "forecast", label: "Stock Forecast", Icon: Clock },
                { id: "cashier", label: "Cashier Stats", Icon: Users },
              ] as { id: Tab; label: string; Icon: any }[]
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`rpt-tab ${
                  activeTab === id ? "is-active" : ""
                }`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* ============================================================
              TAB: SALES OVERVIEW
              ============================================================ */}
          {activeTab === "sales" && (
            <div className="rpt-body">
              {/* Range selector */}
              <div className="rpt-toolbar">
                <div className="rpt-range">
                  {(["today", "week", "month"] as Range[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`rpt-range__btn ${
                        range === r ? "is-active" : ""
                      }`}
                      onClick={() => setRange(r)}
                    >
                      {r === "today"
                        ? "Today"
                        : r === "week"
                        ? "Last 7 Days"
                        : "Last 30 Days"}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="rpt-export"
                  onClick={() =>
                    salesData?.daily &&
                    exportCSV("sales-overview", salesData.daily)
                  }
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : !salesData ? (
                <div className="rpt-empty">No data.</div>
              ) : (
                <>
                  {/* KPI Cards */}
                  <div className="rpt-kpis">
                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--green">
                        <DollarSign size={18} />
                      </div>
                      <div className="rpt-kpi__label">Total Revenue</div>
                      <div className="rpt-kpi__value">
                        {money(salesData.total_revenue)}
                      </div>
                    </div>

                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--blue">
                        <BarChart3 size={18} />
                      </div>
                      <div className="rpt-kpi__label">Transactions</div>
                      <div className="rpt-kpi__value">
                        {salesData.transaction_count}
                      </div>
                    </div>

                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--purple">
                        <Package size={18} />
                      </div>
                      <div className="rpt-kpi__label">Unique Parts Sold</div>
                      <div className="rpt-kpi__value">
                        {salesData.unique_parts_sold}
                      </div>
                    </div>

                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--orange">
                        <Activity size={18} />
                      </div>
                      <div className="rpt-kpi__label">Avg Transaction</div>
                      <div className="rpt-kpi__value">
                        {money(salesData.avg_transaction)}
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="rpt-card">
                    <div className="rpt-card__head">
                      <h3>Revenue Trend</h3>
                      <span className="rpt-card__hint">
                        {range === "today"
                          ? "Today's hourly activity"
                          : range === "week"
                          ? "Last 7 days"
                          : "Last 30 days"}
                      </span>
                    </div>

                    {salesData.daily && salesData.daily.length > 0 ? (
                      <div style={{ width: "100%", height: 260 }}>
                        <ResponsiveContainer>
                          <BarChart
                            data={salesData.daily}
                            margin={{
                              top: 10,
                              right: 20,
                              bottom: 0,
                              left: -10,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#eef0f3"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="day"
                              tickFormatter={shortDate}
                              tick={{ fontSize: 11, fill: "#9ca3af" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tickFormatter={shortMoney}
                              tick={{ fontSize: 11, fill: "#9ca3af" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                fontSize: 12,
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                              }}
                              formatter={(v: any) => money(Number(v))}
                              labelFormatter={(value) => shortDate(String(value))}
                            />
                            <Bar
                              dataKey="revenue"
                              fill="#0f6b5c"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="rpt-empty">
                        No sales in this period.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: INVENTORY VALUATION
              ============================================================ */}
          {activeTab === "valuation" && (
            <div className="rpt-body">
              <div className="rpt-toolbar">
                <div></div>
                <button
                  type="button"
                  className="rpt-export"
                  onClick={() =>
                    valuationData?.by_category &&
                    exportCSV("inventory-valuation", valuationData.by_category)
                  }
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : !valuationData ? (
                <div className="rpt-empty">No data.</div>
              ) : (
                <>
                  <div className="rpt-kpis">
                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--green">
                        <DollarSign size={18} />
                      </div>
                      <div className="rpt-kpi__label">Total Stock Value</div>
                      <div className="rpt-kpi__value">
                        {money(valuationData.total_value)}
                      </div>
                    </div>

                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--blue">
                        <Package size={18} />
                      </div>
                      <div className="rpt-kpi__label">Total Parts</div>
                      <div className="rpt-kpi__value">
                        {valuationData.total_parts}
                      </div>
                    </div>

                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--purple">
                        <BarChart3 size={18} />
                      </div>
                      <div className="rpt-kpi__label">Total Units</div>
                      <div className="rpt-kpi__value">
                        {valuationData.total_units}
                      </div>
                    </div>

                    <div className="rpt-kpi rpt-kpi--warn">
                      <div className="rpt-kpi__icon rpt-kpi__icon--red">
                        <AlertTriangle size={18} />
                      </div>
                      <div className="rpt-kpi__label">At Risk (Low Stock)</div>
                      <div className="rpt-kpi__value">
                        {money(valuationData.at_risk_value)}
                      </div>
                    </div>
                  </div>

                  <div className="rpt-row-2">
                    {/* Category breakdown */}
                    <div className="rpt-card">
                      <div className="rpt-card__head">
                        <h3>Value by Category</h3>
                      </div>
                      <div style={{ width: "100%", height: 280 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={valuationData.by_category}
                              dataKey="value"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={90}
                              paddingAngle={2}
                            >
                              {valuationData.by_category.map(
                                (entry: any, idx: number) => (
                                  <Cell
                                    key={idx}
                                    fill={
                                      CATEGORY_COLORS[
                                        idx % CATEGORY_COLORS.length
                                      ]
                                    }
                                  />
                                )
                              )}
                            </Pie>
                            <Tooltip
                              formatter={(v: any) => money(Number(v))}
                              contentStyle={{
                                fontSize: 12,
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Category table */}
                    <div className="rpt-card">
                      <div className="rpt-card__head">
                        <h3>Breakdown</h3>
                      </div>
                      <table className="rpt-table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th className="rpt-right">Parts</th>
                            <th className="rpt-right">Units</th>
                            <th className="rpt-right">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {valuationData.by_category.map((c: any) => (
                            <tr key={c.category}>
                              <td>{c.category}</td>
                              <td className="rpt-right">{c.part_count}</td>
                              <td className="rpt-right">{c.units}</td>
                              <td className="rpt-right">
                                {money(c.value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: TOP MOVERS
              ============================================================ */}
          {activeTab === "movers" && (
            <div className="rpt-body">
              <div className="rpt-toolbar">
                <div></div>
                <button
                  type="button"
                  className="rpt-export"
                  onClick={() =>
                    moversData?.top &&
                    exportCSV("top-sellers", moversData.top)
                  }
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : !moversData ? (
                <div className="rpt-empty">No data.</div>
              ) : (
                <div className="rpt-row-2">
                  {/* Top sellers */}
                  <div className="rpt-card">
                    <div className="rpt-card__head">
                      <h3>
                        <ArrowUpRight
                          size={16}
                          style={{ color: "#0f6b5c" }}
                        />
                        Best Sellers
                      </h3>
                      <span className="rpt-card__hint">By units sold</span>
                    </div>
                    {moversData.top.length === 0 ? (
                      <div className="rpt-empty">No sales yet.</div>
                    ) : (
                      <table className="rpt-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Part</th>
                            <th className="rpt-right">Sold</th>
                            <th className="rpt-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {moversData.top.map(
                            (p: any, idx: number) => (
                              <tr key={p.part_id}>
                                <td>
                                  <span className="rpt-rank">
                                    {idx + 1}
                                  </span>
                                </td>
                                <td>
                                  <div className="rpt-cell-name">
                                    {p.name}
                                  </div>
                                  <div className="rpt-cell-meta">
                                    {p.part_number} · {p.category}
                                  </div>
                                </td>
                                <td className="rpt-right">
                                  <strong>{p.units_sold}</strong>
                                </td>
                                <td className="rpt-right">
                                  {money(p.revenue)}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Slow movers */}
                  <div className="rpt-card">
                    <div className="rpt-card__head">
                      <h3>
                        <ArrowDownRight
                          size={16}
                          style={{ color: "#b45309" }}
                        />
                        Slow Movers
                      </h3>
                      <span className="rpt-card__hint">
                        Consider promotions
                      </span>
                    </div>
                    {moversData.slow.length === 0 ? (
                      <div className="rpt-empty">No data.</div>
                    ) : (
                      <table className="rpt-table">
                        <thead>
                          <tr>
                            <th>Part</th>
                            <th className="rpt-right">In Stock</th>
                            <th className="rpt-right">Sold</th>
                          </tr>
                        </thead>
                        <tbody>
                          {moversData.slow.map((p: any) => (
                            <tr key={p.part_id}>
                              <td>
                                <div className="rpt-cell-name">
                                  {p.name}
                                </div>
                                <div className="rpt-cell-meta">
                                  {p.part_number} · {p.category}
                                </div>
                              </td>
                              <td className="rpt-right">
                                {p.current_stock}
                              </td>
                              <td className="rpt-right">
                                <span
                                  className={
                                    p.units_sold === 0
                                      ? "rpt-tag rpt-tag--warn"
                                      : ""
                                  }
                                >
                                  {p.units_sold}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: REORDER PRIORITY
              ============================================================ */}
          {activeTab === "reorder" && (
            <div className="rpt-body">
              <div className="rpt-toolbar">
                <div className="rpt-summary-text">
                  <AlertTriangle size={14} />
                  <span>
                    {reorderData.length} part(s) need reordering · Total
                    restock cost:{" "}
                    <strong>
                      {money(
                        reorderData.reduce(
                          (s, r) => s + r.restock_cost,
                          0
                        )
                      )}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="rpt-export"
                  onClick={() => exportCSV("reorder-priority", reorderData)}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : reorderData.length === 0 ? (
                <div className="rpt-empty rpt-empty--good">
                  ✅ All parts are sufficiently stocked.
                </div>
              ) : (
                <div className="rpt-card">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th>Urgency</th>
                        <th>Part</th>
                        <th className="rpt-right">In Stock</th>
                        <th className="rpt-right">Min</th>
                        <th className="rpt-right">Deficit</th>
                        <th className="rpt-right">Restock Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reorderData.map((r: any) => (
                        <tr key={r.part_id}>
                          <td>
                            <span
                              className={`rpt-urgency rpt-urgency--${r.urgency}`}
                            >
                              {r.urgency}
                            </span>
                          </td>
                          <td>
                            <div className="rpt-cell-name">{r.name}</div>
                            <div className="rpt-cell-meta">
                              {r.part_number} · {r.category}
                            </div>
                          </td>
                          <td className="rpt-right">
                            <strong>{r.quantity}</strong>
                          </td>
                          <td className="rpt-right">{r.reorder_level}</td>
                          <td className="rpt-right">
                            <span className="rpt-tag rpt-tag--warn">
                              {r.deficit}
                            </span>
                          </td>
                          <td className="rpt-right">
                            {money(r.restock_cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: STOCK FORECAST
              ============================================================ */}
          {activeTab === "forecast" && (
            <div className="rpt-body">
              <div className="rpt-toolbar">
                <div className="rpt-summary-text">
                  <Clock size={14} />
                  <span>
                    Based on 30-day sales velocity ·{" "}
                    <strong>{forecastData.length}</strong> part(s) may run
                    out soon
                  </span>
                </div>
                <button
                  type="button"
                  className="rpt-export"
                  onClick={() => exportCSV("stock-forecast", forecastData)}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : forecastData.length === 0 ? (
                <div className="rpt-empty rpt-empty--good">
                  ✅ No parts at immediate risk of stockout.
                </div>
              ) : (
                <div className="rpt-card">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Part</th>
                        <th className="rpt-right">In Stock</th>
                        <th className="rpt-right">Daily Sales</th>
                        <th className="rpt-right">Days Until Stockout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData.map((f: any) => (
                        <tr key={f.part_id}>
                          <td>
                            <span
                              className={`rpt-urgency rpt-urgency--${f.stockout_status}`}
                            >
                              {f.stockout_status}
                            </span>
                          </td>
                          <td>
                            <div className="rpt-cell-name">{f.name}</div>
                            <div className="rpt-cell-meta">
                              {f.part_number} · {f.category}
                            </div>
                          </td>
                          <td className="rpt-right">{f.current_stock}</td>
                          <td className="rpt-right">
                            {f.avg_daily_sales}/day
                          </td>
                          <td className="rpt-right">
                            <strong>
                              {f.days_until_stockout !== null
                                ? `${f.days_until_stockout} day(s)`
                                : "—"}
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: CASHIER PERFORMANCE
              ============================================================ */}
          {activeTab === "cashier" && (
            <div className="rpt-body">
              <div className="rpt-toolbar">
                <div></div>
                <button
                  type="button"
                  className="rpt-export"
                  onClick={() => exportCSV("cashier-performance", cashierData)}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : cashierData.length === 0 ? (
                <div className="rpt-empty">No users.</div>
              ) : (
                <div className="rpt-card">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th>Cashier</th>
                        <th>Role</th>
                        <th className="rpt-right">Sales</th>
                        <th className="rpt-right">Total Revenue</th>
                        <th className="rpt-right">Avg Transaction</th>
                        <th className="rpt-right">Last Sale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashierData.map((c: any) => (
                        <tr key={c.user_id}>
                          <td>
                            <div className="rpt-cell-name">{c.name}</div>
                          </td>
                          <td>
                            <span
                              className={`rpt-tag rpt-tag--${
                                c.role === "admin" ? "admin" : "manager"
                              }`}
                            >
                              {c.role}
                            </span>
                          </td>
                          <td className="rpt-right">{c.total_sales}</td>
                          <td className="rpt-right">
                            <strong>{money(c.total_revenue)}</strong>
                          </td>
                          <td className="rpt-right">
                            {money(c.avg_transaction)}
                          </td>
                          <td className="rpt-right">
                            {c.last_sale ? shortDate(c.last_sale) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}