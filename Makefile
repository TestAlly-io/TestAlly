IMAGE_NAME := testally
DOCKER_RUN := docker run --rm -v $(CURDIR):/app -w /app $(IMAGE_NAME)

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

.PHONY: build build-image build-client build-server ensure-image \
	test test-client test-server build-test-image ensure-test-image

build: build-client build-server

build-image:
	docker build -t $(IMAGE_NAME) .

ensure-image:
	@docker image inspect $(IMAGE_NAME) >/dev/null 2>&1 || $(MAKE) build-image

build-client: ensure-image
	$(DOCKER_RUN) npm run build --workspace=client

build-server: ensure-image
	$(DOCKER_RUN) npm run build --workspace=server

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
