# Google認証テストスイート

## 📋 概要

このテストスイートは、SplitMateアプリケーションのGoogle認証機能が正しく動作することを保証します。Docker環境で実行され、認証フローの全ステップを検証します。

## 🧪 テスト構成

### テストファイル

| ファイル | 説明 | テスト対象 |
|:---|:---|:---|
| `auth/google-auth-simple.test.ts` | 基本的なGoogle認証テスト | 環境変数、URL構築、認証フロー |
| `auth/database-integration.test.ts` | データベース統合テスト | ユーザー作成、セッション管理 |
| `helpers/test-server.ts` | テスト用サーバーヘルパー | Express アプリケーション設定 |

### Docker環境

- **postgres-test**: テスト用PostgreSQLデータベース
- **backend-test**: テスト実行環境

## 🚀 テスト実行方法

### 1. Docker環境でのテスト実行

```bash
# プロジェクトルートから実行
./scripts/test-docker.sh
```

### 2. ローカル環境でのテスト実行

```bash
# バックエンドディレクトリで実行
cd backend
npm test
```

## ✅ テスト項目

### 環境設定の検証

- [x] 必須環境変数の存在確認
- [x] Google Client IDの形式検証
- [x] コールバックURLの形式検証
- [x] セッションシークレットの安全性確認

### 認証フローの検証

- [x] Google OAuth開始エンドポイント
- [x] 認証状態確認エンドポイント
- [x] ログアウト機能
- [x] セッション管理
- [x] CORS設定

### データベース統合

- [x] ユーザーテーブルスキーマ検証
- [x] ユーザー作成ロジック
- [x] ロール割り当て機能
- [x] セッションストレージ

### エラーハンドリング

- [x] OAuth認証エラー
- [x] ネットワークエラー
- [x] 不完全なプロファイルデータ
- [x] セッションエラー

## 📊 テスト結果の確認

### 成功時の出力例

```
✅ Google Authentication Tests PASSED

Test Suites: 2 passed, 2 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        5.123 s
```

### エラー時の対処法

1. **環境変数エラー**
   ```
   Missing required environment variables: GOOGLE_CLIENT_ID
   ```
   → `docker-compose.test.yml` の環境変数設定を確認

2. **データベース接続エラー**
   ```
   Database connection failed in test environment
   ```
   → PostgreSQLコンテナの起動状態を確認

3. **OAuth設定エラー**
   ```
   Invalid Google Client ID format
   ```
   → Google Cloud Consoleの認証情報を確認

## 🔧 トラブルシューティング

### Docker関連

```bash
# コンテナの状態確認
docker-compose -f docker-compose.test.yml ps

# ログの確認
docker-compose -f docker-compose.test.yml logs

# 強制的なクリーンアップ
docker-compose -f docker-compose.test.yml down --volumes --remove-orphans
```

### ローカル環境

```bash
# 依存関係の再インストール
npm ci

# Jest キャッシュのクリア
npm test -- --clearCache

# 特定のテストファイルの実行
npm test -- auth/google-auth-simple.test.ts
```

## 🛡️ セキュリティ考慮事項

- テスト用の認証情報は本番環境と分離
- セッションシークレットは安全な値を使用
- テスト用エンドポイントは `NODE_ENV=test` でのみ有効

## 📝 テスト拡張方法

### 新しいテストケースの追加

1. 適切なテストファイルを選択または新規作成
2. テストケースを追加
3. 必要に応じて `test-server.ts` のヘルパー関数を拡張

### 例: 新しい認証テストの追加

```typescript
describe('New Authentication Feature', () => {
  test('should handle new OAuth scenario', async () => {
    // テスト実装
  });
});
```

## 🔄 継続的インテグレーション

このテストスイートは以下の環境で自動実行されます：

- プルリクエスト作成時
- メインブランチへのマージ時
- デプロイ前の検証

---

**重要**: テストが失敗した場合は、Google認証機能に問題がある可能性があります。
本番環境への反映前に必ずすべてのテストが通ることを確認してください。 
