import { createApp } from "../server/app.mjs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
export async function fixture(t, options = {}) {
  const dir = mkdtempSync(join(tmpdir(), "roshan-"));
  const databasePath = join(dir, "test.sqlite");
  const app = createApp({ databasePath, ...options });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => app.server.close(resolve));
    app.db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  function client() {
    let cookie = "";
    return async (path, data, method = data === undefined ? "GET" : "POST") => {
      const response = await fetch(base + "/api" + path, {
        method,
        headers: { "Content-Type": "application/json", cookie },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      if (response.headers.get("set-cookie"))
        cookie = response.headers.get("set-cookie").split(";")[0];
      return { status: response.status, data: await response.json(), cookie };
    };
  }
  const worker = client(),
    a = client(),
    b = client();
  const w = await worker("/auth/register", {
    username: "aslam",
    password: "test-password-123",
    role: "worker",
  });
  await a("/auth/register", {
    username: "customer-a",
    password: "test-password-123",
    role: "customer",
  });
  await b("/auth/register", {
    username: "customer-b",
    password: "test-password-123",
    role: "customer",
  });
  const profile = {
    name: "Aslam",
    trade: "Electrician",
    years_experience: 8,
    services: ["Ceiling fan repair"],
    areas: ["G-9"],
    manual_available: true,
    language: "en",
  };
  await worker("/profile", profile);
  return { ...app, base, databasePath, client, worker, a, b, workerId: w.data.id, profile };
}
