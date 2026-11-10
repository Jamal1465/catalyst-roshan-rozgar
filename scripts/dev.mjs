import { spawn } from "node:child_process";
const children = [
  spawn(process.execPath, ["--env-file-if-exists=.env", "--watch", "server/index.mjs"], {
    stdio: "inherit",
  }),
  spawn("npm", ["run", "dev:web"], { stdio: "inherit" }),
];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill("SIGTERM"));
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
children.forEach((c) => c.on("exit", () => stop()));
