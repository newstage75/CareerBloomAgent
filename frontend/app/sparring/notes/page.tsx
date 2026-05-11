"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  HiOutlineLightBulb,
  HiOutlineTrash,
  HiOutlineMagnifyingGlass,
} from "react-icons/hi2";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth";
import { usePublicConfig } from "@/app/lib/config";
import type { SparringNote } from "@/app/types";

const PAGE_SIZE = 10;

export default function SparringNotesPage() {
  const { user } = useAuth();
  const { config } = usePublicConfig();
  const canUse = !!user || !!config?.guest_enabled;
  const [notes, setNotes] = useState<SparringNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!canUse) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch<SparringNote[]>("/api/sparring/notes")
      .then(setNotes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [canUse, user]);

  // 検索（タイトル + summary + body を case-insensitive で部分一致）
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q)
    );
  }, [notes, query]);

  // ページネーション
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [query]);

  const handleDelete = async (id: string) => {
    if (!confirm("このノートを削除しますか？")) return;
    try {
      await apiFetch(`/api/sparring/notes/${id}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    }
  };

  const formatDate = (s: string) => {
    if (!s) return "";
    return new Date(s).toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">知識ノートβ</h1>
        <p className="mt-1 text-sm text-gray-500">
          「知識の壁打ち」で💡を付けた応答が、自動でノートになります
          <span className="ml-1 text-xs text-gray-400">（生成には時間を要することがあります）</span>
        </p>
      </div>

      <div className="relative">
        <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ノートを検索（タイトル・本文）"
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          <HiOutlineLightBulb className="mx-auto mb-2 h-8 w-8 text-amber-400" />
          {query.trim() ? (
            <>該当するノートが見つかりません</>
          ) : (
            <>
              まだノートがありません。
              <br />
              <Link href="/sparring" className="text-indigo-600 hover:underline">
                知識の壁打ち
              </Link>{" "}
              で AI の応答に 💡 を付けると、自動でノートが作られます。
            </>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            {filtered.length} 件中 {(currentPage - 1) * PAGE_SIZE + 1}-
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} 件
          </p>
          <ul className="space-y-3">
            {pageItems.map((n) => (
              <li
                key={n.id}
                className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-indigo-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/sparring/notes/${n.id}`}
                    className="block min-w-0 flex-1"
                  >
                    <h2 className="truncate text-base font-bold text-gray-900">
                      {n.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      {n.summary}
                    </p>
                    <p className="mt-2 text-[11px] text-gray-400">
                      {formatDate(n.generated_at)}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(n.id)}
                    className="shrink-0 p-1 text-gray-400 hover:text-rose-600"
                    aria-label="削除"
                    title="削除"
                  >
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                前へ
              </button>
              <span className="px-2 text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                次へ
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
