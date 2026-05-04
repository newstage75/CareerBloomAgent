#!/bin/bash
# =============================================================================
# Vertex AI Zero Data Retention (ZDR) 設定スクリプト
#
# 目的: ユーザーの対話データが Google のAIモデル学習に使われないことを保証する
#
# ■ 学習への利用について:
#   Vertex AI (Google Cloud) ではデフォルトでユーザーデータはモデルの学習・
#   改善に一切使用されません (Service Terms Section 17)。
#   これは消費者向け Gemini アプリとは異なる、企業向けの保証です。
#
# ■ このスクリプトの追加保護:
#   上記に加えて、インメモリキャッシュも無効化することで、
#   プロンプト・レスポンスが Google 側に一切残らない状態にします。
#
# 前提条件:
# - gcloud CLI がインストール済み & 認証済み
# - roles/aiplatform.admin の IAM ロールが付与されていること
#
# 補足:
# - Google Search Grounding 使用時は Abuse Monitoring 目的で30日間のログ保持あり
#   → 請求書払い(Invoiced Billing)に切り替えることでこれも無効化可能
# =============================================================================

set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-tensyoku-bloom}"
LOCATION="us-central1"  # cacheConfig API は us-central1 のみ

echo "=== Vertex AI Zero Data Retention 設定 ==="
echo "Project: ${PROJECT_ID}"
echo ""

# 現在の設定を確認
echo "1. 現在のキャッシュ設定を確認中..."
curl -s -X GET \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  "https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/cacheConfig" | python3 -m json.tool

echo ""

# キャッシュを無効化
echo "2. データキャッシュを無効化中..."
curl -s -X PATCH \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "Content-Type: application/json" \
  "https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/cacheConfig" \
  -d "{\"name\": \"projects/${PROJECT_ID}/cacheConfig\", \"disableCache\": true}" | python3 -m json.tool

echo ""
echo "=== 完了 ==="
echo ""
echo "追加の推奨事項:"
echo "- 請求書払い(Invoiced Billing)に切り替えると、Abuse Monitoring 用のロギングも無効化できます"
echo "- 詳細: https://cloud.google.com/vertex-ai/generative-ai/docs/vertex-ai-zero-data-retention"
