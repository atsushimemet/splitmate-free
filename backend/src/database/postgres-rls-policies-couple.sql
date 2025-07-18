-- Enable Row Level Security on all tables
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_ratios ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Development policies (allow all access for postgres user)
CREATE POLICY allow_all_access_couples_dev ON couples FOR ALL USING (current_user = 'postgres');
CREATE POLICY allow_all_access_users_dev ON users FOR ALL USING (current_user = 'postgres');
CREATE POLICY allow_all_access_allocation_ratios_dev ON allocation_ratios FOR ALL USING (current_user = 'postgres');
CREATE POLICY allow_all_access_expenses_dev ON expenses FOR ALL USING (current_user = 'postgres');
CREATE POLICY allow_all_access_settlements_dev ON settlements FOR ALL USING (current_user = 'postgres');

-- Production policies for couples table
CREATE POLICY couples_select_policy ON couples FOR SELECT USING (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = id::text
);

CREATE POLICY couples_insert_policy ON couples FOR INSERT WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = id::text
);

CREATE POLICY couples_update_policy ON couples FOR UPDATE USING (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = id::text
);

CREATE POLICY couples_delete_policy ON couples FOR DELETE USING (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = id::text
);

-- Production policies for users table
CREATE POLICY users_select_policy ON users FOR SELECT USING (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = couple_id::text
);

CREATE POLICY users_insert_policy ON users FOR INSERT WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = couple_id::text
);

CREATE POLICY users_update_policy ON users FOR UPDATE USING (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = couple_id::text
);

CREATE POLICY users_delete_policy ON users FOR DELETE USING (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = couple_id::text
);

-- Production policies for allocation_ratios table
CREATE POLICY allocation_ratios_select_policy ON allocation_ratios FOR SELECT USING (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = couple_id::text
);

CREATE POLICY allocation_ratios_insert_policy ON allocation_ratios FOR INSERT WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = couple_id::text
);

CREATE POLICY allocation_ratios_update_policy ON allocation_ratios FOR UPDATE USING (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = couple_id::text
);

CREATE POLICY allocation_ratios_delete_policy ON allocation_ratios FOR DELETE USING (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = couple_id::text
);

-- Production policies for expenses table
CREATE POLICY expenses_select_policy ON expenses FOR SELECT USING (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = couple_id::text
);

CREATE POLICY expenses_insert_policy ON expenses FOR INSERT WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = couple_id::text
);

CREATE POLICY expenses_update_policy ON expenses FOR UPDATE USING (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = couple_id::text
);

CREATE POLICY expenses_delete_policy ON expenses FOR DELETE USING (
  current_setting('request.jwt.claims', true)::json->>'couple_id' = couple_id::text
);

-- Production policies for settlements table
-- Note: Settlements are filtered through the expense's couple_id
CREATE POLICY settlements_select_policy ON settlements FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM expenses 
    WHERE expenses.id = settlements.expense_id 
    AND expenses.couple_id::text = current_setting('request.jwt.claims', true)::json->>'couple_id'
  )
);

CREATE POLICY settlements_insert_policy ON settlements FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM expenses 
    WHERE expenses.id = settlements.expense_id 
    AND expenses.couple_id::text = current_setting('request.jwt.claims', true)::json->>'couple_id'
  )
);

CREATE POLICY settlements_update_policy ON settlements FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM expenses 
    WHERE expenses.id = settlements.expense_id 
    AND expenses.couple_id::text = current_setting('request.jwt.claims', true)::json->>'couple_id'
  )
);

CREATE POLICY settlements_delete_policy ON settlements FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM expenses 
    WHERE expenses.id = settlements.expense_id 
    AND expenses.couple_id::text = current_setting('request.jwt.claims', true)::json->>'couple_id'
  )
); 
