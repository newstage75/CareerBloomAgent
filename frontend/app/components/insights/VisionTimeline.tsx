import type { VisionSummary } from "@/app/types";

const steps = [
  { key: "shortTerm" as const, label: "1-2年", color: "bg-sky-500" },
  { key: "midTerm" as const, label: "3-5年", color: "bg-sky-400" },
  { key: "longTerm" as const, label: "10年", color: "bg-sky-300" },
];

export default function VisionTimeline({ shortTerm, midTerm, longTerm }: VisionSummary) {
  const data: VisionSummary = { shortTerm, midTerm, longTerm };

  return (
    <div className="relative space-y-6 pl-6">
      <div className="absolute left-2.5 top-1 bottom-1 w-0.5 bg-sky-200" />
      {steps.map((step) => (
        <div key={step.key} className="relative">
          <div
            className={`absolute -left-6 top-1 h-5 w-5 rounded-full ${step.color} flex items-center justify-center`}
          >
            <div className="h-2 w-2 rounded-full bg-white" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
              {step.label}
            </span>
            <p className="mt-1 text-sm text-gray-700">{data[step.key]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
