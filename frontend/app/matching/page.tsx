"use client";

import { useEffect, useState } from "react";
import { HiOutlineBriefcase, HiArrowPath } from "react-icons/hi2";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { MatchResult } from "../types";

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600 bg-green-50";
  if (score >= 60) return "text-yellow-600 bg-yellow-50";
  return "text-gray-600 bg-gray-50";
}

export default function MatchingPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch<MatchResult[]>("/api/matching")
      .then(setResults)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const data = await apiFetch<MatchResult[]>("/api/matching/refresh", {
        method: "POST",
      });
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "再計算に失敗しました");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">マッチング結果</h1>
          <p className="mt-1 text-sm text-gray-500">
            あなたの価値観とスキルに基づいたAIマッチング結果です
          </p>
        </div>
        {user && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <HiArrowPath
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            再計算
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm text-gray-400">読み込み中...</p>
      ) : results.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            マッチング結果がまだありません。スキルを登録して再計算してください。
          </p>
        </div>
      ) : (
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
      )}

      <p className="text-center text-sm text-gray-400">
        スキル情報を追加すると、より精度の高いマッチング結果が表示されます。
        <Link href="/skills" className="ml-1 text-indigo-600 hover:underline">
          スキルを登録する
        </Link>
      </p>
    </div>
  );
}
