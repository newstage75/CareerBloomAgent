"use client";

import { HiOutlineInformationCircle } from "react-icons/hi2";
import { useAuth } from "@/app/lib/auth";
import { usePublicConfig } from "@/app/lib/config";

export default function GuestBanner() {
  const { user, loading: authLoading, login } = useAuth();
  const { config, loading: configLoading } = usePublicConfig();

  if (authLoading || configLoading) return null;
  if (!config?.guest_enabled) return null;
  if (user) return null;

  const resetHour = config.reset_hour_jst;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-sm text-amber-900">
      <div className="mx-auto flex max-w-5xl items-start gap-2">
        <HiOutlineInformationCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1 leading-relaxed">
          <span className="font-medium">ゲストモードでご利用中です。</span>
          ログイン不要でデモとして一部機能をお試しいただけます。
          ゲスト同士はデータを共有しており、毎朝 <strong>JST {resetHour}:00</strong> に共有空間がリセットされます（個別のデータを残したい場合はログインしてください）。
          <span className="ml-2 whitespace-nowrap text-amber-700">
            ※AI利用枠には制限があります
          </span>
          <button
            onClick={login}
            className="ml-3 rounded-md border border-amber-400 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            ログインしてパーソナル化
          </button>
        </div>
      </div>
    </div>
  );
}
