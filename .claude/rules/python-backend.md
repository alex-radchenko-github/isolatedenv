---
globs: "backend/**/*.py"
description: "FastAPI + SQLAlchemy 2.0 + Pydantic v2 конвенции"
---

# Контекст: Python Backend

## Feature Module Pattern

```
app/users/
├── models.py       # SQLAlchemy 2.0 модели
├── schemas.py      # Pydantic v2 схемы
├── repository.py   # CRUD — только БД, без бизнес-логики
├── service.py      # Бизнес-логика, вызывает repository
└── router.py       # HTTP handling, вызывает service
```

**Границы строгие:** router → service → repository. НЕ router → repository.

## SQLAlchemy 2.0

```python
# ПРАВИЛЬНО (2.0)
class User(Base):
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)

stmt = select(User).where(User.email == email)
result = await session.scalars(stmt)

# НЕПРАВИЛЬНО (1.x legacy)
class User(Base):
    id = Column(UUID, primary_key=True)       # НЕТ
session.query(User).filter_by(email=email)    # НЕТ
```

## Pydantic v2

```python
# ПРАВИЛЬНО (v2)
class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

user_schema = UserRead.model_validate(user_orm)

# НЕПРАВИЛЬНО (v1 legacy)
class Config:
    orm_mode = True           # НЕТ
UserRead.from_orm(user_orm)   # НЕТ
```

## FastAPI

| Правило | Пример |
|---------|--------|
| `Depends()` для зависимостей | `user: User = Depends(get_current_user)` |
| `response_model` на эндпоинтах | Контроль утечки данных клиенту |
| Явный `status_code` | 201 для create, 204 для delete |
| `HTTPException` только в router | service/repository бросают доменные исключения |
| `async def` для всех эндпоинтов | FastAPI использует threadpool для sync |

## На что обращать внимание

1. `session.commit()` вручную — context manager должен коммитить
2. Sync вызовы в async функциях — блокируют event loop
3. `expire_on_commit` не отключён — вызывает `DetachedInstanceError`
4. Отсутствие `pool_pre_ping=True` — stale connections после рестарта БД
5. Celery задачи без retry — молчаливые отказы при сбоях
