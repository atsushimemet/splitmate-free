# PostgreSQL版 SplitMate セットアップガイド

## 🎯 概要

このガイドでは、PostgreSQL版のSplitMateをDockerコンテナ上でセットアップし、Google認証を確認する方法を説明します。

## 🔧 前提条件

- Docker & Docker Compose
- Node.js 22.x
- Google Cloud Platform アカウント

## 📋 セットアップ手順

### 1. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. **APIs & Services** > **Credentials** に移動
4. **Create Credentials** > **OAuth 2.0 Client IDs** をクリック
5. 以下の設定を行う：
   - **Application type**: Web application
   - **Name**: SplitMate PostgreSQL Dev
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (frontend)
     - `http://localhost:3001` (backend)
   - **Authorized redirect URIs**:
     - `http://localhost:3001/auth/google/callback`

6. Client IDとClient Secretを取得してメモする

### 2. 環境変数設定

`docker-compose.postgres.yml`のbackendサービスの環境変数を更新：

```yaml
environment:
  # ... 他の設定 ...
  # Google OAuth設定
  GOOGLE_CLIENT_ID: your-actual-google-client-id.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET: your-actual-google-client-secret
```

### 3. 依存関係のインストール

```bash
# PostgreSQL関連の依存関係をインストール
cd backend
npm install
```

### 4. PostgreSQL Docker環境の起動

```bash
# PostgreSQL版のDocker環境を起動
docker compose -f docker-compose.postgres.yml up -d

# ログを確認
docker compose -f docker-compose.postgres.yml logs -f
```

### 5. 動作確認

以下のURLにアクセスして動作を確認：

- **フロントエンド**: http://localhost:5173
- **バックエンド**: http://localhost:3001
- **ヘルスチェック**: http://localhost:3001/health
- **pgAdmin**: http://localhost:5050 (admin@splitmate.com / admin)

## 🔐 Google認証テスト

1. フロントエンドにアクセス: http://localhost:5173
2. 「Sign in with Google」ボタンをクリック
3. Googleログインページで認証
4. 認証成功後、アプリケーションに戻る
5. 認証状態を確認: http://localhost:3001/auth/status

## 🛠️ トラブルシューティング

### PostgreSQL接続エラー
```bash
# PostgreSQLコンテナが起動しているか確認
docker compose -f docker-compose.postgres.yml ps

# PostgreSQLログを確認
docker compose -f docker-compose.postgres.yml logs postgres
```

### Google認証エラー
```bash
# バックエンドログを確認
docker compose -f docker-compose.postgres.yml logs backend

# 環境変数を確認
docker compose -f docker-compose.postgres.yml exec backend env | grep GOOGLE
```

### セッション問題
```bash
# sessionテーブルが作成されているか確認
docker compose -f docker-compose.postgres.yml exec postgres psql -U splitmate_user -d splitmate -c "SELECT * FROM session LIMIT 5;"
```

## 📊 データベース管理

### pgAdmin接続設定
1. http://localhost:5050 にアクセス
2. admin@splitmate.com / admin でログイン
3. 新しいサーバーを追加：
   - **Name**: SplitMate PostgreSQL
   - **Host**: postgres
   - **Port**: 5432
   - **Database**: splitmate
   - **Username**: splitmate_user
   - **Password**: splitmate_password

### 直接PostgreSQL接続
```bash
# PostgreSQLコンテナに接続
docker compose -f docker-compose.postgres.yml exec postgres psql -U splitmate_user -d splitmate

# テーブル一覧を確認
\dt

# セッションテーブルを確認
SELECT * FROM session;
```

## 🧪 テストシナリオ

### 1. 基本認証テスト
- [ ] Google認証フローの開始
- [ ] 認証成功後のリダイレクト
- [ ] セッションの永続化
- [ ] ログアウト機能

### 2. API機能テスト
- [ ] 費用登録 (POST /api/expenses)
- [ ] 費用一覧取得 (GET /api/expenses)
- [ ] 配分比率更新 (PUT /api/allocation-ratio)
- [ ] 精算計算 (POST /api/settlements/calculate/:expenseId)

### 3. データベース整合性テスト
- [ ] PostgreSQLセッションストアの動作
- [ ] 費用データの永続化
- [ ] 精算データの自動計算

## 📝 開発用コマンド

```bash
# 環境を完全にリセット
docker compose -f docker-compose.postgres.yml down -v
docker compose -f docker-compose.postgres.yml up -d

# バックエンドのみ再起動
docker compose -f docker-compose.postgres.yml restart backend

# PostgreSQLのみ再起動
docker compose -f docker-compose.postgres.yml restart postgres

# 全ログを表示
docker compose -f docker-compose.postgres.yml logs -f

# 特定のサービスのログのみ表示
docker compose -f docker-compose.postgres.yml logs -f backend
```

## 🚀 次のステップ

1. **ローカル認証確認**: この環境でGoogle認証が正常に動作することを確認
2. **Supabase移行**: ローカル確認後、Supabase PostgreSQLに移行
3. **Render/Netlifyデプロイ**: 本番環境へのデプロイ設定
4. **統合テスト**: 全体的な動作確認 
