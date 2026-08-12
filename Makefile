.PHONY: build build-docs deploy deploy-api deploy-web dev lighthouse migrate-status migrate-up migrate-down migrate-status-remote migrate-up-remote migrate-down-remote migrate-new seed-local test test-api test-web

build: build-docs
	pnpm run build

build-docs:
	cd apps/web && pnpm build:docs

deploy: deploy-api deploy-web

deploy-api:
	cd apps/api && pnpm wrangler deploy

deploy-web:
	cd apps/web && pnpm wrangler pages deploy .svelte-kit/cloudflare --project-name=tabitabi

dev:
	pnpm run dev

lighthouse:
	node tools/run-lighthouse.js http://localhost:5173

migrate-status:
	cd apps/api && node scripts/d1-migrate.mjs status

migrate-up:
	cd apps/api && node scripts/d1-migrate.mjs up

migrate-down:
	cd apps/api && node scripts/d1-migrate.mjs down

migrate-status-remote:
	cd apps/api && node scripts/d1-migrate.mjs status --remote

migrate-up-remote:
	cd apps/api && node scripts/d1-migrate.mjs up --remote

migrate-down-remote:
	cd apps/api && node scripts/d1-migrate.mjs down --remote

migrate-new:
	@test -n "$(name)" || (echo "Usage: make migrate-new name=add_example" && exit 1)
	pnpm exec dbmate --migrations-dir apps/db/migrations/sql new $(name)

seed-local:
	cd apps/api && WRANGLER_LOG_PATH=$(CURDIR)/apps/api/.wrangler/wrangler.log pnpm run seed:local

test:
	pnpm run test

test-api:
	pnpm run test:api

test-web:
	pnpm run test:web
