# Factory Dictionary Supabase Setup Guide

## 1. Supabaseプロジェクトのセットアップ

### Supabaseでプロジェクトを作成
1. [Supabase](https://supabase.com)にアクセス
2. 「factory-dictionary-supabase」プロジェクトを作成または選択

### 環境変数の取得
プロジェクトダッシュボードから以下を取得：
- **Settings** → **API** から：
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` キー → `SUPABASE_SERVICE_ROLE_KEY`

## 2. データベーススキーマの作成

Supabase SQL Editorで `/supabase-schema.sql` の内容を実行：

```sql
-- ファイル内容を全てコピー&ペースト
-- factory_terms テーブルとusage_examplesテーブルが作成されます
```

## 3. 環境変数の設定

### ローカル開発（.env.local）
```env
# Factory Dictionary Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Vercel環境変数
1. Vercelダッシュボードにアクセス
2. Project Settings → Environment Variables
3. 以下の変数を追加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 4. 動作確認

### デバッグエンドポイント
```
GET /api/factory-dictionary/debug
```

期待される応答：
```json
{
  "supabase": {
    "configured": true,
    "url": "Set",
    "anonKey": "Set",
    "serviceKey": "Set"
  },
  "tests": {
    "supabase": {
      "success": true,
      "count": 3  // サンプルデータの数
    }
  }
}
```

## 5. トラブルシューティング

### Supabaseが接続できない場合
1. 環境変数が正しく設定されているか確認
2. Supabaseプロジェクトがアクティブか確認
3. RLS（Row Level Security）ポリシーを確認

### データが表示されない場合
1. テーブルにデータが存在するか確認
2. ブラウザのコンソールでエラーを確認
3. `/api/factory-dictionary/debug` で接続状態を確認

### フォールバック動作
- Supabase接続に失敗した場合、自動的にPrisma DBにフォールバック
- モックデータが表示される場合もあります

## 6. Admin機能

Admin権限を持つユーザーのみ：
- 用語の追加・編集・削除
- 画像生成機能（DALL-E 3使用）

## 7. データ移行

既存のPrismaデータをSupabaseに移行する場合：
```sql
-- Prismaからエクスポートしたデータをインポート
INSERT INTO factory_terms (...) VALUES (...);
```