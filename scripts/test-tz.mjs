import { spawnSync } from "node:child_process";

for (const timezone of ["Pacific/Auckland", "America/Los_Angeles"]) {
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["test"], { env: { ...process.env, TZ: timezone }, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
