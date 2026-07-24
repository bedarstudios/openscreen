# Showhow Independent GitHub Cutover Implementation Plan

> **Status: superseded — 2026-07-24.** Not executed as written. This plan created a new `bedarstudios/showhow-desktop`
> repository and mirrored refs into it. What actually happened: the existing repository was
> renamed in place to `bedarstudios/showhow`. Every `showhow-desktop` URL below is therefore
> historical. GitHub still reports the repository as a fork of `getopenscreen/openscreen`; the
> de-forking step remains open.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish `bedarstudios/showhow-desktop` as the verified independent repository, retarget
the local checkout, archive the old fork, and prove temporary selective upstream intake works.

**Architecture:** Create a new non-fork repository and mirror the old repository's refs using
GitHub's documented duplication flow. Recreate repository-level settings explicitly, verify parity,
then switch `origin` and archive the old fork. The old fork remains untouched until every new-repo
gate passes.

**Tech Stack:** Git, GitHub CLI/API, GitHub Actions.

**Authoritative procedure:** GitHub's official
[Duplicating a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/duplicating-a-repository)
mirror workflow. A simple rename is insufficient because GitHub's
[repository rename](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)
preserves the existing fork-network relationship.

## Global Constraints

- This plan mutates external state; obtain explicit execution approval immediately before Task 2.
- Never include secret values in logs or committed artifacts.
- Do not use `git push --mirror` from the working checkout; use a temporary bare clone.
- Do not archive or delete `bedarstudios/openscreen` until the new repository passes Task 4.
- Do not create a permanent OpenScreen remote in the working checkout.

---

### Task 1: Capture a redacted cutover manifest

**Files:**
- Create: `docs/evidence/repository-cutover/preflight.md`
- Create: `docs/evidence/repository-cutover/settings.json`

- [ ] **Step 1: Verify local preconditions**

```bash
git status -sb
git remote -v
git branch --show-current
git rev-parse HEAD
git tag --list
```

Expected: clean tree on `main`; `main` matches the reviewed migration tip; current `origin` is
`bedarstudios/openscreen`; `upstream` may still exist until cutover.

- [ ] **Step 2: Export non-secret repository settings**

```bash
mkdir -p docs/evidence/repository-cutover
gh api repos/bedarstudios/openscreen > /tmp/showhow-repo.json
gh api repos/bedarstudios/openscreen/branches/main/protection > /tmp/showhow-protection.json
gh variable list --repo bedarstudios/openscreen
gh secret list --repo bedarstudios/openscreen
```

Copy only non-sensitive settings into `settings.json`; record secret names, never values, in
`preflight.md`. Record default branch, visibility, issues/wiki/projects flags, Actions permissions,
branch protection, variables, secret names, labels, milestones, releases, environments, webhooks,
and deploy keys requiring recreation.

- [ ] **Step 3: Record ref and release counts**

```bash
git ls-remote --heads origin | wc -l
git ls-remote --tags origin | wc -l
gh release list --repo bedarstudios/openscreen --limit 100
gh api repos/bedarstudios/openscreen/labels --paginate --jq '.[].name'
```

Write counts and the current HEAD SHA into `preflight.md`.

- [ ] **Step 4: Commit the redacted manifest**

```bash
git add docs/evidence/repository-cutover/preflight.md \
  docs/evidence/repository-cutover/settings.json
git commit -m "docs: record Showhow repository cutover preflight"
```

### Task 2: Create and populate the independent repository

**Files:** none in the working tree.

- [ ] **Step 1: Reconfirm explicit approval and name availability**

Run: `gh repo view bedarstudios/showhow-desktop`

Expected before creation: repository not found. Stop if it exists unexpectedly.

- [ ] **Step 2: Create the independent repository**

Run:

```bash
gh repo create bedarstudios/showhow-desktop \
  --public \
  --description "Showhow turns screen recordings into workflow docs and agent-ready handoffs." \
  --disable-wiki
```

Expected: repository URL is printed. Verify:

```bash
gh repo view bedarstudios/showhow-desktop --json nameWithOwner,isFork,visibility,defaultBranchRef
```

Expected: `isFork: false`, `visibility: PUBLIC`.

- [ ] **Step 3: Mirror refs from a temporary bare clone**

```bash
MIRROR_DIR="$(mktemp -d)/showhow-desktop.git"
git clone --bare https://github.com/bedarstudios/openscreen.git "$MIRROR_DIR"
git -C "$MIRROR_DIR" push --mirror https://github.com/bedarstudios/showhow-desktop.git
```

