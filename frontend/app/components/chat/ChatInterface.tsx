"use client";

import { useRef, useEffect, useState } from "react";
import {
  HiOutlinePlus,
  HiOutlineClock,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineCheck,
  HiOutlineXMark,
} from "react-icons/hi2";
import type { ChatMessage as ChatMessageType, ChatMode } from "@/app/types";
import { apiFetch, streamChat } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth";
import { usePublicConfig } from "@/app/lib/config";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import SuggestedPrompts from "./SuggestedPrompts";

type SessionSummary = {
  id: string;
  mode: string | null;
  title?: string | null;
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
  const { config } = usePublicConfig();
  const canUse = !!user || !!config?.guest_enabled;
  const [messages, setMessages] = useState<ChatMessageType[]>([
    { id: 1, role: "assistant", content: initialGreeting },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load sessions on mount
  useEffect(() => {
    if (authLoading || !canUse) {
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
  }, [canUse, authLoading, mode]);

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

  const startEditTitle = (e: React.MouseEvent, s: SessionSummary) => {
    e.stopPropagation();
    setEditingTitleId(s.id);
    const firstUserMsg = s.messages.find((m) => m.role === "user");
    setTitleDraft(
      s.title ?? (firstUserMsg ? firstUserMsg.content.slice(0, 40) : "")
    );
  };

  const cancelEditTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTitleId(null);
    setTitleDraft("");
  };

  const saveTitle = async (e: React.MouseEvent | React.FormEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const next = titleDraft.trim().slice(0, 80);
    try {
      await apiFetch(`/api/chat/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: next }),
      });
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: next } : s))
      );
      setEditingTitleId(null);
      setTitleDraft("");
    } catch (err) {
      console.error("Failed to update title:", err);
      alert("タイトルの更新に失敗しました");
    }
  };

  const handleDeleteSession = async (
    e: React.MouseEvent,
    targetId: string
  ) => {
    e.stopPropagation();
    if (!confirm("この会話履歴を削除しますか？")) return;
    try {
      await apiFetch(`/api/chat/sessions/${targetId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== targetId));
      if (targetId === sessionId) {
        setSessionId(null);
        setMessages([{ id: 1, role: "assistant", content: initialGreeting }]);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert("削除に失敗しました");
    }
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
        <div className="mt-3 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white">
          {sessions.map((s) => {
            const firstUserMsg = s.messages.find((m) => m.role === "user");
            const fallback = firstUserMsg
              ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? "..." : "")
              : "（メッセージなし）";
            const display = s.title?.trim() ? s.title : fallback;
            const isEditing = editingTitleId === s.id;
            return (
              <div
                key={s.id}
                className={`flex items-center border-b border-gray-100 last:border-b-0 ${
                  s.id === sessionId ? "bg-indigo-50" : ""
                }`}
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => saveTitle(e, s.id)}
                    className="flex flex-1 items-center gap-2 px-3 py-2"
                  >
                    <input
                      type="text"
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      maxLength={80}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                      placeholder="タイトル（最大80文字）"
                    />
                    <button
                      type="submit"
                      className="p-1 text-indigo-600 hover:text-indigo-700"
                      aria-label="保存"
                      title="保存"
                    >
                      <HiOutlineCheck className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditTitle}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      aria-label="キャンセル"
                      title="キャンセル"
                    >
                      <HiOutlineXMark className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSelectSession(s)}
                      className="flex flex-1 items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                    >
                      <span className="truncate text-gray-700">{display}</span>
                      <span className="ml-3 shrink-0 text-xs text-gray-400">
                        {formatDate(s.updated_at)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => startEditTitle(e, s)}
                      className="px-2 py-2.5 text-gray-400 hover:text-indigo-600"
                      aria-label="タイトル編集"
                      title="タイトル編集"
                    >
                      <HiOutlinePencilSquare className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="px-3 py-2.5 text-gray-400 hover:text-rose-600"
                      aria-label="削除"
                      title="削除"
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
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
