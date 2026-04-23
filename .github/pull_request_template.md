## Summary

<!-- What changed and why (one or two sentences). -->

## Checklist

- [ ] `pnpm typecheck` and `pnpm check:fix` pass locally
- [ ] `pnpm test:run` or `pnpm test:ci` passes (if you touched app logic)
- [ ] If you edited `src/messages/*.json`: `pnpm messages:validate`
- [ ] **CI E2E:** For the full Playwright suite, the repo needs GitHub **Actions variables** (`NEXT_PUBLIC_SUPABASE_*`) and optional **secrets** `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` (see [`docs/production-deploy.md`](../docs/production-deploy.md)). Smoke E2E runs without login secrets.

## Notes

<!-- Optional: screenshots, rollout, follow-ups. -->
