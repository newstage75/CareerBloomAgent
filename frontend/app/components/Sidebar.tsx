"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineHome,
  HiOutlineChatBubbleLeftRight,
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
} from "react-icons/hi2";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: HiOutlineHome },
  { href: "/chat", label: "AIチャット", icon: HiOutlineChatBubbleLeftRight },
  { href: "/skills", label: "スキル管理", icon: HiOutlineAcademicCap },
  { href: "/matching", label: "マッチング", icon: HiOutlineBriefcase },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-gray-50 md:block">
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
