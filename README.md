# 電動車生態每日觀察系統

自動化追蹤電動車、管委會、EMS、充電樁、電價等議題的每日資訊搜集系統。

## 功能特色

✅ **每天早上 6:00 自動執行** - 透過 GitHub Actions 定時觸發  
✅ **四大面向分析** - 政策法規、技術發展、商業模式、使用者體驗  
✅ **延伸問題生成** - 每個議題自動產生 3-5 個深度討論題目  
✅ **Email 通知** - 整理好的報告自動發送到信箱  
✅ **歷史記錄** - 所有搜集結果自動儲存為 JSON 檔案

## 部署步驟

### 1. 建立 GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的帳號/ev-daily-digest.git
git push -u origin main
```

### 2. 設定 GitHub Secrets

到 Repository 的 Settings > Secrets and variables > Actions，新增以下 secrets:

- `ANTHROPIC_API_KEY`: 你的 Anthropic API Key
  - 前往 https://console.anthropic.com/settings/keys 建立
  
- `RECIPIENT_EMAIL`: 接收報告的 Email 地址
  - 例如: your-email@gmail.com

- `SENDGRID_API_KEY` (選用): SendGrid API Key
  - 前往 https://sendgrid.com 註冊並取得 API Key
  - 如果不設定,系統只會儲存檔案不會發送 Email

### 3. 啟用 GitHub Actions

1. 到 Repository 的 Actions 頁面
2. 如果看到提示,點擊「I understand my workflows, go ahead and enable them」
3. 確認 `Daily EV Digest` workflow 已啟用

### 4. 測試執行

**手動觸發測試:**
1. 到 Actions > Daily EV Digest
2. 點擊「Run workflow」
3. 選擇 branch (通常是 main)
4. 點擊「Run workflow」

**查看結果:**
- 到 Actions 頁面查看執行日誌
- 查看 `digests/` 資料夾內的 JSON 檔案
- 檢查 Email 是否收到報告

## 檔案結構

```
ev-daily-digest/
├── .github/
│   └── workflows/
│       └── daily-digest.yml    # GitHub Actions 配置
├── digests/                     # 每日搜集結果 (自動生成)
│   ├── 2026-04-27.json
│   ├── 2026-04-28.json
│   └── ...
├── ev-daily-digest.html        # 前端展示介面
├── fetch-digest.js             # 執行腳本
├── package.json
└── README.md
```

## 使用前端介面

### 方式一: 本地開啟
直接用瀏覽器開啟 `ev-daily-digest.html`

### 方式二: 部署到 Vercel/Netlify
1. 將整個專案推送到 GitHub
2. 連結到 Vercel 或 Netlify
3. 部署後即可從任何裝置訪問

## 自訂設定

### 修改執行時間
編輯 `.github/workflows/daily-digest.yml`:

```yaml
schedule:
  - cron: '0 22 * * *'  # UTC 22:00 = 台灣 06:00
```

### 調整搜尋關鍵字
編輯 `fetch-digest.js` 中的 system prompt 部分

### 更改輸出格式
修改 `generateEmailHTML()` 函數

## 疑難排解

**Q: GitHub Actions 沒有執行?**
- 確認 workflow 檔案路徑正確: `.github/workflows/daily-digest.yml`
- 檢查 Actions 是否已啟用
- 確認 cron 時間設定正確

**Q: 沒有收到 Email?**
- 確認 SENDGRID_API_KEY 已設定
- 確認 SendGrid sender email 已驗證
- 查看 Actions 日誌中的錯誤訊息

**Q: API 呼叫失敗?**
- 確認 ANTHROPIC_API_KEY 正確
- 檢查 API 配額是否足夠
- 查看 Actions 日誌詳細錯誤

## 成本估算

- **GitHub Actions**: 免費 (公開 repo 無限制)
- **Anthropic API**: 約 $0.015 per request (使用 Sonnet 4)
- **SendGrid**: 免費方案每月 100 封
- **每月成本**: < $1 USD

## 授權

MIT License
