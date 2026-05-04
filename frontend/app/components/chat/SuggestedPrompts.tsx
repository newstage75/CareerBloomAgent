type Props = {
  prompts: string[];
  onSelect: (prompt: string) => void;
};

export default function SuggestedPrompts({ prompts, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
