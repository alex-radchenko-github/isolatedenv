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


<!-- stacklens:start -->
## StackLens — retrieval contract (machine rules)

Three MCP servers wired in `.mcp.json`. Authoritative source for types, signatures, deprecations, and prose for libraries in the project's stack.

### Primary filter

Every rule serves **facts needed to write correct code** against the installed stack. Prose narratives, migration guides, conceptual overviews, historical context — not fetched as mandatory follow-ups. If the caller explicitly requests one as a separate facet, that facet fires its own `docs_search`.

Canonical code-facts: symbol identifier, signature, type shape, deprecation mapping (old → new name | new import path), file/path convention, config key with type/default.

| Server | Returns | Source | Engine |
|---|---|---|---|
| `mcp__stacklens-native__*` | JS/TS types + distribution metadata | `.d.ts`, `.d.cts`, `.d.mts`, `@types/<pkg>`, `package.json` under `node_modules/` | TypeScript Compiler API |
| `mcp__stacklens-native-py__*` | Python types + PEP 566 METADATA + Pydantic JSON Schema | `.py`, `.pyi`, `.dist-info/*` under `.venv/lib/pythonX.Y/site-packages/` | `importlib` + `inspect` + `importlib.metadata` |
| `mcp__libprose__*` | BM25 prose (concepts, migrations, file conventions, config) | `data/<lib>/snapshot.md` | BM25 |

### Call gate

Call condition (AND-composed):
- package or library identifier ∈ `stack.yaml`
- facet shape ∈ { signature, type shape, deprecation, migration, file convention, config key, runnable example }

Skip conditions (OR):
- stdlib identifier (e.g. `asyncio.*`, global `fetch`, `Array.prototype.*`)
- pure algorithm / business logic (no library identifier)
- identifier ∉ `stack.yaml`

### Server selection

By package language:

| Package form | Server |
|---|---|
| npm (bare, scoped, subpath) | `mcp__stacklens-native__*` |
| dotted Python module | `mcp__stacklens-native-py__*` |

By question shape (tool names identical across both types-servers):

| Intent | Tool | First call |
|---|---|---|
| type shape | types | `stacklens_get_type(package, type_path)` |
| signature | types | `stacklens_get_signature(package, entity, member?)` |
| exports (compact) | types | `stacklens_list_exports(package)` |
| exports with `source_file` / preview | types | `stacklens_list_exports(package, detail="full")` |
| deprecations only | types | `stacklens_list_deprecations(package)` |
| fuzzy name match | types | `stacklens_find_symbol(package, query)` |
| compat ranges (Python) | types | `stacklens_get_dependencies(package)` |
| peer deps (Node) | types | `stacklens_get_package_metadata(package)` → `peer_dependencies` |
| valid subpaths | types | `stacklens_get_package_metadata(package)` → `export_subpaths` |
| CLI / plugin hooks (Python) | types | `stacklens_list_entry_points(package)` |
| bin entries (Node) | types | `stacklens_get_package_metadata(package)` → `bin` |
| `py_typed` / project URLs | types | `stacklens_get_package_metadata(package)` |
| Pydantic field constraints | types (Py) | `stacklens_get_json_schema(package, type_path)` |
| migration / concept / recipe / config | prose | `docs_search(library, query)` |
| full section body | prose | `docs_section(library, url_or_path=<section_path>)` |
| library TOC | prose | `docs_toc(library)` |

Multi-library input → parallel tool calls in one message. One library per call. No cross-library `see_also`.

### Trigger → Action rules

Deterministic. Trigger matches envelope pattern → action fires unconditionally. Every rule below yields a code-fact that Tier 1 could not surface. Rules that fetched prose narrative have been removed.

