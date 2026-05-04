import { HiOutlineBriefcase } from "react-icons/hi2";
import Link from "next/link";

const mockResults = [
  {
    id: 1,
    company: "テック株式会社",
    position: "フルスタックエンジニア",
    score: 85,
    tags: ["React", "Node.js", "AWS"],
  },
  {
    id: 2,
    company: "イノベーション合同会社",
    position: "バックエンドエンジニア",
    score: 72,
    tags: ["Python", "FastAPI", "GCP"],
  },
  {
    id: 3,
    company: "グローバルシステムズ",
    position: "クラウドエンジニア",
    score: 68,
    tags: ["AWS", "Terraform", "Docker"],
  },
];

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600 bg-green-50";
  if (score >= 60) return "text-yellow-600 bg-yellow-50";
  return "text-gray-600 bg-gray-50";
}

export default function MatchingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">マッチング結果</h1>
        <p className="mt-1 text-sm text-gray-500">
          あなたのスキルに基づいたAIマッチング結果です（サンプルデータ）
        </p>
      </div>

      <ul className="space-y-4">
        {mockResults.map((result) => (
          <li
            key={result.id}
            className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <HiOutlineBriefcase className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {result.position}
                  </h3>
                  <p className="text-sm text-gray-500">{result.company}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${scoreColor(result.score)}`}
                >
                  {result.score}%
                </span>
              </div>
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

      <p className="text-center text-sm text-gray-400">
        スキル情報を追加すると、より精度の高いマッチング結果が表示されます。
        <Link href="/skills" className="ml-1 text-indigo-600 hover:underline">
          スキルを登録する →
        </Link>
      </p>
    </div>
  );
}
