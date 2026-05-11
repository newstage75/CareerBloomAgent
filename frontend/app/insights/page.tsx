"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HiOutlineHeart,
  HiOutlineRocketLaunch,
  HiOutlineStar,
  HiOutlineHashtag,
  HiOutlineTrophy,
  HiOutlineNoSymbol,
  HiOutlineSparkles,
} from "react-icons/hi2";
import type { UserInsights } from "@/app/types";
import { useAuth } from "@/app/lib/auth";
import { usePublicConfig } from "@/app/lib/config";
import { apiFetch } from "@/app/lib/api";
import InsightSection from "@/app/components/insights/InsightSection";
import ValueCard from "@/app/components/insights/ValueCard";
import VisionTimeline from "@/app/components/insights/VisionTimeline";
import RankedList from "@/app/components/insights/RankedList";

type ApiInsightsResponse =
  | { status: "empty"; message: string }
  | {
      values: {
        label: string;
        description: string;
        confidence: "high" | "medium" | "low";
        starred?: boolean;
      }[];
      vision: { short_term: string; mid_term: string; long_term: string };
      strengths: string[];
      themes: string[];
      bucket_list: { id: string; text: string }[];
      never_list: { id: string; text: string }[];
      generated_at: string;
    };

function mapApiToInsights(
  data: Exclude<ApiInsightsResponse, { status: "empty" }>
): UserInsights {
  return {
    values: data.values.map((v) => ({ ...v, starred: v.starred ?? false })),
    vision: {
      shortTerm: data.vision.short_term,
      midTerm: data.vision.mid_term,
      longTerm: data.vision.long_term,
    },
    strengths: data.strengths,
    themes: data.themes,
    bucketList: data.bucket_list,
    neverList: data.never_list,
  };
}

const MAX_VALUES_DISPLAY = 3;

