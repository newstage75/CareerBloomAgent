import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  accentColorClass: string;
  ctaLabel: string;
};

export default function JourneyCard({
  title,
  description,
  href,
  icon,
  accentColorClass,
  ctaLabel,
}: Props) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${accentColorClass}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <span className="mt-auto inline-flex items-center text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
        {ctaLabel}
        <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}
