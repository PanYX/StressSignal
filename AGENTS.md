# Project Instructions

- Treat `.env.local` as sensitive. Do not open, print, search, summarize, or otherwise inspect its contents.
- Application data uses the Cloudflare D1 `DB` binding configured in `wrangler.jsonc`.
- `DATABASE_URL` in `.env.local` is retained only as the temporary Neon source for `pnpm db:export-neon`; it must not be used by the application runtime.
- Do not introduce PostgreSQL runtime connections or local PostgreSQL fallbacks unless the user explicitly requests a separate migration/rollback test.
- It is acceptable for tooling and the running app to consume environment variables normally, but do not reveal secret values in commands, logs, responses, or files.
