# HackSync SpendGuard: Micro Expense Tracker & Financial Leakage Radar

A high-performance, responsive micro-expense tracker and financial health radar built with **Antigravity (Stitch MCP design patterns)**, **Supabase PostgreSQL (REST + Realtime)**, **Chart.js**, and **Pure Local Logic** for semantic categorization and financial leakage detection.

---

## 🌟 Architecture Highlights

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend UI** | Vanilla HTML5 / CSS3 / JavaScript | Responsive Glassmorphism Design System, Mobile Bottom Nav, Dark & Light Themes |
| **UI Components** | Stitch MCP Design Patterns | Glass cards, fast-add logger, telemetry meters, progress bars, responsive tables |
| **Database** | Supabase (PostgreSQL) | Tables: `users`, `expenses`, `budgets`, `leakage_log` with RLS & Realtime |
| **Backend API** | Supabase REST + Realtime | Direct client SDK integration with offline/local fallback |
| **Categorization** | Pure Local Logic Engine | Instant semantic regex pattern classifier (Food, Transport, Entertainment, Shopping, Utilities, Other) |
| **Leakage Detection**| Pure Local Logic Heuristics | 0–100 Health Score, daily drip waste, subscription rotation, impulse surges |

---

## 🗄️ Part 1: Supabase Database Setup

Run the SQL script [`schema.sql`](file:///c:/Project/hacksync/schema.sql) in your **Supabase Dashboard → SQL Editor**:

```sql
-- 1. Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description VARCHAR NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category VARCHAR NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create budgets table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR NOT NULL,
  month VARCHAR NOT NULL,
  limit_amount DECIMAL(10, 2) NOT NULL
);

-- 4. Create leakage_log table
CREATE TABLE leakage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INT NOT NULL,
  analysis TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 Part 2: Connecting Supabase Credentials in the App

1. In Supabase Dashboard, go to **Settings → API**.
2. Copy your **Project URL** (`https://xyzcompany.supabase.co`) and **anon public key**.
3. Open SpendGuard in your browser:
   - Click on the **🔌 Supabase Ready / Local Mode** badge in the navbar, or go to **⚙️ Settings**.
   - Paste your **Supabase URL** and **Anon Key**.
   - Click **Test Connection** & **Save & Sync**.
4. The status badge will switch to **🟢 Supabase DB Live**.

---

## 📱 Mobile & Laptop / PC Responsive Design

- **Mobile View (`≤ 768px`)**:
  - Fixed **Mobile Bottom Navigation Bar** (`🏠 Home`, `📊 Dashboard`, `📈 Analytics`, `🎯 Budget`, `📡 Leakage`, `⚙️ Settings`) with safe-area notch support (`env(safe-area-inset-bottom)`).
  - Single-column responsive layout with 16px anti-zoom inputs and smooth touch-momentum scrollable chips.
- **Laptop & Desktop (`1025px+`)**:
  - Expanded 4-column metric telemetry cards with hover glow and lift effects.
  - 2-column asymmetric dashboard (sticky quick-add input form on left, interactive charts & transaction ledger stream on right).

---

## 🚀 1-Click Launching the Project

### Option 1: Double-Click Batch File (Windows)
Double-click [`start.bat`](file:///c:/Project/hacksync/start.bat) in the project folder. It will:
1. Verify Node.js
2. Auto-install dependencies if needed (`npm install`)
3. Launch the Express server (`http://localhost:3000`)
4. Auto-open your default web browser!

### Option 2: Terminal Command
```powershell
# Start the server
npm start

# Run automated logic verification tests
node test_logic.js
```

Open `http://localhost:3000` in your web browser.
