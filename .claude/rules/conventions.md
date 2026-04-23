# Конвенции проекта

## Язык

- Код, идентификаторы, комментарии в коде — **английский**
- Документация и общение с пользователем — **русский**

## Код

| Правило | Why |
|---------|-----|
| TypeScript strict mode | Ловит null/undefined ошибки до рантайма |
| НЕ использовать `any` / `as any` / `@ts-ignore` | Отключает type checker, ошибки утекают в прод |
| Python type hints на всех функциях | mypy strict ловит ошибки до рантайма |
| `async/await` для всех I/O | Синхронный I/O блокирует event loop |
| Нет `console.log` в production | Засоряет логи, может утечь sensitive data |

## Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Не коммитить `.env`, секреты, credentials
- Не использовать `--force` push без явного запроса пользователя
- Не пропускать pre-commit hooks (`--no-verify`)

## Безопасность

- Секреты только в `.env` файлах (никогда в коде)
- `NEXT_PUBLIC_` переменные НЕ должны содержать секретов (видны клиенту)
- Input validation на границах системы (API endpoints, user input)
- Все пароли и токены через environment variables
