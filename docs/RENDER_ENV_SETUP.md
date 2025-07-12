# Render 環境変数設定ガイド

## 📋 設定手順

### 1. テンプレートファイルの準備
`backend/env.render.template` をコピーして、ローカルで `.env` ファイルとして保存してください。

### 2. 変更が必要な項目（6箇所）

#### 🔹 **DATABASE_URL**（Supabaseから取得）
```bash
# 変更前
DATABASE_URL=postgresql://postgres:【YOUR_SUPABASE_PASSWORD】@【YOUR_PROJECT_REF】.supabase.co:5432/postgres?sslmode=require

# 変更後（例）
DATABASE_URL=postgresql://postgres:mySecurePassword123@abcdefghijklmnop.supabase.co:5432/postgres?sslmode=require
```

**取得方法：**
1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. Settings → Database
4. "Connection string" をコピー
5. `[YOUR-PASSWORD]` を実際のパスワードに置き換え

---

#### 🔹 **GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET**（Google Cloudから取得）
```bash
# 変更前
GOOGLE_CLIENT_ID=【YOUR_GOOGLE_CLIENT_ID】.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=【YOUR_GOOGLE_CLIENT_SECRET】

# 変更後（例）
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
```

**取得方法：**
1. [Google Cloud Console](https://console.cloud.google.com/) にログイン
2. APIs & Services → Credentials
3. OAuth 2.0 Client IDsから対象のクライアントを選択
4. Client IDとClient secretをコピー

**重要：**　認証リダイレクトURIに以下を追加：
- `https://【YOUR_RENDER_SERVICE_NAME】.onrender.com/auth/google/callback`

---

#### 🔹 **FRONTEND_URL**（Netlifyから取得）
```bash
# 変更前
FRONTEND_URL=https://【YOUR_NETLIFY_SITE_NAME】.netlify.app

# 変更後（例）
FRONTEND_URL=https://splitmate-app-12345.netlify.app
```

**取得方法：**
1. [Netlify Dashboard](https://app.netlify.com/) にログイン
2. サイトを選択
3. Site settings → General → Site details
4. "Site URL" をコピー

---

#### 🔹 **BACKEND_URL**（Renderサービス作成後に取得）
```bash
# 変更前
BACKEND_URL=https://【YOUR_RENDER_SERVICE_NAME】.onrender.com

# 変更後（例）
BACKEND_URL=https://splitmate-backend.onrender.com
```

**取得方法：**
1. Renderでサービス作成時に設定したサービス名を使用
2. または、サービス作成後にRender Dashboardで確認

---

#### 🔹 **SESSION_SECRET**（ランダム文字列を生成）
```bash
# 変更前
SESSION_SECRET=【GENERATE_RANDOM_STRING_HERE】

# 変更後（例）
SESSION_SECRET=a7b9c2d4e6f8g1h3i5j7k9l2m4n6p8q0r2s4t6u8v1w3x5y7z9
```

**生成方法：**

**方法1: オンラインジェネレーター**
- https://www.random.org/strings/
- Length: 32文字以上
- Character set: Alphanumeric

**方法2: Node.js（ローカル環境）**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**方法3: Macのターミナル**
```bash
openssl rand -hex 32
```

---

## 🔄 Renderでのアップロード手順

### 方法1: ファイルアップロード
1. Render Dashboard → あなたのサービス
2. Environment タブ
3. "Add from .env" ボタンをクリック
4. 編集した `.env` ファイルを選択してアップロード

### 方法2: テキスト貼り付け
1. Render Dashboard → あなたのサービス
2. Environment タブ
3. "Add from .env" ボタンをクリック
4. 編集した `.env` ファイルの内容をコピー&ペースト

## ✅ 設定完了後の確認

環境変数設定後、以下のエンドポイントで動作確認：

1. **ヘルスチェック**: `https://your-backend.onrender.com/health`
2. **認証状態確認**: `https://your-backend.onrender.com/auth/status`

## ⚠️ セキュリティ注意事項

- `.env` ファイルは **絶対にGitにコミットしない**
- 本番環境の認証情報は安全に管理
- SESSION_SECRETは十分に長く複雑な文字列を使用
- データベースパスワードは定期的に変更を検討 
