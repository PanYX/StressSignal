# Project Instructions

- Treat `.env.local` as sensitive. Do not open, print, search, summarize, or otherwise inspect its contents.
- The real PostgreSQL connection is configured by `DATABASE_URL` in `.env.local`.
- Do not use the old local Docker PostgreSQL database for application data.
- Do not introduce or rely on local fallback PostgreSQL URLs such as `127.0.0.1:5432` or `127.0.0.1:5433` unless the user explicitly asks for a temporary test database.
- It is acceptable for tooling and the running app to consume environment variables normally, but do not reveal secret values in commands, logs, responses, or files.
