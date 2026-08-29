-- ==============================================================================
-- HACKSYNC SPENDGUARD - SUPABASE POSTGRESQL DATABASE SCHEMA
-- Run this script in the Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description VARCHAR NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR NOT NULL CHECK (category IN ('Food', 'Transport', 'Entertainment', 'Shopping', 'Utilities', 'Other')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_recurring BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR DEFAULT 'UPI',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR NOT NULL,
    month VARCHAR NOT NULL, -- Format: YYYY-MM
    limit_amount DECIMAL(10, 2) NOT NULL CHECK (limit_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category, month)
);

-- 4. Create Leakage Log Table
CREATE TABLE IF NOT EXISTS leakage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score >= 0 AND score <= 100),
    analysis TEXT NOT NULL,
    monthly_leakage_estimate DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leakage_log ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies (Allow access for testing & authenticated user sessions)
CREATE POLICY "Public Read/Write for users" ON users FOR ALL USING (true);
CREATE POLICY "Public Read/Write for expenses" ON expenses FOR ALL USING (true);
CREATE POLICY "Public Read/Write for budgets" ON budgets FOR ALL USING (true);
CREATE POLICY "Public Read/Write for leakage_log" ON leakage_log FOR ALL USING (true);

-- 8. Enable Realtime for Expenses & Budgets
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE budgets;
