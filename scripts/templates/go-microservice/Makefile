# ── {{SERVICE_NAME}} Makefile ────────────────────────────────────────────────
# Usage:
#   make proto         - generate gRPC/protobuf code
#   make build         - compile the binary
#   make run           - run locally
#   make test          - run tests
#   make docker-build  - build Docker image
#   make lint          - run linters

SERVICE   = {{SERVICE_NAME}}
MODULE    = {{MODULE_PATH}}
PROTO_DIR = ./proto
API_DIR   = ./api
BIN       = ./bin/$(SERVICE)
IMAGE     = ghcr.io/hrnewcoll/finance-app/$(SERVICE)

.PHONY: all proto build run test lint docker-build docker-push clean

all: proto build

# ── Protobuf ─────────────────────────────────────────────────────────────────
proto:
	@echo "→ Generating protobuf stubs..."
	@mkdir -p $(API_DIR)
	protoc \
		--go_out=$(API_DIR) \
		--go_opt=paths=source_relative \
		--go-grpc_out=$(API_DIR) \
		--go-grpc_opt=paths=source_relative \
		-I $(PROTO_DIR) \
		$(PROTO_DIR)/*.proto
	@echo "✅ Protobuf stubs generated in $(API_DIR)"

# ── Build ─────────────────────────────────────────────────────────────────────
build: proto
	@echo "→ Building $(SERVICE)..."
	@mkdir -p bin
	CGO_ENABLED=0 go build \
		-ldflags="-s -w" \
		-o $(BIN) \
		./cmd/server/...
	@echo "✅ Binary: $(BIN)"

# ── Run ───────────────────────────────────────────────────────────────────────
run: build
	@echo "→ Starting $(SERVICE)..."
	$(BIN)

# ── Tests ─────────────────────────────────────────────────────────────────────
test:
	@echo "→ Running tests..."
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -func=coverage.out

# ── Lint ──────────────────────────────────────────────────────────────────────
lint:
	@echo "→ Running linters..."
	go vet ./...
	@which golangci-lint > /dev/null 2>&1 && golangci-lint run ./... || \
		echo "golangci-lint not installed, run: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest"

# ── Docker ────────────────────────────────────────────────────────────────────
docker-build:
	@echo "→ Building Docker image $(IMAGE)..."
	docker build -t $(IMAGE):latest .
	@echo "✅ Image: $(IMAGE):latest"

docker-push: docker-build
	docker push $(IMAGE):latest

# ── Clean ─────────────────────────────────────────────────────────────────────
clean:
	rm -rf bin/ coverage.out
	rm -rf $(API_DIR)/*.pb.go
