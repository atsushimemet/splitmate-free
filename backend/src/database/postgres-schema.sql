-- Create session table for PostgreSQL session store
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
)
WITH (OIDS=FALSE);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('husband', 'wife')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Allocation ratios table
CREATE TABLE IF NOT EXISTS allocation_ratios (
  id VARCHAR(255) PRIMARY KEY,
  husband_ratio DECIMAL(3,2) NOT NULL CHECK (husband_ratio >= 0 AND husband_ratio <= 1),
  wife_ratio DECIMAL(3,2) NOT NULL CHECK (wife_ratio >= 0 AND wife_ratio <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CHECK (ABS(husband_ratio + wife_ratio - 1.0) < 0.001)
);

-- Expenses table (with monthly tracking and custom allocation ratios)
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(255) PRIMARY KEY,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  payer_id VARCHAR(255) NOT NULL,
  expense_year INTEGER NOT NULL,
  expense_month INTEGER NOT NULL,
  -- Custom allocation ratio fields
  custom_husband_ratio DECIMAL(3,2) CHECK (custom_husband_ratio IS NULL OR (custom_husband_ratio >= 0 AND custom_husband_ratio <= 1)),
  custom_wife_ratio DECIMAL(3,2) CHECK (custom_wife_ratio IS NULL OR (custom_wife_ratio >= 0 AND custom_wife_ratio <= 1)),
  uses_custom_ratio BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (expense_year >= 2020 AND expense_year <= 2099),
  CHECK (expense_month >= 1 AND expense_month <= 12),
  -- Custom ratio validation: if uses_custom_ratio is true, both custom ratios must be set and sum to 1
  CHECK (uses_custom_ratio = FALSE OR (custom_husband_ratio IS NOT NULL AND custom_wife_ratio IS NOT NULL AND ABS(custom_husband_ratio + custom_wife_ratio - 1.0) < 0.001))
);

-- Settlements table
CREATE TABLE IF NOT EXISTS settlements (
  id VARCHAR(255) PRIMARY KEY,
  expense_id VARCHAR(255) NOT NULL,
  husband_amount INTEGER NOT NULL,
  wife_amount INTEGER NOT NULL,
  payer VARCHAR(20) NOT NULL CHECK (payer IN ('husband', 'wife')),
  receiver VARCHAR(20) NOT NULL CHECK (receiver IN ('husband', 'wife')),
  settlement_amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at (drop if exists first to avoid conflicts)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_allocation_ratios_updated_at ON allocation_ratios;
CREATE TRIGGER update_allocation_ratios_updated_at BEFORE UPDATE ON allocation_ratios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settlements_updated_at ON settlements;
CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON settlements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 
