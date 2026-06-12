"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type PublicConfig = {
  guest_enabled: boolean;
  reset_hour_jst: number;
  logical_date: string;
  quotas: { ai_total: number; jobs: number };
  usage: { total: number; jobs: number };
};

type ConfigContextValue = {
  config: PublicConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function PublicConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`);
      if (!res.ok) throw new Error(`config ${res.status}`);
      const data = (await res.json()) as PublicConfig;
      setConfig(data);
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <ConfigContext value={{ config, loading, refresh: fetchConfig }}>
      {children}
    </ConfigContext>
  );
}

export function usePublicConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("usePublicConfig must be used within PublicConfigProvider");
  return ctx;
}
