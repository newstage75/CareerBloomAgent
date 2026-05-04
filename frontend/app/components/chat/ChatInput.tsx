import { HiPaperAirplane } from "react-icons/hi2";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function ChatInput({ value, onChange, onSend, placeholder, disabled }: Props) {
  return (
    <div className="border-t border-gray-200 p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled) onSend();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "メッセージを入力..."}
          disabled={disabled}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          type="submit"
          disabled={disabled}
          className="flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <HiPaperAirplane className="h-4 w-4" />
          送信
        </button>
      </form>
    </div>
  );
}
