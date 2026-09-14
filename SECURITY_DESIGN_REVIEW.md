# Security & Design Review — `hello-world-go` project

**Reviewer:** Senior Engineer
**Scope:** All files in `hello-world-go/` (`main.go`, `go.mod`, `build.sh`, `build.bat`, `README.md`), verified directly against on-disk content at review time.

---

## 0. Verification method

Every file was re-read directly from disk before writing this review, rather than trusting any prior summary at face value.

**Correction to a prior report:** an earlier draft of this review claimed that `README.md` "describes `build.bat` in detail" and that its absence contradicted the documentation. On this direct re-read, **`README.md` does not mention `build.bat` at all** — its documented project layout only lists `main.go`, `go.mod`, `build.sh`, and `README.md`, and its build instructions only cover `go build`, `./build.sh`, and `go run`. So:

- `build.bat` is indeed **absent from disk** (confirmed: `Error: File not found at path: hello-world-go/build.bat`).
- However, the project is **not** actually contradicting its own README by this absence — the README never promised a `build.bat`. The only inaccurate claim was made in a *prior review's own summary text*, not in the project's documentation.
- This is still worth flagging, but reclassified below as a **process note about the review chain**, not a defect in the project itself. The real, project-level design gap is simply: **there is no Windows-native build script**, only a Bash script and manual `go build` instructions — Windows users without a Bash-compatible shell must know to run the raw `go build -o hello-world.exe main.go` command themselves.

---

## 1. Design gap — No Windows-native build script (reclassified from "critical/missing file")

There is no `build.bat` (or `.ps1`) in the project, and the README does not claim one exists. `build.sh` is a Bash script (`#!/usr/bin/env bash`), which will not run natively via double-click or `cmd.exe` on Windows without WSL/Git Bash/Cygwin.

**Impact:** Windows users get a strictly manual workflow (`go build -o hello-world.exe main.go`), which is documented and works fine, but is an inconsistent developer experience vs. the one-command `./build.sh` convenience offered elsewhere. Low severity since it's honestly documented, but worth calling out as a gap if "shipped as a standalone executable" is meant to include first-class Windows support.

**Recommendation:** Either add a small `build.bat`/`build.ps1` mirroring `build.sh`'s behavior, or add a one-line PowerShell equivalent to the README so Windows users aren't left to infer the command themselves.

---

## 2. Design mistake — No `.gitignore` for build artifacts

`build.sh` (and any manual `go build`) compiles output binaries (`hello-world`, `hello-world.exe`, and cross-compiled binaries like `hello-world-linux-amd64` per the README's own examples) directly into the project directory. There is no `.gitignore`.

**Impact:** Compiled binaries are easy to accidentally `git add`/commit, bloating the repo with platform-specific binary blobs, causing noisy diffs, and risking a stale/mismatched binary being committed that no longer reflects current `main.go` source (a subtle supply-chain/integrity concern if that binary is later distributed as "the" build).

**Recommendation:** Add a `.gitignore` excluding `hello-world`, `hello-world.exe`, `hello-world-*`, and any `/dist` or `/bin` output directory. Prefer building into a dedicated `bin/`/`dist/` directory rather than the repo root.

---

## 3. Design mistake — No pinned/reproducible toolchain, no supply-chain controls

`go.mod` contains only:
```
module hello-world

go 1.21
```

**Issues:**
- No `toolchain` directive — different Go patch versions across machines/CI could in principle produce different binaries, with no reproducibility guarantee for something explicitly marketed as a redistributable "standalone executable."
- No `go.sum`, no `GOFLAGS=-mod=readonly` guidance, no documented `GOPROXY`/checksum-verification stance. For a genuinely zero-dependency hello-world this is low severity today, but if this project is used as a template for future work with real dependencies, there's currently no habit/tooling in place to catch a compromised dependency or proxy.

**Recommendation:** Document (or script) `GOFLAGS=-mod=readonly`, consider pinning an exact toolchain version via the `toolchain` directive, and add `go.sum` verification once real dependencies exist.

---

## 4. Security flaw (supply chain / PATH hijacking) — `build.sh` invokes bare `go`

```bash
go build -o "${OUTPUT_NAME}" main.go
```

`build.sh` calls `go` by bare name, relying entirely on the caller's `$PATH`, with no check of which binary will actually execute (no `command -v go`, no version pin/verification, no explicit "Go not found" guard message beyond the shell's own error).

**Impact:** Classic PATH-hijacking vector: if an attacker can place a malicious executable named `go` earlier in a victim's `$PATH` (compromised dev container, shared CI runner, poisoned onboarding script, etc.), running `./build.sh` silently executes attacker-controlled code under the invoking user's privileges instead of the real Go toolchain. Low probability for a personal hello-world run locally, but this is exactly the kind of script pattern that gets copy-pasted into higher-stakes build pipelines, so it should be corrected at the source.

