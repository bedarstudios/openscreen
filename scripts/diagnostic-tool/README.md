# Showhow standalone diagnostic tool

A small Node.js script that runs the native capture helper outside the
Electron app, captures its stdout/stderr, and writes a JSON report.

Used to capture `[stop-timing]` lines emitted by the WGC / ScreenCaptureKit
helper when a recording stop hangs, so the issue reporter can attach the
data without installing or rebuilding the full app.

## Requirements

- Node.js 22+ (Showhow's own engine pin)
- The native capture helper for your platform in one of:
  - the same directory as `diagnostic.mjs` (`wgc-capture.exe` on Windows,
    `openscreen-screencapturekit-helper` on macOS)
  - `helpers/<platform>-<arch>/<helper-name>` (CI artifact layout)
  - `$OPENSCREEN_HELPER_EXE` env var. **Legacy compatibility:** the diagnostic executable still
    reads this inherited variable until the runtime compatibility migration adds `SHOWHOW_HELPER_EXE`.

Linux is not currently supported — Showhow has no Linux native helper.

## Usage

```text
node diagnostic.mjs --duration 10 --output ./diag.json
```

Flags:
- `-d, --duration <seconds>` recording length before sending stop (default 10)
- `-o, --output <path>` output JSON path (default `./showhow-diagnostic-<timestamp>.json`).
  New reports use the Showhow filename. Legacy helper environment variables and macOS helper names
  remain read-only discovery fallbacks.
- `--window` capture a window instead of the full display (default: display)
- `-h, --help` show help

Or use the bundled launcher:
- Windows: `diagnostic.bat`
- macOS / Linux: `./diagnostic.sh`

## Output

The JSON contains:
- system info (platform, arch, OS, CPU, memory)
- the helper's full stdout and stderr
- parsed `[stop-timing]` entries as a structured array
- the JSON config that was sent to the helper
- exit code / signal

Attach the JSON to a GitHub issue. Maintainers will read the
`stopTiming` array and the helper stderr to pinpoint which step of the
stop cleanup is slow.

## Layout

```text
scripts/diagnostic-tool/
  README.md
  diagnostic.mjs        # the tool
  diagnostic.bat        # Windows launcher
  diagnostic.sh         # macOS / Linux launcher
```

Run the tool from the repository with `npm run diagnostic:run`. On Windows,
`npm run diagnostic:smoke:win` runs the same executable with a three-second duration.
