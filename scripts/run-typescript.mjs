import { build } from "esbuild";

const [entryPoint] = process.argv.slice(2);

if (!entryPoint) {
  throw new Error("Provide a TypeScript entry point.");
}

const result = await build({
  absWorkingDir: process.cwd(),
  entryPoints: [entryPoint],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node24",
  write: false,
});
const source = result.outputFiles[0]?.text;

if (!source) {
  throw new Error(`No bundled output produced for ${entryPoint}.`);
}

await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
