# Google Analytics 4 (GA4) セットアップガイド

このガイドでは、GGMTS管理画面でGoogle Analyticsの実データを表示するための設定方法を説明します。

## 前提条件

1. Google Analytics 4プロパティが作成済みであること
2. Googleアカウントへの管理者アクセス権限があること
3. Google Cloud Projectへのアクセス権限があること

## セットアップ手順

### 1. Google Cloud Projectの設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択または新規作成
3. 「APIとサービス」→「ライブラリ」に移動
4. 「Google Analytics Data API」を検索して有効化

### 2. サービスアカウントの作成

1. 「APIとサービス」→「認証情報」に移動
2. 「認証情報を作成」→「サービスアカウント」を選択
3. サービスアカウント名を入力（例：`ggmts-analytics`）
4. 「作成して続行」をクリック
5. ロールは指定不要で「続行」
6. 「完了」をクリック

### 3. サービスアカウントキーの作成

1. 作成したサービスアカウントをクリック
2. 「キー」タブに移動
3. 「鍵を追加」→「新しい鍵を作成」
4. JSON形式を選択して「作成」
5. ダウンロードされたJSONファイルを保管

### 4. GA4プロパティへのアクセス権限付与

1. [Google Analytics](https://analytics.google.com/)にアクセス
2. 対象のプロパティを選択
3. 管理（歯車アイコン）→「プロパティのアクセス管理」
4. 「＋」→「ユーザーを追加」
5. サービスアカウントのメールアドレスを入力（JSONファイル内の`client_email`）
6. 「閲覧者」権限を付与
7. 「追加」をクリック

### 5. 環境変数の設定

`.env.local`ファイルに以下を追加：

```bash
# Google Analytics Data API (GA4)
GA4_PROPERTY_ID=123456789  # GA4プロパティID（数字のみ）
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'  # JSONファイルの内容全体
```

#### GA4プロパティIDの確認方法：
1. Google Analyticsで対象プロパティを選択
2. 管理→プロパティ設定
3. 「プロパティID」をコピー（数字のみ）

#### サービスアカウントキーの設定方法：
1. ダウンロードしたJSONファイルを開く
2. 内容全体をコピー
3. シングルクォートで囲んで環境変数に設定

### 6. Vercelでの環境変数設定（本番環境）

1. Vercelダッシュボードにアクセス
2. プロジェクトを選択
3. Settings → Environment Variables
4. 以下の変数を追加：
   - `GA4_PROPERTY_ID`
   - `GOOGLE_SERVICE_ACCOUNT_KEY`

## 動作確認

1. 開発環境で`npm run dev`を実行
2. 管理画面（`/admin/dashboard`）にアクセス
3. 「Google Analytics統計」セクションにデータが表示されることを確認

## トラブルシューティング

### エラー: "Analytics data not available"
- 環境変数が正しく設定されているか確認
- サービスアカウントのメールアドレスがGA4プロパティに追加されているか確認
- Google Analytics Data APIが有効になっているか確認

### エラー: "Invalid credentials"
- `GOOGLE_SERVICE_ACCOUNT_KEY`のJSON形式が正しいか確認
- 改行文字（`\n`）が正しくエスケープされているか確認

### データが0または少ない
- GA4プロパティに実際のトラフィックがあるか確認
- データ収集が開始されてから24時間以上経過しているか確認
- GA4のリアルタイムレポートでデータが表示されているか確認

## セキュリティに関する注意事項

- サービスアカウントキーは機密情報です。Gitにコミットしないでください
- `.env.local`ファイルは`.gitignore`に含まれていることを確認
- 本番環境では環境変数を安全に管理してください

## 参考リンク

- [Google Analytics Data API ドキュメント](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [GA4 プロパティの作成](https://support.google.com/analytics/answer/9304153)
- [サービスアカウントについて](https://cloud.google.com/iam/docs/service-accounts)