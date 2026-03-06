# {{SERVICE_NAME_PASCAL}} Service

A gRPC microservice in the Finance-app monorepo.

## Overview

This service is part of the Finance-app monorepo. It was scaffolded using:

```bash
python scripts/cli.py scaffold --name {{SERVICE_NAME}} --lang go --type {{SERVICE_TYPE}}
```

## Getting Started

### Prerequisites

- Go 1.22+
- `protoc` + `protoc-gen-go` + `protoc-gen-go-grpc`
- Docker (for container builds)

### Install protoc plugins

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

### Development

```bash
# Generate protobuf stubs
make proto

# Run tests
make test

# Run locally
make run

# Build Docker image
make docker-build
```

## Configuration

The service reads configuration from `config/config.yaml` and environment variables
(env vars take precedence).

| Variable | Default | Description |
|----------|---------|-------------|
| `GRPC_PORT` | `50051` | gRPC server port |
| `ENV` | `development` | Runtime environment |
| `LOG_LEVEL` | `info` | Log level |

## API

See [`proto/service.proto`](proto/service.proto) for the full API definition.

## Architecture

```
{{SERVICE_NAME}}/
├── cmd/server/main.go          # Entry point
├── proto/service.proto         # Protobuf definition
├── api/                        # Generated gRPC stubs (auto-generated)
├── internal/
│   ├── handler/handler.go      # gRPC handler (transport layer)
│   ├── service/service.go      # Business logic
│   └── repository/             # Data access layer
├── Makefile
└── Dockerfile
```
