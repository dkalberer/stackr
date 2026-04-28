FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o stackr-backend ./cmd/server/

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/stackr-backend .
COPY --from=builder /app/migrations ./migrations
EXPOSE 8080
CMD ["./stackr-backend"]
