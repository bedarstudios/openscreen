# Selective Upstream Intake

Showhow owns its product, roadmap, release process, branding, and architecture. OpenScreen is an
attributed source ancestor and an optional source of individually reviewed fixes, not a repository
that Showhow continuously synchronizes with.

## Policy

- Do not keep an OpenScreen remote configured permanently.
- Inspect candidate commits before importing anything.
- Prefer cherry-picking one focused fix or porting only the relevant change with attribution.
- Never use a full branch merge as the intake mechanism.
- Adapt imported changes to Showhow identity, compatibility constraints, and architecture.
- Record the source commit and adaptations in the commit or pull-request description.
- Run the complete affected verification suite and `npm run branding:check`.
- Remove the temporary remote after the review, including when no change is imported.

## Temporary-remote procedure

Start from a clean working tree and an isolated branch:

```bash
git remote add openscreen-upstream https://github.com/getopenscreen/openscreen.git
git fetch openscreen-upstream
git log --oneline main..openscreen-upstream/main
# cherry-pick or port one reviewed change, then run required verification
git remote remove openscreen-upstream
```

Before completing the work, confirm `git remote -v` contains no `openscreen-upstream` entry. Review
the resulting diff for reintroduced product copy, package identity, workflows, persistence names,
and native-helper assumptions rather than treating a clean merge as proof of compatibility.