**Recommendation:**
- Print `go version` and the resolved path (`command -v go`) before building, so the toolchain in use is visible/auditable.
- In CI or shared environments, invoke Go via an absolute, pinned path or a vetted, pinned container image rather than relying on ambient `$PATH`.

---

## 5. Design mistake — Weak error/input handling in `build.sh`

- `set -euo pipefail` is good practice and present — that part is solid.
- However, `GOOS` is taken directly from the environment and used unquoted-comparison-only to decide the output filename; there's no validation that `GOOS`/`GOARCH`, if set by a caller, are sane values before invoking `go build`. `go build` will itself reject bad values, but the script gives no earlier, clearer error message, and doesn't echo the effective `GOOS`/`GOARCH` being targeted (only special-cases `windows` for the filename), which can silently produce a wrong-named artifact if e.g. `GOARCH` is exported to something unexpected while `GOOS` is unset.
- The script does not verify the `go` toolchain is present before running (see #4), so failures surface as a generic "command not found" from the shell rather than a clear, actionable message from the script itself.

**Recommendation:** Echo the resolved `GOOS`/`GOARCH` (defaulting to `go env GOOS`/`go env GOARCH` when unset) before building, and add an explicit `command -v go >/dev/null || { echo "Go toolchain not found in PATH" >&2; exit 1; }` guard for a clearer failure mode.

---

## 6. Minor — `main.go` discards `fmt.Println`'s return values

```go
func main() {
	fmt.Println("Hello, World!")
}
```

`fmt.Println` returns `(int, error)`, discarded here. Entirely fine for this trivial program (a failed stdout write isn't actionable in a hello-world), but flagged so this isn't blindly copy-pasted as a "template" pattern into contexts where output failures (e.g., writing to a file, network, or pipe under `SIGPIPE`) actually matter and should be handled/logged.

---

## 7. Minor — No `LICENSE` file

The README frames this as a distributable "standalone executable" that "can be copied/run on any compatible machine," implying redistribution, but there is no license file specifying reuse/redistribution terms. Low severity, but worth adding (MIT/Apache-2.0 or similar) if distribution beyond the author is actually intended.

---

## 8. Minor — No automated verification (tests/CI)

There is no `main_test.go` and no CI workflow (e.g., GitHub Actions) that actually builds and runs the binary on each documented target OS. Given that this very review chain previously produced an inaccurate claim about missing documentation (see §0), this underscores a general point: **without CI or a documented-file-existence check, "done" claims for even trivial projects can silently drift from reality** — the fix is automated verification, not more careful manual re-reading each time.

**Recommendation:** Add a minimal CI workflow that runs `go vet ./...`, `go build ./...`, and executes the resulting binary on at least Linux and Windows runners, to keep documentation, scripts, and source in sync going forward.

---

## Summary Table

| # | Severity | Finding | File(s) |
|---|----------|---------|---------|
| 1 | Design | No Windows-native build script (`build.sh` is Bash-only); README correctly doesn't overclaim, but the UX gap is real | `build.sh`, README |
| 2 | Design | No `.gitignore`; build artifacts can pollute repo | project root |
| 3 | Design / supply chain | No toolchain pin, no `go.sum`/reproducibility controls | `go.mod` |
| 4 | Security (PATH hijack risk) | `go` invoked by bare name with no version/path verification | `build.sh` |
| 5 | Design | Weak validation/echoing of `GOOS`/`GOARCH` and missing toolchain-presence guard | `build.sh` |
| 6 | Minor | Ignored return values from `fmt.Println` (precedent-setting only, not a real flaw here) | `main.go` |
| 7 | Minor | No `LICENSE` file despite implied redistribution | project root |
| 8 | Minor | No CI/tests to catch drift between docs/scripts/source over time | project root |

---

## Overall Assessment

The Go source (`main.go`) is correct and has no real attack surface — a two-line `Hello, World!` program is about as low-risk as software gets. The actual issues are all in the surrounding **process/tooling layer**: `build.sh` trusts an unverified `$PATH`-resolved `go` binary (a real, if low-probability-here, supply-chain risk pattern), there's no Windows-native build script despite an implied cross-platform audience, and there are no guardrails (`.gitignore`, CI, license, toolchain pinning) that a "ready to ship, standalone executable" framing implies. None of these are severe for a hello-world used purely as a local exercise, but I would not sign off on this as a production-ready *template* for future projects until findings #2–#5 and #8 are addressed, since those are exactly the kind of small gaps that compound once real dependencies and real users are involved.
