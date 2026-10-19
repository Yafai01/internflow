# InternFlow

InternFlow is a browser-based internship management dashboard built with React, TypeScript, and Vite. Administrators create intern profiles, assign them to internship programs, and manage their tasks; interns sign in to a personal Kanban-style task board and update task status as they work. All data is stored locally in the browser using IndexedDB (via Dexie), so the app runs without a backend.

## Features

- **Role-based login** – separate Admin and Intern views; the session is persisted in `localStorage`.
- **Admin dashboard**
  - Summary cards: total interns, active program streams, average progress, pending tasks.
  - Intern table with search (name/email), program and status filters, and sortable columns.
  - Create and remove intern profiles (removing an intern also deletes their programs and tasks).
  - Assign a program (type, start/end dates) and add or delete tasks per intern.
  - Settings page to add, remove, and toggle program types and task statuses.
- **Intern dashboard**
  - Kanban task board with one column per status; move tasks by drag-and-drop or quick-action buttons.
  - Program progress bar, recalculated automatically from task status.
  - Profile settings page for updating account details.
- **Local persistence** – IndexedDB database seeded on first run with default statuses, program types, and demo users.

## Tech stack

- React 19 + TypeScript
- Vite
- Dexie / dexie-react-hooks (IndexedDB)
- lucide-react (icons)
- ESLint

## Getting started

### Prerequisites

- Node.js (a recent LTS release) and npm

### Install and run

```bash
npm install
npm run dev
```

Then open the URL printed by Vite (default `http://localhost:5173`).

### Available scripts

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start the Vite development server        |
| `npm run build`   | Type-check and build for production      |
| `npm run preview` | Preview the production build locally     |
| `npm run lint`    | Run ESLint                               |

### Demo accounts

The database is seeded with demo users on first load; the credentials are shown on the login screen (e.g. admin: `admin123@internflow.com` / `admin123`). These are local demo accounts only.

> Note: authentication is client-side and data lives in the browser's IndexedDB. This project is a front-end prototype and is not intended for storing real user data.

## Project structure

```
src/
  App.tsx                      # Session handling and role-based routing
  db.ts                        # Dexie schema, seed data, progress calculation
  components/
    LoginView.tsx              # Login screen
    AdminDashboard.tsx         # Admin board and settings
    InternDashboard.tsx        # Intern task board and profile
```
