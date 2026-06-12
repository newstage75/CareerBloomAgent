"""Firestore AsyncClient の最小フェイク — routers/admin.py が使う操作のみ実装。"""

from __future__ import annotations


class FakeSnapshot:
    def __init__(self, data: dict | None):
        self._data = data

    @property
    def exists(self) -> bool:
        return self._data is not None

    def to_dict(self) -> dict | None:
        return self._data


class FakeDocument:
    """doc.get() と、ネストした subcollection への chain を提供。"""

    def __init__(self, data: dict | None = None, subcollections: dict | None = None):
        self._data = data
        self._subcollections = subcollections or {}

    async def get(self, transaction=None) -> FakeSnapshot:
        return FakeSnapshot(self._data)

    def collection(self, name: str) -> "FakeCollection":
        return self._subcollections.get(name, FakeCollection())


class FakeStreamDoc:
    """stream() が返す、id 付きドキュメント。"""

    def __init__(self, doc_id: str, data: dict):
        self.id = doc_id
        self._data = data

    def to_dict(self) -> dict:
        return self._data


class FakeCollection:
    """order_by/limit は self を返し、stream() で docs を順に返す。"""

    def __init__(
        self,
        docs: list[FakeStreamDoc] | None = None,
        documents: dict[str, FakeDocument] | None = None,
    ):
        self._docs = docs or []
        self._documents = documents or {}

    def order_by(self, *args, **kwargs) -> "FakeCollection":
        return self

    def limit(self, n: int) -> "FakeCollection":
        self._docs = self._docs[:n]
        return self

    async def stream(self):
        for doc in self._docs:
            yield doc

    def document(self, doc_id: str) -> FakeDocument:
        return self._documents.get(doc_id, FakeDocument(None))


class FakeDB:
    def __init__(self, collections: dict[str, FakeCollection]):
        self._collections = collections

    def collection(self, name: str) -> FakeCollection:
        return self._collections.get(name, FakeCollection())
