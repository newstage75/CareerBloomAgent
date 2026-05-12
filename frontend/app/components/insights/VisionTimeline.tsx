"use client";

import type { VisionSummary } from "@/app/types";

type Props = VisionSummary & {
  editable?: boolean;
  onChangeLabel?: (
    axis: "short_term" | "mid_term" | "long_term",
    label: string
  ) => void;
  onChangeContent?: (
    axis: "short_term" | "mid_term" | "long_term",
    content: string
  ) => void;
};

// 全軸共通の選択肢（1ヶ月〜20年）+ 各軸のデフォルトの「短期/中期/長期」
const LABEL_OPTIONS: readonly string[] = [
  "短期",
  "中期",
  "長期",
  "1ヶ月後",
  "3ヶ月後",
  "半年後",
  "1年後",
  "2年後",
  "3年後",
  "5年後",
  "7年後",
  "10年後",
  "15年後",
  "20年後",
];

const DEFAULTS = { short: "短期", mid: "中期", long: "長期" } as const;

export default function VisionTimeline({
  shortTerm,
  midTerm,
  longTerm,
  shortTermLabel,
  midTermLabel,
  longTermLabel,
  editable,
  onChangeLabel,
  onChangeContent,
}: Props) {
  const rows: {
    key: "short" | "mid" | "long";
    axis: "short_term" | "mid_term" | "long_term";
    label: string;
    color: string;
    content: string;
  }[] = [
    {
      key: "short",
      axis: "short_term",
      label: shortTermLabel?.trim() || DEFAULTS.short,
      color: "bg-sky-500",
      content: shortTerm,
    },
    {
      key: "mid",
      axis: "mid_term",
      label: midTermLabel?.trim() || DEFAULTS.mid,
      color: "bg-sky-400",
      content: midTerm,
    },
    {
      key: "long",
      axis: "long_term",
      label: longTermLabel?.trim() || DEFAULTS.long,
      color: "bg-sky-300",
      content: longTerm,
    },
  ];

  return (
    <div className="relative space-y-6 pl-6">
      <div className="absolute left-2.5 top-1 bottom-1 w-0.5 bg-sky-200" />
      {rows.map((row) => {
        // 現ラベルが既定リストにない場合は先頭に追加して保持
        const allOptions = LABEL_OPTIONS.includes(row.label)
          ? LABEL_OPTIONS
          : [row.label, ...LABEL_OPTIONS];
        return (
          <div key={row.key} className="relative">
            <div
              className={`absolute -left-6 top-1 h-5 w-5 rounded-full ${row.color} flex items-center justify-center`}
            >
              <div className="h-2 w-2 rounded-full bg-white" />
            </div>
            <div>
              {editable && onChangeLabel ? (
                <select
                  value={row.label}
                  onChange={(e) => onChangeLabel(row.axis, e.target.value)}
                  className="rounded border border-sky-200 bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-sky-700 focus:border-sky-500 focus:outline-none"
                >
                  {allOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
                  {row.label}
                </span>
              )}
              {editable && onChangeContent ? (
                <textarea
                  value={row.content}
                  onChange={(e) => onChangeContent(row.axis, e.target.value)}
                  rows={2}
                  className="mt-1 w-full resize-y rounded border border-gray-200 px-2 py-1 text-sm text-gray-700 focus:border-sky-500 focus:outline-none"
                  placeholder="目標やビジョンを書いてください"
                />
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                  {row.content}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
