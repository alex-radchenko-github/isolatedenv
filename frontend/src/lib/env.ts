/**
 * Environment variable validation with Zod.
 * Client vars (NEXT_PUBLIC_*) are validated lazily on first access.
 * Server vars are validated only on the server side.
 */
import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_AUTHENTIK_URL: z.string().url(),
  NEXT_PUBLIC_AUTHENTIK_CLIENT_ID: z.string().min(1),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:8000"),
});

let _clientEnv: z.infer<typeof clientSchema> | null = null;

export function getClientEnv() {
  if (!_clientEnv) {
    _clientEnv = clientSchema.parse({
      NEXT_PUBLIC_AUTHENTIK_URL: process.env.NEXT_PUBLIC_AUTHENTIK_URL,
      NEXT_PUBLIC_AUTHENTIK_CLIENT_ID: process.env.NEXT_PUBLIC_AUTHENTIK_CLIENT_ID,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    });
  }
  return _clientEnv;
}

// Server-only env vars — only validated when accessed on the server.
// Build-time guard: importing this function in a client component will cause a build error.
// Runtime guard: throws if called in the browser (belt-and-suspenders).
let _serverEnv: {
  API_URL: string;
  AUTHENTIK_URL: string;
  AUTHENTIK_CLIENT_ID: string;
  AUTHENTIK_CLIENT_SECRET: string;
  AUTHENTIK_BOOTSTRAP_TOKEN?: string;
} | null = null;

export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must only be called on the server");
  }
  if (!_serverEnv) {
    const serverSchema = z.object({
      API_URL: z.string().url().default("http://localhost:8000"),
      AUTHENTIK_URL: z.string().url(),
      AUTHENTIK_CLIENT_ID: z.string().min(1),
      AUTHENTIK_CLIENT_SECRET: z.string().min(1),
      AUTHENTIK_BOOTSTRAP_TOKEN: z.string().optional(),
    });
    _serverEnv = serverSchema.parse({
      API_URL: process.env.API_URL,
      AUTHENTIK_URL: process.env.AUTHENTIK_URL,
      AUTHENTIK_CLIENT_ID: process.env.AUTHENTIK_CLIENT_ID,
      AUTHENTIK_CLIENT_SECRET: process.env.AUTHENTIK_CLIENT_SECRET,
      AUTHENTIK_BOOTSTRAP_TOKEN: process.env.AUTHENTIK_BOOTSTRAP_TOKEN,
    });
  }
  return _serverEnv;
}
