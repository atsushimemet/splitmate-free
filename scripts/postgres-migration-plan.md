# MySQL → PostgreSQL 移行詳細計画書

## 現在の状況分析

### 発見されたMySQL依存箇所

#### 1. データベーススキーマの変更点
```sql
-- 主な変更点
1. ENUM型 → VARCHAR + CHECK制約
2. AUTO_INCREMENT → SERIAL
3. ON UPDATE CURRENT_TIMESTAMP → PostgreSQLのトリガー
4. TIMESTAMP → TIMESTAMP WITH TIME ZONE推奨
5. CHECK制約の調整
```

#### 2. バックエンドコードの変更点
- **接続ライブラリ**: `mysql2` → `pg`
- **プレースホルダー**: `?` → `$1, $2, ...`
- **日時フォーマット**: `mysqlDateTime` → PostgreSQL形式
- **INSERT ... ON DUPLICATE KEY UPDATE** → **INSERT ... ON CONFLICT**

## Phase 1: PostgreSQLスキーマ作成

### 1.1 PostgreSQL用スキーマファイル作成

```sql
-- scripts/postgres-schema.sql

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

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(255) PRIMARY KEY,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    payer_id VARCHAR(255) NOT NULL,
    expense_year INTEGER NOT NULL,
    expense_month INTEGER NOT NULL,
    custom_husband_ratio DECIMAL(3,2) NULL CHECK (custom_husband_ratio IS NULL OR (custom_husband_ratio >= 0 AND custom_husband_ratio <= 1)),
    custom_wife_ratio DECIMAL(3,2) NULL CHECK (custom_wife_ratio IS NULL OR (custom_wife_ratio >= 0 AND custom_wife_ratio <= 1)),
    uses_custom_ratio BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (expense_year >= 2020 AND expense_year <= 2099),
    CHECK (expense_month >= 1 AND expense_month <= 12),
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

-- UPDATE用のトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの設定
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_allocation_ratios_updated_at BEFORE UPDATE ON allocation_ratios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON settlements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Phase 2: バックエンドコード変更

### 2.1 データベース接続の変更

```typescript
// backend/src/database/connection-postgres.ts
import { Pool, PoolConfig } from 'pg';
import path from 'path';
import fs from 'fs';

const dbConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(dbConfig);

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Connected to PostgreSQL database');
    return true;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL database:', error);
    return false;
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    const schemaPath = path.join(__dirname, 'postgres-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}
```

### 2.2 サービス層の変更

#### AllocationRatioService変更
```typescript
// backend/src/services/allocationRatioService-postgres.ts
import { pool } from '../database/connection-postgres';

export const allocationRatioService = {
  async create(data: CreateAllocationRatioInput): Promise<AllocationRatio> {
    const id = generateId();
    
    const insertQuery = `
      INSERT INTO allocation_ratios (id, husband_ratio, wife_ratio, created_at, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    await pool.query(insertQuery, [id, data.husbandRatio, data.wifeRatio]);
    
    const selectQuery = 'SELECT * FROM allocation_ratios WHERE id = $1';
    const result = await pool.query(selectQuery, [id]);
    
    return result.rows[0];
  }
};
```

#### ExpenseService変更  
```typescript
// backend/src/services/expenseService-postgres.ts
import { pool } from '../database/connection-postgres';

export class ExpenseService {
  async create(data: CreateExpenseInput): Promise<Expense> {
    const id = generateId();
    
    const insertQuery = `
      INSERT INTO expenses (
        id, description, amount, payer_id, expense_year, expense_month,
        custom_husband_ratio, custom_wife_ratio, uses_custom_ratio,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;
    
    await pool.query(insertQuery, [
      id, data.description, data.amount, data.payerId,
      data.expenseYear, data.expenseMonth,
      data.customHusbandRatio, data.customWifeRatio, data.usesCustomRatio
    ]);
    
    const selectQuery = 'SELECT * FROM expenses WHERE id = $1';
    const result = await pool.query(selectQuery, [id]);
    
    return result.rows[0];
  }

  async updateOrCreate(id: string, data: UpdateExpenseInput): Promise<Expense> {
    // PostgreSQLでのINSERT ... ON CONFLICT
    const upsertQuery = `
      INSERT INTO expenses (
        id, description, amount, payer_id, expense_year, expense_month,
        custom_husband_ratio, custom_wife_ratio, uses_custom_ratio,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        amount = EXCLUDED.amount,
        payer_id = EXCLUDED.payer_id,
        expense_year = EXCLUDED.expense_year,
        expense_month = EXCLUDED.expense_month,
        custom_husband_ratio = EXCLUDED.custom_husband_ratio,
        custom_wife_ratio = EXCLUDED.custom_wife_ratio,
        uses_custom_ratio = EXCLUDED.uses_custom_ratio,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await pool.query(upsertQuery, [
      id, data.description, data.amount, data.payerId,
      data.expenseYear, data.expenseMonth,
      data.customHusbandRatio, data.customWifeRatio, data.usesCustomRatio
    ]);
    
    const selectQuery = 'SELECT * FROM expenses WHERE id = $1';
    const result = await pool.query(selectQuery, [id]);
    
    return result.rows[0];
  }
}
```

### 2.3 package.json依存関係の更新

```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "@types/pg": "^8.10.9"
  }
}
```

## Phase 3: データ移行スクリプト

### 3.1 移行スクリプト作成

```bash
#!/bin/bash
# scripts/migrate-to-postgres.sh

set -e

echo "🚀 Starting MySQL to PostgreSQL migration..."

# 環境変数の確認
if [[ -z "$MYSQL_HOST" || -z "$MYSQL_USER" || -z "$MYSQL_PASSWORD" || -z "$POSTGRES_URL" ]]; then
    echo "❌ Required environment variables are missing"
    echo "Required: MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, POSTGRES_URL"
    exit 1
fi

# 一時ディレクトリ作成
TEMP_DIR=$(mktemp -d)
cd $TEMP_DIR

echo "📦 Exporting data from MySQL..."

# MySQLからデータをエクスポート
mysqldump --host=$MYSQL_HOST --user=$MYSQL_USER --password=$MYSQL_PASSWORD \
  --no-create-info --skip-triggers --single-transaction --lock-tables=false \
  --complete-insert --hex-blob --routines=false --events=false \
  splitmate > mysql_data.sql

echo "🔄 Converting data format..."

# PostgreSQL形式に変換
sed -i 's/`//g' mysql_data.sql
sed -i "s/\\\'/\'\'/g" mysql_data.sql
sed -i 's/\\n/\n/g' mysql_data.sql
sed -i 's/\\r/\r/g' mysql_data.sql

# ENUMの変換
sed -i "s/'husband'/'husband'/g" mysql_data.sql
sed -i "s/'wife'/'wife'/g" mysql_data.sql
sed -i "s/'pending'/'pending'/g" mysql_data.sql
sed -i "s/'approved'/'approved'/g" mysql_data.sql
sed -i "s/'completed'/'completed'/g" mysql_data.sql

echo "🗄️ Creating PostgreSQL schema..."
psql $POSTGRES_URL < /path/to/scripts/postgres-schema.sql

echo "📊 Importing data to PostgreSQL..."
psql $POSTGRES_URL < mysql_data.sql

echo "✅ Migration completed successfully!"

# クリーンアップ
cd -
rm -rf $TEMP_DIR
```

## Phase 4: テスト・検証

### 4.1 データ整合性検証

```sql
-- scripts/verify-migration.sql

-- レコード数の確認
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'allocation_ratios', COUNT(*) FROM allocation_ratios
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses  
UNION ALL
SELECT 'settlements', COUNT(*) FROM settlements;

-- データ型の確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('users', 'allocation_ratios', 'expenses', 'settlements')
ORDER BY table_name, ordinal_position;

-- 制約の確認
SELECT conname, contype, confrelid::regclass as referenced_table
FROM pg_constraint 
WHERE conrelid IN (
  SELECT oid FROM pg_class WHERE relname IN ('users', 'allocation_ratios', 'expenses', 'settlements')
);
```

### 4.2 アプリケーションテスト

```typescript
// tests/postgres-migration.test.ts
describe('PostgreSQL Migration Tests', () => {
  test('Database connection works', async () => {
    const result = await testConnection();
    expect(result).toBe(true);
  });

  test('Can create and retrieve allocation ratio', async () => {
    const data = { husbandRatio: 0.6, wifeRatio: 0.4 };
    const ratio = await allocationRatioService.create(data);
    expect(ratio.husband_ratio).toBe(0.6);
    expect(ratio.wife_ratio).toBe(0.4);
  });

  test('Can create and retrieve expense', async () => {
    const data = {
      description: 'Test expense',
      amount: 1000,
      payerId: 'user1',
      expenseYear: 2024,
      expenseMonth: 1
    };
    const expense = await expenseService.create(data);
    expect(expense.description).toBe('Test expense');
    expect(expense.amount).toBe(1000);
  });
});
```

## 実装順序

1. ✅ **環境分析完了** - 現在のMySQLスキーマ・コード分析
2. 🔄 **PostgreSQLスキーマ作成** - 次のステップ
3. ⏳ **接続ライブラリ変更**
4. ⏳ **サービス層PostgreSQL対応**
5. ⏳ **移行スクリプト作成・テスト**
6. ⏳ **Supabase環境構築**
7. ⏳ **データ移行実行**
8. ⏳ **アプリケーションテスト**

## 次のアクション

1. **PostgreSQLスキーマファイル作成**: `scripts/postgres-schema.sql`
2. **パッケージ依存関係更新**: `pg`ライブラリ追加
3. **接続モジュール作成**: `connection-postgres.ts`
4. **段階的サービス移行**: 各サービスのPostgreSQL対応版作成

この計画に従って安全に移行を進めることができます。 
