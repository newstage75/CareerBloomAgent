"use client";

import { useRef, useEffect, useState } from "react";
import type { ChatMessage as ChatMessageType, ChatMode } from "@/app/types";
import { streamChat } from "@/app/lib/api";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import SuggestedPrompts from "./SuggestedPrompts";

type Props = {
  mode: ChatMode;
  title: string;
  subtitle: string;
  initialGreeting: string;
  suggestedPrompts: string[];
};

export default function ChatInterface({
  mode,
  title,
  subtitle,
  initialGreeting,
  suggestedPrompts,
}: Props) {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    { id: 1, role: "assistant", content: initialGreeting },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessageType = {
      id: Date.now(),
      role: "user",
      content: text,
    };

    const assistantId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setIsStreaming(true);

    await streamChat(text, sessionId, mode, {
      onSession: (sid) => setSessionId(sid),
      onChunk: (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      },
      onDone: () => setIsStreaming(false),
      onError: (err) => {
        console.error("Chat error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "申し訳ありません。エラーが発生しました。もう一度お試しください。" }
              : m
          )
        );
        setIsStreaming(false);
      },
    });
  };

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt);
  };

  const showSuggestions = messages.length <= 1;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>

      <div className="mt-4 flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
          ))}
          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-400">
                入力中...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {showSuggestions && (
          <SuggestedPrompts
            prompts={suggestedPrompts}
            onSelect={handlePromptSelect}
          />
        )}

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          placeholder="メッセージを入力..."
          disabled={isStreaming}
        />
      </div>
    </div>
  );
}
