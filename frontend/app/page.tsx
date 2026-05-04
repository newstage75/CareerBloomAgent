"use client";

import { useEffect, useState } from "react";
import {
  HiOutlineSparkles,
  HiOutlineRocketLaunch,
  HiOutlineLightBulb,
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
} from "react-icons/hi2";
import DashboardCard from "./components/DashboardCard";
import JourneyCard from "./components/journey/JourneyCard";
import JourneyProgress from "./components/journey/JourneyProgress";
import { apiFetch } from "./lib/api";
import { useAuth } from "./lib/auth";
import type { JourneyStep, DashboardData } from "./types";

export default function Home() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!user) {
      setDashboard(null);
      return;
    }
    apiFetch<DashboardData>("/api/dashboard")
      .then(setDashboard)
      .catch(() => {});
  }, [user]);

  const sessionsCount = dashboard?.chat_sessions_count ?? 0;

  const journeySteps: JourneyStep[] = [
    { label: "発見", description: "価値観を深掘り", completed: sessionsCount >= 1 },
    { label: "設計", description: "ビジョンを描く", completed: sessionsCount >= 3 },
    { label: "インサイト", description: "まとめを確認", completed: sessionsCount >= 5 },
  ];

  const skillsValue = dashboard ? `${dashboard.skills_count} 件` : "0 件";
  const matchValue = dashboard?.top_match_score
    ? `${dashboard.top_match_score}%`
    : "-- %";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          あなたのキャリアに花を咲かせよう
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          AIとの対話を通じて、自分の価値観を発見し、理想のキャリアを描きましょう
        </p>
      </div>

      <div className="flex justify-center">
        <JourneyProgress steps={journeySteps} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <JourneyCard
          title="価値観発見"
          description="AIとの対話で、仕事で大切にしている価値観を深掘りします"
          href="/discover"
          icon={<HiOutlineSparkles className="h-6 w-6 text-violet-600" />}
          accentColorClass="bg-violet-100"
          ctaLabel="対話を始める"
        />
        <JourneyCard
          title="将来設計"
          description="キャリアビジョンを描き、具体的なアクションプランを考えます"
          href="/vision"
          icon={<HiOutlineRocketLaunch className="h-6 w-6 text-sky-600" />}
          accentColorClass="bg-sky-100"
          ctaLabel="ビジョンを描く"
        />
        <JourneyCard
          title="マイ・インサイト"
          description="対話から自動生成された、あなたの価値観・ビジョンのまとめ"
          href="/insights"
          icon={<HiOutlineLightBulb className="h-6 w-6 text-amber-600" />}
          accentColorClass="bg-amber-100"
          ctaLabel="インサイトを見る"
        />
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          ツール
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <DashboardCard
            title="スキル"
            href="/skills"
            icon={<HiOutlineAcademicCap className="h-6 w-6" />}
            value={skillsValue}
            description="スキルを登録してマッチング精度を上げましょう"
          />
          <DashboardCard
            title="マッチング"
            href="/matching"
            icon={<HiOutlineBriefcase className="h-6 w-6" />}
            value={matchValue}
            description="価値観とスキルに基づいた企業マッチング"
          />
        </div>
      </section>
    </div>
  );
}
