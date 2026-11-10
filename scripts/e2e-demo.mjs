import assert from "node:assert/strict";
import { demoPassword, seedDemoUsers } from "./seed-demo.mjs";

const users = await seedDemoUsers();
const aslam = users.find((user) => user.username === "demo-aslam");
const sana = users.find((user) => user.username === "demo-sana");
const hamza = users.find((user) => user.username === "demo-hamza");
const maria = users.find((user) => user.username === "demo-maria");
const bilal = users.find((user) => user.username === "demo-bilal");
const customerA = users.find((user) => user.username === "demo-customer-a");
const customerB = users.find((user) => user.username === "demo-customer-b");
const customerC = users.find((user) => user.username === "demo-customer-c");
const customerD = users.find((user) => user.username === "demo-customer-d");
const customerE = users.find((user) => user.username === "demo-customer-e");
assert.ok(aslam && sana && hamza && maria && bilal && customerA && customerB && customerC && customerD && customerE);

for (const user of users) {
  const me = await user.api("/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.data.user.username, user.username);
  assert.equal(me.data.user.role, user.role);
}

async function completeJob(customer, worker, area, description, scope) {
  const discovery = await customer.api(`/workers?area=${area}&trade=${worker.profile.trade}`);
  assert.equal(discovery.status, 200);
  const workerId = (await worker.api("/auth/me")).data.user.id;
  assert.ok(discovery.data.some((profile) => profile.user_id === workerId));

  let result = await customer.api("/requests", { worker_id: workerId, area, description });
  assert.equal(result.status, 201);
  const requestId = result.data.id;

  result = await customer.api(`/requests/${requestId}/messages`, {
    body: `Demo message from ${customer.username}`,
  });
  assert.equal(result.status, 200);
  result = await worker.api(`/requests/${requestId}/messages`, {
    body: `Demo reply from ${worker.username}`,
  });
  assert.equal(result.status, 200);
  result = await worker.api(`/requests/${requestId}/proposals`, {
    scope,
    price_pkr: 1500,
    materials_included: false,
  });
  assert.equal(result.status, 200);
  const version = result.data.proposals[0].version;

  result = await customer.api(`/requests/${requestId}/accept`, {
    version,
    idempotency_key: `e2e-${requestId}`,
  });
  assert.equal(result.status, 200);
  const bookingId = result.data.booking.id;
  assert.equal(result.data.booking.status, "confirmed");

  result = await worker.api(`/bookings/${bookingId}/start`, {});
  assert.equal(result.status, 200);
  result = await worker.api(`/bookings/${bookingId}/worker-finished`, {});
  assert.equal(result.status, 200);
  result = await customer.api(`/bookings/${bookingId}/complete`, {});
  assert.equal(result.status, 200);
  result = await customer.api(`/bookings/${bookingId}/reviews`, {
    rating: 5,
    feedback: `End-to-end demo review for ${worker.username}`,
  });
  assert.equal(result.status, 200);
  return requestId;
}

await completeJob(
  customerA,
  aslam,
  "G-9",
  "Demo ceiling fan repair",
  "Repair ceiling fan",
);
await completeJob(customerB, sana, "F-10", "Demo tap repair", "Repair leaking tap");
await completeJob(customerC, hamza, "Saddar", "Demo AC cooling issue", "Service split AC");
await completeJob(customerD, maria, "I-8", "Demo door repair", "Fit and repair wooden door");
await completeJob(customerE, bilal, "G-10", "Demo motorcycle repair", "Repair motorcycle");

for (const worker of [aslam, sana, hamza, maria, bilal]) {
  const me = await worker.api("/auth/me");
  const profile = await worker.api("/workers/" + me.data.user.id);
  assert.equal(profile.status, 200);
  assert.ok(profile.data.review_count >= 1);
  assert.equal(profile.data.available, true);
}

console.log(`Passed end-to-end workflows for ${users.length} demo users.`);
console.log(`All accounts use password: ${demoPassword}`);
