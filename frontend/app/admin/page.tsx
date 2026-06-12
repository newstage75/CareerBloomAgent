"use client";

import { useEffect, useState } from "react";
import {
  HiOutlineUsers,
  HiOutlineCpuChip,
  HiOutlineGlobeAlt,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import type { ComponentType } from "react";
import { useAuth } from "../lib/auth";
import { usePublicConfig } from "../lib/config";
import { apiFetch } from "../lib/api";

type AdminStats = {
  users_total: number;
  logical_date: string;
  guest_enabled: boolean;
  quotas: { ai_total: number; deep_research: number };
  usage: { total: number; deep_research: number };
};

type AdminUser = {
  uid: string;
  email: string | null;
  display_name: string | null;
  photo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  counts: {
    chat_sessions: number;
    skills: number;
    roadmaps: number;
    sparring_notes: number;
  };
};

type DailyUsage = {
  date: string; // YYYYMMDD
  total: number;
  deep_research: number;
};

const USAGE_DAYS = 14;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ja-JP");
}

function formatYyyymmdd(date: string): string {
  return `${parseInt(date.slice(4, 6), 10)}/${parseInt(date.slice(6, 8), 10)}`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="h-5 w-5" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function UsageBarChart({ days }: { days: DailyUsage[] }) {
  const max = Math.max(...days.map((d) => d.total), 1);
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5">
        {days.map((d) => {
          const totalPct = d.total > 0 ? Math.max((d.total / max) * 100, 3) : 0;
          const drPct =
            d.deep_research > 0
              ? Math.max((d.deep_research / max) * 100, 3)
              : 0;
          return (
            <div
              key={d.date}
              className="group relative flex h-full flex-1 flex-col justify-end"
              title={`${formatYyyymmdd(d.date)} — AI呼び出し: ${d.total} / Deep Research: ${d.deep_research}`}
            >
              <div
                className="relative w-full rounded-t bg-indigo-400 transition-colors group-hover:bg-indigo-500"
                style={{ height: `${totalPct}%` }}
              >
                <div
                  className="absolute bottom-0 w-full rounded-t bg-amber-400"
                  style={{ height: `${(drPct / Math.max(totalPct, 1)) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1.5">
        {days.map((d, i) => (
          <div
            key={d.date}
            className="flex-1 text-center text-[10px] text-gray-400"
          >
            {(days.length - 1 - i) % 2 === 0 ? formatYyyymmdd(d.date) : ""}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-indigo-400" />
          AI呼び出し合計
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-400" />
          うちDeep Research
        </span>
      </div>
    </div>
  );
}

function UsersTable({ users }: { users: AdminUser[] }) {
  if (users.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        登録ユーザーはまだいません。
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-400">
            <th className="px-3 py-2 font-semibold">ユーザー</th>
            <th className="px-3 py-2 font-semibold">登録日</th>
            <th className="px-3 py-2 font-semibold">最終利用</th>
            <th className="px-3 py-2 text-right font-semibold">セッション</th>
            <th className="px-3 py-2 text-right font-semibold">スキル</th>
            <th className="px-3 py-2 text-right font-semibold">ロードマップ</th>
            <th className="px-3 py-2 text-right font-semibold">ノート</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid} className="border-b border-gray-100">
              <td className="px-3 py-2">
                <p className="font-medium text-gray-900">
                  {u.display_name ?? "（名前未設定）"}
                </p>
                <p className="text-xs text-gray-500">{u.email ?? u.uid}</p>
              </td>
              <td className="px-3 py-2 text-gray-600">
                {formatDate(u.created_at)}
              </td>
              <td className="px-3 py-2 text-gray-600">
                {formatDate(u.updated_at)}
              </td>
              <td className="px-3 py-2 text-right text-gray-700">
                {u.counts.chat_sessions}
              </td>
              <td className="px-3 py-2 text-right text-gray-700">
                {u.counts.skills}
              </td>
              <td className="px-3 py-2 text-right text-gray-700">
                {u.counts.roadmaps}
              </td>
              <td className="px-3 py-2 text-right text-gray-700">
                {u.counts.sparring_notes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { config } = usePublicConfig();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [daily, setDaily] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    Promise.all([
      apiFetch<AdminStats>("/api/admin/stats"),
      apiFetch<{ users: AdminUser[] }>("/api/admin/users"),
      apiFetch<{ days: DailyUsage[] }>(
        `/api/admin/usage/daily?days=${USAGE_DAYS}`
      ),
    ])
      .then(([statsData, usersData, dailyData]) => {
        setStats(statsData);
        setUsers(usersData.users);
        setDaily(dailyData.days);
      })
      .catch((err: Error & { status?: number }) => {
        if (err.status === 403) {
          setForbidden(true);
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!user || forbidden) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="font-medium text-gray-700">
          {!user
            ? "管理者ダッシュボードを利用するにはログインが必要です。"
            : "このアカウントには管理者権限がありません。"}
        </p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-gray-500">データの取得に失敗しました。</p>
        {error && <p className="text-xs text-gray-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900">
          管理者ダッシュボード
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          サイト全体の利用状況（論理日付: {formatYyyymmdd(stats.logical_date)}
          、毎朝{config?.reset_hour_jst ?? 4}時リセット）
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={HiOutlineUsers}
            label="登録ユーザー"
            value={`${stats.users_total}人`}
          />
          <StatCard
            icon={HiOutlineCpuChip}
            label="本日のAI呼び出し"
            value={`${stats.usage.total}`}
            sub={`上限 ${stats.quotas.ai_total}`}
          />
          <StatCard
            icon={HiOutlineGlobeAlt}
            label="本日のDeep Research"
            value={`${stats.usage.deep_research}`}
            sub={`上限 ${stats.quotas.deep_research}`}
          />
          <StatCard
            icon={HiOutlineUserGroup}
            label="ゲストモード"
            value={stats.guest_enabled ? "ON" : "OFF"}
          />
        </div>

        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            日次クォータ消費（過去{USAGE_DAYS}日）
          </h2>
          <div className="mt-4">
            <UsageBarChart days={daily} />
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            ユーザー一覧
            <span className="ml-2 text-sm font-normal text-gray-400">
              最新{users.length}件
            </span>
          </h2>
          <div className="mt-4">
            <UsersTable users={users} />
          </div>
        </section>
      </div>
    </div>
  );
}
