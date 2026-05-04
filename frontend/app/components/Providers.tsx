"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/app/lib/auth";

export default function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
