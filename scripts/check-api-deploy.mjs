import { readFileSync } from "node:fs";

const composePath = "apps/api/deploy/docker-compose.yml";
const compose = readFileSync(composePath, "utf8");

const failures = [];

if (!/backend:\r?\n(?:[\s\S]*?)\r?\n\s+expose:\r?\n\s+-\s+"3000"/m.test(compose)) {
  failures.push('`backend.expose` deve permanecer literal como `"3000"`.');
}

if (/\$\{PORT:-3000\}/.test(compose)) {
  failures.push("Interpolacao `${PORT:-3000}` nao pode ser usada no compose do backend.");
}

if (!/wget -qO- http:\/\/localhost:3000\/api\/health\/live \|\| exit 1/.test(compose)) {
  failures.push("Healthcheck do backend deve validar `http://localhost:3000/api/health/live`.");
}

if (!/backend:\r?\n(?:[\s\S]*?)\r?\n\s+networks:\r?\n\s+- dokploy-network/m.test(compose)) {
  failures.push("Servico `backend` deve estar conectado a `dokploy-network`.");
}

if (!/networks:\r?\n\s+dokploy-network:\r?\n\s+external:\s+true/m.test(compose)) {
  failures.push("Rede `dokploy-network` deve continuar marcada como external.");
}

if (failures.length > 0) {
  console.error(`Deploy config invalida em ${composePath}:`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Deploy config ok: ${composePath}`);
