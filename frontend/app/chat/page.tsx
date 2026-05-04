"use client";

import { useState } from "react";
import { HiPaperAirplane } from "react-icons/hi2";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "こんにちは！CareerBloomAgentのAIキャリアアドバイザーです。転職やキャリアについてお気軽にご相談ください。",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: Date.now() + 1,
        role: "assistant",
        content:
          "（バックエンド未接続のため、現在応答できません。FastAPI接続後に有効になります。）",
      },
    ]);
    setInput("");
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <h1 className="text-2xl font-bold text-gray-900">AIキャリアアドバイザー</h1>
      <p className="mt-1 text-sm text-gray-500">
        キャリアの悩みや転職の方向性についてAIに相談できます
      </p>

      <div className="mt-4 flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="メッセージを入力..."
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <HiPaperAirplane className="h-4 w-4" />
              送信
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
