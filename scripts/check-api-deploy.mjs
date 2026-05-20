import { readFileSync } from "node:fs";

const composePath = "apps/api/deploy/docker-compose.yml";
const compose = readFileSync(composePath, "utf8");

const failures = [];

if (!/services:\r?\n\s+backend:\r?\n/m.test(compose)) {
  failures.push("O compose de deploy deve publicar apenas o service `backend`.");
}

if (/\r?\n\s+postgres:\r?\n|\r?\n\s+pgbouncer:\r?\n/m.test(compose)) {
  failures.push("Services auxiliares como `postgres` e `pgbouncer` nao devem ficar no compose publicado pelo Dokploy.");
}

if (!/backend:\r?\n(?:[\s\S]*?)\r?\n\s+expose:\r?\n\s+-\s+"3000"/m.test(compose)) {
  failures.push('`backend.expose` deve permanecer literal como `"3000"`.');
}

if (/\$\{PORT:-3000\}/.test(compose)) {
  failures.push("Interpolacao `${PORT:-3000}` nao pode ser usada no compose do backend.");
}

if (/\r?\nhealthcheck:\r?\n/m.test(compose)) {
  failures.push("O compose publicado pelo Dokploy deve permanecer sem `healthcheck` para evitar regressao de roteamento.");
}

if (/\r?\nnetworks:\r?\n/m.test(compose) || /\r?\nvolumes:\r?\n/m.test(compose)) {
  failures.push("O compose publicado pelo Dokploy deve permanecer sem blocos top-level de `networks` ou `volumes`.");
}

if (failures.length > 0) {
  console.error(`Deploy config invalida em ${composePath}:`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Deploy config ok: ${composePath}`);
