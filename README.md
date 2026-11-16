# FolioReserve — Library Book Reservation Portal

Full-stack Library Book Search & Reservation application built with React, Vite, Express (Node.js), and Tailwind CSS across 5 core modules:

1. **Catalog Search** — Search by title, author, ISBN, or call number; filter by department, floor, and real-time shelf availability.
2. **Reservations & Holds** — Lock 24-hour pickup holds with pickup codes, extend holds (+12h), or join automated waitlist queues.
3. **Student Account** — Registration, login, borrowing limit tracking, saved reading list, and notification preferences.
4. **Admin Portal** (`/admin`) — Pickup code verification, return processing (auto-promotes waitlisted students), catalog CRUD, student hold limit management, and alert broadcasting.
5. **Alerts & Notices** — Automated pickup ready, waitlist promotion, due date, and overdue notifications.

## Running Locally in VS Code

> **Important:** Do **not** open `index.html` using the VS Code *Live Server* extension. This is a full-stack Node.js + Vite React application and must be started via `npm run dev`.

### 1. Prerequisites
- **Node.js 20+** (check with `node -v` in the VS Code Terminal)

### 2. Install & Run
Open the project folder in VS Code, open the integrated terminal (`Ctrl + \``), and run:

```bash
npm install
npm run dev
```

Or simply press **`F5`** in VS Code (configured in `.vscode/launch.json`).

### 3. Open in Browser
- Student Portal: `http://localhost:3000`
- Admin Portal: `http://localhost:3000/admin`

### Demo Credentials
- **Student:** `aarav.sharma@university.edu` / `student123`
- **Librarian Admin:** `librarian@university.edu` / `admin123`

### Production Build
```bash
npm run build
npm start
```
