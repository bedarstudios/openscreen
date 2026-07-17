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
- **When you have finished addressing every finding and pushed your commits, post one
  final comment containing exactly `@greptileai` to request a re-review.** Post it once,
  after the last push -- not per commit. Greptile does not re-review on push, so without
  this the PR never gets a round-2 score and stalls until it goes stale.

## Repo-specific

- This is the standalone Showhow Desktop repository. Treat the source ancestor as attribution and
  compatibility context, not as an operational parent; follow `UPSTREAM.md` for focused imports.
- Always target `bedarstudios/showhow-desktop` `main` as the PR base.
- Preserve the Bedar Studios review-glue workflows and their label ownership. Do not replace them
  with source-project community automation.
