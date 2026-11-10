# Roshan Rozgar (روشن روزگار)

Roshan Rozgar is a mobile-first, voice-assisted local marketplace for workers
and households in Islamabad and Rawalpindi. It is a local MVP built with
React, TypeScript, Vite, Node 24's HTTP server and SQLite.

## Run locally

Requirements: Node.js 24 or newer.

```sh
npm install
npm run check
npm run dev
```

Open the Vite URL printed by the web process. The API runs on port 3001 by
default and the Vite development server proxies `/api` requests to it. For a
production-style local run:

```sh
npm run build
npm start
```

The local database is `data/roshan.sqlite`. Set `DATABASE_PATH` to use another
database. Copy `.env.example` to `.env` for optional configuration; never
commit `.env`.

## What is functional

- Server-side account registration/login with HttpOnly session cookies.
- Worker profile creation, manual confirmation, service areas and persisted
  availability.
- Public area/trade discovery with availability computed from persisted
  bookings.
- Participant-only requests, text messages and private voice notes.
- Real browser recording and preview when microphone permissions are
  available.
- Optional server-side Urdu transcription and grounded profile extraction
  through OpenAI. The draft always requires worker confirmation.
- Versioned worker proposals, explicit customer acceptance, idempotent
  confirmation and a database uniqueness guard against double booking.
- Worker start/finish, customer completion and one authorized persisted review.

## AI and fallback disclosure

AI is not silently simulated. Without `OPENAI_API_KEY`, profile transcription
returns a clear configuration error and the worker can use the editable manual
profile form. Browser speech synthesis is only used for read-aloud feedback;
if an Urdu voice is unavailable, the UI says so rather than pretending audio
played.

The SQLite database may contain local demo data. It is not a government
identity verification source, and the product does not claim verification
badges, exact distances or payment processing. See
[`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) for the complete two-role demo.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

`npm run check` runs all three commands. The tests cover authorization,
private audio, proposal versioning, booking races, idempotent retries,
completion, review eligibility and persisted availability.

## Provenance and credits

The supplied Figma Make export is preserved as provenance in
[`docs/reference`](docs/reference). Its source prototype is not treated as a
functional backend. No external credentials or private assets are included.
The product requirements are documented in [`docs/PRD.md`](docs/PRD.md).
