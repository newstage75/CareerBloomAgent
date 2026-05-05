"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ValueChangeEntry } from "../types";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import HistoryTimeline from "../components/history/HistoryTimeline";

type HistoryResponse = {
  entries: {
    id: string;
    date: string;
    category: string;
    title: string;
    description: string;
    source?: string;
  }[];
  total: number;
};

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<ValueChangeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }

    apiFetch<HistoryResponse>("/api/history")
      .then((data) => {
        setEntries(
          data.entries.map((e) => ({
            id: e.id,
            date: e.date ? new Date(e.date).toLocaleDateString("ja-JP") : "",
            category: e.category as ValueChangeEntry["category"],
            title: e.title,
            description: e.description,
            source: (e.source as ValueChangeEntry["source"]) ?? null,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-bold text-gray-900">価値観の変遷</h1>
        <p className="mt-1 text-sm text-gray-500">
          AIとの対話を通じて、あなたの価値観がどのように変化・明確化してきたかを振り返ります。
        </p>
        <div className="mt-8 flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-gray-500">まだ変遷の記録がありません。</p>
        <Link
          href="/discover"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          価値観発見を始める
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">価値観の変遷</h1>
        <p className="mt-1 text-sm text-gray-500">
          AIとの対話を通じて、あなたの価値観がどのように変化・明確化してきたかを振り返ります。
        </p>
        <div className="mt-8">
          <HistoryTimeline entries={entries} />
        </div>
      </div>
    </div>
  );
}
