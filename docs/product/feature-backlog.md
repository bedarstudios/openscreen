# Showhow -- Post-V1 Feature Backlog

*Created 2026-07-06. V1 (record -> edit -> export -> send) in build. Ideas for V1.1+.*

## Market snapshot

Competitors: Scribe, Tango, Guidde, Loom AI Workflows.

- Scribe: at-scale documentation, Smart Blur PII redaction, Scribe Pages (multiple SOPs in one doc), approval workflows. Tango: in-app "Guide Me" walkthrough overlays, AI agents.
- Both paywall the useful tier; Showhow's free/self-hosted angle holds.
- Documented shared weakness: guides go stale when the UI changes and neither tool detects it. That is an open differentiator, but a hard one.
- Nothing here changes V1 scope -- these all sit behind shipping the core flow.

## Backlog

| # | Feature | Fit | Priority |
|---|---------|-----|----------|
| 1 | Multi-guide library (browse, search, duplicate, delete -- already earmarked V1.1) | Generic (table stakes) | Build first |
| 2 | AI step-text polish via BYOK (rewrite instructions, merge noisy steps) | Personal (AI-native, path toward the 2026 AI-app goal) | Build first |
| 3 | Screenshot editor: crop, blur regions, arrows/callouts | Generic (table stakes vs Scribe) | Build first |
| 4 | Guide branding/templates (client name, logo, colors -- Bedarstudios-ready deliverables) | Personal (client work at the 9-5 today, studio later) | Next |
| 5 | Copy-to-destination exports: Markdown, Notion, Google Docs | Generic | Next |
| 6 | Smarter auto-redaction (detect emails, names, tokens in screenshots -- Scribe's Smart Blur) | Niche | Next |
| 7 | Hosted shareable links (backend + auth -- the "product" path) | Generic (Scribe's core moat) | Later |
| 8 | Stale-guide detection (re-run the flow, diff screenshots, flag drift) | Niche (gap both incumbents admit) | Later |
| 9 | Firefox/Edge ports | Generic | Later |
| 10 | Guide collections -> single handbook export (Scribe Pages equivalent) | Generic | Later |

## Notes

- 1 + 3 are what make Showhow usable week two instead of a demo; do them before anything clever.
- 2 is the highest leverage per hour: deterministic text is V1's weakest output, and BYOK keeps the zero-cost constraint intact.
- 4 is quietly the most "you" feature here -- it converts Showhow output from screenshots into a branded client deliverable, which is also X content.
- 7 changes the architecture (backend, auth, storage costs). Only cross that line if real users ask for links, because it kills "nothing to host."
- 8 would be a genuine wedge against Scribe/Tango but is research-grade; park it until the library (1) exists to detect staleness against.
