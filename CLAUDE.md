# CLAUDE.md - Claude Code Instructions

## プロジェクト概要
GGMTS (Google Gemini Multi-Translator Service) - AI翻訳・要約サービス with MOM Manager

## 自動デプロイルール
**重要**: デプロイが必要なコード修正完了後は、常にVercel CLIで自動デプロイを実行すること

### デプロイコマンド
```bash
npx vercel --prod
```

### デプロイが必要なケース
- フロントエンド/UIの変更
- APIルートの追加・変更
- 環境変数の参照変更
- データベーススキーマの変更
- 新機能の追加
- バグ修正

### デプロイ不要なケース
- README.mdやドキュメントのみの変更
- コメントのみの変更
- 開発用ツールの設定変更

## テスト実行ルール
### リント・型チェック
コード変更後は以下のコマンドを実行：
```bash
npm run lint
npm run typecheck
```

エラーが出た場合は必ず修正してからコミットすること。

## MOM Manager 特有のルール

### アクセス権限
- Admin: 全てのMOMにアクセス可能
- Special: 自分が作成したMOMのみアクセス可能（共有MOMは全員アクセス可能）
- その他: MOM Managerへのアクセス不可

### Google Sheets データ構造
- Sheet1: MOMリスト（A:MOM ID, B:Revision, C:Title, D:Date, E:Status, F:Timestamp, G:CreatedBy, H:Visibility）
- Sheet2: MOM詳細データ（チャンク対応）
- Attachments: 添付ファイル
- Tasks: タスクリスト

### Windows互換性
- console.logの過度な使用を避ける（ログループが原因でクラッシュする可能性）
- flex-1クラスはspan要素で使用しない（divを使用）
- クライアントサイドロガーは無効化済み

## Git コミットメッセージ規則
- feat: 新機能
- fix: バグ修正
- docs: ドキュメントのみの変更
- style: コードの意味に影響しない変更
- refactor: バグ修正でも機能追加でもないコード変更
- test: テストの追加・修正
- chore: ビルドプロセスやツールの変更

## 注意事項
1. 環境変数を変更する場合は、必ずVercelの環境変数も更新する
2. Google APIキーやサービスアカウントの認証情報は絶対にコミットしない
3. MOMの削除は論理削除（DELETEDフラグ）を使用
4. チャンクデータの処理時は必ず全チャンクの存在を確認

## よく使うコマンド
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# Prismaマイグレーション
npx prisma migrate dev

# Vercelデプロイ
npx vercel --prod

# キャッシュクリア（MOM）
# ブラウザでClear Cacheボタンをクリック
```