"use client";

import { useEffect, useRef, useState } from "react";
import {
  HiOutlineBriefcase,
  HiOutlineMagnifyingGlass,
  HiOutlineClock,
  HiOutlineCpuChip,
} from "react-icons/hi2";
import { apiFetch, streamMatchingRefresh } from "../lib/api";
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
  { label: "キャリアプラン", key: "vision", description: "やりたいこと・目標をベースに検索" },
];

type SearchHistoryEntry = {
  id: string;
  contexts: string[];
  results_count: number;
  searched_at: string;
  results: MatchResult[];
};

type ProgressEntry = {
  id: number;
  label: string;
  detail?: string;
  elapsed: number;
  kind: "status" | "tool_call" | "tool_response" | "thinking" | "error";
};

const PIPELINE_TOTAL_SEC = 90;

const PHASE_LABEL: Record<string, string> = {
  starting: "調査を開始",
  collecting_jobs: "求人を収集中",
  matching: "マッチングを計算中",
  fallback: "フォールバック計算に切り替え",
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

  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string>("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const progressIdRef = useRef(0);

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

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const pushProgress = (entry: Omit<ProgressEntry, "id">) => {
    progressIdRef.current += 1;
    const id = progressIdRef.current;
    setProgress((prev) => [...prev, { id, ...entry }]);
  };

  const handleSearch = async () => {
    if (searching || selectedContexts.length === 0) return;
    setSearching(true);
    setError(null);
    setProgress([]);
    setCurrentPhase("starting");
    setElapsedSec(0);
    progressIdRef.current = 0;

    const startedAt = Date.now();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);

    await streamMatchingRefresh(selectedContexts, {
      onStatus: (data) => {
        setCurrentPhase(data.phase);
        const baseLabel = PHASE_LABEL[data.phase] ?? data.message;
        const detail = data.keywords?.length
          ? `キーワード: ${data.keywords.join(" / ")}`
          : undefined;
        pushProgress({ label: baseLabel, detail, elapsed: data.elapsed, kind: "status" });
      },
      onAgent: (data) => {
        if (data.type === "tool_call") {
          const argSummary = data.args
            ? Object.entries(data.args)
                .map(([k, v]) => {
                  const s = typeof v === "string" ? v : JSON.stringify(v);
                  return `${k}=${s.slice(0, 30)}`;
                })
                .join(", ")
            : "";
          pushProgress({
            label: `🔧 ${data.name ?? "ツール"} 呼び出し`,
            detail: argSummary || undefined,
            elapsed: data.elapsed,
            kind: "tool_call",
          });
        } else if (data.type === "tool_response") {
          pushProgress({
            label: `↩ ${data.name ?? "ツール"} 応答`,
            detail: data.summary,
            elapsed: data.elapsed,
            kind: "tool_response",
          });
        } else if (data.type === "thinking" && data.text) {
          pushProgress({
            label: "💭 思考中",
            detail: data.text.slice(0, 200),
            elapsed: data.elapsed,
            kind: "thinking",
          });
        } else if (data.type === "store_start") {
          pushProgress({
            label: "📥 求人を解析・保存中",
            detail: data.message,
            elapsed: data.elapsed,
            kind: "status",
          });
        } else if (data.type === "store_done") {
          pushProgress({
            label: "✅ 求人保存完了",
            detail: data.summary,
            elapsed: data.elapsed,
            kind: "tool_response",
          });
        } else if (data.type === "store_skipped") {
          pushProgress({
            label: "⏭ 保存スキップ",
            detail: (data as { reason?: string }).reason,
            elapsed: data.elapsed,
            kind: "status",
          });
        } else if (data.type === "error") {
          pushProgress({
            label: `⚠ ${data.agent} エラー`,
            detail: data.message,
            elapsed: data.elapsed,
            kind: "error",
          });
        }
      },
      onDone: async (data) => {
        if (tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }
        setElapsedSec(Math.floor(data.elapsed));
        try {
          const [matchData, historyData] = await Promise.all([
            apiFetch<MatchResult[]>("/api/matching"),
            apiFetch<{ entries: SearchHistoryEntry[] }>("/api/matching/history"),
          ]);
          setResults(matchData);
          setHistory(historyData.entries);
        } catch (err) {
          setError(err instanceof Error ? err.message : "結果の取得に失敗しました");
        } finally {
          setSearching(false);
        }
      },
      onError: (err) => {
        if (tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }
        setError(err.message);
        setSearching(false);
      },
    });
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
              {searching
                ? `調査中…（${elapsedSec}秒/${PIPELINE_TOTAL_SEC}秒）`
                : "調査する"}
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

      {searching && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HiOutlineCpuChip className="h-5 w-5 animate-pulse text-indigo-600" />
              <p className="text-sm font-medium text-indigo-700">
                {PHASE_LABEL[currentPhase] ?? "調査中"}
              </p>
            </div>
            <p className="font-mono text-xs text-indigo-600">
              {elapsedSec}秒 / {PIPELINE_TOTAL_SEC}秒
            </p>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-[width] duration-300"
              style={{
                width: `${Math.min(100, (elapsedSec / PIPELINE_TOTAL_SEC) * 100)}%`,
              }}
            />
          </div>
          {progress.length > 0 && (
            <ul className="max-h-60 space-y-1.5 overflow-y-auto rounded-md bg-white/60 p-3 text-xs text-gray-700">
              {progress.slice(-30).map((p) => (
                <li key={p.id} className="flex items-start gap-2">
                  <span className="shrink-0 font-mono text-[10px] text-indigo-400">
                    {p.elapsed.toFixed(1)}s
                  </span>
                  <div className="min-w-0 flex-1">
                    <span
                      className={
                        p.kind === "error"
                          ? "text-red-600"
                          : p.kind === "tool_call"
                          ? "text-indigo-700"
                          : p.kind === "thinking"
                          ? "text-amber-700"
                          : "text-gray-800"
                      }
                    >
                      {p.label}
                    </span>
                    {p.detail && (
                      <p className="truncate text-[11px] text-gray-500">{p.detail}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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

      {loading ? (
        <p className="text-center text-sm text-gray-400">読み込み中...</p>
      ) : !searching && results.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            調査結果がまだありません。上のボタンから調査を開始してください。
          </p>
        </div>
      ) : !searching && results.length > 0 ? (
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 break-words">
                        {result.position}
                      </h3>
                      <p className="text-sm text-gray-500">{result.company}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${scoreColor(result.score)}`}
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
      ) : null}
    </div>
  );
}
