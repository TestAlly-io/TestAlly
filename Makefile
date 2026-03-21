IMAGE_NAME := testally
BUILD_IMAGE := testally-build
DOCKER_BUILD_RUN := docker run --rm -v $(CURDIR):/app -w /app $(BUILD_IMAGE)

TEST_IMAGE := testally-test
TEST_RUN := docker run --rm \
	-v $(CURDIR)/client/src:/app/client/src:ro \
	-v $(CURDIR)/client/tsconfig.json:/app/client/tsconfig.json:ro \
	-v $(CURDIR)/client/vite.config.ts:/app/client/vite.config.ts:ro \
	-v $(CURDIR)/server/src:/app/server/src:ro \
	-v $(CURDIR)/server/tsconfig.json:/app/server/tsconfig.json:ro \
	-v $(CURDIR)/vitest.config.ts:/app/vitest.config.ts:ro \
	-v $(CURDIR)/vitest.e2e.config.ts:/app/vitest.e2e.config.ts:ro \
	-v $(CURDIR)/tsconfig.json:/app/tsconfig.json:ro \
	-w /app $(TEST_IMAGE)

.PHONY: build build-image build-client build-server ensure-build-image \
	test test-client test-server build-test-image ensure-test-image

build: build-client build-server

build-image:
	docker build --target deps -t $(BUILD_IMAGE) .

ensure-build-image:
	@docker image inspect $(BUILD_IMAGE) >/dev/null 2>&1 || $(MAKE) build-image

build-client: ensure-build-image
	$(DOCKER_BUILD_RUN) npm run build --workspace=client

build-server: ensure-build-image
	$(DOCKER_BUILD_RUN) npm run build --workspace=server

build-test-image:
	docker build -t $(TEST_IMAGE) -f Dockerfile.test .

ensure-test-image:
	@docker image inspect $(TEST_IMAGE) >/dev/null 2>&1 || $(MAKE) build-test-image

test: ensure-test-image
	$(TEST_RUN) npx vitest run

test-client: ensure-test-image
	$(TEST_RUN) npx vitest run --project client

test-server: ensure-test-image
	$(TEST_RUN) npx vitest run --project server
