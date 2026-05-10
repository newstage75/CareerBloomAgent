"use client";

import { useEffect, useRef, useState } from "react";
import {
  HiOutlineSparkles,
  HiOutlineMap,
  HiOutlineAcademicCap,
  HiOutlineFire,
  HiOutlinePlayCircle,
  HiOutlineClock,
  HiOutlineTrash,
  HiOutlineCpuChip,
} from "react-icons/hi2";
import { apiFetch, streamRoadmapGenerate } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePublicConfig } from "../lib/config";
import type {
  Roadmap,
  RoadmapStep,
  MissingSkill,
  UserInsights,
} from "../types";

type SearchSource = { title: string; uri: string };

type ProgressEntry = {
  id: number;
  label: string;
  detail?: string;
  elapsed: number;
  kind: "status" | "tool_call" | "tool_response" | "error" | "sources";
  sources?: SearchSource[];
};

type GoalCandidate = {
  key: string;
  label: string;
  description?: string;
};

const PIPELINE_TOTAL_SEC = 180;

const PRIORITY_BADGE: Record<MissingSkill["priority"], string> = {
  high: "bg-rose-50 text-rose-700 border-rose-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-50 text-slate-600 border-slate-200",
};

type ApiInsightsResponse =
  | { status: "empty"; message: string }
  | {
      values: { label: string; description: string }[];
      vision: { short_term: string; mid_term: string; long_term: string };
      bucket_list: { id: string; text: string }[];
    };

function buildGoalCandidates(insights: ApiInsightsResponse | null): GoalCandidate[] {
  const out: GoalCandidate[] = [];
  if (!insights || "status" in insights) return out;
  const v = insights.vision || ({} as UserInsights["vision"]);
  if (v.short_term) {
    out.push({ key: "vision-short", label: `短期: ${v.short_term}` });
  }
  if (v.mid_term) {
    out.push({ key: "vision-mid", label: `中期: ${v.mid_term}` });
  }
  if (v.long_term) {
    out.push({ key: "vision-long", label: `長期: ${v.long_term}` });
  }
  for (const item of insights.bucket_list ?? []) {
    out.push({ key: `bucket-${item.id}`, label: item.text });
  }
  return out;
}

