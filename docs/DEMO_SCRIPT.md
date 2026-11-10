# Roshan Rozgar demo script

This script demonstrates the P0 flow using Aslam, an electrician, and a
ceiling-fan repair in G-9.

## Prepare

1. Start the app with `npm run dev`.
2. Use three browser sessions (or two browsers plus an incognito window):
   Aslam (worker), Customer A and Customer B.
3. If `OPENAI_API_KEY` is configured, use a real Urdu recording. Otherwise
   show the disclosed manual fallback; do not present a simulated transcript
   as live AI.

## Worker onboarding

1. Choose **Offer my services** and create a worker account.
2. Record Urdu speech containing Aslam's name, electrician trade, eight years
   of experience and ceiling-fan repair services.
3. Preview and submit the recording. Check the returned transcript and draft.
4. Correct any field, select **G-9**, leave availability enabled, confirm the
   readback and publish the profile.

## Customer request and agreement

1. Customer A selects **G-9** and **Electrician**, then opens Aslam's profile.
2. Send: “My ceiling fan is not turning.” Optionally exchange a voice note.
3. In the worker session, open the request and propose:
   - Scope: `Repair ceiling fan`
   - Price: `PKR 1,500`
   - Materials: **excluded**
4. Customer A reviews the current version and taps **Accept & confirm
   booking**. Refresh both sessions to show the same persisted booking.

## Conflict and lifecycle

1. Before accepting another request, have Customer B create a request for
   Aslam in G-9.
2. Customer B accepts the current proposal. The server returns a conflict
   (`WORKER_BUSY`) and preserves Customer B's request; it must not create a
   second active booking.
3. The winning customer can retry with the same browser session and sees the
   same booking, not a duplicate.
4. Aslam starts the job and marks it finished. Customer A confirms completion.
5. Customer A submits a genuine demo review. Refresh discovery/profile and
   show the persisted rating/count and restored availability.

## Failure evidence to mention

- Denying microphone permission produces a recovery message and leaves the
  manual form available.
- Unconfigured OpenAI transcription reports that AI is unavailable; it never
  fabricates a successful draft.
- A stale proposal, unauthorized participant, duplicate review or competing
  booking is rejected by the server with an explicit error.
