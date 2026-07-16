# Showhow Standalone Repository Design

**Date:** 2026-07-16
**Status:** Approved for planning
**Scope:** Convert the inherited OpenScreen fork into an independently branded and operated Showhow Desktop repository while preserving useful legacy compatibility and MIT attribution.

## Context

The active Showhow desktop application still presents itself structurally and publicly as
OpenScreen in substantial parts of the repository. The GitHub repository is
`bedarstudios/openscreen`, GitHub reports it as a fork of `getopenscreen/openscreen`, the local
checkout retains an `upstream` remote, and inherited product identity remains across active
documentation, contributor guidance, package metadata, application strings, icons, release
configuration, automation, native helpers, and persisted-data identifiers.

The workspace-retirement work deliberately did not address this. Its purpose was to retire the
dormant extension checkout and consolidate active Showhow material into the desktop repository.
That design explicitly kept the OpenScreen repository, fork relationship, and upstream remote.

Showhow now needs a separate identity boundary: it should retain the useful recorder/editor
foundation and relevant source history without presenting itself as an OpenScreen continuation or
depending operationally on the upstream repository.

## Goal

Make Showhow Desktop an independently branded, operated, and planned product whose active
repository is `bedarstudios/showhow-desktop`.

When complete:

- GitHub no longer classifies the active Showhow repository as an OpenScreen fork.
- the local checkout uses the independent Showhow repository as `origin` and has no permanent
  OpenScreen remote;
- all current user-facing and contributor-facing identity is Showhow;
- active plans, roadmap, agent instructions, contribution guidance, automation, and release
  configuration describe Showhow's product and workflow;
- new projects, preferences, caches, bundles, helpers, packages, and releases use Showhow names;
- legacy OpenScreen projects and persisted user data remain readable through an explicit,
  tested compatibility layer;
- remaining OpenScreen references are limited to required attribution, preserved historical
  records, or documented compatibility code; and
- selected upstream improvements can still be reviewed and imported without restoring an
  ongoing fork relationship.

## Chosen Approach

Use a compatibility-preserving standalone migration.

This is preferred over two rejected alternatives:

1. **Hard break:** rename every internal identifier at once and stop reading old formats. This
   produces the cleanest text search but can strand existing projects, settings, caches, and
   recordings and can break native-helper discovery.
2. **Cosmetic rebrand:** change visible strings and icons while leaving repository operations,
   package identity, roadmaps, and persistence under OpenScreen names. This is quicker but does
   not create a genuinely standalone product and leaves future contributors with conflicting
   sources of truth.

The chosen approach changes all new and public identity to Showhow while retaining narrowly
scoped fallback reads for legacy data. Compatibility is a migration boundary, not permission to
keep writing new OpenScreen-branded artifacts.

### Canonical Showhow namespace

The migration uses these names consistently:

- GitHub repository: `bedarstudios/showhow-desktop`;
- npm package and Linux package attribute: `showhow-desktop`;
- displayed product name: `Showhow`;
- macOS/desktop application identifier: `com.bedarstudios.showhow`;
- project extension for new files: `.showhow`;
- application-data directory and new persisted-key prefix: `Showhow` and `showhow_` respectively;
- native executables: `showhow-screencapturekit-helper`, `showhow-macos-cursor-helper`, and
  `showhow-wgc-capture`;
- diagnostic and native-helper environment variables: `SHOWHOW_*`; and
- release artifact prefix: `showhow-desktop`.

Legacy OpenScreen names remain only as fallback readers or executable/environment aliases where
the compatibility matrix requires them.

## Repository Independence

### Independent GitHub repository

The authoritative repository will be `bedarstudios/showhow-desktop`, public and MIT licensed.
The existing `main` history plus Showhow-owned branches, tags, and releases must be preserved.
Remote-only upstream branches that were never part of Bedar Studios' repository do not need to be
copied.

Before changing the local `origin`, verify the currently supported GitHub detachment path. Use
the least disruptive supported method that results in a normal independent repository:

- prefer detaching or leaving the fork network while retaining the repository and history;
- if GitHub cannot detach it safely, create `bedarstudios/showhow-desktop` as a new independent
  repository and push the existing branches and tags deliberately; and
- do not delete `bedarstudios/openscreen` until the new repository, default branch, tags, branch
  protections, releases, and required settings have been verified.

Repository visibility, MIT licensing, and commit history must not change as a side effect of
detachment. The old repository should be archived with a clear pointer to the new repository only
after migration succeeds. It should not remain an active mirror.

### Local remotes

After cutover:

- `origin` points to `https://github.com/bedarstudios/showhow-desktop.git`;
- `main` tracks `origin/main`;
- no permanent `upstream` or `openscreen-upstream` remote remains; and
- repository instructions do not tell contributors or agents to merge from OpenScreen.

