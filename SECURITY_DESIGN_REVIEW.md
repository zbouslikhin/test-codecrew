# Security & Design Review — `hello-world-go` project

**Reviewer:** Senior Engineer
**Scope:** All files in `hello-world-go/` (`main.go`, `go.mod`, `build.sh`, `build.bat`, `README.md`), verified against actual on-disk content.

---

## 0. Verification method

I re-read every file directly from disk before reviewing, rather than trusting the prior summary. Result: **the summary is not fully accurate** — see Finding #1.

---

## 1. CRITICAL (integrity/process) — `build.bat` does not exist

The task summary and `README.md` both claim a Windows build script `build.bat` is present and describe its contents. When actually read from disk:

```
Error: File not found at path: hello-world-go/build.bat
```

**Impact:**
- Windows users following the README will hit a "file not found" error with no working build path on that OS, despite documentation promising one.
- This is a **process/design flaw**: the delivered artifact does not match its own documentation and the prior "everything is in place, ready to build/run" claim is false. This is exactly the kind of discrepancy that erodes trust in "done" reports and should always be caught by re-verifying file existence, not just summarizing prior claims.

**Recommendation:** Either actually create `build.bat` with the documented content, or remove all Windows-specific claims from the README/summary until it exists. Add an automated check (e.g., a CI job or a simple test) that fails the build if files referenced in README are missing.

---

## 2. Design mistake — No `.gitignore` for build artifacts

`build.sh` (and the missing `build.bat`) compile output binaries (`hello-world`, `hello-world.exe`, and any `hello-world-<os>-<arch>` cross-compiled binaries from the README examples) directly into the project/source directory, but there is no `.gitignore`.

**Impact:** Compiled binaries are easy to accidentally `git add`/commit, bloating the repo, causing platform-specific binary diffs/noise, and potentially leaking a stale/backdoored binary that no longer matches source if someone edits `main.go` without rebuilding.

**Recommendation:** Add a `.gitignore` excluding `hello-world`, `hello-world.exe`, `hello-world-*`, and any `/dist` or `/bin` output directory. Prefer building into a dedicated `bin/` or `dist/` directory rather than the repo root.

---

## 3. Design mistake — No pinned/reproducible toolchain, no supply-chain controls

`go.mod` only specifies:
```
module hello-world
go 1.21
```

**Issues:**
- No `toolchain` directive (Go 1.21+ supports `toolchain go1.21.x`) — two developers/CI runners with different Go patch versions could silently produce different binaries, with no reproducibility guarantee for a "standalone executable" that's meant to be shipped.
- No checksum/build-provenance step. For a hello-world this is low severity, but the README explicitly frames this as a redistributable "standalone executable" — if this pattern is reused as a template for real projects, there's no `go.sum`, no `GOFLAGS=-mod=readonly`, no vendoring, and no instructions to verify `go env GOPROXY`/`GONOSUMCHECK` settings. That's a gap worth closing before this is used as a template, since a compromised `GOPROXY` or dependency (once real dependencies are added) would go undetected.

**Recommendation:** Document (or enforce via script) `GOFLAGS=-mod=readonly`, pin an exact toolchain version, and add `go.sum` verification steps once real dependencies exist. Not urgent for a zero-dependency hello-world, but flag it now so the template doesn't propagate the gap.

---

## 4. Security flaw (supply chain / PATH hijacking) — `build.sh` invokes bare `go`

```bash
go build -o "${OUTPUT_NAME}" main.go
```

