## Summary

<!-- What changed and why (one or two clear sentences for reviewers). -->

## Checklist

- [ ] `pnpm typecheck` and `pnpm check:fix` pass locally
- [ ] `pnpm test:run` or `pnpm test:ci` passes when you changed behavior, data flow, or UI
- [ ] `pnpm messages:validate` if you edited `src/messages/*.json`
- [ ] `pnpm supabase:types` committed if the **public** schema changed (shared Supabase project)
- [ ] **CI E2E:** The workflow needs GitHub **Actions variables** for `NEXT_PUBLIC_SUPABASE_*`. Optional **repository secrets** `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` enable authenticated tests ([`docs/production-deploy.md`](../docs/production-deploy.md#github-actions-ci-and-playwright)). Smoke E2E runs without those secrets.
- [ ] Docs updated if you changed env vars, public routes, or contributor workflow ([`docs/AIDER-RULES.md`](../docs/AIDER-RULES.md))

## Notes

<!-- Optional: risk, rollout, screenshots, follow-up tickets. -->
