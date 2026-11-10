# Development phases

Each phase is a separate, truthful commit. Source prototype is preserved in docs/reference; it is not a functioning backend.

1. **Foundation** — import, audit, portable build, phase plan. Gate: dependency install and baseline typecheck/build.
2. **Identity and discovery** — SQLite schema, password authentication, persistent profiles, computed availability. Gate: auth, profile and reload integration tests.
3. **Agreement** — participant-only requests/messages, worker proposals with increasing versions. Gate: access and proposal validation tests.
4. **Booking and reputation** — transactional acceptance, unique active booking, lifecycle, one authorized review. Gate: competing sessions, stale/retry, completion and review tests.
5. **Working interface and audio** — connect role flows, recording/playback, private audio, server-side transcription and confirmed draft. Gate: typecheck/build and API audio tests. Live Urdu AI requires configured credentials and real test speech.
6. **Release verification** — browser smoke, responsive checks, reproducible README/demo, limitations and configuration. Gate: full automated checks and recorded manual evidence.

## Initial audit
- Workspace contained two requirements documents and no Git repository; remote has no refs.
- ZIP contains React/Vite/Tailwind prototype with simulated recording, hard-coded profile/reputation and component-local booking flags.
- No backend, database, real session authentication or API credentials were supplied.
- Adaptation: Node 24+ built-in HTTP + SQLite backend, React frontend, same-origin session cookies; persistent local MVP. Production hosting/auth operations remain a separate deployment decision.
- Existing prototype is attributed to the supplied Figma Make export. Originality/hacking-window compliance must be established with organizers; importing it does not establish compliance.
- Attached prompt is reference guidance; user explicitly authorized phased implementation and Git commits to the named repository.
