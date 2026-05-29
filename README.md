# AWS Cost & Architecture Lab | 雲端架構與成本實驗室

一個基於 Web 的高互動性 AWS 雲端基礎設施學習、規劃與估算工具。您可以在虛擬的 VPC 畫布上自由新增、配置各種 AWS 常用服務，實時查看估算的月度與年化開銷，並獲取對應的 Terraform 和 AWS CLI 部署腳本。

---

## 🎨 核心功能

- **互動式虛擬 VPC 畫布**：直觀區分公有子網路 (Public Subnet) 與私有子網路 (Private Subnet)，自由新增並選取服務。
- **實時成本估算與 Chart.js 分析**：
  - 隨着您拉動滑桿或更改規格，底部計數器將動態平滑遞增/遞減數值。
  - 圓餅圖實時渲染 Compute、Database、Storage、Networking 各分類的費用佔比。
- **動態基礎設施即代碼 (IaC) 生成**：
  - 隨配置變化即時生成對應的 **Terraform (HCL)** 和 **AWS CLI** 代碼，支持一鍵複製。
  - 附帶詳細的 AWS 服務介紹與 FinOps 最佳實踐指引。
- **經典架構模板一鍵載入 (Presets)**：
  - **經典 Web 服務架構** (EC2 + RDS + S3)
  - **無伺服器微服務** (Lambda + DynamoDB + API Gateway)
  - **高可用企業級架構** (ALB + CloudFront + Multi-AZ RDS + Auto-Scaling EC2)
- **FinOps 智能成本優化建議**：內置規則引擎，自動檢測未預留的 EC2 實例、非必要的 Multi-AZ 資料庫或較大的 S3 Standard 儲存，並提示優化方案。

---

## 🚀 快速開始

本專案採用 **零構建、零配置 (Zero-Config)** 的原生 Web 技術棧開發，無需安裝 Node.js 依賴或進行程式碼編譯。

### 方式一：直接瀏覽器打開
直接雙擊專案目錄下的 `index.html` 即可在瀏覽器（推薦 Chrome、Safari、Edge）中完美運行。

### 方式二：使用 Python 本機伺服器
如果您希望使用 HTTP 伺服器方式載入，可以在專案根目錄下運行：
```bash
python3 -m http.server 8000
```
然後在瀏覽器中訪問：`http://localhost:8000`

---

## 📂 專案檔案結構

- [index.html](file:///Users/gaoyouhan/Desktop/aws_course_0528/index.html) - 主頁面結構，包含 CDN 元件引用及彈出式說明對話框
- [index.css](file:///Users/gaoyouhan/Desktop/aws_course_0528/index.css) - 玻璃擬物風格 (Glassmorphism) 全域樣式及動態微動畫
- [index.js](file:///Users/gaoyouhan/Desktop/aws_course_0528/index.js) - 核心狀態機、費率估算引擎、IaC 代碼生成器與圖表更新邏輯
- [.gitignore](file:///Users/gaoyouhan/Desktop/aws_course_0528/.gitignore) - 忽略 macOS、Node.js、Python、AWS 以及 Terraform 相關暫存與敏感文件

---

## 💡 模擬費率參考

- **EC2 虛擬主機**：`t3.micro` ($7.30/月) 至 `c6g.2xlarge` ($205.86/月)。預留實例 (RI) 可獲得 40% 折扣。
- **Lambda 函數**：請求費用 $0.20/百萬次，加計 GB-seconds 運算時間費。
- **RDS 資料庫**：主機容量基礎費，開啟 Multi-AZ 部署時費用加倍。
- **S3 儲存**：標準儲存單價 $0.023/GB，低頻訪問檔 (IA) 單價 $0.0125/GB，封存檔 (Glacier) 單價 $0.004/GB。
