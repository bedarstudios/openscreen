# Showhow Workspace Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the dormant Showhow Chrome-extension repository without losing its unfinished local work, and make `bedarstudios/openscreen` the sole active Showhow repository and workspace target.

**Architecture:** First copy or move the still-active documentation and design material into the clean desktop repository and commit it there. Then retarget only current OS configuration and operational prompts, preserve the extension checkout as an exact local archive, and finally archive its GitHub repository. Historical records remain unchanged.

**Tech Stack:** Git, GitHub CLI, Markdown, macOS filesystem, Bedarstudios OS repository.

## Global Constraints

- Preserve the extension checkout's nested `.git/`, current branch, modified files, untracked files, and generated directories exactly.
- Never run destructive Git cleanup, reset, checkout, or deletion commands.
- Do not push the unfinished extension work or rewrite its branches.
- Do not rewrite historical decisions, journals, learnings, implementation notes, completed plans, or dated reports.
- Do not stage or commit unrelated pre-existing OS worktree changes.
- Stop if the archive destination already exists, the desktop repository gains unrelated changes, or the archived extension state does not match the recorded state.
- Keep the desktop checkout's `upstream` remote and GitHub fork relationship unchanged.

---

## File Map

### Active desktop repository

- Create: `docs/superpowers/specs/2026-07-11-showhow-desktop-design.md` — active desktop-pivot product specification copied from the retired checkout.
- Modify: `docs/superpowers/plans/2026-07-11-phase-1-fork-folder-bundle.md` — point its `Spec` field at the in-repository specification.
- Create: `docs/product/feature-backlog.md` — active post-V1 backlog moved from the Showhow parent folder.
- Create: `docs/design/design/**` — approved mock and design-system source assets moved from the parent folder.
- Create: `docs/design/mocks/workflow-doc-mock.html` — workflow document mock moved from the parent folder.

### Bedarstudios OS repository

- Modify: `.gitignore` — remove the retired checkout path and ignore the exact local archive path.
- Modify: `AGENTS.md` — describe only `desktop/` as the active Showhow build and record the archived extension location.
- Modify: `context/current-priorities.md` — remove the dormant companion from active project structure and point at the migrated spec.
- Modify: `Resources/AI/hygiene/local-runner/hygiene-prompt.md` — audit `showhow/desktop` and `bedarstudios/openscreen`.
- Modify: `Resources/AI/multi-model-loop/pr-triage-prompt.md` — triage `bedarstudios/openscreen` and calculate its calibration count.
- Modify: `Resources/AI/multi-model-loop/review-agent-prompt.md` — replace the old repository in the live review allowlist.
- Modify: `Resources/AI/multi-model-loop/LOOP.md` — document the active review allowlist.
- Modify: `Resources/AI/oms-mission-control-setup.md` — use `showhow/desktop` in current setup guidance.
- Append: `decisions/log.md` — record the reversible retirement and canonical active repository.

### Local and GitHub state

- Move: `Projects/web/showhow/app/` to `Archive/Projects/web/showhow-extension-2026-07-16/`.
- Update: GitHub repository setting for `bedarstudios/showhow` from active to archived.

---

### Task 1: Migrate active Showhow material into the desktop repository

**Files:**
- Create: `docs/superpowers/specs/2026-07-11-showhow-desktop-design.md`
- Modify: `docs/superpowers/plans/2026-07-11-phase-1-fork-folder-bundle.md:11`
- Create: `docs/product/feature-backlog.md`
- Create: `docs/design/design/approved-mock/Showhow Desktop.dc.html`
- Create: `docs/design/design/approved-mock/support.js`
- Create: `docs/design/design/approved-mock/.thumbnail`
- Create: `docs/design/design-system/Showhow Design System.dc.html`
- Create: `docs/design/design-system/support.js`
- Create: `docs/design/design-system/.thumbnail`
- Create: `docs/design/mocks/workflow-doc-mock.html`

