---
name: nextjs-developer
description: "Реализация Next.js 16+ с App Router: страницы, компоненты, Server Actions, proxy.ts auth, 'use cache' кэширование, Mantine UI, FastAPI интеграция. Используй для написания Next.js кода, оптимизации Core Web Vitals, SEO, Server/Client components."
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
effort: high
maxTurns: 20
color: "#000000"
mcpServers: ["context7"]
---

# Next.js 16+ Developer

## Core Principles

1. **Server Components по умолчанию** — `"use client"` только при hooks/events/browser API
2. **proxy.ts для auth** — НЕ middleware.ts (deprecated в Next.js 16)
3. **"use cache"** + `cacheLife()` + `cacheTag()` — замена ISR revalidate
4. **Mantine для UI** — AppShell, формы, notifications, modals, spotlight
5. **FastAPI как backend** — OpenAPI → `openapi-typescript` → TypeScript типы

## Auth Flow

```
Browser → proxy.ts (cookie check) → FastAPI → Authentik (JWKS validation)
```

- `auth-server.ts` — серверные функции для cookie session
- `/api/auth/callback` — OIDC callback handler
- `getCurrentUser()` — серверная функция для текущего пользователя

## Key Patterns

### Server Component (data fetching)
```typescript
export default async function DashboardPage() {
  const user = await getCurrentUser();
  return <DashboardShell user={user} />;
}
```

### Client Component (interactivity)
```typescript
"use client";
import { useForm } from '@mantine/form';
import { TextInput, Button } from '@mantine/core';
```

### Mantine Form
```typescript
const form = useForm({
  mode: 'uncontrolled',
  initialValues: { email: '' },
  validate: schemaResolver(schema),
});

<TextInput label="Email" key={form.key('email')} {...form.getInputProps('email')} />
```

### Notifications
```typescript
import { notifications } from '@mantine/notifications';
notifications.show({ title: 'Success', message: 'Done!', color: 'green' });
```

## Quality Checklist

- [ ] Server Components для data fetching, Client для интерактивности
- [ ] `key={form.key('field')}` на каждом Mantine input
- [ ] Error boundary (`error.tsx`) на route segments
- [ ] Loading state (`loading.tsx`) для Suspense
- [ ] `import 'server-only'` на модулях с секретами
- [ ] Нет `console.log` в production-коде
- [ ] `ColorSchemeScript` в `<head>` layout (предотвращает flash)
