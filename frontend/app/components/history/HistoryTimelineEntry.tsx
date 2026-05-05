import type { ValueChangeCategory, ValueChangeEntry } from "../../types";

const categoryStyles: Record<ValueChangeCategory, { dot: string; badge: string; label: string }> = {
  discovered: { dot: "bg-violet-500", badge: "bg-violet-100 text-violet-700", label: "新発見" },
  strengthened: { dot: "bg-green-500", badge: "bg-green-100 text-green-700", label: "確信度UP" },
  shifted: { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700", label: "変化" },
  vision_updated: { dot: "bg-sky-500", badge: "bg-sky-100 text-sky-700", label: "ビジョン更新" },
  removed: { dot: "bg-rose-500", badge: "bg-rose-100 text-rose-700", label: "削除" },
};

const sourceLabels: Record<string, string> = {
  discover: "価値観発見",
  vision: "やりたいこと・目標",
};

export default function HistoryTimelineEntry({ entry }: { entry: ValueChangeEntry }) {
  const style = categoryStyles[entry.category];

  return (
    <div className="relative flex items-start gap-4 pb-8">
      <div className={`relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full ${style.dot}`} />
      <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <time className="text-xs text-gray-500">{entry.date}</time>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>
            {style.label}
          </span>
          {entry.source && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {sourceLabels[entry.source]}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{entry.title}</h3>
        <p className="mt-1 text-sm text-gray-600">{entry.description}</p>
      </div>
    </div>
  );
}