```
R1  get_type(ok=true, kind ∈ {class, interface, TypedDict, dataclass, model},
             fields ∈ {[], absent})
    → docs_search(library, entity_name)
    → docs_section(library, url_or_path=hits[0].section_path)
    # fields needed for write-code; Tier 1 could not introspect.

R2  get_type(ok=true, kind ∈ {type_alias, enum, primitive, union, literal})
    → no follow-up. content for code is in `text` / `union`.

R3  get_signature(ok=true, params=[], kind ∈ {constructor, method, function})
    → docs_search(library, entity_name)
    → docs_section(library, url_or_path=hits[0].section_path)
    # params needed for write-code; Tier 1 could not introspect.

R4  list_exports(ok=true, entries=[])
    → docs_search(library, package_root)
    # discovery of code surface when Tier 1 is empty.

R5  get_json_schema(ok=true, schema={})
    → docs_search(library, entity_name)
    # constraints needed for input validation code.

R6  list_deprecations(ok=true, exports=[])
    → no follow-up. factual answer: no deprecations.

R7  list_entry_points(ok=true, exports=[])
    → no follow-up. factual answer.

R8  list_deprecations(ok=true, exports=[..., e])
    → facet closed on {e.name, e.reason, e.replacement_hint?}.
    # old-name → new-name | new-import-path is code-ready.
    # e.migration_url is prose narrative; NOT a mandatory follow-up.

R9  docs_search(ok=true, hits=[]) reformulation bound
    N=1: reformulate(stem variation)
    N=2: reformulate(synonym from facet intent)
    N=3: stop. status=gap.

R10 TYPE_NOT_FOUND with hint.suggested_name
    → retry same tool with type_path=hint.suggested_name
    NOT → list_exports while hint present.

R11 TYPE_NOT_FOUND without hint
    → list_exports(package); scan entries for target.

R12 MEMBER_NOT_FOUND with hint
    → retry with member=hint.suggested_name

R13 MEMBER_NOT_FOUND without hint
    → get_type(package, entity) to enumerate members.

R14 find_symbol(ok=true, exports=[]) reformulation bound
    N=1: shorter_stem
    N=2: sibling_surface (base class, helper prefix, common verb)
    N=3: stop. status=gap.

R15 SECTION_NOT_FOUND with hint.close_match
    → retry docs_section with url_or_path=hint.close_match
    on second SECTION_NOT_FOUND: stop.

R16 PACKAGE_NOT_FOUND
    → status=gap. blocker=package_not_installed.

R17 LIBRARY_NOT_ONBOARDED
    → status=gap. blocker=library_not_onboarded.

R18 AMBIGUOUS
    → reformulate with concrete identifier. Max 1 retry.

R19 TIMEOUT | INTERNAL
    → 1 retry. If reproducible: status=gap. blocker=tool_error.

R20 meta.source.kind=github_fallback AND meta.source.ref_kind=head
    → append one line to affected output:
      `Caveat: prose sourced from <repo> HEAD; cross-check Tier 1 for signatures.`
    → no emoji, no bold.
```

`docs_section` as capability (not a trigger rule):

After `docs_search`, call `docs_section(library, url_or_path=hits[K].section_path)` only when the facet requires a concrete code-fact (signature / field:type / config key / fenced-code example) and no excerpt contains it. Caller judgment, not mandatory follow-up. Over-calling `docs_section` for concept/narrative questions is out of contract.

### Valid empty results (NOT zero-signal, NOT gap)

- `list_deprecations → exports=[]` = no deprecations.
- `list_entry_points → exports=[]` = no entry points.
- `get_package_metadata` missing optional field = optional by design.
- `get_type → fields=[]` when `kind ∈ {type_alias, enum, primitive, union, literal}` = content in `text` / `union`.
- `get_signature → params=[]` when entity ∈ {getter, predicate, `__len__`, `__hash__`, `__str__`, `__repr__`} = genuinely parameterless.

Tool silence on other envelope patterns ≠ factual claim. See R1–R5.

### Scope boundaries

