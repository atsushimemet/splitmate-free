# 作業ログ: カップルID システム実装 & 重複ユーザー修正

**コミットID**: `b216185`  
**ブランチ**: `feature/couple-id-system`  
**作業日**: 2025年7月18日  
**作業者**: AI Assistant

## 概要

この作業ログでは、以下の2つの主要な機能実装と問題修正について詳述します：

1. **カップルIDをURLから確認できる機能の実装**
2. **重複ユーザー問題の発見と修正**

## Part 1: カップルID URL確認機能の実装

### 要件
- カップルIDをURLから確認できるページの作成
- 認証されたユーザーと招待された配偶者のみがアクセス可能
- 招待リンクの生成とコピー機能

### 実装内容

#### 1.1 CoupleInfoPageコンポーネントの作成
**ファイル**: `frontend/src/components/CoupleInfoPage.tsx`

```typescript
// 主要な機能
- URLパラメータからカップルIDを取得
- アクセス権限の検証
- カップル情報とメンバー情報の表示
- 招待リンクの生成・コピー機能
```

**アクセス制御ロジック**:
```typescript
const checkUserAccess = (currentUser: any, targetCoupleId: string, users: User[]): boolean => {
  // ユーザーが対象カップルのメンバーかチェック
  if (currentUser.coupleId === targetCoupleId) {
    return true;
  }
  
  // 現在のユーザーがカップルのメンバーかどうかをチェック
  if (currentUser.registeredUserId) {
    const isRegisteredUser = users.some(u => u.id === currentUser.registeredUserId);
    return isRegisteredUser;
  }
  
  return false;
};
```

#### 1.2 ルーティングの追加
**ファイル**: `frontend/src/App.tsx`

```typescript
// 追加されたルート
<Route
  path="/couple/:coupleId"
  element={<CoupleInfoPage />}
/>
```

#### 1.3 ユーザーメニューの拡張
**ファイル**: `frontend/src/components/UserMenu.tsx`

```typescript
// カップル情報へのリンク追加
{user.coupleId && (
  <a
    href={`/couple/${user.coupleId}`}
    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
  >
    カップル情報
  </a>
)}
```

### 成果物
- **コミット**: `ee372f6` - "Add couple ID verification page with authentication"
- **変更**: 3 files changed, 264 insertions(+), 2 deletions(-)

---

## Part 2: 重複ユーザー問題の発見と修正

### 問題の発見

#### 2.1 問題の報告
ユーザーから以下の問題が報告されました：
- URL: `http://localhost:5173/couple/couple_1752823907616_mlasf124n`
- 症状: 同じカップル内に「夫」が2人表示される

#### 2.2 原因分析
**調査結果**:
```sql
-- 重複ユーザーの確認クエリ
SELECT couple_id, role, COUNT(*) as count, 
       array_agg(id ORDER BY created_at ASC) as user_ids,
       array_agg(name ORDER BY created_at ASC) as names
FROM users 
GROUP BY couple_id, role 
HAVING COUNT(*) > 1;
```

**発見された問題**:
1. データベーススキーマに `(couple_id, role)` の一意性制約がない
2. アプリケーションレベルでの重複チェックがない
3. 同じカップル内で同じ役割のユーザーが複数作成可能

### 修正実装

#### 2.3 UserServiceの修正
**ファイル**: `backend/src/services/userService-postgres.ts`

```typescript
async createUser(userData: CreateUserRequest): Promise<ApiResponse<User>> {
  try {
    const { name, role, coupleId } = userData;
    
    // 既存役割チェックを追加
    const existingUserQuery = `
      SELECT id, name, role
      FROM users
      WHERE couple_id = $1 AND role = $2
      LIMIT 1
    `;
    
    const existingResult = await this.pool.query(existingUserQuery, [coupleId, role]);
    
    if (existingResult.rows.length > 0) {
      const existingUser = existingResult.rows[0];
      return {
        success: false,
        error: `このカップルには既に${role === 'husband' ? '夫' : '妻'}のユーザー「${existingUser.name}」が登録されています`
      };
    }
    
    // ユーザー作成処理...
  } catch (error) {
    // 一意性制約違反のハンドリング
    if (error.code === '23505' && error.constraint === 'unique_couple_role') {
      return {
        success: false,
        error: `このカップルには既に${userData.role === 'husband' ? '夫' : '妻'}のユーザーが登録されています`
      };
    }
    // ...
  }
}
```

#### 2.4 データベースマイグレーションスクリプトの作成
**ファイル**: `backend/src/database/fix-duplicates.ts`

**主要機能**:
1. 重複ユーザーの検出と表示
2. 重複ユーザーの削除（最古のものを残す）
3. 一意性制約の追加
4. パフォーマンス向上のためのインデックス作成
5. 修正内容の検証

