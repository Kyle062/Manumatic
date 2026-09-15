import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  getAllParts,
  createPart,
  updatePart,
  deletePart,
} from "../../services/api";
import { Part } from "../../types";
import "./Inventory.css";

// ============================================================
// COMPONENT
// ============================================================

type Tab = "catalog" | "adjustments" | "availability" | "settings";

export default function Inventory() {
  const { user } = useAuth();

  // ---- State ----
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("catalog");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Form state
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
      console.error("Fetch parts error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load parts. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---- Form handlers ----
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
      } else {
        await createPart(form);
      }
      await fetchParts();
      closeModal();
    } catch (err: any) {
      setModalError(
        err.response?.data?.message || "Failed to save part. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (part: Part) => {
    const confirmed = window.confirm(
      `Delete "${part.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deletePart(part.part_id);
      await fetchParts();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete part.");
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
                className={`inv-tab ${
                  activeTab === tab.id ? "is-active" : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* PARTS CATALOG TAB */}
          {activeTab === "catalog" && (
            <>
              {/* TOOLBAR */}
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

              {/* ERROR */}
              {error && <div className="inv-error">{error}</div>}

              {/* TABLE */}
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
                            <td className="inv-mono">
                              {part.part_number}
                            </td>
                            <td>{part.name}</td>
                            <td>
                              <span
                                className={`inv-cat ${getCategoryClass(
                                  part.category
                                )}`}
                              >
                                {part.category}
                              </span>
                            </td>
                            <td className="inv-right">
                              {money(part.price)}
                            </td>
                            <td
                              className={`inv-right ${
                                low ? "inv-low" : ""
                              }`}
                            >
                              {part.quantity}
                            </td>
                            <td className="inv-right">
                              {part.reorder_level}
                            </td>
                            <td className="inv-right">
                              <div className="inv-actions">
                                <button
                                  type="button"
                                  className="inv-icon-btn"
                                  onClick={() => openEditModal(part)}
                                  title="Edit"
                                >
                                  <Pencil size={14} />
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    className="inv-icon-btn inv-icon-btn--danger"
                                    onClick={() => handleDelete(part)}
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

          {/* OTHER TABS — placeholders */}
          {activeTab !== "catalog" && (
            <div className="inv-placeholder">
              {activeTab === "adjustments" && "Stock Adjustments — coming soon."}
              {activeTab === "availability" && "Check Availability — coming soon."}
              {activeTab === "settings" && "Inventory Settings — coming soon."}
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
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
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
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
                    placeholder="Brakes, Engine, Electrical..."
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
                  />
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
                  placeholder="Shelf A1, Bin 3..."
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
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
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
    </div>
  );
}