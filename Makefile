IMAGE_NAME := testally
DEV_IMAGE := testally-dev
MOUNTS := \
	-v $(CURDIR)/client/src:/app/client/src:ro \
	-v $(CURDIR)/client/index.html:/app/client/index.html:ro \
	-v $(CURDIR)/client/tsconfig.json:/app/client/tsconfig.json:ro \
	-v $(CURDIR)/client/tsconfig.build.json:/app/client/tsconfig.build.json:ro \
	-v $(CURDIR)/client/vite.config.ts:/app/client/vite.config.ts:ro \
	-v $(CURDIR)/server/src:/app/server/src:ro \
	-v $(CURDIR)/server/tsconfig.json:/app/server/tsconfig.json:ro \
	-v $(CURDIR)/vitest.config.ts:/app/vitest.config.ts:ro \
	-v $(CURDIR)/vitest.e2e.config.ts:/app/vitest.e2e.config.ts:ro \
	-v $(CURDIR)/vitest.integration.config.ts:/app/vitest.integration.config.ts:ro \
	-v $(CURDIR)/tests:/app/tests:ro \
	-v $(CURDIR)/tsconfig.json:/app/tsconfig.json:ro

DEV_RUN := docker run --rm $(MOUNTS) -w /app $(DEV_IMAGE)
BUILD_RUN := docker run --rm $(MOUNTS) -v $(CURDIR)/build:/app/build -w /app $(DEV_IMAGE)

.PHONY: build build-client build-server dev-image ensure-dev-image \
	test test-client test-server test-integration

dev-image:
	docker build --target deps -t $(DEV_IMAGE) .

ensure-dev-image:
	@docker image inspect $(DEV_IMAGE) >/dev/null 2>&1 || $(MAKE) dev-image

build: build-client build-server

build-client: ensure-dev-image
	$(BUILD_RUN) npm run build --workspace=client

build-server: ensure-dev-image
	$(BUILD_RUN) npm run build --workspace=server

test: ensure-dev-image
	$(DEV_RUN) npx vitest run

test-client: ensure-dev-image
	$(DEV_RUN) npx vitest run --project client

test-server: ensure-dev-image
	$(DEV_RUN) npx vitest run --project server

test-integration: ensure-dev-image
	docker run --rm $(MOUNTS) --env-file $(CURDIR)/.env -w /app $(DEV_IMAGE) npx vitest run --config vitest.integration.config.ts