**Interfaces:**
- Consumes: the approved retirement spec and source material in `../app/`, `../assets/`, and `../feature-backlog.md`.
- Produces: a self-contained desktop repository whose active plan resolves its specification locally.

- [ ] **Step 1: Verify the desktop checkout has no unexpected changes**

Run:

```bash
cd /Users/mohamedb/dev/OS/Projects/web/showhow/desktop
git status --porcelain
git rev-parse --abbrev-ref main@{upstream}
git remote get-url origin
```

Expected: no porcelain output; upstream is `origin/main`; origin is `https://github.com/bedarstudios/openscreen.git`.

- [ ] **Step 2: Verify every migration source exists**

Run:

```bash
test -f ../app/docs/superpowers/specs/2026-07-11-showhow-desktop-design.md
test -f ../feature-backlog.md
test -d ../assets/design
test -d ../assets/mocks
test ! -e docs/superpowers/specs/2026-07-11-showhow-desktop-design.md
test ! -e docs/product/feature-backlog.md
test ! -e docs/design/design
test ! -e docs/design/mocks
```

Expected: exit status 0. Stop on any non-zero result.

- [ ] **Step 3: Copy the pivot spec and move parent-owned material**

Run:

```bash
mkdir -p docs/superpowers/specs docs/product docs/design
cp ../app/docs/superpowers/specs/2026-07-11-showhow-desktop-design.md docs/superpowers/specs/
mv ../feature-backlog.md docs/product/feature-backlog.md
mv ../assets/design docs/design/design
mv ../assets/mocks docs/design/mocks
rmdir ../assets
```

Expected: the copied spec remains present under `../app/`; the backlog and assets exist only under `desktop/docs/`.

- [ ] **Step 4: Repair the Phase 1 spec reference**

Use `apply_patch` to replace:

```markdown
**Spec:** `Projects/web/showhow/app/docs/superpowers/specs/2026-07-11-showhow-desktop-design.md`
```

with:

```markdown
**Spec:** `docs/superpowers/specs/2026-07-11-showhow-desktop-design.md`
```

in `docs/superpowers/plans/2026-07-11-phase-1-fork-folder-bundle.md`.

- [ ] **Step 5: Verify the migrated material**

Run:

```bash
cmp ../app/docs/superpowers/specs/2026-07-11-showhow-desktop-design.md docs/superpowers/specs/2026-07-11-showhow-desktop-design.md
test -f docs/product/feature-backlog.md
test -f 'docs/design/design/approved-mock/Showhow Desktop.dc.html'
test -f 'docs/design/design-system/Showhow Design System.dc.html'
test -f docs/design/mocks/workflow-doc-mock.html
rg -n 'Projects/web/showhow/app|bedarstudios/showhow' docs/superpowers/plans/2026-07-11-phase-1-fork-folder-bundle.md
git diff --check
```

Expected: `cmp` succeeds; all `test` commands succeed; `rg` produces no output; `git diff --check` produces no output.

- [ ] **Step 6: Commit the active-repository migration**

Run:

```bash
git add docs/superpowers/specs/2026-07-11-showhow-desktop-design.md \
  docs/superpowers/plans/2026-07-11-phase-1-fork-folder-bundle.md \
  docs/product/feature-backlog.md docs/design
git diff --cached --stat
git commit -m "docs: consolidate Showhow project material"
```

Expected: the staged diff contains only the listed migration files; commit succeeds.

---

### Task 2: Retarget live Bedarstudios OS references

**Files:**
- Modify: `/Users/mohamedb/dev/OS/.gitignore`
- Modify: `/Users/mohamedb/dev/OS/AGENTS.md`
- Modify: `/Users/mohamedb/dev/OS/context/current-priorities.md`
- Modify: `/Users/mohamedb/dev/OS/Resources/AI/hygiene/local-runner/hygiene-prompt.md`
- Modify: `/Users/mohamedb/dev/OS/Resources/AI/multi-model-loop/pr-triage-prompt.md`
- Modify: `/Users/mohamedb/dev/OS/Resources/AI/multi-model-loop/review-agent-prompt.md`
- Modify: `/Users/mohamedb/dev/OS/Resources/AI/multi-model-loop/LOOP.md`
- Modify: `/Users/mohamedb/dev/OS/Resources/AI/oms-mission-control-setup.md`
- Append: `/Users/mohamedb/dev/OS/decisions/log.md`

