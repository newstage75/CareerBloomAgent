# CareerBloomAgent 🌸

<div align="center">

**AIの力で、あなたのキャリアに花を咲かせる**

[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Vertex%20AI-4285F4?logo=google-cloud)](https://cloud.google.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)

[デモを見る（準備中）](#)

</div>

> **Note:** このリポジトリは個人開発×GCPハッカソン（Google Cloud Hackathon 2026）向けのプロジェクトです。AIコーディングを活用した開発を目指します。開発中のため、機能やAPIは予告なく変更される可能性があります。

---

## 📖 概要

**CareerBloomAgent**は、AIと対話しながら自分の価値観やスキルを整理し、価値観に沿ったキャリアパスを見つけるための相談プラットフォームを目指しています。

### 🎯 解決する課題

- 🪞 **価値観の整理ができない**
  「自分が何を大切にしているのか」を言語化するのは難しい——AIとの対話で、あなたの価値観・強み・志向を明確にします

- 🧭 **キャリアの方向性が見えない**
  漠然とした不安を、Gemini 2.5との対話を通じて具体的なキャリアプランへ変えていきます

- 🔍 **自分に合った企業が見つからない**
  AIエージェントが企業の採用ページを直接調査し、スキルだけでなく価値観に合った企業を提案します

- 💰 **透明性の高いコスト設計**
  個人開発でも運用可能な低コスト設計（月額$1-2〜）

---

## ✨ 主な機能

### 🪞 価値観の言語化
「自分が本当に大切にしていることは何か」——AIとの対話を通じて、あなたの価値観・強み・志向を言語化します。すべてのキャリア設計の出発点です。

### 🧭 AIエージェントによる人生設計の深掘り
Gemini 2.5が壁打ち相手となり、漠然とした将来の不安を具体的なキャリアプランへ変えていきます。対話を重ねるほどあなたへの理解が深まります。

### 🗺️ 人生ロードマップの提案
価値観とスキルの現在地をもとに、3年後・5年後・10年後のキャリアロードマップを提案。今やるべきことが明確になります。

### 🔍 価値観マッチ企業の検索・調査
AIエージェントがWeb上の求人を自律的に収集し、スキルだけでなく**あなたの価値観に合った企業**をスコアリング。企業の採用ページを直接調査することで、あらゆる企業からの提案を目指します。

### 📊 ダッシュボード
価値観マップ、スキル、マッチング結果、相談履歴をひと目で確認。自分のキャリアの現在地と未来がわかります。

---

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Recharts** (データ可視化)

### バックエンド
- **FastAPI** (Python 3.11)
- **Vertex AI** (Gemini 2.5 Flash, Embeddings API)
- **Firestore** (NoSQL Database)
- **Cloud Run** (Serverless Container)

### AI / ML
- **Vertex AI Gemini 2.5**: 価値観棚卸し、キャリア相談、求人情報抽出、自律Webブラウジング
- **Grounding with Google Search**: Web上の最新情報をAIに提供
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

### AI エージェント（ADK マルチエージェント）
- **Google Agent Development Kit (ADK)**: 3つの独立エージェントによるマルチエージェント構成
- **Insight Extractor**: 対話履歴から価値観・ビジョンを自動抽出
- **Matching Calculator**: スキル+価値観ベースの企業マッチング計算
- **Job Collector**: Google Search Grounding による自律的な求人収集
- **Vertex AI (Gemini 2.5 Flash)**: 各エージェントの推論エンジン

---

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                  フロントエンド                      │
│            Next.js + Tailwind CSS                   │
│              (Cloud Run SSR)                         │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS
                    ↓
┌─────────────────────────────────────────────────────┐
│              Cloud Run (FastAPI)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Auth API │ │ Chat API │ │ Matching API     │   │
│  └──────────┘ └────┬─────┘ └────────┬─────────┘   │
└───────┬─────────────┼───────────────┼──────────────┘
        │             │               │
        │    ┌────────┼───────────────┼────────────┐
        │    │   ADK Multi-Agent System            │
        │    │  ┌────────────┐ ┌──────────┐ ┌────────────┐
        │    │  │ insight_   │ │ matching_│ │ job_       │
        │    │  │ extractor  │ │calculator│ │ collector  │
        │    │  └─────┬──────┘ └────┬─────┘ └─────┬──────┘
        │    └────────┼─────────────┼──────────────┼───┘
        │             │             │              │
   ┌────┴────┐   ┌───┴─────────────┴──────────────┴──┐
   │Firebase │   │           Firestore                │
   │Auth     │   │  -Users (skills, insights, matches)│
   └─────────┘   │  -Jobs (embeddings)                │
                  └───────────────────────────────────┘
                           │
                     ┌─────┴─────┐
                     │ Vertex AI │
                     │ -Gemini   │
                     │ -Embed    │
                     └───────────┘
```

---

## 💰 コスト設計

個人開発でも運用可能な低コスト設計を実現。

### 開発段階
| サービス  | 月額         |
| --------- | ------------ |
| Cloud Run | $0（無料枠） |
| Firestore | $0（無料枠） |
| Vertex AI | ~$1          |
| その他    | ~$0.50       |
| **合計**  | **$1-2/月**  |

### 本番運用（ユーザー100-500人）
| サービス  | 月額          |
| --------- | ------------- |
| Cloud Run | $3-6          |
| Firestore | $3-6          |
| Vertex AI | $5-10         |
| その他    | $4-8          |
| **合計**  | **$15-30/月** |

**最適化施策により、平均44%のコスト削減を実現**

<!-- 詳細は docs/cost-optimization.md を参照 -->

---

## 🔒 データプライバシー

- **Google のAI学習には一切使用されません**: Vertex AI (Google Cloud) では、ユーザーデータがモデルの学習・改善に使用されることはありません（[Service Terms Section 17](https://cloud.google.com/terms/service-terms)）。消費者向けGeminiアプリとは異なる企業向け保証です。
- **データの所在**: 全ユーザーデータは `asia-northeast1`（東京リージョン）の Firestore に保存。Google の外部に出ることはありません。

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

### 4. ADK エージェント
```bash
cd agent
pip install -e ".[dev]"

# 個別エージェントの動作確認
adk run insight_extractor
adk run matching_calculator
adk run job_collector
```

### 5. Google Cloud セットアップ
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

<!-- 詳細なセットアップ手順は docs/setup.md を参照（準備中） -->

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
├── agent/                # ADK マルチエージェントシステム
│   ├── insight_extractor/ # 対話→価値観抽出エージェント
│   ├── matching_calculator/ # スキル+価値観マッチング
│   ├── job_collector/     # Web求人収集エージェント
│   └── shared/            # 共通Firestoreクライアント
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
- [x] プロジェクト設計・要件定義
- [x] AIキャリア相談チャット（価値観の言語化・深掘り）
- [x] スキル登録・可視化
- [x] ADK マルチエージェント構築（insight_extractor / matching_calculator / job_collector）
- [ ] 価値観ベースの企業マッチング（ADKエージェント統合完了）
- [ ] デプロイパイプライン（Cloud Run）
- [ ] ダッシュボード

### Phase 2 (2026年8月〜)
- [ ] 人生ロードマップ提案機能（3年・5年・10年）
- [ ] 価値観マップの可視化
- [ ] 対象企業・業界の拡大

### Phase 3 (2026年10月〜)
- [ ] 対話履歴に基づくパーソナライズ強化
- [ ] モバイルアプリ

---