Expected: branches and tags push successfully. Do not run another fetch after changing the mirror's
destination.

- [ ] **Step 4: Verify ref parity, then remove the temporary mirror**

Compare `git ls-remote --heads` and `--tags` counts and SHAs for both repositories. Expected: exact
parity for repository-owned refs. Then remove only the `mktemp` parent printed in Step 3.

### Task 3: Recreate GitHub configuration and releases

**Files:**
- Modify: `docs/evidence/repository-cutover/preflight.md`

- [ ] **Step 1: Apply repository settings**

Use `gh api --method PATCH repos/bedarstudios/showhow-desktop` with the recorded description,
homepage, issue/project/wiki flags, merge strategy, delete-branch-on-merge, and security settings.
Set default branch to `main` after refs exist.

- [ ] **Step 2: Recreate labels, variables, environments, and protections**

Use the preflight manifest as the exact source. Secret values cannot be exported; stop and ask the
repository owner to populate each recorded secret name. Do not proceed to release/build validation
until required secrets are present.

- [ ] **Step 3: Recreate releases without retagging**

The 2026-07-17 preflight found zero releases. Re-run
`gh release list --repo bedarstudios/openscreen --limit 100`; when it still returns no rows, record
`No releases to migrate`. If releases appear before execution, stop and revise this task with an
explicit per-release manifest before proceeding. Never invent or retag a release during cutover.

- [ ] **Step 4: Verify Actions and protections**

Open a temporary `codex/cutover-verification` branch, push it to the new repository explicitly, and
confirm CI starts with the expected required checks. Delete the temporary branch after validation.

### Task 4: Cut over the working checkout

**Files:**
- Modify: `docs/evidence/repository-cutover/preflight.md`

- [ ] **Step 1: Run the final local gate**

```bash
npm run test
npm run test:browser
npm run i18n:check
npm run branding:check
npx tsc --noEmit
npm run lint
npm run build-vite
git status -sb
```

Expected: every command exits `0`; tree is clean; `main` tip exists in the new repository.

- [ ] **Step 2: Change origin and remove permanent upstream**

```bash
git remote set-url origin https://github.com/bedarstudios/showhow-desktop.git
git remote remove upstream
git fetch origin
git branch --set-upstream-to=origin/main main
```

Expected: `git remote -v` lists only the independent origin; `git status -sb` reports
`main...origin/main`.

- [ ] **Step 3: Verify from the new origin**

```bash
git fsck --full
git rev-parse HEAD
git rev-parse origin/main
gh repo view bedarstudios/showhow-desktop --json isFork,defaultBranchRef,url
```

Expected: fsck succeeds; local and remote SHAs match; `isFork` is false.

### Task 5: Archive the old fork and prove selective upstream intake

**Files:**
- Modify: `docs/evidence/repository-cutover/preflight.md`

- [ ] **Step 1: Point and archive the old fork**

```bash
gh repo edit bedarstudios/openscreen \
  --description "Archived: Showhow Desktop moved to https://github.com/bedarstudios/showhow-desktop" \
  --homepage "https://github.com/bedarstudios/showhow-desktop"
gh repo archive bedarstudios/openscreen --yes
```

Verify `isArchived: true`; do not delete the repository.

- [ ] **Step 2: Exercise the temporary upstream procedure**

```bash
git remote add openscreen-upstream https://github.com/getopenscreen/openscreen.git
git fetch openscreen-upstream
git log --oneline --max-count=10 main..openscreen-upstream/main
git remote remove openscreen-upstream
```

Expected: fetch/log work; final `git remote -v` lists only `origin`.

- [ ] **Step 3: Record final evidence and commit**

Update `preflight.md` with new-repository URL, final HEAD, parity results, Actions result, old-repo
archive state, and temporary-upstream result.

```bash
git add docs/evidence/repository-cutover/preflight.md
git commit -m "docs: record independent Showhow repository cutover"
git push origin main
```

- [ ] **Step 4: Final verification**

```bash
gh repo view bedarstudios/showhow-desktop --json isFork,isArchived,url,defaultBranchRef
gh repo view bedarstudios/openscreen --json isFork,isArchived,url
git remote -v
git status -sb
```

Expected: new repository is active and not a fork; old repository is archived; only independent
origin remains; tree is clean and synchronized.