```typescript
// 重複削除クエリ
const deleteQuery = `
  WITH ranked_users AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY couple_id, role ORDER BY created_at ASC) as rn
    FROM users
  )
  DELETE FROM users 
  WHERE id IN (
    SELECT id 
    FROM ranked_users 
    WHERE rn > 1
  )
  RETURNING id, name, role
`;
```

#### 2.5 一意性制約とインデックスの追加
```sql
-- 一意性制約
ALTER TABLE users 
ADD CONSTRAINT unique_couple_role 
UNIQUE (couple_id, role);

-- パフォーマンス向上のためのインデックス
CREATE INDEX IF NOT EXISTS idx_users_couple_role 
ON users (couple_id, role);
```

### 修正の実行

#### 2.6 開発環境での修正実行
**実行環境**: Docker Compose PostgreSQL開発環境
**実行コマンド**: 
```bash
# Node.js バージョン設定
nvm use v22.17.0

# 依存関係インストール
cd backend && npm install

# Dockerコンテナ内でスクリプト実行
docker exec -it splitmate-backend-jwt-dev npx tsx backend/src/database/fix-duplicates.ts
```

**実行結果**:
```
🔍 Checking for duplicate users...
⚠️  Found 2 sets of duplicate users:
  1. Couple: couple_1752823907616_mlasf124n, Role: 夫, Count: 2
     Users: studymemot, studymemot
     IDs: husband_1752823911998_66za9p0lj, husband_1752823912006_fqut609ye
  2. Couple: couple_1752823928186_tuge2w8vj, Role: 夫, Count: 2
     Users: studymemot, studymemot
     IDs: husband_1752823931871_djdo6s3hh, husband_1752823931875_d4picqg5j

🔧 Removing duplicate users (keeping the oldest one for each couple/role)...
✅ Deleted 2 duplicate users:
  1. studymemot (夫) - ID: husband_1752823912006_fqut609ye
  2. studymemot (夫) - ID: husband_1752823931875_d4picqg5j

🔒 Adding unique constraint to prevent future duplicates...
✅ Unique constraint added successfully.

📊 Creating index for performance...
✅ Index created successfully.

🔍 Verifying the fix...
✅ All duplicate users have been successfully removed!

🎉 Migration completed successfully!
```

### 検証と確認

#### 2.7 修正の検証
**確認方法**: ブラウザでカップル情報ページにアクセス
**URL**: `http://localhost:5173/couple/couple_1752823907616_mlasf124n`
**結果**: メンバー一覧に「夫」が1人のみ表示されることを確認

---

## 技術的な学び

### セキュリティ考慮事項
1. **アクセス制御**: URLパラメータによる情報アクセスにおける適切な認証・認可の実装
2. **データ整合性**: データベースレベルとアプリケーションレベルでの二重チェック

### パフォーマンス最適化
1. **インデックス作成**: 頻繁にクエリされる `(couple_id, role)` の組み合わせにインデックス追加
2. **制約の活用**: データベース制約によるアプリケーションレベルでの処理負荷軽減

### エラーハンドリング
1. **ユーザーフレンドリーなエラーメッセージ**: 日本語での分かりやすいエラー表示
2. **グレースフルな失敗**: 制約違反時の適切なエラー処理

---

## ファイル変更一覧

### 新規作成ファイル
1. `frontend/src/components/CoupleInfoPage.tsx` - カップル情報表示ページ
2. `backend/src/database/fix-duplicates.ts` - 重複ユーザー修正スクリプト
3. `backend/src/database/fix-duplicate-users-migration.sql` - SQLマイグレーションファイル

### 変更ファイル
1. `frontend/src/App.tsx` - ルーティング追加
2. `frontend/src/components/UserMenu.tsx` - カップル情報リンク追加
3. `backend/src/services/userService-postgres.ts` - 重複チェック機能追加

---

## コミット履歴

### カップルID機能実装
- **コミット**: `187775f` - "Add LandingPage component for user authentication"
- **コミット**: `ee372f6` - "Add couple ID verification page with authentication"

### 重複ユーザー修正
- **コミット**: `b216185` - "Fix duplicate users issue and prevent future duplicates"

---

## 今後の改善点

1. **ユニットテストの追加**: 新しく実装した機能のテストカバレッジ向上
2. **エラーログの強化**: より詳細なエラートラッキングの実装
3. **ユーザビリティの向上**: カップル情報ページのUI/UX改善
4. **パフォーマンス監視**: 大量データでのクエリパフォーマンス測定

---

## 参考資料

- PostgreSQL制約ドキュメント: 一意性制約とインデックス
- React Router v6: 動的ルーティングの実装
- TypeScript: エラーハンドリングのベストプラクティス

---

**終了時刻**: 2025年7月18日  
**総作業時間**: 約2時間  
**状態**: 完了・テスト済み 
