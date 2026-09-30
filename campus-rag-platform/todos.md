# 🟢 PHASE 1: Data Architecture, Supabase Setup & Security Policies

- [x] **Task 1.1: Database Schema & Vector Extension (`backend/schema.sql`)**
  - [x] Write SQL to enable the `vector` extension in Supabase.
  - [x] Create `users` table (`id`, `supabase_uid` UUID, `name`, `email`, `department`, `role`, `semester`, `created_at`).
  - [x] Create `documents` table (`id`, `file_name`, `file_url`, `raw_ocr_output` JSONB, `uploaded_by` UUID, `uploaded_at`).
  - [x] Create `events` table (`id`, `document_id` FK, `title`, `department`, `venue`, `event_date` TIMESTAMPTZ, `end_date` TIMESTAMPTZ, `capacity` INT, `latitude` FLOAT, `longitude` FLOAT, `description` TEXT, `is_verified` BOOLEAN DEFAULT true, `created_at`).
  - [x] Create `registrations` table (`id`, `user_id` FK, `event_id` FK, `registered_at` TIMESTAMPTZ, `reminder_sent` BOOLEAN DEFAULT false, `UNIQUE(user_id, event_id)`).
  - [x] Create `event_embeddings` table (`id`, `event_id` FK CASCADE, `text_chunk` TEXT, `embedding` vector(768)).
  - [x] Build HNSW cosine index: `CREATE INDEX ON event_embeddings USING hnsw (embedding vector_cosine_ops);`.

- [x] **Task 1.2: Row Level Security (RLS) & Supabase Storage**
  - [x] Create Supabase Storage bucket `event-docs` with authenticated write permissions.
  - [x] Define RLS policies on `events`: Public `SELECT` where `is_verified = true`; Admin full access (`ALL`).
  - [x] Define RLS policies on `registrations`: Users can only `SELECT` and `INSERT` records matching their own `supabase_uid`.
  - [x] Define RLS policies on `event_embeddings`: Backend service role read/write access.

---

## 🟡 PHASE 2: Local AI Engine & FastAPI Backend Setup

- [x] **Task 2.1: Dockerized AI Infrastructure (`docker-compose.yml`)**
  - [x] Configure `ollama` service mapping port `11434:11434` with persistent volume `ollama_data`.
  - [x] Include optional GPU driver reservation block (`nvidia.com/gpu`) for cloud instances.
  - [x] Create setup script to automate model pulls:
    - `nomic-embed-text` (768-dim embeddings).
    - `llama3` or `qwen2.5:7b` (Chat & Tool-Calling Agent).

- [x] **Task 2.2: FastAPI Backend Core (`backend/`)**
  - [x] Create `backend/requirements.txt` with: `fastapi`, `uvicorn[standard]`, `supabase`, `httpx`, `python-multipart`, `pydantic`, `pydantic-settings`, `langchain`, `langchain-community`, `langgraph`, `psycopg2-binary`.
  - [x] Create `backend/config.py` loading environment variables (`SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OLLAMA_BASE_URL`).
  - [x] Create `backend/main.py` configuring CORS middleware, health check endpoint (`GET /api/health`), and route registration.

---

## 🟠 PHASE 3: Multimodal OCR & Agentic RAG Pipeline

- [x] **Task 3.1: OCR Ingestion & Conflict Detection (`backend/agents/ocr_engine.py`)**
  - [x] Build `POST /api/upload-poster`:
    - Upload raw poster/document to Supabase Storage `event-docs`.
    - Extract text and format into structured JSON (`title`, `department`, `venue`, `event_date`, `end_date`, `latitude`, `longitude`, `description`).
    - **Smart Conflict Detector:** Run SQL validation checking if the requested `venue` is already booked during the timeframe (`event_date` to `end_date`).
    - If a conflict occurs, return HTTP 409 with overlapping event details; otherwise, commit to `events` table.
    - Generate vector embeddings for the event text via Ollama (`nomic-embed-text`) and store in `event_embeddings`.

- [x] **Task 3.2: Vector Store Integration (`backend/tools/vector_store.py`)**
  - [x] Implement cosine similarity search using Supabase RPC (`match_events`) or direct `pgvector` queries to fetch the top-k most relevant event chunks for a given query vector.

