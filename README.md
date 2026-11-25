# Trimidal Group — Automotive Inventory & Point-of-Sale Intelligence System

Monorepo for the system described in the project study. Two independent apps:

```
trimidal-pos/
├── frontend/   React + TypeScript + native CSS (Vite)
├── backend/    Node.js + TypeScript + Express (REST API)
```

## Why this structure

The study defines three user roles (sales staff, inventory personnel, management) sharing
one system, with modules for parts catalog, real-time inventory, sales/POS transactions,
customer orders, stock alerts, and reporting. The folders below are scoped so each of those
modules can be added as its own route/page/service without restructuring later:

- `frontend/src/pages/` — one folder per screen (Login, Dashboard, Inventory, Sales/POS,
  CustomerOrders, Reports — added as we build them).
- `frontend/src/components/` — shared UI pieces reused across pages (buttons, inputs, nav).
- `frontend/src/context/` — app-wide state, starting with authentication/session.
- `frontend/src/services/` — functions that call the backend API (one file per resource).
- `frontend/src/styles/` — native CSS: design tokens + global styles + per-page stylesheets.
- `frontend/src/types/` — shared TypeScript types (mirrors backend models where relevant).

- `backend/src/routes/` — Express routers, one per resource (auth, inventory, sales, ...).
- `backend/src/controllers/` — request handlers called by routes.
- `backend/src/middleware/` — auth guard, role checks, error handling.
- `backend/src/models/` — data shapes / DB schema definitions.
- `backend/src/services/` — business logic, kept separate from HTTP concerns.
- `backend/src/config/` — environment and app configuration.

## Getting started

Prerequisites: MySQL with a `manumatik` database (the schema is not yet in this repo).

Run all three services from the repo root:
```
npm install
npm start        # Python :8000, Node API :5000, React :5173
```

Or start them individually:

### Python scanner/analytics service
```
cd manumatik-python-backend
python -m venv venv
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Backend
```
cd backend
npm install
cp .env.example .env
npm run dev      # starts the API on http://localhost:5000
```

### Frontend
```
cd frontend
npm install
cp .env.example .env
npm run dev      # starts the app on http://localhost:5173
```

## Status

- [x] Project scaffold
- [x] Login (JWT/bcrypt) + role-based authorization (Admin, Manager)
- [x] Dashboard with KPIs, charts, transactions, and low-stock alerts
- [x] Inventory module (parts, search, stock adjust/receive, barcode labels)
- [x] Sales / POS module (cart, 12% VAT, cash checkout, receipts)
- [x] Reports module (sales, valuation, movers, reorder, forecast, cashiers)
- [x] Python barcode scanner service and camera feed
- [ ] Customer orders module

See `DEFENSE_STUDY_GUIDE.md` for a detailed walkthrough of the implemented flows.
