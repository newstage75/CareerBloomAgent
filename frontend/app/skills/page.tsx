"use client";

import { useState } from "react";
import { HiPlus, HiXMark } from "react-icons/hi2";

type Skill = {
  id: number;
  name: string;
  level: "beginner" | "intermediate" | "advanced";
};

const levelLabel = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
} as const;

const levelColor = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-purple-100 text-purple-700",
} as const;

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<Skill["level"]>("intermediate");

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSkills((prev) => [...prev, { id: Date.now(), name: trimmed, level }]);
    setName("");
  };

  const handleRemove = (id: number) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">スキル管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          あなたのスキルを登録して、マッチング精度を向上させましょう
        </p>
      </div>

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
            onChange={(e) => setLevel(e.target.value as Skill["level"])}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="beginner">初級</option>
            <option value="intermediate">中級</option>
            <option value="advanced">上級</option>
          </select>
        </div>
        <button
          type="submit"
          className="flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <HiPlus className="h-4 w-4" />
          追加
        </button>
      </form>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          登録済みスキル ({skills.length} 件)
        </h2>
        {skills.length === 0 ? (
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
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${levelColor[skill.level]}`}
                  >
                    {levelLabel[skill.level]}
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
