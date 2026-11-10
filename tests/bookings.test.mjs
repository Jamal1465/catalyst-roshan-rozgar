import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers.mjs";
import { createApp } from "../server/app.mjs";
const proposal = { scope: "Repair ceiling fan", price_pkr: 1500, materials_included: false };
async function request(f, customer) {
  const r = (
    await customer("/requests", { worker_id: f.workerId, area: "G-9", description: "Fan repair" })
  ).data;
  await f.worker(`/requests/${r.id}/proposals`, proposal);
  return r.id;
}
test("two servers and two customer sessions race: exactly one booking; retry, lifecycle, privacy, review and availability", async (t) => {
  const f = await fixture(t);
  const ra = await request(f, f.a),
    rb = await request(f, f.b);
  // Independent server connection shares the database, as separate processes would.
  const other = createApp({ databasePath: f.databasePath });
  await new Promise((resolve) => other.server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => other.server.close(resolve));
    other.db.close();
  });
  const cookie = (await f.b("/auth/me")).cookie;
  const [a, b] = await Promise.all([
    f.a(`/requests/${ra}/accept`, { version: 1, idempotency_key: "customer-a-accept-001" }),
    fetch(`http://127.0.0.1:${other.server.address().port}/api/requests/${rb}/accept`, {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ version: 1, idempotency_key: "customer-b-accept-001" }),
    }).then(async (r) => ({ status: r.status, data: await r.json() })),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal((a.status === 409 ? a : b).data.error, "WORKER_BUSY");
  const win = a.status === 200 ? f.a : f.b,
    lose = a.status === 200 ? f.b : f.a,
    rid = a.status === 200 ? ra : rb,
    key = a.status === 200 ? "customer-a-accept-001" : "customer-b-accept-001";
  const booking = (a.status === 200 ? a : b).data.booking;
  assert.equal((await f.a("/workers?available=now")).data.length, 0);
  assert.equal(
    (await win(`/requests/${rid}/accept`, { version: 1, idempotency_key: key })).data.booking.id,
    booking.id,
  );
  assert.equal((await lose(`/requests/${a.status === 200 ? rb : ra}`)).data.status, "discussing");
  const path = "/bookings/" + booking.id;
  assert.equal((await win(path + "/reviews", { rating: 5, feedback: "test" })).status, 409);
  assert.equal((await lose(path + "/start", {})).status, 404);
  assert.equal((await win(path + "/start", {})).status, 403);
  assert.equal((await f.worker(path + "/start", {})).status, 200);
  assert.equal((await win(path + "/complete", {})).status, 409);
  await f.worker(path + "/worker-finished", {});
  assert.equal((await f.worker(`/requests/${rid}`)).data.booking.status, "in_progress");
  assert.equal((await f.worker(path + "/complete", {})).status, 403);
  assert.equal((await win(path + "/complete", {})).data.booking.status, "completed");
  assert.equal((await lose(path + "/reviews", { rating: 5, feedback: "" })).status, 404);
  assert.equal(
    (await win(path + "/reviews", { rating: 5, feedback: "Fan repaired — demo test" })).status,
    200,
  );
  assert.equal((await win(path + "/reviews", { rating: 4, feedback: "" })).status, 409);
  const profile = (await f.a("/workers/" + f.workerId)).data;
  assert.equal(profile.review_count, 1);
  assert.equal(profile.rating, 5);
  assert.equal(profile.completed_jobs, 1);
  assert.equal(profile.available, true);
  assert.equal(other.db.prepare("SELECT COUNT(*) AS n FROM reviews").get().n, 1);
});
test("stale proposal, unauthorized acceptance, cancellation and database uniqueness guard", async (t) => {
  const f = await fixture(t),
    rid = await request(f, f.a);
  await f.worker(`/requests/${rid}/proposals`, { ...proposal, price_pkr: 1700 });
  assert.equal(
    (await f.a(`/requests/${rid}/accept`, { version: 1, idempotency_key: "stale-proposal-key" }))
      .data.error,
    "STALE_PROPOSAL",
  );
  assert.equal(
    (
      await f.worker(`/requests/${rid}/accept`, {
        version: 2,
        idempotency_key: "worker-accept-key",
      })
    ).status,
    403,
  );
  const accepted = (
    await f.a(`/requests/${rid}/accept`, { version: 2, idempotency_key: "latest-proposal-key" })
  ).data;
  const rid2 = await request(f, f.b),
    p = f.db.prepare("SELECT id FROM proposals WHERE request_id=?").get(rid2);
  assert.throws(
    () =>
      f.db
        .prepare(
          "INSERT INTO bookings(id,request_id,proposal_id,customer_id,worker_id,idempotency_key) VALUES('illegal',?,?,?,?, 'illegal-key')",
        )
        .run(rid2, p.id, awaitUser(f.db, "customer-b"), f.workerId),
    /UNIQUE/,
  );
  assert.equal((await f.worker(`/bookings/${accepted.booking.id}/cancel`, {})).status, 403);
  assert.equal((await f.a(`/bookings/${accepted.booking.id}/cancel`, {})).status, 200);
  assert.equal((await f.a("/workers?available=now")).data.length, 1);
});
function awaitUser(db, name) {
  return db.prepare("SELECT id FROM users WHERE username=?").get(name).id;
}
