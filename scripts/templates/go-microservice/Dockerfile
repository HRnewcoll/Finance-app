# ── Build stage ───────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata protoc protobuf-dev

WORKDIR /app

# Cache Go modules
COPY go.mod go.sum* ./
RUN go mod download

# Copy source and build
COPY . .
RUN make proto build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /app/bin/{{SERVICE_NAME}} /{{SERVICE_NAME}}

# gRPC port
EXPOSE 50051

USER 65534:65534

ENTRYPOINT ["/{{SERVICE_NAME}}"]
