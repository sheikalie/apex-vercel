# APEX · Investment Intelligence Terminal
Deployed on Vercel with Edge streaming — no timeout issues.

## Deploy Steps
1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import your repo
3. Add environment variable: ANTHROPIC_API_KEY = sk-ant-...
4. Deploy — live in 60 seconds

## Files
- index.html        — Main app
- beta.html         — Public landing page
- test.html         — Diagnostic tests (visit /test.html)
- api/analyze.js    — Secure API proxy (Edge runtime, streaming)
- vercel.json       — Routing config
