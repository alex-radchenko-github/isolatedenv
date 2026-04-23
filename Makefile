COMPOSE_FILES := -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: help up down reset seed logs status build shell-api shell-db migrate migrate-create backup generate-types test-backend lint-backend

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

## Start all services (dev mode)
up: ## Start all services (dev mode)
	docker compose $(COMPOSE_FILES) up -d

## Stop all services
down: ## Stop all services
	docker compose $(COMPOSE_FILES) down

## Full reset: remove volumes (DB data) and restart
## Use after regenerating the project or to fix password mismatches
reset: ## Full reset: remove volumes and restart
	docker compose $(COMPOSE_FILES) down -v
	docker compose $(COMPOSE_FILES) up -d

## Follow all service logs
logs: ## Follow all service logs
	docker compose $(COMPOSE_FILES) logs -f

## Run seed (Authentik init + DB migrations) — waits for completion, then exits
seed: ## Run seed (Authentik init + DB migrations)
	@docker compose $(COMPOSE_FILES) run --rm seed

## Show service status
status: ## Show service status
	docker compose $(COMPOSE_FILES) ps

build: ## Build all Docker images
	docker compose $(COMPOSE_FILES) build

shell-api: ## Open shell in backend container
	docker compose exec backend bash

shell-db: ## Open psql shell
	docker compose exec db psql -U postgres -d isolatedenv

migrate: ## Run Alembic migrations
	docker compose exec backend alembic upgrade head

migrate-create: ## Create new migration (usage: make migrate-create MSG="add_foo")
	docker compose exec backend alembic revision --autogenerate -m "$(MSG)"

backup: ## Backup PostgreSQL database (custom format with compression)
	docker compose exec db pg_dump -Fc -U postgres isolatedenv > backup_$$(date +%Y%m%d_%H%M%S).dump

generate-types: ## Generate TypeScript types from OpenAPI
	./scripts/generate-types.sh

test-backend: ## Run backend tests
	docker compose exec backend pytest -v

lint-backend: ## Run ruff linter on backend
	docker compose exec backend ruff check app/
