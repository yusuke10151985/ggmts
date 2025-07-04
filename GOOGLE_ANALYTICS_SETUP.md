# Google Analytics API設定ガイド

このガイドでは、実際のGoogle Analytics データを取得するための設定方法を説明します。

## 1. Google Cloud Console設定

### プロジェクト作成/選択
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択または新規作成

### Analytics Reporting API有効化
1. 「APIとサービス」→「ライブラリ」
2. 「Google Analytics Reporting API」を検索
3. 「有効にする」をクリック

### サービスアカウント作成
1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「サービスアカウント」
3. 設定例：
   - **名前**: `analytics-reader`
   - **説明**: `GGMTS Analytics data access`
   - **ロール**: 不要（後でGoogle Analyticsで設定）

### サービスアカウントキー作成
1. 作成したサービスアカウントをクリック
2. 「キー」タブ→「キーを追加」→「新しいキーを作成」
3. 形式：**JSON**を選択
4. ダウンロードしたJSONファイルを保存

## 2. Google Analytics設定

### サービスアカウントにアクセス権付与
1. [Google Analytics](https://analytics.google.com/)にアクセス
2. 「管理」→「アカウントのアクセス管理」
3. 「+」→「ユーザーを追加」
4. 設定：
   - **メールアドレス**: サービスアカウントのメールアドレス（`***@***.iam.gserviceaccount.com`）
   - **権限**: 「閲覧者」

### View ID取得
1. 「管理」→「ビューの設定」
2. 「ビューID」をコピー（例：`123456789`）

## 3. 環境変数設定

### ローカル開発環境（.env.local）
```env
# Google Analytics設定
GA_VIEW_ID=123456789

# サービスアカウント認証情報（JSON文字列）
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"analytics-reader@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

### 本番環境（Vercel等）
環境変数として以下を設定：

1. **GA_VIEW_ID**: `123456789`
2. **GOOGLE_SERVICE_ACCOUNT_KEY**: JSONファイルの内容を文字列として設定

## 4. 設定確認

### 正常動作の確認方法
1. 管理者権限でログイン
2. 管理者ダッシュボードの「Google Analytics統計」セクションを確認
3. 実際のデータが表示される（模擬データではない）

### トラブルシューティング
- コンソールでエラーログを確認
- サービスアカウントのメールアドレスが正しくGoogle Analyticsに追加されているか確認
- View IDが正しいか確認
- JSON認証情報に改行文字が含まれている場合は適切にエスケープ

## 5. 利用可能な指標

現在の実装で取得できるデータ：
- ✅ 日次ユーザー数
- ✅ ページビュー数
- ✅ 過去7日間の日別統計
- ⚠️ リアルタイムユーザー（別APIが必要）
- ⚠️ 詳細なトラフィック源（追加クエリが必要）
- ⚠️ 人気ページ詳細（追加クエリが必要）

## 注意事項

1. **データ制限**: Google Analytics APIにはクオータ制限があります
2. **リアルタイムデータ**: Real Time Reporting APIは別途設定が必要です
3. **詳細データ**: より詳細な統計には追加のAPIクエリが必要です