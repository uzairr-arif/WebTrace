### Summary

What does this PR change, and why?

### Honesty check (required)

- [ ] Every new claim in the UI is labeled `observed` or `derived` correctly
- [ ] No new data leaves the device; nothing new is captured that isn't needed
- [ ] `packages/core` still imports zero browser APIs

### Verification

- [ ] `pnpm test` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` succeeds and the extension was smoke-tested in the browser
- [ ] E2E (`pnpm e2e`) still passes if capture/correlation changed

### Screenshots

For UI changes, before/after screenshots help a lot.
