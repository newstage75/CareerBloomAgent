import Link from "next/link";
import { HiOutlineUserCircle } from "react-icons/hi2";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <Link href="/" className="text-lg font-bold text-indigo-600">
        CareerBloomAgent
      </Link>
      <button className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
        <HiOutlineUserCircle className="h-5 w-5" />
        ログイン
      </button>
    </header>
  );
}
