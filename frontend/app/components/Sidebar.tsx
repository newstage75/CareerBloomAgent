"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineHome,
  HiOutlineSparkles,
  HiOutlineRocketLaunch,
  HiOutlineLightBulb,
  HiOutlineClock,
  HiOutlineAcademicCap,
  HiOutlineMap,
  HiOutlineChatBubbleLeftRight,
  HiOutlineBookOpen,
  HiOutlineShieldCheck,
} from "react-icons/hi2";
import { useEffect, useState, type ComponentType } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

const topItem: NavItem = {
  href: "/",
  label: "ホーム",
  icon: HiOutlineHome,
};

const navGroups: NavGroup[] = [
  {
    heading: "ジャーニー",
    items: [
      { href: "/discover", label: "価値観発見", icon: HiOutlineSparkles },
      { href: "/vision", label: "やりたいこと・目標", icon: HiOutlineRocketLaunch },
      { href: "/insights", label: "マイ・インサイト", icon: HiOutlineLightBulb },
      { href: "/history", label: "価値観の変遷", icon: HiOutlineClock },
    ],
  },
  {
    heading: "ツール",
    items: [
      { href: "/matching", label: "深掘りエージェントβ", icon: HiOutlineMap },
      { href: "/skills", label: "スキル登録", icon: HiOutlineAcademicCap },
      { href: "/sparring", label: "知識の壁打ちβ", icon: HiOutlineChatBubbleLeftRight },
      { href: "/sparring/notes", label: "知識ノートβ", icon: HiOutlineBookOpen },
    ],
  },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-100 text-indigo-700"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <Icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
}

const adminItem: NavItem = {
  href: "/admin",
  label: "管理者ダッシュボード",
  icon: HiOutlineShieldCheck,
};

function useIsAdmin(): boolean {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    apiFetch<{ is_admin: boolean }>("/api/admin/me")
      .then((data) => setIsAdmin(data.is_admin))
      .catch(() => setIsAdmin(false));
  }, [user]);

  return isAdmin;
}

export default function Sidebar() {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-gray-50 md:block">
      <nav className="flex flex-col gap-1 p-3">
        <NavLink item={topItem} active={pathname === topItem.href} />

        {navGroups.map((group) => (
          <div key={group.heading} className="mt-4">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {group.heading}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname === item.href}
              />
            ))}
          </div>
        ))}

        {isAdmin && (
          <div className="mt-4">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              管理
            </p>
            <NavLink item={adminItem} active={pathname === adminItem.href} />
          </div>
        )}
      </nav>
    </aside>
  );
}
