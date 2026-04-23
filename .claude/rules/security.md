# Контекст: Безопасность

## OWASP Top 10 — Чеклист

| Угроза | Защита |
|--------|--------|
| **SQL Injection** | Только parameterized queries через SQLAlchemy ORM |
| **XSS** | React auto-escapes; НЕ использовать `dangerouslySetInnerHTML` |
| **Auth bypass** | Всегда validate JWT через JWKS, проверять roles |
| **IDOR** | Проверять ownership ресурса перед доступом |
| **Secrets exposure** | Нет hardcoded секретов; только `.env` файлы |
| **CORS** | Restrict origins в FastAPI middleware |
| **Mass assignment** | `response_model` на всех endpoints; Pydantic фильтрует поля |
| **SSRF** | Validate URLs перед запросами к внешним сервисам |

## Обязательные правила

1. **Секреты** — НИКОГДА в коде. Только `os.environ` / `.env` / Secret Manager
2. **Input validation** — Pydantic на backend, Zod на frontend. На КАЖДОМ API endpoint
3. **Auth** — `get_current_user` dependency на всех защищённых роутерах
4. **Rate limiting** — на auth endpoints (login, register, password reset)
5. **HTTPS** — все production endpoints через TLS
6. **Dependencies** — регулярное обновление; `dependabot.yml` для автоматических PR

## Паттерны аутентификации

```python
# Backend: JWKS validation (PyJWT)
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    payload = jwt.decode(token, key=jwks_client.get_signing_key(...))
    # Verify exp, iss, aud claims
    return await user_service.get_by_sub(payload["sub"])
```

## На что обращать внимание

1. `[:16]` или другое truncation хешей — ослабляет безопасность
2. JWT без проверки `exp` claim — токен никогда не истечёт
3. `CORS(allow_origins=["*"])` — открывает API для всех доменов
4. Логирование sensitive data (passwords, tokens, PII)
5. `eval()` / `exec()` с пользовательским вводом — command injection
