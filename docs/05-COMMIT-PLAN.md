# Commit history

*This history was executed on 2026-09-28. Each commit groups the work by
layer so the story reads in build order — `git log --oneline` to verify.*

## The history (oldest → newest)

| # | Commit | Contents |
| --- | --- | --- |
| 1 | `chore: scaffold pnpm workspace, toolchain and license` | Root manifests, tsconfig, .gitignore, .editorconfig, LICENSE, lockfile |
| 2 | `feat(core): normalized event model, categories and ingestion-time redaction` | events/, redaction/, id.ts, models/ |
| 3 | `feat(core): request correlator — redirect chains, preflight pairing, third-party stats` | correlation/ + tests |
| 4 | `feat(core): flow graph, waterfall timing, explain engine and filters` | graph/, timeline/, explain/, filters/ + tests |
| 5 | `feat(core): learning curriculum — lessons with quizzes and progress` | learning/, public index barrel |
| 6 | `feat(extension): WXT skeleton with theme system and branded icons` | wxt.config, theme tokens, icon generator + assets |
| 7 | `feat(extension): capture pipeline — webRequest/webNavigation to sessions to ports` | background/, message protocol, settings |
| 8 | `feat(sidepanel): live flow, request explorer and timeline replay` | sidepanel/, shared view components, trace client |
| 9 | `feat(popup): mini dashboard with quick actions` | popup/ |
| 10 | `feat(options): appearance, learning mode and data controls` | options/ |
| 11 | `feat(dashboard): full-page dashboard — overview, third-party map, learning, sessions` | dashboard/ |
| 12 | `test(e2e): fixture demo site, Playwright verification and screenshots` | tests/fixtures, tests/e2e |
| 13 | `feat(website): open-source landing page with GitHub Pages deploy` | apps/website/, pages workflow |
| 14 | `chore: open-source governance — CoC, security policy, changelog, templates, CI` | CODE_OF_CONDUCT, SECURITY, CHANGELOG, .github templates, ci.yml |
| 15 | `docs: readme, privacy, architecture, code tour and roadmap` | README, PRIVACY, CONTRIBUTING, docs/ |

## Conventions going forward

- Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), one
  logical change per commit.
- The default branch is `main`; feature work goes through short-lived
  branches and PRs (CI runs on every PR).
- Tag releases as `vX.Y.Z` and update CHANGELOG.md in the same PR.
