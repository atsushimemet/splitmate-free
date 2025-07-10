-- 本番環境のデータベーススキーマ更新スクリプト
-- Issue #29: 個別配分比率機能のためのフィールドを追加

-- 既存のテーブルにカスタム配分比率カラムを追加（存在しない場合のみ）
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS custom_husband_ratio DECIMAL(3,2) NULL CHECK (custom_husband_ratio IS NULL OR (custom_husband_ratio >= 0 AND custom_husband_ratio <= 1)),
ADD COLUMN IF NOT EXISTS custom_wife_ratio DECIMAL(3,2) NULL CHECK (custom_wife_ratio IS NULL OR (custom_wife_ratio >= 0 AND custom_wife_ratio <= 1)),
ADD COLUMN IF NOT EXISTS uses_custom_ratio BOOLEAN DEFAULT FALSE;

-- 年月フィールドを追加（存在しない場合のみ）
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS expense_year INT NOT NULL DEFAULT YEAR(NOW()),
ADD COLUMN IF NOT EXISTS expense_month INT NOT NULL DEFAULT MONTH(NOW());

-- 制約を追加（重複エラーを無視）
ALTER TABLE expenses 
ADD CONSTRAINT check_expense_year CHECK (expense_year >= 2020 AND expense_year <= 2099),
ADD CONSTRAINT check_expense_month CHECK (expense_month >= 1 AND expense_month <= 12),
ADD CONSTRAINT check_custom_ratio_consistency CHECK (
  uses_custom_ratio = FALSE OR 
  (custom_husband_ratio IS NOT NULL AND custom_wife_ratio IS NOT NULL AND ABS(custom_husband_ratio + custom_wife_ratio - 1.0) < 0.001)
);

-- 既存のデータを現在の年月で更新
UPDATE expenses 
SET expense_year = YEAR(created_at), 
    expense_month = MONTH(created_at) 
WHERE expense_year IS NULL OR expense_month IS NULL;

-- インデックスを追加（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_expenses_monthly ON expenses(expense_year, expense_month);
CREATE INDEX IF NOT EXISTS idx_expenses_monthly_payer ON expenses(expense_year, expense_month, payer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_custom_ratio ON expenses(uses_custom_ratio);

-- 確認用クエリ
SELECT 'Schema update completed - custom allocation ratios added' as status;
DESCRIBE expenses; 
