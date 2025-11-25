.PHONY: build deploy deploy-api deploy-web dev migrate-local migrate-remote test test-api test-web

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
	cd apps/api && pnpm wrangler d1 migrations apply tabitabi --local

migrate-remote:
	cd apps/api && pnpm wrangler d1 migrations apply tabitabi --remote

test:
	pnpm run test

test-api:
	pnpm run test:api

test-web:
	pnpm run test:web
