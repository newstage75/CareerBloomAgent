# 転職BloomAgent 🌸

<div align="center">

**AIの力で、あなたのキャリアに花を咲かせる**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Vertex%20AI-4285F4?logo=google-cloud)](https://cloud.google.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)

[デモを見る](#) | [ドキュメント](./docs) | [貢献する](#contributing)

</div>

---

## 📖 概要

**転職BloomAgent**は、日本の上場IT企業の求人情報をAIで分析し、あなたのスキルセットに最適なキャリアパスを提案する転職支援プラットフォームです。

### 🎯 解決する課題

- 🔍 **求人サイトに載らない「隠れた求人」を発見**
  上場企業の採用ページを直接スクレイピングし、一般には公開されていない求人情報を収集

- 📊 **スキルギャップの可視化**
  あなたのスキルと求人要件を比較し、不足しているスキルと学習ロードマップを提示

- 🤖 **24/7 AIキャリアアドバイザー**
  Vertex AI（Gemini Pro）を活用した、いつでも相談できるパーソナライズドアドバイザー

- 💰 **透明性の高いコスト設計**
  個人開発でも運用可能な低コスト設計（月額$1-2〜）

---

## ✨ 主な機能

### 🎓 スキルマッチング分析
Vertex AI Embeddings APIを活用し、あなたのスキルと求人のマッチ度を0-100点でスコアリング。

### 📈 スキルギャップ可視化
不足しているスキルを特定し、優先順位と学習期間を提案。Udemy、Courseraなどの学習リソースも自動で提示。

### 💬 AIキャリアアドバイザーチャット
Gemini Proによる高度な対話型アドバイス。キャリアパス、給与交渉、面接対策まで幅広くサポート。

### 🏢 上場IT企業求人データベース
日本の上場IT企業（約400-500社）の求人情報を自動収集・更新。

### 📊 インタラクティブダッシュボード
あなたのスキル、マッチング結果、学習進捗を一目で確認。

---

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Recharts** (データ可視化)

### バックエンド
- **FastAPI** (Python 3.11)
- **Vertex AI** (Gemini Pro, Embeddings API)
- **Firestore** (NoSQL Database)
- **Cloud Run** (Serverless Container)

### AI / ML
- **Vertex AI Gemini Pro 1.5**: キャリアアドバイス、求人情報抽出
- **Embeddings API**: スキルマッチング、意味検索

### インフラ
- **Google Cloud Platform**
  - Cloud Run
  - Firestore
  - Cloud Storage
  - Cloud Scheduler
  - Secret Manager
  - Cloud Monitoring
- **GitHub Actions** (CI/CD)
- **Firebase Authentication**

### スクレイピング
- **Playwright** (ヘッドレスブラウザ)
- **Beautiful Soup** (HTML解析)

---

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                  フロントエンド                      │
│            Next.js + Tailwind CSS                   │
│         (Cloud Storage + Cloud CDN)                 │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS
                    ↓
┌─────────────────────────────────────────────────────┐
│              Cloud Run (FastAPI)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Auth API │ │ Chat API │ │ Matching API     │   │
│  └──────────┘ └──────────┘ └──────────────────┘   │
└───────┬──────────┬──────────┬───────────┬──────────┘
        │          │          │           │
   ┌────┴────┐ ┌──┴───┐ ┌────┴─────┐ ┌──┴────┐
   │Vertex AI│ │Firebase│ │Firestore │ │Cloud  │
   │         │ │Auth    │ │          │ │Storage│
   │-Gemini  │ └────────┘ │-Users    │ └───────┘
   │-Embed   │            │-Jobs     │
   └─────────┘            │-Matches  │
                          └──────────┘
```

---

## 💰 コスト設計

個人開発でも運用可能な低コスト設計を実現。

### 開発段階
| サービス | 月額 |
|---------|------|
| Cloud Run | $0（無料枠） |
| Firestore | $0（無料枠） |
| Vertex AI | ~$1 |
| その他 | ~$0.50 |
| **合計** | **$1-2/月** |

### 本番運用（ユーザー100-500人）
| サービス | 月額 |
|---------|------|
| Cloud Run | $3-6 |
| Firestore | $3-6 |
| Vertex AI | $5-10 |
| その他 | $4-8 |
| **合計** | **$15-30/月** |

**最適化施策により、平均44%のコスト削減を実現**

詳細は [コスト最適化ドキュメント](./docs/cost-optimization.md) を参照。

---

## 🚀 セットアップ

### 前提条件
- Node.js 18+
- Python 3.11+
- Google Cloud アカウント
- Firebase プロジェクト

### 1. リポジトリのクローン
```bash
git clone https://github.com/YOUR_USERNAME/TensyokuBloomAgent.git
cd TensyokuBloomAgent
```

### 2. フロントエンド
```bash
cd frontend
npm install
cp .env.example .env.local
# .env.local を編集（Firebase設定等）
npm run dev
```

### 3. バックエンド
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# .env を編集（GCP設定等）
uvicorn main:app --reload
```

### 4. Google Cloud セットアップ
```bash
# Google Cloud SDK インストール済みの場合
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 必要なAPIを有効化
gcloud services enable \
  aiplatform.googleapis.com \
  run.googleapis.com \
  firestore.googleapis.com
```

詳細なセットアップ手順は [セットアップガイド](./docs/setup.md) を参照。

---

## 📂 プロジェクト構造

```
TensyokuBloomAgent/
├── frontend/              # Next.js フロントエンド
│   ├── app/              # App Router
│   ├── components/       # Reactコンポーネント
│   └── public/           # 静的ファイル
├── backend/              # FastAPI バックエンド
│   ├── main.py           # エントリーポイント
│   ├── routers/          # APIルーター
│   ├── services/         # ビジネスロジック
│   └── models/           # データモデル
├── scraper/              # Webスクレイピング
│   ├── scrape_companies.py
│   └── extract_jobs.py
├── infrastructure/       # IaC (Terraform等)
├── docs/                 # ドキュメント
├── data/                 # データファイル
│   └── listed_it_companies.csv
└── README.md
```

---

## 🧪 テスト

### フロントエンド
```bash
cd frontend
npm test
```

### バックエンド
```bash
cd backend
pytest
```

---

## 📊 デモ

（準備中）

---

## 🗺️ ロードマップ

### MVP (2026年7月)
- [x] プロジェクト設計
- [x] 要件定義
- [ ] 上場IT企業データ収集（100社）
- [ ] AIチャット実装
- [ ] スキルマッチング実装
- [ ] ダッシュボード実装

### Phase 2 (2026年8月〜)
- [ ] レジュメ分析機能
- [ ] 面接対策機能
- [ ] ポートフォリオ分析（GitHub連携）
- [ ] 求人データ拡大（500社→1,000社）

### Phase 3 (2026年10月〜)
- [ ] 他業界への拡大（医療、インフラ等）
- [ ] モバイルアプリ
- [ ] マネタイズ開始

---

## 🤝 Contributing

コントリビューションを歓迎します！

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

詳細は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照。

---

## 📄 ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) を参照。

---

## 👨‍💻 作者

**nagatomo**

- GitHub: [@YOUR_GITHUB](https://github.com/YOUR_USERNAME)
- Twitter: [@YOUR_TWITTER](https://twitter.com/YOUR_TWITTER)
- Qiita: [@YOUR_QIITA](https://qiita.com/YOUR_QIITA)

---

## 🙏 謝辞

- Google Cloud for providing Vertex AI
- shadcn/ui for beautiful UI components
- The open source community

---

## 📚 関連リンク

- [要件定義書](./docs/requirements.md)
- [アーキテクチャドキュメント](./docs/architecture.md)
- [API ドキュメント](./docs/api.md)
- [コスト最適化](./docs/cost-optimization.md)

---

<div align="center">

**Made with ❤️ and ☕ by nagatomo**

⭐ このプロジェクトが役に立ったら、スターをお願いします！

</div>
