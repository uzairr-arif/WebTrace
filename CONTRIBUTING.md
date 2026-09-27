# Contributing to WebTrace

Thanks for your interest! WebTrace is early (v0.1), so the best contributions
right now are: bug reports with reproduction steps, feedback on explanations
(clarity of the Why stories), and tests.

## Development setup

```bash
pnpm install
pnpm build          # build core + extension
pnpm test           # core unit tests (Vitest)
pnpm typecheck      # tsc across the workspace
pnpm e2e            # Playwright E2E (needs: pnpm --filter webtrace-e2e browsers)
```

Load the built extension from `apps/extension/.output/chrome-mv3` (see
[docs/06-LOADING-AND-DEBUGGING.md](docs/06-LOADING-AND-DEBUGGING.md)).

## Ground rules

1. **The honesty doctrine is not negotiable.** Anything the UI claims must be
   labeled `observed` or `derived` correctly. When unsure, say "derived" and
   explain the inference.
2. **Privacy is architecture, not a policy.** Redaction happens at ingestion
   (`packages/core/src/redaction`), bodies are never captured, nothing ever
   leaves the device. A PR that pipes trace data anywhere else will be
   declined.
3. **Core stays pure.** `packages/core` must not import browser APIs. It is
   unit-testable with plain synthetic events — keep it that way.
4. **Explain before you add.** Features should teach something, not just
   display more metadata.

## Commit style

Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), one
logical change per commit.

## Reporting issues

Include: browser + version, steps to reproduce, what the Why panel said
(observed/derived labels help enormously), and — if possible — a sanitized
screenshot of the flow graph.
