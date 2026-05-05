"use client";

import { useEffect, useState } from "react";
import {
  HiOutlineBriefcase,
  HiOutlineMagnifyingGlass,
  HiOutlineClock,
} from "react-icons/hi2";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { MatchResult } from "../types";

type SearchContext = {
  label: string;
  key: string;
  description: string;
};

const SEARCH_CONTEXTS: SearchContext[] = [
  { label: "価値観", key: "values", description: "大切にしている価値観をベースに検索" },
  { label: "スキル", key: "skills", description: "登録済みスキルをベースに検索" },
  { label: "やりたいこと", key: "bucket_list", description: "人生で成し遂げたいことをベースに検索" },
  { label: "やりたくないこと", key: "never_list", description: "避けたいことを除外条件に検索" },
  { label: "キャリアプラン", key: "vision", description: "将来設計ビジョンをベースに検索" },
];

type SearchHistoryEntry = {
  id: string;
  contexts: string[];
  results_count: number;
  searched_at: string;
  results: MatchResult[];
};

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600 bg-green-50";
  if (score >= 60) return "text-yellow-600 bg-yellow-50";
  return "text-gray-600 bg-gray-50";
}

export default function MatchingPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContexts, setSelectedContexts] = useState<string[]>(["values", "skills"]);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!user) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      apiFetch<MatchResult[]>("/api/matching"),
      apiFetch<{ entries: SearchHistoryEntry[] }>("/api/matching/history"),
    ])
      .then(([matchData, historyData]) => {
        setResults(matchData);
        setHistory(historyData.entries);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleSearch = async () => {
    if (searching || selectedContexts.length === 0) return;
    setSearching(true);
    setError(null);
    try {
      const data = await apiFetch<MatchResult[]>("/api/matching/refresh", {
        method: "POST",
        body: JSON.stringify({ contexts: selectedContexts }),
      });
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "調査に失敗しました");
    } finally {
      setSearching(false);
    }
  };

  const toggleContext = (key: string) => {
    setSelectedContexts((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">お仕事ブラウジングβ</h1>
          <p className="mt-1 text-sm text-gray-500">
            求人検索・希望職種の調査をサポートします
          </p>
        </div>
      </div>

      {/* Search context selector */}
      {user && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-gray-700">
            どのデータをベースに調査しますか？
          </p>
          <div className="flex flex-wrap gap-2">
            {SEARCH_CONTEXTS.map((ctx) => (
              <button
                key={ctx.key}
                type="button"
                onClick={() => toggleContext(ctx.key)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  selectedContexts.includes(ctx.key)
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
                title={ctx.description}
              >
                {ctx.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSearch}
              disabled={searching || selectedContexts.length === 0}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <HiOutlineMagnifyingGlass
                className={`h-4 w-4 ${searching ? "animate-pulse" : ""}`}
              />
              {searching ? "調査中..." : "調査する"}
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <HiOutlineClock className="h-4 w-4" />
              過去の調査
            </button>
          </div>
        </div>
      )}

      {/* Search history panel */}
      {showHistory && history.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-2">
            <p className="text-sm font-medium text-gray-700">過去の調査履歴</p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setResults(entry.results || []);
                  setShowHistory(false);
                }}
                className="flex w-full items-center justify-between border-b border-gray-50 px-4 py-3 text-left text-sm hover:bg-gray-50 last:border-b-0"
              >
                <div>
                  <span className="text-gray-700">
                    {entry.contexts.map((c) => SEARCH_CONTEXTS.find((sc) => sc.key === c)?.label ?? c).join(", ")}
                  </span>
                  <span className="ml-2 text-gray-400">({entry.results_count}件)</span>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(entry.searched_at).toLocaleDateString("ja-JP", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <p className="text-center text-sm text-gray-400">読み込み中...</p>
      ) : results.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            調査結果がまだありません。上のボタンから調査を開始してください。
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-sm font-medium text-gray-500">
            調査結果（{results.length}件）
          </h2>
          <ul className="space-y-4">
            {results.map((result) => (
              <li
                key={result.id}
                className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <HiOutlineBriefcase className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {result.position}
                      </h3>
                      <p className="text-sm text-gray-500">{result.company}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${scoreColor(result.score)}`}
                    >
                      {result.score}%
                    </span>
                  </div>
                  {result.gap_skills.length > 0 && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      不足スキル: {result.gap_skills.join(", ")}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