**Interfaces:**
- Consumes: canonical local path `Projects/web/showhow/desktop`, canonical repository `bedarstudios/openscreen`, migrated spec path, and archive path.
- Produces: current operational prompts and context that no longer dispatch work to the retired extension.

- [ ] **Step 1: Capture the OS worktree baseline**

Run:

```bash
cd /Users/mohamedb/dev/OS
git status -sb
git diff --name-only
```

Expected: pre-existing unrelated changes may be present. Save the output and do not edit, stage, or commit those paths.

- [ ] **Step 2: Update the nested-repository ignore rules**

Use `apply_patch` in `.gitignore` to replace:

```gitignore
Projects/web/showhow/app/
Projects/web/showhow/desktop/
```

with:

```gitignore
Projects/web/showhow/desktop/
Archive/Projects/web/showhow-extension-2026-07-16/
```

- [ ] **Step 3: Update active project context**

Use `apply_patch` so `AGENTS.md` retains the `desktop/` active-build entry, removes the active `app/` child entry, and adds one sentence:

```markdown
  - The former Chrome-extension checkout (`bedarstudios/showhow`) was retired on 2026-07-16 and preserved at `Archive/Projects/web/showhow-extension-2026-07-16/`; its GitHub repository is archived.
```

Use `apply_patch` in `context/current-priorities.md` to replace its two extension/spec bullets with:

```markdown
   - The former Chrome extension (`bedarstudios/showhow`) was retired and archived on 2026-07-16; its local checkout is preserved under `Archive/Projects/web/showhow-extension-2026-07-16/`.
   - Design spec: `Projects/web/showhow/desktop/docs/superpowers/specs/2026-07-11-showhow-desktop-design.md`.
```

- [ ] **Step 4: Retarget the hygiene and multi-model-loop prompts**

Use `apply_patch` to make these exact substitutions in current operational files:

```text
/Users/mohamedb/dev/OS/Projects/web/showhow/app -> /Users/mohamedb/dev/OS/Projects/web/showhow/desktop
bedarstudios/showhow -> bedarstudios/openscreen
showhow/app -> showhow/desktop
```

Apply them only in:

```text
Resources/AI/hygiene/local-runner/hygiene-prompt.md
Resources/AI/multi-model-loop/pr-triage-prompt.md
Resources/AI/multi-model-loop/review-agent-prompt.md
Resources/AI/multi-model-loop/LOOP.md
Resources/AI/oms-mission-control-setup.md
```

In `pr-triage-prompt.md`, also replace `for cura and showhow only` with `for cura and openscreen only`.

- [ ] **Step 5: Append the retirement decision**

Use `apply_patch` to append this single entry to `decisions/log.md`, following its existing append-only format:

```markdown
[2026-07-16] DECISION: Retired the dormant Showhow Chrome-extension repository after the desktop pivot. The complete dirty checkout, including Git metadata and uncommitted Phase 2 work, is preserved at `Archive/Projects/web/showhow-extension-2026-07-16/`; `bedarstudios/showhow` is archived on GitHub. `Projects/web/showhow/desktop/` and `bedarstudios/openscreen` are now the sole active local and remote Showhow targets. The desktop-pivot spec, shared design assets, and feature backlog were consolidated into the active desktop repository. | REASONING: Keeping two sibling repositories made the dormant extension look active and repeatedly sent automation toward the wrong repo. A reversible local and GitHub archive preserves unfinished work and history without leaving ambiguity in the active workspace. | CONTEXT: Showhow workspace retirement following the 2026-07-11 desktop pivot and 2026-07-16 active-repo correction.
```

- [ ] **Step 6: Verify live references and preserve historical records**

Run:

