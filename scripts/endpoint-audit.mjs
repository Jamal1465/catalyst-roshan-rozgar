import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../server/app.mjs";

const directory = mkdtempSync(join(tmpdir(), "roshan-endpoint-audit-"));
const app = createApp({
  databasePath: join(directory, "audit.sqlite"),
  ai: async () => ({
    transcript: "Aslam electrician",
    draft: {
      name: "Aslam",
      years_experience: 8,
      services: ["Fan repair"],
      uncertain_fields: [],
    },
  }),
});
await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${app.server.address().port}/api`;
const clients = {};
function client(name) {
  let cookie = "";
  clients[name] = async (path, data, options = {}) => {
    const response = await fetch(base + path, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        ...(data === undefined ? {} : { "Content-Type": "application/json" }),
        ...(cookie ? { cookie } : {}),
        ...options.headers,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return { status: response.status, data: await response.json(), cookie };
  };
  return clients[name];
}
const anon = client("anon");
const worker = client("worker");
const customer = client("customer");
const other = client("other");
const expectStatus = (response, status, label) => assert.equal(response.status, status, label);

expectStatus(await anon("/health"), 200, "health");
const catalog = await anon("/catalog");
expectStatus(catalog, 200, "catalog");
assert.deepEqual(catalog.data.trades, [
  "Electrician",
  "Plumber",
  "AC technician",
  "Carpenter",
  "Mechanic",
]);
expectStatus(await anon("/workers"), 200, "public workers");
expectStatus(
  await worker("/auth/register", {
    username: "audit-worker",
    password: "audit-password",
    role: "worker",
  }),
  200,
  "worker registration",
);
expectStatus(
  await customer("/auth/register", {
    username: "audit-customer",
    password: "audit-password",
    role: "customer",
  }),
  200,
  "customer registration",
);
expectStatus(
  await other("/auth/register", {
    username: "audit-other",
    password: "audit-password",
    role: "customer",
  }),
  200,
  "other registration",
);
expectStatus(
  await anon("/auth/register", {
    username: "audit-worker",
    password: "audit-password",
    role: "worker",
  }),
  409,
  "duplicate registration",
);
expectStatus(
  await anon("/auth/login", { username: "audit-worker", password: "wrong-password" }),
  401,
  "invalid login",
);
expectStatus(
  await worker("/profile", {
    name: "Audit Aslam",
    trade: "Electrician",
    years_experience: 8,
    services: ["Fan repair"],
    areas: ["G-9"],
    manual_available: true,
    language: "en",
  }),
  200,
  "profile save",
);
expectStatus(await customer("/profile", {}), 403, "customer profile mutation");
const workers = await anon("/workers?area=G-9&trade=Electrician&available=now");
expectStatus(workers, 200, "filtered discovery");
const workerId = workers.data[0].user_id;
expectStatus(await anon(`/workers/${workerId}`), 200, "worker detail");
expectStatus(await anon("/workers/missing"), 404, "missing worker");
const request = await customer("/requests", {
  worker_id: workerId,
  area: "G-9",
  description: "Fix ceiling fan",
});
expectStatus(request, 201, "request creation");
const requestId = request.data.id;
expectStatus(await other(`/requests/${requestId}`), 404, "private request");
expectStatus(
  await customer(`/requests/${requestId}/messages`, { body: "Please help" }),
  200,
  "customer message",
);
expectStatus(
  await other(`/requests/${requestId}/messages`, { body: "Intrusion" }),
  404,
  "private message",
);
expectStatus(
  await customer(`/requests/${requestId}/proposals`, {
    scope: "Repair fan",
    price_pkr: 1500,
    materials_included: false,
  }),
  403,
  "customer proposal mutation",
);
expectStatus(
  await worker(`/requests/${requestId}/proposals`, {
    scope: "Repair fan",
    price_pkr: 1500,
    materials_included: false,
  }),
  200,
  "worker proposal",
);
const proposal = (await customer(`/requests/${requestId}`)).data.proposals[0];
expectStatus(
  await customer(`/requests/${requestId}/accept`, {
    version: proposal.version,
    idempotency_key: "endpoint-audit-idempotency",
  }),
  200,
  "booking acceptance",
);
const bookingId = (await customer(`/requests/${requestId}`)).data.booking.id;
expectStatus(
  await customer(`/requests/${requestId}/accept`, {
    version: proposal.version,
    idempotency_key: "endpoint-audit-idempotency",
  }),
  200,
  "idempotent acceptance",
);
expectStatus(await worker(`/bookings/${bookingId}/cancel`, {}), 403, "worker cancellation");
expectStatus(await worker(`/bookings/${bookingId}/start`, {}), 200, "job start");
expectStatus(await worker(`/bookings/${bookingId}/worker-finished`, {}), 200, "job finish");
expectStatus(await customer(`/bookings/${bookingId}/complete`, {}), 200, "job completion");
expectStatus(
  await customer(`/bookings/${bookingId}/reviews`, { rating: 5, feedback: "Great" }),
  200,
  "review creation",
);
expectStatus(
  await customer(`/bookings/${bookingId}/reviews`, { rating: 4, feedback: "Duplicate" }),
  409,
  "duplicate review",
);
const wav = Buffer.alloc(100);
wav.write("RIFF");
wav.write("WAVE", 8);
const audio = await fetch(base + "/audio", {
  method: "POST",
  headers: { cookie: clients.worker ? (await worker("/auth/me")).cookie : "", "Content-Type": "audio/wav" },
  body: wav,
});
expectStatus({ status: audio.status }, 201, "audio upload");
const audioData = await audio.json();
expectStatus(await worker("/ai/transcribe-profile", { audio_id: audioData.id }), 200, "AI draft");
expectStatus(
  await customer("/ai/transcribe-profile", { audio_id: audioData.id }),
  403,
  "customer AI access",
);
expectStatus(await customer("/auth/logout", {}), 200, "logout");
expectStatus(await customer("/requests"), 401, "post-logout access");
await new Promise((resolve) => app.server.close(resolve));
app.db.close();
rmSync(directory, { recursive: true, force: true });
console.log("Endpoint audit passed: public, auth, profile, discovery, requests, agreement, bookings, reviews, audio, AI and logout.");
