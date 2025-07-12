# SplitMate デプロイガイド

**構成**: Netlify (Frontend) + Render (Backend) + Supabase (Database)

## 前提条件

- GitHubリポジトリにコードがpush済み
- Google Cloud Platform アカウント（OAuth用）

## 1. Supabase データベースセットアップ

### 1.1 アカウント作成とプロジェクト作成

1. [Supabase](https://supabase.com/) にアクセス
2. GitHubアカウントでサインアップ
3. 「New project」をクリック
4. 以下を設定：
   - **Name**: `splitmate-db`
   - **Database Password**: 強力なパスワードを設定
   - **Region**: Northeast Asia (Tokyo)

### 1.2 データベーススキーマの設定

1. Supabaseダッシュボードで「SQL Editor」を開く
2. `backend/src/database/supabase-schema.sql` の内容をコピー
3. SQL Editorに貼り付けて実行

### 1.3 接続情報の取得

1. ページ上部のConnectを押下
2. Connection stringタブのTransaction poolerにある接続情報をコピー（後でRenderで使用）

## 2. Render バックエンドデプロイ

### 2.1 アカウント作成とサービス作成

1. [Render](https://render.com/) にアクセス
2. GitHubアカウントでサインアップ
3. 「New +」→「Web Service」をクリック
4. GitHubリポジトリを接続

### 2.2 サービス設定

- **Name**: `splitmate-backend`
- **Language**: `Node`
- **Branch**: `main`
- **Region**: `Singapole`
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build:supabase`
- **Start Command**: `npm run start:supabase`

### 2.3 環境変数の設定

Renderの「Environment」タブで以下を設定：

```bash
# データベース接続（Supabaseから取得）
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?sslmode=require

# または個別設定
DB_HOST=db.[PROJECT_REF].supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=[YOUR_PASSWORD]
DB_NAME=postgres

# サーバー設定
NODE_ENV=production
PORT=3001

# Google OAuth（後で設定）
GOOGLE_CLIENT_ID=[設定待ち]
GOOGLE_CLIENT_SECRET=[設定待ち]

# セッション設定
SESSION_SECRET=[ランダムな文字列]
SESSION_NAME=splitmate-session
SESSION_MAX_AGE=86400000

# CORS設定（Netlifyドメインを後で更新）
FRONTEND_URL=https://[YOUR_NETLIFY_DOMAIN].netlify.app
BACKEND_URL=https://[YOUR_RENDER_DOMAIN].onrender.com
```

### 2.4 デプロイ確認

1. Renderでデプロイが完了するのを待つ
2. 提供されたURLにアクセス
3. `/health` エンドポイントで動作確認

## 3. Netlify フロントエンドデプロイ

### 3.1 アカウント作成とサイト作成

1. [Netlify](https://netlify.com/) にアクセス
2. GitHubアカウントでサインアップ
3. 「New site from Git」をクリック
4. GitHubリポジトリを選択

### 3.2 ビルド設定

Netlifyの設定画面で：

- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `frontend/dist`

### 3.3 環境変数の設定

Netlifyの「Environment variables」で：

```bash
# バックエンドURL（Renderから取得）
VITE_BACKEND_URL=https://[YOUR_RENDER_DOMAIN].onrender.com

# Google OAuth Client ID（後で設定）
VITE_GOOGLE_CLIENT_ID=[設定待ち]
```

### 3.4 デプロイ確認

1. Netlifyでデプロイが完了するのを待つ
2. 提供されたURLにアクセス
3. 基本的な画面表示を確認

## 4. Google OAuth設定

### 4.1 Google Cloud Console設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. 「APIs & Services」→「Credentials」
4. 「Create Credentials」→「OAuth 2.0 Client IDs」

### 4.2 OAuth設定

```bash
Application type: Web application
Name: SplitMate Production

Authorized JavaScript origins:
- https://[YOUR_NETLIFY_DOMAIN].netlify.app

Authorized redirect URIs:
- https://[YOUR_RENDER_DOMAIN].onrender.com/auth/google/callback
```

### 4.3 認証情報の更新

1. **Render**の環境変数を更新：
   ```bash
   GOOGLE_CLIENT_ID=[取得したClient ID]
   GOOGLE_CLIENT_SECRET=[取得したClient Secret]
   ```

2. **Netlify**の環境変数を更新：
   ```bash
   VITE_GOOGLE_CLIENT_ID=[取得したClient ID]
   ```

## 5. 最終設定の更新

### 5.1 URL設定の確認と更新

1. **Renderの環境変数**でNetlifyドメインを更新：
   ```bash
   FRONTEND_URL=https://[実際のNetlifyドメイン].netlify.app
   ```

2. **両サービスを再デプロイ**

## 6. 動作確認

### 6.1 基本機能テスト

1. **フロントエンドアクセス**: NetlifyのURLにアクセス
2. **Google認証**: 「Sign in with Google」をクリック
3. **費用管理**: 費用の登録・表示が正常に動作することを確認

### 6.2 API動作確認

```bash
# ヘルスチェック
curl https://[YOUR_RENDER_DOMAIN].onrender.com/health

# 認証状態確認
curl https://[YOUR_RENDER_DOMAIN].onrender.com/auth/status
```

## トラブルシューティング

### よくある問題

1. **CORS エラー**: RenderでFRONTEND_URLが正しく設定されているか確認
2. **OAuth エラー**: Google Cloud ConsoleのRedirect URIが正確か確認
3. **データベース接続エラー**: SupabaseのDATABASE_URLが正しいか確認
4. **ビルドエラー**: package.jsonの依存関係を確認

### ログ確認方法

- **Render**: ダッシュボードの「Logs」タブ
- **Netlify**: ダッシュボードの「Deploys」→「Deploy log」
- **Supabase**: ダッシュボードの「Logs」セクション

## 費用について

- **Supabase**: 500MB storage + 2M edge requests (無料枠)
- **Render**: 750時間/月 (無料枠、スリープあり)
- **Netlify**: 100GB bandwidth + 300 build minutes (無料枠)

**総費用**: 無料枠内で利用可能

## 次のステップ

1. カスタムドメインの設定（オプション）
2. 監視・アラートの設定
3. バックアップ戦略の検討
4. パフォーマンス最適化 
