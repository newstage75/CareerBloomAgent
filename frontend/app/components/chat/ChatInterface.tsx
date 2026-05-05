"use client";

import { useRef, useEffect, useState } from "react";
import { HiOutlinePlus, HiOutlineClock } from "react-icons/hi2";
import type { ChatMessage as ChatMessageType, ChatMode } from "@/app/types";
import { apiFetch, streamChat } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import SuggestedPrompts from "./SuggestedPrompts";

type SessionSummary = {
  id: string;
  mode: string | null;
  messages: { role: string; content: string }[];
  created_at: string;
  updated_at: string;
};

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
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessageType[]>([
    { id: 1, role: "assistant", content: initialGreeting },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load sessions on mount
  useEffect(() => {
    if (authLoading || !user) {
      setLoadingSession(false);
      return;
    }

    apiFetch<SessionSummary[]>(`/api/chat/sessions?mode=${mode}`)
      .then((data) => {
        setSessions(data);
        // Restore the most recent session if it has messages
        if (data.length > 0 && data[0].messages.length > 0) {
          const latest = data[0];
          setSessionId(latest.id);
          setMessages(
            latest.messages.map((m, i) => ({
              id: i + 1,
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSession(false));
  }, [user, authLoading, mode]);

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

  const handleNewSession = () => {
    setSessionId(null);
    setMessages([{ id: 1, role: "assistant", content: initialGreeting }]);
    setShowHistory(false);
  };

  const handleSelectSession = (session: SessionSummary) => {
    setSessionId(session.id);
    setMessages(
      session.messages.map((m, i) => ({
        id: i + 1,
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    );
    setShowHistory(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const showSuggestions = messages.length <= 1 && !sessionId;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          {sessions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <HiOutlineClock className="h-4 w-4" />
              履歴
            </button>
          )}
          {sessionId && (
            <button
              type="button"
              onClick={handleNewSession}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
            >
              <HiOutlinePlus className="h-4 w-4" />
              新規
            </button>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white">
          {sessions.map((s) => {
            const firstUserMsg = s.messages.find((m) => m.role === "user");
            const preview = firstUserMsg
              ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? "..." : "")
              : "（メッセージなし）";
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectSession(s)}
                className={`flex w-full items-center justify-between border-b border-gray-100 px-4 py-2.5 text-left text-sm hover:bg-gray-50 last:border-b-0 ${
                  s.id === sessionId ? "bg-indigo-50" : ""
                }`}
              >
                <span className="truncate text-gray-700">{preview}</span>
                <span className="ml-3 shrink-0 text-xs text-gray-400">
                  {formatDate(s.updated_at)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loadingSession ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
