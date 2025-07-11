# パターン2実装計画書
# Render + Supabase + Netlify デプロイ環境構築

## 概要

このドキュメントでは、SplitMateプロジェクトをパターン2（Render + Supabase + Netlify）でデプロイするための詳細な実装計画を説明します。

**構成:**
- **フロントエンド**: Netlify (無料)
- **バックエンド**: Render (無料プラン) 
- **データベース**: Supabase PostgreSQL (無料)

**予想コスト**: 2ヶ月無料 → $6/月

## Phase 1: 事前調査・準備作業

### 1.1 現在の環境分析

#### MySQLスキーマ調査
```bash
# 現在のMySQLスキーマを分析
cat backend/src/database/schema-mysql.sql

# テーブル構造の詳細確認
npm run db:inspect

# データ量の確認
npm run db:stats
```

#### バックエンドコード調査
```bash
# MySQL依存箇所の特定
grep -r "mysql" backend/src/
grep -r "DATE_FORMAT" backend/src/
grep -r "LIMIT.*OFFSET" backend/src/
```

### 1.2 PostgreSQL互換性チェック

**要確認項目:**
- [ ] AUTO_INCREMENT → SERIAL変換
- [ ] DATETIME → TIMESTAMP変換  
- [ ] MySQL固有関数の置換
- [ ] LIMIT/OFFSET構文の確認
- [ ] インデックス設定の見直し

## Phase 2: データベース移行準備

### 2.1 PostgreSQL移行スクリプト作成

#### スキーマ変換スクリプト
```sql
-- scripts/mysql-to-postgres-schema.sql

-- usersテーブルの変換例
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- expensesテーブルの変換例  
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- その他のテーブルも同様に変換...
```

#### データ移行スクリプト
```bash
#!/bin/bash
# scripts/migrate-data.sh

# MySQLからデータエクスポート
mysqldump --host=$MYSQL_HOST --user=$MYSQL_USER --password=$MYSQL_PASSWORD \
  --no-create-info --skip-triggers --single-transaction \
  splitmate > mysql_data.sql

# PostgreSQL形式に変換
sed -i 's/`//g' mysql_data.sql
sed -i "s/\\\'/\'\'/g" mysql_data.sql
sed -i 's/\\n/\n/g' mysql_data.sql

# Supabaseにインポート
psql $SUPABASE_DATABASE_URL < postgres_schema.sql
psql $SUPABASE_DATABASE_URL < mysql_data.sql
```

### 2.2 バックエンドコード修正

#### データベース接続設定
```typescript
// backend/src/database/connection-postgres.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export default pool;
```

#### SQL文の修正
```typescript
// MySQL → PostgreSQL変換例

// 修正前（MySQL）
const query = `
  SELECT *, DATE_FORMAT(date, '%Y-%m') as month
  FROM expenses 
  WHERE user_id = ? 
  LIMIT ? OFFSET ?
`;

// 修正後（PostgreSQL）
const query = `
  SELECT *, TO_CHAR(date, 'YYYY-MM') as month
  FROM expenses 
  WHERE user_id = $1 
  LIMIT $2 OFFSET $3
`;
```

## Phase 3: デプロイ環境構築

### 3.1 Supabase セットアップ

#### アカウント作成・プロジェクト作成
1. [Supabase](https://supabase.com)にアクセス
2. GitHubアカウントでサインアップ
3. 新プロジェクト作成:
   - **Project name**: `splitmate-db`
   - **Database password**: 強力なパスワード設定
   - **Region**: Northeast Asia (Tokyo)

#### データベース設定
```sql
-- Supabase SQL Editorで実行
-- RLS (Row Level Security) の設定
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 基本的なポリシー設定
CREATE POLICY "Users can view own data" ON users FOR ALL 
USING (auth.uid()::text = google_id);