**in_scope** (call StackLens):
- Types, signatures, exports, deprecations of packages installed in `node_modules/` or `.venv/`.
- Prose (concepts, migrations, recipes, configs) for libraries listed in `stack.yaml`.

**out_of_scope** (do NOT call StackLens directly; route per table):

| Class | Channel |
|---|---|
| Architectural / design decisions (SSR vs SSG, monolith vs microservices, library selection) | `@stacklens-architect` |
| Runtime behavior not in library docs (race conditions, GC timing, internal caching) | `@stacklens-architect` |
| Security / compliance rules | `@stacklens-architect` |
| Cross-library architecture — neither snapshot covers the join | `@stacklens-architect` |
| Language stdlib (`asyncio`, `fetch`, `Array.prototype.*`) | language docs |
| Business logic / UI design / process decisions | escalate to parent; architect does not cover these |

Two-phase pattern for `@stacklens-architect`-routed facets:
1. `@stacklens-architect` returns `## Decision` + `## Recommended facets` (code-fact facets derived from the decision).
2. Fire `## Recommended facets` through `@stacklens-consultant` for code-ready output.
3. Final synthesis combines decision rationale + code-facts.

### Envelope schema

```
ok: true
  data: <tool-specific>
  meta:
    library: <name>
    source_version: <pkg-version | iso-utc-mtime:sha256[:8]>
    latency_ms: <n>
    tool_version: <semver>
    source_files: [<abs-path>, ...]       # types only
    snapshot_sha256: <hex>                # prose only
    source:                               # prose only
      kind: llms_full | github_fallback | frontmatter | monolithic
      ref_kind: tag | head                # github_fallback only

ok: false
  error:
    code: PACKAGE_NOT_FOUND | TYPE_NOT_FOUND | MEMBER_NOT_FOUND |
          LIBRARY_NOT_ONBOARDED | SECTION_NOT_FOUND | AMBIGUOUS |
          TIMEOUT | INTERNAL
    message: <str>
    hint?:
      suggested_name?: <str>              # TYPE_NOT_FOUND, MEMBER_NOT_FOUND
      close_match?: <url | section_path>  # SECTION_NOT_FOUND
```

### Prose hit fields

- `body`: always populated (full section markdown).
- `section_path`: always populated. Canonical retrieval key for `docs_section(library, url_or_path=<section_path>)`.
- `url`: optional metadata. Empty (`""`) for monolithic sources (e.g. mantine, zod). Not a retrieval key. Never gate follow-up on `url ≠ ""`.
- `title`: always populated.
- `score`: BM25 ranking.
- `body_sha256`: dedup.

### Invariants

1. Determinism: identical call on unchanged install-tree / snapshot → byte-identical `data` + `meta`. `latency_ms` varies.
2. Zero network at query-time. Zero LLM inside MCPs.
3. Hard library filter: `docs_search({library:"X"})` returns X only.
4. `url` is optional metadata. `section_path` is the retrieval key.
5. Chain-closed facet (≥2 calls) = status=full. Not partial.
6. Over-trigger cost = 1 local call. Under-trigger cost = incorrect output. Prefer over-trigger.

### Subagent delegation

Subagent `stacklens-consultant` — retrieval subagent over StackLens MCPs. Definition at `.claude/agents/stacklens-consultant.md`. Returns machine-format envelope: `## Answer` + `## Citations` + `## Trace` + `## Status` (∈ {full, partial, gap, out_of_scope}) + `## Next facets` (iff status ∈ {partial, gap}).

Delegation envelope (facets list format):

```
@stacklens-consultant
facets:
- package=<spec> entity=<Name> [member=<Name>] → signature|type|list_exports|find_symbol:<query>
- library=<lib-id> query="<terms>" → prose
```

Delegation condition: count(facets) ≥ 2 OR facet requires chain (types → prose). Single atomic facet → inline call (no subagent).
<!-- stacklens:end -->
