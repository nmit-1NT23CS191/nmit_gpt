# Campus Admin Portal

This app is the secure administrative control center for the campus platform.

## Purpose
- Protected admin-only routes
- Event management dashboard
- Secure upload workflow for poster and document intake
- OCR extraction and review before publishing events

## Local development

From the workspace root:

```bash
cd campus-rag-platform/frontend
npm run dev
```

Then open:
- Admin app: http://localhost:3001
- Public app: http://localhost:3000

## Required backend

The admin upload flow calls the FastAPI OCR endpoint at:

```text
http://localhost:8000/api/upload-poster
```

The backend must be running for PDF/DOCX uploads and OCR extraction to work.
