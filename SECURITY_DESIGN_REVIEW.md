# Security & Design Review — `hello-world-go` project

**Reviewer:** Senior Engineer
**Scope:** All files in `hello-world-go/` (`main.go`, `go.mod`, `build.sh`, `build.bat`, `README.md`), verified directly against on-disk content at review time.

---

## 0. Verification method

Every file was read directly from disk before writing this review (not inferred from any earlier summary):

- `hello-world-go/main.go` — read in full.
- `hello-world-go/go.mod` — read in full.
- `hello-world-go/build.sh` — read in full.
- `hello-world-go/build.bat` — attempted read; result: `Error: File not found at path: hello-world-go/build.bat`. Confirmed absent from disk.
- `hello-world-go/README.md` — read in full.

**Note on `build.bat`:** `README.md`'s documented "Project layout" section only lists `main.go`, `go.mod`, `build.sh`, and `README.md`, and its build instructions only ever reference `go build`, `./build.sh`, and `go run`. It never mentions `build.bat` anywhere. So the absence of `build.bat` is **not** a documentation-contradiction — the project doesn't claim to have one. It is, however, a genuine **design gap**: there is no Windows-native (`.bat`/`.ps1`) build script, only a Bash script (`build.sh`) and manual `go build` instructions. This is addressed as Finding #1 below.

---

## 1. Design gap — No Windows-native build script

There is no `build.bat` (or `.ps1`) in the project, and `build.sh` begins with `#!/usr/bin/env bash`, so it will not run natively via double-click or `cmd.exe`/PowerShell on Windows without WSL, Git Bash, or Cygwin.

**Impact:** Windows users without a Bash-compatible shell are left with a purely manual workflow (`go build -o hello-world.exe main.go`), which is documented and functionally fine, but is an inconsistent developer experience compared to the one-command `./build.sh` convenience offered on Unix-like systems. Low severity since the README is honest about this and doesn't overclaim Windows tooling support, but worth calling out given the project explicitly documents cross-compiling to `windows.exe` as a first-class use case.

**Recommendation:** Add a small `build.bat` or `build.ps1` mirroring `build.sh`'s behavior (build, name the output `hello-world.exe`, print status), or at minimum add an explicit one-line PowerShell/cmd equivalent to the README so Windows-only users aren't left to infer the command themselves.

---

## 2. Design mistake — No `.gitignore` for build artifacts

`build.sh` (and any manual `go build`) compiles output binaries directly into the project directory: `hello-world`, `hello-world.exe`, and cross-compiled artifacts such as `hello-world-linux-amd64`, `hello-world-darwin-arm64`, `hello-world-windows.exe` per the README's own documented examples. There is no `.gitignore` file present.

**Impact:** Compiled binaries are easy to accidentally `git add`/commit, bloating the repository with platform-specific binary blobs, causing noisy diffs, and creating a real risk that a stale binary is committed and later mistaken for "the" official build — a subtle integrity/supply-chain concern if that binary is ever redistributed without being rebuilt from the current `main.go`.

**Recommendation:** Add a `.gitignore` excluding `hello-world`, `hello-world.exe`, `hello-world-*`, and any `/dist` or `/bin` directory. Prefer building into a dedicated `bin/`/`dist/` output directory rather than the repository root.

---

## 3. Design mistake — No pinned/reproducible toolchain, no supply-chain controls

`go.mod` in full:
```
module hello-world

go 1.21
```

**Issues:**
- No `toolchain` directive — different Go patch versions across machines/CI could in principle produce different binaries, with no explicit reproducibility guarantee for a project explicitly marketed as producing a redistributable "standalone executable."
- No `go.sum`, no documented `GOFLAGS`/`GOPROXY`/checksum-verification stance. For a genuinely zero-dependency hello-world this is low severity today, but if this repository is ever used as a template for real projects with actual dependencies, there is currently no habit or tooling in place to catch a compromised dependency or a poisoned module proxy.

**Recommendation:** Document (or script) `GOFLAGS=-mod=readonly`, consider pinning an exact toolchain version via the `toolchain` directive, and add `go.sum`-based verification once real dependencies are introduced.

---

## 4. Security flaw (supply chain / PATH hijacking) — `build.sh` invokes bare `go`

```bash
go build -o "${OUTPUT_NAME}" main.go
```

`build.sh` invokes `go` by bare name, relying entirely on the caller's `$PATH`. There is no `command -v go` check, no printed/verified path or version, and no explicit "Go not found" guard — a missing toolchain simply surfaces as the shell's own generic "command not found" error.

**Impact:** This is a classic PATH-hijacking vector. If an attacker can place a malicious executable named `go` earlier in a victim's `$PATH` (compromised dev container, shared/misconfigured CI runner, poisoned onboarding/setup script, etc.), running `./build.sh` will silently execute attacker-controlled code under the invoking user's privileges instead of the legitimate Go toolchain. The probability is low for a personal, local hello-world build, but this exact script pattern is the kind that gets copy-pasted verbatim into higher-stakes build pipelines, so it is worth correcting at the source rather than assuming low-risk context indefinitely.

