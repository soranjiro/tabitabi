.PHONY: build deploy dev

build:
	pnpm run build

deploy:
	pnpm run build && wrangler deploy

dev:
	pnpm run dev:full
