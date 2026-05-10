"use client";

import { useEffect, useState } from "react";
import { HiPlus, HiXMark } from "react-icons/hi2";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePublicConfig } from "../lib/config";
import type { SkillResponse } from "../types";

type SkillLevel = "none" | "beginner" | "intermediate" | "advanced";

const levelLabel = {
  none: "指定なし",
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
} as const;

const levelColor = {
  none: "bg-gray-100 text-gray-600",
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-purple-100 text-purple-700",
} as const;

export default function SkillsPage() {
  const { user } = useAuth();
  const { config } = usePublicConfig();
  const canUse = !!user || !!config?.guest_enabled;
  const [skills, setSkills] = useState<SkillResponse[]>([]);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<SkillLevel>("none");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canUse) {
      setSkills([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch<SkillResponse[]>("/api/skills")
      .then(setSkills)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [canUse, user]);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<SkillResponse>("/api/skills", {
        method: "POST",
        body: JSON.stringify({ name: trimmed, level }),
      });
      setSkills((prev) => [...prev, created]);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setError(null);
    try {
      await apiFetch(`/api/skills/${id}`, { method: "DELETE" });
      setSkills((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">スキル管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          対話で発見された価値観と合わせて、マッチング分析に活用されます
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
      >
        <div className="flex-1">
          <label
            htmlFor="skill-name"
            className="block text-sm font-medium text-gray-700"
          >
            スキル名
          </label>
          <input
            id="skill-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: Python, プロジェクト管理, AWS"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label
            htmlFor="skill-level"
            className="block text-sm font-medium text-gray-700"
          >
            レベル
          </label>
          <select
            id="skill-level"
            value={level}
            onChange={(e) => setLevel(e.target.value as SkillLevel)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="none">指定なし</option>
            <option value="beginner">初級</option>
            <option value="intermediate">中級</option>
            <option value="advanced">上級</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <HiPlus className="h-4 w-4" />
          {submitting ? "追加中..." : "追加"}
        </button>
      </form>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          登録済みスキル ({skills.length} 件)
        </h2>
        {loading ? (
          <p className="mt-3 text-sm text-gray-400">読み込み中...</p>
        ) : skills.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">
            スキルがまだ登録されていません。上のフォームから追加してください。
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {skills.map((skill) => (
              <li
                key={skill.id}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {skill.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${levelColor[skill.level as SkillLevel] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {levelLabel[skill.level as SkillLevel] ?? skill.level}
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(skill.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <HiXMark className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
