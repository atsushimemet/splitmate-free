# デプロイ環境セットアップガイド

このガイドでは、推奨されたRailway + TiDB Serverlessの組み合わせでSplitMateをデプロイする手順を説明します。

## 前提条件

- GitHubアカウント
- Node.js v22.17.0がインストール済み
- 現在のプロジェクトがGitで管理されている

## 1. TiDB Serverlessの設定

### 1.1 アカウント作成

1. [TiDB Cloud](https://tidbcloud.com/)にアクセス
2. 「Start for Free」をクリック
3. GitHubアカウントでサインアップ

### 1.2 Serverlessクラスター作成

1. ダッシュボードで「Create Cluster」をクリック
2. 「Serverless」を選択
3. 以下の設定を入力：
   - **Cluster Name**: `splitmate-db`
   - **Cloud Provider**: AWS
   - **Region**: Asia Pacific (Tokyo) ap-northeast-1
4. 「Create」をクリック

### 1.3 接続情報の取得

1. 作成されたクラスターをクリック
2. 「Connect」タブを選択
3. 「MySQL CLI」を選択して接続情報をコピー

```bash
# 接続例
mysql -u 'xxxxxx.root' -h 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com' -P 4000 -D 'test' --ssl-mode=REQUIRED --ssl-ca=/path/to/ca-cert.pem -p
```

### 1.4 データベース初期化

```sql
-- 新しいデータベースを作成
CREATE DATABASE splitmate;
USE splitmate;

-- 既存のスキーマファイルを実行
SOURCE /path/to/backend/src/database/schema-mysql.sql;
```

## 2. Railwayの設定

### 2.1 アカウント作成

1. [Railway](https://railway.app/)にアクセス
2. 「Start a New Project」をクリック
3. GitHubアカウントでサインアップ

### 2.2 プロジェクト作成

1. 「Deploy from GitHub repo」を選択
2. SplitMateリポジトリを選択
3. プロジェクト名を「splitmate」に設定

### 2.3 バックエンドサービスの設定

1. Railwayダッシュボードで「+ New」をクリック
2. 「GitHub Repo」を選択
3. バックエンドフォルダを指定：
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build:mysql`
   - **Start Command**: `npm run start:mysql`

### 2.4 環境変数の設定

バックエンドサービスの設定で以下の環境変数を追加：

```bash
DB_HOST=gateway01.ap-northeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=xxxxxx.root
DB_PASSWORD=your_password
DB_NAME=splitmate
NODE_ENV=production
PORT=3001

# Google OAuth設定
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_session_secret

# CORS設定
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### 2.5 カスタムドメインの設定

1. バックエンドサービスの「Settings」タブ
2. 「Domains」セクションで「Generate Domain」
3. 生成されたドメインをコピー（例: `splitmate-backend-production.up.railway.app`）

## 3. Vercelでフロントエンドをデプロイ

### 3.1 アカウント作成

1. [Vercel](https://vercel.com/)にアクセス
2. GitHubアカウントでサインアップ

### 3.2 プロジェクトのデプロイ

1. 「New Project」をクリック
2. SplitMateリポジトリを選択
3. 以下の設定を入力：
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.3 環境変数の設定

```bash
VITE_API_URL=https://splitmate-backend-production.up.railway.app
VITE_BACKEND_URL=https://splitmate-backend-production.up.railway.app
```

## 4. Google OAuthの設定

### 4.1 Google Cloud Console設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成または既存プロジェクトを選択
3. 「APIs & Services」→「Credentials」
4. 「Create Credentials」→「OAuth 2.0 Client IDs」

### 4.2 認証情報の設定

```bash
Application type: Web application
Name: SplitMate

Authorized JavaScript origins:
- https://your-frontend-domain.vercel.app

Authorized redirect URIs:
- https://splitmate-backend-production.up.railway.app/auth/google/callback
```

### 4.3 環境変数の更新

取得したClient IDとClient SecretをRailwayの環境変数に追加：

```bash
GOOGLE_CLIENT_ID=your_actual_client_id
GOOGLE_CLIENT_SECRET=your_actual_client_secret
```

## 5. デプロイ確認

### 5.1 バックエンドの確認

```bash
# ヘルスチェック
curl https://splitmate-backend-production.up.railway.app/api/health

# 期待される応答
{"status":"ok","timestamp":"2025-01-26T10:00:00.000Z"}
```

### 5.2 フロントエンドの確認

1. Vercelで生成されたURLにアクセス
2. ログイン機能をテスト
3. 費用登録機能をテスト

## 6. 本番データの移行

### 6.1 データエクスポート

```bash
# 現在のMySQLからデータをエクスポート
mysqldump -u root -p splitmate > splitmate_backup.sql
```

### 6.2 TiDBへのインポート

```bash
# TiDBにデータをインポート
mysql -u 'xxxxxx.root' -h 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com' -P 4000 -D 'splitmate' --ssl-mode=REQUIRED -p < splitmate_backup.sql
```

## 7. 監視・運用

### 7.1 Railwayの監視

- ダッシュボードでCPU/メモリ使用量を確認
- ログを定期的にチェック
- デプロイ履歴の確認

### 7.2 TiDBの監視

- TiDB Cloudダッシュボードで使用量を確認
- クエリパフォーマンスの監視
- ストレージ使用量の追跡

## 8. コスト管理

### 8.1 使用量の監視

- Railway: $5の無料クレジット消費状況
- TiDB: 25GBストレージと250Mリクエストの使用状況
- Vercel: 無料プランの制限確認

### 8.2 アラート設定

```bash
# Railway spending alerts
# TiDB usage alerts  
# Vercel bandwidth alerts
```

## トラブルシューティング

### よくある問題

1. **CORS エラー**
   ```bash
   # バックエンドのCORS設定を確認
   FRONTEND_URL=https://your-actual-frontend-domain.vercel.app
   ```

2. **データベース接続エラー**
   ```bash
   # TiDBの接続情報を再確認
   # SSL証明書の設定確認
   ```

3. **認証エラー**
   ```bash
   # Google OAuth設定の確認
   # リダイレクトURIの確認
   ```

## 参考資料

- [Railway Documentation](https://docs.railway.app/)
- [TiDB Serverless Documentation](https://docs.pingcap.com/tidbcloud/)
- [Vercel Documentation](https://vercel.com/docs)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2) 
