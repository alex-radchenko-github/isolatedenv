/**
 * Example TanStack Query hooks.
 */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchItems, addNewItem } from "@/actions/example";
import type { Item } from "@/lib/dal/example";

export function useItems(offset = 0, limit = 20) {
  return useQuery<Item[]>({
    queryKey: ["items", offset, limit],
    queryFn: () => fetchItems(offset, limit),
    staleTime: 60_000,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addNewItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
