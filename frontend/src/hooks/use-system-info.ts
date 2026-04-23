"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHealthInfo } from "@/actions/health";

export interface SystemInfo {
  app_version: string;
  python_version: string;
  postgresql_version: string;
  redis_version: string;
  uptime_seconds: number;
}

export function useSystemInfo() {
  return useQuery<SystemInfo>({
    queryKey: ["systemInfo"],
    queryFn: () => fetchHealthInfo(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
