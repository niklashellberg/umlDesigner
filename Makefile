.PHONY: build-local build up down start stop logs inspect clean dev

# -- Local build (pre-req for container) --

build-local:
	pnpm build
	npx esbuild server/ws-server.ts --bundle --platform=node --target=node22 --outfile=server/dist/ws-server.js --format=cjs

# -- Apple Container commands --

build: build-local
	container build -t uml-designer -f Containerfile .

up: build
	container run --name uml-designer -d \
		-p 3000:3000 \
		-p 4444:4444 \
		uml-designer

down:
	container stop uml-designer && container rm uml-designer

start:
	container start uml-designer

stop:
	container stop uml-designer

logs:
	container logs uml-designer

inspect:
	container inspect uml-designer

clean:
	-container stop uml-designer 2>/dev/null
	-container rm uml-designer 2>/dev/null
	-container image rm uml-designer:latest 2>/dev/null

# -- Local dev --

dev:
	pnpm dev:all
