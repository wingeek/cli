import { createSolidTransformPlugin } from "@opentui/solid/bun-plugin";
import { renameSync } from "node:fs";
import { join } from "node:path";

const compile = process.argv.includes("--compile");

// Step 1: Bundle with Solid plugin
const bundle = await Bun.build({
  entrypoints: ["src/index.tsx"],
  outdir: "dist",
  target: "bun",
  plugins: [createSolidTransformPlugin()],
});

if (!bundle.success) {
  console.error("Bundle failed:");
  for (const log of bundle.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(`✓ Bundled ${bundle.outputs.length} file(s)`);

// Step 2: Compile to binary if requested
if (compile) {
  const bin = await Bun.build({
    entrypoints: [bundle.outputs[0].path],
    compile: true,
  });

  if (!bin.success) {
    console.error("Compile failed:");
    for (const log of bin.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  const compiled = bin.outputs[0].path;
  const target = join(import.meta.dir, "..", "artisan.exe");
  renameSync(compiled, target);
  const size = (bin.outputs[0].size / 1024 / 1024).toFixed(1);
  console.log(`✓ Compiled: artisan.exe (${size} MB)`);
}
