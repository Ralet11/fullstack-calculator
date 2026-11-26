FROM golang:1.27.4-alpine3.24 AS build

WORKDIR /src
COPY go.mod main.go ./
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -o /calculator-api .

FROM alpine:3.24

COPY --from=build /calculator-api /usr/local/bin/calculator-api
USER 65534:65534
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/calculator-api"]
