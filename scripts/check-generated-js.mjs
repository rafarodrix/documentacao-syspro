import { execSync } from "node:child_process";

function main() {
  const output = execSync("git ls-files", { encoding: "utf8" });
  const files = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const generatedJs = files.filter((file) =>
    /^(apps|packages)\/[^/]+\/(src|tests)\/.+\.js$/.test(file),
  );

  if (generatedJs.length > 0) {
    console.error("Arquivos .js gerados nao devem ser versionados em src/tests:");
    for (const file of generatedJs) {
      console.error(`- ${file}`);
    }
    process.exit(1);
  }

  console.log("OK: nenhum .js gerado em src/tests foi detectado no Git.");
}

main();

