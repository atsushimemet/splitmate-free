-- Supabase Database Reset Script
-- This script removes all existing tables, triggers, and functions safely

-- Drop all triggers first (only if tables exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settlements') THEN
        DROP TRIGGER IF EXISTS update_settlements_updated_at ON settlements;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'allocation_ratios') THEN
        DROP TRIGGER IF EXISTS update_allocation_ratios_updated_at ON allocation_ratios;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    END IF;
END $$;

-- Drop all tables in the correct order (reverse of dependencies)
DROP TABLE IF EXISTS settlements CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS allocation_ratios CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop all indexes (they should be dropped automatically with tables, but just in case)
DROP INDEX IF EXISTS idx_expenses_payer;
DROP INDEX IF EXISTS idx_expenses_date;
DROP INDEX IF EXISTS idx_expenses_created_at;
DROP INDEX IF EXISTS idx_settlements_expense_id;
DROP INDEX IF EXISTS idx_settlements_status;

-- Clean up any remaining objects
-- Note: This will remove all data from the database
SELECT 'Database reset completed - all tables, triggers, and functions have been removed' AS status; 