`build.sh` calls `go` by bare name and relies entirely on the caller's `$PATH`. It does not:
- Verify which `go` binary will actually execute (`command -v go`, checksum, or version pin/check).
- Fail fast with a clear error if `go` is missing (it will just error out from `go: command not found`, which is acceptable, but there's no explicit guard/message).

**Impact:** This is a classic PATH-hijacking vector: if an attacker can place a malicious executable named `go` earlier in a victim's `$PATH` (e.g., via a compromised dev container, CI image, or shared build machine), running `./build.sh` will silently execute attacker-controlled code with the invoking user's privileges instead of the real Go toolchain. For a personal hello-world this is low-probability, but as a **pattern** to copy into future build scripts, it's a bad habit worth correcting immediately.

**Recommendation:**
- At minimum, print `go version` and the resolved path (`command -v go`) before building, so the user can visually confirm the toolchain in use.
- In CI or shared environments, invoke Go via an absolute, pinned path or a vetted container image.

---

## 5. Design mistake — Inconsistent error handling between `build.sh` and `build.bat`

`build.sh` uses `set -euo pipefail`, which aborts immediately on the first failure — good practice.

The (missing, but documented) `build.bat` only checks `%ERRORLEVEL%` after the `go build` call, which is a materially weaker error-handling model (it won't catch failures in later added commands unless every command is manually checked). This is a portability inconsistency: the two "equivalent" scripts don't actually provide equivalent safety guarantees.

**Recommendation:** If `build.bat` is (re)created, add `setlocal enableextensions` and check `errorlevel` after *every* command, or better, standardize on a single cross-platform build entry point (e.g., a `Makefile` or a Go-based `mage`/`task` build tool) instead of maintaining two divergent shell dialects.

---

## 6. Minor — `main.go` has no meaningful error handling (acceptable here, but note the pattern)

```go
func main() {
	fmt.Println("Hello, World!")
}
```

`fmt.Println` returns `(int, error)` which is discarded. For this trivial program that's entirely fine (stdout write failures are not actionable), but if this file is used as a scaffold/template for future "real" programs, flag that this establishes a precedent of ignoring returned errors. Not a flaw in isolation — just noting it so it isn't copy-pasted into contexts where error handling matters (e.g., writing to files/network).

---

## 7. Minor — No `LICENSE` file

The project is described as ready to "ship." There is no license file, so downstream consumers have no clear legal terms for reuse/redistribution of the "standalone executable." Low severity, but worth adding (e.g., MIT/Apache-2.0) if this is meant to be distributed.

---

## 8. Minor — No automated verification (tests/CI)

There is no test file (`main_test.go`) and no CI workflow (e.g., GitHub Actions) to actually build/run the binary on each supported OS. Given that Finding #1 (`build.bat` missing) went undetected until this review, this is a concrete example of why CI matters even for trivial projects: a simple `go build ./...` + `go vet ./...` job on Linux/macOS/Windows runners would have caught the missing file and any cross-compilation regressions automatically.

**Recommendation:** Add a minimal CI workflow that runs `go vet`, `go build`, and executes the resulting binary, on at least Linux and Windows, to keep documentation and reality in sync.

---

## Summary Table

| # | Severity | Finding | File(s) |
|---|----------|---------|---------|
| 1 | Critical (process integrity) | `build.bat` documented/claimed but missing from disk | `build.bat`, `README.md`, prior summary |
| 2 | Design | No `.gitignore`; build artifacts can pollute repo | project root |
| 3 | Design / supply chain | No toolchain pin, no `go.sum`/reproducibility controls | `go.mod` |
| 4 | Security (PATH hijack risk) | `go` invoked by bare name with no version/path verification | `build.sh` |
| 5 | Design | Inconsistent error-handling rigor between shell/bat scripts | `build.sh`, `build.bat` |
| 6 | Minor | Ignored return values from `fmt.Println` (precedent-setting only) | `main.go` |
| 7 | Minor | No `LICENSE` file despite "ready to ship" framing | project root |
| 8 | Minor | No CI/tests to catch drift between docs and files (would have caught #1) | project root |

## Overall Assessment

The Go source itself (`main.go`) is correct and trivially safe — there's no real attack surface in a two-line `Hello, World!` program. The actual risks here are **process and packaging** issues: the deliverable doesn't match its own documentation (missing `build.bat`), the build scripts follow a PATH-trust pattern that's risky to propagate as a template, and there are no guardrails (`.gitignore`, CI, license, toolchain pinning) that a "ready to ship" statement implies. I would **not** sign off on the "project is complete and ready to build/run" claim until Finding #1 is resolved and at minimum a `.gitignore` and CI check are added.