- [x] **Task 3.3: Agentic Tools & LangGraph Engine (`backend/agents/rag_agent.py` & `backend/tools/event_tools.py`)**
  - [x] Implement tool `search_campus_events(query: str)`: Calls vector store for semantic context.
  - [x] Implement tool `register_user_for_event(user_email: str, event_title: str)`: Executes transactional SQL insert into `registrations`.
  - [x] Implement tool `get_venue_coordinates(venue_name: str)`: Retrieves GPS coordinates (`latitude`, `longitude`) for campus map rendering.
  - [x] Implement tool `check_schedule_conflicts(venue: str, date: str)`: Checks venue availability.
  - [x] Assemble LangGraph Agent with memory checkpointing, binding tool calls to Ollama `llama3`.
  - [x] Build `POST /api/chat`: Accepts `{ "query": str, "user_id": str, "session_id": str }`, executes the agent, and returns structured response: `{ "reply": str, "tool_action": str, "map_data": { "lat": float, "lng": float, "venue": str }, "registration_status": bool }`.

---

## 🔵 PHASE 4: Frontend Development (Next.js + Tailwind + Voice + Maps)

- [x] **Task 4.1: Public Catalog & User Auth (`frontend/app/`)**
  - [x] Set up `@supabase/ssr` authentication in Next.js.
  - [x] Create `frontend/app/page.tsx`: Grid view of verified upcoming events with search, category filtering, and 1-click registration.
  - [x] Create `frontend/app/login/page.tsx`: Student/Admin email login using Supabase Auth.

- [x] **Task 4.2: Admin Portal (`frontend/app/admin/page.tsx`)**
  - [x] Drag-and-drop document upload interface supporting images and PDFs.
  - [x] Live preview of parsed JSON fields with editable forms for admin verification before publishing.
  - [x] Conflict Alert Modal: Highlights overlapping venue bookings with suggested resolution options.

- [x] **Task 4.3: Conversational Voice & Map UI (`frontend/app/chat/page.tsx`)**
  - [x] Build chat interface with persistent session history.
  - [x] **Speech Recognition (`components/SpeechInput.tsx`):** Integrate browser Web Speech API for voice input with active microphone feedback.
  - [x] **Interactive Campus Map (`components/MapWidget.tsx`):** Implement Leaflet.js / React-Leaflet component to render campus maps with custom venue markers when coordinates are returned by the agent.
  - [x] Action Confirmation Badges: Render interactive buttons (e.g., "Confirm Registration") directly within chat bubbles.

---

## 🟣 PHASE 5: Production Deployment, CI/CD & Cloud Hardening

- [x] **Task 5.1: Containerization & Reverse Proxy**
  - [x] Write optimized multi-stage `frontend/Dockerfile` (Next.js standalone output).
  - [x] Write lightweight `backend/Dockerfile` with non-root security user.
  - [x] Configure `nginx/default.conf` to serve frontend on `/`, proxy API to `/api/`, enable gzip compression, and configure SSL certificates (Let's Encrypt / Certbot).
  - [x] Write `docker-compose.prod.yml` coordinating `nginx`, `backend`, and `ollama` with restart policies and volume mounts.

- [x] **Task 5.2: CI/CD Pipeline (`.github/workflows/deploy.yml`)**
  - [x] Automated workflow triggering on push to `main`.
  - [x] Unit testing stage: Run Pytest on backend RAG tools and Jest/Playwright on frontend components.
  - [x] Static security analysis stage: Run SonarQube scan for code quality and Trivy to scan Docker container images for CVEs.
  - [x] SSH deploy stage: Deploy updated containers to Cloud VM (AWS EC2 / DigitalOcean Droplet) using zero-downtime rolling restart.

- [x] **Task 5.3: Production Verification & Smoke Testing**
  - [x] Verify Supabase RLS enforces student/admin permission boundaries.
  - [x] Verify local Ollama inference latency on server GPU/CPU.
  - [x] Conduct end-to-end smoke test: Upload document -> Run OCR -> Detect conflict -> Perform RAG voice search -> Trigger registration -> Render map marker.
