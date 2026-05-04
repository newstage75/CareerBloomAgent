import {
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
  HiOutlineChatBubbleLeftRight,
} from "react-icons/hi2";
import DashboardCard from "./components/DashboardCard";

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500">
          CareerBloomAgentへようこそ。あなたのキャリアの概要を確認できます。
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="登録スキル"
          href="/skills"
          icon={<HiOutlineAcademicCap className="h-6 w-6" />}
          value="0 件"
          description="スキルを登録してマッチング精度を上げましょう"
        />
        <DashboardCard
          title="マッチングスコア"
          href="/matching"
          icon={<HiOutlineBriefcase className="h-6 w-6" />}
          value="-- %"
          description="スキル登録後にマッチング結果を確認できます"
        />
        <DashboardCard
          title="チャット履歴"
          href="/chat"
          icon={<HiOutlineChatBubbleLeftRight className="h-6 w-6" />}
          value="0 件"
          description="AIアドバイザーにキャリア相談しましょう"
        />
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">はじめに</h2>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-gray-600">
          <li>
            <strong>スキルを登録</strong> — 「スキル管理」ページであなたの経験・スキルを入力
          </li>
          <li>
            <strong>AIに相談</strong> — 「AIチャット」でキャリアの方向性を相談
          </li>
          <li>
            <strong>マッチング確認</strong> — AIが分析した求人マッチング結果を確認
          </li>
        </ol>
      </section>
    </div>
  );
}
