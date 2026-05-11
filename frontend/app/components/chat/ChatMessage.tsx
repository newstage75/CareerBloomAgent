"use client";

import { HiOutlineLightBulb, HiLightBulb } from "react-icons/hi2";
import type { ChatRole } from "@/app/types";

type Props = {
  role: ChatRole;
  content: string;
  liked?: boolean;
  onToggleLike?: () => void;
};

export default function ChatMessage({ role, content, liked, onToggleLike }: Props) {
  const isAssistant = role === "assistant";
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div className="flex max-w-[85%] flex-col gap-1">
        <div
          className={`rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
            role === "user"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {content}
        </div>
        {isAssistant && onToggleLike && content && (
          <button
            type="button"
            onClick={onToggleLike}
            className={`self-start inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors ${
              liked
                ? "bg-amber-100 text-amber-700"
                : "text-gray-400 hover:bg-gray-100 hover:text-amber-600"
            }`}
            title={liked ? "いいね解除" : "知識として残す"}
          >
            {liked ? <HiLightBulb className="h-3.5 w-3.5" /> : <HiOutlineLightBulb className="h-3.5 w-3.5" />}
            {liked ? "残した" : "知識として残す"}
          </button>
        )}
      </div>
    </div>
  );
}