export default function MatchingPage() {
  const { user } = useAuth();
  const { config } = usePublicConfig();
  const canUse = !!user || !!config?.guest_enabled;

  const [insights, setInsights] = useState<ApiInsightsResponse | null>(null);
  const [goalCandidates, setGoalCandidates] = useState<GoalCandidate[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState("");

  const [history, setHistory] = useState<Roadmap[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState<Roadmap | null>(null);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const progressIdRef = useRef(0);

  useEffect(() => {
    if (!canUse) return;
    apiFetch<ApiInsightsResponse>("/api/insights")
      .then((data) => {
        setInsights(data);
        setGoalCandidates(buildGoalCandidates(data));
      })
      .catch(() => {});
    apiFetch<Roadmap[]>("/api/matching")
      .then((data) => {
        setHistory(data);
        if (data.length > 0) setActiveRoadmap(data[0]);
      })
      .catch(() => {});
  }, [canUse, user]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const pushProgress = (entry: Omit<ProgressEntry, "id">) => {
    progressIdRef.current += 1;
    setProgress((prev) => [...prev, { id: progressIdRef.current, ...entry }]);
  };

  const resolvedGoalText = (() => {
    if (customGoal.trim()) return customGoal.trim();
    if (!selectedKey) return "";
    const found = goalCandidates.find((g) => g.key === selectedKey);
    return found?.label ?? "";
  })();

  const handleGenerate = async () => {
    const goalText = resolvedGoalText;
    if (!goalText || generating) return;
    setGenerating(true);
    setError(null);
    setActiveRoadmap(null);
    setProgress([]);
    setElapsedSec(0);
    progressIdRef.current = 0;

    const startedAt = Date.now();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);

    let createdGoalId: string | null = null;

    await streamRoadmapGenerate(
      { goal_text: goalText },
      {
        onStatus: (data) => {
          if (data.goal_id) createdGoalId = data.goal_id;
          pushProgress({
            label: data.message,
            elapsed: data.elapsed,
            kind: "status",
          });
        },
        onAgent: (data) => {
          if (data.type === "tool_call") {
            pushProgress({
              label: `🔧 ${data.name ?? "ツール"} 呼び出し`,
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
          } else if (data.type === "search_sources" && data.sources?.length) {
            pushProgress({
              label: `🔗 検索元 ${data.sources.length}件`,
              elapsed: data.elapsed,
              kind: "sources",
              sources: data.sources,
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
          createdGoalId = data.goal_id ?? createdGoalId;
          try {
            const list = await apiFetch<Roadmap[]>("/api/matching");
            setHistory(list);
            const fresh = list.find((r) => r.id === createdGoalId) ?? list[0];
            if (fresh) setActiveRoadmap(fresh);
          } catch (err) {
            setError(err instanceof Error ? err.message : "結果取得に失敗しました");
          } finally {
            setGenerating(false);
          }
        },
        onError: (err) => {
          if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
          }
          setError(err.message);
          setGenerating(false);
        },
      }
    );
  };

  const handleDeleteRoadmap = async (id: string) => {
    if (!confirm("このロードマップを削除しますか？")) return;
    try {
      await apiFetch(`/api/matching/${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((r) => r.id !== id));
      if (activeRoadmap?.id === id) setActiveRoadmap(null);
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">深掘りエージェントβ</h1>
          <p className="mt-1 text-sm text-gray-500">
            やりたいこと・目標を1つ選ぶと、ロードマップ・足りないスキル・鍛えること・参考になるYouTubeを提案します
          </p>
        </div>
      </div>

      {canUse && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">深掘りしたい目標を選択</p>
            {goalCandidates.length === 0 && (
              <p className="text-xs text-gray-500">
                「価値観発見」「やりたいこと・目標」で対話を進めるか、自由入力で指定してください。
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {goalCandidates.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => {
                    setSelectedKey(g.key);
                    setCustomGoal("");
                  }}
                  className={`max-w-full truncate rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    selectedKey === g.key && !customGoal
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              または自由入力
            </label>
            <input
              type="text"
              value={customGoal}
              onChange={(e) => {
                setCustomGoal(e.target.value);
                if (e.target.value) setSelectedKey(null);
              }}
              placeholder="例: バンジージャンプに挑戦したい"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating || !resolvedGoalText}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <HiOutlineSparkles className={`h-4 w-4 ${generating ? "animate-pulse" : ""}`} />
              {generating
                ? `深掘り中…（${elapsedSec}秒/${PIPELINE_TOTAL_SEC}秒）`
                : "深掘りする"}
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <HiOutlineClock className="h-4 w-4" />
              過去のロードマップ ({history.length})
            </button>
          </div>
        </div>
      )}

      {generating && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiOutlineCpuChip className="h-5 w-5 animate-pulse text-indigo-600" />
              <p className="text-sm font-medium text-indigo-700">エージェントが調査中</p>
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
            <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-md bg-white/60 p-3 text-xs text-gray-700">
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
                          : "text-gray-800"
                      }
                    >
                      {p.label}
                    </span>
                    {p.detail && (
                      <p className="truncate text-[11px] text-gray-500">{p.detail}</p>
                    )}
                    {p.sources && (
                      <ul className="mt-1 space-y-0.5">
                        {p.sources.slice(0, 5).map((s, i) => (
                          <li key={i} className="truncate text-[11px]">
                            <a
                              href={s.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline"
                            >
                              {s.title || s.uri}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {showHistory && history.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          {history.map((r) => (
            <div
              key={r.id}
              className={`flex items-center border-b border-gray-100 last:border-b-0 ${
                r.id === activeRoadmap?.id ? "bg-indigo-50" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveRoadmap(r)}
                className="flex flex-1 flex-col px-4 py-3 text-left text-sm hover:bg-gray-50"
              >
                <span className="truncate font-medium text-gray-800">
                  {r.goal_text}
                </span>
                {r.goal_summary && (
                  <span className="truncate text-xs text-gray-500">
                    {r.goal_summary}
                  </span>
                )}
                <span className="mt-0.5 text-[11px] text-gray-400">
                  {formatDate(r.generated_at)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRoadmap(r.id)}
                className="px-3 py-3 text-gray-400 hover:text-rose-600"
                aria-label="削除"
                title="削除"
              >
                <HiOutlineTrash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeRoadmap && (
        <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">
              深掘り対象
            </p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">
              {activeRoadmap.goal_text}
            </h2>
            {activeRoadmap.goal_summary && (
              <p className="mt-1 text-sm text-gray-500">
                {activeRoadmap.goal_summary}
              </p>
            )}
          </div>

          {activeRoadmap.roadmap && (
            <Section
              icon={<HiOutlineMap className="h-5 w-5 text-sky-600" />}
              title="ロードマップ"
            >
              <RoadmapTimeline
                steps={activeRoadmap.roadmap.short_term}
                label="短期"
                color="bg-sky-500"
              />
              <RoadmapTimeline
                steps={activeRoadmap.roadmap.mid_term}
                label="中期"
                color="bg-indigo-500"
              />
              <RoadmapTimeline
                steps={activeRoadmap.roadmap.long_term}
                label="長期"
                color="bg-violet-500"
              />
            </Section>
          )}

          {activeRoadmap.missing_skills && activeRoadmap.missing_skills.length > 0 && (
            <Section
              icon={<HiOutlineAcademicCap className="h-5 w-5 text-amber-600" />}
              title="足りないスキル"
            >
              <ul className="space-y-2">
                {activeRoadmap.missing_skills.map((s, i) => (
                  <li key={i} className="rounded-md border border-gray-200 p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{s.name}</span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] ${PRIORITY_BADGE[s.priority]}`}
                      >
                        {s.priority}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">{s.reason}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {activeRoadmap.training_actions && activeRoadmap.training_actions.length > 0 && (
            <Section
              icon={<HiOutlineFire className="h-5 w-5 text-rose-600" />}
              title="今後鍛えること"
            >
              <ul className="space-y-2">
                {activeRoadmap.training_actions.map((t, i) => (
                  <li key={i} className="rounded-md border border-gray-200 p-3">
                    <p className="font-medium text-gray-800">{t.title}</p>
                    <p className="mt-1 text-xs text-gray-600">{t.how}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">頻度: {t.frequency}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {activeRoadmap.youtube_suggestions && activeRoadmap.youtube_suggestions.length > 0 && (
            <Section
              icon={<HiOutlinePlayCircle className="h-5 w-5 text-red-600" />}
              title="参考になるYouTube提案"
            >
              <ul className="space-y-2">
                {activeRoadmap.youtube_suggestions.map((v, i) => (
                  <li key={i} className="rounded-md border border-gray-200 p-3">
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      ▶ {v.title}
                    </a>
                    <p className="mt-1 text-xs text-gray-600">{v.why}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        {icon}
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function RoadmapTimeline({
  steps,
  label,
  color,
}: {
  steps: RoadmapStep[];
  label: string;
  color: string;
}) {
  if (!steps || steps.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </div>
      <ul className="ml-4 space-y-2 border-l border-gray-200 pl-4">
        {steps.map((s, i) => (
          <li key={i}>
            <p className="text-sm font-medium text-gray-800">{s.title}</p>
            <p className="mt-0.5 text-xs text-gray-600">{s.description}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">期間: {s.duration}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

