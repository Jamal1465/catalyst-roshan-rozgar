import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers.mjs";
test("private requests, messages and worker-owned monotonically versioned proposals", async (t) => {
  const f = await fixture(t);
  const r = (
    await f.a("/requests", {
      worker_id: f.workerId,
      area: "G-9",
      description: "Repair ceiling fan",
    })
  ).data;
  const path = "/requests/" + r.id;
  assert.equal((await f.b(path)).status, 404);
  assert.equal((await f.b(path + "/messages", { body: "intrusion" })).status, 404);
  assert.equal((await f.a(path + "/messages", { body: "Fan is not turning" })).status, 200);
  const proposal = { scope: "Repair ceiling fan", price_pkr: 1500, materials_included: false };
  assert.equal((await f.a(path + "/proposals", proposal)).status, 403);
  assert.equal((await f.worker(path + "/proposals", { ...proposal, price_pkr: -1 })).status, 400);
  assert.equal((await f.worker(path + "/proposals", proposal)).data.proposals[0].version, 1);
  assert.equal(
    (await f.worker(path + "/proposals", { ...proposal, price_pkr: 1600 })).data.proposals[0]
      .version,
    2,
  );
  assert.equal((await f.worker(path)).data.messages[0].body, "Fan is not turning");
  assert.equal((await f.b("/requests")).data.length, 0);
  assert.equal((await f.a(path + "/cancel", {})).data.status, "cancelled");
  assert.equal((await f.worker(path + "/proposals", proposal)).status, 409);
});