```bash
rg -n 'Projects/web/showhow/app|showhow/app|bedarstudios/showhow' \
  AGENTS.md context/current-priorities.md \
  Resources/AI/hygiene/local-runner/hygiene-prompt.md \
  Resources/AI/multi-model-loop/pr-triage-prompt.md \
  Resources/AI/multi-model-loop/review-agent-prompt.md \
  Resources/AI/multi-model-loop/LOOP.md \
  Resources/AI/oms-mission-control-setup.md
git diff --check
```

Expected: only the intentional archived-repository sentences in `AGENTS.md` and `context/current-priorities.md` may match `bedarstudios/showhow`; no operational prompt matches the old path or repository; `git diff --check` is empty.

- [ ] **Step 7: Commit only the scoped OS alignment files**

Run:

```bash
git add .gitignore AGENTS.md context/current-priorities.md \
  Resources/AI/hygiene/local-runner/hygiene-prompt.md \
  Resources/AI/multi-model-loop/pr-triage-prompt.md \
  Resources/AI/multi-model-loop/review-agent-prompt.md \
  Resources/AI/multi-model-loop/LOOP.md \
  Resources/AI/oms-mission-control-setup.md decisions/log.md
git diff --cached --name-only
git commit -m "chore: retire legacy Showhow workspace"
```

Expected: the cached name list is exactly the nine files above; unrelated pre-existing changes remain unstaged after the commit.

---

### Task 3: Preserve the exact extension checkout in the OS archive

**Files:**
- Move: `/Users/mohamedb/dev/OS/Projects/web/showhow/app/`
- Create: `/Users/mohamedb/dev/OS/Archive/Projects/web/showhow-extension-2026-07-16/`

**Interfaces:**
- Consumes: an ignored, nested Git checkout and its recorded branch/status/hash evidence.
- Produces: the same readable Git checkout at an archive path outside the active project tree.

- [ ] **Step 1: Record the source state and assert the destination is absent**

Run:

```bash
cd /Users/mohamedb/dev/OS
test -d Projects/web/showhow/app/.git
test ! -e Archive/Projects/web/showhow-extension-2026-07-16
git -C Projects/web/showhow/app branch --show-current > /tmp/showhow-extension-branch.before
git -C Projects/web/showhow/app rev-parse HEAD > /tmp/showhow-extension-head.before
git -C Projects/web/showhow/app status --porcelain=v1 > /tmp/showhow-extension-status.before
```

Expected: destination absence check succeeds; evidence files are created.

- [ ] **Step 2: Move the complete checkout**

Run:

```bash
mkdir -p Archive/Projects/web
mv Projects/web/showhow/app Archive/Projects/web/showhow-extension-2026-07-16
```

Expected: the source path no longer exists and the destination contains `.git/`.

- [ ] **Step 3: Compare the archived state byte-for-byte at the Git-report level**

Run:

```bash
git -C Archive/Projects/web/showhow-extension-2026-07-16 branch --show-current > /tmp/showhow-extension-branch.after
git -C Archive/Projects/web/showhow-extension-2026-07-16 rev-parse HEAD > /tmp/showhow-extension-head.after
git -C Archive/Projects/web/showhow-extension-2026-07-16 status --porcelain=v1 > /tmp/showhow-extension-status.after
cmp /tmp/showhow-extension-branch.before /tmp/showhow-extension-branch.after
cmp /tmp/showhow-extension-head.before /tmp/showhow-extension-head.after
cmp /tmp/showhow-extension-status.before /tmp/showhow-extension-status.after
test "$(cat /tmp/showhow-extension-branch.after)" = phase-2-recording-capture
test ! -e Projects/web/showhow/app
git status --short -- Archive/Projects/web/showhow-extension-2026-07-16 Projects/web/showhow/app
```

Expected: all comparisons succeed; archived branch is `phase-2-recording-capture`; source is absent; OS Git reports neither archive contents nor the old ignored checkout.

---

### Task 4: Archive the remote extension repository

**Files:**
- Update: GitHub repository setting for `bedarstudios/showhow`.

