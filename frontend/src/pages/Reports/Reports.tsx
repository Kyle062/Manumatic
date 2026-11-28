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

type Range = "today" | "week" | "month" | "year" | "all";

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 Days" },
  { value: "month", label: "Last 30 Days" },
  { value: "year", label: "1 Year" },
  { value: "all", label: "All Time" },
];

interface ExportColumn {
  key: string;
  label: string;
  get: (row: any) => any;
}

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
  const [exportAction, setExportAction] = useState<"print" | "pdf" | "csv">(
    "print",
  );
  const [exportRanges, setExportRanges] = useState<Range[]>(["today"]);
  const [selectedColumns, setSelectedColumns] = useState<Record<Tab, string[]>>({
    sales: ["name", "part_number", "quantity_sold", "revenue"],
    valuation: [
      "category",
      "part_count",
      "units",
      "value",
      "units_sold",
      "sold_revenue",
    ],
    movers: [
      "group",
      "name",
      "part_number",
      "category",
      "units_sold",
      "revenue",
      "current_stock",
    ],
    reorder: [
      "urgency",
      "name",
      "part_number",
      "category",
      "quantity",
      "reorder_level",
      "deficit",
      "recent_sales",
      "restock_cost",
    ],
    forecast: [
      "stockout_status",
      "name",
      "part_number",
      "category",
      "current_stock",
      "units_last_30d",
      "avg_daily_sales",
      "days_until_stockout",
    ],
    cashier: [
      "name",
      "role",
      "total_sales",
      "total_revenue",
      "avg_transaction",
      "last_sale",
    ],
  });

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
          const r2 = await getInventoryValuation(range);
          setValuationData(r2.data);
          break;
        case "movers":
          const r3 = await getTopMovers(5, range);
          setMoversData(r3.data);
          break;
        case "reorder":
          const r4 = await getReorderPriority(5, range);
          setReorderData(r4.data);
          break;
        case "forecast":
          const r5 = await getLowStockForecast(range);
          setForecastData(r5.data);
          break;
        case "cashier":
          const r6 = await getCashierPerformance(range);
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

  const getRangeLabel = (r: Range) => {
    return RANGE_OPTIONS.find((option) => option.value === r)?.label ?? r;
  };

  // ---- Export column definitions ----
  const getExportColumns = (tab: Tab): ExportColumn[] => {
    switch (tab) {
      case "sales":
        return [
          { key: "name", label: "Part", get: (r) => r.name },
          { key: "part_number", label: "Part #", get: (r) => r.part_number },
          { key: "quantity_sold", label: "Qty Sold", get: (r) => r.quantity_sold },
          { key: "revenue", label: "Revenue", get: (r) => money(r.revenue) },
        ];
      case "valuation":
        return [
          { key: "category", label: "Category", get: (r) => r.category },
          { key: "part_count", label: "Parts", get: (r) => r.part_count },
          { key: "units", label: "Units", get: (r) => r.units },
          { key: "value", label: "Value", get: (r) => money(r.value) },
          { key: "units_sold", label: "Units Sold", get: (r) => r.units_sold },
          {
            key: "sold_revenue",
            label: "Sold Revenue",
            get: (r) => money(r.sold_revenue),
          },
        ];
      case "movers":
        return [
          { key: "group", label: "Group", get: (r) => r.group },
          { key: "name", label: "Part", get: (r) => r.name },
          { key: "part_number", label: "Part #", get: (r) => r.part_number },
          { key: "category", label: "Category", get: (r) => r.category },
          { key: "units_sold", label: "Sold", get: (r) => r.units_sold },
          {
            key: "revenue",
            label: "Revenue",
            get: (r) => (r.revenue === undefined ? "—" : money(r.revenue)),
          },
          {
            key: "current_stock",
            label: "In Stock",
            get: (r) => r.current_stock,
          },
        ];
      case "reorder":
        return [
          { key: "urgency", label: "Urgency", get: (r) => r.urgency },
          { key: "name", label: "Part", get: (r) => r.name },
          { key: "part_number", label: "Part #", get: (r) => r.part_number },
          { key: "category", label: "Category", get: (r) => r.category },
          { key: "quantity", label: "In Stock", get: (r) => r.quantity },
          {
            key: "reorder_level",
            label: "Min",
            get: (r) => r.reorder_level,
          },
          { key: "deficit", label: "Deficit", get: (r) => r.deficit },
          {
            key: "recent_sales",
            label: "Range Sales",
            get: (r) => r.recent_sales,
          },
          {
            key: "restock_cost",
            label: "Restock Cost",
            get: (r) => money(r.restock_cost),
          },
        ];
      case "forecast":
        return [
          {
            key: "stockout_status",
            label: "Status",
            get: (r) => r.stockout_status,
          },
          { key: "name", label: "Part", get: (r) => r.name },
          { key: "part_number", label: "Part #", get: (r) => r.part_number },
          { key: "category", label: "Category", get: (r) => r.category },
          { key: "current_stock", label: "In Stock", get: (r) => r.current_stock },
          {
            key: "units_last_30d",
            label: "Range Units",
            get: (r) => r.units_last_30d,
          },
          {
            key: "avg_daily_sales",
            label: "Daily Sales",
            get: (r) => r.avg_daily_sales,
          },
          {
            key: "days_until_stockout",
            label: "Days",
            get: (r) => r.days_until_stockout,
          },
        ];
      case "cashier":
        return [
          { key: "name", label: "Cashier", get: (r) => r.name },
          { key: "role", label: "Role", get: (r) => r.role },
          { key: "total_sales", label: "Sales", get: (r) => r.total_sales },
          {
            key: "total_revenue",
            label: "Revenue",
            get: (r) => money(r.total_revenue),
          },
          {
            key: "avg_transaction",
            label: "Avg Transaction",
            get: (r) => money(r.avg_transaction),
          },
          {
            key: "last_sale",
            label: "Last Sale",
            get: (r) => (r.last_sale ? shortDate(r.last_sale) : "—"),
          },
        ];
    }
  };

  const getRawRowsForRange = (data: any): any[] => {
    switch (activeTab) {
      case "sales": {
        const displayData =
          data?.daily?.flatMap((d: any) => d.parts_sold || []) || [];
        return Object.values(
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
      }
      case "valuation":
        return data?.by_category || [];
      case "movers":
        return [
          ...(data?.top || []).map((p: any) => ({
            ...p,
            group: "Best Seller",
          })),
          ...(data?.slow || []).map((p: any) => ({
            ...p,
            group: "Slow Mover",
            revenue: undefined,
          })),
        ];
      case "reorder":
      case "forecast":
      case "cashier":
        return Array.isArray(data) ? data : [];
    }
  };

  const buildExportTable = (targetRange: Range, data: any) => {
    const columns = getExportColumns(activeTab).filter((column) =>
      selectedColumns[activeTab].includes(column.key),
    );
    const rawRows = getRawRowsForRange(data);

    return {
      head: [["Range", ...columns.map((column) => column.label)]],
      body: rawRows.map((row: any) => [
        getRangeLabel(targetRange),
        ...columns.map((column) => {
          const value = column.get(row);
          return value === null || value === undefined || value === ""
            ? "—"
            : String(value);
        }),
      ]),
      rowCount: rawRows.length,
    };
  };

  const fetchDataForRange = async (r: Range) => {
    switch (activeTab) {
      case "sales":
        return (await getSalesOverview(r)).data;
      case "valuation":
        return (await getInventoryValuation(r)).data;
      case "movers":
        return (await getTopMovers(5, r)).data;
      case "reorder":
        return (await getReorderPriority(5, r)).data;
      case "forecast":
        return (await getLowStockForecast(r)).data;
      case "cashier":
        return (await getCashierPerformance(r)).data;
    }
  };

  // ---- CSV Export ----
  const executeCSV = async () => {
    if (selectedColumns[activeTab].length === 0) {
      showToast("Select at least one column to export.", "error");
      return;
    }
    if (exportRanges.length === 0) {
      showToast("Select at least one date range.", "error");
      return;
    }

    setShowExportModal(false);
    try {
      const tables = [];
      for (const r of exportRanges) {
        tables.push(buildExportTable(r, await fetchDataForRange(r)));
      }

      const headers = tables[0].head[0];
      const rows = tables.flatMap((table) => table.body);
      if (rows.length === 0) {
        showToast("No data to export.", "error");
        return;
      }

      const csv = [
        headers.join(","),
        ...rows.map((row: string[]) =>
          row
            .map((cell) => {
              const str = String(cell).replace(/"/g, '""');
              return str.includes(",") || str.includes('"') || str.includes("\n")
                ? `"${str}"`
                : str;
            })
            .join(","),
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report-${activeTab}-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      showToast(`Exported ${rows.length} rows as CSV.`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to generate CSV.", "error");
    }
  };

  const escapeHTML = (value: any) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // ---- Print Logic ----
  const executePrint = async () => {
    if (selectedColumns[activeTab].length === 0) {
      showToast("Select at least one column to print.", "error");
      return;
    }
    if (exportRanges.length === 0) {
      showToast("Select at least one date range.", "error");
      return;
    }

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
        <title>Report - ${escapeHTML(activeTab.toUpperCase())}</title>
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
      const { head, body } = buildExportTable(r, await fetchDataForRange(r));
      const headHTML = head[0]
        .map((h: string) => `<th>${escapeHTML(h)}</th>`)
        .join("");
      const bodyHTML = body
        .map(
          (row: any) =>
            `<tr>${row
              .map((cell: any) => `<td>${escapeHTML(cell)}</td>`)
              .join("")}</tr>`,
        )
        .join("");

      htmlContent += `
        <div class="page-break">
          <div class="header">
            <img src="${logoImage}" class="logo" alt="Logo" />
            <h2>Report: ${escapeHTML(activeTab.toUpperCase())} (${escapeHTML(getRangeLabel(r))})</h2>
          </div>
          <div class="meta">Generated: ${escapeHTML(new Date().toLocaleString())}</div>
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
    if (selectedColumns[activeTab].length === 0) {
      showToast("Select at least one column to export.", "error");
      return;
    }
    if (exportRanges.length === 0) {
      showToast("Select at least one date range.", "error");
      return;
    }

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
        const { head, body } = buildExportTable(r, await fetchDataForRange(r));

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

  const openExport = (action: "print" | "pdf" | "csv") => {
    setExportAction(action);
    setExportRanges([range]);
    setShowExportModal(true);
  };

  const toggleExportRange = (r: Range) => {
    setExportRanges((current) =>
      current.includes(r)
        ? current.filter((item) => item !== r)
        : [...current, r],
    );
  };

  const toggleExportColumn = (key: string) => {
    setSelectedColumns((current) => {
      const active = current[activeTab];
      return {
        ...current,
        [activeTab]: active.includes(key)
          ? active.filter((item) => item !== key)
          : [...active, key],
      };
    });
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
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rpt-range__btn ${range === option.value ? "is-active" : ""}`}
                  onClick={() => setRange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="rpt-export"
                onClick={() => openExport("csv")}
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                type="button"
                className="rpt-export"
                onClick={() => openExport("print")}
              >
                <Printer size={14} /> Print
              </button>
              <button
                type="button"
                className="rpt-export"
                onClick={() => openExport("pdf")}
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
                        {getRangeLabel(range)}
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
                            : `Sold · ${getRangeLabel(range)}`}
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

                    <div className="rpt-kpi hover-lift">
                      <div className="rpt-kpi__icon rpt-kpi__icon--orange">
                        <ShoppingCart size={18} />
                      </div>
                      <div className="rpt-kpi__label">
                        Units Sold · {getRangeLabel(range)}
                      </div>
                      <div className="rpt-kpi__value">
                        {valuationData.range_units_sold ?? 0}
                      </div>
                    </div>

                    <div className="rpt-kpi hover-lift">
                      <div className="rpt-kpi__icon rpt-kpi__icon--green">
                        <DollarSign size={18} />
                      </div>
                      <div className="rpt-kpi__label">
                        Revenue · {getRangeLabel(range)}
                      </div>
                      <div className="rpt-kpi__value">
                        {money(valuationData.range_revenue ?? 0)}
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
                            <th className="rpt-right rpt-col-num">
                              Sold · {getRangeLabel(range)}
                            </th>
                            <th className="rpt-right rpt-col-money">
                              Sales · {getRangeLabel(range)}
                            </th>
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
                                <td className="rpt-right rpt-col-num">
                                  {c.units_sold ?? 0}
                                </td>
                                <td className="rpt-right rpt-col-money">
                                  {money(c.sold_revenue ?? 0)}
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
                      <span className="rpt-card__hint">
                        By units sold · {getRangeLabel(range)}
                      </span>
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
                        <th className="rpt-right rpt-col-num">
                          Sales · {getRangeLabel(range)}
                        </th>
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
                          <td className="rpt-right rpt-col-num">
                            {r.recent_sales ?? 0}
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
                        <th className="rpt-right rpt-col-num">
                          Units · {getRangeLabel(range)}
                        </th>
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
                            {f.units_last_30d ?? 0}
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
                        <th className="rpt-right rpt-col-num">
                          Sales · {getRangeLabel(range)}
                        </th>
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
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
                Select the date range(s) and data columns to include in the{" "}
                {exportAction === "pdf"
                  ? "PDF"
                  : exportAction === "csv"
                    ? "CSV"
                    : "Print"}{" "}
                output.
              </div>

              <div className="rpt-export-section">
                <div className="rpt-export-section__title">Date ranges</div>
                <div className="rpt-export-grid">
                  {RANGE_OPTIONS.map((option) => (
                    <label key={option.value} className="rpt-export-check">
                      <input
                        type="checkbox"
                        checked={exportRanges.includes(option.value)}
                        onChange={() => toggleExportRange(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rpt-export-section">
                <div className="rpt-export-section__title">
                  Columns to include
                </div>
                <div className="rpt-export-grid">
                  {getExportColumns(activeTab).map((column) => (
                    <label key={column.key} className="rpt-export-check">
                      <input
                        type="checkbox"
                        checked={selectedColumns[activeTab].includes(column.key)}
                        onChange={() => toggleExportColumn(column.key)}
                      />
                      {column.label}
                    </label>
                  ))}
                </div>
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
                  disabled={
                    exportRanges.length === 0 ||
                    selectedColumns[activeTab].length === 0 ||
                    pdfGenerating
                  }
                  onClick={() => {
                    if (exportAction === "csv") executeCSV();
                    else if (exportAction === "print") executePrint();
                    else executeExportPDF();
                  }}
                >
                  {pdfGenerating
                    ? "Generating..."
                    : exportAction === "pdf"
                      ? "Generate PDF"
                      : exportAction === "csv"
                        ? "Export CSV"
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
