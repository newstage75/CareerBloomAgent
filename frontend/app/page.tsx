"use client";

import { useEffect, useState } from "react";
import {
  HiOutlineSparkles,
  HiOutlineRocketLaunch,
  HiOutlineLightBulb,
  HiOutlineBookOpen,
  HiOutlineMap,
} from "react-icons/hi2";
import DashboardCard from "./components/DashboardCard";
import JourneyCard from "./components/journey/JourneyCard";
import JourneyProgress from "./components/journey/JourneyProgress";
import { apiFetch } from "./lib/api";
import { useAuth } from "./lib/auth";
import { usePublicConfig } from "./lib/config";
import type { JourneyStep, DashboardData } from "./types";

export default function Home() {
  const { user } = useAuth();
  const { config } = usePublicConfig();
  const canUse = !!user || !!config?.guest_enabled;
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!canUse) {
      setDashboard(null);
      return;
    }
    apiFetch<DashboardData>("/api/dashboard")
      .then(setDashboard)
      .catch(() => {});
  }, [canUse, user]);

  const sessionsCount = dashboard?.chat_sessions_count ?? 0;

  const journeySteps: JourneyStep[] = [
    { label: "発見", description: "価値観を深掘り", completed: sessionsCount >= 1 },
    { label: "設計", description: "ビジョンを描く", completed: sessionsCount >= 3 },
    { label: "インサイト", description: "まとめを確認", completed: sessionsCount >= 5 },
  ];

  const notesValue = dashboard ? `${dashboard.sparring_notes_count ?? 0} 件` : "0 件";
  const roadmapsValue = dashboard ? `${dashboard.roadmaps_count ?? 0} 件` : "0 件";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          あなたの『軸』を、言葉にする
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          思考のパートナーとしてのAIと、価値観や目標を整理します
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
          title="やりたいこと・目標"
          description="人生でやりたいこと・叶えたい目標をどんどん書き出します"
          href="/vision"
          icon={<HiOutlineRocketLaunch className="h-6 w-6 text-sky-600" />}
          accentColorClass="bg-sky-100"
          ctaLabel="目標を書き出す"
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
            title="深掘りエージェントβ"
            href="/matching"
            icon={<HiOutlineMap className="h-6 w-6" />}
            value={roadmapsValue}
            description="やりたいこと・目標を選んで、ロードマップとスキル・YouTubeを提案"
          />
          <DashboardCard
            title="知識ノートβ"
            href="/sparring/notes"
            icon={<HiOutlineBookOpen className="h-6 w-6" />}
            value={notesValue}
            description="知識の壁打ちで💡を付けた応答からAIがノートを編纂します"
          />
        </div>
      </section>
    </div>
  );
}
