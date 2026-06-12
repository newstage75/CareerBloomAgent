import type { ChatMode } from "../types";
import { auth } from "./firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/**
 * Convert a non-2xx Response into an Error, preferring the FastAPI ``detail``
 * field (used for the 429 quota-exceeded message) over raw body text.
 */
async function buildApiError(res: Response): Promise<Error> {
  const text = await res.text().catch(() => "");
  let message = `API error ${res.status}: ${text}`;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.detail === "string") {
      message = parsed.detail;
    }
  } catch {
    // not JSON, keep raw
  }
  const err = new Error(message);
  (err as Error & { status?: number }).status = res.status;
  return err;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? 30_000
  );

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw await buildApiError(res);
    }

    // 204 No Content (e.g. DELETE) has no body — don't attempt to parse JSON.
    if (res.status === 204) {
      return undefined as T;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("リクエストがタイムアウトしました");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

type SearchSource = { title: string; uri: string };
type RoadmapStreamCallbacks = {
  onStatus?: (data: { phase: string; message: string; elapsed: number; total: number; goal_id?: string }) => void;
  onAgent?: (data: { agent: string; type: string; name?: string; args?: Record<string, unknown>; summary?: string; text?: string; message?: string; sources?: SearchSource[]; elapsed: number }) => void;
  onDone?: (data: { goal_id: string; elapsed: number; total: number }) => void;
  onError?: (err: Error) => void;
};

export async function streamRoadmapGenerate(
  payload: { goal_text: string; goal_id?: string },
  callbacks?: RoadmapStreamCallbacks
): Promise<void> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  // バックエンド表示は180秒。クライアント側は60秒の保険を入れて240秒で abort。
  const timeoutId = setTimeout(() => controller.abort(), 240_000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/matching/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      callbacks?.onError?.(new Error("調査がタイムアウトしました"));
    } else {
      callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
    return;
  }

  if (!res.ok) {
    clearTimeout(timeoutId);
    callbacks?.onError?.(await buildApiError(res));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    clearTimeout(timeoutId);
    callbacks?.onError?.(new Error("No response body"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        let eventType = "message";
        let data = "";
        for (const line of part.split("\n")) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) data = line.slice(6);
        }
        if (!data) continue;
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }
        switch (eventType) {
          case "status":
            callbacks?.onStatus?.(parsed as never);
            break;
          case "agent":
            callbacks?.onAgent?.(parsed as never);
            break;
          case "done":
            callbacks?.onDone?.(parsed as never);
            break;
          case "error":
            callbacks?.onError?.(new Error(String(parsed.message ?? "エラーが発生しました")));
            break;
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      callbacks?.onError?.(new Error("調査がタイムアウトしました"));
    } else {
      callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

type StreamChatCallbacks = {
  onSession?: (sessionId: string) => void;
  onChunk?: (text: string) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
};

export async function streamChat(
  message: string,
  sessionId: string | null,
  mode?: ChatMode,
  callbacks?: StreamChatCallbacks
): Promise<void> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const body: Record<string, unknown> = { message };
  if (sessionId) body.session_id = sessionId;
  if (mode) body.mode = mode;

  const controller = new AbortController();
  // SSEストリーミング全体で60秒タイムアウト
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      callbacks?.onError?.(new Error("応答がタイムアウトしました"));
    } else {
      callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
    return;
  }

  if (!res.ok) {
    callbacks?.onError?.(await buildApiError(res));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks?.onError?.(new Error("No response body"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        let eventType = "message";
        let data = "";

        for (const line of part.split("\n")) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            data = line.slice(6);
          }
        }

        switch (eventType) {
          case "session": {
            try {
              const parsed = JSON.parse(data);
              callbacks?.onSession?.(parsed.session_id);
            } catch {
              // ignore parse errors
            }
            break;
          }
          case "message": {
            try {
              const parsed = JSON.parse(data);
              callbacks?.onChunk?.(parsed.content ?? data);
            } catch {
              callbacks?.onChunk?.(data);
            }
            break;
          }
          case "done":
            callbacks?.onDone?.();
            break;
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      callbacks?.onError?.(new Error("応答がタイムアウトしました"));
    } else {
      callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
