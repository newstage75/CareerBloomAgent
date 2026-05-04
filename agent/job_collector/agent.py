"""Job Collector ADK Agent definition."""

from google.adk import Agent
from google.adk.tools import google_search

from agent.config import MODEL_ID
from agent.job_collector.tools import parse_job_postings, store_jobs_to_firestore

INSTRUCTION = """\
あなたは日本の転職市場から求人情報を収集するエージェントです。

## 処理手順

1. `google_search` で求人情報を検索してください
   - 指定されたキーワードごとに検索を実行
   - 「求人」「転職」「中途採用」などのキーワードを活用
   - 日本語で検索
2. 検索結果を `parse_job_postings` で構造化データに変換してください
   - 各検索結果のテキストを渡す
   - 企業名、ポジション、必要スキル等を抽出
3. 構造化された求人を `store_jobs_to_firestore` で保存してください
   - 重複排除は自動で行われます
   - embeddingも自動生成されます

## 検索戦略

- 各キーワードに対して検索を実行
- 検索結果から具体的な求人情報が含まれるテキストを抽出
- 1回の実行で最大20件程度の求人を目標とする

## 注意事項
- 検索結果が少ない場合は、関連キーワードを追加して再検索
- エラーが発生してもスキップして次に進む
- 最終的に保存結果のサマリを報告すること
"""

job_collector_agent = Agent(
    name="job_collector",
    model=MODEL_ID,
    instruction=INSTRUCTION,
    tools=[
        google_search,
        parse_job_postings,
        store_jobs_to_firestore,
    ],
)