Removing a remote does not remove shared Git ancestry or prevent future imports.

### Selective upstream intake

Create `UPSTREAM.md` with a controlled, temporary-remote procedure:

1. add `https://github.com/getopenscreen/openscreen.git` temporarily as
   `openscreen-upstream`;
2. fetch and inspect candidate changes without merging;
3. prefer cherry-picking a focused fix or porting the relevant change with attribution;
4. run the full affected verification suite and the branding-reference audit;
5. record imported commits and any adaptation in the change or pull-request description; and
6. remove the temporary remote when the review is complete.

Full upstream merges are not the normal workflow. They are likely to reintroduce OpenScreen
branding, workflows, roadmaps, and product assumptions as Showhow diverges.

## Cleanup Classification

Every tracked OpenScreen reference must be classified before it is changed. The inventory has five
categories.

### 1. Public product identity

Replace with Showhow everywhere users or released artifacts can see it:

- application, window, tray, menu, dialog, About, installer, executable, and package names;
- macOS bundle identifier and permission copy;
- Windows and Linux package metadata;
- favicon, application icons, tray assets, empty-state marks, and installer icons;
- localized product strings across every supported locale;
- current screenshots and promotional assets; and
- default project names, file-picker labels, diagnostics output, and generated artifact names.

The visual asset pass must use the approved Showhow design system as its source of truth and must
produce the complete platform icon set. No release should substitute a generic Vite/React icon or
retain an inherited OpenScreen mark.

### 2. Active repository and product documentation

Rewrite active sources of truth around Showhow:

- `README.md` becomes the concise Showhow product, setup, development, and licensing entry point;
- `ROADMAP.md` is replaced with the Showhow desktop roadmap derived from the approved desktop
  pivot and current feature backlog;
- `AGENTS.md` describes Showhow architecture, commands, testing, conventions, release flow, and
  compatibility constraints;
- `CONTRIBUTING.md` points to the independent repository and current issue/PR workflow;
- useful operational material from `SHOWHOW.md` is merged into the appropriate current docs, then
  the redundant root file is removed;
- active architecture, engineering, testing, release, secrets, GitHub Actions, and native-helper
  docs are rebranded and corrected; and
- current `.github` and `.harness` instructions, agents, hooks, templates, scripts, and workflow
  names are aligned with Showhow.

Do not delete useful knowledge merely because it sits in an inherited file. Migrate unique,
accurate content first, then remove the redundant or obsolete source.

### 3. Compatibility-sensitive identifiers

Migrate these through dual-read or alias behavior rather than blind replacement:

- `.openscreen` project files and file-picker associations;
- local preferences, custom-font storage, source caches, and recording/session paths;
- legacy bundle IDs or application-data directories needed to find existing user data;
- native-helper executable names and environment-variable overrides;
- single-instance identifiers, diagnostics flags, IPC-adjacent paths, and native queue labels; and
- serialized project fields whose values contain OpenScreen-era names.

For each persisted identifier:

- new writes use the Showhow name;
- reads try the Showhow location or key first, then the legacy OpenScreen value;
- a successful legacy read migrates safely when the data can be copied or rewritten without loss;
- destructive moves require a verified backup or leave the legacy source intact;
- filename-format compatibility remains supported where migration is impossible or unnecessary;
  and
- tests prove both clean-install behavior and legacy-upgrade behavior.

Showhow continues importing `.openscreen` files, but newly created projects use `.showhow`. The
first save after opening a legacy project defaults to a new `.showhow` file and leaves the original
`.openscreen` file intact unless the user explicitly chooses otherwise.

### 4. Historical records

Completed dated specifications, implementation plans, acceptance evidence, changelog entries, and
implementation notes may accurately describe OpenScreen or the original fork decision. Do not
rewrite history solely to make a text search empty.

Historical documents must be clearly dated or located in a historical context. Any historical
document still serving as active guidance must be superseded or amended so agents do not treat its
old instructions as current policy.

### 5. Attribution and legal notices

Retain the existing MIT copyright and permission notice in `LICENSE`. Add Bedar Studios or Showhow
copyright information only as an additional notice; do not replace or remove the original notice.

The README and a focused attribution file should explain that Showhow contains code originally
derived from OpenScreen under MIT, without presenting Showhow as its official continuation or an
actively synchronized fork.

## Migration Structure

Implement the work in reversible stages.

### Stage 1: Establish the inventory and policy

- Produce a machine-readable or reviewable reference inventory grouped by the five categories.
- Record the intended disposition of each file or identifier: replace, migrate, preserve, or
  remove after consolidation.
- Establish the compatibility matrix and final Showhow names before changing runtime identifiers.

### Stage 2: Align documentation and repository guidance

