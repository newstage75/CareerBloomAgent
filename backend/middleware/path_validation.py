"""共通の path パラメータ正規表現バリデーション。

URL から来る path パラメータをそのまま ``db.collection(...).document(id)`` に
渡すと、Firestore の予約パターン (``__name__`` 等) や制御文字で
予期せぬエラー/参照を引き起こすので、安全な英数字IDに限定する。
"""

from __future__ import annotations

from fastapi import Path

# 英数 + アンダースコア + ハイフン、1〜80文字。
# 先頭と末尾は英数字に限定して、Firestore 予約パターン (``__name__`` 等) を弾く。
ID_PATTERN = r"^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,78}[A-Za-z0-9])?$"


def safe_path_id() -> object:
    """サブコレクションのドキュメントID向け FastAPI ``Path`` 引数。

    使い方::

        async def delete_x(item_id: str = safe_path_id()) -> ...:
            ...
    """
    return Path(..., pattern=ID_PATTERN)
