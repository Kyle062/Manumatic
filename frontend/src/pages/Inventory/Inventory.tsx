import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast, { ToastType } from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  PackagePlus,
  PackageMinus,
  Sliders,
} from "lucide-react";
import {
  getAllParts,
  createPart,
  updatePart,
  deletePart,
  adjustStock,
} from "../../services/api";
import { Part } from "../../types";
import "./Inventory.css";

// ============================================================
// TYPES
// ============================================================

type Tab = "catalog" | "adjustments" | "availability" | "settings";

interface ToastState {
  message: string;
  type: ToastType;
}

const REASONS_IN = [
  "Restock from supplier",
  "Customer return",
  "Found in storage",
  "Correction",
];

const REASONS_OUT = [
  "Damaged",
  "Lost",
  "Internal use",
  "Correction",
  "Returned to supplier",
];

// ============================================================
// COMPONENT
// ============================================================

export default function Inventory() {
  const { user } = useAuth();

  // ---- Tabs ----
  const [activeTab, setActiveTab] = useState<Tab>("catalog");

  // ---- Catalog ----
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // ---- Modal (Add / Edit) ----
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // ---- Delete ----
  const [confirmTarget, setConfirmTarget] = useState<Part | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---- Toast ----
  const [toast, setToast] = useState<ToastState | null>(null);

  // ---- Form ----
  const [form, setForm] = useState({
    part_number: "",
    name: "",
    category: "",
    description: "",
    price: "",
    reorder_level: "10",
    quantity: "0",
    location: "",
  });

  // ---- Stock Adjustment ----
  const [adjPart, setAdjPart] = useState<number | "">("");
  const [adjType, setAdjType] = useState<"in" | "out">("in");
  const [adjQty, setAdjQty] = useState("1");
  const [adjReason, setAdjReason] = useState(REASONS_IN[0]);
  const [adjNotes, setAdjNotes] = useState("");
  const [adjSaving, setAdjSaving] = useState(false);
  const [adjError, setAdjError] = useState("");

  // ---- Fetch parts on mount ----
  useEffect(() => {
    fetchParts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchParts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllParts();
      setParts(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load parts.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  // ---- Reset reason when type changes ----
  useEffect(() => {
    setAdjReason(adjType === "in" ? REASONS_IN[0] : REASONS_OUT[0]);
  }, [adjType]);

  // ---- Add / Edit Modal ----
  const openAddModal = () => {
    setEditingPart(null);
    setForm({
      part_number: "",
      name: "",
      category: "",
      description: "",
      price: "",
      reorder_level: "10",
      quantity: "0",
      location: "",
    });
    setModalError("");
    setShowModal(true);
  };

  const openEditModal = (part: Part) => {
    setEditingPart(part);
    setForm({
      part_number: part.part_number,
      name: part.name,
      category: part.category,
      description: part.description || "",
      price: String(part.price),
      reorder_level: String(part.reorder_level),
      quantity: String(part.quantity),
      location: part.location || "",
    });
    setModalError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPart(null);
    setModalError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError("");
    setSaving(true);

    try {
      if (editingPart) {
        await updatePart(editingPart.part_id, form);
        showToast(`"${form.name}" was updated.`, "success");
      } else {
        await createPart(form);
        showToast(`"${form.name}" was added to the catalog.`, "success");
      }
      await fetchParts();
      closeModal();
    } catch (err: any) {
      setModalError(err.response?.data?.message || "Failed to save part.");
    } finally {
      setSaving(false);
    }
  };

  // ---- Delete ----
  const requestDelete = (part: Part) => setConfirmTarget(part);
  const cancelDelete = () => !deleting && setConfirmTarget(null);

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await deletePart(confirmTarget.part_id);
      showToast(`"${confirmTarget.name}" was deleted.`, "success");
      setConfirmTarget(null);
      await fetchParts();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete.", "error");
      setConfirmTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ---- Stock Adjustment ----
  const selectedPart = parts.find((p) => p.part_id === adjPart);
  const adjQtyNum = parseInt(adjQty) || 0;

  const projectedQty = selectedPart
    ? adjType === "in"
      ? selectedPart.quantity + adjQtyNum
      : Math.max(0, selectedPart.quantity - adjQtyNum)
    : 0;

  const handleAdjustSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdjError("");

    if (!selectedPart) {
      setAdjError("Please select a part.");
      return;
    }

    if (adjQtyNum <= 0) {
      setAdjError("Quantity must be greater than zero.");
      return;
    }

    if (adjType === "out" && adjQtyNum > selectedPart.quantity) {
      setAdjError(
        `Cannot remove ${adjQtyNum} units. Only ${selectedPart.quantity} in stock.`,
      );
      return;
    }

    setAdjSaving(true);
    try {
      await adjustStock({
        part_id: selectedPart.part_id,
        type: adjType,
        quantity: adjQtyNum,
        reason: adjReason,
        notes: adjNotes || undefined,
      });

      showToast(
        `${adjType === "in" ? "Added" : "Removed"} ${adjQtyNum} unit(s) ${
          adjType === "in" ? "to" : "from"
        } "${selectedPart.name}".`,
        "success",
      );

      setAdjQty("1");
      setAdjNotes("");
      await fetchParts();
    } catch (err: any) {
      setAdjError(err.response?.data?.message || "Failed to adjust stock.");
    } finally {
      setAdjSaving(false);
    }
  };

  // ---- Filtering ----
  const filtered = parts.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.part_number.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  // ---- Helpers ----
  const money = (n: number) =>
    "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2 });

  const getCategoryClass = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes("brake")) return "cat-brakes";
    if (c.includes("engine")) return "cat-engine";
    if (c.includes("electrical")) return "cat-electrical";
    if (c.includes("suspension")) return "cat-suspension";
    if (c.includes("consumable")) return "cat-consumables";
    return "cat-default";
  };

  const isAdmin = user?.role === "admin";
  const reasons = adjType === "in" ? REASONS_IN : REASONS_OUT;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Header title="Inventory" />

        <div className="inv-content">
          {/* TABS */}
          <div className="inv-tabs">
            {(
              [
                { id: "catalog", label: "Parts Catalog" },
                { id: "adjustments", label: "Stock Adjustments" },
                { id: "availability", label: "Check Availability" },
                { id: "settings", label: "Settings" },
              ] as { id: Tab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`inv-tab ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ================= PARTS CATALOG ================= */}
          {activeTab === "catalog" && (
            <>
              <div className="inv-toolbar">
                <div className="inv-search">
                  <Search size={15} className="inv-search__icon" />
                  <input
                    type="text"
                    placeholder="Search by part #, name, or category"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="inv-search__input"
                  />
                </div>

                <button
                  type="button"
                  className="inv-add-btn"
                  onClick={openAddModal}
                >
                  <Plus size={15} />
                  Add part
                </button>
              </div>

              {error && <div className="inv-error">{error}</div>}

              <div className="inv-table-wrap">
                {loading ? (
                  <div className="inv-loading">Loading parts...</div>
                ) : filtered.length === 0 ? (
                  <div className="inv-empty">
                    {search
                      ? "No parts match your search."
                      : "No parts yet. Click '+ Add part' to begin."}
                  </div>
                ) : (
                  <table className="inv-table">
                    <thead>
                      <tr>
                        <th>PART #</th>
                        <th>NAME</th>
                        <th>CATEGORY</th>
                        <th className="inv-right">PRICE</th>
                        <th className="inv-right">STOCK</th>
                        <th className="inv-right">REORDER AT</th>
                        <th className="inv-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((part) => {
                        const low = part.quantity <= part.reorder_level;
                        return (
                          <tr key={part.part_id}>
                            <td className="inv-mono">{part.part_number}</td>
                            <td>{part.name}</td>
                            <td>
                              <span
                                className={`inv-cat ${getCategoryClass(
                                  part.category,
                                )}`}
                              >
                                {part.category}
                              </span>
                            </td>
                            <td className="inv-right">{money(part.price)}</td>
                            <td className={`inv-right ${low ? "inv-low" : ""}`}>
                              {part.quantity}
                            </td>
                            <td className="inv-right">{part.reorder_level}</td>
                            <td className="inv-right">
                              <div className="inv-actions">
                                {/* ADJUST STOCK */}
                                <button
                                  type="button"
                                  className="inv-icon-btn"
                                  onClick={() => {
                                    setAdjPart(part.part_id);
                                    setActiveTab("adjustments");
                                  }}
                                  title="Adjust stock"
                                >
                                  <Sliders size={14} />
                                </button>

                                {/* EDIT PART */}
                                <button
                                  type="button"
                                  className="inv-icon-btn"
                                  onClick={() => openEditModal(part)}
                                  title="Edit part details"
                                >
                                  <Pencil size={14} />
                                </button>

                                {/* DELETE (Admin only) */}
                                {isAdmin && (
                                  <button
                                    type="button"
                                    className="inv-icon-btn inv-icon-btn--danger"
                                    onClick={() => requestDelete(part)}
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ================= STOCK ADJUSTMENTS ================= */}
          {activeTab === "adjustments" && (
            <div className="adj-layout adj-layout--centered">
              <div className="adj-form-card">
                <h2 className="adj-title">Adjust stock quantity</h2>

                <form onSubmit={handleAdjustSubmit} className="adj-form">
                  <div className="adj-group">
                    <label>Part</label>
                    <select
                      value={adjPart}
                      onChange={(e) =>
                        setAdjPart(e.target.value ? Number(e.target.value) : "")
                      }
                      className="adj-select"
                      required
                    >
                      <option value="">— Select a part —</option>
                      {parts.map((p) => (
                        <option key={p.part_id} value={p.part_id}>
                          {p.name} ({p.part_number}) — {p.quantity} in stock
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="adj-toggle">
                    <button
                      type="button"
                      className={`adj-toggle__btn ${
                        adjType === "in" ? "is-active-in" : ""
                      }`}
                      onClick={() => setAdjType("in")}
                    >
                      <PackagePlus size={14} />
                      Stock in
                    </button>
                    <button
                      type="button"
                      className={`adj-toggle__btn ${
                        adjType === "out" ? "is-active-out" : ""
                      }`}
                      onClick={() => setAdjType("out")}
                    >
                      <PackageMinus size={14} />
                      Stock out
                    </button>
                  </div>

                  <div className="adj-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={adjQty}
                      onChange={(e) => setAdjQty(e.target.value)}
                      className="adj-input"
                      required
                    />
                  </div>

                  <div className="adj-group">
                    <label>Reason</label>
                    <select
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                      className="adj-select"
                    >
                      {reasons.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="adj-group">
                    <label>Notes (optional)</label>
                    <textarea
                      rows={2}
                      value={adjNotes}
                      onChange={(e) => setAdjNotes(e.target.value)}
                      className="adj-input"
                      placeholder="Add any additional notes..."
                    />
                  </div>

                  {selectedPart && adjQtyNum > 0 && (
                    <div className="adj-preview">
                      <span className="adj-preview__label">New stock</span>
                      <span className="adj-preview__value">
                        {selectedPart.quantity} →{" "}
                        <strong
                          className={
                            projectedQty === 0
                              ? "adj-preview__zero"
                              : projectedQty <= selectedPart.reorder_level
                                ? "adj-preview__low"
                                : "adj-preview__ok"
                          }
                        >
                          {projectedQty}
                        </strong>{" "}
                        units
                      </span>
                    </div>
                  )}

                  {adjError && (
                    <div className="modal-error">
                      <AlertTriangle size={14} />
                      {adjError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="adj-submit"
                    disabled={adjSaving || !selectedPart}
                  >
                    {adjSaving ? "Applying..." : "Apply adjustment"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Other tabs */}
          {activeTab === "availability" && (
            <div className="inv-placeholder">
              Check Availability — coming soon.
            </div>
          )}
          {activeTab === "settings" && (
            <div className="inv-placeholder">
              Inventory Settings — coming soon.
            </div>
          )}
        </div>
      </div>

      {/* ================= ADD / EDIT MODAL ================= */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPart ? "Edit Part" : "Add New Part"}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
              >
                <X size={18} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              {modalError && (
                <div className="modal-error">
                  <AlertTriangle size={14} />
                  {modalError}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Part Number *</label>
                  <input
                    type="text"
                    value={form.part_number}
                    onChange={(e) =>
                      setForm({ ...form, part_number: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    disabled={!!editingPart}
                    title={
                      editingPart
                        ? "Use Stock Adjustments tab to change stock"
                        : ""
                    }
                  />
                  {editingPart && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                        fontStyle: "italic",
                      }}
                    >
                      Use Stock Adjustments to change quantity.
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label>Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={form.reorder_level}
                    onChange={(e) =>
                      setForm({ ...form, reorder_level: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingPart
                      ? "Update Part"
                      : "Add Part"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {confirmTarget && (
        <ConfirmDialog
          title="Delete this part?"
          message={`"${confirmTarget.name}" (${confirmTarget.part_number}) will be permanently removed from the catalog. This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Keep"
          variant="danger"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

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
