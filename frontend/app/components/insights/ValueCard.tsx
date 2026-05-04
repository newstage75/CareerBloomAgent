import type { ValueItem } from "@/app/types";

const confidenceStyles = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
} as const;

const confidenceLabel = {
  high: "高",
  medium: "中",
  low: "低",
} as const;

export default function ValueCard({ label, description, confidence }: ValueItem) {
  return (
    <div className="rounded-lg border-l-4 border-violet-400 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{label}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${confidenceStyles[confidence]}`}
        >
          確信度: {confidenceLabel[confidence]}
        </span>
      </div>
    </div>
  );
}
