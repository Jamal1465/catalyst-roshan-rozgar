import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers.mjs";
import { openDatabase } from "../server/db.mjs";

test("both roles can edit their own profile and choose what others can see", async (t) => {
  const f = await fixture(t);
  const guest = f.client();
  const customerId = (await f.a("/auth/me")).data.user.id;
  const publicPath = "/people/" + customerId;
  const draft = {
    display_name: "Ayesha",
    bio: "Based in Islamabad",
    area: "G-9",
    published: false,
  };
  assert.equal((await guest("/account-profile", draft)).status, 401);
  assert.equal((await f.a("/account-profile")).data.display_name, "");
  assert.equal((await f.a("/account-profile", draft)).status, 200);
  assert.equal((await guest(publicPath)).status, 404);
  assert.equal((await f.a("/account-profile", { ...draft, area: "unknown" })).status, 400);
  await f.a("/account-profile", { ...draft, published: true });
  assert.deepEqual((await f.worker(publicPath)).data, {
    display_name: "Ayesha",
    bio: draft.bio,
    area: draft.area,
    role: "customer",
    has_worker_profile: 0,
  });
  await f.b("/account-profile", {
    ...draft,
    display_name: "Other",
    user_id: customerId,
    role: "worker",
  });
  assert.equal((await guest(publicPath)).data.display_name, "Ayesha");
  const reopened = openDatabase(f.databasePath);
  try {
    assert.equal(
      reopened.prepare("SELECT display_name FROM account_profiles WHERE user_id=?").get(customerId)
        .display_name,
      "Ayesha",
    );
  } finally {
    reopened.close();
  }
  await f.worker("/account-profile", { ...draft, display_name: "Aslam", published: true });
  const worker = (await guest("/people/" + f.workerId)).data;
  assert.equal(worker.role, "worker");
  assert.equal(worker.has_worker_profile, 1);
  assert.equal((await guest("/workers/" + f.workerId)).data.has_public_account, true);
  await f.a("/account-profile", draft);
  assert.equal((await guest(publicPath)).status, 404);
});
