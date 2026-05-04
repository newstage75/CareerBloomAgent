import type { JourneyStep } from "@/app/types";

type Props = {
  steps: JourneyStep[];
};

export default function JourneyProgress({ steps }: Props) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                step.completed
                  ? "bg-indigo-600 text-white"
                  : "border-2 border-gray-300 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            <span className="mt-1.5 text-xs font-medium text-gray-600">
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mx-3 mb-5 h-0.5 w-12 sm:w-20 ${
                step.completed ? "bg-indigo-600" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
