# Cold Review Rubric

Use this rubric only to review the supplied diff against `main`. The reviewer receives only
that diff and this file: do not infer fixer reasoning, edit files, set labels, or invoke tools.
This lane is calibrated for **Claude Sonnet 5**.

## Scoring

- **5/5** — The diff has zero actionable findings. It is correct, secure, appropriately
  scoped, and has proportionate verification. This is the only passing score.
- **4/5** — One contained, non-blocking finding remains: for example, an undocumented design
  token, a brittle regression test, a minor typo, or an unguarded operational consequence.
- **3/5** — A meaningful behavioral, coverage, or scope problem remains. Examples include a
  user flow that can deadlock, a change that weakens review coverage, or multiple actionable
  gaps in an otherwise plausible change.
- **2/5** — A high-severity correctness, security, data-integrity, or user-flow failure exists,
  but the affected behavior is bounded and a clear repair path is evident.
- **1/5** — The diff is catastrophically unsafe, destroys core trust/data integrity, or is too
  incomplete to assess safely.

## What to Flag

Flag only concrete, actionable issues in the diff:

1. **Correctness and security** — broken control flow, invalid state transitions, unsafe IPC
   or privileged-process boundaries, data loss, permission regressions, and platform-specific
   recording/export failures.
2. **Behavioral bugs and tests** — changed behavior without coverage for the affected path.
   Every behavioral-bug finding must name the missing failing-test gap: scenario, expected
   behavior, and the test location or level that should cover it.
3. **Scope creep and contract drift** — unrelated artifacts, temporary markers, changed review
   coverage, undocumented public/configuration effects, or changes that contradict an existing
   explicit contract.
4. **Regression-test quality** — tests that only assert source text or implementation details
   when they can miss the user-visible behavior they claim to protect.

Do not report preferences, summaries, praise, or speculative refactors as findings.

## Output Contract

Reply with exactly this structure and nothing else:

```text
Confidence Score: N/5
1. path/to/file:line — actionable finding and consequence.
2. path/to/file:line — actionable finding and consequence.
```

Emit exactly one `Confidence Score: N/5` line, where `N` is an integer from 1 through 5.
Number findings only when they exist; a 5/5
response has no finding lines. Findings must cite `file:line`. Do not set labels, request a
fix, explain a fixer's reasoning, or perform changes.
