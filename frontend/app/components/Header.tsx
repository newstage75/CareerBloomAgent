"use client";

import Link from "next/link";
import { HiOutlineUserCircle, HiArrowRightOnRectangle } from "react-icons/hi2";
import { useAuth } from "@/app/lib/auth";

export default function Header() {
  const { user, loading, login, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <Link href="/" className="text-lg font-bold text-indigo-600">
        CareerBloomAgent
      </Link>

      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded-md bg-gray-100" />
      ) : user ? (
        <div className="flex items-center gap-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="h-7 w-7 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <HiOutlineUserCircle className="h-6 w-6 text-gray-500" />
          )}
          <span className="text-sm text-gray-700">
            {user.displayName ?? "ユーザー"}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <HiArrowRightOnRectangle className="h-4 w-4" />
            ログアウト
          </button>
        </div>
      ) : (
        <button
          onClick={login}
          className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <HiOutlineUserCircle className="h-5 w-5" />
          ログイン
        </button>
      )}
    </header>
  );
}
