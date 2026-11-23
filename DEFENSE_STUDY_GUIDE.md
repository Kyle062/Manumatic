# Defense Study Guide: MANUMATIK Automotive Inventory & POS Intelligence System

## Table of Contents
- [1. PROJECT DESCRIPTION](#1-project-description)
  - [What Is This Project?](#what-is-this-project)
  - [What Is It For?](#what-is-it-for)
  - [Why It Stands Out](#why-it-stands-out)
- [2. LANGUAGES AND LIBRARIES USED](#2-languages-and-libraries-used)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Python Microservices](#python-microservices)
  - [Database & Tools](#database--tools)
- [3. PROJECT FILES — DESCRIPTIONS](#3-project-files--descriptions)
  - [3.1 Frontend Files (`frontend/src/`)](#31-frontend-files-frontendsrc)
  - [3.2 Backend Files (`backend/src/`)](#32-backend-files-backendsrc)
  - [3.3 Python Files (`manumatik-python-backend/`)](#33-python-files-manumatik-python-backend)
- [4. NOTABLE CODES](#4-notable-codes)
  - [4.1 Digital Signature (RSA) — Requested Topic](#41-digital-signature-rsa--requested-topic)
  - [4.2 Signing on Checkout — Actual `checkout()` Flow](#42-signing-on-checkout--actual-checkout-flow)
  - [4.3 Verifying on Scan — Actual `BarcodeScannerModal.tsx` Flow](#43-verifying-on-scan--actual-barcodescannermodaltsx-flow)
  - [4.4 Hybrid Barcode Scanner — `scanner.py` and `scan_loop`](#44-hybrid-barcode-scanner--scannerpy-and-scan_loop)
- [5. PRACTICE QUESTIONS](#5-practice-questions)
  - [Basic Understanding](#basic-understanding)
  - [Cryptography / Security](#cryptography--security)
  - [Order / Sales Flow](#order--sales-flow)
  - [Code Logic](#code-logic)
  - [Security](#security)
  - [Scenario-Based](#scenario-based)
  - [Database](#database)
- [6. QUICK DEMO CHECKLIST](#6-quick-demo-checklist)

---

# 1. PROJECT DESCRIPTION

> **Important note before defending:** This study guide is based on the actual codebase in this repository. The project is **MANUMATIK — Automotive Inventory & Point-of-Sale Intelligence System**, not an LCC Merchandise Order Management System. The actual roles are **Admin** and **Manager** (no Student/Tailor roles), and there is **no RSA digital signature** or tailoring order lifecycle in the current code. Where the requested topic does not exist, this guide explains the real implementation clearly so you can answer honestly during defense.

## What Is This Project?

**MANUMATIK** is a web-based system for an automotive parts store. It helps the store keep track of parts, sell parts at the counter, monitor low stock, and generate reports.

Think of it like a **cash register + stockroom notebook + manager dashboard** all in one app. In real life, a small auto parts shop might write sales in a notebook, count parts on shelves by hand, and guess when to reorder. MANUMATIK puts those jobs into one system so the information is faster, more organized, and less prone to mistakes.

## What Is It For?

| User / Role | What They Do in the System | Real-Life Analogy |
|---|---|---|
| **Admin** | Can log in, view dashboard, manage inventory, process POS sales, view reports, manage users, reset passwords, enable/disable accounts, and perform restricted actions like deleting parts. | Like the **store owner/head supervisor** who has the master keys to the shop, can check records, approve changes, and manage staff accounts. |
| **Manager** | Can log in, view dashboard, manage inventory, process sales, receive/adjust stock, and view reports. Some admin-only actions (like deleting parts or user management endpoints) are restricted by role checks. | Like a **shift manager** who runs daily operations at the counter and stockroom, but does not have every master-level permission. |

**What the system does for the store:**

- **Inventory management:** Add, edit, search, and track auto parts, quantities, reorder levels, cost, markup, and selling price.
- **Point of Sale (POS):** Add parts to a cart, compute subtotal + 12% VAT, accept cash, calculate change, complete checkout, and print a receipt.
- **Barcode scanning:** Use a camera to scan a part barcode and quickly find the matching part in inventory or add it to a sale.
- **Reporting:** View sales overview, inventory valuation, top/slow movers, reorder priority, stockout forecast, and cashier performance.
- **Security/control:** Users must log in with a valid account and JWT token; passwords are hashed; routes are protected by role checks.

## Why It Stands Out

The requested prompt asked to highlight **RSA Digital Signature cryptography integration**. **This project does not currently implement RSA digital signatures.** That is important to say honestly in defense.

What actually makes MANUMATIK stand out in its current form is:

- **Hybrid architecture:** It uses a **React frontend**, a **Node.js/Express + MySQL backend**, and a **Python FastAPI microservice**. It’s like having a store front desk (React), an office records room (Node/MySQL), and a specialized scanner/analytics assistant (Python).
- **Real POS transaction safety:** Checkout uses a **database transaction** with row locking (`FOR UPDATE`) so stock is checked and deducted safely. Think of it like locking the cash drawer and stock ledger while a sale is being recorded so two cashiers don’t sell the same last item at once.
- **Barcode-assisted workflow:** The Python scanner reads barcodes from a camera feed and the frontend matches them to actual parts before taking action. It’s like a barcode gun at a grocery counter that beeps only when it finds a real product.
- **Operational intelligence:** The reports module turns raw sales/inventory data into useful decisions—what sells, what’s stuck, what to reorder, and when stock may run out.

---

# 2. LANGUAGES AND LIBRARIES USED

## Frontend

| Language/Library | Purpose | Real-Life Analogy |
|---|---|---|
| **TypeScript** | Adds types to JavaScript so data shapes (like `Part`, `User`, `Sale`) are clearer and safer. | Like labeling boxes in a stockroom so you know what should be inside each box. |
| **React** | Builds the user interface as reusable components/pages. | Like building a store counter from modular parts—shelves, buttons, screens—that can be reused. |
| **Vite** | Development/build tool for fast frontend startup and bundling. | Like a workshop setup that helps you assemble and test the storefront quickly. |
| **React Router DOM** | Handles page navigation (`/login`, `/dashboard`, `/inventory`, `/sales`, `/reports`). | Like hallway signs directing staff to the right room. |
| **Axios** | Sends HTTP requests from frontend to Node/Python APIs and attaches JWT tokens. | Like a delivery messenger carrying requests and bringing back responses. |
| **Recharts** | Draws charts for dashboard/report visuals. | Like turning numbers into a graph on a whiteboard so trends are easier to see. |
| **Lucide React** | Provides icons for buttons and UI elements. | Like small symbols on store signs that make actions easier to recognize. |
| **jsPDF + jspdf-autotable** | Exports reports/tables to PDF. | Like printing a clean official report from your records. |
| **CSS** | Styles the pages and components. | Like paint, layout, and signage that make the store usable and readable. |

## Backend

| Language/Library | Purpose | Real-Life Analogy |
|---|---|---|
| **Node.js** | Runs JavaScript/TypeScript on the server. | Like the engine room that powers the back office. |
| **TypeScript** | Adds type safety to backend models, request bodies, and services. | Like standardized forms so staff fill records consistently. |
| **Express** | Creates REST API routes and handles HTTP requests/responses. | Like a receptionist who receives requests and routes them to the right department. |
| **mysql2/promise** | Connects Node backend to MySQL using async/await queries. | Like a clerk who can quickly fetch or update records in filing cabinets. |
| **jsonwebtoken (JWT)** | Creates and verifies login tokens for authentication. | Like a temporary ID badge that proves you’re allowed inside. |
| **bcrypt** | Hashes and compares passwords securely. | Like storing a lock pattern instead of the actual key in plain sight. |
| **cors** | Allows frontend origins to call the backend API safely. | Like a security guard checking which visitors are allowed to enter. |
| **dotenv** | Loads environment variables from `.env`. | Like a settings sheet that tells the system where the database and secrets are. |
| **nodemon / ts-node** | Development tools for running TypeScript server with auto-reload. | Like a mechanic’s test bench that restarts quickly after each adjustment. |

## Python Microservices

| Language/Library | Purpose | Real-Life Analogy |
|---|---|---|
| **Python** | Language used for scanner and analytics microservice. | Like a specialist technician called in for a specific job. |
| **FastAPI** | Creates Python API endpoints for scanner and reports/barcode. | Like a small service counter dedicated to scanning and analytics tasks. |
| **Uvicorn** | ASGI server that runs FastAPI. | Like the power switch and motor that keeps that service counter running. |
| **OpenCV (`cv2`)** | Reads camera frames and draws rectangles/text on detected barcodes. | Like the eyes of the scanner looking at the barcode. |
| **pyzbar** | Decodes barcode data from image frames. | Like the brain that reads the black-and-white lines and understands the code. |
| **python-barcode + Pillow** | Generates barcode images and adds labels/price text. | Like a label printer that creates product stickers. |
| **Pandas** | Processes sales data for analytics in Python reports. | Like a spreadsheet analyst summarizing rows into insights. |
| **SQLAlchemy / PyMySQL** | Python-side database connectivity for analytics services. | Like another record clerk who can read the same filing cabinet. |

## Database & Tools

| Technology | Purpose | Real-Life Analogy |
|---|---|---|
| **MySQL** | Stores users, parts, sales, receipts, and stock receipt records. | Like the store’s official ledger/bookkeeping cabinet. |
| **Git/GitHub repo** | Version control and collaboration history. | Like a timeline of edits to the shop’s rulebook and records. |
| **npm** | Installs and manages Node/frontend dependencies. | Like a tool supplier for JavaScript projects. |
| **pip / requirements.txt** | Installs Python dependencies. | Like a parts list for the Python technician’s toolkit. |
| **VS Code / terminal** | Development environment and command execution. | Like the workbench where the system is built and tested. |

---

# 3. PROJECT FILES — DESCRIPTIONS

## 3.1 Frontend Files (`frontend/src/`)

| File | What It Does | Real-Life Analogy | Key Functions to Note |
|---|---|---|---|
| `frontend/src/App.tsx` | Sets up routes and protects pages behind login. | The building map with locked doors. | `App`, `RequireAuth` usage, route definitions |
| `frontend/src/main.tsx` | React entry point; mounts app to DOM. | Turning on the main power switch. | `ReactDOM.createRoot(...).render(...)` |
| `frontend/src/context/AuthContext.tsx` | Stores current user/token and auth actions globally. | The front desk badge system. | `AuthProvider`, `login`, `logout`, `useAuth` |
| `frontend/src/pages/Login/Login.tsx` | Login form; submits credentials and handles errors. | The employee sign-in sheet at the entrance. | form submit handler, `loginUser`, `useAuth` |
| `frontend/src/pages/Dashboard/Dashboard.tsx` | Displays KPIs, charts, recent transactions, logs, low stock. | Manager’s daily summary board. | `fetchDashboardData`, `fetchTopSellingData`, chart rendering |
| `frontend/src/pages/Inventory/Inventory.tsx` | Manages parts catalog, stock receive/adjust, availability, user settings, barcode scan, print/export. | The stockroom control room. | `fetchParts`, `handleSubmit`, `handleReceiveSubmit`, `handleBarcodeConfirmed`, `handleExportPDF` |
| `frontend/src/pages/Sales/Sales.tsx` | POS screen: cart, VAT, cash checkout, receipt, barcode add-to-cart. | The cashier counter. | `addToCart`, `openCheckout`, `handleCheckoutSubmit`, `printReceipt` |
| `frontend/src/pages/Reports/Reports.tsx` | Analytics/report tabs with CSV/PDF/print export. | The accounting/report office. | `fetchDataForRange`, `executePrint`, `executeExportPDF`, tab render logic |
| `frontend/src/components/BarcodeScannerModal.tsx` | Camera scanner modal; polls Python scanner and confirms matched part. | A barcode scanner gun with a confirmation screen. | `handleCode`, polling `useEffect`, `handleManualSubmit`, `handleConfirm` |
| `frontend/src/components/RequireAuth.tsx` | Blocks unauthenticated users from protected routes. | Security guard checking ID before entry. | auth check + redirect |
| `frontend/src/components/Toast.tsx` | Shows temporary success/error/info messages. | A small sticky note popping up on the counter. | toast render/timeout |
| `frontend/src/components/ConfirmDialog.tsx` | Asks user to confirm dangerous actions (delete, disable). | “Are you sure?” before shredding a record. | confirm/cancel callbacks |
| `frontend/src/components/Sidebar.tsx` / `Header.tsx` | App navigation and page header/layout. | Store signage and room labels. | nav links, logout/display |
| `frontend/src/services/api.ts` | Central API client for Node and Python endpoints; JWT interceptor. | The store’s phone operator connecting departments. | `api.interceptors.request.use`, `checkout`, `getSalesOverview`, `PYTHON_API_URL` |
| `frontend/src/types/index.ts` | Shared frontend TypeScript interfaces. | Standard form templates. | `User`, `Part`, `Sale`, `AuthContextType` |

## 3.2 Backend Files (`backend/src/`)

| File | What It Does | Real-Life Analogy | Key Functions to Note |
|---|---|---|---|
| `backend/src/server.ts` | Express app bootstrap, middleware, routes, error handlers, startup. | The main office opening checklist. | `app.use(...)`, `startServer`, route mounts |
| `backend/src/config/database.ts` | Creates MySQL connection pool. | The key to the records cabinet. | `pool`, DB connection/export |
| `backend/src/config/env.ts` | Reads/validates environment variables. | The shop’s configuration sheet. | `env` object |
| `backend/src/controllers/authController.ts` | Handles login and current-user endpoints. | Front desk clerk checking credentials. | `login`, `getMe` |
| `backend/src/services/authService.ts` | Auth business logic: validate user, compare password, sign JWT. | The rulebook for signing in. | `login`, `getCurrentUser` |
| `backend/src/controllers/inventoryController.ts` | HTTP handlers for parts, search, low stock, adjust, receive, checkout. | Counter staff receiving requests. | `createPart`, `adjustStock`, `receiveStock`, `checkout` |
| `backend/src/services/inventoryService.ts` | Inventory/POS business rules; validates input; checkout transaction logic. | The operations manager enforcing rules. | `createPart`, `updatePart`, `adjustStock`, `receiveStock`, `checkout` |
| `backend/src/controllers/reportsController.ts` | SQL report endpoints for sales, valuation, movers, reorder, forecast, cashier stats. | The analyst preparing reports. | `getSalesOverview`, `getInventoryValuation`, `getLowStockForecast` |
| `backend/src/controllers/dashboardController.ts` | Dashboard stats/logs/transactions endpoints. | The daily briefing assistant. | `getStats`, `getTransactions`, `getTopSelling` |
| `backend/src/controllers/userController.ts` | Admin user management endpoints. | HR/admin account manager. | create/list/reset/toggle handlers |
| `backend/src/models/partModel.ts` | SQL queries for parts table. | Stock ledger clerk. | `findAll`, `create`, `update`, `search`, `findLowStock` |
| `backend/src/models/saleModel.ts` | SQL queries for sales; transaction checkout with stock deduction. | Cashier ledger + stock deduction log. | `createSaleWithItems`, `generateReceiptNo`, `getSalesTrend` |
| `backend/src/models/userModel.ts` | SQL queries for users table. | Employee records clerk. | `findByUsername`, `createUser`, `updatePassword`, `setActive` |
| `backend/src/routes/*.ts` | Maps URLs to controllers and middleware. | Directory board listing which office handles what. | `authRoutes`, `inventoryRoutes`, `reportRoutes`, `dashboardRoutes` |
| `backend/src/middleware/authMiddleware.ts` | Verifies JWT and checks allowed roles. | Badge scanner and door access rules. | `authenticateToken`, `authorizeRole` |
| `backend/src/middleware/errorMiddleware.ts` | Handles 404 and errors consistently. | Complaint/incident desk. | `notFoundHandler`, `errorHandler` |
| `backend/src/utils/jwt.ts` / `password.ts` | Token signing/verification and password hashing/comparison. | Badge printer and lock maker. | `signToken`, `verifyToken`, `hashPassword`, `comparePassword` |
| `backend/src/types/index.ts` | Shared backend interfaces and request types. | Official data form definitions. | `AuthRequest`, `Part`, `CreatePartBody`, `JwtPayload` |

## 3.3 Python Files (`manumatik-python-backend/`)

| File | What It Does | Real-Life Analogy | Key Functions to Note |
|---|---|---|---|
| `manumatik-python-backend/main.py` | FastAPI app entry; mounts scanner and reports routers; sets CORS. | The Python service front desk. | `app.include_router(...)`, `read_root` |
| `manumatik-python-backend/app/routers/scanner.py` | Scanner endpoints: cameras, start, stop, video feed, poll. | Camera control panel. | `get_cameras`, `start_scanner`, `video_feed`, `barcodes` |
| `manumatik-python-backend/app/services/scanner.py` | OpenCV camera loop, pyzbar decode, frame streaming, barcode dedupe. | The actual barcode scanner device logic. | `BarcodeScanner.start`, `_scan_loop`, `get_new_barcodes` |
| `manumatik-python-backend/app/routers/reports.py` | Python report/barcode endpoints. | Analytics/barcode counter. | `get_sales_overview`, `get_top_movers`, `get_barcode` |
| `manumatik-python-backend/app/services/analytics.py` | Pandas-based sales/movers analytics. | Spreadsheet analyst. | `get_sales_overview_analytics`, `get_top_movers_analytics` |
| `manumatik-python-backend/app/services/barcode.py` | Generates Code128 barcode image with label/price. | Sticker printer. | `generate_barcode_image` |
| `manumatik-python-backend/app/database.py` | SQLAlchemy engine/session for Python DB access. | Python-side file cabinet key. | `engine`, `SessionLocal`, `get_db` |
| `manumatik-python-backend/requirements.txt` | Python dependency list. | Technician’s tool checklist. | FastAPI, uvicorn, pandas, pyzbar, opencv/pillow deps as installed |

---

# 4. NOTABLE CODES

## 4.1 Digital Signature (RSA) — Requested Topic

**Status in this codebase: Not implemented.**

The prompt requested `cryptoUtils.ts` with RSA digital signature logic. I searched the repository and there is **no `cryptoUtils.ts`, no RSA key generation, no signing, and no signature verification** in the current MANUMATIK code.

**What you should say in defense:**

> “Our current MANUMATIK implementation does not use RSA digital signatures. Instead, it uses JWT for authentication, bcrypt for password hashing, role-based authorization, and database transactions for checkout integrity. If we were to add RSA digital signatures, it would be like adding a wax seal on a receipt or order payload so anyone can verify it was issued by the real system and was not changed.”

**Hypothetical example (for explanation only, not in this repo):**

```ts
// HYPOTHETICAL EXAMPLE ONLY - NOT PRESENT IN THIS CODEBASE
import crypto from "crypto";

export function signPayload(payload: string, privateKey: string): string {
  const signer = crypto.createSign("SHA256");
  signer.update(payload);
  signer.end();
  return signer.sign(privateKey, "base64");
}

export function verifyPayload(payload: string, signature: string, publicKey: string): boolean {
  const verifier = crypto.createVerify("SHA256");
  verifier.update(payload);
  verifier.end();
  return verifier.verify(publicKey, signature, "base64");
}
```

**Beginner-friendly explanation:**

A **digital signature** is like a **wax seal on an envelope**. The sender uses a private stamp (private key) to seal the message. Anyone with the public seal pattern (public key) can check if the seal is real and whether the message was opened or changed. In a real order system, this could prove that checkout data really came from the system and was not tampered with.

## 4.2 Signing on Checkout — Actual `checkout()` Flow

The prompt requested `placeOrder()` signing logic. This project has no `placeOrder()`; the closest real flow is **POS checkout** in `backend/src/services/inventoryService.ts` and `backend/src/models/saleModel.ts`.

**Code block: `backend/src/services/inventoryService.ts` (checkout)**

```ts
export const checkout = async (
  userId: number,
  body: CheckoutBody,
): Promise<{
  receipt_no: string;
  total: number;
  item_count: number;
}> => {
  if (!body.items || body.items.length === 0) {
    throw { status: 400, message: "Cart is empty." };
  }

  const payment_type = "Cash";

  const itemsWithPrices: Array<{
    part_id: number;
    quantity: number;
    unit_price: number;
  }> = [];

  for (const item of body.items) {
    if (!item.part_id || isNaN(item.part_id)) {
      throw { status: 400, message: "Invalid part ID in cart." };
    }

    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw { status: 400, message: "Quantity must be greater than zero." };
    }

    const part = await partModel.findById(item.part_id);
    if (!part) {
      throw { status: 404, message: `Part ID ${item.part_id} not found.` };
    }

    if (part.quantity < qty) {
      throw {
        status: 400,
        message: `Insufficient stock for "${part.name}". Only ${part.quantity} available.`,
      };
    }

    itemsWithPrices.push({
      part_id: item.part_id,
      quantity: qty,
      unit_price: Number(part.price),
    });
  }

  const receipt_no = await saleModel.generateReceiptNo();

  const result = await saleModel.createSaleWithItems({
    user_id: userId,
    items: itemsWithPrices,
    payment_type,
    receipt_no,
  });

  return {
    receipt_no,
    total: result.total,
    item_count: itemsWithPrices.reduce((sum, i) => sum + i.quantity, 0),
  };
};
```

**Code block: `backend/src/models/saleModel.ts` (transaction + stock deduction)**

```ts
export const createSaleWithItems = async (
  payload: CreateSalePayload,
): Promise<{ sale_ids: number[]; total: number }> => {
  const connection = await pool.getConnection();

  try {
    await connection.query("SET time_zone = '+08:00'");
    await connection.beginTransaction();

    const saleIds: number[] = [];
    let grandTotal = 0;

    for (const item of payload.items) {
      const [partRows] = await connection.execute(
        "SELECT name, quantity FROM parts WHERE part_id = ? FOR UPDATE",
        [item.part_id],
      );

      const parts = partRows as any[];
      if (parts.length === 0) {
        throw { status: 404, message: `Part ID ${item.part_id} not found.` };
      }

      const part = parts[0];

      if (part.quantity < item.quantity) {
        throw {
          status: 400,
          message: `Insufficient stock for "${part.name}". Only ${part.quantity} available.`,
        };
      }

      const lineTotal = item.quantity * item.unit_price;
      grandTotal += lineTotal;

      const [result] = await connection.execute(
        `INSERT INTO sales
           (user_id, part_id, quantity, total_price, payment_type, receipt_no)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          payload.user_id,
          item.part_id,
          item.quantity,
          lineTotal,
          payload.payment_type,
          payload.receipt_no,
        ],
      );

      saleIds.push((result as any).insertId);

      await connection.execute(
        "UPDATE parts SET quantity = quantity - ? WHERE part_id = ?",
        [item.quantity, item.part_id],
      );
    }

    await connection.commit();
    return { sale_ids: saleIds, total: grandTotal };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
```

**Beginner-friendly explanation:**

This checkout flow is like a cashier following a strict store procedure:

1. **Check the cart:** If there’s nothing in it, you can’t checkout.
2. **Check each item:** Is the part ID valid? Is quantity positive? Does the part exist? Is there enough stock?
3. **Prepare the receipt number:** Like assigning an official receipt number before finalizing.
4. **Start a safe transaction:** `beginTransaction()` is like saying, “Don’t finalize anything until every step succeeds.”
5. **Lock the stock row (`FOR UPDATE`):** Like putting a “do not touch” sign on the exact shelf item while the sale is being processed.
6. **Record sale and deduct stock:** The system writes the sale and reduces quantity.
7. **Commit or rollback:** If everything works, `commit()` saves it permanently. If anything fails, `rollback()` undoes it—like canceling the whole receipt if a problem happens midway.

## 4.3 Verifying on Scan — Actual `BarcodeScannerModal.tsx` Flow

The prompt requested `Scanner.tsx` signature verification. This project uses `frontend/src/components/BarcodeScannerModal.tsx`. It does **not verify cryptographic signatures**; it verifies that a scanned/typed barcode matches an actual part in the loaded parts list.

**Code block: `frontend/src/components/BarcodeScannerModal.tsx`**

```tsx
const handleCode = useCallback((raw: string) => {
  const code = raw.trim();
  if (!code) return;

  const part = partsRef.current.find(
    (p) =>
      p.part_number.trim().toLowerCase() === code.toLowerCase() ||
      p.name.trim().toLowerCase() === code.toLowerCase(),
  );

  if (!part) {
    setNotFound(`No part found for "${code}".`);
    return;
  }

  setNotFound("");
  setManualCode("");
  waitingForDecision.current = true;
  setPendingPart(part);
}, []);

// Poll for newly detected barcodes.
useEffect(() => {
  if (!open) return;

  const interval = setInterval(async () => {
    if (waitingForDecision.current) return;
    try {
      const res = await fetch(scannerUrl("/poll"));
      const data = await res.json();
      const codes: string[] = Array.isArray(data?.barcodes)
        ? data.barcodes
        : [];
      for (const code of codes) {
        if (waitingForDecision.current) break;
        handleCode(String(code));
      }
    } catch {
      // Ignore transient polling failures.
    }
  }, 1000);

  return () => clearInterval(interval);
}, [open, handleCode]);
```

**Beginner-friendly explanation:**

This is like a cashier scanning a product at checkout:

- The scanner keeps checking, “Did I see a new barcode?”
- When it gets a code, it looks through the known parts list.
- If it finds a matching part number/name, it shows the part details and asks for confirmation.
- If it doesn’t find a match, it says “No part found.”

This is **data matching/validation**, not cryptographic signature verification. A real signature check would answer, “Was this code/token truly signed by our system?” This code answers, “Does this scanned code belong to a part we know?”

## 4.4 Hybrid Barcode Scanner — `scanner.py` and `scan_loop`

The prompt requested `scan_id()` in Python. The actual implementation is in `manumatik-python-backend/app/services/scanner.py`, mainly in `BarcodeScanner._scan_loop()` and related methods.

**Code block: `manumatik-python-backend/app/services/scanner.py`**

```py
class BarcodeScanner:
    def __init__(self) -> None:
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running: bool = False
        self.detected_barcodes: List[str] = []
        self.lock = threading.Lock()
        self.latest_frame: Optional[bytes] = None
        self.visible_barcodes: Dict[str, int] = {}
        self.MISS_LIMIT = 5

    def _scan_loop(self) -> None:
        while self.is_running and self.cap is not None and self.cap.isOpened():
            success, frame = self.cap.read()
            if not success:
                time.sleep(0.1)
                continue

            current_barcodes = {}
            full_results = decode(frame)

            for barcode in full_results:
                code = barcode.data.decode("utf-8")
                current_barcodes[code] = barcode.rect

            for code, rect in current_barcodes.items():
                x, y, w, h = rect
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 4)
                cv2.putText(frame, code, (x, max(y - 15, 30)), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 3)

                if code not in self.visible_barcodes:
                    with self.lock:
                        self.detected_barcodes.append(code)

                self.visible_barcodes[code] = 0

            for code in list(self.visible_barcodes.keys()):
                if code not in current_barcodes:
                    self.visible_barcodes[code] += 1
                    if self.visible_barcodes[code] > self.MISS_LIMIT:
                        del self.visible_barcodes[code]

            stream_frame = cv2.resize(frame, (1280, 720))
            ret, buffer = cv2.imencode(".jpg", stream_frame)
            if ret:
                self.latest_frame = buffer.tobytes()

            time.sleep(0.04)
```

**Beginner-friendly explanation:**

This scanner works like a security camera with a barcode reader brain:

- **OpenCV (`cv2`)** grabs frames from the camera.
- **pyzbar `decode(frame)`** looks inside each frame for barcodes.
- When a barcode is found, it draws a green box and text on the video so humans can see it.
- It keeps a list of newly detected barcodes for the frontend to poll.
- It uses `visible_barcodes` and `MISS_LIMIT` to avoid spamming the same barcode repeatedly while it’s still visible. That’s like a cashier scanner beeping once, not 100 times per second for the same item.
- It converts frames to JPEG so the frontend can display them as a live video feed.

The “hybrid” part in practice is: **Python handles camera/decoding**, while **React/Node handle business decisions** (matching part, stock rules, checkout, database updates).

---

# 5. PRACTICE QUESTIONS

## Basic Understanding

| Question | Answer |
|---|---|
| What is MANUMATIK? | MANUMATIK is an Automotive Inventory and Point-of-Sale Intelligence System. It helps an auto parts store manage parts, process sales, scan barcodes, and view reports. |
| What problem does it solve? | It replaces scattered/manual tracking of stock and sales with one system that records inventory, checkout transactions, and analytics in an organized way. |
| Who are the users of the system? | The actual codebase has two roles: **Admin** and **Manager**. |
| What technologies are used? | Frontend: React + TypeScript + Vite. Backend: Node.js + Express + TypeScript + MySQL. Python microservice: FastAPI + OpenCV + pyzbar + Pandas. |
| Why use a database? | Because parts, users, sales, and receipts need to be stored reliably and queried later. It’s like keeping official records in a filing cabinet instead of relying on memory. |

## Cryptography / Security

| Question | Answer |
|---|---|
| Does this project implement RSA digital signatures? | No. The current codebase does not have RSA signing or verification. It uses JWT authentication, bcrypt password hashing, and role-based authorization. |
| What is JWT used for? | JWT is used as a login token. After successful login, the backend signs a token; the frontend sends it in `Authorization: Bearer <token>` for protected API requests. |
| Why is bcrypt used? | bcrypt hashes passwords before storing/comparing them. It’s like storing a scrambled lock pattern instead of the plain password. |
| What does `authenticateToken` do? | It reads the Bearer token from request headers, verifies it using JWT secret, and attaches decoded user info to `req.user`. If missing/invalid, it returns 401/403. |
| What does `authorizeRole` do? | It checks if the logged-in user’s role is allowed for a specific route. It’s like a door that only opens for certain badges. |

## Order / Sales Flow

| Question | Answer |
|---|---|
| Is there an order lifecycle like Pending → In Tailoring → Completed? | No. That lifecycle is not present. The actual flow is POS/inventory flow: manage stock → add items to cart → checkout → sale recorded → stock deducted → receipt generated. |
| What happens during checkout? | The system validates cart items, checks stock, generates a receipt number, creates sale rows in a DB transaction, deducts stock, commits the transaction, and returns receipt/total. |
| Why is VAT calculated in Sales? | The frontend calculates subtotal, 12% VAT, and total so the cashier and customer can see the full amount before payment. |
| What payment type is supported in checkout service? | The backend checkout service currently sets payment type to **Cash**. |
| What happens if stock is insufficient? | The service throws an error like “Insufficient stock...” and checkout does not complete. |

## Code Logic

| Question | Answer |
|---|---|
| How does the barcode scanner find a part? | `BarcodeScannerModal.tsx` polls `/scanner/poll`, gets barcode strings, then matches them against loaded parts by `part_number` or `name`. |
| How does the Python scanner avoid duplicate spam? | It tracks `visible_barcodes` and uses `MISS_LIMIT`. A code is only added as new when first seen; it’s removed after missing several frames. |
| Why does `saleModel.createSaleWithItems` use `FOR UPDATE`? | `FOR UPDATE` locks selected part rows during the transaction. This prevents race conditions where two checkouts try to use the same stock at once. |
| What does `rollback()` do? | If any step fails during checkout, `rollback()` cancels all changes made in that transaction. Like tearing up an incomplete receipt before it becomes official. |
| How does the frontend talk to two backends? | `frontend/src/services/api.ts` creates an Axios client for Node (`API_URL`) and uses `PYTHON_API_URL` for scanner-related calls. |

## Security

| Question | Answer |
|---|---|
| How are protected routes handled in frontend? | `RequireAuth` checks auth state; if not authenticated, it redirects/blocks access to protected pages. |
| How are protected routes handled in backend? | Routes use `authenticateToken`, and sensitive routes add `authorizeRole("admin", "manager")` or admin-only restrictions. |
| What prevents inactive users from logging in? | `authService.login` checks `user.is_active === 0` and throws “Account is disabled.” |
| Are passwords stored in plain text? | No. The system uses bcrypt hashing/comparison utilities. |
| Is the scanner endpoint cryptographically secure? | Not by signature. It’s a functional scanner service. Security depends on app architecture, network setup, and auth around business endpoints; the scan itself is barcode decoding + part matching. |

## Scenario-Based

| Question | Answer |
|---|---|
| Two cashiers try to sell the last item at the same time. What happens? | The DB transaction with `FOR UPDATE` and stock checks helps prevent overselling. One transaction should succeed; the other should fail with insufficient stock and roll back. |
| A scanned barcode is not in the catalog. What happens? | `BarcodeScannerModal` shows `No part found for "<code>"` and does not confirm a part. |
| The Python camera service is down. Can the user still proceed? | The modal allows manual barcode entry, and many Node-based features still work. But live camera scanning won’t work until Python scanner is running. |
| A manager tries to access an admin-only action. What happens? | `authorizeRole` should reject it with 403 Insufficient permissions. |
| A checkout fails after inserting one sale row. Will stock be half-updated? | No, because the checkout uses a transaction. On error, it calls `rollback()`. |

## Database

| Question | Answer |
|---|---|
| What main tables are implied by the code? | `users`, `parts`, `sales`, and `stock_receipts` are directly referenced. |
| What does the `parts` table store? | Part number, name, category, description, price, cost, markup, reorder level, quantity, location, supplier, image, timestamps. |
| What does the `sales` table store? | Sale/user/part IDs, quantity, total price, sale date, payment type, receipt number. |
| What does `stock_receipts` store? | A receiving audit trail: part, user, quantity received, cost per unit, total cost. |
| Why generate a receipt number? | It groups/items a sale under a human-readable reference, like an official receipt ID for tracking and customer proof. |

---

# 6. QUICK DEMO CHECKLIST

| Step | What to Do | Expected Result |
|---|---|---|
| 1 | Start MySQL and ensure `.env`/DB config is correct. | Database is reachable; backend can connect. |
| 2 | Start Node backend (`backend`: `npm run dev`). | Console shows MANUMATIK API started on port (usually 5000). |
| 3 | Start Python service (`manumatik-python-backend`: run FastAPI/Uvicorn). | Python API runs (usually 8000); `/` returns running message. |
| 4 | Start frontend (`frontend`: `npm run dev`). | Vite app opens on local URL (usually 5173). |
| 5 | Log in as Admin or Manager. | JWT/token stored; redirected to dashboard; protected routes accessible. |
| 6 | Open Dashboard. | KPIs, sales trend, recent transactions, logs, and low-stock cards load. |
| 7 | Open Inventory and add/edit a part. | Part appears in catalog; data persists in DB. |
| 8 | Use “Receive Supply” or stock adjustment. | Quantity/cost/markup/price updates as expected. |
| 9 | Open POS/Sales, add items to cart. | Cart shows subtotal, VAT (12%), total. |
| 10 | Scan barcode or enter barcode manually. | Matching part is found and can be confirmed/added. |
| 11 | Complete cash checkout. | Receipt modal appears with receipt number; stock decreases; sale recorded. |
| 12 | Open Reports. | Sales overview/valuation/movers/reorder/forecast/cashier tabs load; export/print works. |
| 13 | (Admin) Open user management in Inventory settings. | Can create user, reset password, enable/disable account. |
| 14 | Try accessing protected action without permission/token (optional). | API returns 401/403; frontend handles auth error. |
