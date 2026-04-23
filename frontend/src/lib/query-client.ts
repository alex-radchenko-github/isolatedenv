/**
 * TanStack Query client configuration.
 */
import { MutationCache, QueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error) => {
          if (error instanceof Error && error.message === "UNAUTHORIZED")
            return false;
          if (error instanceof Error && error.message === "BLOCKED")
            return false;
          if (error instanceof Error && error.message === "FORBIDDEN")
            return false;
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
    },
    mutationCache: new MutationCache({
      onError: (error) => {
        if (
          error instanceof Error &&
          (error.message === "UNAUTHORIZED" || error.message === "BLOCKED")
        ) {
          return;
        }
        if (error instanceof Error && error.message === "FORBIDDEN") {
          notifications.show({ message: "Access denied. You don't have permission for this action.", color: "red" });
          return;
        }
        notifications.show({ message: error.message || "An error occurred", color: "red" });
      },
    }),
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
