import { useState, useEffect, useMemo, FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast, { ToastType } from "../../components/Toast";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  ShoppingCart,
  CheckCircle2,
  Receipt as ReceiptIcon,
  Banknote,
  AlertTriangle,
} from "lucide-react";
import { getAllParts, checkout } from "../../services/api";
import { Part } from "../../types";
import "./Sales.css";

// ============================================================
// TYPES
// ============================================================

interface CartItem {
  part: Part;
  quantity: number;
}

interface ToastState {
  message: string;
  type: ToastType;
}

interface ReceiptData {
  receipt_no: string;
  items: Array<{
    name: string;
    part_number: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  payment_type: string;
  cash_tendered: number;
  change: number;
  cashier: string;
  date: string;
}

const TAX_RATE = 0.12;

// ============================================================
// COMPONENT
// ============================================================

export default function Sales() {
  const { user } = useAuth();

  // ---- Catalog data ----
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- Search & filters ----
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // ---- Cart ----
  const [cart, setCart] = useState<CartItem[]>([]);

  // ---- Checkout modal ----
  const [showCheckout, setShowCheckout] = useState(false);
  const [cashTendered, setCashTendered] = useState("");
  const [processing, setProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // ---- Receipt modal ----
  const [showReceipt, setShowReceipt] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // ---- Toast ----
  const [toast, setToast] = useState<ToastState | null>(null);

  // ---- Initial fetch ----
  useEffect(() => {
    fetchParts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchParts = async () => {
    setLoading(true);
    try {
      const res = await getAllParts();
      setParts(res.data);
    } catch (err) {
      console.error("Failed to load parts:", err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  // ============================================================
  // CART OPERATIONS
  // ============================================================

  const addToCart = (part: Part) => {
    if (part.quantity <= 0) {
      showToast(`"${part.name}" is out of stock.`, "error");
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.part.part_id === part.part_id
      );

      if (existing) {
        if (existing.quantity >= part.quantity) {
          showToast(
            `Only ${part.quantity} in stock for "${part.name}".`,
            "error"
          );
          return prev;
        }
        return prev.map((item) =>
          item.part.part_id === part.part_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, { part, quantity: 1 }];
    });
  };

  const updateQuantity = (partId: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.part.part_id !== partId) return item;
          const newQty = item.quantity + delta;
          if (newQty > item.part.quantity) {
            showToast(`Only ${item.part.quantity} in stock.`, "error");
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (partId: number) => {
    setCart((prev) =>
      prev.filter((item) => item.part.part_id !== partId)
    );
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (!window.confirm("Clear all items from cart?")) return;
    setCart([]);
  };

  // ============================================================
  // TOTALS
  // ============================================================

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.part.price * item.quantity,
        0
      ),
    [cart]
  );

  const tax = useMemo(() => subtotal * TAX_RATE, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const change = useMemo(() => {
    const tendered = parseFloat(cashTendered) || 0;
    return tendered - total;
  }, [cashTendered, total]);

  // ============================================================
  // FILTERING
  // ============================================================

  const categories = useMemo(() => {
    const set = new Set(parts.map((p) => p.category));
    return ["all", ...Array.from(set)];
  }, [parts]);

  const filteredParts = useMemo(() => {
    let list = [...parts];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.part_number.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== "all") {
      list = list.filter((p) => p.category === categoryFilter);
    }

    return list;
  }, [parts, search, categoryFilter]);

  // ============================================================
  // CHECKOUT
  // ============================================================

  const openCheckout = () => {
    if (cart.length === 0) {
      showToast("Cart is empty. Add items first.", "error");
      return;
    }
    setCashTendered("");
    setCheckoutError("");
    setShowCheckout(true);
  };

  const closeCheckout = () => {
    if (processing) return;
    setShowCheckout(false);
    setCheckoutError("");
  };

  const handleCheckoutSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setCheckoutError("");

    const tendered = parseFloat(cashTendered) || 0;
    if (tendered < total) {
      setCheckoutError(
        `Cash tendered must be at least ₱${total.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
        })}.`
      );
      return;
    }

    setProcessing(true);

    try {
      const items = cart.map((item) => ({
        part_id: item.part.part_id,
        quantity: item.quantity,
      }));

      const res = await checkout({
        items,
        payment_type: "Cash",
      });

      const receiptData: ReceiptData = {
        receipt_no: res.data.receipt_no,
        items: cart.map((item) => ({
          name: item.part.name,
          part_number: item.part.part_number,
          quantity: item.quantity,
          unit_price: item.part.price,
          line_total: item.part.price * item.quantity,
        })),
        subtotal,
        tax,
        total,
        payment_type: "Cash",
        cash_tendered: tendered,
        change: tendered - total,
        cashier: user?.name || "Cashier",
        date: new Date().toISOString(),
      };

      setReceipt(receiptData);
      setCart([]);
      setShowCheckout(false);
      setShowReceipt(true);

      await fetchParts();

      showToast("Sale completed successfully.", "success");
    } catch (err: any) {
      setCheckoutError(
        err.response?.data?.message || "Failed to process sale."
      );
    } finally {
      setProcessing(false);
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================

  const money = (n: number) =>
    "₱" +
    n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const printReceipt = () => {
    window.print();
  };

  // Quick-cash buttons
  const quickCash = [50, 100, 200, 500, 1000];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Header title="Point of Sale" />

        <div className="pos-layout">
          {/* ============================================================
              LEFT: PRODUCT LIST
              ============================================================ */}
          <div className="pos-products">
            <div className="pos-toolbar">
              <div className="pos-search">
                <Search size={15} className="pos-search__icon" />
                <input
                  type="text"
                  placeholder="Search by name or part #..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pos-search__input"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pos-select"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All Categories" : c}
                  </option>
                ))}
              </select>
            </div>

            <div className="pos-list">
              {loading ? (
                <div className="pos-empty">Loading parts...</div>
              ) : filteredParts.length === 0 ? (
                <div className="pos-empty">
                  No parts match your search.
                </div>
              ) : (
                filteredParts.map((part) => {
                  const outOfStock = part.quantity === 0;
                  const low =
                    part.quantity > 0 &&
                    part.quantity <= part.reorder_level;

                  return (
                    <button
                      key={part.part_id}
                      type="button"
                      className={`pos-card ${
                        outOfStock ? "is-disabled" : ""
                      }`}
                      onClick={() => addToCart(part)}
                      disabled={outOfStock}
                    >
                      <div className="pos-card__info">
                        <div className="pos-card__name">{part.name}</div>
                        <div className="pos-card__meta">
                          {part.part_number} · {part.category}
                        </div>
                      </div>
                      <div className="pos-card__right">
                        <div className="pos-card__price">
                          {money(part.price)}
                        </div>
                        <div
                          className={`pos-card__stock ${
                            outOfStock
                              ? "is-out"
                              : low
                              ? "is-low"
                              : "is-in"
                          }`}
                        >
                          {outOfStock
                            ? "Out of stock"
                            : `${part.quantity} in stock`}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ============================================================
              RIGHT: CART
              ============================================================ */}
          <div className="pos-cart">
            <div className="pos-cart__header">
              <div className="pos-cart__title">
                <ShoppingCart size={18} />
                <span>Current Sale</span>
                {itemCount > 0 && (
                  <span className="pos-cart__count">{itemCount}</span>
                )}
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  className="pos-cart__clear"
                  onClick={clearCart}
                  title="Clear cart"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="pos-cart__items">
              {cart.length === 0 ? (
                <div className="pos-cart__empty">
                  <ShoppingCart size={36} strokeWidth={1.2} />
                  <p>Cart is empty</p>
                  <span>Click a product to add it</span>
                </div>
              ) : (
                cart.map((item) => (
                  <div className="cart-item" key={item.part.part_id}>
                    <div className="cart-item__info">
                      <div className="cart-item__name">
                        {item.part.name}
                      </div>
                      <div className="cart-item__meta">
                        {item.part.part_number} · {money(item.part.price)}
                      </div>
                    </div>

                    <div className="cart-item__controls">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() =>
                          updateQuantity(item.part.part_id, -1)
                        }
                      >
                        <Minus size={12} />
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() =>
                          updateQuantity(item.part.part_id, 1)
                        }
                        disabled={item.quantity >= item.part.quantity}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() =>
                          removeFromCart(item.part.part_id)
                        }
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="cart-item__total">
                      {money(item.part.price * item.quantity)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pos-cart__totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="total-row">
                <span>VAT (12%)</span>
                <span>{money(tax)}</span>
              </div>
              <div className="total-row total-row--grand">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>

            <div className="pos-cart__footer">
              <button
                type="button"
                className="checkout-btn"
                onClick={openCheckout}
                disabled={cart.length === 0}
              >
                <CheckCircle2 size={18} />
                Checkout · {money(total)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          CHECKOUT MODAL
          ============================================================ */}
      {showCheckout && (
        <div className="modal-overlay" onClick={closeCheckout}>
          <div
            className="modal modal--small"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Confirm Payment</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeCheckout}
              >
                <X size={18} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleCheckoutSubmit}>
              <div className="checkout-summary">
                <div className="checkout-summary__row">
                  <span>Items</span>
                  <span>{itemCount}</span>
                </div>
                <div className="checkout-summary__row">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className="checkout-summary__row">
                  <span>VAT (12%)</span>
                  <span>{money(tax)}</span>
                </div>
                <div className="checkout-summary__row checkout-summary__row--total">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Payment method</label>
                <div className="payment-single">
                  <Banknote size={16} />
                  <span>Cash</span>
                </div>
              </div>

              <div className="form-group">
                <label>Cash tendered (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder={total.toFixed(2)}
                  autoFocus
                  required
                />
              </div>

              <div className="quick-cash">
                {quickCash.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className="quick-cash__btn"
                    onClick={() => setCashTendered(String(amount))}
                  >
                    ₱{amount}
                  </button>
                ))}
                <button
                  type="button"
                  className="quick-cash__btn quick-cash__btn--exact"
                  onClick={() => setCashTendered(total.toFixed(2))}
                >
                  Exact
                </button>
              </div>

              {parseFloat(cashTendered) >= total && (
                <div className="change-display">
                  <span>Change</span>
                  <strong>{money(change)}</strong>
                </div>
              )}

              {checkoutError && (
                <div className="modal-error">
                  <AlertTriangle size={14} />
                  {checkoutError}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeCheckout}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={processing}
                >
                  {processing
                    ? "Processing..."
                    : `Confirm · ${money(total)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          RECEIPT MODAL
          ============================================================ */}
      {showReceipt && receipt && (
        <div
          className="modal-overlay"
          onClick={() => setShowReceipt(false)}
        >
          <div
            className="modal modal--receipt"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="receipt" id="receipt-print">
              <div className="receipt__header">
                <h2>MANUMATIK</h2>
                <p>Automotive Inventory & POS System</p>
                <p className="receipt__address">
                  Manumatik Auto Parts Center
                </p>
              </div>

              <div className="receipt__divider" />

              <div className="receipt__meta">
                <div>
                  <span>Receipt #</span>
                  <strong>{receipt.receipt_no}</strong>
                </div>
                <div>
                  <span>Date</span>
                  <strong>{formatDateTime(receipt.date)}</strong>
                </div>
                <div>
                  <span>Cashier</span>
                  <strong>{receipt.cashier}</strong>
                </div>
                <div>
                  <span>Payment</span>
                  <strong>{receipt.payment_type}</strong>
                </div>
              </div>

              <div className="receipt__divider" />

              <table className="receipt__items">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th className="receipt__right">Price</th>
                    <th className="receipt__right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="receipt__item-name">
                          {item.name}
                        </div>
                        <div className="receipt__item-meta">
                          {item.part_number}
                        </div>
                      </td>
                      <td>{item.quantity}</td>
                      <td className="receipt__right">
                        {money(item.unit_price)}
                      </td>
                      <td className="receipt__right">
                        {money(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="receipt__divider" />

              <div className="receipt__totals">
                <div className="receipt__row">
                  <span>Subtotal</span>
                  <span>{money(receipt.subtotal)}</span>
                </div>
                <div className="receipt__row">
                  <span>VAT (12%)</span>
                  <span>{money(receipt.tax)}</span>
                </div>
                <div className="receipt__row receipt__row--total">
                  <span>Total</span>
                  <span>{money(receipt.total)}</span>
                </div>
                <div className="receipt__row">
                  <span>Cash</span>
                  <span>{money(receipt.cash_tendered)}</span>
                </div>
                <div className="receipt__row">
                  <span>Change</span>
                  <span>{money(receipt.change)}</span>
                </div>
              </div>

              <div className="receipt__divider" />

              <div className="receipt__footer">
                <p>Thank you for your purchase!</p>
                <p className="receipt__small">
                  This serves as your official receipt.
                </p>
              </div>
            </div>

            <div className="receipt-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowReceipt(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={printReceipt}
              >
                <ReceiptIcon size={14} />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
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