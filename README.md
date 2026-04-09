# 模擬面試系統 - 前端獨立版

## 項目結構

```
根目錄（1_前後端）
├── app.py                 # 後端 Flask API 伺服器
├── config.py              # 後端配置
├── requirements.txt       # 依賴
├── services/              # 後端服務
├── prompts/               # AI 提示詞
├── uploads/               # 上傳文件存儲
├── Design/                # 設計文件
├── frontend/              # ✨ 前端（獨立部署）
│   ├── html/
│   │   └── index.html     # 前端入口
│   ├── css/
│   │   ├── style.css      # 主樣式
│   │   └── animations.css # 動畫效果
│   └── js/
│       └── main.js        # 主邏輯
└── 指令.txt               # NGROK 配置指令
```

## 快速開始

### 1️⃣ 啟動後端服務

```bash
# 進入項目根目錄
cd "c:\Users\user\Desktop\GK\模擬面試\1_前後端"

# 安裝依賴（首次）
pip install -r requirements.txt

# 啟動後端
python app.py
```

後端將在 `http://127.0.0.1:5000` 上運行。

### 2️⃣ 配置 NGROK（用於外網訪問）

根據 `指令.txt` 中的命令啟動 NGROK：

```bash
ngrok http http://127.0.0.1:5000 --url karissa-unsiding-graphemically.ngrok-free.dev
```

### 3️⃣ 使用前端

#### 方案 A：本地直接打開（本地使用）
```
直接在文件管理器中打開 frontend/html/index.html
或在瀏覽器中訪問：file:///path/to/frontend/html/index.html
```

#### 方案 B：本地伺服器（推薦開發）
```bash
# 使用 Python 簡易伺服器
python -m http.server 8000 -d frontend/html

# 瀏覽器訪問
http://localhost:8000/index.html
```

#### 方案 C：自定義 API 地址（重要！）

前端支持通過 URL 參數指定後端 API 地址：

```
file:///path/to/frontend/html/index.html?apiUrl=https://your-ngrok-url.ngrok-free.dev
```

例子：
```
file:///c:/Users/user/Desktop/GK/模擬面試/1_前後端/frontend/html/index.html?apiUrl=https://karissa-unsiding-graphemically.ngrok-free.dev
```

#### 方案 D：部署到生產伺服器

將 `frontend/` 文件夾上傳到任何 HTTP 伺服器：

```
https://your-domain.com/frontend/html/index.html?apiUrl=https://your-ngrok-url.ngrok-free.dev
```

## 特點

✅ **前後端完全分離**
- 前端不依賴任何後端模板系統
- 可獨立部署到任何位置（本地、伺服器、雲端等）

✅ **靈活的 API 連接**
- 支持本地 (`localhost:5000`)
- 支持 NGROK 公網地址
- 支持自定義後端地址（通過 URL 參數）

✅ **跨域通信**
- 後端已啟用 CORS，支持跨域請求
- 可在不同域名間通信

✅ **零配置使用**
- 前端自動檢測後端配置
- 如連接失敗會使用預設值

## API 配置優先級

1. **URL 參數** - `?apiUrl=...` 最高優先級
2. **後端自動配置** - 從 `/api/config` 獲取
3. **預設值** - 使用內置預設 NGROK URL

## 環境變量設置

在啟動後端前設置環境變量：

### Windows (PowerShell)
```powershell
$env:NGROK_URL="https://your-ngrok-url.ngrok-free.dev"
$env:FLASK_DEBUG="True"
python app.py
```

### Windows (CMD)
```cmd
set NGROK_URL=https://your-ngrok-url.ngrok-free.dev
set FLASK_DEBUG=True
python app.py
```

### Linux/Mac
```bash
export NGROK_URL="https://your-ngrok-url.ngrok-free.dev"
export FLASK_DEBUG="True"
python app.py
```

## 常用場景

### 場景 1：開發者本地開發
```
1. 終端 1：python app.py              # 啟動後端
2. 終端 2：ngrok http 5000            # 啟動 NGROK
3. 瀏覽器：打開 frontend/html/index.html
```

### 場景 2：帶去會議室使用
```
1. 在會議室電腦上啟動後端：python app.py
2. 啟動 NGROK 獲得公網 URL
3. 在任何電腦上用 URL 參數訪問前端：
   frontend/html/index.html?apiUrl=https://your-ngrok-url.ngrok-free.dev
```

