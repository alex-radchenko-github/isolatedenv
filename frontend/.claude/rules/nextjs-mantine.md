---
globs: "src/**/*.tsx,src/**/*.ts,src/**/*.css"
description: "Next.js 16+ App Router + Mantine v9 конвенции и паттерны"
---

# Контекст: Next.js 16+ и Mantine v9

## Next.js 16+ обязательные правила

| Правило | Why |
|---------|-----|
| Server Components по умолчанию | `"use client"` только при hooks/events/browser API |
| `proxy.ts` вместо `middleware.ts` | middleware deprecated в Next.js 16 |
| `"use cache"` + `cacheLife()` + `cacheTag()` | Вместо ISR `revalidate` |
| `params` и `searchParams` — async | Всегда `await` перед использованием |
| `import 'server-only'` на модулях с секретами | Предотвращает утечку в client bundle |
| Error boundary (`error.tsx`) на каждом route | Graceful error handling |

## Mantine v9 обязательные правила

| Правило | Why |
|---------|-----|
| CSS Modules для кастомных стилей | НЕ Tailwind, НЕ Emotion, НЕ styled-components |
| `postcss-preset-mantine` | `light-dark()`, `rem()`, responsive mixins |
| Style props для layout | `<Stack gap="md">`, `<Group gap="sm">`, `p="md"`, `mt="lg"` |
| `key={form.key('field')}` на каждом input | Обязательно для uncontrolled mode |
| `@tabler/icons-react` для иконок | НЕ lucide-react: `<IconName size={16} stroke={1.5} />` |
| `schemaResolver` для Zod validation | НЕ `zodResolver` из `mantine-form-zod-resolver` (deprecated) |
| `Text` / `Anchor` — `c` prop для цвета | НЕ `color` prop (удалён в v9) |

## Формы (@mantine/form)

```typescript
// ПРАВИЛЬНО (Mantine v9)
import { useForm, schemaResolver } from '@mantine/form';

const form = useForm({
  mode: 'uncontrolled',
  initialValues: { email: '' },
  validate: schemaResolver(schema),
});

<TextInput
  label="Email"
  key={form.key('email')}
  {...form.getInputProps('email')}
/>

// НЕПРАВИЛЬНО — react-hook-form
import { useForm } from 'react-hook-form';
import { Form, FormField } from '@/components/ui/form';
```

## Server vs Client Components

```typescript
// ПРАВИЛЬНО — Server Component (по умолчанию)
export default async function Page() {
  const data = await fetchData();
  return <DataDisplay data={data} />;
}

// ПРАВИЛЬНО — Client Component (при hooks/events)
"use client";
import { useState } from 'react';
export function InteractiveWidget() { ... }

// НЕПРАВИЛЬНО — передача функций из Server в Client
export default function Page() {
  return <ClientComp onAction={serverFn} />; // НЕ сериализуемо
}
```

## На что обращать внимание

1. НЕ передавать функции из Server в Client компоненты (не сериализуемы)
2. `NEXT_PUBLIC_` переменные — НЕ должны содержать секретов (видны клиенту)
3. `useEffect` без cleanup — утечка памяти (таймеры, подписки, AbortController)
4. Забытый `import '@mantine/core/styles.css'` = пустой/сломанный UI
5. Mantine компоненты с `component={Link}` требуют `"use client"` boundary
