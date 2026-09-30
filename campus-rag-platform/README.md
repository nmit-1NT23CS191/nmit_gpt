# NMIT Smart Campus — Agentic RAG Event Management Platform

RAG-based conversational AI for campus event discovery, OCR-based event
ingestion with conflict detection, registration, and full-duplex voice
conversation — built on Next.js, FastAPI, Supabase, and self-hosted Ollama.
**Zero external commercial AI APIs are called anywhere in this codebase.**

## Stack
- **Frontend:** Next.js 14 (App Router) + Tailwind + Leaflet + Supabase Auth (`@supabase/ssr`)
- **Backend:** FastAPI (async), LangGraph agent, LangChain `ChatOllama`
- **Database/Auth/Storage:** Supabase (Postgres + pgvector, Row Level Security, Storage)
- **LLM/embeddings:** Ollama, self-hosted (`llama3` for chat/tool-calling, `nomic-embed-text` for embeddings)
- **Voice:** faster-whisper (local STT) + Piper (local TTS) — full-duplex, no cloud speech API
- **Reverse proxy:** Nginx (prod)
- **CI/CD:** GitHub Actions → Pytest/Jest/Playwright → SonarQube → Trivy → GHCR → SSH rolling deploy

## Project structure
```
campus-rag-platform/
├── todos.md                      # source-of-truth roadmap, phase by phase
├── docker-compose.yml            # local dev: Ollama + backend + frontend
├── docker-compose.prod.yml       # production: adds Nginx, replicas, resource limits
├── .env.example
├── backend/
│   ├── schema.sql                 # Phase 1 — tables + pgvector + HNSW index
│   ├── policies.sql               # Phase 1 — RLS policies + storage bucket
│   ├── match_events_function.sql  # Phase 3 — cosine similarity RPC
│   ├── main.py, config.py, auth.py, supabase_client.py
│   ├── agents/ocr_engine.py       # Phase 3 — upload, OCR, conflict detection, embedding
│   ├── agents/rag_agent.py        # Phase 3 — LangGraph agent, /api/chat
│   ├── tools/event_tools.py       # Phase 3 — the 4 agent tools
│   ├── tools/vector_store.py      # Phase 3 — embeddings + retrieval
│   ├── documents/                 # OCR extraction (salvaged + modernized from legacy repo)
│   ├── voice/                     # Voice — Whisper STT, Piper TTS, /api/voice/converse
│   └── tests/                     # Phase 5 — pytest unit tests
├── frontend/
│   ├── app/page.jsx               # Phase 4 — public event catalog
│   ├── app/login/page.jsx         # Phase 4 — Supabase Auth
│   ├── app/admin/page.jsx         # Phase 4 — upload + conflict modal
│   ├── app/chat/page.jsx          # Phase 4 — chat, text + full-duplex voice, map
│   └── components/                # SpeechInput, MapWidget, VoiceConversation
├── nginx/default.conf             # Phase 5
└── .github/workflows/deploy.yml   # Phase 5
```

## One-time Supabase setup
1. Create a project at supabase.com.
2. In the SQL Editor, run in order: `backend/schema.sql`, then `backend/policies.sql`,
   then `backend/match_events_function.sql`.
3. Copy your Project URL, anon key, service role key, and JWT secret
   (Project Settings -> API) into `.env`.
4. Promote your own account to admin after signing up once, via SQL:
   `update public.users set role = 'admin' where email = 'you@nmit.edu';`

## Local development
```bash
cp .env.example .env        # fill in Supabase values
docker compose up -d --build
./scripts/pull_models.sh    # or let ollama-model-init do it automatically
```
- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/api/health
- Admin portal: http://localhost:3000/admin (log in with an admin-role account first)
- Voice/text assistant: http://localhost:3000/chat

## Production deployment
```bash
cp .env.example .env.production
# real TLS cert/key at nginx/certs/fullchain.pem + privkey.pem
docker compose -f docker-compose.prod.yml up -d --build
```
CI/CD (`.github/workflows/deploy.yml`) needs these repo secrets: `SONAR_TOKEN`,
`SONAR_HOST_URL`, `PUBLIC_API_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`PROD_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY`.

## Task 5.3 — Smoke test checklist
Run through this manually after any deployment before calling it verified:

1. **RLS enforcement** — sign in as a student account, confirm you can `SELECT`
   only your own `registrations` rows and cannot read `documents` or
   `event_embeddings` directly via the Supabase client. Sign in as admin,
   confirm full access.
2. **Ollama inference latency** — `time curl http://localhost:11434/api/generate -d '{"model":"llama3","prompt":"hello","stream":false}'`
   on the actual deployment host; CPU-only hosts can take 10-30s+ per
   response on first load — budget accordingly or attach a GPU.
3. **End-to-end flow:**
   - Upload a poster in `/admin` -> confirm OCR extraction populates fields.
   - Upload a second poster for the same venue/overlapping time -> confirm
     the 409 conflict modal appears with the correct conflicting event.
   - Ask the chat assistant about the newly published event -> confirm it's
     retrieved (RAG working end-to-end from embedding to retrieval).
   - Ask it to register you -> confirm a row appears in `registrations` and
     the chat UI shows the green confirmation badge.
   - Ask about a venue -> confirm the Leaflet map renders with a marker.
   - Switch to voice mode, hold the mic button, ask a question aloud ->
     confirm you hear a spoken reply and the transcript/map/registration
     data all populate identically to text mode.

## Honest status / what's not yet verified
- **Not executed against live services in this environment.** This sandbox
  has no network access, so I could not run `docker compose up`, pull
  Ollama models, install Piper/Whisper models, or hit a real Supabase
  project. All Python compiles cleanly (`python -m py_compile`) and all
  JS/JSX passed a syntax-only TypeScript check, and the SQL was hand
  double-checked for consistency between schema/policies/RPC — but none of
  it has run end-to-end. Work through the Task 5.3 checklist above on your
  actual deployment before trusting it in front of real students.
- **Pytest suites are logic-mocked, not integration-tested.** `tests/`
  covers `vector_store` chunking/embedding validation and `event_tools`
  with the Supabase client mocked — they were written and reviewed but not
  actually executed in this sandbox (no `pip install` access here either).
  Run `pytest -v` yourself as the first step after cloning.
- **Piper/Whisper models download at Docker build time / first run** from
  GitHub releases, Hugging Face, and (for faster-whisper) the HF hub cache
  — the build host and the running container both need outbound internet
  access for this, even though inference itself is fully local afterward.
- **LangGraph/LangChain API surface moves fast.** `agents/rag_agent.py`
  targets `langgraph==0.2.28` / `langchain==0.3.1` per `requirements.txt`;
  if you bump these versions, re-check `create_react_agent`'s signature —
  it has changed across releases.
- **CI/CD workflow assumes tools you'll need to actually provision:** a
  SonarQube instance/token, and a reachable `PROD_HOST` over SSH with
  `/opt/campus-rag-platform` already cloned. Trivy and GHCR need no extra
  setup beyond the workflow's built-in `GITHUB_TOKEN`.