### 場景 3：多地點部署（如分支機構）
```
1. 所有分支共享同一個後端（主伺服器）
2. 每個分支下載 frontend/ 文件夾副本
3. 使用統一的 NGROK URL 連接中央後端
```

### 場景 4：雲端部署
```
1. 後端部署到雲端（如 AWS、Azure、Heroku）
2. 前端部署到靜態伺服器（如 S3、GitHub Pages）
3. 通過 NGROK 或直接 API URL 連接
```

## 故障排除

### ❌ 無法加載題庫
- 檢查後端是否運行：訪問 `http://localhost:5000/`
- 檢查 NGROK 是否運行
- 檢查 Google Sheets URL 是否可訪問
- 查看瀏覽器控制台（F12）中的錯誤信息

### ❌ 無法錄音/上傳音頻
- 確保允許麥克風權限
- 檢查瀏覽器支持（需要 HTTPS 或 localhost）
- 檢查 `uploads/` 文件夾是否存在

### ❌ CORS 錯誤
- 後端已配置 CORS，不應出現此錯誤
- 如出現，檢查是否在瀏覽器控制台中有詳細信息
- 嘗試在後端輸出中查找日誌

### ❌ 無法播放 AI 語音
- 檢查 `ai_audio_url` 是否返回正確的 URL
- 確保音頻文件存在於 `static/ai_audio/`
- 檢查瀏覽器音量是否靜音

## 技術細節

### 前端啟動流程

1. HTML 加載，初始化 `window.API_CONFIG`
2. 嘗試從後端 `/api/config` 獲取配置
3. 從後端 `/api/questions` 加載題庫
4. 遠程加載並執行 `main.js`
5. 初始化 Lucide 圖標

### API 端點

| 端點 | 方法 | 返回 | 說明 |
|-----|-----|------|------|
| `/` | GET | JSON | API 伺服器信息 |
| `/health` | GET | JSON | 健康檢查 |
| `/api/config` | GET | JSON | API 配置（URL、NGROK 狀態） |
| `/api/questions` | GET | JSON | 題庫列表 |
| `/api/chat` | POST | JSON | 處理對話和音頻分析 |

### 跨域設置

```python
CORS(app)  # 允許所有來源的請求
```

## 安全建議

⚠️ **生產環境注意**

1. **限制 CORS 來源**
   ```python
   CORS(app, resources={
       r"/api/*": {"origins": "https://yourdomain.com"}
   })
   ```

2. **隱藏敏感信息**
   - API 金鑰放在環境變量
   - 不要在前端暴露後端地址

3. **使用 HTTPS**
   - NGROK 自動提供 HTTPS
   - 生產環境使用 SSL 證書

4. **速率限制**
   - 對 `/api/chat` 添加速率限制
   - 防止濫用

5. **輸入驗證**
   - 後端應驗證所有輸入
   - 特別是文件上傳

## 更新和維護

### 更新前端
```bash
# 修改 frontend/js/main.js 或 css 文件
# 直接儲存即可生效（無需重啟後端）
```

### 更新後端
```bash
# 修改 app.py 或服務代碼後
# 重啟 Flask 服務
# Ctrl+C 停止 → python app.py 重啟
```

### 同步配置
```bash
# 獲取當前 NGROK URL
ngrok api tunnels list

# 在前端 URL 參數中使用
?apiUrl=https://new-ngrok-url.ngrok-free.dev
```

## 常見問題

**Q: 能否在不同網路的電腦上使用？**
A: 是的，通過 NGROK 公網 URL 可以實現遠程訪問。

**Q: 能否離線使用？**
A: 不能，需要網際網路連接才能訪問後端和 Google Sheets。

**Q: 能否修改前端樣式？**
A: 可以，修改 `frontend/css/style.css` 即可。

**Q: 能否修改題庫源？**
A: 可以，在 `config.py` 中修改 `GOOGLE_SHEETS_URL`。

**Q: 能否離線備份題庫？**
A: 可以，手動下載 Google Sheet 為 CSV，或修改後端代碼支持本地 CSV。

## 聯絡和支援

如有問題，請：
1. 檢查瀏覽器控制台（F12）中的錯誤
2. 檢查後端終端的日誌輸出
3. 確認網路連接和防火牆設置
4. 參考本文檔中的故障排除部分
