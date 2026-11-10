import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers.mjs";
import { openDatabase } from "../server/db.mjs";
test("persistent profiles, authenticated ownership and filtered discovery", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.a("/profile", f.profile)).status, 403);
  assert.equal((await f.client()("/profile")).status, 401);
  assert.equal((await f.a("/workers?area=G-9&trade=Electrician&available=now")).data.length, 1);
  assert.equal((await f.a("/workers?area=F-10")).data.length, 0);
  const db = openDatabase(f.databasePath);
  assert.equal(db.prepare("SELECT name FROM workers").get().name, "Aslam");
  db.close();
  await f.worker("/profile", { ...f.profile, manual_available: false });
  assert.equal((await f.a("/workers?available=now")).data.length, 0);
  const second = f.client();
  assert.equal(
    (await second("/auth/login", { username: "aslam", password: "wrong-password" })).status,
    401,
  );
  assert.equal(
    (await second("/auth/login", { username: "aslam", password: "test-password-123" })).status,
    200,
  );
  assert.equal((await second("/profile")).data.manual_available, false);
  await second("/auth/logout", {});
  assert.equal((await second("/profile")).status, 401);
});
test("local Vite proxy origin is accepted while unrelated origins are rejected", async (t) => {
  const f = await fixture(t);
  const cookie = (await f.worker("/auth/me")).cookie;
  const local = await fetch(f.base + "/api/auth/logout", {
    method: "POST",
    headers: { cookie, origin: "http://127.0.0.1:5173", "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(local.status, 200);
  const unrelated = await fetch(f.base + "/api/auth/me", {
    method: "POST",
    headers: { cookie, origin: "https://evil.example", "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(unrelated.status, 403);
  assert.equal((await unrelated.json()).error, "ORIGIN_REJECTED");
});
