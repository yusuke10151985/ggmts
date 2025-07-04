# Vercel環境変数設定手順（Google Analytics）

## 1. Vercelダッシュボードにアクセス
https://vercel.com/dashboard

## 2. プロジェクト選択
- `ggmts` プロジェクトをクリック

## 3. 環境変数設定
1. 上部メニューの `Settings` をクリック
2. 左サイドバーの `Environment Variables` をクリック
3. 以下の情報を入力：

```
Key: NEXT_PUBLIC_GA_MEASUREMENT_ID
Value: G-BV3ZRJ84DP
Environment: ☑ Production ☑ Preview ☑ Development
```

4. `Save` ボタンをクリック

## 4. 再デプロイ
環境変数を追加したら、自動的に再デプロイが開始されます。
もし開始されない場合は：
- Deploymentsタブ → 最新のデプロイ → ⋮メニュー → Redeploy

## 5. 確認方法
デプロイ完了後（約2-3分）：
1. https://www.ggmts.com にアクセス
2. Chrome DevToolsを開く（F12）
3. Networkタブで `gtag` を検索
4. または Console で `window.dataLayer` を実行

## トラブルシューティング
もし動作しない場合：
- Vercelのビルドログを確認
- 環境変数名のスペルミスをチェック
- NEXT_PUBLIC_ プレフィックスが付いているか確認