# CareerBloomAgent 🌸

<div align="center">

**AIの力で、あなたのキャリアに花を咲かせる**

[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Vertex%20AI-4285F4?logo=google-cloud)](https://cloud.google.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)

[🌸 デモを開く（ログイン不要）](https://career-bloom-agent-frontend-1008506606124.asia-northeast1.run.app/)

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

- 🗺️ **目標に向けて何をすればいいかわからない**
  選んだやりたいこと・目標に対して、AIエージェントがロードマップ・足りないスキル・鍛えるべきこと・参考YouTube動画を提案します

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

### 🗺️ 目標深掘り＆ロードマップ生成（深掘りエージェントβ）
やりたいこと・将来の目標を1つ選ぶと、AIエージェントが Web 検索（Google Search Grounding）を行いながら **ロードマップ（短期/中期/長期）・足りないスキル・今後鍛えること・参考になるYouTube動画**を提案します。

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
- **Vertex AI Gemini 2.5**: 価値観棚卸し、キャリア相談、目標深掘り、自律Webブラウジング
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
- **Google Agent Development Kit (ADK)**: 役割別エージェントによるマルチエージェント構成
- **Insight Extractor**: 対話履歴から価値観・ビジョンを自動抽出
- **Roadmap Advisor**: 選んだ目標を深掘りし、ロードマップ・スキル差分・鍛えること・参考YouTubeを Google Search Grounding 付きで生成
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
- **クライアントSDKからの直接アクセス禁止**: フロントエンドから Firestore を直接読み書きする経路は閉じています。Firestore セキュリティルールで全 Client SDK アクセスを拒否し、データアクセスは必ず FastAPI バックエンド経由に集約しています。

---

## 🧪 デモモード（ゲスト利用）

ログイン不要でサイト全機能を試せる「ゲストモード」を用意しています。**ハッカソン審査員の方や初見のユーザーがすぐに体験できる**ことを目的とした設計です。ぜひお気軽にお試しください。

### 主な仕様

- **ゲストデータは共用**: ゲスト同士は同じワークスペース（チャット履歴・価値観・スキル等）を共有します。一部機能のみ提供しているため、フル機能を利用したい場合はログインしてください
- **毎朝 JST 04:00 に自動リセット**: ゲスト用の Firestore 書き込み先 UID を JST 日付（論理日）から決定論的に算出する **UID ローテーション方式**を採用。`__guest_20260508__` のように毎日新しいワークスペースに切り替わるため、削除ジョブやスケジューラ不要で自動的に「今日の朝までだけ」のデータになります
- **AI使用量はサイト全体でカウント**: 1日2000回までの全体上限（`system/usage/{YYYYMMDD}` ドキュメントで集計）。Web検索を伴う重い処理（深掘りエージェントなど）は別途 1日100回まで。上限超過時は `429` + 「本日の利用枠を使い切りました。明朝N時にリセットされます」を返します
- **ログインで個別ワークスペースに切替**: ログイン後は通常のユーザー UID で書き込みされ、データがパーソナル化します

### 環境変数で挙動を制御

| 変数 | デフォルト | 説明 |
|---|---|---|
| `GUEST_ENABLED` | `false` | ゲスト利用の可否。本番でデモを止めたいときは `false` |
| `DAILY_AI_QUOTA` | `2000` | サイト全体のAI呼び出し上限（chat / insights / matching / jobs 全合算） |
| `DAILY_DEEP_RESEARCH_QUOTA` | `100` | Web検索を伴う重いAI処理の追加上限（深掘りエージェントなど） |
| `GUEST_RESET_HOUR_JST` | `4` | 論理日の境界時刻（JST、0-23）。ゲストUID切替とクォータリセットの両方に使われる |
| `GUEST_UID_PREFIX` | `__guest_` | ゲスト共通UIDの接頭辞（例: `__guest_20260508__`） |

UI上の「毎朝N時にリセット」「残りM/L回」などの表示文言は `/api/config` エンドポイントから取得した値で動的に組み立てられるため、環境変数を変えるだけで一貫した文言になります。

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
adk run roadmap_advisor
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
│   ├── roadmap_advisor/  # 目標深掘りエージェント (Google Search Grounding)
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

**👉 [https://career-bloom-agent-frontend-1008506606124.asia-northeast1.run.app/](https://career-bloom-agent-frontend-1008506606124.asia-northeast1.run.app/)**

---

## 🗺️ ロードマップ

### MVP (2026年7月)
- [x] プロジェクト設計・要件定義
- [x] AIキャリア相談チャット（価値観の言語化・深掘り）
- [x] スキル登録・可視化
- [x] ADK マルチエージェント構築（insight_extractor / roadmap_advisor）
- [x] 深掘りエージェントβ（roadmap_advisor 統合完了）
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

