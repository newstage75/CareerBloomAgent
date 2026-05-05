"""Job Collector ADK Agent definition.

Gemini API 制約: `google_search` は他のツールと併用不可。
そのため、このエージェントは Web 検索のみを担当し、最終応答として
検索結果テキストを返す。後続の parse / Firestore 保存はバックエンドで実行する。
"""

from google.adk import Agent
from google.adk.tools import google_search

from agent.config import MODEL_ID

INSTRUCTION = """\
あなたは日本の転職市場から求人情報を Web 検索で収集するエージェントです。

## 処理手順

1. `google_search` で求人情報を検索してください
   - 指定されたキーワードごとに検索を実行
   - 「求人」「転職」「中途採用」などのキーワードを活用
   - 日本語で検索
2. 検索結果を **すべてそのままテキスト形式** で最終応答として返してください
   - 構造化や保存はあなたの責任ではありません（後続処理が行います）
   - 検索のスニペット・タイトル・URLを含めてください

## 検索戦略

- 各キーワードに対して検索を実行
- 検索結果から具体的な求人情報が含まれるテキストを抽出
- 1回の実行で最大20件程度の求人を目標とする

## 注意事項
- 検索結果が少ない場合は、関連キーワードを追加して再検索
- エラーが発生してもスキップして次に進む
- 最終応答は検索結果テキストのみ。前置きや要約は不要
"""

job_collector_agent = Agent(
    name="job_collector",
    model=MODEL_ID,
    instruction=INSTRUCTION,
    tools=[google_search],
)
