import { ARTIFACTS, CLIENT_DIR, CLIENT_OUTPUT, SERVER_DIR, SERVER_OUTPUT } from "../constants.mjs";
import { readJsonFileSync } from "../utils/readJsonFileSync.mjs";
import { isPlugin } from "../utils/isPlugin.mjs";
import { virtualEntry, virtualInput } from "../utils/virtualEntry.mjs";
import "../utils/index.mjs";
import { rmSync } from "node:fs";
import { isAbsolute, posix, resolve } from "node:path";
import { rolldown } from "rolldown";
// src/helpers/build.ts
function generate(plugins, side) {
	return plugins.map((name) => `import '${name}/${side}'`).join("\n");
}
async function build() {
	const pkg = readJsonFileSync(resolve("package.json"));
	const plugins = Object.keys(pkg.dependencies || {});
	const pluginsDetection = plugins.map((name) => isPlugin(name));
	const serverPlugins = plugins.filter((_, i) => pluginsDetection[i].server);
	const clientPlugins = plugins.filter((_, i) => pluginsDetection[i].client);
	for (const artifact of ARTIFACTS) rmSync(artifact, {
		recursive: true,
		force: true
	});
	const server = await rolldown({
		input: virtualInput,
		platform: "node",
		external: (id) => !id.startsWith(".") && !isAbsolute(id),
		plugins: [virtualEntry(generate(serverPlugins, "server"))]
	});
	await server.write({
		dir: SERVER_DIR,
		format: "esm",
		entryFileNames: SERVER_OUTPUT,
		chunkFileNames: posix.join("chunks", "[name]-[hash].js")
	});
	await server.close();
	const client = await rolldown({
		input: virtualInput,
		platform: "browser",
		plugins: [virtualEntry(generate(clientPlugins, "client"))]
	});
	await client.write({
		dir: CLIENT_DIR,
		format: "esm",
		entryFileNames: CLIENT_OUTPUT,
		chunkFileNames: posix.join("chunks", "[name]-[hash].js"),
		assetFileNames: posix.join("assets", "[name]-[hash][extname]")
	});
	await client.close();
}
export { build };
