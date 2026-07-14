FROM golang:latest AS builder

WORKDIR /app

COPY ./src /app/

RUN go mod download

# Build the app from the module directory.
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o ./out/app .

# Second stage
FROM debian:stable-slim

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/out/app .

EXPOSE 3000

CMD ./app
