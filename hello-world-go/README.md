# Hello World (Go)

A minimal "Hello, World!" program written in Go, shipped as a standalone
compiled executable.

## Project layout

```
hello-world-go/
├── main.go     # Source code: prints "Hello, World!"
├── go.mod      # Go module definition (module: hello-world, go 1.21)
├── build.sh    # Convenience script to compile the executable
└── README.md   # This file
```

## Requirements

- Go toolchain installed (version 1.21 or later recommended).
  Download from https://go.dev/dl/ if you don't already have it.

## Build the executable

From inside the `hello-world-go` directory, run either:

```bash
go build -o hello-world main.go
```

or use the provided helper script:

```bash
chmod +x build.sh
./build.sh
```

This produces a self-contained native binary called `hello-world`
(or `hello-world.exe` on Windows) in the current directory. Go binaries
are statically linked by default, so the resulting executable has no
external runtime dependencies and can be copied/run on any compatible
machine of the same OS/architecture.

## Run it

```bash
./hello-world
```

Expected output:

```
Hello, World!
```

## Cross-compiling

Go supports easy cross-compilation by setting the `GOOS` and `GOARCH`
environment variables before building, for example:

```bash
GOOS=linux   GOARCH=amd64 go build -o hello-world-linux-amd64   main.go
GOOS=darwin  GOARCH=arm64 go build -o hello-world-darwin-arm64  main.go
GOOS=windows GOARCH=amd64 go build -o hello-world-windows.exe   main.go
```

## Run without building a separate step (development only)

```bash
go run main.go
```

This compiles and runs the program in one step but does not leave a
persistent executable behind (unlike `go build`).
