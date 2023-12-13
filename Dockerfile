# syntax=docker/dockerfile:1
#FIXME: need to set configuration via environment variables with
#reasonable defaults, e.g. htdocs path, MySQL connection
FROM golang:1.20
WORKDIR /usr/local/src/cold
RUN mkdir -p ./cmd/cold
COPY go.mod go.sum ./
COPY *.go ./
COPY cmd/cold/*.go ./cmd/cold
COPY htdocs ./htdocs
RUN go build -v -o ./bin/cold ./cmd/cold/cold.go
CMD [ "./bin/cold" ]
