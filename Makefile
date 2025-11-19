.PHONY: build deploy deploy-api deploy-web dev migrate-local migrate-remote

build:
	pnpm run build

deploy: deploy-api deploy-web

deploy-api:
	cd apps/api && pnpm wrangler deploy

deploy-web:
	cd apps/web && pnpm wrangler pages deploy .svelte-kit/cloudflare --project-name=tabitabi

dev:
	pnpm run dev

migrate-local:
	cd apps/api && pnpm wrangler d1 execute tabitabi --local --file=../../migrations/0001_simple_schema.sql

migrate-remote:
	cd apps/api && pnpm wrangler d1 execute tabitabi --remote --file=../../migrations/0001_simple_schema.sql
