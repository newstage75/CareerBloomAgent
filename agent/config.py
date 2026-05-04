"""Shared configuration for all ADK agents."""

import os

GCP_PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "tensyoku-bloom")
VERTEX_AI_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "asia-northeast1")
MODEL_ID = "gemini-2.5-flash"
EMBEDDING_MODEL_ID = "text-embedding-005"
FIRESTORE_DATABASE = "(default)"
MAX_JOBS_PER_RUN = 20

# Vertex AI はデフォルトでユーザーデータをモデル学習に使用しない（Service Terms Section 17）
# 追加の保護として Zero Data Retention (ZDR) を有効化することを推奨
# 設定方法: scripts/disable_vertex_ai_cache.sh を実行

DEFAULT_SEARCH_KEYWORDS = [
    "エンジニア 転職",
    "データサイエンティスト 求人",
    "プロダクトマネージャー 転職",
    "Webエンジニア 中途採用",
]