**Recommendation:**
- Print `go version` and the resolved binary path (`command -v go`) before building, so the toolchain actually in use is visible and auditable in build logs.
- In CI or any shared/multi-tenant environment, invoke Go via an absolute, pinned path or a vetted, version-pinned container image rather than relying on ambient `$PATH` resolution.

---

## 5. Design mistake — Weak input validation and error handling in `build.sh`

- `set -euo pipefail` is present and is good practice — that part is solid.
- However, `GOOS`/`GOARCH`, if exported by the caller, are never validated or echoed before being handed to `go build`. The script only special-cases `GOOS == "windows"` to pick the `.exe` suffix; it does not print the effective `GOOS`/`GOARCH` it's building for (falling back to `go env GOOS`/`go env GOARCH` when unset), so a caller who exports a typo'd or unexpected `GOARCH` while leaving `GOOS` unset gets no early warning — only whatever error (or silently-wrong-named artifact) `go build` itself produces.
- The script never checks that the `go` toolchain is present before attempting to use it (compounding Finding #4): failures surface as a generic shell "command not found" rather than a clear, actionable message from the script itself.

**Recommendation:** Echo the resolved `GOOS`/`GOARCH` (defaulting to `go env GOOS`/`go env GOARCH` when unset) before building, and add an explicit guard such as:
```bash
command -v go >/dev/null || { echo "Go toolchain not found in PATH" >&2; exit 1; }
```

---

## 6. Minor — `main.go` discards `fmt.Println`'s return values

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
```

`fmt.Println` returns `(int, error)`, both discarded here. This is entirely acceptable for this trivial program — a failed stdout write isn't actionable in a hello-world — but it is flagged so this isn't blindly copy-pasted as a "template" pattern into contexts where output failures actually matter (e.g., writing to a file, a network socket, or a pipe that can receive `SIGPIPE`) and should be handled or logged.

---

## 7. Minor — No `LICENSE` file

The README frames this project as producing a distributable "standalone executable" that "can be copied/run on any compatible machine," implying redistribution, but there is no `LICENSE` file specifying reuse/redistribution terms. Low severity for a hello-world exercise, but worth adding (MIT/Apache-2.0 or similar) if distribution beyond the author is genuinely intended.

---

## 8. Minor — No automated verification (tests/CI)

There is no `main_test.go` and no CI workflow (e.g., GitHub Actions) that builds and runs the binary on each documented target OS (`linux/amd64`, `darwin/arm64`, `windows/amd64` per the README's cross-compile examples). Without CI or a scripted existence/consistency check, "the code and docs are in sync" is only ever true until the next unreviewed edit.

**Recommendation:** Add a minimal CI workflow that runs `go vet ./...`, `go build ./...`, and executes the resulting binary on at least one Linux and one Windows runner, so documentation, build scripts, and source stay in sync automatically rather than by manual re-reading.

---

## Summary Table

| # | Severity | Finding | File(s) |
|---|----------|---------|---------|
| 1 | Design | No Windows-native build script (`build.sh` is Bash-only); README doesn't overclaim, but the UX gap is real given documented Windows cross-compile support | `build.sh`, README |
| 2 | Design | No `.gitignore`; build artifacts (including cross-compiled binaries from the README's own examples) can pollute the repo | project root |
| 3 | Design / supply chain | No toolchain pin, no `go.sum`/reproducibility controls | `go.mod` |
| 4 | **Security** (PATH hijack risk) | `go` invoked by bare name in `build.sh` with no version/path verification | `build.sh` |
| 5 | Design | Weak validation/echoing of `GOOS`/`GOARCH`, and no guard for a missing `go` toolchain before use | `build.sh` |
| 6 | Minor | Ignored return values from `fmt.Println` (precedent-setting only, not a real flaw in this program) | `main.go` |
| 7 | Minor | No `LICENSE` file despite implied redistribution | project root |
| 8 | Minor | No CI/tests to catch drift between docs, scripts, and source over time | project root |

---

## Overall Assessment

The Go source (`main.go`) is correct and has essentially no attack surface — a two-line `Hello, World!` program is about as low-risk as software gets, and no vulnerability was found in it. The real issues all live in the surrounding **process/tooling layer**: `build.sh` trusts an unverified, `$PATH`-resolved `go` binary (a real, if low-probability-in-this-specific-repo, supply-chain risk pattern worth fixing on principle — Finding #4), there is no Windows-native build script despite the README documenting Windows as a cross-compile target (Finding #1), and there are no guardrails (`.gitignore`, CI, license, toolchain pinning) that a "ready to ship, standalone executable" framing implies (Findings #2, #3, #7, #8). None of these are severe for a hello-world used as a local exercise, but I would not sign off on this repository as a production-ready *template* for future projects until Findings #2, #3, #4, #5, and #8 are addressed — these are exactly the class of small gaps that compound once real dependencies, real users, and real CI/CD pipelines are layered on top.