**Interfaces:**
- Consumes: authenticated GitHub CLI and the successfully preserved local checkout from Task 3.
- Produces: a recoverable, read-only GitHub repository while `bedarstudios/openscreen` remains active.

- [ ] **Step 1: Confirm remote identities and current archive state**

Run:

```bash
gh auth status
gh repo view bedarstudios/showhow --json nameWithOwner,isArchived,url
gh repo view bedarstudios/openscreen --json nameWithOwner,isArchived,url
```

Expected: authenticated; `bedarstudios/showhow` has `isArchived: false`; `bedarstudios/openscreen` has `isArchived: false`.

- [ ] **Step 2: Archive only the old repository**

Run:

```bash
gh repo archive bedarstudios/showhow --yes
```

Expected: command succeeds without prompting.

- [ ] **Step 3: Verify the remote end state**

Run:

```bash
gh repo view bedarstudios/showhow --json nameWithOwner,isArchived,url
gh repo view bedarstudios/openscreen --json nameWithOwner,isArchived,url
```

Expected: `bedarstudios/showhow` has `isArchived: true`; `bedarstudios/openscreen` remains `isArchived: false`.

---

### Task 5: Run end-to-end verification and publish the desktop documentation

**Files:**
- Verify: both local repositories, the OS worktree, and both GitHub repositories.

**Interfaces:**
- Consumes: outputs from Tasks 1–4.
- Produces: current evidence that the active workspace is focused, the archive is recoverable, and the remote retirement succeeded.

- [ ] **Step 1: Verify the Showhow parent contains only the active checkout**

Run:

```bash
find /Users/mohamedb/dev/OS/Projects/web/showhow -maxdepth 1 -mindepth 1 -print | sort
```

Expected: exactly `/Users/mohamedb/dev/OS/Projects/web/showhow/desktop`.

- [ ] **Step 2: Verify desktop documentation and Git state**

Run:

```bash
cd /Users/mohamedb/dev/OS/Projects/web/showhow/desktop
test -f docs/superpowers/specs/2026-07-11-showhow-desktop-design.md
test -f docs/product/feature-backlog.md
test -d docs/design/design
test -d docs/design/mocks
git remote get-url origin
git rev-parse --abbrev-ref main@{upstream}
git status -sb
git diff --check
```

Expected: all files exist; origin is `bedarstudios/openscreen`; upstream branch is `origin/main`; working tree is clean and ahead only by the planned documentation commits.

- [ ] **Step 3: Push the planned desktop documentation commits**

Run:

```bash
git push origin main
git status -sb
```

Expected: push succeeds; status is `## main...origin/main` with no ahead count or working-tree changes.

- [ ] **Step 4: Verify OS scope and archived checkout**

Run:

```bash
cd /Users/mohamedb/dev/OS
git status -sb
git -C Archive/Projects/web/showhow-extension-2026-07-16 status -sb
git -C Archive/Projects/web/showhow-extension-2026-07-16 remote -v
```

Expected: unrelated pre-existing OS changes remain; no new Showhow archive contents appear; archived checkout retains its dirty `phase-2-recording-capture` state and `bedarstudios/showhow` origin.

- [ ] **Step 5: Verify live references and GitHub archive state one final time**

Run:

```bash
rg -n 'Projects/web/showhow/app|showhow/app|bedarstudios/showhow' \
  AGENTS.md context/current-priorities.md \
  Resources/AI/hygiene/local-runner/hygiene-prompt.md \
  Resources/AI/multi-model-loop/pr-triage-prompt.md \
  Resources/AI/multi-model-loop/review-agent-prompt.md \
  Resources/AI/multi-model-loop/LOOP.md \
  Resources/AI/oms-mission-control-setup.md
gh repo view bedarstudios/showhow --json isArchived,url
gh repo view bedarstudios/openscreen --json isArchived,url
```

Expected: only intentional archival-history sentences match the old repository; old operational paths do not match; old repository is archived; active repository is not archived.
