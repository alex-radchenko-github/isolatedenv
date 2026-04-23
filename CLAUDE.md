# isolatedenv

> My awesome project

## Стек

- **Backend**: FastAPI 0.135 + async SQLAlchemy 2.0.49 + Pydantic 2.13 + Celery 5.6
- **Auth**: Authentik 2026.2 (OIDC/OAuth2, JWKS local validation via PyJWT)
- **Database**: PostgreSQL 17 + Redis 8 (db0 = Celery broker, db1 = API cache)
- **Frontend**: Next.js 16.2.3 (App Router, RSC, proxy.ts, PPR)
- **UI**: Mantine 9 (CSS Modules, PostCSS preset, Standard Schema)

## Команды

| Команда | Назначение |
|---------|-----------|
| `make up` | Запуск всех Docker сервисов |
| `make down` | Остановка всех сервисов |
| `make reset` | Полный сброс: удаление volumes + перезапуск |
| `make seed` | Инициализация Authentik + seed тестовых пользователей |
| `make logs` | Логи всех сервисов |
| `make status` | Статус всех сервисов |
| `docker compose logs -f api` | Логи API сервера |
| `pnpm dev` | Dev-сервер Next.js (в Docker) |

## Сервисы

| Сервис | URL |
|--------|-----|
| Backend API (Swagger) | http://localhost:8010/docs |
| Authentik | http://localhost:9010 |
| Frontend (Next.js) | http://localhost:3010 |
| PostgreSQL | localhost:5442 |
| Redis | localhost:6389 |

## Структура проекта

| Каталог | Назначение |
|---------|-----------|
| `backend/` | FastAPI backend (Feature Module Pattern) |
| `backend/app/core/` | Конфигурация, auth, database, dependencies |
| `backend/app/users/` | Feature module: модели, схемы, сервис, роутер |
| `src/` | Next.js frontend (App Router) |
| `src/app/` | Страницы и layouts |
| `src/components/` | React компоненты (Mantine) |
| `src/lib/` | Утилиты, API клиент, маршруты |

## Архитектура

### Backend Feature Module Pattern

```
models.py → schemas.py → repository.py → service.py → router.py
```

Границы слоёв строгие: router → service → repository. НЕ router → repository.

### Аутентификация

Authentik (OIDC/OAuth2 IdP) → JWKS local validation (PyJWT) в `get_current_user`.
Web: OIDC callback + cookie session (`auth-server.ts`, `/api/auth/*` routes), `proxy.ts` для защиты маршрутов.

## Конвенции

- Код, идентификаторы, комментарии — **английский**
- TypeScript strict mode, НЕ использовать `any` / `as any` / `@ts-ignore`
- Python type hints на всех функциях, `async/await` для всех I/O
- SQLAlchemy 2.0: `Mapped[]`, `mapped_column()`, `select()` — НЕ `Column()`, `session.query()`
- Pydantic v2: `ConfigDict(from_attributes=True)`, `model_validate()` — НЕ `orm_mode`, `from_orm()`
- UI: Mantine 9 с CSS Modules, `postcss-preset-mantine`, НЕ Tailwind
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`

## Агенты

| Задача | Агент |
|--------|-------|
| Backend код | `python-pro` |
| Оптимизация БД | `db-expert` |
| Code review | `code-reviewer` |
| Security аудит | `security-auditor` |
| Frontend (Next.js) | `nextjs-developer` |
| UI / Mantine | `mantine-ui` |

## Test Credentials

| Роль | Email | Пароль |
|------|-------|--------|
| Admin | admin@example.com | TestAdmin123! (role=admin) |
| Paid | paid@example.com | TestPaid123! (role=paid) |
| Free | free@example.com | TestFree123! (role=free) |
