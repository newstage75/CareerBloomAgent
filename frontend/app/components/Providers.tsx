"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/app/lib/auth";
import { PublicConfigProvider } from "@/app/lib/config";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <PublicConfigProvider>
      <AuthProvider>{children}</AuthProvider>
    </PublicConfigProvider>
  );
}
