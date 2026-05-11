"use client";

import { useState } from "react";
import { HiOutlineInformationCircle, HiOutlineXMark } from "react-icons/hi2";
import { useAuth } from "@/app/lib/auth";
import { usePublicConfig } from "@/app/lib/config";

export default function GuestBanner() {
  const { user, loading: authLoading, login } = useAuth();
  const { config, loading: configLoading } = usePublicConfig();
  const [expanded, setExpanded] = useState(false);

  if (authLoading || configLoading) return null;
  if (!config?.guest_enabled) return null;
  if (user) return null;

  const resetHour = config.reset_hour_jst;

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900">
      <div className="mx-auto flex max-w-5xl items-start gap-2 px-4 py-2 text-sm">
        <HiOutlineInformationCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1 leading-relaxed">
          {/* SP: 1行サマリ + 詳細トグル / PC: 全文 */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">ゲストモード（共用・JST {resetHour}:00 リセット）</span>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] text-amber-700 underline hover:text-amber-900 sm:hidden"
            >
              {expanded ? "閉じる" : "詳細"}
            </button>
            <span className="hidden sm:inline">
              ログイン不要でデモとして一部機能をお試しいただけます。データは他のゲストと共有され、毎朝 JST {resetHour}:00 にリセットされます。
              <span className="ml-1 whitespace-nowrap text-amber-700">※AI利用枠には制限があります</span>
            </span>
            <button
              onClick={login}
              className="ml-auto rounded-md border border-amber-400 bg-white px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              ログイン
            </button>
          </div>
          {/* SP: 詳細展開 */}
          {expanded && (
            <p className="mt-1 text-[12px] sm:hidden">
              ログイン不要でデモとして一部機能をお試しいただけます。データは他のゲストと共有され、毎朝 JST {resetHour}:00 にリセットされます。AI利用枠には1日あたりの上限があります。個別のデータを残したい場合はログインしてください。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
