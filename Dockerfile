# syntax=docker/dockerfile:1
#FIXME: need to set configuration via environment variables with
#reasonable defaults, e.g. htdocs path, MySQL connection
FROM golang:1.18
WORKDIR /usr/src/cold
COPY go.mod go.sum ./
COPY . .
RUN go build -v -o /usr/local/bin/cold ./cmd/cold/cold.go
CMD [ "cold" ]
