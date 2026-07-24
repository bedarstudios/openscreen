# Showhow Package Identity Rename

## Goal

Rename the active package and distribution identity from `showhow-desktop` to `showhow` so it
matches the canonical `bedarstudios/showhow` repository.

## Scope

Update active identity surfaces:

- npm package metadata and lockfile root metadata;
- the shared runtime package-name constant;
- package-identity tests;
- Nix package, flake attribute, module option, executable, installation directory, icon, and
  desktop-entry identifiers;
- GitHub Actions build artifact names;
- the caption-model build user-agent;
- current contributor setup instructions.

Keep `Showhow` as the product display name and `com.bedarstudios.showhow` as the application ID.
Do not change persistence keys, legacy project compatibility, or other stored identifiers.

Historical design specifications and superseded implementation plans remain unchanged because
their `showhow-desktop` references describe decisions and paths that existed when those documents
were written. Existing filenames that are referenced as historical documents also remain
unchanged.

## Compatibility Decision

This is a direct pre-1.x rename. Do not retain deprecated `showhow-desktop` Nix aliases, executable
wrappers, or duplicate CI artifact names. The new active public names are consistently `showhow`.

## Implementation

First update the package-identity test to require the new names. Then update the active source,
configuration, packaging, workflow, and contributor-documentation surfaces together. Use targeted
searches afterward to ensure remaining occurrences are confined to historical records or other
explicitly justified contexts.

## Verification

Run:

- the package-identity test;
- TypeScript typechecking;
- the branding audit;
- the smallest available Nix flake evaluation that confirms the renamed package attribute and
  module references, when Nix is installed.

Also inspect the final diff and search results to confirm that runtime persistence and product
display identifiers were not changed.
