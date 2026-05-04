import Link from "next/link";
import type { ValueChangeEntry } from "../types";
import HistoryTimeline from "../components/history/HistoryTimeline";

const mockEntries: ValueChangeEntry[] = [
  {
    id: "1",
    date: "2026-04-10",
    category: "discovered",
    title: "チームワーク重視を発見",
    description: "対話の中で、個人の成果よりもチームで協力して達成する喜びに強く反応していることが明らかになりました。",
    source: "discover",
  },
  {
    id: "2",
    date: "2026-04-15",
    category: "discovered",
    title: "成長実感への渇望",
    description: "安定よりも日々新しいことを学び、スキルが伸びている実感を得られる環境を求めていることがわかりました。",
    source: "discover",
  },
  {
    id: "3",
    date: "2026-04-20",
    category: "strengthened",
    title: "社会貢献の優先度UP",
    description: "複数回の対話を通じて、社会課題の解決に関わりたいという思いが一貫して強く表れています。",
    source: "discover",
  },
  {
    id: "4",
    date: "2026-04-28",
    category: "vision_updated",
    title: "ビジョン：社会課題解決へシフト",
    description: "将来設計の対話で、テクノロジーを活用した社会課題解決を中長期キャリアの軸に据える方向が明確になりました。",
    source: "vision",
  },
  {
    id: "5",
    date: "2026-05-03",
    category: "shifted",
    title: "成長実感を最重視に",
    description: "当初はワークライフバランスを重視していましたが、対話を重ねる中で成長実感が最も重要な価値観であると認識が変化しました。",
    source: "discover",
  },
];

export default function HistoryPage() {
  const entries = mockEntries;

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
