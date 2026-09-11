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

### Backend
```
cd backend
npm install
npm run dev        # starts the API on http://localhost:4000
```

### Frontend
```
cd frontend
npm install
npm run dev         # starts the app on http://localhost:5173
```

## Status

- [x] Project scaffold
- [x] Login page (frontend) + `/api/auth/login` stub (backend)
- [ ] Dashboard / role-based routing
- [ ] Inventory module
- [ ] Sales / POS module
- [ ] Customer orders module
- [ ] Reports module

Say "next" any time to keep building the next piece.
