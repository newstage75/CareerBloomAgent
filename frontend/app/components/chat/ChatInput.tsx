"use client";

import { useEffect, useRef } from "react";
import { HiPaperAirplane } from "react-icons/hi2";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function ChatInput({ value, onChange, onSend, placeholder, disabled }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自動リサイズ（最大8行）
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 8 * 24)}px`;
  }, [value]);

  return (
    <div className="border-t border-gray-200 p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled && value.trim()) onSend();
        }}
        className="flex items-end gap-2"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            // IME変換中（日本語入力の確定キーなど）は無視
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            // Shift+Enter は改行
            if (e.shiftKey) return;
            // タッチデバイス（スマホ・タブレット）では Enter = 改行
            if (
              typeof window !== "undefined" &&
              window.matchMedia("(pointer: coarse)").matches
            ) {
              return;
            }
            // PC + Enter のみ送信
            e.preventDefault();
            if (!disabled && value.trim()) onSend();
          }}
          placeholder={placeholder ?? "メッセージを入力..."}
          disabled={disabled}
          className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="flex shrink-0 items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <HiPaperAirplane className="h-4 w-4" />
          <span className="hidden sm:inline">送信</span>
        </button>
      </form>
    </div>
  );
}
