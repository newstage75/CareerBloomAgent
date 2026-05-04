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
    values: data.values,
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

export default function InsightsPage() {
  const { user, loading: authLoading } = useAuth();
  const [insights, setInsights] = useState<UserInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

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
  }, [user, authLoading]);

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
            {user && (
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
          {insights.values.map((v) => (
            <ValueCard key={v.label} {...v} />
          ))}
        </div>
      </InsightSection>

      <InsightSection
        title="キャリアビジョン"
        icon={<HiOutlineRocketLaunch className="h-5 w-5" />}
      >
        <VisionTimeline {...insights.vision} />
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
        <RankedList initialItems={insights.bucketList} />
      </InsightSection>

      <InsightSection
        title="人生でやりたくないことリスト"
        icon={<HiOutlineNoSymbol className="h-5 w-5 text-rose-500" />}
      >
        <RankedList initialItems={insights.neverList} />
      </InsightSection>
    </div>
  );
}
