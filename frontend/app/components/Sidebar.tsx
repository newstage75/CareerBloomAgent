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
} from "react-icons/hi2";
import type { ComponentType } from "react";

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
      { href: "/skills", label: "スキル", icon: HiOutlineAcademicCap },
      { href: "/matching", label: "深掘りエージェントβ", icon: HiOutlineMap },
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

export default function Sidebar() {
  const pathname = usePathname();

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
      </nav>
    </aside>
  );
}
