# Copilot Instructions

## When dispatched as REVIEWER

- You are a REVIEWER. Read the full diff of this PR against `main`.
- Score the diff against `.github/copilot-review-rubric.md`.
- Output exactly one line `Confidence Score: N/5`, followed by numbered findings,
  each citing `file:line`. If a finding is a behavioral bug, it MUST cite the
  missing failing-test gap.
- Modify nothing: no commits, no pushes, no file edits, no label changes, no
  merge or close. Comment only.
- If the score is <5, a separate fixer run addresses the findings -- you do not
  fix anything yourself.

## When dispatched on a PR to address review findings

- Fix ONLY what the review findings name. No drive-by refactors, no unrelated
  cleanup, no dependency bumps.
- Reply to each finding with what changed, or a one-line reasoned pushback if you
  believe it should not change.
- Never add, remove, or edit PR labels (round-1, round-2, needs-fixes, etc.) --
  automation owns them.
- Never merge or close the PR.
- If a finding describes a behavioral bug, add or update a test that fails without
  your fix.
- Evidence files (screenshots etc.) are committed under `artifacts/<issue-number>/`
  and referenced by path in your reply -- raw.githubusercontent URLs do not render
  on private repos.
- Keep commits small: one commit per finding or per coherent group of findings.

## Repo-specific

- This repo is Showhow, which began as a fork of OpenScreen, but it is our
  codebase -- no upstream merges are planned. Do not open PRs against
  `getopenscreen/openscreen`, and do not restore the upstream release, Discord,
  or milestone workflows and scripts that were deliberately deleted.
- Always target `bedarstudios/showhow` `main` as the PR base.
- OpenScreen still appears deliberately in a few places: the `.openscreen`
  project file extension, `package.json` `name`, the Nix module API, native
  helper env vars, and the historical specs under `docs/superpowers/`. See
  SHOWHOW.md before "fixing" any of them.
