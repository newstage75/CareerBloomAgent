"use client";

import { HiStar, HiOutlineStar, HiOutlineTrash } from "react-icons/hi2";
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

type Props = ValueItem & {
  onStar?: (label: string, starred: boolean) => void;
  onDelete?: (label: string) => void;
};

export default function ValueCard({ label, description, confidence, starred, onStar, onDelete }: Props) {
  return (
    <div className="rounded-lg border-l-4 border-violet-400 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{label}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${confidenceStyles[confidence]}`}
          >
            確信度: {confidenceLabel[confidence]}
          </span>
          {onStar && (
            <button
              type="button"
              onClick={() => onStar(label, !starred)}
              className="rounded p-1 text-gray-400 hover:text-amber-500"
              title={starred ? "スターを外す" : "スターを付ける"}
            >
              {starred ? (
                <HiStar className="h-5 w-5 text-amber-500" />
              ) : (
                <HiOutlineStar className="h-5 w-5" />
              )}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(label)}
              className="rounded p-1 text-gray-400 hover:text-rose-500"
              title="削除"
            >
              <HiOutlineTrash className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
