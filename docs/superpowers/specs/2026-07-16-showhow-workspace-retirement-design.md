# Showhow Workspace Retirement Design

**Date:** 2026-07-16  
**Status:** Approved for planning  
**Scope:** Retire the dormant Chrome-extension checkout and align the Showhow workspace around the active Electron desktop app.

## Context

Showhow pivoted from a standalone Chrome extension to an Electron desktop app on 2026-07-11. The active repository is `bedarstudios/openscreen`, checked out at `Projects/web/showhow/desktop/`. The former product repository, `bedarstudios/showhow`, remains checked out at `Projects/web/showhow/app/` and contains substantial uncommitted extension work.

The parent Showhow folder also holds shared assets and a feature backlog, while the authoritative desktop-pivot spec still lives inside the dormant extension repository. Several live OS prompts and operational references still target the old checkout or GitHub repository.

## Goal

Make `Projects/web/showhow/` unambiguously desktop-first while preserving recoverability of the unfinished extension work and retaining historical records.

When complete:

- `Projects/web/showhow/` contains only the active `desktop/` repository.
- `desktop/` continues to point to `bedarstudios/openscreen` through its `origin` remote.
- The desktop-pivot spec, project assets, and feature backlog live inside the active repository.
- Live OS automation and project references target `showhow/desktop` and `bedarstudios/openscreen`.
- The extension checkout is preserved under the OS archive with its Git metadata and uncommitted work intact.
- `bedarstudios/showhow` is archived on GitHub and is read-only.

## Chosen Approach

Use a reversible retirement rather than leaving both repositories active or deleting the old checkout.

### 1. Preserve the extension checkout

Move the complete `Projects/web/showhow/app/` directory to:

`Archive/Projects/web/showhow-extension-2026-07-16/`

The archive must retain:

- the nested `.git/` directory and local branches;
- all tracked files;
- all modified and untracked files;
- generated directories currently present in the checkout.

The move must occur only after recording pre-move Git status and verifying that the destination does not already exist. After the move, Git status and the current branch must be readable from the archive location and must match the pre-move state.

### 2. Move active project material into the desktop repository

Before relocating the extension checkout:

- move `app/docs/superpowers/specs/2026-07-11-showhow-desktop-design.md` to `desktop/docs/superpowers/specs/`;
- update the active Phase 1 plan so its `Spec` link resolves to the new in-repository path;
- move `Projects/web/showhow/feature-backlog.md` into `desktop/docs/product/feature-backlog.md`;
- move `Projects/web/showhow/assets/` into `desktop/docs/design/` while preserving its existing `design/` and `mocks/` contents.

These files become part of `bedarstudios/openscreen` and should be committed there as one focused documentation-and-assets change before the local extension checkout is moved.

### 3. Retarget live OS references

Update current operational material that would otherwise keep targeting the retired repository:

- `AGENTS.md` and `context/current-priorities.md`;
- the repository hygiene prompt;
- active multi-model-loop review and PR-triage prompts;
- the live loop allowlist/documentation;
- current mission-control setup guidance;
- the OS `.gitignore` entries for nested Showhow repositories.

Live references should use:

- local checkout: `/Users/mohamedb/dev/OS/Projects/web/showhow/desktop`;
- GitHub repository: `bedarstudios/openscreen`;
- desktop-pivot spec: `Projects/web/showhow/desktop/docs/superpowers/specs/2026-07-11-showhow-desktop-design.md`.

Do not rewrite historical records merely because they mention the old repository. Append-only decisions, journal entries, learnings, past implementation notes, completed plans, and dated triage reports must remain historically accurate.

### 4. Archive the GitHub repository

Archive `bedarstudios/showhow` through GitHub after the local checkout is preserved. Verify the repository reports `isArchived: true` afterward.

Archiving is intentionally reversible through GitHub settings. Do not delete the GitHub repository, rewrite branches, push the local uncommitted work, close historical issues, or modify releases as part of this cleanup.

### 5. Record the retirement

Append a decision-log entry stating that the extension repository was retired and archived, where its local checkout was preserved, and that `bedarstudios/openscreen` is the sole active Showhow repository.

Append a concise learning only if execution reveals a reusable insight not already represented in `learnings.md`.

## Safety and Failure Handling

- Stop if the archive destination already exists or the extension Git state cannot be reproduced after the move.
- Do not use destructive Git commands or clean untracked files.
- Do not modify or commit unrelated pre-existing OS worktree changes.
- If the active desktop repository becomes dirty from another source during execution, stop before committing.
- If GitHub archival fails, keep the locally preserved checkout and report the remote repository as still active; do not substitute deletion.
- If any live reference is ambiguous between historical documentation and current operational configuration, leave it unchanged and report it.

## Verification

The cleanup is complete only when all of the following are true:

1. `desktop` has `origin` set to `https://github.com/bedarstudios/openscreen.git` and `main` tracks `origin/main`.
2. The migrated desktop-pivot spec exists inside `desktop/`, and the active Phase 1 plan link resolves.
3. The feature backlog and assets exist inside `desktop/` at their designated paths.
4. The archived extension checkout exists at the archive path, retains its `.git/` directory, remains on `phase-2-recording-capture`, and shows the same modified/untracked file set recorded before the move.
5. `Projects/web/showhow/` contains only `desktop/`.
6. A scoped search finds no stale old-repo references in current operational files; historical records may still contain them.
7. GitHub reports `bedarstudios/showhow` as archived and `bedarstudios/openscreen` as active.
8. The desktop repository commit contains only the planned spec, plan-link, backlog, and asset moves.
9. OS changes contain only the planned live-reference, ignore-rule, and append-only decision updates alongside unrelated pre-existing user changes.

## Out of Scope

- Resuming or completing the Chrome extension.
- Porting extension code into Electron.
- Deleting the local archive or GitHub repository.
- Detaching `bedarstudios/openscreen` from its upstream fork relationship.
- Removing the `upstream` Git remote from the desktop checkout.
- Rewriting historical plans, decisions, journals, learnings, or reports.
- Product feature development or changes to the desktop application runtime.
