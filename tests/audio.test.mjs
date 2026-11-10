import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers.mjs";
const wav = Buffer.alloc(100);
wav.write("RIFF");
wav.write("WAVE", 8);
async function upload(f, cookie, requestId, mime = "audio/wav", data = wav) {
  return fetch(f.base + "/api/audio" + (requestId ? "?request_id=" + requestId : ""), {
    method: "POST",
    headers: { cookie, "Content-Type": mime },
    body: data,
  });
}
test("audio drafts are private, shared notes require participation, invalid uploads fail", async (t) => {
  const f = await fixture(t);
  const wc = (await f.worker("/auth/me")).cookie,
    ac = (await f.a("/auth/me")).cookie,
    bc = (await f.b("/auth/me")).cookie;
  assert.equal((await upload(f, wc, null, "text/html")).status, 415);
  assert.equal((await upload(f, wc, null, "audio/wav", Buffer.alloc(100))).status, 415);
  const audio = await (await upload(f, wc)).json();
  assert.equal(
    (await fetch(f.base + "/api/audio/" + audio.id, { headers: { cookie: ac } })).status,
    404,
  );
  assert.equal((await fetch(f.base + "/api/audio/" + audio.id)).status, 401);
  assert.equal(
    (await fetch(f.base + "/api/audio/" + audio.id, { headers: { cookie: wc } })).status,
    200,
  );
  const r = (await f.a("/requests", { worker_id: f.workerId, area: "G-9", description: "Fix fan" }))
    .data;
  assert.equal((await upload(f, bc, r.id)).status, 404);
  const note = await (await upload(f, ac, r.id)).json();
  assert.equal(
    (await fetch(f.base + "/api/audio/" + note.id, { headers: { cookie: wc } })).status,
    404,
  );
  await f.a(`/requests/${r.id}/messages`, { audio_id: note.id });
  assert.equal(
    (await fetch(f.base + "/api/audio/" + note.id, { headers: { cookie: wc } })).status,
    200,
  );
  assert.equal(
    (await fetch(f.base + "/api/audio/" + note.id, { headers: { cookie: bc } })).status,
    404,
  );
  assert.equal((await f.a("/ai/transcribe-profile", { audio_id: audio.id })).status, 403);
  if (!process.env.OPENAI_API_KEY)
    assert.equal(
      (await f.worker("/ai/transcribe-profile", { audio_id: audio.id })).data.error,
      "AI_NOT_CONFIGURED",
    );
});
test("explicit test provider returns uncertain draft without auto-publishing", async (t) => {
  const f = await fixture(t, {
    ai: async () => ({
      transcript: "میرا نام اسلم ہے اور میں نل کی مرمت کرتا ہوں",
      draft: {
        name: "اسلم",
        trade: "Plumber",
        years_experience: null,
        services: ["نل کی مرمت"],
        uncertain_fields: [],
      },
    }),
  });
  test("customer trade triage returns a confirmable suggestion", async (t) => {
    const f = await fixture(t, {
      ai: async (_audio, purpose) => ({
        transcript: "پنکھا خراب ہے",
        trade: purpose === "triage" ? "Electrician" : undefined,
        draft: { name: null, years_experience: null, services: [], uncertain_fields: [] },
      }),
    });
    const cookie = (await f.a("/auth/me")).cookie;
    const audio = await fetch(f.base + "/api/audio?purpose=triage", {
      method: "POST",
      headers: { cookie, "Content-Type": "audio/wav" },
      body: wav,
    });
    assert.equal(audio.status, 201);
    const { id } = await audio.json();
    const suggestion = await f.a("/ai/suggest-trade", { audio_id: id });
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.data.trade, "Electrician");
    assert.equal(suggestion.data.requires_confirmation, true);
    assert.equal((await f.worker("/ai/suggest-trade", { audio_id: id })).status, 403);
  });
  const cookie = (await f.worker("/auth/me")).cookie;
  const audio = await (await upload(f, cookie)).json();
  const result = (await f.worker("/ai/transcribe-profile", { audio_id: audio.id })).data;
  assert.equal(result.requires_confirmation, true);
  assert.equal(result.draft.trade, "Plumber");
  assert.deepEqual(result.draft.services, ["نل کی مرمت"]);
  assert.equal(result.draft.years_experience, null);
  assert.ok(result.draft.uncertain_fields.includes("years_experience"));
  assert.equal((await f.worker("/profile")).data.trade, "Electrician");
  await f.worker("/profile", {
    ...f.profile,
    name: result.draft.name,
    trade: result.draft.trade,
    services: result.draft.services,
    years_experience: result.draft.years_experience,
  });
  const { data: matches } = await f.a("/workers?trade=Plumber&area=G-9&available=now");
  assert.equal(matches[0].user_id, f.workerId);
  assert.deepEqual(matches[0].services, ["نل کی مرمت"]);
});

test("customer voice transcript classifies a trade without external AI", async (t) => {
  const f = await fixture(t);
  const examples = [
    ["Electrician", "میرے گھر کا پنکھا خراب ہے اور سوئچ بھی نہیں چل رہا"],
    ["Plumber", "نل لیک ہو رہا ہے، پانی کی پائپ ٹھیک کرنی ہے"],
    ["AC technician", "AC کی cooling خراب ہے"],
    ["Carpenter", "لکڑی کا دروازہ اور furniture بنوانا ہے"],
    ["Mechanic", "گاڑی کا engine خراب ہے"],
  ];
  for (const [trade, transcript] of examples) {
    const result = await f.a("/ai/suggest-trade", { transcript });
    assert.equal(result.status, 200);
    assert.equal(result.data.trade, trade);
    assert.equal(result.data.requires_confirmation, true);
    assert.equal(result.data.transcript, transcript);
  }
});
