# Contributing to Showhow

Thank you for helping improve Showhow. The project is free, local-first, MIT licensed, and pre-1.x;
please keep changes focused and expect some rough edges.

## Get started

1. Fork [bedarstudios/showhow](https://github.com/bedarstudios/showhow).
2. Clone your fork and install the pinned toolchain dependencies:

   ```bash
   git clone https://github.com/your-username/showhow.git
   cd showhow
   npm install
   ```

3. Create a focused branch:

   ```bash
   git checkout -b feature/short-description
   ```

4. Make the change, add same-package tests for new behavior, and run the relevant verification.
5. Push the branch and open a pull request against
   [bedarstudios/showhow](https://github.com/bedarstudios/showhow/pulls).

## Verification

Use the checks that cover your change. Before a broad pull request, run:

```bash
npm run test
npm run test:browser
npx tsc --noEmit
npm run lint
npm run i18n:check
npm run branding:check
```

Install browser-test dependencies once with `npm run test:browser:install`. Native capture changes
also require a manual smoke test on the affected operating system.

## Reporting issues

Open bugs and feature requests in
[Showhow Issues](https://github.com/bedarstudios/showhow/issues). Include reproduction steps,
operating system, expected behavior, actual behavior, and relevant logs or sample files. Do not
attach secrets or private recordings.

An issue closes when its fix reaches `main`, which may be earlier than its first packaged release.
Use `Fixes #123`, `Closes #123`, or `Resolves #123` only when a pull request fully resolves the
issue; use `Refs #123` or `Part of #123` for partial work.

## Pull-request expectations

- Keep the scope narrow and explain the user-facing reason for the change.
- Use clear, imperative commit subjects and a Conventional Commit PR title.
- Preserve legacy `.openscreen` reads while new project writes move to `.showhow`.
- Do not overwrite or delete legacy user data during a migration.
- Do not import the source ancestor through a full merge. Follow [UPSTREAM.md](./UPSTREAM.md) for
  one focused, reviewed change and document its attribution.
- Keep recorder/editor behavior intact when changing the Showhow documentation layer.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
