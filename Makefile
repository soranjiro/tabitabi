.PHONY: build deploy deploy-api deploy-web dev

build:
	pnpm run build

deploy: deploy-api deploy-web

deploy-api:
	cd apps/api && pnpm wrangler deploy

deploy-web:
	cd apps/web && pnpm wrangler pages deploy .svelte-kit/cloudflare --project-name=tabitabi

dev:
	pnpm run dev
