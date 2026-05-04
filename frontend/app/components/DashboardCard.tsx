import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  href: string;
  icon: ReactNode;
  value: string;
  description: string;
};

export default function DashboardCard({
  title,
  href,
  icon,
  value,
  description,
}: Props) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <span className="text-indigo-500">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </Link>
  );
}
