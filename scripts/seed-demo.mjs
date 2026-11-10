const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3001";
export const demoPassword = "Roshan-Demo-2026!";
export const demoUsers = [
  {
    username: "demo-aslam",
    role: "worker",
    profile: {
      name: "Aslam Demo",
      trade: "Electrician",
      years_experience: 8,
      services: ["Ceiling fan repair", "Switch installation"],
      areas: ["G-9", "G-10"],
      manual_available: true,
      language: "en",
    },
  },
  {
    username: "demo-sana",
    role: "worker",
    profile: {
      name: "Sana Demo",
      trade: "Plumber",
      years_experience: 5,
      services: ["Tap repair", "Water pipe repair"],
      areas: ["F-10", "I-8"],
      manual_available: true,
      language: "en",
    },
  },
  {
    username: "demo-hamza",
    role: "worker",
    profile: {
      name: "Hamza Demo",
      trade: "AC technician",
      years_experience: 6,
      services: ["AC servicing", "Cooling repair"],
      areas: ["Saddar", "Satellite Town"],
      manual_available: true,
      language: "en",
    },
  },
  {
    username: "demo-maria",
    role: "worker",
    profile: {
      name: "Maria Demo",
      trade: "Carpenter",
      years_experience: 7,
      services: ["Furniture repair", "Door fitting"],
      areas: ["G-9", "I-8"],
      manual_available: true,
      language: "en",
    },
  },
  {
    username: "demo-bilal",
    role: "worker",
    profile: {
      name: "Bilal Demo",
      trade: "Mechanic",
      years_experience: 9,
      services: ["Motorcycle repair", "Oil change"],
      areas: ["G-10", "F-10"],
      manual_available: true,
      language: "en",
    },
  },
  { username: "demo-customer-a", role: "customer" },
  { username: "demo-customer-b", role: "customer" },
  { username: "demo-customer-c", role: "customer" },
  { username: "demo-customer-d", role: "customer" },
  { username: "demo-customer-e", role: "customer" },
];

function client() {
  let cookie = "";
  return async (path, data) => {
    const response = await fetch(baseUrl + "/api" + path, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        ...(data === undefined ? {} : { "Content-Type": "application/json" }),
        ...(cookie ? { cookie } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const json = await response.json();
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return { status: response.status, data: json };
  };
}

async function ensureAccount(user) {
  const api = client();
  let result = await api("/auth/login", {
    username: user.username,
    password: demoPassword,
  });
  if (result.status === 401) {
    result = await api("/auth/register", {
      username: user.username,
      password: demoPassword,
      role: user.role,
    });
  }
  if (result.status !== 200) throw new Error(`${user.username}: ${result.data.error}`);
  if (user.profile) {
    result = await api("/profile", user.profile);
    if (result.status !== 200) throw new Error(`${user.username} profile: ${result.data.error}`);
  }
  return { ...user, api };
}

export async function seedDemoUsers() {
  const health = await fetch(baseUrl + "/api/health");
  if (!health.ok) throw new Error(`API is not available at ${baseUrl}`);
  const users = [];
  for (const user of demoUsers) users.push(await ensureAccount(user));
  return users;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const users = await seedDemoUsers();
  console.log(`Seeded ${users.length} idempotent demo accounts at ${baseUrl}`);
  console.log(`Demo password for all accounts: ${demoPassword}`);
  for (const user of users) console.log(`- ${user.username} (${user.role})`);
}
