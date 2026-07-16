# Copilot Instructions

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

- This repo is a fork of OpenScreen, but it is our codebase -- no upstream merges
  are planned. Do not open PRs against `getopenscreen/openscreen`, and do not
  restore the upstream release/Discord workflows that were deliberately removed.
- Always target `bedarstudios/openscreen` `main` as the PR base.
