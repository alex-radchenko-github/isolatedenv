"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "@/actions/user";
import type { UserInfo } from "@/types/user";

/**
 * FastAPI user with role from PostgreSQL. Primary user hook.
 */
export function useUser() {
  return useQuery<UserInfo>({
    queryKey: ["currentUser"],
    queryFn: () => fetchCurrentUser(),
    staleTime: 60 * 1000,
  });
}
