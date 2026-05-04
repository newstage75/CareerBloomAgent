import type { ValueChangeEntry } from "../../types";
import HistoryTimelineEntry from "./HistoryTimelineEntry";

export default function HistoryTimeline({ entries }: { entries: ValueChangeEntry[] }) {
  return (
    <div className="relative pl-1.5">
      <div className="absolute left-[11px] top-2 bottom-0 w-0.5 bg-violet-200" />
      {entries.map((entry) => (
        <HistoryTimelineEntry key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