- Rewrite the README, roadmap, agents, contribution guide, active engineering documentation,
  GitHub configuration, and harness material.
- Add `UPSTREAM.md` and attribution documentation.
- Remove redundant or obsolete inherited documents only after their useful content is retained.

This stage makes the intended repository identity reviewable before runtime migration begins.

### Stage 3: Replace visual and packaging identity

- Produce and verify all Showhow icon formats and visible assets.
- Update package metadata, application IDs, product names, permission text, release artifact names,
  window/tray/menu strings, and all locales.
- Keep signing, notarization, installer, and native packaging behavior intact.

### Stage 4: Migrate runtime and persisted identifiers

- Introduce new Showhow keys, paths, extensions, helper names, and environment variables.
- Add tested fallback reads and compatibility aliases for existing OpenScreen data.
- Update native build scripts and packaging as one atomic unit with helper renames.
- Validate an upgrade using a representative legacy-data fixture before removing any old write
  path.

### Stage 5: Create the independent repository and cut over

- Create or detach the independent GitHub repository using the verified safe path.
- Recreate and verify branch protections, repository variables/secrets, Actions permissions,
  issue settings, labels, releases, and other required repository-level configuration.
- Change local remotes only after the new origin is ready.
- Push and verify branches and tags, then archive the old fork with a migration pointer.

### Stage 6: Final audit and real-app acceptance

- Run the complete automated verification suite.
- Run a scoped OpenScreen-reference audit and review every remaining match.
- Build and launch Showhow on macOS.
- Record, save, reopen, edit, and export a real recording.
- Open a legacy `.openscreen` project and verify existing settings/data discovery.
- Verify release artifacts, icons, menus, data locations, and diagnostics use Showhow identity.
- Exercise the documented temporary-upstream procedure without importing a change, then confirm
  the remote is removed.

## Safety and Failure Handling

- Never use a global search-and-replace for identity migration.
- Never remove the MIT notice or erase source provenance.
- Never delete or overwrite legacy user data during migration.
- Stop if an identifier's persistence or native-packaging role is unclear; classify and test it
  before renaming.
- Keep runtime migration changes separate from documentation and repository-cutover changes so
  failures can be isolated and reverted.
- Do not switch `origin`, archive the old fork, or change repository-level secrets until the
  independent repository has been verified.
- If GitHub detachment cannot preserve required history or configuration, use a new independent
  repository and leave the old fork intact until parity is confirmed.
- If a native helper rename cannot be validated on its target platform, retain a compatibility
  alias and report the platform validation as incomplete rather than claiming completion.
- An upstream import must never bypass Showhow tests or the branding-reference audit.

## Verification

The migration is complete only when all of the following are true:

1. GitHub reports `bedarstudios/showhow-desktop` as an independent, non-fork repository.
2. The independent repository contains the intended branches, tags, releases, protections, and
   configuration, and the old fork is archived with a pointer to it.
3. Local `origin` points to the independent repository, `main` tracks `origin/main`, and no
   permanent OpenScreen remote exists.
4. README, roadmap, agent instructions, contribution guidance, active docs, GitHub configuration,
   and harness material describe Showhow consistently.
5. Application UI, every locale, package metadata, installers, icons, native permission copy,
   diagnostics, and newly generated artifacts use Showhow identity.
6. New projects and persisted application data use Showhow names and locations.
7. Representative legacy projects, preferences, fonts, caches, recordings, and helper overrides
   remain readable or are migrated without loss.
8. Unit tests, browser tests where applicable, i18n validation, TypeScript, Biome, renderer build,
   native packaging checks, and relevant platform tests pass.
9. A real macOS record-save-reopen-edit-export smoke test succeeds under the Showhow identity.
10. Every remaining OpenScreen reference is reviewed and belongs only to attribution, an accurate
    historical record, or tested legacy-compatibility behavior.
11. `UPSTREAM.md` accurately demonstrates that a temporary OpenScreen remote can be fetched,
    inspected, and removed without restoring an operational fork relationship.

## Out of Scope

- Rewriting the recorder or editor from scratch.
- Removing or obscuring MIT attribution and source history.
- Guaranteeing automatic compatibility with future OpenScreen releases.
- Regular full merges from OpenScreen.
- Changing Showhow's approved product direction or adding unrelated product features.
- Deleting the archived Chrome-extension repository or its preserved local work.
- Rewriting completed historical records merely because they contain the OpenScreen name.

## Resulting Maintenance Model

Showhow owns its roadmap, releases, infrastructure, branding, and architecture. OpenScreen becomes
an attributed source ancestor and an optional source of individually reviewed fixes, not an
operational parent. Compatibility with existing OpenScreen-era user data is maintained as an
explicit product behavior with a defined removal decision required for any future breaking change.
