# MOM Manager Vercel環境変数設定ガイド

## 必要な環境変数

Vercelダッシュボードで以下の環境変数を設定してください：

### 1. MOM Manager固有の環境変数

```bash
# Google Sheets設定（必須）
SPREADSHEET_ID=                    # mom-manager-nextで使用しているGoogle Sheet ID
GOOGLE_SHEET_ID=                    # 同上（互換性のため）
NEXT_PUBLIC_GOOGLE_SHEET_ID=        # 同上（UIで表示用）

# Google Service Account（必須）
GOOGLE_SERVICE_ACCOUNT_EMAIL=       # サービスアカウントのメールアドレス
GOOGLE_PRIVATE_KEY=                 # サービスアカウントの秘密鍵（改行は\nで置換）

# Google Drive設定（必須）
GOOGLE_DRIVE_FOLDER_ID=             # ファイルアップロード用のDriveフォルダID
GOOGLE_DOCS_FOLDER_ID=              # Google Docs保存用のフォルダID

# Vercel Blob Storage（オプション）
BLOB_READ_WRITE_TOKEN=              # Vercel Blobトークン（画像保存用）
```

### 2. 既存のggmts環境変数（維持が必要）

```bash
# NextAuth.js
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=                    # 既存の値を維持

# Google OAuth
GOOGLE_CLIENT_ID=                   # 既存の値を維持
GOOGLE_CLIENT_SECRET=                # 既存の値を維持

# Database
DATABASE_URL=                        # 既存の値を維持

# AI API Keys
OPENAI_API_KEY=                      # 既存の値を維持
GEMINI_API_KEY=                      # 既存の値を維持（MOMでも使用）

# その他の既存設定...
```

## 設定手順

### Step 1: Google Service Accountの作成と設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新規プロジェクトまたは既存プロジェクトを選択
3. 「APIとサービス」→「認証情報」→「サービスアカウントを作成」
4. 以下のAPIを有効化：
   - Google Sheets API
   - Google Drive API
   - Google Docs API

5. サービスアカウントのJSON鍵を生成してダウンロード
6. JSONファイルから以下を取得：
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`（改行を\nに置換）

### Step 2: Google Sheets/Driveの権限設定

1. **Google Sheets**:
   - mom-manager-nextで使用しているスプレッドシートを開く
   - 「共有」→ サービスアカウントのメールアドレスを「編集者」として追加
   - URLから Sheet ID を取得（/d/と/editの間の文字列）

2. **Google Drive フォルダ**:
   - アップロード用のDriveフォルダを作成
   - サービスアカウントのメールアドレスを「編集者」として共有
   - URLからFolder IDを取得

### Step 3: Vercelでの環境変数設定

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. プロジェクトを選択 → Settings → Environment Variables
3. 上記の環境変数を追加（Production, Preview, Development全てにチェック）
4. 特に`GOOGLE_PRIVATE_KEY`は以下の形式で設定：
   ```
   -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----
   ```
   （改行を\nに置換、前後のダブルクォートは不要）

### Step 4: 既存データの移行（必要な場合）

mom-manager-nextで既に運用中の場合：
1. 同じGoogle Sheets IDを使用
2. 同じGoogle DriveフォルダIDを使用
3. 同じサービスアカウントを使用

これにより、既存のデータとシームレスに連携できます。

## 確認事項

- [ ] Google Sheets APIが有効化されている
- [ ] Google Drive APIが有効化されている  
- [ ] サービスアカウントがスプレッドシートにアクセス権を持っている
- [ ] サービスアカウントがDriveフォルダにアクセス権を持っている
- [ ] Vercelに全ての環境変数が設定されている
- [ ] GEMINI_API_KEYが有効である（翻訳機能用）

## トラブルシューティング

### エラー: "Google Sheets not configured"
→ `SPREADSHEET_ID`と`GOOGLE_SERVICE_ACCOUNT_EMAIL`、`GOOGLE_PRIVATE_KEY`を確認

### エラー: "Permission denied"
→ サービスアカウントのメールアドレスがSpreadsheet/Driveで共有されているか確認

### エラー: "Invalid private key"
→ `GOOGLE_PRIVATE_KEY`の改行が正しく\nに置換されているか確認

## 注意事項

- **セキュリティ**: 環境変数は絶対に公開リポジトリにコミットしない
- **Admin権限**: MOM Managerは`role: admin`のユーザーのみアクセス可能
- **データ互換性**: mom-manager-nextの既存Spreadsheetをそのまま使用可能