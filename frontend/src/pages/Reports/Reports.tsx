import { useState, useEffect } from "react";
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
  ShoppingCart,
  X,
  Printer,
  FileDown,
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
} from "recharts";
import {
  getSalesOverview,
  getInventoryValuation,
  getTopMovers,
  getReorderPriority,
  getLowStockForecast,
  getCashierPerformance,
} from "../../services/api";
import { onPythonStatus } from "../../pythonStatus";

// Import the logo directly so Vite bundles it
import logoImage from "../../assets/images/Signage.png";
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
  "#0f6b5c", // teal
  "#1d4ed8", // blue
  "#7c3aed", // purple
  "#b45309", // orange
  "#dc2626", // red
  "#0891b2", // cyan
  "#65a30d", // green
  "#db2777", // pink
  "#4f46e5", // indigo
  "#059669", // emerald
];

// ============================================================
// COMPONENT
// ============================================================

export default function Reports() {
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<Range>("today");
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // ---- Data ----
  const [salesData, setSalesData] = useState<any>(null);
  const [valuationData, setValuationData] = useState<any>(null);
  const [moversData, setMoversData] = useState<any>(null);
  const [reorderData, setReorderData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [cashierData, setCashierData] = useState<any[]>([]);

  const [selectedDay, setSelectedDay] = useState<any>(null);

  // ---- Export Modal State ----
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportAction, setExportAction] = useState<"print" | "pdf">("print");
  const [exportRanges, setExportRanges] = useState<string[]>(["today"]);

  // ---- Load data on tab change ----
  useEffect(() => {
    loadTab();
    setSelectedDay(null);
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

  // Refresh the active report when Python restarts after a code edit.
  useEffect(() => {
    const unsubscribe = onPythonStatus((status) => {
      if (status.ok) loadTab();
    });
    const onFocus = () => loadTab();
    window.addEventListener("focus", onFocus);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
    // loadTab reads activeTab/range from component state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, range]);

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
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
    });
  };

  const getRangeLabel = (r: string) => {
    if (r === "today") return "Today";
    if (r === "week") return "Last 7 Days";
    if (r === "month") return "Last 30 Days";
    return "All Time";
  };

  // ---- CSV Export ----
  const exportCSV = (filename: string, rows: any[]) => {
    if (!rows || rows.length === 0) {
      showToast("No data to export.", "error");
      return;
    }

    try {
      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          headers
            .map((h) => {
              const val = r[h];
              if (val === null || val === undefined) return "";
              let str = String(val).replace(/"/g, '""');
              if (
                str.includes(",") ||
                str.includes('"') ||
                str.includes("\n")
              ) {
                return `"${str}"`;
              }
              return str;
            })
            .join(","),
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
    } catch (err) {
      showToast("Failed to generate CSV.", "error");
    }
  };

  // ---- Data Aggregation for specific range ----
  const getExportDataForRange = (targetRange: string, data: any) => {
    if (activeTab === "sales") {
      const displayData =
        data?.daily?.flatMap((d: any) => d.parts_sold || []) || [];
      const aggregatedData = Object.values(
        displayData.reduce((acc: any, item: any) => {
          if (!acc[item.part_id]) {
            acc[item.part_id] = { ...item };
          } else {
            acc[item.part_id].quantity_sold += item.quantity_sold;
            acc[item.part_id].revenue += item.revenue;
          }
          return acc;
        }, {}),
      );

      return {
        head: [["Part", "Part #", "Qty Sold", "Revenue"]],
        body: aggregatedData.map((p: any) => [
          p.name,
          p.part_number,
          p.quantity_sold,
          money(p.revenue),
        ]),
      };
    } else if (activeTab === "valuation") {
      return {
        head: [["Category", "Parts", "Units", "Value"]],
        body:
          data?.by_category?.map((c: any) => [
            c.category,
            c.part_count,
            c.units,
            money(c.value),
          ]) || [],
      };
    } else if (activeTab === "movers") {
      return {
        head: [["Part", "Part #", "Sold", "Revenue"]],
        body:
          data?.top?.map((p: any) => [
            p.name,
            p.part_number,
            p.units_sold,
            money(p.revenue),
          ]) || [],
      };
    } else if (activeTab === "reorder") {
      return {
        head: [["Urgency", "Part", "In Stock", "Deficit", "Restock Cost"]],
        body:
          data?.map((r: any) => [
            r.urgency,
            r.name,
            r.quantity,
            r.deficit,
            money(r.restock_cost),
          ]) || [],
      };
    } else if (activeTab === "forecast") {
      return {
        head: [["Status", "Part", "In Stock", "Daily Sales", "Days"]],
        body:
          data?.map((f: any) => [
            f.stockout_status,
            f.name,
            f.current_stock,
            f.avg_daily_sales,
            f.days_until_stockout,
          ]) || [],
      };
    } else if (activeTab === "cashier") {
      return {
        head: [["Cashier", "Role", "Sales", "Revenue"]],
        body:
          data?.map((c: any) => [
            c.name,
            c.role,
            c.total_sales,
            money(c.total_revenue),
          ]) || [],
      };
    }
    return { head: [], body: [] };
  };

  // Helper to fetch data dynamically for the export
  const fetchDataForRange = async (r: string) => {
    if (activeTab === "sales") {
      const actualRange = r === "all" ? "month" : r;
      const res = await getSalesOverview(actualRange as Range);
      return res.data;
    } else if (activeTab === "valuation") return valuationData;
    else if (activeTab === "movers") return moversData;
    else if (activeTab === "reorder") return reorderData;
    else if (activeTab === "forecast") return forecastData;
    else if (activeTab === "cashier") return cashierData;
    return null;
  };

  // ---- Print Logic ----
  const executePrint = async () => {
    setShowExportModal(false);
    const win = window.open("", "_blank");
    if (!win) {
      showToast("Please allow pop-ups to print.", "error");
      return;
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Report - ${activeTab.toUpperCase()}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #111827; }
          .page-break { page-break-after: always; }
          .header { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #0f6b5c; padding-bottom: 20px; }
          .logo { height: 50px; margin-right: 20px; object-fit: contain; }
          h2 { color: #0f6b5c; margin: 0; }
          .meta { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background-color: #f3f4f6; text-align: left; padding: 10px; border-bottom: 2px solid #e5e7eb; text-transform: uppercase; font-size: 11px; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #9ca3af; }
        </style>
      </head>
      <body>
    `;

    for (const r of exportRanges) {
      const data = await fetchDataForRange(r);
      const { head, body } = getExportDataForRange(r, data);
      const headHTML = head[0].map((h: string) => `<th>${h}</th>`).join("");
      const bodyHTML = body
        .map(
          (row: any) =>
            `<tr>${row.map((cell: any) => `<td>${cell}</td>`).join("")}</tr>`,
        )
        .join("");

      htmlContent += `
        <div class="page-break">
          <div class="header">
            <img src="${logoImage}" class="logo" alt="Logo" />
            <h2>Report: ${activeTab.toUpperCase()} (${getRangeLabel(r)})</h2>
          </div>
          <div class="meta">Generated: ${new Date().toLocaleString()}</div>
          <table>
            <thead><tr>${headHTML}</tr></thead>
            <tbody>${bodyHTML}</tbody>
          </table>
          <div class="footer">Manumatik Auto Parts Center</div>
        </div>
      `;
    }

    htmlContent += `</body></html>`;

    win.document.open();
    win.document.write(htmlContent);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  // ---- PDF Export Logic ----
  const executeExportPDF = async () => {
    setShowExportModal(false);
    setPdfGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      // Load Font for ₱ symbol
      const fontUrl = "/fonts/Roboto.ttf";
      const response = await fetch(fontUrl);
      if (!response.ok) throw new Error("Font file not found in public folder");

      const fontBuffer = await response.arrayBuffer();
      let fontBinary = "";
      const fontBytes = new Uint8Array(fontBuffer);
      for (let i = 0; i < fontBytes.byteLength; i++) {
        fontBinary += String.fromCharCode(fontBytes[i]);
      }

      doc.addFileToVFS("Roboto.ttf", fontBinary);
      doc.addFont("Roboto.ttf", "Roboto", "normal");
      doc.setFont("Roboto");

      let isFirstPage = true;

      for (const r of exportRanges) {
        const data = await fetchDataForRange(r);
        const { head, body } = getExportDataForRange(r, data);

        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

        // Load Logo dynamically
        try {
          const img = new Image();
          img.src = logoImage;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          // Since jsPDF expects an HTMLImageElement or base64, we pass the imported URL
          doc.addImage(img, "PNG", 40, 30, 80, 30);
        } catch (err) {
          console.warn("Logo not found, skipping.");
        }

        doc.setFontSize(16);
        doc.setTextColor(15, 107, 92);
        doc.text(
          `Report: ${activeTab.toUpperCase()} (${getRangeLabel(r)})`,
          130,
          45,
        );

        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 60);

        autoTable(doc, {
          head,
          body,
          startY: 90,
          styles: { font: "Roboto", fontSize: 9, cellPadding: 5 },
          headStyles: { fillColor: [15, 107, 92], textColor: 255 },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          margin: { left: 40, right: 40 },
          didDrawPage: () => {
            doc.setFont("Roboto");
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text(
              "Manumatik Auto Parts Center",
              40,
              doc.internal.pageSize.getHeight() - 20,
            );
            doc.text(
              `Page ${doc.internal.pages.length - 1}`,
              doc.internal.pageSize.getWidth() - 60,
              doc.internal.pageSize.getHeight() - 20,
            );
          },
        });
      }

      doc.save(
        `report-${activeTab}-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      showToast("PDF exported successfully.", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to export PDF.", "error");
    } finally {
      setPdfGenerating(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <Header title="Reports" />
        <div className="rpt-content fade-in">
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
                className={`rpt-tab ${activeTab === id ? "is-active" : ""}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* GLOBAL TOOLBAR */}
          <div className="rpt-toolbar" style={{ padding: "24px 24px 0 24px" }}>
            <div className="rpt-range">
              {(["today", "week", "month"] as Range[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`rpt-range__btn ${range === r ? "is-active" : ""}`}
                  onClick={() => setRange(r)}
                  disabled={activeTab !== "sales"} // Only applicable to sales
                  style={{ opacity: activeTab !== "sales" ? 0.5 : 1 }}
                >
                  {r === "today"
                    ? "Today"
                    : r === "week"
                      ? "Last 7 Days"
                      : "Last 30 Days"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="rpt-export"
                onClick={() => {
                  const { body } = getExportDataForRange(
                    range,
                    activeTab === "sales" ? salesData : {},
                  );
                  exportCSV(
                    `report-${activeTab}-${range}`,
                    body.map((row: any[]) =>
                      Object.fromEntries(
                        row.map((val: any, i: number) => [
                          getExportDataForRange(
                            range,
                            activeTab === "sales" ? salesData : {},
                          ).head[0][i],
                          val,
                        ]),
                      ),
                    ),
                  );
                }}
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                type="button"
                className="rpt-export"
                onClick={() => {
                  setExportAction("print");
                  setShowExportModal(true);
                }}
              >
                <Printer size={14} /> Print
              </button>
              <button
                type="button"
                className="rpt-export"
                onClick={() => {
                  setExportAction("pdf");
                  setShowExportModal(true);
                }}
                disabled={pdfGenerating}
              >
                <FileDown size={14} />{" "}
                {pdfGenerating ? "Exporting..." : "Export PDF"}
              </button>
            </div>
          </div>

          {/* ============================================================
              TAB: SALES OVERVIEW
              ============================================================ */}
          {activeTab === "sales" && (
            <div className="rpt-body slide-up">
              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : !salesData ? (
                <div className="rpt-empty">No data.</div>
              ) : (
                <>
                  <div className="rpt-kpis stagger-fade">
                    <div className="rpt-kpi hover-lift">
                      <div className="rpt-kpi__icon rpt-kpi__icon--green">
                        <DollarSign size={18} />
                      </div>
                      <div className="rpt-kpi__label">Total Revenue</div>
                      <div className="rpt-kpi__value">
                        {money(salesData.total_revenue)}
                      </div>
                    </div>
                    <div className="rpt-kpi hover-lift">
                      <div className="rpt-kpi__icon rpt-kpi__icon--blue">
                        <BarChart3 size={18} />
                      </div>
                      <div className="rpt-kpi__label">Transactions</div>
                      <div className="rpt-kpi__value">
                        {salesData.transaction_count}
                      </div>
                    </div>
                    <div className="rpt-kpi hover-lift">
                      <div className="rpt-kpi__icon rpt-kpi__icon--purple">
                        <Package size={18} />
                      </div>
                      <div className="rpt-kpi__label">Unique Parts Sold</div>
                      <div className="rpt-kpi__value">
                        {salesData.unique_parts_sold}
                      </div>
                    </div>
                    <div className="rpt-kpi hover-lift">
                      <div className="rpt-kpi__icon rpt-kpi__icon--orange">
                        <Activity size={18} />
                      </div>
                      <div className="rpt-kpi__label">Avg Transaction</div>
                      <div className="rpt-kpi__value">
                        {money(salesData.avg_transaction)}
                      </div>
                    </div>
                  </div>

                  <div className="rpt-card hover-lift">
                    <div className="rpt-card__head">
                      <h3>Revenue Trend</h3>
                      <span className="rpt-card__hint">
                        {range === "today"
                          ? "Today"
                          : range === "week"
                            ? "Last 7 days"
                            : "Last 30 days"}
                      </span>
                    </div>
                    {salesData.daily && salesData.daily.length > 0 ? (
                      <div style={{ width: "100%", height: 320 }}>
                        <ResponsiveContainer>
                          <BarChart
                            data={salesData.daily}
                            margin={{
                              top: 10,
                              right: 10,
                              bottom: 0,
                              left: -10,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f3f4f6"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="day"
                              tickFormatter={shortDate}
                              tick={{ fontSize: 11, fill: "#6b7280" }}
                              axisLine={{ stroke: "#e5e7eb" }}
                              tickLine={false}
                              dy={10}
                            />
                            <YAxis
                              tickFormatter={shortMoney}
                              tick={{ fontSize: 11, fill: "#6b7280" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                fontSize: 13,
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                                padding: "10px 14px",
                              }}
                              formatter={(value) => [
                                money(Number(value)),
                                "Revenue",
                              ]}
                              labelFormatter={(value) =>
                                shortDate(String(value))
                              }
                              cursor={{ fill: "rgba(15, 107, 92, 0.08)" }}
                            />
                            <Bar
                              dataKey="revenue"
                              fill="#0f6b5c"
                              radius={[6, 6, 0, 0]}
                              barSize={40}
                              focusable={false}
                              minPointSize={4}
                              onClick={(data) => setSelectedDay(data)}
                              style={{ cursor: "pointer", outline: "none" }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="rpt-empty">No sales in this period.</div>
                    )}
                  </div>

                  <div className="rpt-card hover-lift">
                    <div className="rpt-card__head">
                      <h3>
                        <ShoppingCart size={16} style={{ color: "#0f6b5c" }} />
                        {selectedDay
                          ? `Parts Sold on ${shortDate(selectedDay.day)}`
                          : "All Parts Sold"}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span className="rpt-card__hint">
                          {selectedDay
                            ? `Revenue: ${money(selectedDay.revenue)}`
                            : range === "today"
                              ? "Sold today"
                              : range === "week"
                                ? "Sold in last 7 days"
                                : "Sold in last 30 days"}
                        </span>
                        {selectedDay && (
                          <button
                            className="rpt-export"
                            style={{
                              padding: "4px 8px",
                              fontSize: "10px",
                              height: "auto",
                            }}
                            onClick={() => setSelectedDay(null)}
                          >
                            <X size={12} /> Clear filter
                          </button>
                        )}
                      </div>
                    </div>
                    {(() => {
                      const displayData = selectedDay
                        ? selectedDay.parts_sold
                        : salesData.daily?.flatMap(
                            (d: any) => d.parts_sold || [],
                          ) || [];
                      const aggregatedData = selectedDay
                        ? displayData
                        : Object.values(
                            displayData.reduce((acc: any, item: any) => {
                              if (!acc[item.part_id]) {
                                acc[item.part_id] = { ...item };
                              } else {
                                acc[item.part_id].quantity_sold +=
                                  item.quantity_sold;
                                acc[item.part_id].revenue += item.revenue;
                              }
                              return acc;
                            }, {}),
                          );

                      if (!aggregatedData || aggregatedData.length === 0) {
                        return (
                          <div className="rpt-empty">
                            No parts sold in this period.
                          </div>
                        );
                      }

                      return (
                        <table className="rpt-table">
                          <thead>
                            <tr>
                              <th>Part</th>
                              <th className="rpt-right rpt-col-num">
                                Qty Sold
                              </th>
                              <th className="rpt-right rpt-col-money">
                                Revenue
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {aggregatedData.map((p: any) => (
                              <tr key={p.part_id}>
                                <td>
                                  <div className="rpt-cell-name">{p.name}</div>
                                  <div className="rpt-cell-meta">
                                    {p.part_number}
                                  </div>
                                </td>
                                <td className="rpt-right rpt-col-num">
                                  <strong>{p.quantity_sold}</strong>
                                </td>
                                <td className="rpt-right rpt-col-money">
                                  {money(p.revenue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: INVENTORY VALUATION
              ============================================================ */}
          {activeTab === "valuation" && (
            <div className="rpt-body slide-up">
              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : !valuationData ? (
                <div className="rpt-empty">No data.</div>
              ) : (
                <>
                  <div className="rpt-kpis stagger-fade">
                    <div className="rpt-kpi hover-lift">
                      <div className="rpt-kpi__icon rpt-kpi__icon--green">
                        <DollarSign size={18} />
                      </div>
                      <div className="rpt-kpi__label">Total Stock Value</div>
                      <div className="rpt-kpi__value">
                        {money(valuationData.total_value)}
                      </div>
                    </div>

                    <div className="rpt-kpi hover-lift">
                      <div className="rpt-kpi__icon rpt-kpi__icon--blue">
                        <Package size={18} />
                      </div>
                      <div className="rpt-kpi__label">Total Parts</div>
                      <div className="rpt-kpi__value">
                        {valuationData.total_parts}
                      </div>
                    </div>

                    <div className="rpt-kpi hover-lift">
                      <div className="rpt-kpi__icon rpt-kpi__icon--purple">
                        <BarChart3 size={18} />
                      </div>
                      <div className="rpt-kpi__label">Total Units</div>
                      <div className="rpt-kpi__value">
                        {valuationData.total_units}
                      </div>
                    </div>

                    <div className="rpt-kpi rpt-kpi--warn hover-lift">
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
                    <div className="rpt-card hover-lift">
                      <div className="rpt-card__head">
                        <h3>Value by Category</h3>
                        <span className="rpt-card__hint">
                          {valuationData.by_category.length} categories
                        </span>
                      </div>

                      <div className="rpt-pie-legend">
                        {valuationData.by_category.map(
                          (c: any, idx: number) => {
                            const pct =
                              valuationData.total_value > 0
                                ? (c.value / valuationData.total_value) * 100
                                : 0;
                            return (
                              <div
                                className="rpt-pie-legend__item"
                                key={c.category}
                              >
                                <span
                                  className="rpt-pie-legend__dot"
                                  style={{
                                    background:
                                      CATEGORY_COLORS[
                                        idx % CATEGORY_COLORS.length
                                      ],
                                  }}
                                />
                                <span className="rpt-pie-legend__label">
                                  {c.category}
                                </span>
                                <span className="rpt-pie-legend__value">
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            );
                          },
                        )}
                      </div>

                      <div className="rpt-pie-wrap">
                        <div style={{ width: "100%", height: 260 }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie
                                data={valuationData.by_category}
                                dataKey="value"
                                nameKey="category"
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={105}
                                paddingAngle={3}
                                stroke="#ffffff"
                                strokeWidth={2}
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
                                  ),
                                )}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  fontSize: 12,
                                  borderRadius: 8,
                                  border: "1px solid #e5e7eb",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                }}
                                formatter={(value: any) => money(Number(value))}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="rpt-pie-center">
                          <span className="rpt-pie-center__label">
                            Total Value
                          </span>
                          <span className="rpt-pie-center__value">
                            {shortMoney(valuationData.total_value)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rpt-card hover-lift">
                      <div className="rpt-card__head">
                        <h3>Breakdown</h3>
                        <span className="rpt-card__hint">By category</span>
                      </div>
                      <table className="rpt-table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th className="rpt-right rpt-col-num">Parts</th>
                            <th className="rpt-right rpt-col-num">Units</th>
                            <th className="rpt-right rpt-col-money">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {valuationData.by_category.map(
                            (c: any, idx: number) => (
                              <tr key={c.category}>
                                <td>
                                  <span
                                    className="rpt-cat-dot"
                                    style={{
                                      background:
                                        CATEGORY_COLORS[
                                          idx % CATEGORY_COLORS.length
                                        ],
                                    }}
                                  />
                                  {c.category}
                                </td>
                                <td className="rpt-right rpt-col-num">
                                  {c.part_count}
                                </td>
                                <td className="rpt-right rpt-col-num">
                                  {c.units}
                                </td>
                                <td className="rpt-right rpt-col-money">
                                  {money(c.value)}
                                </td>
                              </tr>
                            ),
                          )}
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
            <div className="rpt-body slide-up">
              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : !moversData ? (
                <div className="rpt-empty">No data.</div>
              ) : (
                <div className="rpt-row-2">
                  <div className="rpt-card hover-lift">
                    <div className="rpt-card__head">
                      <h3>
                        <ArrowUpRight size={16} style={{ color: "#0f6b5c" }} />
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
                            <th className="rpt-col-rank">#</th>
                            <th>Part</th>
                            <th className="rpt-right rpt-col-num">Sold</th>
                            <th className="rpt-right rpt-col-money">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {moversData.top.map((p: any, idx: number) => (
                            <tr key={p.part_id}>
                              <td className="rpt-col-rank">
                                <span className="rpt-rank">{idx + 1}</span>
                              </td>
                              <td>
                                <div className="rpt-cell-name">{p.name}</div>
                                <div className="rpt-cell-meta">
                                  {p.part_number} · {p.category}
                                </div>
                              </td>
                              <td className="rpt-right rpt-col-num">
                                <strong>{p.units_sold}</strong>
                              </td>
                              <td className="rpt-right rpt-col-money">
                                {money(p.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="rpt-card hover-lift">
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
                            <th className="rpt-right rpt-col-num">In Stock</th>
                            <th className="rpt-right rpt-col-num">Sold</th>
                          </tr>
                        </thead>
                        <tbody>
                          {moversData.slow.map((p: any) => (
                            <tr key={p.part_id}>
                              <td>
                                <div className="rpt-cell-name">{p.name}</div>
                                <div className="rpt-cell-meta">
                                  {p.part_number} · {p.category}
                                </div>
                              </td>
                              <td className="rpt-right rpt-col-num">
                                {p.current_stock}
                              </td>
                              <td className="rpt-right rpt-col-num">
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
            <div className="rpt-body slide-up">
              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : reorderData.length === 0 ? (
                <div className="rpt-empty rpt-empty--good">
                  ✅ All parts are sufficiently stocked.
                </div>
              ) : (
                <div className="rpt-card hover-lift">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th className="rpt-col-urgency">Urgency</th>
                        <th>Part</th>
                        <th className="rpt-right rpt-col-num">In Stock</th>
                        <th className="rpt-right rpt-col-num">Min</th>
                        <th className="rpt-right rpt-col-num">Deficit</th>
                        <th className="rpt-right rpt-col-money">
                          Restock Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reorderData.map((r: any) => (
                        <tr key={r.part_id}>
                          <td className="rpt-col-urgency">
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
                          <td className="rpt-right rpt-col-num">
                            <strong>{r.quantity}</strong>
                          </td>
                          <td className="rpt-right rpt-col-num">
                            {r.reorder_level}
                          </td>
                          <td className="rpt-right rpt-col-num">
                            <span className="rpt-tag rpt-tag--warn">
                              {r.deficit}
                            </span>
                          </td>
                          <td className="rpt-right rpt-col-money">
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
            <div className="rpt-body slide-up">
              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : forecastData.length === 0 ? (
                <div className="rpt-empty rpt-empty--good">
                  ✅ No parts at immediate risk of stockout.
                </div>
              ) : (
                <div className="rpt-card hover-lift">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th className="rpt-col-urgency">Status</th>
                        <th>Part</th>
                        <th className="rpt-right rpt-col-num">In Stock</th>
                        <th className="rpt-right rpt-col-num">Daily Sales</th>
                        <th className="rpt-right rpt-col-days">
                          Days Until Stockout
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData.map((f: any) => (
                        <tr key={f.part_id}>
                          <td className="rpt-col-urgency">
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
                          <td className="rpt-right rpt-col-num">
                            {f.current_stock}
                          </td>
                          <td className="rpt-right rpt-col-num">
                            {f.avg_daily_sales}/day
                          </td>
                          <td className="rpt-right rpt-col-days">
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
            <div className="rpt-body slide-up">
              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : cashierData.length === 0 ? (
                <div className="rpt-empty">No users.</div>
              ) : (
                <div className="rpt-card hover-lift">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th>Cashier</th>
                        <th className="rpt-col-role">Role</th>
                        <th className="rpt-right rpt-col-num">Sales</th>
                        <th className="rpt-right rpt-col-money">
                          Total Revenue
                        </th>
                        <th className="rpt-right rpt-col-money">
                          Avg Transaction
                        </th>
                        <th className="rpt-right rpt-col-date">Last Sale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashierData.map((c: any) => (
                        <tr key={c.user_id}>
                          <td>
                            <div className="rpt-cell-name">{c.name}</div>
                          </td>
                          <td className="rpt-col-role">
                            <span
                              className={`rpt-tag rpt-tag--${c.role === "admin" ? "admin" : "manager"}`}
                            >
                              {c.role}
                            </span>
                          </td>
                          <td className="rpt-right rpt-col-num">
                            {c.total_sales}
                          </td>
                          <td className="rpt-right rpt-col-money">
                            <strong>{money(c.total_revenue)}</strong>
                          </td>
                          <td className="rpt-right rpt-col-money">
                            {money(c.avg_transaction)}
                          </td>
                          <td className="rpt-right rpt-col-date">
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

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="modal modal--small"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Export Options - {activeTab.toUpperCase()}</h2>
              <button
                className="modal-close"
                onClick={() => setShowExportModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-form">
              <div className="reset-context">
                Select the date range(s) you want to include in the{" "}
                {exportAction === "pdf" ? "PDF" : "Print"} document.
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  margin: "15px 0",
                }}
              >
                {activeTab === "sales" ? (
                  <>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={exportRanges.includes("today")}
                        onChange={(e) => {
                          if (e.target.checked)
                            setExportRanges([...exportRanges, "today"]);
                          else
                            setExportRanges(
                              exportRanges.filter((r) => r !== "today"),
                            );
                        }}
                      />
                      Today
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={exportRanges.includes("week")}
                        onChange={(e) => {
                          if (e.target.checked)
                            setExportRanges([...exportRanges, "week"]);
                          else
                            setExportRanges(
                              exportRanges.filter((r) => r !== "week"),
                            );
                        }}
                      />
                      Last 7 Days
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={exportRanges.includes("month")}
                        onChange={(e) => {
                          if (e.target.checked)
                            setExportRanges([...exportRanges, "month"]);
                          else
                            setExportRanges(
                              exportRanges.filter((r) => r !== "month"),
                            );
                        }}
                      />
                      Last 30 Days
                    </label>
                  </>
                ) : (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={exportRanges.includes("all")}
                      onChange={(e) => {
                        if (e.target.checked) setExportRanges(["all"]);
                        else setExportRanges([]);
                      }}
                    />
                    All Time (Full Data)
                  </label>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowExportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={exportRanges.length === 0 || pdfGenerating}
                  onClick={() => {
                    if (exportAction === "print") executePrint();
                    else executeExportPDF();
                  }}
                >
                  {pdfGenerating
                    ? "Generating..."
                    : exportAction === "pdf"
                      ? "Generate PDF"
                      : "Print Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