export default function InsightsPage() {
  const { user, loading: authLoading } = useAuth();
  const { config } = usePublicConfig();
  const canUse = !!user || !!config?.guest_enabled;
  const [insights, setInsights] = useState<UserInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllValues, setShowAllValues] = useState(false);

  useEffect(() => {
    if (authLoading || !canUse) return;

    async function fetchInsights() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<ApiInsightsResponse>("/api/insights");
        if ("status" in data && data.status === "empty") {
          setInsights(null);
        } else {
          setInsights(
            mapApiToInsights(
              data as Exclude<ApiInsightsResponse, { status: "empty" }>
            )
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "インサイトの取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [canUse, authLoading]);

  const handleStarValue = async (label: string, starred: boolean) => {
    try {
      const data = await apiFetch<ApiInsightsResponse>("/api/insights/values/star", {
        method: "POST",
        body: JSON.stringify({ label, starred }),
      });
      if (!("status" in data)) {
        setInsights(mapApiToInsights(data));
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteValue = async (label: string) => {
    try {
      const data = await apiFetch<ApiInsightsResponse>("/api/insights/values/delete", {
        method: "POST",
        body: JSON.stringify({ label }),
      });
      if (!("status" in data)) {
        setInsights(mapApiToInsights(data));
      }
    } catch {
      // ignore
    }
  };

  const handleStarListItem = async (listName: string, itemId: string, starred: boolean) => {
    try {
      const data = await apiFetch<ApiInsightsResponse>("/api/insights/list/star", {
        method: "POST",
        body: JSON.stringify({ list_name: listName, item_id: itemId, starred }),
      });
      if (!("status" in data)) {
        setInsights(mapApiToInsights(data));
      }
    } catch {
      // ignore
    }
  };

  const [visionInstruction, setVisionInstruction] = useState("");
  const [visionEditing, setVisionEditing] = useState(false);
  const handleEditVision = async () => {
    const instruction = visionInstruction.trim();
    if (!instruction || visionEditing) return;
    setVisionEditing(true);
    try {
      const data = await apiFetch<ApiInsightsResponse>("/api/insights/vision/edit", {
        method: "POST",
        body: JSON.stringify({ instruction }),
      });
      if (!("status" in data)) {
        setInsights(mapApiToInsights(data));
      }
      setVisionInstruction("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ビジョンの編集に失敗しました");
    } finally {
      setVisionEditing(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const data = await apiFetch<ApiInsightsResponse>("/api/insights/generate", {
        method: "POST",
      });
      if ("status" in data && data.status === "empty") {
        setInsights(null);
      } else {
        setInsights(
          mapApiToInsights(
            data as Exclude<ApiInsightsResponse, { status: "empty" }>
          )
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "インサイトの生成に失敗しました"
      );
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">マイ・インサイト</h1>
          <p className="mt-1 text-sm text-gray-500">
            AIとの対話から自動生成されたあなたの価値観・ビジョンのまとめ
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">マイ・インサイト</h1>
          <p className="mt-1 text-sm text-gray-500">
            AIとの対話から自動生成されたあなたの価値観・ビジョンのまとめ
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            まだインサイトがありません。まずはAIとの対話を始めましょう。
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              href="/discover"
              className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              価値観発見を始める
            </Link>
            {canUse && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-1.5 rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
              >
                <HiOutlineSparkles className="h-4 w-4" />
                {generating ? "生成中..." : "インサイトを生成"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">マイ・インサイト</h1>
          <p className="mt-1 text-sm text-gray-500">
            AIとの対話から自動生成されたあなたの価値観・ビジョンのまとめ
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <HiOutlineSparkles className="h-4 w-4" />
          {generating ? "生成中..." : "再生成"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <InsightSection
        title="価値観"
        icon={<HiOutlineHeart className="h-5 w-5" />}
      >
        <div className="space-y-3">
          {(() => {
            // Starred values always shown first, then recent up to MAX
            const starred = insights.values.filter((v) => v.starred);
            const unstarred = insights.values.filter((v) => !v.starred);
            const displayed = showAllValues
              ? [...starred, ...unstarred]
              : [...starred, ...unstarred.slice(0, MAX_VALUES_DISPLAY - starred.length)];
            return (
              <>
                {displayed.map((v) => (
                  <ValueCard
                    key={v.label}
                    {...v}
                    onStar={handleStarValue}
                    onDelete={handleDeleteValue}
                  />
                ))}
                {!showAllValues && insights.values.length > MAX_VALUES_DISPLAY && (
                  <button
                    type="button"
                    onClick={() => setShowAllValues(true)}
                    className="w-full rounded-md border border-gray-200 py-2 text-sm text-gray-500 hover:bg-gray-50"
                  >
                    すべて表示（{insights.values.length}件）
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </InsightSection>

      <InsightSection
        title="キャリアビジョン"
        icon={<HiOutlineRocketLaunch className="h-5 w-5" />}
      >
        <VisionTimeline {...insights.vision} />
        {canUse && (
          <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              AIに指示してビジョンを編集
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={visionInstruction}
                onChange={(e) => setVisionInstruction(e.target.value)}
                placeholder="例: 3-5年後に独立するにして"
                disabled={visionEditing}
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-60"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditVision();
                }}
              />
              <button
                type="button"
                onClick={handleEditVision}
                disabled={visionEditing || !visionInstruction.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <HiOutlineSparkles className="h-4 w-4" />
                {visionEditing ? "編集中..." : "編集"}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              指示が一部のフィールドだけに言及している場合、他は元のまま残ります
            </p>
          </div>
        )}
      </InsightSection>

      <InsightSection
        title="強み"
        icon={<HiOutlineStar className="h-5 w-5" />}
      >
        <div className="flex flex-wrap gap-2">
          {insights.strengths.map((s) => (
            <span
              key={s}
              className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700"
            >
              {s}
            </span>
          ))}
        </div>
      </InsightSection>

      <InsightSection
        title="テーマ"
        icon={<HiOutlineHashtag className="h-5 w-5" />}
      >
        <div className="flex flex-wrap gap-2">
          {insights.themes.map((t) => (
            <span
              key={t}
              className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700"
            >
              {t}
            </span>
          ))}
        </div>
      </InsightSection>

      <InsightSection
        title="人生で成し遂げたいリスト"
        icon={<HiOutlineTrophy className="h-5 w-5 text-emerald-500" />}
      >
        <RankedList
          initialItems={insights.bucketList}
          onStar={(id, starred) => handleStarListItem("bucket_list", id, starred)}
        />
      </InsightSection>

      <InsightSection
        title="人生でやりたくないことリスト"
        icon={<HiOutlineNoSymbol className="h-5 w-5 text-rose-500" />}
      >
        <RankedList
          initialItems={insights.neverList}
          onStar={(id, starred) => handleStarListItem("never_list", id, starred)}
        />
      </InsightSection>
    </div>
  );
}