CREATE POLICY "Users can manage own expenses" ON expenses FOR ALL 
USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));
```

### 3.2 Render セットアップ

#### アカウント作成・サービス作成
1. [Render](https://render.com)にアクセス
2. GitHubアカウントでサインアップ  
3. 新Web Service作成:
   - **Repository**: splitmate (backend)
   - **Name**: `splitmate-backend`
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

#### 環境変数設定
```bash
# Render Dashboard > Environment Variables
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
NODE_ENV=production
PORT=10000
GOOGLE_CLIENT_ID=[Google OAuth Client ID]
GOOGLE_CLIENT_SECRET=[Google OAuth Client Secret]
JWT_SECRET=[強力なランダム文字列]
```

### 3.3 Netlify セットアップ

#### アカウント作成・サイト作成
1. [Netlify](https://netlify.com)にアクセス
2. GitHubアカウントでサインアップ
3. 新サイト作成:
   - **Repository**: splitmate (frontend)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

#### 環境変数設定
```bash
# Netlify Dashboard > Site settings > Environment variables
VITE_API_URL=https://splitmate-backend.onrender.com
VITE_GOOGLE_CLIENT_ID=[Google OAuth Client ID]
```

## Phase 4: 統合テスト・デプロイ

### 4.1 ローカル環境での動作確認

```bash
# PostgreSQL接続テスト
npm run test:db:connection

# APIエンドポイントテスト  
npm run test:api

# フロントエンド・バックエンド連携テスト
npm run test:e2e
```

### 4.2 ステージング環境デプロイ

```bash
# 段階的デプロイ
git checkout -b feature/postgres-migration
git push origin feature/postgres-migration

# Render & Netlifyで自動デプロイ確認
curl https://splitmate-backend.onrender.com/health
curl https://splitmate-frontend.netlify.app
```

### 4.3 本番データ移行

```bash
# 最終的なデータ移行
./scripts/migrate-data.sh

# データ整合性チェック
npm run verify:data-migration
```

## Phase 5: 運用開始・監視設定

### 5.1 ドメイン設定

```bash
# カスタムドメイン設定（Netlify）
- DNS設定: CNAME splitmate.yourdomain.com -> splitmate-frontend.netlify.app
- SSL証明書: 自動発行

# API URL更新
VITE_API_URL=https://api.splitmate.yourdomain.com
```

### 5.2 監視・アラート設定

#### Renderでの監視設定
- Health Check URL: `/health`
- Alert設定: レスポンス時間、エラー率
- ログ監視: エラーログの通知設定

#### Supabaseでの監視設定  
- Database Usage監視
- API Request監視
- Storage使用量監視

### 5.3 バックアップ設定

```sql
-- Supabaseでの定期バックアップ設定
-- 自動バックアップは標準で有効
-- 必要に応じて手動バックアップも設定
```

## 実装スケジュール

| フェーズ | 所要時間 | 担当者 | 完了予定 |
|----------|----------|--------|----------|
| Phase 1: 調査・準備 | 1-2日 | 開発者 | 即座に開始可能 |
| Phase 2: DB移行準備 | 2-3日 | 開発者 | Phase 1完了後 |
| Phase 3: 環境構築 | 1-2日 | 開発者 | Phase 2と並行 |
| Phase 4: テスト・デプロイ | 1-2日 | 開発者 | Phase 3完了後 |
| Phase 5: 運用開始 | 1日 | 開発者 | Phase 4完了後 |

**総期間**: 6-10日間

## リスク管理

### 高リスク項目
- [ ] **データ移行の失敗**: 事前に十分なテストを実施
- [ ] **PostgreSQL互換性問題**: 段階的な移行で早期発見
- [ ] **パフォーマンス劣化**: 移行前後の性能比較

### 対策
- 完全なロールバック計画の策定
- 段階的デプロイによるリスク軽減
- 十分なテスト期間の確保

## 次のステップ

1. **Phase 1を開始**: 現在の環境分析から着手
2. **移行スクリプト作成**: MySQL → PostgreSQL変換
3. **テスト環境構築**: 安全な移行のための検証環境
4. **段階的デプロイ**: リスクを最小化した実装

このプランに従って実装を進めることで、安全かつ効率的にパターン2環境を構築できます。 
